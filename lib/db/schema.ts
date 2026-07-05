import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  boolean,
  real,
  json,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccount } from "next-auth/adapters";

// --- NextAuth.js Tables (Customized with phone and stripeCustomerId) ---

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  phone: text("phone"),
  stripeCustomerId: text("stripe_customer_id"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    {
      parent: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [
    {
      parent: primaryKey({ columns: [vt.identifier, vt.token] }),
    },
  ]
);

// --- Nexus Scan Custom Core Tables ---

export const scans = pgTable("scans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  city: text("city").notNull(),
  niche: text("niche").notNull(),
  status: text("status", { enum: ["pending", "processing", "completed", "failed"] })
    .default("pending")
    .notNull(),
  totalLeadsFound: integer("total_leads_found").default(0).notNull(),
  highPriorityCount: integer("high_priority_count").default(0).notNull(),
  pricePaid: integer("price_paid").default(0).notNull(), // stored in cents (BRL)
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: "date" }),
  reportUrl: text("report_url"),
});

export const leads = pgTable("leads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  scanId: text("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull(),
  category: text("category"),
  address: text("address"),
  phone: text("phone"),
  hasWebsite: boolean("has_website").default(false).notNull(),
  hasInstagram: boolean("has_instagram").default(false).notNull(),
  hasFacebook: boolean("has_facebook").default(false).notNull(),
  reviewCount: integer("review_count").default(0).notNull(),
  rating: real("rating"), // real is floating-point
  hasPhotos: boolean("has_photos").default(false).notNull(),
  hasOpeningHours: boolean("has_opening_hours").default(false).notNull(),
  websiteUrl: text("website_url"),
  instagramUrl: text("instagram_url"),
  facebookUrl: text("facebook_url"),
  opportunityScore: integer("opportunity_score").default(0).notNull(), // 0 to 100
  opportunityReason: json("opportunity_reason").$type<string[]>().default([]).notNull(),
  whatsappMessage: text("whatsapp_message"),
  googleMapsUrl: text("google_maps_url"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  scanId: text("scan_id")
    .references(() => scans.id, { onDelete: "set null" }),
  stripePaymentIntentId: text("stripe_payment_intent_id").unique().notNull(),
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").default("BRL").notNull(),
  status: text("status").notNull(), // e.g. 'succeeded', 'failed', 'refunded'
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const citiesCache = pgTable("cities_cache", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  cityName: text("city_name").notNull(),
  state: text("state").notNull(),
  lastScannedAt: timestamp("last_scanned_at", { mode: "date" }).defaultNow().notNull(),
  totalBusinesses: integer("total_businesses").default(0).notNull(),
  businessesWithoutWebsite: integer("businesses_without_website").default(0).notNull(),
  scanDataHash: text("scan_data_hash"),
});

// --- Relations Config (Optional helper for relational queries) ---

export const usersRelations = relations(users, ({ many }) => ({
  scans: many(scans),
  payments: many(payments),
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const scansRelations = relations(scans, ({ one, many }) => ({
  user: one(users, {
    fields: [scans.userId],
    references: [users.id],
  }),
  leads: many(leads),
  payments: many(payments),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  scan: one(scans, {
    fields: [leads.scanId],
    references: [scans.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  scan: one(scans, {
    fields: [payments.scanId],
    references: [scans.id],
  }),
}));
