/**
 * Pattern Expansion Engine
 * 
 * Expands revenue and expense patterns into individual occurrences based on:
 * - Frequency (daily, monthly, quarterly, yearly)
 * - Daily schema precedence rules
 * - French business calendar integration
 * - VAT calculations and account postings
 */

import { 
  type RevenuePattern, 
  type ExpensePattern, 
  type Company,
  type DayOffOverride,
  DailyPatternUtils 
} from '@shared/schema';
import { getFrenchHolidays } from './holidays';

/**
 * Occurrence represents a single financial transaction generated from a pattern
 */
export interface Occurrence {
  id: string;
  patternId: string;
  patternName: string;
  date: string; // ISO date string (YYYY-MM-DD)
  type: 'revenue' | 'expense';
  category?: string; // For expenses
  
  // Financial amounts
  grossAmount: number; // Original pattern amount
  vatRate: number; // VAT rate as decimal (e.g., 0.20 for 20%)
  vatAmount: number; // Calculated VAT amount
  netAmount: number; // Amount without VAT
  vatDeductible?: boolean; // For expenses only
  
  // Account postings
  accountPostings: AccountPosting[];
  
  // Metadata
  frequency: string;
  generatedBy: 'pattern-expansion';
  isRecurring: boolean;
}

/**
 * Account posting for double-entry bookkeeping
 */
export interface AccountPosting {
  account: 'operating' | 'savings' | 'personal' | 'vat';
  amount: number; // Positive for debits, negative for credits
  description: string;
}

/**
 * Utility function to generate unique occurrence ID
 */
function generateOccurrenceId(patternId: string, date: string, suffix?: string): string {
  const base = `${patternId}-${date}`;
  return suffix ? `${base}-${suffix}` : base;
}

/**
 * Calculate VAT amounts for a given gross amount and rate
 */
function calculateVAT(grossAmount: number, vatRate: number): { vatAmount: number; netAmount: number } {
  const vatAmount = grossAmount * vatRate / (1 + vatRate);
  const netAmount = grossAmount - vatAmount;
  return { vatAmount, netAmount };
}

/**
 * Generate account postings for a revenue occurrence
 */
function generateRevenuePostings(occurrence: Occurrence): AccountPosting[] {
  return [
    {
      account: 'operating',
      amount: occurrence.netAmount,
      description: `Revenue: ${occurrence.patternName}`,
    },
    {
      account: 'vat',
      amount: occurrence.vatAmount,
      description: `VAT on revenue: ${occurrence.patternName}`,
    },
  ];
}

/**
 * Generate account postings for an expense occurrence
 */
function generateExpensePostings(occurrence: Occurrence): AccountPosting[] {
  const postings: AccountPosting[] = [
    {
      account: 'operating',
      amount: -occurrence.netAmount, // Negative for expense
      description: `Expense: ${occurrence.patternName}`,
    },
  ];
  
  // Only add VAT deduction if VAT is deductible
  if (occurrence.vatDeductible && occurrence.vatAmount > 0) {
    postings.push({
      account: 'vat',
      amount: -occurrence.vatAmount, // Negative for VAT recovery
      description: `Deductible VAT: ${occurrence.patternName}`,
    });
  }
  
  return postings;
}

/**
 * Check if a date should be active based on daily pattern rules
 * 
 * Precedence order:
 * 1. daysMask - base working days
 * 2. excludeWeekends - removes weekends from daysMask
 * 3. excludeHolidays - removes holidays from result
 * 4. dayOffOverrides - final per-date overrides
 */
function isDateActive(
  date: Date,
  pattern: RevenuePattern | ExpensePattern,
  holidays: Set<string>
): boolean {
  const dateStr = formatDateISO(date);
  const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
  
  // Step 4: Check dayOffOverrides first (highest precedence)
  if (pattern.dayOffOverrides) {
    const overrides = pattern.dayOffOverrides as DayOffOverride[];
    const override = overrides.find(o => o.date === dateStr);
    if (override) {
      return override.active; // Override takes absolute precedence
    }
  }
  
  // Step 1: Check daysMask (base working days)
  let isActive = false;
  if (pattern.daysMask !== null && pattern.daysMask !== undefined) {
    const dayBit = 1 << dayOfWeek;
    isActive = (pattern.daysMask & dayBit) !== 0;
  } else {
    // If no daysMask, assume all days are active by default
    isActive = true;
  }
  
  // Step 2: Apply excludeWeekends
  if (isActive && pattern.excludeWeekends) {
    // Remove Saturday (6) and Sunday (0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      isActive = false;
    }
  }
  
  // Step 3: Apply excludeHolidays
  if (isActive && pattern.excludeHolidays) {
    if (holidays.has(dateStr)) {
      isActive = false;
    }
  }
  
  return isActive;
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 */
function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add months to a date
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Get the first day of a month
 */
function getFirstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1); // month is 0-indexed
}

/**
 * Get the last day of a month  
 */
function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0); // Day 0 of next month = last day of current month
}

/**
 * Expand a daily pattern into occurrences
 */
function expandDailyPattern(
  pattern: RevenuePattern | ExpensePattern,
  company: Company,
  year: number,
  holidays: Set<string>
): Occurrence[] {
  const occurrences: Occurrence[] = [];
  
  // Determine the date range for expansion
  let startDate: Date;
  if (pattern.startDate) {
    startDate = new Date(pattern.startDate);
  } else {
    // Default to start of the specified start month
    startDate = getFirstDayOfMonth(year, pattern.startMonth);
  }
  
  const endDate = new Date(year, 11, 31); // End of year
  
  // Ensure we don't start before the target year
  if (startDate.getFullYear() < year) {
    startDate = new Date(year, 0, 1);
  }
  
  // Ensure we don't go beyond the target year
  if (startDate.getFullYear() > year) {
    return []; // No occurrences for this year
  }
  
  // Generate daily occurrences
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (isDateActive(currentDate, pattern, holidays)) {
      const occurrence = createOccurrence(pattern, company, new Date(currentDate));
      occurrences.push(occurrence);
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return occurrences;
}

/**
 * Expand a monthly pattern into occurrences
 */
function expandMonthlyPattern(
  pattern: RevenuePattern | ExpensePattern,
  company: Company,
  year: number
): Occurrence[] {
  const occurrences: Occurrence[] = [];
  
  // Generate monthly occurrences starting from startMonth
  for (let month = pattern.startMonth; month <= 12; month++) {
    const date = getFirstDayOfMonth(year, month);
    const occurrence = createOccurrence(pattern, company, date);
    occurrences.push(occurrence);
  }
  
  return occurrences;
}

/**
 * Expand a quarterly pattern into occurrences
 */
function expandQuarterlyPattern(
  pattern: RevenuePattern | ExpensePattern,
  company: Company,
  year: number
): Occurrence[] {
  const occurrences: Occurrence[] = [];
  
  // Determine which quarter the startMonth falls into
  const startQuarter = Math.ceil(pattern.startMonth / 3);
  
  // Generate quarterly occurrences
  for (let quarter = startQuarter; quarter <= 4; quarter++) {
    const quarterStartMonth = (quarter - 1) * 3 + 1; // Q1=1, Q2=4, Q3=7, Q4=10
    const date = getFirstDayOfMonth(year, quarterStartMonth);
    const occurrence = createOccurrence(pattern, company, date);
    occurrences.push(occurrence);
  }
  
  return occurrences;
}

/**
 * Expand a yearly pattern into occurrences
 */
function expandYearlyPattern(
  pattern: RevenuePattern | ExpensePattern,
  company: Company,
  year: number
): Occurrence[] {
  const occurrences: Occurrence[] = [];
  
  // Generate single yearly occurrence at startMonth
  const date = getFirstDayOfMonth(year, pattern.startMonth);
  const occurrence = createOccurrence(pattern, company, date);
  occurrences.push(occurrence);
  
  return occurrences;
}

/**
 * Create a single occurrence from a pattern
 */
function createOccurrence(
  pattern: RevenuePattern | ExpensePattern,
  company: Company,
  date: Date
): Occurrence {
  const grossAmount = parseFloat(String(pattern.amount));
  const vatRate = 'vatRate' in pattern && pattern.vatRate
    ? parseFloat(String(pattern.vatRate)) / 100 // Convert percentage to decimal
    : 0.20; // Default to 20% VAT
  
  const { vatAmount, netAmount } = calculateVAT(grossAmount, vatRate);
  
  const occurrence: Occurrence = {
    id: generateOccurrenceId(pattern.id, formatDateISO(date)),
    patternId: pattern.id,
    patternName: pattern.name,
    date: formatDateISO(date),
    type: 'vatRate' in pattern ? 'revenue' : 'expense',
    category: 'category' in pattern ? pattern.category : undefined,
    grossAmount,
    vatRate,
    vatAmount,
    netAmount,
    vatDeductible: 'vatDeductible' in pattern ? Boolean(pattern.vatDeductible) : undefined,
    accountPostings: [], // Will be filled below
    frequency: pattern.frequency,
    generatedBy: 'pattern-expansion',
    isRecurring: Boolean(pattern.isRecurring),
  };
  
  // Generate account postings based on type
  if (occurrence.type === 'revenue') {
    occurrence.accountPostings = generateRevenuePostings(occurrence);
  } else {
    occurrence.accountPostings = generateExpensePostings(occurrence);
  }
  
  return occurrence;
}

/**
 * Main function to expand a pattern into occurrences
 * 
 * @param pattern - The revenue or expense pattern to expand
 * @param company - Company information for context
 * @param year - The year to generate occurrences for
 * @returns Array of occurrences generated from the pattern
 */
export function expandPattern(
  pattern: RevenuePattern | ExpensePattern,
  company: Company,
  year: number
): Occurrence[] {
  console.log(`🔧 Expanding pattern: ${pattern.name || 'unnamed'} (${pattern.frequency}) for year ${year}`);
  
  // Pre-calculate holidays for the year using company's holiday region
  const holidayRegion = company.holidayRegion || 'FR';
  const holidays = getFrenchHolidays(year, holidayRegion);
  
  let occurrences: Occurrence[] = [];
  
  // Expand based on frequency
  switch (pattern.frequency) {
    case 'daily':
      occurrences = expandDailyPattern(pattern, company, year, holidays);
      console.log(`   📅 Daily pattern generated ${occurrences.length} occurrences`);
      break;
      
    case 'monthly':
      occurrences = expandMonthlyPattern(pattern, company, year);
      console.log(`   📅 Monthly pattern generated ${occurrences.length} occurrences`);
      break;
      
    case 'quarterly':
      occurrences = expandQuarterlyPattern(pattern, company, year);
      console.log(`   📅 Quarterly pattern generated ${occurrences.length} occurrences`);
      break;
      
    case 'yearly':
      occurrences = expandYearlyPattern(pattern, company, year);
      console.log(`   📅 Yearly pattern generated ${occurrences.length} occurrences`);
      break;
      
    default:
      console.warn(`Unknown frequency: ${pattern.frequency}`);
      occurrences = [];
  }
  
  return occurrences;
}

/**
 * Expand multiple patterns into a combined list of occurrences
 * 
 * @param revenuePatterns - Array of revenue patterns
 * @param expensePatterns - Array of expense patterns  
 * @param company - Company information
 * @param year - Target year
 * @returns Combined array of all occurrences sorted by date
 */
export function expandAllPatterns(
  revenuePatterns: RevenuePattern[],
  expensePatterns: ExpensePattern[],
  company: Company,
  year: number
): Occurrence[] {
  const allOccurrences: Occurrence[] = [];
  
  // Expand revenue patterns
  revenuePatterns.forEach(pattern => {
    const occurrences = expandPattern(pattern, company, year);
    allOccurrences.push(...occurrences);
  });
  
  // Expand expense patterns
  expensePatterns.forEach(pattern => {
    const occurrences = expandPattern(pattern, company, year);
    allOccurrences.push(...occurrences);
  });
  
  // Sort by date
  return allOccurrences.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Filter occurrences by date range
 */
export function filterOccurrencesByDateRange(
  occurrences: Occurrence[],
  startDate: string,
  endDate: string
): Occurrence[] {
  return occurrences.filter(occ => 
    occ.date >= startDate && occ.date <= endDate
  );
}

/**
 * Group occurrences by month
 */
export function groupOccurrencesByMonth(occurrences: Occurrence[]): Map<string, Occurrence[]> {
  const grouped = new Map<string, Occurrence[]>();
  
  occurrences.forEach(occ => {
    const monthKey = occ.date.substring(0, 7); // YYYY-MM
    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, []);
    }
    grouped.get(monthKey)!.push(occ);
  });
  
  return grouped;
}

/**
 * Calculate totals from occurrences
 */
export interface OccurrenceTotals {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalVAT: number;
  deductibleVAT: number;
  netVAT: number; // VAT owed (collected - deductible)
}

export function calculateOccurrenceTotals(occurrences: Occurrence[]): OccurrenceTotals {
  let totalRevenue = 0;
  let totalExpenses = 0;
  let collectedVAT = 0;
  let deductibleVAT = 0;
  
  occurrences.forEach(occ => {
    if (occ.type === 'revenue') {
      totalRevenue += occ.netAmount;
      collectedVAT += occ.vatAmount;
    } else {
      totalExpenses += occ.netAmount;
      if (occ.vatDeductible) {
        deductibleVAT += occ.vatAmount;
      }
    }
  });
  
  return {
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    totalVAT: collectedVAT,
    deductibleVAT,
    netVAT: collectedVAT - deductibleVAT,
  };
}