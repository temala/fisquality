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

  // Create and run a new simulation
  app.post('/api/companies/:companyId/simulations', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const userId = req.user.claims.sub;
      
      // IMPROVEMENT 2: Explicit company loading and ownership verification
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ 
          message: "Company not found",
          error: "COMPANY_NOT_FOUND",
          companyId 
        });
      }
      
      if (company.userId !== userId) {
        return res.status(403).json({ 
          message: "Access denied - You do not own this company",
          error: "UNAUTHORIZED_COMPANY_ACCESS",
          companyId 
        });
      }
      
      // Additional company validation
      if (!company.name || !company.legalForm) {
        return res.status(400).json({
          message: "Company is not properly configured",
          error: "COMPANY_INCOMPLETE",
          companyId
        });
      }

      // Parse and validate simulation data
      const simulationData = insertSimulationSchema.parse({
        ...req.body,
        companyId,
        year: req.body.year || new Date().getFullYear(),
      });

      // Create initial simulation record with 'running' status
      const initialSimulation = await storage.createSimulation({
        ...simulationData,
        status: 'running',
      });

      try {
        // Import simulation engine components
        const { runSimulation, formatSimulationResults } = await import('./engine');
        const { generateFinancialReport } = await import('./summarizer');

        // Get patterns for the company
        const [revenuePatterns, expensePatterns] = await Promise.all([
          storage.getRevenuePatterns(companyId),
          storage.getExpensePatterns(companyId),
        ]);

        // Validate simulation inputs
        if (!simulationData.inputs) {
          throw new Error('Simulation inputs are required');
        }

        // IMPROVEMENT 2: Verify company is valid before passing to simulation engine
        if (!company || !company.id || company.id !== companyId) {
          throw new Error(`Company validation failed: company mismatch or invalid company data`);
        }
        
        // Create progress callback function to update simulation progress
        const progressCallback = async (progressData: any) => {
          await storage.updateSimulationProgress(initialSimulation.id, {
            currentMonth: progressData.currentMonth,
            progress: progressData.progress,
            status: progressData.progress >= 100 ? 'completed' : 'running',
            partialResults: {
              partialBalances: progressData.partialBalances,
              taxes: progressData.taxes,
            },
          });
        };

        // Run the simulation engine with verified company and progress tracking
        const startTime = Date.now();
        const simulationResults = await runSimulation(
          simulationData.inputs,
          revenuePatterns,
          expensePatterns,
          company,
          {},
          initialSimulation.id,
          progressCallback
        );

        const processingTime = Date.now() - startTime;
        console.log(`Simulation completed in ${processingTime}ms for company ${companyId}`);

        // Generate financial report
        const financialReport = generateFinancialReport(simulationResults);

        // Format results for API response
        const formattedResults = formatSimulationResults(simulationResults);

        // Save account balances to database
        const accountBalancePromises = simulationResults.monthlyBalances.map(balance => 
          storage.saveAccountBalance({
            simulationId: initialSimulation.id,
            accountType: balance.account,
            accountName: `${balance.account}_account`,
            month: balance.month,
            balance: String(balance.closingBalance),
            transactions: balance.transactions,
          })
        );

        await Promise.all(accountBalancePromises);

        // Update simulation with completed results
        const completedSimulation = await storage.updateSimulation(initialSimulation.id, {
          status: 'completed',
          results: formattedResults,
          totalRevenue: String(simulationResults.overallTotals.totalRevenue.net),
          totalExpenses: String(simulationResults.overallTotals.totalExpenses.net),
          netProfit: String(simulationResults.overallTotals.netProfit),
          totalTaxes: String(Math.max(simulationResults.overallTotals.netVatOwed, 0)),
          completedAt: new Date(),
        });

        // Return comprehensive response
        res.status(201).json({
          simulation: completedSimulation,
          results: formattedResults,
          report: {
            overview: financialReport.overview,
            kpis: financialReport.kpis,
            monthlyTotals: simulationResults.monthlyTotals,
          },
          metadata: {
            processingTimeMs: processingTime,
            totalOccurrences: simulationResults.metadata.totalOccurrences,
            engineVersion: simulationResults.metadata.engineVersion,
            patternsProcessed: {
              revenue: revenuePatterns.length,
              expense: expensePatterns.length,
            },
          },
        });

      } catch (simulationError) {
        console.error("Simulation engine error:", simulationError);
        
        // IMPROVEMENT 2: Enhanced error handling - Update simulation status to failed with detailed error info
        try {
          await storage.updateSimulation(initialSimulation.id, {
            status: 'failed',
            results: { 
              error: simulationError instanceof Error ? simulationError.message : 'Unknown simulation error',
              timestamp: new Date().toISOString(),
              companyId,
              engineVersion: 'v1'
            },
          });
        } catch (updateError) {
          console.error("Failed to update simulation status to failed:", updateError);
        }

        throw simulationError;
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error running simulation:", error);
      res.status(500).json({ 
        message: "Failed to run simulation", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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

  // SSE streaming endpoint for real-time simulation progress
  app.get('/api/simulations/:id/stream', isAuthenticated, async (req: any, res) => {
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

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      });

      // Send initial progress state
      const initialProgress = await storage.getSimulationProgress(id);
      if (initialProgress) {
        const event = {
          type: 'progress',
          data: initialProgress
        };
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      // Set up progress polling
      let pollInterval: NodeJS.Timeout;
      let lastProgress = initialProgress?.progress || 0;
      let lastStatus = initialProgress?.status || 'draft';
      
      const sendProgressUpdate = async () => {
        try {
          const progress = await storage.getSimulationProgress(id);
          if (progress) {
            // Only send updates if there's a meaningful change
            if (progress.progress !== lastProgress || progress.status !== lastStatus) {
              const event = {
                type: progress.status === 'completed' ? 'completed' : 
                      progress.status === 'failed' ? 'error' : 'progress',
                data: progress
              };
              res.write(`data: ${JSON.stringify(event)}\n\n`);
              
              lastProgress = progress.progress;
              lastStatus = progress.status;
              
              // Stop polling if simulation is completed or failed
              if (progress.status === 'completed' || progress.status === 'failed') {
                clearInterval(pollInterval);
              }
            }
          }
        } catch (error) {
          console.error('Error sending progress update:', error);
          const errorEvent = {
            type: 'error',
            data: { message: 'Failed to fetch progress update' }
          };
          res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
        }
      };

      // Poll for progress updates every 500ms
      pollInterval = setInterval(sendProgressUpdate, 500);

      // Clean up when client disconnects
      req.on('close', () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
        res.end();
      });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        res.write(`data: {"type":"heartbeat"}\n\n`);
      }, 30000);

      req.on('close', () => {
        clearInterval(heartbeatInterval);
      });

    } catch (error) {
      console.error("Error setting up SSE stream:", error);
      res.status(500).json({ message: "Failed to setup progress stream" });
    }
  });

  // Polling fallback endpoint for simulation progress
  app.get('/api/simulations/:id/progress', isAuthenticated, async (req: any, res) => {
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

      // Get current progress
      const progress = await storage.getSimulationProgress(id);
      if (!progress) {
        return res.status(404).json({ message: "Progress not found" });
      }

      res.json(progress);
    } catch (error) {
      console.error("Error fetching simulation progress:", error);
      res.status(500).json({ message: "Failed to fetch simulation progress" });
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