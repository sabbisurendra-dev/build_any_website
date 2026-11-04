import { relations } from 'drizzle-orm';
import {
  bookingHolds,
  bookingItems,
  bookings,
  bookingStatusHistory,
  customers,
  notifications,
  payments,
  refunds,
} from './bookings-payments';
import {
  availabilityExceptions,
  availabilityRules,
  bookingSessions,
  resources,
  services,
  staffMembers,
  staffServices,
} from './catalog-availability';
import {
  auditLogs,
  businessProfiles,
  locations,
  permissions,
  rolePermissions,
  roles,
  subscriptions,
  tenantMemberships,
  tenantOnboardingSteps,
  tenantPaymentConfigs,
  tenants,
  users,
} from './tenancy';
import {
  pageLayouts,
  pages,
  templates,
  websiteVersions,
  websites,
} from './website-builder';

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  businessProfile: one(businessProfiles, {
    fields: [tenants.id],
    references: [businessProfiles.tenantId],
  }),
  subscription: one(subscriptions, {
    fields: [tenants.id],
    references: [subscriptions.tenantId],
  }),
  paymentConfig: one(tenantPaymentConfigs, {
    fields: [tenants.id],
    references: [tenantPaymentConfigs.tenantId],
  }),
  onboardingSteps: many(tenantOnboardingSteps),
  locations: many(locations),
  memberships: many(tenantMemberships),
  websites: many(websites),
  resources: many(resources),
  services: many(services),
  staffMembers: many(staffMembers),
  customers: many(customers),
  bookings: many(bookings),
  auditLogs: many(auditLogs),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  memberships: many(tenantMemberships),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const tenantMembershipsRelations = relations(tenantMemberships, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantMemberships.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [tenantMemberships.userId], references: [users.id] }),
  role: one(roles, { fields: [tenantMemberships.roleId], references: [roles.id] }),
}));

export const websitesRelations = relations(websites, ({ one, many }) => ({
  tenant: one(tenants, { fields: [websites.tenantId], references: [tenants.id] }),
  primaryLocation: one(locations, {
    fields: [websites.primaryLocationId],
    references: [locations.id],
  }),
  sourceTemplate: one(templates, {
    fields: [websites.sourceTemplateId],
    references: [templates.id],
  }),
  publishedVersion: one(websiteVersions, {
    fields: [websites.publishedVersionId],
    references: [websiteVersions.id],
  }),
  pages: many(pages),
  versions: many(websiteVersions),
}));

export const pagesRelations = relations(pages, ({ one }) => ({
  website: one(websites, { fields: [pages.websiteId], references: [websites.id] }),
  layout: one(pageLayouts, { fields: [pages.id], references: [pageLayouts.pageId] }),
}));

export const pageLayoutsRelations = relations(pageLayouts, ({ one }) => ({
  page: one(pages, { fields: [pageLayouts.pageId], references: [pages.id] }),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  tenant: one(tenants, { fields: [locations.tenantId], references: [tenants.id] }),
  resources: many(resources),
  services: many(services),
  staffMembers: many(staffMembers),
  availabilityRules: many(availabilityRules),
  availabilityExceptions: many(availabilityExceptions),
  bookingSessions: many(bookingSessions),
}));

export const staffMembersRelations = relations(staffMembers, ({ one, many }) => ({
  tenant: one(tenants, { fields: [staffMembers.tenantId], references: [tenants.id] }),
  location: one(locations, { fields: [staffMembers.locationId], references: [locations.id] }),
  user: one(users, { fields: [staffMembers.userId], references: [users.id] }),
  staffServices: many(staffServices),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  tenant: one(tenants, { fields: [services.tenantId], references: [tenants.id] }),
  location: one(locations, { fields: [services.locationId], references: [locations.id] }),
  staffServices: many(staffServices),
  sessions: many(bookingSessions),
}));

export const staffServicesRelations = relations(staffServices, ({ one }) => ({
  staffMember: one(staffMembers, {
    fields: [staffServices.staffMemberId],
    references: [staffMembers.id],
  }),
  service: one(services, {
    fields: [staffServices.serviceId],
    references: [services.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  tenant: one(tenants, { fields: [bookings.tenantId], references: [tenants.id] }),
  location: one(locations, { fields: [bookings.locationId], references: [locations.id] }),
  customer: one(customers, { fields: [bookings.customerId], references: [customers.id] }),
  hold: one(bookingHolds, { fields: [bookings.id], references: [bookingHolds.bookingId] }),
  items: many(bookingItems),
  statusHistory: many(bookingStatusHistory),
  payments: many(payments),
  refunds: many(refunds),
  notifications: many(notifications),
}));

export const bookingItemsRelations = relations(bookingItems, ({ one }) => ({
  booking: one(bookings, { fields: [bookingItems.bookingId], references: [bookings.id] }),
  resource: one(resources, { fields: [bookingItems.resourceId], references: [resources.id] }),
  staffMember: one(staffMembers, {
    fields: [bookingItems.staffMemberId],
    references: [staffMembers.id],
  }),
  service: one(services, { fields: [bookingItems.serviceId], references: [services.id] }),
  session: one(bookingSessions, {
    fields: [bookingItems.sessionId],
    references: [bookingSessions.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
  refunds: many(refunds),
}));
