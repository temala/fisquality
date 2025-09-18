import {
  users,
  companies,
  revenuePatterns,
  expensePatterns,
  simulations,
  accountBalances,
  taxCalculations,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type RevenuePattern,
  type InsertRevenuePattern,
  type ExpensePattern,
  type InsertExpensePattern,
  type Simulation,
  type InsertSimulation,
  type AccountBalance,
  type TaxCalculation,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Company operations
  createCompany(company: InsertCompany): Promise<Company>;
  getCompany(id: string): Promise<Company | undefined>;
  getCompaniesByUser(userId: string): Promise<Company[]>;
  updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company>;
  deleteCompany(id: string): Promise<void>;
  
  // Revenue pattern operations
  createRevenuePattern(pattern: InsertRevenuePattern): Promise<RevenuePattern>;
  getRevenuePatterns(companyId: string): Promise<RevenuePattern[]>;
  updateRevenuePattern(id: string, pattern: Partial<InsertRevenuePattern>): Promise<RevenuePattern>;
  deleteRevenuePattern(id: string): Promise<void>;
  
  // Expense pattern operations
  createExpensePattern(pattern: InsertExpensePattern): Promise<ExpensePattern>;
  getExpensePatterns(companyId: string): Promise<ExpensePattern[]>;
  updateExpensePattern(id: string, pattern: Partial<InsertExpensePattern>): Promise<ExpensePattern>;
  deleteExpensePattern(id: string): Promise<void>;
  
  // Simulation operations
  createSimulation(simulation: InsertSimulation): Promise<Simulation>;
  getSimulation(id: string): Promise<Simulation | undefined>;
  getSimulations(companyId: string): Promise<Simulation[]>;
  updateSimulation(id: string, simulation: Partial<InsertSimulation>): Promise<Simulation>;
  deleteSimulation(id: string): Promise<void>;
  
  // Account balance operations
  getAccountBalances(simulationId: string): Promise<AccountBalance[]>;
  saveAccountBalance(balance: Omit<AccountBalance, 'id'>): Promise<AccountBalance>;
  
  // Tax calculation operations
  getTaxCalculations(simulationId: string): Promise<TaxCalculation[]>;
  saveTaxCalculation(calculation: Omit<TaxCalculation, 'id'>): Promise<TaxCalculation>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Company operations
  
  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db
      .insert(companies)
      .values(company)
      .returning();
    return newCompany;
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id));
    return company;
  }

  async getCompaniesByUser(userId: string): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .where(eq(companies.userId, userId))
      .orderBy(companies.createdAt);
  }

  async updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company> {
    const [updatedCompany] = await db
      .update(companies)
      .set({ ...company, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return updatedCompany;
  }

  async deleteCompany(id: string): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  // Revenue pattern operations
  
  async createRevenuePattern(pattern: InsertRevenuePattern): Promise<RevenuePattern> {
    const [newPattern] = await db
      .insert(revenuePatterns)
      .values(pattern)
      .returning();
    return newPattern;
  }

  async getRevenuePatterns(companyId: string): Promise<RevenuePattern[]> {
    return await db
      .select()
      .from(revenuePatterns)
      .where(eq(revenuePatterns.companyId, companyId))
      .orderBy(revenuePatterns.createdAt);
  }

  async updateRevenuePattern(id: string, pattern: Partial<InsertRevenuePattern>): Promise<RevenuePattern> {
    const [updatedPattern] = await db
      .update(revenuePatterns)
      .set(pattern)
      .where(eq(revenuePatterns.id, id))
      .returning();
    return updatedPattern;
  }

  async deleteRevenuePattern(id: string): Promise<void> {
    await db.delete(revenuePatterns).where(eq(revenuePatterns.id, id));
  }

  // Expense pattern operations
  
  async createExpensePattern(pattern: InsertExpensePattern): Promise<ExpensePattern> {
    const [newPattern] = await db
      .insert(expensePatterns)
      .values(pattern)
      .returning();
    return newPattern;
  }

  async getExpensePatterns(companyId: string): Promise<ExpensePattern[]> {
    return await db
      .select()
      .from(expensePatterns)
      .where(eq(expensePatterns.companyId, companyId))
      .orderBy(expensePatterns.createdAt);
  }

  async updateExpensePattern(id: string, pattern: Partial<InsertExpensePattern>): Promise<ExpensePattern> {
    const [updatedPattern] = await db
      .update(expensePatterns)
      .set(pattern)
      .where(eq(expensePatterns.id, id))
      .returning();
    return updatedPattern;
  }

  async deleteExpensePattern(id: string): Promise<void> {
    await db.delete(expensePatterns).where(eq(expensePatterns.id, id));
  }

  // Simulation operations
  
  async createSimulation(simulation: InsertSimulation): Promise<Simulation> {
    const [newSimulation] = await db
      .insert(simulations)
      .values(simulation)
      .returning();
    return newSimulation;
  }

  async getSimulation(id: string): Promise<Simulation | undefined> {
    const [simulation] = await db
      .select()
      .from(simulations)
      .where(eq(simulations.id, id));
    return simulation;
  }

  async getSimulations(companyId: string): Promise<Simulation[]> {
    return await db
      .select()
      .from(simulations)
      .where(eq(simulations.companyId, companyId))
      .orderBy(simulations.createdAt);
  }

  async updateSimulation(id: string, simulation: Partial<InsertSimulation>): Promise<Simulation> {
    const [updatedSimulation] = await db
      .update(simulations)
      .set(simulation)
      .where(eq(simulations.id, id))
      .returning();
    return updatedSimulation;
  }

  async deleteSimulation(id: string): Promise<void> {
    await db.delete(simulations).where(eq(simulations.id, id));
  }

  // Account balance operations
  
  async getAccountBalances(simulationId: string): Promise<AccountBalance[]> {
    return await db
      .select()
      .from(accountBalances)
      .where(eq(accountBalances.simulationId, simulationId))
      .orderBy(accountBalances.month);
  }

  async saveAccountBalance(balance: Omit<AccountBalance, 'id'>): Promise<AccountBalance> {
    const [newBalance] = await db
      .insert(accountBalances)
      .values(balance)
      .returning();
    return newBalance;
  }

  // Tax calculation operations
  
  async getTaxCalculations(simulationId: string): Promise<TaxCalculation[]> {
    return await db
      .select()
      .from(taxCalculations)
      .where(eq(taxCalculations.simulationId, simulationId))
      .orderBy(taxCalculations.month);
  }

  async saveTaxCalculation(calculation: Omit<TaxCalculation, 'id'>): Promise<TaxCalculation> {
    const [newCalculation] = await db
      .insert(taxCalculations)
      .values(calculation)
      .returning();
    return newCalculation;
  }
}

export const storage = new DatabaseStorage();