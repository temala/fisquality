import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCompanySchema, insertRevenuePatternSchema, insertRevenuePatternBaseSchema, insertExpensePatternSchema, insertExpensePatternBaseSchema, insertSimulationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Company Management Routes
  
  // Get all companies for the current user
  app.get('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const companies = await storage.getCompaniesByUser(userId);
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // Get a specific company
  app.get('/api/companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const company = await storage.getCompany(id);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Check if the user owns this company
      if (company.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  // Create a new company
  app.post('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const companyData = insertCompanySchema.parse({
        ...req.body,
        userId,
      });

      const company = await storage.createCompany(companyData);
      res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  // Update a company
  app.put('/api/companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if company exists and user owns it
      const existingCompany = await storage.getCompany(id);
      if (!existingCompany) {
        return res.status(404).json({ message: "Company not found" });
      }
      if (existingCompany.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate request body
      const updateData = insertCompanySchema.partial().parse(req.body);
      
      const company = await storage.updateCompany(id, updateData);
      res.json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  // Delete a company
  app.delete('/api/companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if company exists and user owns it
      const existingCompany = await storage.getCompany(id);
      if (!existingCompany) {
        return res.status(404).json({ message: "Company not found" });
      }
      if (existingCompany.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteCompany(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // Revenue Pattern Routes
  
  // Get revenue patterns for a company
  app.get('/api/companies/:companyId/revenue-patterns', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user owns the company
      const company = await storage.getCompany(companyId);
      if (!company || company.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const patterns = await storage.getRevenuePatterns(companyId);
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching revenue patterns:", error);
      res.status(500).json({ message: "Failed to fetch revenue patterns" });
    }
  });

  // Create a revenue pattern
  app.post('/api/companies/:companyId/revenue-patterns', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user owns the company
      const company = await storage.getCompany(companyId);
      if (!company || company.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const patternData = insertRevenuePatternSchema.parse({
        ...req.body,
        companyId,
      });

      const pattern = await storage.createRevenuePattern(patternData);
      res.status(201).json(pattern);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating revenue pattern:", error);
      res.status(500).json({ message: "Failed to create revenue pattern" });
    }
  });

  // Expense Pattern Routes
  
  // Get expense patterns for a company
  app.get('/api/companies/:companyId/expense-patterns', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user owns the company
      const company = await storage.getCompany(companyId);
      if (!company || company.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const patterns = await storage.getExpensePatterns(companyId);
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching expense patterns:", error);
      res.status(500).json({ message: "Failed to fetch expense patterns" });
    }
  });

  // Create an expense pattern
  app.post('/api/companies/:companyId/expense-patterns', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user owns the company
      const company = await storage.getCompany(companyId);
      if (!company || company.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const patternData = insertExpensePatternSchema.parse({
        ...req.body,
        companyId,
      });

      const pattern = await storage.createExpensePattern(patternData);
      res.status(201).json(pattern);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating expense pattern:", error);
      res.status(500).json({ message: "Failed to create expense pattern" });
    }
  });

  // Simulation Routes
  
  // Get simulations for a company
  app.get('/api/companies/:companyId/simulations', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user owns the company
      const company = await storage.getCompany(companyId);
      if (!company || company.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const simulations = await storage.getSimulations(companyId);
      res.json(simulations);
    } catch (error) {
      console.error("Error fetching simulations:", error);
      res.status(500).json({ message: "Failed to fetch simulations" });
    }
  });

  // Create a new simulation
  app.post('/api/companies/:companyId/simulations', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user owns the company
      const company = await storage.getCompany(companyId);
      if (!company || company.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const simulationData = insertSimulationSchema.parse({
        ...req.body,
        companyId,
        year: req.body.year || new Date().getFullYear(),
      });

      const simulation = await storage.createSimulation(simulationData);
      res.status(201).json(simulation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating simulation:", error);
      res.status(500).json({ message: "Failed to create simulation" });
    }
  });

  // Get simulation results
  app.get('/api/simulations/:id/results', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Get simulation and verify access
      const simulation = await storage.getSimulation(id);
      if (!simulation) {
        return res.status(404).json({ message: "Simulation not found" });
      }
      
      // Verify user owns the company
      const company = await storage.getCompany(simulation.companyId);
      if (!company || company.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get account balances and tax calculations
      const [accountBalances, taxCalculations] = await Promise.all([
        storage.getAccountBalances(id),
        storage.getTaxCalculations(id),
      ]);

      res.json({
        simulation,
        accountBalances,
        taxCalculations,
      });
    } catch (error) {
      console.error("Error fetching simulation results:", error);
      res.status(500).json({ message: "Failed to fetch simulation results" });
    }
  });

  // Update a revenue pattern
  app.put('/api/companies/:companyId/revenue-patterns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId, id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user owns the company
      const company = await storage.getCompany(companyId);
      if (!company || company.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData = insertRevenuePatternBaseSchema.partial().parse(req.body);
      const pattern = await storage.updateRevenuePattern(id, updateData);
      res.json(pattern);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating revenue pattern:", error);
      res.status(500).json({ message: "Failed to update revenue pattern" });
    }
  });

  // Delete a revenue pattern
  app.delete('/api/companies/:companyId/revenue-patterns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId, id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user owns the company
      const company = await storage.getCompany(companyId);
      if (!company || company.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteRevenuePattern(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting revenue pattern:", error);
      res.status(500).json({ message: "Failed to delete revenue pattern" });
    }
  });

  // Update an expense pattern
  app.put('/api/companies/:companyId/expense-patterns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId, id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user owns the company
      const company = await storage.getCompany(companyId);
      if (!company || company.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData = insertExpensePatternBaseSchema.partial().parse(req.body);
      const pattern = await storage.updateExpensePattern(id, updateData);
      res.json(pattern);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating expense pattern:", error);
      res.status(500).json({ message: "Failed to update expense pattern" });
    }
  });

  // Delete an expense pattern
  app.delete('/api/companies/:companyId/expense-patterns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId, id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user owns the company
      const company = await storage.getCompany(companyId);
      if (!company || company.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteExpensePattern(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense pattern:", error);
      res.status(500).json({ message: "Failed to delete expense pattern" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}