import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, jsonb, date, index } from "drizzle-orm/pg-core";
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
  businessType: varchar("business_type").notNull().default("traditional"), // freelancer, traditional, retail, consultancy, ecommerce, restaurant
  holidayRegion: varchar("holiday_region").notNull().default("FR"), // French holidays region
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Revenue patterns table for recurring income
export const revenuePatterns = pgTable("revenue_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  frequency: varchar("frequency").notNull(), // daily, monthly, quarterly, yearly
  startMonth: integer("start_month").notNull(), // 1-12
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("20.00"),
  isRecurring: integer("is_recurring").default(1),
  excludeWeekends: integer("exclude_weekends").default(1),
  excludeHolidays: integer("exclude_holidays").default(1),
  // Daily pattern specific fields
  daysMask: integer("days_mask"), // 0-127, bit 0=Sunday through bit 6=Saturday
  dayOffOverrides: jsonb("day_off_overrides"), // [{date, active, reason}]
  startDate: date("start_date"), // Start date for daily patterns
  createdAt: timestamp("created_at").defaultNow(),
});

// Expense patterns table for recurring costs
export const expensePatterns = pgTable("expense_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category").notNull(), // comptabilite, subscription, utilities, rent, etc.
  frequency: varchar("frequency").notNull(), // daily, monthly, quarterly, yearly
  startMonth: integer("start_month").notNull(),
  vatDeductible: integer("vat_deductible").default(1),
  isRecurring: integer("is_recurring").default(1),
  excludeWeekends: integer("exclude_weekends").default(1),
  excludeHolidays: integer("exclude_holidays").default(1),
  // Daily pattern specific fields
  daysMask: integer("days_mask"), // 0-127, bit 0=Sunday through bit 6=Saturday
  dayOffOverrides: jsonb("day_off_overrides"), // [{date, active, reason}]
  startDate: date("start_date"), // Start date for daily patterns
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

// Business types for French companies
const businessTypes = ['freelancer', 'traditional', 'retail', 'consultancy', 'ecommerce', 'restaurant'] as const;

// Daily Pattern Types and Precedence Rules
/**
 * Daily Pattern Engine Precedence Rules:
 * 
 * For DAILY frequency patterns, the engine processes in this order:
 * 1. Base daysMask (bit 0=Sunday through bit 6=Saturday) - defines default working days
 * 2. excludeWeekends flag - if true, removes Saturday (bit 6) and Sunday (bit 0) from daysMask
 * 3. excludeHolidays flag - if true, removes French holidays based on holidayRegion
 * 4. dayOffOverrides array - final override for specific dates
 *    - If override.active=true: force the date to be active (overrides all previous rules)
 *    - If override.active=false: force the date to be inactive (overrides all previous rules)
 * 
 * For NON-DAILY frequencies (monthly, quarterly, yearly):
 * - daysMask, excludeWeekends, excludeHolidays, dayOffOverrides are IGNORED
 * - Only startMonth and other general fields are used
 * 
 * Days of week bit mapping for daysMask:
 * - Bit 0: Sunday
 * - Bit 1: Monday  
 * - Bit 2: Tuesday
 * - Bit 3: Wednesday
 * - Bit 4: Thursday
 * - Bit 5: Friday
 * - Bit 6: Saturday
 * 
 * Example daysMask values:
 * - 127 (0b1111111): All days
 * - 62 (0b0111110): Monday-Friday only  
 * - 96 (0b1100000): Weekend only
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday=0 through Saturday=6

export interface DayOffOverride {
  date: string; // ISO date string (YYYY-MM-DD)
  active: boolean; // true = force active, false = force inactive
  reason?: string; // Optional reason for the override
}

export interface DailyPatternEngine {
  daysMask: number; // 0-127 bit mask for days of week
  excludeWeekends: boolean; // Remove Saturday(6) and Sunday(0) from daysMask
  excludeHolidays: boolean; // Remove French holidays
  dayOffOverrides: DayOffOverride[]; // Final per-date overrides
  holidayRegion: string; // French region for holiday calculation (default: "FR")
}

export interface PatternValidationContext {
  frequency: 'daily' | 'monthly' | 'quarterly' | 'yearly';
  isDailyPattern: boolean; // true if frequency === 'daily'
  requiresDailyFields: boolean; // true if daily fields should be validated
}

// Utility functions for daily pattern operations
export const DailyPatternUtils = {
  /**
   * Convert daysMask to array of day numbers (0=Sunday through 6=Saturday)
   */
  daysMaskToArray(mask: number): DayOfWeek[] {
    const days: DayOfWeek[] = [];
    for (let i = 0; i < 7; i++) {
      if (mask & (1 << i)) {
        days.push(i as DayOfWeek);
      }
    }
    return days;
  },

  /**
   * Convert array of day numbers to daysMask
   */
  arrayToDaysMask(days: DayOfWeek[]): number {
    let mask = 0;
    days.forEach(day => {
      mask |= (1 << day);
    });
    return mask;
  },

  /**
   * Apply excludeWeekends to a daysMask
   */
  applyExcludeWeekends(daysMask: number, excludeWeekends: boolean): number {
    if (!excludeWeekends) return daysMask;
    // Remove Sunday (bit 0) and Saturday (bit 6)
    return daysMask & ~(1 << 0) & ~(1 << 6);
  },

  /**
   * Check if a frequency requires daily pattern fields
   */
  requiresDailyFields(frequency: string): boolean {
    return frequency === 'daily';
  },

  /**
   * Validate daily pattern configuration
   */
  validateDailyPattern(pattern: Partial<DailyPatternEngine>, frequency: string): string[] {
    const errors: string[] = [];
    const isDaily = frequency === 'daily';

    if (isDaily) {
      if (pattern.daysMask === undefined || pattern.daysMask < 0 || pattern.daysMask > 127) {
        errors.push("daysMask is required for daily patterns and must be between 0-127");
      }
    } else {
      // For non-daily patterns, warn if daily fields are provided (they will be ignored)
      if (pattern.daysMask !== undefined || 
          pattern.dayOffOverrides?.length || 
          pattern.excludeWeekends !== undefined || 
          pattern.excludeHolidays !== undefined) {
        errors.push(`Daily pattern fields (daysMask, dayOffOverrides, excludeWeekends, excludeHolidays) are ignored for ${frequency} frequency`);
      }
    }

    return errors;
  }
} as const;

// Schema exports and types
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  businessType: z.enum(businessTypes),
  holidayRegion: z.string().default('FR'),
});

// French VAT rates validation
const frenchVATRates = [0, 5.5, 10, 20] as const;

// Base schema without refinement - for use with .omit() and .partial()
export const insertRevenuePatternBaseSchema = createInsertSchema(revenuePatterns).omit({
  id: true,
  createdAt: true,
}).extend({
  vatRate: z.preprocess(
    (val) => val === undefined || val === null ? "20.00" : String(val),
    z.string().refine(
      (val) => {
        const numVal = parseFloat(val);
        return frenchVATRates.includes(numVal as typeof frenchVATRates[number]);
      },
      { message: "Le taux de TVA doit être l'un des taux français valides: 0%, 5,5%, 10%, ou 20%" }
    )
  ).optional(),
  frequency: z.enum(['daily', 'monthly', 'quarterly', 'yearly']),
  startMonth: z.coerce.number().int().min(1).max(12),
  amount: z.preprocess(
    (val) => String(val),
    z.string().refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      { message: "Le montant doit être positif" }
    )
  ),
  excludeWeekends: z.coerce.number().int().min(0).max(1).optional(),
  excludeHolidays: z.coerce.number().int().min(0).max(1).optional(),
  // Daily pattern specific validations with enhanced logic
  daysMask: z.coerce.number().int().min(0).max(127).optional(), // 0-127 for 7-bit mask
  dayOffOverrides: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"), // ISO date string
    active: z.boolean(),
    reason: z.string().optional()
  })).optional().default([]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").optional(),
});

// Full schema with refinement - for server-side validation
export const insertRevenuePatternSchema = insertRevenuePatternBaseSchema.refine((data) => {
  // Validate daily pattern fields usage based on frequency
  const validationErrors = DailyPatternUtils.validateDailyPattern({
    daysMask: data.daysMask,
    excludeWeekends: data.excludeWeekends === 1,
    excludeHolidays: data.excludeHolidays === 1,
    dayOffOverrides: data.dayOffOverrides,
  }, data.frequency);
  
  if (validationErrors.length > 0) {
    throw new z.ZodError([{
      code: z.ZodIssueCode.custom,
      message: validationErrors.join('; '),
      path: ['frequency']
    }]);
  }
  
  return true;
}, {
  message: "Daily pattern validation failed"
});

// Base schema without refinement - for use with .omit() and .partial()
export const insertExpensePatternBaseSchema = createInsertSchema(expensePatterns).omit({
  id: true,
  createdAt: true,
}).extend({
  frequency: z.enum(['daily', 'monthly', 'quarterly', 'yearly']),
  startMonth: z.coerce.number().int().min(1).max(12),
  amount: z.preprocess(
    (val) => String(val),
    z.string().refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      { message: "Le montant doit être positif" }
    )
  ),
  vatDeductible: z.coerce.number().int().min(0).max(1).optional(),
  excludeWeekends: z.coerce.number().int().min(0).max(1).optional(),
  excludeHolidays: z.coerce.number().int().min(0).max(1).optional(),
  category: z.enum(['general', 'rent', 'utilities', 'subscription', 'insurance', 'marketing', 'travel', 'equipment']),
  // Daily pattern specific validations with enhanced logic
  daysMask: z.coerce.number().int().min(0).max(127).optional(), // 0-127 for 7-bit mask
  dayOffOverrides: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"), // ISO date string
    active: z.boolean(),
    reason: z.string().optional()
  })).optional().default([]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").optional(),
});

// Full schema with refinement - for server-side validation
export const insertExpensePatternSchema = insertExpensePatternBaseSchema.refine((data) => {
  // Validate daily pattern fields usage based on frequency
  const validationErrors = DailyPatternUtils.validateDailyPattern({
    daysMask: data.daysMask,
    excludeWeekends: data.excludeWeekends === 1,
    excludeHolidays: data.excludeHolidays === 1,
    dayOffOverrides: data.dayOffOverrides,
  }, data.frequency);
  
  if (validationErrors.length > 0) {
    throw new z.ZodError([{
      code: z.ZodIssueCode.custom,
      message: validationErrors.join('; '),
      path: ['frequency']
    }]);
  }
  
  return true;
}, {
  message: "Daily pattern validation failed"
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

