import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Companies table for French business simulation
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  legalForm: varchar("legal_form").notNull(), // sarl, sas, eurl, sa, sasu
  activitySector: varchar("activity_sector").notNull(),
  capital: integer("capital").notNull(),
  bankPartner: varchar("bank_partner").notNull(),
  siretNumber: varchar("siret_number"),
  vatNumber: varchar("vat_number"),
  fiscalYear: varchar("fiscal_year").default("calendar"), // calendar or fiscal
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Revenue patterns table for recurring income
export const revenuePatterns = pgTable("revenue_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  frequency: varchar("frequency").notNull(), // monthly, quarterly, yearly
  startMonth: integer("start_month").notNull(), // 1-12
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("20.00"),
  isRecurring: integer("is_recurring").default(1),
  excludeWeekends: integer("exclude_weekends").default(1),
  excludeHolidays: integer("exclude_holidays").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expense patterns table for recurring costs
export const expensePatterns = pgTable("expense_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category").notNull(), // comptabilite, subscription, utilities, rent, etc.
  frequency: varchar("frequency").notNull(),
  startMonth: integer("start_month").notNull(),
  vatDeductible: integer("vat_deductible").default(1),
  isRecurring: integer("is_recurring").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Simulations table to store simulation runs
export const simulations = pgTable("simulations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  status: varchar("status").default("draft"), // draft, running, completed, failed
  results: jsonb("results"), // Store monthly cash flows and account balances
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }),
  totalExpenses: decimal("total_expenses", { precision: 12, scale: 2 }),
  netProfit: decimal("net_profit", { precision: 12, scale: 2 }),
  totalTaxes: decimal("total_taxes", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Account balances table for tracking different fiscal accounts
export const accountBalances = pgTable("account_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  simulationId: varchar("simulation_id").notNull(),
  accountType: varchar("account_type").notNull(), // asset, revenue, expense, tax
  accountName: text("account_name").notNull(),
  month: integer("month").notNull(), // 1-12
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull(),
  transactions: jsonb("transactions"), // Store individual transactions for the month
});

// Tax calculations table for French fiscal obligations
export const taxCalculations = pgTable("tax_calculations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  simulationId: varchar("simulation_id").notNull(),
  taxType: varchar("tax_type").notNull(), // tva, urssaf, is, cvae, etc.
  month: integer("month").notNull(),
  taxableBase: decimal("taxable_base", { precision: 12, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date"),
  paid: integer("paid").default(0),
});

// Schema exports and types
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRevenuePatternSchema = createInsertSchema(revenuePatterns).omit({
  id: true,
  createdAt: true,
});

export const insertExpensePatternSchema = createInsertSchema(expensePatterns).omit({
  id: true,
  createdAt: true,
});

export const insertSimulationSchema = createInsertSchema(simulations).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type RevenuePattern = typeof revenuePatterns.$inferSelect;
export type InsertRevenuePattern = z.infer<typeof insertRevenuePatternSchema>;
export type ExpensePattern = typeof expensePatterns.$inferSelect;
export type InsertExpensePattern = z.infer<typeof insertExpensePatternSchema>;
export type Simulation = typeof simulations.$inferSelect;
export type InsertSimulation = z.infer<typeof insertSimulationSchema>;
export type AccountBalance = typeof accountBalances.$inferSelect;
export type TaxCalculation = typeof taxCalculations.$inferSelect;