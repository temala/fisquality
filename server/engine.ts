/**
 * Core Simulation Engine
 * 
 * Aggregates occurrences into monthly buckets per account with proper VAT accounting.
 * Implements the main financial simulation logic for French business accounting.
 */

import { 
  type Company,
  type SimulationInputs,
  type Account 
} from '@shared/schema';
import { 
  type Occurrence, 
  type AccountPosting,
  expandAllPatterns 
} from './occurrences';

/**
 * Monthly account balance with detailed transaction records
 */
export interface MonthlyAccountBalance {
  account: Account;
  month: number; // 1-12
  openingBalance: number;
  transactions: TransactionRecord[];
  closingBalance: number;
  summary: {
    totalDebits: number;
    totalCredits: number;
    netChange: number;
  };
}

/**
 * Individual transaction record within a month
 */
export interface TransactionRecord {
  id: string;
  date: string; // ISO date string
  description: string;
  amount: number; // Positive for debits, negative for credits
  sourceOccurrenceId: string;
  patternName: string;
  type: 'revenue' | 'expense';
  category?: string;
}

/**
 * Simulation results structure
 */
export interface SimulationResults {
  year: number;
  fiscalStartMonth: number;
  monthlyBalances: MonthlyAccountBalance[];
  monthlyTotals: MonthlySummary[];
  overallTotals: OverallSummary;
  metadata: {
    totalOccurrences: number;
    processingTimeMs: number;
    engineVersion: string;
  };
}

/**
 * Monthly financial summary
 */
export interface MonthlySummary {
  month: number;
  monthName: string;
  revenue: {
    gross: number;
    net: number;
    vat: number;
  };
  expenses: {
    gross: number;
    net: number;
    vat: number;
    deductibleVat: number;
  };
  netProfit: number;
  netVatPosition: number; // Positive = owe VAT, negative = VAT refund
  accountBalances: {
    [K in Account]: number;
  };
}

/**
 * Overall simulation summary
 */
export interface OverallSummary {
  totalRevenue: {
    gross: number;
    net: number;
    vat: number;
  };
  totalExpenses: {
    gross: number;
    net: number;
    vat: number;
    deductibleVat: number;
  };
  netProfit: number;
  totalVatCollected: number;
  totalVatDeductible: number;
  netVatOwed: number;
  finalAccountBalances: {
    [K in Account]: number;
  };
}

/**
 * Engine configuration
 */
export interface EngineConfig {
  version: string;
  performanceTarget: number; // ms
  maxPatterns: number;
}

const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  version: 'v1',
  performanceTarget: 200,
  maxPatterns: 100,
};

/**
 * Get month name from number
 */
function getMonthName(month: number): string {
  const names = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return names[month] || `Month ${month}`;
}

/**
 * Get fiscal month name for display (e.g., "April (Month 1)" for April-March fiscal year)
 */
function getFiscalMonthName(calendarMonth: number, fiscalStartMonth: number): string {
  const monthName = getMonthName(calendarMonth);
  if (fiscalStartMonth === 1) {
    // Calendar year - just return the month name
    return monthName;
  }
  
  // Calculate fiscal month number (1-12)
  const fiscalMonth = ((calendarMonth - fiscalStartMonth + 12) % 12) + 1;
  return `${monthName} (FY Month ${fiscalMonth})`;
}

/**
 * Convert calendar month to fiscal month number
 */
function calendarToFiscalMonth(calendarMonth: number, fiscalStartMonth: number): number {
  return ((calendarMonth - fiscalStartMonth + 12) % 12) + 1;
}

/**
 * Convert fiscal month to calendar month
 */
function fiscalToCalendarMonth(fiscalMonth: number, fiscalStartMonth: number): number {
  return ((fiscalMonth - 1 + fiscalStartMonth - 1) % 12) + 1;
}

/**
 * Get months in fiscal order for processing
 */
function getFiscalMonthOrder(fiscalStartMonth: number): number[] {
  const months: number[] = [];
  for (let i = 0; i < 12; i++) {
    months.push(((fiscalStartMonth + i - 1) % 12) + 1);
  }
  return months;
}

/**
 * Create initial account balances from starting balances
 * FIXED: Initialize opening balances at the fiscal start month, not just January
 */
function createInitialBalances(
  startingBalances: SimulationInputs['startingBalances'],
  fiscalStartMonth: number
): Map<Account, MonthlyAccountBalance[]> {
  const accounts: Account[] = ['operating', 'savings', 'personal', 'vat'];
  const balanceMap = new Map<Account, MonthlyAccountBalance[]>();
  
  accounts.forEach(account => {
    const monthlyBalances: MonthlyAccountBalance[] = [];
    
    for (let month = 1; month <= 12; month++) {
      if (month === fiscalStartMonth) {
        // Fiscal start month: Start with the initial balance
        monthlyBalances.push({
          account,
          month,
          openingBalance: startingBalances[account],
          transactions: [],
          closingBalance: startingBalances[account], // Will be updated as transactions are added
          summary: {
            totalDebits: 0,
            totalCredits: 0,
            netChange: 0,
          },
        });
      } else {
        // Other months: Opening balance will be set by roll-forward
        monthlyBalances.push({
          account,
          month,
          openingBalance: 0, // Will be set by finalizeBalances() roll-forward
          transactions: [],
          closingBalance: 0, // Will be calculated from opening balance + transactions
          summary: {
            totalDebits: 0,
            totalCredits: 0,
            netChange: 0,
          },
        });
      }
    }
    
    balanceMap.set(account, monthlyBalances);
  });
  
  return balanceMap;
}

/**
 * Apply an occurrence's account postings to the monthly balances
 * FIXED: Only update the specific month, roll-forward will be handled by finalizeBalances()
 */
function applyOccurrenceToBalances(
  occurrence: Occurrence,
  balanceMap: Map<Account, MonthlyAccountBalance[]>
): void {
  const month = parseInt(occurrence.date.substring(5, 7)); // Extract month from YYYY-MM-DD
  
  occurrence.accountPostings.forEach(posting => {
    const accountBalances = balanceMap.get(posting.account);
    if (!accountBalances) return;
    
    const monthlyBalance = accountBalances[month - 1]; // 0-indexed
    
    // Create transaction record
    const transaction: TransactionRecord = {
      id: `${occurrence.id}-${posting.account}`,
      date: occurrence.date,
      description: posting.description,
      amount: posting.amount,
      sourceOccurrenceId: occurrence.id,
      patternName: occurrence.patternName,
      type: occurrence.type,
      category: occurrence.category,
    };
    
    monthlyBalance.transactions.push(transaction);
    
    // Update balance and summary for this month only
    if (posting.amount > 0) {
      monthlyBalance.summary.totalDebits += posting.amount;
    } else {
      monthlyBalance.summary.totalCredits += Math.abs(posting.amount);
    }
    
    monthlyBalance.summary.netChange += posting.amount;
    
    // Note: We don't update closingBalance here or subsequent months
    // This will be handled by finalizeBalances() which properly rolls forward balances
  });
}

/**
 * Calculate monthly summaries from account balances
 * FIXED: Return summaries in fiscal year order with proper fiscal month names
 */
function calculateMonthlySummaries(
  balanceMap: Map<Account, MonthlyAccountBalance[]>,
  occurrences: Occurrence[],
  fiscalStartMonth: number
): MonthlySummary[] {
  const monthlySummaries: MonthlySummary[] = [];
  
  // Group occurrences by month
  const occurrencesByMonth = new Map<number, Occurrence[]>();
  occurrences.forEach(occ => {
    const month = parseInt(occ.date.substring(5, 7));
    if (!occurrencesByMonth.has(month)) {
      occurrencesByMonth.set(month, []);
    }
    occurrencesByMonth.get(month)!.push(occ);
  });
  
  // Get months in fiscal order
  const fiscalMonthOrder = getFiscalMonthOrder(fiscalStartMonth);
  
  fiscalMonthOrder.forEach(month => {
    const monthOccurrences = occurrencesByMonth.get(month) || [];
    
    // Calculate revenue totals for the month
    const revenueOccurrences = monthOccurrences.filter(occ => occ.type === 'revenue');
    const revenue = {
      gross: revenueOccurrences.reduce((sum, occ) => sum + occ.grossAmount, 0),
      net: revenueOccurrences.reduce((sum, occ) => sum + occ.netAmount, 0),
      vat: revenueOccurrences.reduce((sum, occ) => sum + occ.vatAmount, 0),
    };
    
    // Calculate expense totals for the month
    const expenseOccurrences = monthOccurrences.filter(occ => occ.type === 'expense');
    const expenses = {
      gross: expenseOccurrences.reduce((sum, occ) => sum + occ.grossAmount, 0),
      net: expenseOccurrences.reduce((sum, occ) => sum + occ.netAmount, 0),
      vat: expenseOccurrences.reduce((sum, occ) => sum + occ.vatAmount, 0),
      deductibleVat: expenseOccurrences.reduce((sum, occ) => 
        sum + (occ.vatDeductible ? occ.vatAmount : 0), 0),
    };
    
    // Get account balances for the month
    const accountBalances: { [K in Account]: number } = {
      operating: balanceMap.get('operating')![month - 1].closingBalance,
      savings: balanceMap.get('savings')![month - 1].closingBalance,
      personal: balanceMap.get('personal')![month - 1].closingBalance,
      vat: balanceMap.get('vat')![month - 1].closingBalance,
    };
    
    monthlySummaries.push({
      month,
      monthName: getFiscalMonthName(month, fiscalStartMonth),
      revenue,
      expenses,
      netProfit: revenue.net - expenses.net,
      netVatPosition: revenue.vat - expenses.deductibleVat,
      accountBalances,
    });
  });
  
  return monthlySummaries;
}

/**
 * Finalize balances by implementing proper month-to-month roll-forward
 * FIXED: Process months in fiscal year order for proper roll-forward
 */
function finalizeBalances(
  balanceMap: Map<Account, MonthlyAccountBalance[]>,
  fiscalStartMonth: number
): void {
  const accounts: Account[] = ['operating', 'savings', 'personal', 'vat'];
  const fiscalMonthOrder = getFiscalMonthOrder(fiscalStartMonth);
  
  accounts.forEach(account => {
    const accountBalances = balanceMap.get(account);
    if (!accountBalances) return;
    
    // Process each month in fiscal sequence to ensure proper roll-forward
    fiscalMonthOrder.forEach((month, fiscalIndex) => {
      const monthlyBalance = accountBalances[month - 1]; // 0-indexed by calendar month
      
      if (fiscalIndex === 0) {
        // First fiscal month: closing balance = opening balance + net change
        monthlyBalance.closingBalance = monthlyBalance.openingBalance + monthlyBalance.summary.netChange;
      } else {
        // Subsequent fiscal months: opening balance = previous fiscal month's closing balance
        const previousFiscalMonth = fiscalMonthOrder[fiscalIndex - 1];
        const previousMonthBalance = accountBalances[previousFiscalMonth - 1]; // 0-indexed
        monthlyBalance.openingBalance = previousMonthBalance.closingBalance;
        monthlyBalance.closingBalance = monthlyBalance.openingBalance + monthlyBalance.summary.netChange;
      }
    });
  });
}

/**
 * Calculate overall summary from monthly summaries
 * FIXED: Get final balances from the last fiscal month, not December
 */
function calculateOverallSummary(monthlySummaries: MonthlySummary[]): OverallSummary {
  const totals = monthlySummaries.reduce(
    (acc, monthly) => ({
      revenue: {
        gross: acc.revenue.gross + monthly.revenue.gross,
        net: acc.revenue.net + monthly.revenue.net,
        vat: acc.revenue.vat + monthly.revenue.vat,
      },
      expenses: {
        gross: acc.expenses.gross + monthly.expenses.gross,
        net: acc.expenses.net + monthly.expenses.net,
        vat: acc.expenses.vat + monthly.expenses.vat,
        deductibleVat: acc.expenses.deductibleVat + monthly.expenses.deductibleVat,
      },
    }),
    {
      revenue: { gross: 0, net: 0, vat: 0 },
      expenses: { gross: 0, net: 0, vat: 0, deductibleVat: 0 },
    }
  );
  
  // Get final account balances from the last fiscal month (which is the last in the array since we ordered by fiscal year)
  const finalMonth = monthlySummaries[monthlySummaries.length - 1];
  
  return {
    totalRevenue: totals.revenue,
    totalExpenses: totals.expenses,
    netProfit: totals.revenue.net - totals.expenses.net,
    totalVatCollected: totals.revenue.vat,
    totalVatDeductible: totals.expenses.deductibleVat,
    netVatOwed: totals.revenue.vat - totals.expenses.deductibleVat,
    finalAccountBalances: finalMonth ? finalMonth.accountBalances : {
      operating: 0,
      savings: 0,
      personal: 0,
      vat: 0,
    },
  };
}

/**
 * Validate simulation inputs
 */
function validateSimulationInputs(
  inputs: SimulationInputs,
  revenuePatterns: any[],
  expensePatterns: any[]
): string[] {
  const errors: string[] = [];
  
  if (!inputs.year || inputs.year < 2020 || inputs.year > 2030) {
    errors.push('Year must be between 2020 and 2030');
  }
  
  if (!inputs.fiscalStartMonth || inputs.fiscalStartMonth < 1 || inputs.fiscalStartMonth > 12) {
    errors.push('Fiscal start month must be between 1 and 12');
  }
  
  if (!inputs.startingBalances) {
    errors.push('Starting balances are required');
  }
  
  const totalPatterns = revenuePatterns.length + expensePatterns.length;
  if (totalPatterns > DEFAULT_ENGINE_CONFIG.maxPatterns) {
    errors.push(`Too many patterns (${totalPatterns}). Maximum allowed: ${DEFAULT_ENGINE_CONFIG.maxPatterns}`);
  }
  
  return errors;
}

/**
 * IMPROVEMENT 2: Validate company data for simulation processing
 */
function validateCompanyForSimulation(company: Company): string[] {
  const errors: string[] = [];
  
  if (!company) {
    errors.push('Company data is required');
    return errors; // Early return if company is null/undefined
  }
  
  if (!company.id) {
    errors.push('Company ID is required');
  }
  
  if (!company.userId) {
    errors.push('Company must be associated with a user');
  }
  
  if (!company.name || company.name.trim().length === 0) {
    errors.push('Company name is required');
  }
  
  if (!company.legalForm) {
    errors.push('Company legal form is required');
  }
  
  if (!company.activitySector) {
    errors.push('Company activity sector is required');
  }
  
  if (company.capital === null || company.capital === undefined) {
    errors.push('Company capital is required');
  }
  
  if (!company.bankPartner) {
    errors.push('Company bank partner is required');
  }
  
  // Validate fiscal year configuration
  if (company.fiscalYear && !['calendar', 'fiscal'].includes(company.fiscalYear)) {
    errors.push('Company fiscal year must be either "calendar" or "fiscal"');
  }
  
  return errors;
}

/**
 * IMPROVEMENT 3: Invariant validation functions for production robustness
 */
interface InvariantValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that end-of-year final balances equal initial + net postings per account
 */
function validateBalanceInvariants(
  balanceMap: Map<Account, MonthlyAccountBalance[]>,
  inputs: SimulationInputs,
  fiscalStartMonth: number
): InvariantValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const accounts: Account[] = ['operating', 'savings', 'personal', 'vat'];
  const fiscalMonthOrder = getFiscalMonthOrder(fiscalStartMonth);
  
  accounts.forEach(account => {
    const accountBalances = balanceMap.get(account);
    if (!accountBalances) {
      errors.push(`Missing balance data for account: ${account}`);
      return;
    }
    
    // Get initial balance (at fiscal start month)
    const fiscalStartMonthIndex = fiscalStartMonth - 1; // 0-indexed
    const initialBalance = inputs.startingBalances[account];
    const fiscalStartBalance = accountBalances[fiscalStartMonthIndex];
    
    if (Math.abs(fiscalStartBalance.openingBalance - initialBalance) > 0.01) {
      errors.push(`Account ${account}: Fiscal start opening balance (${fiscalStartBalance.openingBalance}) does not match initial balance (${initialBalance})`);
    }
    
    // Calculate total net postings across all months
    const totalNetPostings = accountBalances.reduce((sum, monthly) => sum + monthly.summary.netChange, 0);
    
    // Get final balance (last fiscal month)
    const lastFiscalMonth = fiscalMonthOrder[11]; // Last month in fiscal year
    const finalBalance = accountBalances[lastFiscalMonth - 1].closingBalance;
    
    // Invariant: Final balance = Initial balance + Total net postings
    const expectedFinalBalance = initialBalance + totalNetPostings;
    const balanceDifference = Math.abs(finalBalance - expectedFinalBalance);
    
    if (balanceDifference > 0.01) {
      errors.push(`Account ${account}: Final balance invariant failed. Expected: ${expectedFinalBalance}, Actual: ${finalBalance}, Difference: ${balanceDifference}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate monthly roll-forward: opening equals prior month closing
 */
function validateRollForwardInvariants(
  balanceMap: Map<Account, MonthlyAccountBalance[]>,
  fiscalStartMonth: number
): InvariantValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const accounts: Account[] = ['operating', 'savings', 'personal', 'vat'];
  const fiscalMonthOrder = getFiscalMonthOrder(fiscalStartMonth);
  
  accounts.forEach(account => {
    const accountBalances = balanceMap.get(account);
    if (!accountBalances) {
      errors.push(`Missing balance data for account: ${account}`);
      return;
    }
    
    // Check roll-forward for each month after the first fiscal month
    for (let fiscalIndex = 1; fiscalIndex < 12; fiscalIndex++) {
      const currentMonth = fiscalMonthOrder[fiscalIndex];
      const previousMonth = fiscalMonthOrder[fiscalIndex - 1];
      
      const currentMonthBalance = accountBalances[currentMonth - 1]; // 0-indexed
      const previousMonthBalance = accountBalances[previousMonth - 1]; // 0-indexed
      
      const rollForwardDifference = Math.abs(
        currentMonthBalance.openingBalance - previousMonthBalance.closingBalance
      );
      
      if (rollForwardDifference > 0.01) {
        errors.push(
          `Account ${account}: Roll-forward invariant failed between ${getMonthName(previousMonth)} and ${getMonthName(currentMonth)}. ` +
          `Previous closing: ${previousMonthBalance.closingBalance}, Current opening: ${currentMonthBalance.openingBalance}, ` +
          `Difference: ${rollForwardDifference}`
        );
      }
      
      // Validate that closing balance = opening balance + net change
      const expectedClosingBalance = currentMonthBalance.openingBalance + currentMonthBalance.summary.netChange;
      const closingBalanceDifference = Math.abs(currentMonthBalance.closingBalance - expectedClosingBalance);
      
      if (closingBalanceDifference > 0.01) {
        errors.push(
          `Account ${account}: Closing balance calculation error in ${getMonthName(currentMonth)}. ` +
          `Expected: ${expectedClosingBalance}, Actual: ${currentMonthBalance.closingBalance}, ` +
          `Difference: ${closingBalanceDifference}`
        );
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate VAT calculations and totals
 */
function validateVATInvariants(
  monthlyTotals: MonthlySummary[],
  overallTotals: OverallSummary
): InvariantValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Sum up monthly VAT amounts
  const totalMonthlyVATCollected = monthlyTotals.reduce((sum, month) => sum + month.revenue.vat, 0);
  const totalMonthlyVATDeductible = monthlyTotals.reduce((sum, month) => sum + month.expenses.deductibleVat, 0);
  
  // Compare with overall totals
  const vatCollectedDifference = Math.abs(totalMonthlyVATCollected - overallTotals.totalVatCollected);
  const vatDeductibleDifference = Math.abs(totalMonthlyVATDeductible - overallTotals.totalVatDeductible);
  
  if (vatCollectedDifference > 0.01) {
    errors.push(
      `VAT collected total mismatch: Monthly sum (${totalMonthlyVATCollected}) vs Overall (${overallTotals.totalVatCollected}), ` +
      `Difference: ${vatCollectedDifference}`
    );
  }
  
  if (vatDeductibleDifference > 0.01) {
    errors.push(
      `VAT deductible total mismatch: Monthly sum (${totalMonthlyVATDeductible}) vs Overall (${overallTotals.totalVatDeductible}), ` +
      `Difference: ${vatDeductibleDifference}`
    );
  }
  
  // Validate net VAT calculation
  const expectedNetVAT = overallTotals.totalVatCollected - overallTotals.totalVatDeductible;
  const netVATDifference = Math.abs(expectedNetVAT - overallTotals.netVatOwed);
  
  if (netVATDifference > 0.01) {
    errors.push(
      `Net VAT calculation error: Expected (${expectedNetVAT}) vs Actual (${overallTotals.netVatOwed}), ` +
      `Difference: ${netVATDifference}`
    );
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Main simulation engine function
 * 
 * Processes patterns and generates comprehensive financial simulation results
 * with real-time progress updates
 */
export async function runSimulation(
  inputs: SimulationInputs,
  revenuePatterns: any[],
  expensePatterns: any[],
  company: Company,
  config: Partial<EngineConfig> = {},
  simulationId?: string,
  progressCallback?: (progress: any) => Promise<void>
): Promise<SimulationResults> {
  const startTime = Date.now();
  const engineConfig = { ...DEFAULT_ENGINE_CONFIG, ...config };
  
  // IMPROVEMENT 2: Validate inputs and company
  const inputValidationErrors = validateSimulationInputs(inputs, revenuePatterns, expensePatterns);
  const companyValidationErrors = validateCompanyForSimulation(company);
  const allValidationErrors = [...inputValidationErrors, ...companyValidationErrors];
  
  if (allValidationErrors.length > 0) {
    throw new Error(`Simulation validation failed: ${allValidationErrors.join(', ')}`);
  }
  
  // Additional runtime verification that company is properly scoped
  if (!company.id || typeof company.id !== 'string') {
    throw new Error('Company validation failed: Invalid company ID format');
  }
  
  if (!company.userId || typeof company.userId !== 'string') {
    throw new Error('Company validation failed: Invalid user ID format');
  }
  
  // Helper function to emit progress updates
  const emitProgress = async (month: number, progress: number, partialBalances?: any, taxes?: any) => {
    if (progressCallback && simulationId) {
      try {
        await progressCallback({
          simulationId,
          currentMonth: month,
          progress,
          partialBalances,
          taxes,
        });
      } catch (error) {
        console.warn(`Progress update failed for simulation ${simulationId}:`, error);
      }
    }
  };

  try {
    // Step 1: Expand all patterns into occurrences
    await emitProgress(1, 10); // 10% - Pattern expansion
    
    const occurrences = expandAllPatterns(
      revenuePatterns,
      expensePatterns,
      company,
      inputs.year
    );
    
    // Step 2: Initialize account balances with starting balances
    await emitProgress(1, 20); // 20% - Account initialization
    
    const balanceMap = createInitialBalances(inputs.startingBalances, inputs.fiscalStartMonth);
    
    // Step 3: Apply occurrences month by month with progress updates
    const processingFiscalOrder = getFiscalMonthOrder(inputs.fiscalStartMonth);
    const monthlyOccurrences = new Map<number, typeof occurrences>();
    
    // Group occurrences by month
    occurrences.forEach(occurrence => {
      const month = new Date(occurrence.date).getMonth() + 1;
      if (!monthlyOccurrences.has(month)) {
        monthlyOccurrences.set(month, []);
      }
      monthlyOccurrences.get(month)!.push(occurrence);
    });
    
    // Process each month in fiscal order with progress updates
    for (let i = 0; i < processingFiscalOrder.length; i++) {
      const month = processingFiscalOrder[i];
      const monthOccurrences = monthlyOccurrences.get(month) || [];
      
      // Apply occurrences for this month
      monthOccurrences.forEach(occurrence => {
        applyOccurrenceToBalances(occurrence, balanceMap);
      });
      
      // Calculate progress (20% base + 60% processing across 12 months)
      const monthProgress = 20 + ((i + 1) / 12) * 60;
      
      // Get current account balances for this month
      const currentBalances: any = {};
      balanceMap.forEach((accountBalances, account) => {
        const monthBalance = accountBalances.find(b => b.month === month);
        if (monthBalance) {
          currentBalances[account] = monthBalance.closingBalance;
        }
      });
      
      // Calculate taxes for this month (basic calculation for progress)
      const monthRevenue = monthOccurrences
        .filter(o => o.type === 'revenue')
        .reduce((sum, o) => sum + o.postings.reduce((s, p) => s + p.amount, 0), 0);
      const monthExpenses = monthOccurrences
        .filter(o => o.type === 'expense')
        .reduce((sum, o) => sum + o.postings.reduce((s, p) => s + p.amount, 0), 0);
      
      const taxes = {
        tva: Math.abs(currentBalances.vat || 0),
        urssaf: monthRevenue * 0.45, // Approximate URSSAF calculation
        netCashFlow: monthRevenue + monthExpenses, // Expenses are negative
      };
      
      // Emit progress update for this month
      await emitProgress(month, monthProgress, currentBalances, taxes);
      
      // Small delay to make progress visible (remove in production for speed)
      if (progressCallback) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };
    
    // Step 4: ADDED - Finalize balances with proper roll-forward calculation
    await emitProgress(12, 85); // 85% - Finalizing balances
    finalizeBalances(balanceMap, inputs.fiscalStartMonth);
    
    // Step 5: Calculate monthly summaries
    await emitProgress(12, 90); // 90% - Calculating summaries
    const monthlyTotals = calculateMonthlySummaries(balanceMap, occurrences, inputs.fiscalStartMonth);
    
    // Step 6: Calculate overall summary
    await emitProgress(12, 95); // 95% - Final calculations
    const overallTotals = calculateOverallSummary(monthlyTotals);
    
    // IMPROVEMENT 3: Validate invariants for production robustness
    const balanceInvariantResult = validateBalanceInvariants(balanceMap, inputs, inputs.fiscalStartMonth);
    const rollForwardInvariantResult = validateRollForwardInvariants(balanceMap, inputs.fiscalStartMonth);
    const vatInvariantResult = validateVATInvariants(monthlyTotals, overallTotals);
    
    // Collect all invariant validation errors
    const invariantErrors = [
      ...balanceInvariantResult.errors,
      ...rollForwardInvariantResult.errors,
      ...vatInvariantResult.errors
    ];
    
    // Collect all warnings
    const invariantWarnings = [
      ...balanceInvariantResult.warnings,
      ...rollForwardInvariantResult.warnings,
      ...vatInvariantResult.warnings
    ];
    
    // Log warnings
    if (invariantWarnings.length > 0) {
      console.warn('Simulation invariant warnings:', invariantWarnings);
    }
    
    // Fail if any critical invariants are violated
    if (invariantErrors.length > 0) {
      const errorMessage = `Simulation invariant validation failed:\n${invariantErrors.join('\n')}`;
      console.error(errorMessage);
      throw new Error(`Critical simulation invariants violated: ${invariantErrors.join('; ')}`);
    }
    
    console.log('✅ All simulation invariants validated successfully');
    
    // Step 7: Flatten monthly balances for storage
    const monthlyBalances: MonthlyAccountBalance[] = [];
    balanceMap.forEach(accountBalances => {
      monthlyBalances.push(...accountBalances);
    });
    
    const processingTime = Date.now() - startTime;
    
    // Performance check
    if (processingTime > engineConfig.performanceTarget) {
      console.warn(`Simulation took ${processingTime}ms, exceeding target of ${engineConfig.performanceTarget}ms`);
    }
    
    // Sort monthly balances in fiscal year order
    const sortingFiscalOrder = getFiscalMonthOrder(inputs.fiscalStartMonth);
    const sortedMonthlyBalances = monthlyBalances.sort((a, b) => {
      const aFiscalIndex = sortingFiscalOrder.indexOf(a.month);
      const bFiscalIndex = sortingFiscalOrder.indexOf(b.month);
      if (aFiscalIndex !== bFiscalIndex) {
        return aFiscalIndex - bFiscalIndex;
      }
      return a.account.localeCompare(b.account);
    });
    
    // Final progress update - simulation completed
    await emitProgress(12, 100); // 100% - Simulation completed
    
    return {
      year: inputs.year,
      fiscalStartMonth: inputs.fiscalStartMonth,
      monthlyBalances: sortedMonthlyBalances,
      monthlyTotals,
      overallTotals,
      metadata: {
        totalOccurrences: occurrences.length,
        processingTimeMs: processingTime,
        engineVersion: engineConfig.version,
      },
    };
    
  } catch (error) {
    console.error('Simulation engine error:', error);
    throw new Error(`Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Utility function to format simulation results for API response
 */
export function formatSimulationResults(results: SimulationResults): any {
  return {
    year: results.year,
    fiscalStartMonth: results.fiscalStartMonth,
    summary: {
      totalRevenue: results.overallTotals.totalRevenue.net,
      totalExpenses: results.overallTotals.totalExpenses.net,
      netProfit: results.overallTotals.netProfit,
      totalVatOwed: results.overallTotals.netVatOwed,
    },
    monthlyData: results.monthlyTotals.map(month => ({
      month: month.month,
      monthName: month.monthName,
      revenue: month.revenue.net,
      expenses: month.expenses.net,
      netProfit: month.netProfit,
      vatPosition: month.netVatPosition,
      balances: month.accountBalances,
    })),
    accountBalances: results.monthlyBalances.reduce((acc, balance) => {
      const key = `${balance.account}_${balance.month}`;
      acc[key] = {
        account: balance.account,
        month: balance.month,
        openingBalance: balance.openingBalance,
        closingBalance: balance.closingBalance,
        transactions: balance.transactions.length,
        netChange: balance.summary.netChange,
      };
      return acc;
    }, {} as any),
    metadata: results.metadata,
  };
}

/**
 * Export engine configuration for external access
 */
export { DEFAULT_ENGINE_CONFIG, type EngineConfig };