import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as schema from '@/db/schema';
import { TENANT_OWNED_TABLES } from '@/db/tenant-tables';
import { getTableColumns, isTable } from 'drizzle-orm';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';

describe('Phase 2 Database Foundation — Schema, RLS Coverage & Constraints Verification', () => {
  const migrationsDir = path.resolve(__dirname, '../../src/db/migrations');
  const rlsMigrationSql = fs.readFileSync(
    path.join(migrationsDir, '0003_row_level_security.sql'),
    'utf8',
  );
  const foundationConstraintsSql = fs.readFileSync(
    path.join(migrationsDir, '0001_foundation_constraints.sql'),
    'utf8',
  );
  const journalJson = JSON.parse(
    fs.readFileSync(path.join(migrationsDir, 'meta/_journal.json'), 'utf8'),
  );

  describe('2.1 Migration Sequence & Extension Verification', () => {
    it('contains all 4 ordered migration entries in _journal.json', () => {
      expect(journalJson.entries.length).toBe(4);
      expect(journalJson.entries[0].tag).toBe('0000_schema_tables');
      expect(journalJson.entries[1].tag).toBe('0001_foundation_constraints');
      expect(journalJson.entries[2].tag).toBe('0002_universal_commerce_foundation');
      expect(journalJson.entries[3].tag).toBe('0003_row_level_security');
    });

    it('creates btree_gist and pgcrypto extensions in 0000_schema_tables and 0001_foundation_constraints', () => {
      const initialSchemaSql = fs.readFileSync(
        path.join(migrationsDir, '0000_schema_tables.sql'),
        'utf8',
      );
      expect(initialSchemaSql).toContain('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      expect(initialSchemaSql).toContain('CREATE EXTENSION IF NOT EXISTS btree_gist;');
      expect(foundationConstraintsSql).toContain('CREATE EXTENSION IF NOT EXISTS btree_gist;');
    });
  });

  describe('2.2 GiST Exclusions on Live Rows & Buffers', () => {
    it('applies GiST exclusions ONLY to live rows (allocation_status = active)', () => {
      // Resource overlap constraint
      expect(foundationConstraintsSql).toContain('excl_booking_items_resource_overlap');
      expect(foundationConstraintsSql).toContain(
        "WHERE (resource_id IS NOT NULL AND allocation_status = 'active')",
      );

      // Staff member overlap constraint
      expect(foundationConstraintsSql).toContain('excl_booking_items_staff_overlap');
      expect(foundationConstraintsSql).toContain(
        "WHERE (staff_member_id IS NOT NULL AND allocation_status = 'active')",
      );
    });

    it('enforces buffer range [buffer_starts_at, buffer_ends_at) containing starts_at and ends_at', () => {
      expect(foundationConstraintsSql).toContain('chk_booking_items_valid_buffer_window');
      expect(foundationConstraintsSql).toContain('buffer_starts_at <= starts_at');
      expect(foundationConstraintsSql).toContain('buffer_ends_at >= ends_at');
      expect(foundationConstraintsSql).toContain('buffer_ends_at > buffer_starts_at');
    });
  });

  describe('2.3 RLS Policy Coverage Check — FAILS IF ANY TABLE WITH tenant_id LACKS A POLICY', () => {
    // Collect all tables in Drizzle schema that possess a tenant_id column
    const schemaTenantTables: string[] = [];

    for (const [, value] of Object.entries(schema)) {
      if (isTable(value)) {
        const columns = getTableColumns(value);
        if ('tenantId' in columns || 'tenant_id' in columns) {
          const { name: tableName } = getTableConfig(value as PgTable);
          schemaTenantTables.push(tableName);
        }
      }
    }

    const uniqueSchemaTenantTables = Array.from(new Set(schemaTenantTables)).sort();

    it('identifies all tenant tables and confirms every one is tracked in TENANT_OWNED_TABLES', () => {
      expect(uniqueSchemaTenantTables.length).toBeGreaterThanOrEqual(40);
      for (const table of uniqueSchemaTenantTables) {
        expect(
          TENANT_OWNED_TABLES,
          `Schema table '${table}' has a tenant_id column but is missing from TENANT_OWNED_TABLES catalog!`,
        ).toContain(table);
      }
    });

    it('verifies that EVERY table with a tenant_id column has ENABLE & FORCE RLS and a tenant policy in 0003_row_level_security.sql', () => {
      for (const table of uniqueSchemaTenantTables) {
        // 1. ENABLE ROW LEVEL SECURITY
        expect(
          rlsMigrationSql,
          `Table '${table}' lacks ENABLE ROW LEVEL SECURITY in 0003_row_level_security.sql`,
        ).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);

        // 2. FORCE ROW LEVEL SECURITY
        expect(
          rlsMigrationSql,
          `Table '${table}' lacks FORCE ROW LEVEL SECURITY in 0003_row_level_security.sql`,
        ).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);

        // 3. Permissive tenant isolation policy
        expect(
          rlsMigrationSql,
          `Table '${table}' lacks tenant_isolation_${table} policy in 0003_row_level_security.sql`,
        ).toContain(`CREATE POLICY "tenant_isolation_${table}" ON "${table}"`);
      }
    });

    it('verifies non-owner, non-superuser app_runtime role definition and grants', () => {
      expect(rlsMigrationSql).toContain("CREATE ROLE app_runtime WITH LOGIN PASSWORD 'app_runtime_local_pass'");
      expect(rlsMigrationSql).toContain('NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT');
      expect(rlsMigrationSql).toContain('GRANT USAGE ON SCHEMA public, app TO app_runtime;');
      expect(rlsMigrationSql).toContain('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_runtime;');
    });
  });

  describe('2.4 Transaction-Scoped set_config under PgBouncer Pooling', () => {
    it('verifies app.current_tenant_id() and app.is_platform_context() functions exist', () => {
      expect(foundationConstraintsSql).toContain('CREATE SCHEMA IF NOT EXISTS app;');
      expect(foundationConstraintsSql).toContain('CREATE OR REPLACE FUNCTION app.current_tenant_id()');
      expect(foundationConstraintsSql).toContain(
        "SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;",
      );
      expect(foundationConstraintsSql).toContain('CREATE OR REPLACE FUNCTION app.is_platform_context()');
    });

    it('verifies tenant-tx.ts sets is_local = true for PgBouncer transaction-level scoping', () => {
      const tenantTxCode = fs.readFileSync(
        path.resolve(__dirname, '../../src/db/tenant-tx.ts'),
        'utf8',
      );
      // set_config(setting_name, new_value, is_local) -> 3rd argument MUST be true
      expect(tenantTxCode).toContain("set_config('app.current_tenant_id', ${tenantId}, true)");
      expect(tenantTxCode).toContain("set_config('app.is_platform_context', 'true', true)");
    });
  });
});
