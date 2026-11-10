# Archived Implementation: Synchronous JSON State Persistence

- **Original Location:** `src/modules/persistence/runtime-store.ts` (`RuntimeStateRepository.persist()`) and `src/modules/ai-cos/persistence/cos-store.ts` (`CosStoreRepository.persist()`)
- **Archival Date:** November 10, 2026
- **Status:** Archived & Deprecated (`CATEGORY_2_ARCHIVED`)
- **Tags:** `PERSISTENCE`, `RUNTIME_STORE`, `DEPRECATED`
- **Replacement:** Asynchronous debounced atomic persistence with coalesced writes (`RuntimeStateRepository.persist(immediate?: boolean)`).

---

## 1. Description of Original Implementation
The original persistence implementation performed full synchronous serialization (`JSON.stringify(state, null, 2)`) of a ~250 KB snapshot followed by `node:fs.writeFileSync(RUNTIME_FILE_PATH, ...)` and `node:fs.statSync(...)` on every single state mutation (order creation, inventory hold, draft layout save, audit log entry).

## 2. Why It Was Retired
1. **Event Loop Latency:** Running synchronous stringify and blocking disk writes on every HTTP request introduced 5–15 ms of event loop blocking per mutation.
2. **Write Storms:** In concurrent request spikes (such as 23 users booking simultaneously), 23 synchronous writes would compete for the exact same file lock, causing disk thrashing.
3. **Serverless Limitations:** The root filesystem is read-only in production Vercel lambdas; writing to `.runtime-state.json` threw silent warnings.

## 3. Preserved Snippet for Reference
```typescript
public static persist(): void {
  if (isVitestEnvironment() || !globalThis.__smbRuntimeSnapshot) {
    return;
  }
  try {
    writeFileSync(
      RUNTIME_FILE_PATH,
      JSON.stringify(globalThis.__smbRuntimeSnapshot, null, 2),
      'utf8',
    );
    const stat = statSync(RUNTIME_FILE_PATH);
    globalThis.__smbRuntimeMtimeMs = stat.mtimeMs;
  } catch {
    // Ignore write failures in read-only environments
  }
}
```

## 4. Replacement Benefits
The replacement implements an in-memory authoritative state cache with a 50ms debounced asynchronous microtask queue. Rapid successive mutations are coalesced into a single disk sync without blocking the Node.js event loop, while tests remain 100% in-memory and instantaneous.
