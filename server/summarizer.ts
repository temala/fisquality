/**
 * Results Summarizer
 * 
 * Computes monthly and overall totals, VAT summaries, and generates 
 * comprehensive financial reports for display and analysis.
 */

import {
  type SimulationResults,
  type MonthlySummary,
  type OverallSummary,
  type MonthlyAccountBalance,
} from './engine';
import { type Account } from '@shared/schema';

/**
 * Enhanced financial report structure
 */
export interface FinancialReport {
  period: {
    year: number;
    fiscalStartMonth: number;
    reportType: 'annual' | 'quarterly' | 'monthly';
  };
  overview: ReportOverview;
  profitAndLoss: ProfitAndLossStatement;
  vatSummary: VATSummary;
  cashFlow: CashFlowStatement;
  accountSummary: AccountSummary;
  trends: TrendAnalysis;
  kpis: KeyPerformanceIndicators;
}

/**
 * Report overview section
 */
export interface ReportOverview {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number; // As percentage
  vatPosition: number; // Positive = owe VAT, negative = VAT refund
  cashPosition: number; // Total liquid assets
  reportGeneratedAt: string;
}

/**
 * Profit and Loss statement
 */
export interface ProfitAndLossStatement {
  revenue: {
    gross: number;
    vat: number;
    net: number;
    byMonth: MonthlyValue[];
  };
  expenses: {
    gross: number;
    vat: number;
    deductibleVat: number;
    net: number;
    byMonth: MonthlyValue[];
    byCategory: CategoryBreakdown[];
  };
  grossProfit: number;
  netProfit: number;
  monthlyNetProfit: MonthlyValue[];
}

/**
 * VAT summary and calculations
 */
export interface VATSummary {
  collected: {
    total: number;
    byMonth: MonthlyValue[];
  };
  deductible: {
    total: number;
    byMonth: MonthlyValue[];
  };
  netPosition: {
    total: number;
    byMonth: MonthlyValue[];
  };
  quarterlyPositions: QuarterlyVAT[];
  annualReturn: {
    totalCollected: number;
    totalDeductible: number;
    netOwed: number;
    estimatedPayments: number;
  };
}

/**
 * Cash flow statement
 */
export interface CashFlowStatement {
  openingBalance: number;
  operatingCashFlow: {
    revenue: number;
    expenses: number;
    net: number;
  };
  vatCashFlow: {
    collected: number;
    paid: number; // VAT refunds received
    net: number;
  };
  closingBalance: number;
  monthlyFlow: MonthlyValue[];
}

/**
 * Account summary
 */
export interface AccountSummary {
  accounts: {
    [K in Account]: AccountDetail;
  };
  totalAssets: number;
  liquidityRatio: number;
}

export interface AccountDetail {
  account: Account;
  openingBalance: number;
  closingBalance: number;
  totalTransactions: number;
  netChange: number;
  monthlyBalances: MonthlyValue[];
}

/**
 * Trend analysis
 */
export interface TrendAnalysis {
  revenueGrowth: {
    monthOverMonth: number[]; // Percentage growth
    quarterOverQuarter: number[];
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  expenseGrowth: {
    monthOverMonth: number[];
    quarterOverQuarter: number[];
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  profitTrend: {
    monthOverMonth: number[];
    quarterOverQuarter: number[];
    trend: 'improving' | 'declining' | 'stable';
  };
  seasonality: {
    peakMonths: number[];
    lowMonths: number[];
    volatility: number; // Standard deviation as percentage
  };
}

/**
 * Key Performance Indicators
 */
export interface KeyPerformanceIndicators {
  profitMargin: number;
  grossMargin: number;
  averageMonthlyRevenue: number;
  averageMonthlyExpenses: number;
  revenueVolatility: number;
  expenseRatio: number; // Expenses as % of revenue
  vatEfficiency: number; // Deductible VAT as % of collected VAT
  cashBurnRate: number; // Monthly cash consumption
  breakEvenPoint: number; // Monthly revenue needed to break even
}

/**
 * Monthly value with metadata
 */
export interface MonthlyValue {
  month: number;
  monthName: string;
  value: number;
  change?: number; // Change from previous month
  changePercentage?: number;
}

/**
 * Category breakdown for expenses
 */
export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number; // Of total expenses
  count: number; // Number of transactions
}

/**
 * Quarterly VAT summary
 */
export interface QuarterlyVAT {
  quarter: number;
  months: number[];
  collected: number;
  deductible: number;
  netPosition: number;
  dueDate: string; // When VAT is typically due
}

/**
 * Chart data for visualization
 */
export interface ChartData {
  monthlyRevenue: ChartSeries;
  monthlyExpenses: ChartSeries;
  monthlyProfit: ChartSeries;
  accountBalances: ChartSeries[];
  vatPosition: ChartSeries;
  cashFlow: ChartSeries;
}

export interface ChartSeries {
  name: string;
  data: Array<{ x: string; y: number }>;
  color?: string;
  type?: 'line' | 'bar' | 'area';
}

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
 * Calculate percentage change
 */
function calculateChange(current: number, previous: number): { change: number; changePercentage: number } {
  const change = current - previous;
  const changePercentage = previous !== 0 ? (change / previous) * 100 : 0;
  return { change, changePercentage };
}

/**
 * Calculate trend direction
 */
function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';
  
  const increases = values.slice(1).reduce((count, val, i) => 
    count + (val > values[i] ? 1 : 0), 0);
  const total = values.length - 1;
  
  if (increases / total > 0.6) return 'increasing';
  if (increases / total < 0.4) return 'decreasing';
  return 'stable';
}

/**
 * Calculate standard deviation
 */
function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Create monthly values with change calculations
 */
function createMonthlyValues(monthlyTotals: MonthlySummary[], getValue: (m: MonthlySummary) => number): MonthlyValue[] {
  return monthlyTotals.map((month, index) => {
    const value = getValue(month);
    const previousValue = index > 0 ? getValue(monthlyTotals[index - 1]) : value;
    const { change, changePercentage } = calculateChange(value, previousValue);
    
    return {
      month: month.month,
      monthName: month.monthName,
      value,
      change: index > 0 ? change : undefined,
      changePercentage: index > 0 ? changePercentage : undefined,
    };
  });
}

/**
 * Generate expense category breakdown
 */
function generateCategoryBreakdown(results: SimulationResults): CategoryBreakdown[] {
  const categories = new Map<string, { amount: number; count: number }>();
  
  // Aggregate by category from monthly balances
  results.monthlyBalances
    .filter(balance => balance.account === 'operating')
    .forEach(balance => {
      balance.transactions
        .filter(tx => tx.type === 'expense' && tx.category)
        .forEach(tx => {
          const category = tx.category!;
          const existing = categories.get(category) || { amount: 0, count: 0 };
          categories.set(category, {
            amount: existing.amount + Math.abs(tx.amount),
            count: existing.count + 1,
          });
        });
    });
  
  const totalAmount = Array.from(categories.values()).reduce((sum, cat) => sum + cat.amount, 0);
  
  return Array.from(categories.entries()).map(([category, data]) => ({
    category,
    amount: data.amount,
    percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    count: data.count,
  })).sort((a, b) => b.amount - a.amount);
}

/**
 * Generate quarterly VAT summaries
 */
function generateQuarterlyVAT(monthlyTotals: MonthlySummary[]): QuarterlyVAT[] {
  const quarters: QuarterlyVAT[] = [];
  
  for (let q = 1; q <= 4; q++) {
    const quarterMonths = [q * 3 - 2, q * 3 - 1, q * 3];
    const quarterData = monthlyTotals.filter(m => quarterMonths.includes(m.month));
    
    const collected = quarterData.reduce((sum, m) => sum + m.revenue.vat, 0);
    const deductible = quarterData.reduce((sum, m) => sum + m.expenses.deductibleVat, 0);
    
    // French VAT typically due by the 19th of the month following the quarter
    const dueMonth = q * 3 + 1;
    const dueDateMonth = dueMonth > 12 ? (dueMonth - 12) : dueMonth;
    const dueYear = dueMonth > 12 ? monthlyTotals[0].month + 1 : monthlyTotals[0].month; // Approximate
    
    quarters.push({
      quarter: q,
      months: quarterMonths,
      collected,
      deductible,
      netPosition: collected - deductible,
      dueDate: `${dueYear}-${String(dueDateMonth).padStart(2, '0')}-19`,
    });
  }
  
  return quarters;
}

/**
 * Generate account summaries
 */
function generateAccountSummary(results: SimulationResults): AccountSummary {
  const accounts: { [K in Account]: AccountDetail } = {} as any;
  const accountTypes: Account[] = ['operating', 'savings', 'personal', 'vat'];
  
  accountTypes.forEach(accountType => {
    const accountBalances = results.monthlyBalances.filter(b => b.account === accountType);
    const totalTransactions = accountBalances.reduce((sum, b) => sum + b.transactions.length, 0);
    
    const monthlyBalances = accountBalances.map(balance => ({
      month: balance.month,
      monthName: getMonthName(balance.month),
      value: balance.closingBalance,
    }));
    
    accounts[accountType] = {
      account: accountType,
      openingBalance: accountBalances[0]?.openingBalance || 0,
      closingBalance: accountBalances[accountBalances.length - 1]?.closingBalance || 0,
      totalTransactions,
      netChange: accountBalances.reduce((sum, b) => sum + b.summary.netChange, 0),
      monthlyBalances,
    };
  });
  
  const totalAssets = accounts.operating.closingBalance + accounts.savings.closingBalance;
  const liquidityRatio = totalAssets / Math.max(Math.abs(accounts.vat.closingBalance), 1);
  
  return {
    accounts,
    totalAssets,
    liquidityRatio,
  };
}

/**
 * Generate trend analysis
 */
function generateTrendAnalysis(monthlyTotals: MonthlySummary[]): TrendAnalysis {
  const revenueValues = monthlyTotals.map(m => m.revenue.net);
  const expenseValues = monthlyTotals.map(m => m.expenses.net);
  const profitValues = monthlyTotals.map(m => m.netProfit);
  
  // Calculate month-over-month changes
  const revenueChanges = revenueValues.slice(1).map((val, i) => 
    revenueValues[i] !== 0 ? ((val - revenueValues[i]) / revenueValues[i]) * 100 : 0
  );
  
  const expenseChanges = expenseValues.slice(1).map((val, i) => 
    expenseValues[i] !== 0 ? ((val - expenseValues[i]) / expenseValues[i]) * 100 : 0
  );
  
  const profitChanges = profitValues.slice(1).map((val, i) => 
    profitValues[i] !== 0 ? ((val - profitValues[i]) / profitValues[i]) * 100 : 0
  );
  
  // Calculate quarterly changes
  const quarterlyRevenue = [];
  const quarterlyExpenses = [];
  const quarterlyProfit = [];
  
  for (let q = 0; q < 4; q++) {
    const startIdx = q * 3;
    const quarterRevenue = revenueValues.slice(startIdx, startIdx + 3).reduce((sum, val) => sum + val, 0);
    const quarterExpenses = expenseValues.slice(startIdx, startIdx + 3).reduce((sum, val) => sum + val, 0);
    quarterlyRevenue.push(quarterRevenue);
    quarterlyExpenses.push(quarterExpenses);
    quarterlyProfit.push(quarterRevenue - quarterExpenses);
  }
  
  const revenueQoQ = quarterlyRevenue.slice(1).map((val, i) => 
    quarterlyRevenue[i] !== 0 ? ((val - quarterlyRevenue[i]) / quarterlyRevenue[i]) * 100 : 0
  );
  
  const expenseQoQ = quarterlyExpenses.slice(1).map((val, i) => 
    quarterlyExpenses[i] !== 0 ? ((val - quarterlyExpenses[i]) / quarterlyExpenses[i]) * 100 : 0
  );
  
  const profitQoQ = quarterlyProfit.slice(1).map((val, i) => 
    quarterlyProfit[i] !== 0 ? ((val - quarterlyProfit[i]) / quarterlyProfit[i]) * 100 : 0
  );
  
  // Identify seasonal patterns
  const revenueStdDev = calculateStandardDeviation(revenueValues);
  const revenueMean = revenueValues.reduce((sum, val) => sum + val, 0) / revenueValues.length;
  const volatility = revenueMean > 0 ? (revenueStdDev / revenueMean) * 100 : 0;
  
  // Find peak and low months
  const maxRevenue = Math.max(...revenueValues);
  const minRevenue = Math.min(...revenueValues);
  const peakMonths = revenueValues
    .map((val, idx) => ({ val, month: idx + 1 }))
    .filter(({ val }) => val > revenueMean + revenueStdDev)
    .map(({ month }) => month);
  const lowMonths = revenueValues
    .map((val, idx) => ({ val, month: idx + 1 }))
    .filter(({ val }) => val < revenueMean - revenueStdDev)
    .map(({ month }) => month);
  
  return {
    revenueGrowth: {
      monthOverMonth: revenueChanges,
      quarterOverQuarter: revenueQoQ,
      trend: calculateTrend(revenueValues),
    },
    expenseGrowth: {
      monthOverMonth: expenseChanges,
      quarterOverQuarter: expenseQoQ,
      trend: calculateTrend(expenseValues),
    },
    profitTrend: {
      monthOverMonth: profitChanges,
      quarterOverQuarter: profitQoQ,
      trend: calculateTrend(profitValues),
    },
    seasonality: {
      peakMonths,
      lowMonths,
      volatility,
    },
  };
}

/**
 * Calculate Key Performance Indicators
 */
function calculateKPIs(results: SimulationResults): KeyPerformanceIndicators {
  const { overallTotals, monthlyTotals } = results;
  
  const profitMargin = overallTotals.totalRevenue.net > 0 
    ? (overallTotals.netProfit / overallTotals.totalRevenue.net) * 100 
    : 0;
  
  const grossMargin = overallTotals.totalRevenue.gross > 0
    ? ((overallTotals.totalRevenue.gross - overallTotals.totalExpenses.gross) / overallTotals.totalRevenue.gross) * 100
    : 0;
  
  const activeMonths = monthlyTotals.filter(m => m.revenue.net > 0 || m.expenses.net > 0).length;
  const avgMonthlyRevenue = activeMonths > 0 ? overallTotals.totalRevenue.net / activeMonths : 0;
  const avgMonthlyExpenses = activeMonths > 0 ? overallTotals.totalExpenses.net / activeMonths : 0;
  
  const revenueValues = monthlyTotals.map(m => m.revenue.net);
  const revenueVolatility = avgMonthlyRevenue > 0 
    ? (calculateStandardDeviation(revenueValues) / avgMonthlyRevenue) * 100 
    : 0;
  
  const expenseRatio = overallTotals.totalRevenue.net > 0
    ? (overallTotals.totalExpenses.net / overallTotals.totalRevenue.net) * 100
    : 0;
  
  const vatEfficiency = overallTotals.totalVatCollected > 0
    ? (overallTotals.totalVatDeductible / overallTotals.totalVatCollected) * 100
    : 0;
  
  // Calculate cash burn rate (negative cash flow months)
  const cashFlowValues = monthlyTotals.map(m => m.netProfit);
  const negativeCashFlows = cashFlowValues.filter(cf => cf < 0);
  const cashBurnRate = negativeCashFlows.length > 0
    ? Math.abs(negativeCashFlows.reduce((sum, cf) => sum + cf, 0)) / negativeCashFlows.length
    : 0;
  
  const breakEvenPoint = avgMonthlyExpenses;
  
  return {
    profitMargin,
    grossMargin,
    averageMonthlyRevenue: avgMonthlyRevenue,
    averageMonthlyExpenses: avgMonthlyExpenses,
    revenueVolatility,
    expenseRatio,
    vatEfficiency,
    cashBurnRate,
    breakEvenPoint,
  };
}

/**
 * Generate comprehensive financial report
 */
export function generateFinancialReport(results: SimulationResults): FinancialReport {
  const { overallTotals, monthlyTotals } = results;
  
  // Generate all report sections
  const categoryBreakdown = generateCategoryBreakdown(results);
  const quarterlyVAT = generateQuarterlyVAT(monthlyTotals);
  const accountSummary = generateAccountSummary(results);
  const trendAnalysis = generateTrendAnalysis(monthlyTotals);
  const kpis = calculateKPIs(results);
  
  // Create monthly value arrays
  const revenueByMonth = createMonthlyValues(monthlyTotals, m => m.revenue.net);
  const expensesByMonth = createMonthlyValues(monthlyTotals, m => m.expenses.net);
  const profitByMonth = createMonthlyValues(monthlyTotals, m => m.netProfit);
  const vatByMonth = createMonthlyValues(monthlyTotals, m => m.netVatPosition);
  
  return {
    period: {
      year: results.year,
      fiscalStartMonth: results.fiscalStartMonth,
      reportType: 'annual',
    },
    overview: {
      totalRevenue: overallTotals.totalRevenue.net,
      totalExpenses: overallTotals.totalExpenses.net,
      netProfit: overallTotals.netProfit,
      profitMargin: kpis.profitMargin,
      vatPosition: overallTotals.netVatOwed,
      cashPosition: accountSummary.totalAssets,
      reportGeneratedAt: new Date().toISOString(),
    },
    profitAndLoss: {
      revenue: {
        gross: overallTotals.totalRevenue.gross,
        vat: overallTotals.totalRevenue.vat,
        net: overallTotals.totalRevenue.net,
        byMonth: revenueByMonth,
      },
      expenses: {
        gross: overallTotals.totalExpenses.gross,
        vat: overallTotals.totalExpenses.vat,
        deductibleVat: overallTotals.totalExpenses.deductibleVat,
        net: overallTotals.totalExpenses.net,
        byMonth: expensesByMonth,
        byCategory: categoryBreakdown,
      },
      grossProfit: overallTotals.totalRevenue.gross - overallTotals.totalExpenses.gross,
      netProfit: overallTotals.netProfit,
      monthlyNetProfit: profitByMonth,
    },
    vatSummary: {
      collected: {
        total: overallTotals.totalVatCollected,
        byMonth: createMonthlyValues(monthlyTotals, m => m.revenue.vat),
      },
      deductible: {
        total: overallTotals.totalVatDeductible,
        byMonth: createMonthlyValues(monthlyTotals, m => m.expenses.deductibleVat),
      },
      netPosition: {
        total: overallTotals.netVatOwed,
        byMonth: vatByMonth,
      },
      quarterlyPositions: quarterlyVAT,
      annualReturn: {
        totalCollected: overallTotals.totalVatCollected,
        totalDeductible: overallTotals.totalVatDeductible,
        netOwed: overallTotals.netVatOwed,
        estimatedPayments: Math.max(overallTotals.netVatOwed, 0),
      },
    },
    cashFlow: {
      openingBalance: accountSummary.accounts.operating.openingBalance + accountSummary.accounts.savings.openingBalance,
      operatingCashFlow: {
        revenue: overallTotals.totalRevenue.net,
        expenses: -overallTotals.totalExpenses.net,
        net: overallTotals.netProfit,
      },
      vatCashFlow: {
        collected: overallTotals.totalVatCollected,
        paid: Math.min(overallTotals.netVatOwed, 0), // VAT refunds are negative
        net: -overallTotals.netVatOwed, // Cash impact is opposite of VAT owed
      },
      closingBalance: accountSummary.accounts.operating.closingBalance + accountSummary.accounts.savings.closingBalance,
      monthlyFlow: createMonthlyValues(monthlyTotals, m => 
        (m.accountBalances.operating || 0) + (m.accountBalances.savings || 0)
      ),
    },
    accountSummary,
    trends: trendAnalysis,
    kpis,
  };
}

/**
 * Generate chart data for visualization
 */
export function generateChartData(results: SimulationResults): ChartData {
  const { monthlyTotals } = results;
  
  return {
    monthlyRevenue: {
      name: 'Monthly Revenue',
      data: monthlyTotals.map(m => ({ x: m.monthName, y: m.revenue.net })),
      color: '#10B981',
      type: 'bar',
    },
    monthlyExpenses: {
      name: 'Monthly Expenses',
      data: monthlyTotals.map(m => ({ x: m.monthName, y: m.expenses.net })),
      color: '#EF4444',
      type: 'bar',
    },
    monthlyProfit: {
      name: 'Monthly Profit',
      data: monthlyTotals.map(m => ({ x: m.monthName, y: m.netProfit })),
      color: '#3B82F6',
      type: 'line',
    },
    accountBalances: [
      {
        name: 'Operating Account',
        data: monthlyTotals.map(m => ({ x: m.monthName, y: m.accountBalances.operating })),
        color: '#8B5CF6',
        type: 'line',
      },
      {
        name: 'Savings Account', 
        data: monthlyTotals.map(m => ({ x: m.monthName, y: m.accountBalances.savings })),
        color: '#F59E0B',
        type: 'line',
      },
    ],
    vatPosition: {
      name: 'VAT Position',
      data: monthlyTotals.map(m => ({ x: m.monthName, y: m.netVatPosition })),
      color: '#EC4899',
      type: 'area',
    },
    cashFlow: {
      name: 'Cash Flow',
      data: monthlyTotals.map(m => ({ 
        x: m.monthName, 
        y: (m.accountBalances.operating || 0) + (m.accountBalances.savings || 0)
      })),
      color: '#06B6D4',
      type: 'area',
    },
  };
}

/**
 * Export report to various formats
 */
export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf';
  sections?: string[]; // Which report sections to include
  includeChartData?: boolean;
}

export function exportReport(report: FinancialReport, options: ExportOptions = { format: 'json' }): string | Buffer {
  switch (options.format) {
    case 'json':
      return JSON.stringify(report, null, 2);
    
    case 'csv':
      return exportToCSV(report);
    
    case 'pdf':
      throw new Error('PDF export not implemented yet');
    
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

/**
 * Convert report to CSV format
 */
function exportToCSV(report: FinancialReport): string {
  const lines: string[] = [];
  
  // Header
  lines.push('Financial Report CSV Export');
  lines.push(`Year: ${report.period.year}`);
  lines.push(`Generated: ${report.overview.reportGeneratedAt}`);
  lines.push('');
  
  // Monthly P&L
  lines.push('Month,Revenue,Expenses,Net Profit,VAT Position');
  report.profitAndLoss.monthlyNetProfit.forEach((month, i) => {
    const revenue = report.profitAndLoss.revenue.byMonth[i]?.value || 0;
    const expenses = report.profitAndLoss.expenses.byMonth[i]?.value || 0;
    const vatPosition = report.vatSummary.netPosition.byMonth[i]?.value || 0;
    lines.push(`${month.monthName},${revenue},${expenses},${month.value},${vatPosition}`);
  });
  
  return lines.join('\n');
}

/**
 * Validate simulation results for reporting
 */
export function validateResults(results: SimulationResults): string[] {
  const errors: string[] = [];
  
  if (!results.year || results.year < 2020 || results.year > 2030) {
    errors.push('Invalid simulation year');
  }
  
  if (!results.monthlyTotals || results.monthlyTotals.length !== 12) {
    errors.push('Missing or incomplete monthly totals');
  }
  
  if (!results.overallTotals) {
    errors.push('Missing overall totals');
  }
  
  // Check for data consistency
  const calculatedTotal = results.monthlyTotals?.reduce((sum, month) => sum + month.netProfit, 0) || 0;
  const reportedTotal = results.overallTotals?.netProfit || 0;
  
  if (Math.abs(calculatedTotal - reportedTotal) > 0.01) {
    errors.push('Inconsistent profit totals between monthly and overall summaries');
  }
  
  return errors;
}

export {
  type FinancialReport,
  type ReportOverview,
  type ProfitAndLossStatement,
  type VATSummary,
  type ChartData,
};