import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  uuid,
} from 'drizzle-orm/pg-core';

// Roles: super_admin (all access), registrar (can add attendees), usher (can verify/check-in)
export const roleEnum = pgEnum('user_role', ['super_admin', 'registrar', 'usher']);

// Staff / System Users
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: varchar('full_name', { length: 120 }).notNull(),
  email: varchar('email', { length: 150 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').default('usher').notNull(),
  assignedGateId: integer('assigned_gate_id').references(() => gates.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

//  Hall Entry Points 
export const gates = pgTable('gates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(), 
  isActive: boolean('is_active').default(true).notNull(),
});

//Pre-registered Event Attendees
export const attendees = pgTable('attendees', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  email: varchar('email', { length: 150 }),
  phone: varchar('phone', { length: 30 }),
  ticketTier: varchar('ticket_tier', { length: 50 }).default('standard').notNull(),
  
  // MVP Verification: Short alphanumeric code (e.g., "EVT-94K2")
  accessCode: varchar('access_code', { length: 16 }).notNull().unique(),
  
  qrPayload: text('qr_payload').unique(),
  
  isCheckedIn: boolean('is_checked_in').default(false).notNull(),
  checkedInAt: timestamp('checked_in_at'),
  checkedInGateId: integer('checked_in_gate_id').references(() => gates.id),
  checkedInBy: uuid('checked_in_by').references(() => users.id),
  
  registeredBy: uuid('registered_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Audit & Sync Logs 
export const checkinLogs = pgTable('checkin_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  attendeeId: uuid('attendee_id').references(() => attendees.id).notNull(),
  gateId: integer('gate_id').references(() => gates.id).notNull(),
  usherId: uuid('usher_id').references(() => users.id).notNull(),
  deviceScannedAt: timestamp('device_scanned_at').notNull(),
  syncedAt: timestamp('synced_at').defaultNow().notNull(),
  syncSource: varchar('sync_source', { length: 30 }).default('online').notNull(), // online or lan_sync
});