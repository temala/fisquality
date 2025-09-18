/**
 * IMPROVEMENT 3: Integration Tests & Test Scenarios
 * 
 * Comprehensive test scenarios to validate simulation engine robustness:
 * - Pure revenue pattern test
 * - Pure expense pattern test  
 * - Mixed VAT with deductible and non-deductible expenses
 * - Roll-forward invariants and balance validation
 */

import { runSimulation } from './engine';
import type { SimulationInputs, Company, RevenuePattern, ExpensePattern } from '@shared/schema';

/**
 * Test utility to create a mock company
 */
function createTestCompany(fiscalStartMonth: number = 1): Company {
  return {
    id: 'test-company-001',
    userId: 'test-user-001',
    name: 'Test Company SAS',
    legalForm: 'sas',
    activitySector: 'technology',
    capital: 10000,
    bankPartner: 'Test Bank',
    siretNumber: '12345678901234',
    vatNumber: 'FR12345678901',
    fiscalYear: fiscalStartMonth === 1 ? 'calendar' : 'fiscal',
    businessType: 'traditional',
    holidayRegion: 'FR',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Test Scenario 1: Pure Revenue Pattern Test
 * Tests revenue-only simulation with VAT calculations
 */
export async function testPureRevenuePattern(): Promise<boolean> {
  console.log('🧪 Running Test Scenario 1: Pure Revenue Pattern');
  
  try {
    const company = createTestCompany(1); // Calendar year
    
    const inputs: SimulationInputs = {
      year: 2024,
      fiscalStartMonth: 1,
      startingBalances: {
        operating: 1000,
        savings: 5000,
        personal: 0,
        vat: 0,
      },
      businessType: 'traditional',
      holidayRegion: 'FR',
    };
    
    const revenuePatterns: Partial<RevenuePattern>[] = [
      {
        id: 'rev-001',
        companyId: company.id,
        name: 'Monthly Service Revenue',
        amount: '12000.00', // €12,000 gross with 20% VAT
        frequency: 'monthly',
        startMonth: 1,
        vatRate: '20.00',
        isRecurring: 1,
        excludeWeekends: 0,
        excludeHolidays: 0,
      },
      {
        id: 'rev-002',
        companyId: company.id,
        name: 'Quarterly Consulting Revenue',
        amount: '15000.00', // €15,000 gross with 20% VAT
        frequency: 'quarterly',
        startMonth: 3,
        vatRate: '20.00',
        isRecurring: 1,
        excludeWeekends: 0,
        excludeHolidays: 0,
      },
    ];
    
    const expensePatterns: Partial<ExpensePattern>[] = []; // No expenses for pure revenue test
    
    const results = await runSimulation(
      inputs,
      revenuePatterns as RevenuePattern[],
      expensePatterns as ExpensePattern[],
      company
    );
    
    // Validate results
    const expectedMonthlyRevenue = 10000; // €12,000 / 1.20 (excluding VAT)
    const expectedQuarterlyRevenue = 12500; // €15,000 / 1.20 (excluding VAT)
    const expectedAnnualRevenue = (expectedMonthlyRevenue * 12) + (expectedQuarterlyRevenue * 4);
    
    if (Math.abs(results.overallTotals.totalRevenue.net - expectedAnnualRevenue) > 1) {
      throw new Error(`Revenue calculation mismatch: expected ~${expectedAnnualRevenue}, got ${results.overallTotals.totalRevenue.net}`);
    }
    
    // Validate that final operating balance includes all revenue
    const finalOperatingBalance = results.overallTotals.finalAccountBalances.operating;
    const expectedFinalBalance = inputs.startingBalances.operating + expectedAnnualRevenue;
    
    if (Math.abs(finalOperatingBalance - expectedFinalBalance) > 1) {
      throw new Error(`Final balance mismatch: expected ~${expectedFinalBalance}, got ${finalOperatingBalance}`);
    }
    
    // Validate VAT accumulation
    if (results.overallTotals.totalVatCollected <= 0) {
      throw new Error('VAT should be collected for revenue transactions');
    }
    
    console.log('✅ Pure Revenue Pattern Test: PASSED');
    return true;
    
  } catch (error) {
    console.error('❌ Pure Revenue Pattern Test: FAILED', error);
    return false;
  }
}

/**
 * Test Scenario 2: Pure Expense Pattern Test
 * Tests expense-only simulation with VAT deductions
 */
export async function testPureExpensePattern(): Promise<boolean> {
  console.log('🧪 Running Test Scenario 2: Pure Expense Pattern');
  
  try {
    const company = createTestCompany(1); // Calendar year
    
    const inputs: SimulationInputs = {
      year: 2024,
      fiscalStartMonth: 1,
      startingBalances: {
        operating: 50000, // Start with enough to cover expenses
        savings: 5000,
        personal: 0,
        vat: 0,
      },
      businessType: 'traditional',
      holidayRegion: 'FR',
    };
    
    const revenuePatterns: Partial<RevenuePattern>[] = []; // No revenue for pure expense test
    
    const expensePatterns: Partial<ExpensePattern>[] = [
      {
        id: 'exp-001',
        companyId: company.id,
        name: 'Office Rent',
        amount: '2400.00', // €2,400 gross with 20% VAT (deductible)
        category: 'rent',
        frequency: 'monthly',
        startMonth: 1,
        vatDeductible: 1,
        isRecurring: 1,
        excludeWeekends: 0,
        excludeHolidays: 0,
      },
      {
        id: 'exp-002',
        companyId: company.id,
        name: 'Software Subscriptions',
        amount: '600.00', // €600 gross with 20% VAT (deductible)
        category: 'subscription',
        frequency: 'monthly',
        startMonth: 1,
        vatDeductible: 1,
        isRecurring: 1,
        excludeWeekends: 0,
        excludeHolidays: 0,
      },
      {
        id: 'exp-003',
        companyId: company.id,
        name: 'Business Insurance',
        amount: '1200.00', // €1,200 gross (no VAT)
        category: 'insurance',
        frequency: 'quarterly',
        startMonth: 1,
        vatDeductible: 0,
        isRecurring: 1,
        excludeWeekends: 0,
        excludeHolidays: 0,
      },
    ];
    
    const results = await runSimulation(
      inputs,
      revenuePatterns as RevenuePattern[],
      expensePatterns as ExpensePattern[],
      company
    );
    
    // Calculate expected expenses
    const monthlyRentNet = 2000; // €2,400 / 1.20
    const monthlySubscriptionNet = 500; // €600 / 1.20
    const quarterlyInsuranceNet = 1200; // No VAT
    
    const expectedAnnualExpenses = (monthlyRentNet * 12) + (monthlySubscriptionNet * 12) + (quarterlyInsuranceNet * 4);
    
    if (Math.abs(results.overallTotals.totalExpenses.net - expectedAnnualExpenses) > 1) {
      throw new Error(`Expense calculation mismatch: expected ~${expectedAnnualExpenses}, got ${results.overallTotals.totalExpenses.net}`);
    }
    
    // Validate negative profit (expenses only)
    if (results.overallTotals.netProfit >= 0) {
      throw new Error('Net profit should be negative for expense-only simulation');
    }
    
    // Validate VAT deductible amounts
    if (results.overallTotals.totalVatDeductible <= 0) {
      throw new Error('VAT deductible amount should be positive for deductible expenses');
    }
    
    console.log('✅ Pure Expense Pattern Test: PASSED');
    return true;
    
  } catch (error) {
    console.error('❌ Pure Expense Pattern Test: FAILED', error);
    return false;
  }
}

/**
 * Test Scenario 3: Mixed VAT with Deductible and Non-Deductible Expenses
 * Tests complex VAT scenarios with different deductibility rules
 */
export async function testMixedVATPattern(): Promise<boolean> {
  console.log('🧪 Running Test Scenario 3: Mixed VAT Pattern');
  
  try {
    const company = createTestCompany(4); // April fiscal year start
    
    const inputs: SimulationInputs = {
      year: 2024,
      fiscalStartMonth: 4, // April start fiscal year
      startingBalances: {
        operating: 20000,
        savings: 10000,
        personal: 0,
        vat: 0,
      },
      businessType: 'traditional',
      holidayRegion: 'FR',
    };
    
    const revenuePatterns: Partial<RevenuePattern>[] = [
      {
        id: 'rev-001',
        companyId: company.id,
        name: 'Consulting Revenue',
        amount: '6000.00', // €6,000 gross with 20% VAT
        frequency: 'monthly',
        startMonth: 4, // Starts in April (fiscal start)
        vatRate: '20.00',
        isRecurring: 1,
        excludeWeekends: 0,
        excludeHolidays: 0,
      },
    ];
    
    const expensePatterns: Partial<ExpensePattern>[] = [
      {
        id: 'exp-001',
        companyId: company.id,
        name: 'Office Equipment',
        amount: '1200.00', // €1,200 gross with 20% VAT (deductible)
        category: 'equipment',
        frequency: 'monthly',
        startMonth: 4,
        vatDeductible: 1, // VAT deductible
        isRecurring: 1,
        excludeWeekends: 0,
        excludeHolidays: 0,
      },
      {
        id: 'exp-002',
        companyId: company.id,
        name: 'Business Meals',
        amount: '600.00', // €600 gross with 10% VAT (non-deductible for meals)
        category: 'general',
        frequency: 'monthly',
        startMonth: 4,
        vatDeductible: 0, // VAT NOT deductible
        isRecurring: 1,
        excludeWeekends: 0,
        excludeHolidays: 0,
      },
      {
        id: 'exp-003',
        companyId: company.id,
        name: 'Professional Insurance',
        amount: '800.00', // €800 gross (no VAT - insurance exempt)
        category: 'insurance',
        frequency: 'quarterly',
        startMonth: 4,
        vatDeductible: 0, // No VAT on insurance
        isRecurring: 1,
        excludeWeekends: 0,
        excludeHolidays: 0,
      },
    ];
    
    const results = await runSimulation(
      inputs,
      revenuePatterns as RevenuePattern[],
      expensePatterns as ExpensePattern[],
      company
    );
    
    // Validate fiscal year ordering (should start with April)
    if (results.monthlyTotals[0].month !== 4) {
      throw new Error(`Fiscal year should start with April (month 4), but started with month ${results.monthlyTotals[0].month}`);
    }
    
    // Validate fiscal year month naming
    if (!results.monthlyTotals[0].monthName.includes('(FY Month 1)')) {
      throw new Error(`April should be labeled as fiscal month 1: ${results.monthlyTotals[0].monthName}`);
    }
    
    // Calculate expected values
    const monthlyRevenueNet = 5000; // €6,000 / 1.20
    const monthlyEquipmentNet = 1000; // €1,200 / 1.20
    const monthlyMealsGross = 600; // Full amount (VAT not deductible)
    const quarterlyInsuranceGross = 800; // No VAT
    
    const expectedAnnualRevenue = monthlyRevenueNet * 12;
    const expectedAnnualExpenses = (monthlyEquipmentNet * 12) + (monthlyMealsGross * 12) + (quarterlyInsuranceGross * 4);
    
    // Validate revenue and expense totals
    if (Math.abs(results.overallTotals.totalRevenue.net - expectedAnnualRevenue) > 1) {
      throw new Error(`Revenue mismatch: expected ${expectedAnnualRevenue}, got ${results.overallTotals.totalRevenue.net}`);
    }
    
    if (Math.abs(results.overallTotals.totalExpenses.net - expectedAnnualExpenses) > 1) {
      throw new Error(`Expense mismatch: expected ${expectedAnnualExpenses}, got ${results.overallTotals.totalExpenses.net}`);
    }
    
    // Validate VAT calculations
    const expectedVATCollected = monthlyRevenueNet * 0.25 * 12; // 20% VAT on revenue
    const expectedVATDeductible = monthlyEquipmentNet * 0.25 * 12; // Only equipment VAT is deductible
    
    if (Math.abs(results.overallTotals.totalVatCollected - expectedVATCollected) > 1) {
      throw new Error(`VAT collected mismatch: expected ~${expectedVATCollected}, got ${results.overallTotals.totalVatCollected}`);
    }
    
    if (Math.abs(results.overallTotals.totalVatDeductible - expectedVATDeductible) > 1) {
      throw new Error(`VAT deductible mismatch: expected ~${expectedVATDeductible}, got ${results.overallTotals.totalVatDeductible}`);
    }
    
    // Validate net VAT position
    const expectedNetVAT = expectedVATCollected - expectedVATDeductible;
    if (Math.abs(results.overallTotals.netVatOwed - expectedNetVAT) > 1) {
      throw new Error(`Net VAT mismatch: expected ~${expectedNetVAT}, got ${results.overallTotals.netVatOwed}`);
    }
    
    console.log('✅ Mixed VAT Pattern Test: PASSED');
    return true;
    
  } catch (error) {
    console.error('❌ Mixed VAT Pattern Test: FAILED', error);
    return false;
  }
}

/**
 * Test Scenario 4: Roll-Forward and Invariant Validation
 * Tests balance roll-forward between months and validates all invariants
 */
export async function testRollForwardInvariants(): Promise<boolean> {
  console.log('🧪 Running Test Scenario 4: Roll-Forward and Invariant Validation');
  
  try {
    const company = createTestCompany(7); // July fiscal year start (French businesses often use July)
    
    const inputs: SimulationInputs = {
      year: 2024,
      fiscalStartMonth: 7, // July start fiscal year
      startingBalances: {
        operating: 15000,
        savings: 25000,
        personal: 5000,
        vat: -2000, // Negative VAT balance (owed to government)
      },
      businessType: 'traditional',
      holidayRegion: 'FR',
    };
    
    const revenuePatterns: Partial<RevenuePattern>[] = [
      {
        id: 'rev-001',
        companyId: company.id,
        name: 'Irregular Revenue',
        amount: '3600.00',
        frequency: 'monthly',
        startMonth: 7,
        vatRate: '20.00',
        isRecurring: 1,
        excludeWeekends: 0,
        excludeHolidays: 0,
      },
    ];
    
    const expensePatterns: Partial<ExpensePattern>[] = [
      {
        id: 'exp-001',
        companyId: company.id,
        name: 'Variable Costs',
        amount: '1800.00',
        category: 'general',
        frequency: 'monthly',
        startMonth: 7,
        vatDeductible: 1,
        isRecurring: 1,
        excludeWeekends: 0,
        excludeHolidays: 0,
      },
    ];
    
    const results = await runSimulation(
      inputs,
      revenuePatterns as RevenuePattern[],
      expensePatterns as ExpensePattern[],
      company
    );
    
    // The engine should automatically validate all invariants and throw if they fail
    // If we reach this point, invariants are valid
    
    // Additional validation of fiscal year ordering
    if (results.monthlyTotals[0].month !== 7) {
      throw new Error(`Fiscal year should start with July (month 7), but started with month ${results.monthlyTotals[0].month}`);
    }
    
    if (results.monthlyTotals[11].month !== 6) {
      throw new Error(`Fiscal year should end with June (month 6), but ended with month ${results.monthlyTotals[11].month}`);
    }
    
    // Validate that final balances reflect the full year of operations
    const initialTotal = Object.values(inputs.startingBalances).reduce((sum, val) => sum + val, 0);
    const finalTotal = Object.values(results.overallTotals.finalAccountBalances).reduce((sum, val) => sum + val, 0);
    const netOperationalChange = results.overallTotals.netProfit;
    
    // Final total should equal initial total plus net profit (approximately)
    const expectedFinalTotal = initialTotal + netOperationalChange;
    if (Math.abs(finalTotal - expectedFinalTotal) > 5) { // Allow small rounding differences
      throw new Error(`Total balance conservation failed: initial ${initialTotal} + profit ${netOperationalChange} ≠ final ${finalTotal}`);
    }
    
    console.log('✅ Roll-Forward and Invariant Validation Test: PASSED');
    return true;
    
  } catch (error) {
    console.error('❌ Roll-Forward and Invariant Validation Test: FAILED', error);
    return false;
  }
}

/**
 * Run all integration test scenarios
 */
export async function runAllIntegrationTests(): Promise<boolean> {
  console.log('🚀 Starting Comprehensive Integration Test Suite');
  console.log('=' .repeat(60));
  
  const testResults = await Promise.all([
    testPureRevenuePattern(),
    testPureExpensePattern(),
    testMixedVATPattern(),
    testRollForwardInvariants(),
  ]);
  
  const passedTests = testResults.filter(result => result === true).length;
  const totalTests = testResults.length;
  
  console.log('=' .repeat(60));
  console.log(`📊 Integration Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL INTEGRATION TESTS PASSED - Simulation engine is production ready!');
    return true;
  } else {
    console.log('⚠️  Some integration tests failed - Please review the failures above');
    return false;
  }
}