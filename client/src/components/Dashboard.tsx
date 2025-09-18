import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Building2,
  Euro,
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  RotateCcw,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import GraphVisualization from "@/components/GraphVisualization";

// Import types from shared schema
import type { Company, SimulationProgress, Account } from "@shared/schema";

interface AccountBalance {
  name: string;
  balance: number;
  type: "asset" | "expense" | "revenue" | "tax";
}

interface RealTimeSimulationState {
  simulationId?: string;
  isRunning: boolean;
  progress: number;
  currentMonth: number;
  status: 'draft' | 'running' | 'completed' | 'failed';
  partialBalances?: { [K in Account]: number };
  taxes?: {
    tva: number;
    urssaf: number;
    netCashFlow: number;
  };
  error?: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // All hooks must be declared at the top before any conditional returns
  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  // Real-time simulation state management
  const [simulation, setSimulation] = useState<RealTimeSimulationState>({
    isRunning: false,
    progress: 0,
    currentMonth: 1,
    status: 'draft',
  });

  // Get current account balances from real data or simulation progress
  const [accounts, setAccounts] = useState<AccountBalance[]>([
    { name: "Compte Courant", balance: 125400, type: "asset" },
    { name: "Chiffre d'Affaires", balance: 240000, type: "revenue" },
    { name: "Charges Sociales", balance: -45600, type: "tax" },
    { name: "TVA à Payer", balance: -12800, type: "tax" },
    { name: "Frais Généraux", balance: -28400, type: "expense" },
  ]);

  // Use first company as default or show company selection
  const company = companies?.[0];

  // Mutation for starting simulations
  const startSimulationMutation = useMutation({
    mutationFn: async (simulationData: any) => {
      const response = await apiRequest('POST', `/api/companies/${company?.id}/simulations`, {
        name: `Simulation ${new Date().getFullYear()}`,
        year: new Date().getFullYear(),
        inputs: {
          year: new Date().getFullYear(),
          fiscalStartMonth: 1,
          startingBalances: {
            operating: 125400,
            savings: 50000,
            personal: 25000,
            vat: -12800,
          },
          businessType: company?.businessType || 'traditional',
          holidayRegion: company?.holidayRegion || 'FR',
        },
        ...simulationData,
      });
      return response.json();
    },
    onSuccess: (data) => {
      const newSimulation = data.simulation;
      setSimulation({
        simulationId: newSimulation.id,
        isRunning: true,
        progress: 0,
        currentMonth: 1,
        status: 'running',
      });
      
      // Start real-time updates
      setupSSEConnection(newSimulation.id);
      
      toast({
        title: "Simulation démarrée",
        description: "La simulation financière est en cours...",
      });
      
      // Invalidate simulations cache
      queryClient.invalidateQueries({ queryKey: ["/api/companies", company?.id, "simulations"] });
    },
    onError: (error: any) => {
      console.error('Simulation start error:', error);
      setSimulation(prev => ({
        ...prev,
        isRunning: false,
        status: 'failed',
        error: error.message || 'Erreur lors du démarrage de la simulation',
      }));
      
      toast({
        title: "Erreur de simulation",
        description: error.message || 'Impossible de démarrer la simulation',
        variant: "destructive",
      });
    },
  });

  // Setup SSE connection for real-time updates
  const setupSSEConnection = (simulationId: string) => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/simulations/${simulationId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'heartbeat') {
          return; // Ignore heartbeat messages
        }
        
        if (data.type === 'progress' && data.data) {
          const progress: SimulationProgress = data.data;
          
          setSimulation(prev => ({
            ...prev,
            progress: progress.progress,
            currentMonth: progress.currentMonth,
            status: progress.status,
            partialBalances: progress.partialBalances,
            taxes: progress.taxes,
          }));

          // Update account balances with real-time data
          if (progress.partialBalances) {
            updateAccountsFromBalances(progress.partialBalances);
          }
        } else if (data.type === 'completed' && data.data) {
          const progress: SimulationProgress = data.data;
          
          setSimulation(prev => ({
            ...prev,
            isRunning: false,
            progress: 100,
            status: 'completed',
            partialBalances: progress.partialBalances,
            taxes: progress.taxes,
          }));
          
          if (progress.partialBalances) {
            updateAccountsFromBalances(progress.partialBalances);
          }
          
          toast({
            title: "Simulation terminée",
            description: "La simulation financière s'est terminée avec succès!",
          });
          
          // Close the connection
          eventSource.close();
        } else if (data.type === 'error') {
          setSimulation(prev => ({
            ...prev,
            isRunning: false,
            status: 'failed',
            error: data.data.message,
          }));
          
          toast({
            title: "Erreur de simulation",
            description: data.data.message,
            variant: "destructive",
          });
          
          // Close the connection
          eventSource.close();
        }
      } catch (error) {
        console.error('SSE message parse error:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      
      // Setup polling fallback
      setupPollingFallback(simulationId);
      
      // Close the SSE connection
      eventSource.close();
    };
  };

  // Update accounts from simulation balances
  const updateAccountsFromBalances = (balances: { [K in Account]: number }) => {
    setAccounts(prev => prev.map(account => {
      switch (account.name) {
        case "Compte Courant":
          return { ...account, balance: balances.operating || account.balance };
        case "TVA à Payer":
          return { ...account, balance: balances.vat || account.balance };
        default:
          return account;
      }
    }));
  };

  // Polling fallback for when SSE fails
  const setupPollingFallback = (simulationId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/simulations/${simulationId}/progress`);
        if (response.ok) {
          const progress: SimulationProgress = await response.json();
          
          setSimulation(prev => ({
            ...prev,
            progress: progress.progress,
            currentMonth: progress.currentMonth,
            status: progress.status,
            partialBalances: progress.partialBalances,
            taxes: progress.taxes,
            isRunning: progress.status === 'running',
          }));

          if (progress.partialBalances) {
            updateAccountsFromBalances(progress.partialBalances);
          }

          // Stop polling if simulation is completed or failed
          if (progress.status === 'completed' || progress.status === 'failed') {
            clearInterval(pollInterval);
            
            if (progress.status === 'completed') {
              toast({
                title: "Simulation terminée",
                description: "La simulation financière s'est terminée avec succès!",
              });
            }
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Store interval for cleanup
    return pollInterval;
  };

  // Cleanup SSE connections on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Real simulation control handlers
  const handleSimulationStart = () => {
    if (simulation.isRunning) return;
    
    startSimulationMutation.mutate({});
  };

  const handleSimulationReset = () => {
    // Close any existing connections
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    // Reset simulation state
    setSimulation({
      isRunning: false,
      progress: 0,
      currentMonth: 1,
      status: 'draft',
    });
    
    // Reset accounts to default
    setAccounts([
      { name: "Compte Courant", balance: 125400, type: "asset" },
      { name: "Chiffre d'Affaires", balance: 240000, type: "revenue" },
      { name: "Charges Sociales", balance: -45600, type: "tax" },
      { name: "TVA à Payer", balance: -12800, type: "tax" },
      { name: "Frais Généraux", balance: -28400, type: "expense" },
    ]);
    
    toast({
      title: "Simulation réinitialisée",
      description: "Vous pouvez démarrer une nouvelle simulation.",
    });
  };

  // Conditional renders after all hooks
  if (companiesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-muted-foreground">
            Chargement de vos entreprises...
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Aucune entreprise configurée</h2>
          <p className="text-muted-foreground">
            Commencez par créer votre première entreprise
          </p>
          <Button
            onClick={() => (window.location.href = "/setup")}
            data-testid="button-create-company"
          >
            Créer une entreprise
          </Button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getBalanceColor = (balance: number, type: string) => {
    if (type === "revenue") return "text-chart-2";
    if (type === "tax" || type === "expense") return "text-chart-4";
    return balance >= 0 ? "text-chart-2" : "text-chart-4";
  };

  const getBalanceIcon = (balance: number) => {
    return balance >= 0 ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">SimuFiscal</h1>
              <p className="text-sm text-muted-foreground">{company.name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informations entreprise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nom</p>
                <p className="font-semibold" data-testid="text-company-name">{company.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Forme juridique</p>
                <Badge variant="secondary" data-testid="badge-legal-form">{company.legalForm}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activité</p>
                <p className="font-medium" data-testid="text-activity">{company.activitySector}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capital</p>
                <p className="font-mono font-bold" data-testid="text-capital">
                  {company.capital.toLocaleString('fr-FR')} €
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Partenaire bancaire</p>
                <p className="font-medium" data-testid="text-bank">{company.bankPartner}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Simulation Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Simulation annuelle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleSimulationStart}
                variant={simulation.isRunning ? "secondary" : "default"}
                disabled={simulation.isRunning || startSimulationMutation.isPending}
                data-testid="button-toggle-simulation"
              >
                {simulation.isRunning || startSimulationMutation.isPending ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    En cours...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Démarrer Simulation
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSimulationReset}
                disabled={simulation.isRunning}
                data-testid="button-reset-simulation"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
            </div>
            
            {/* Professional Progress Visualization */}
            <div className="space-y-4">
              {/* Status and Progress */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      simulation.status === 'completed' ? 'default' :
                      simulation.status === 'running' ? 'secondary' :
                      simulation.status === 'failed' ? 'destructive' : 'outline'
                    }
                    data-testid="badge-simulation-status"
                  >
                    {simulation.status === 'running' ? '🔄 En cours' :
                     simulation.status === 'completed' ? '✅ Terminé' :
                     simulation.status === 'failed' ? '❌ Échec' : '⏸️ Prêt'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Mois {simulation.currentMonth}/12
                  </span>
                </div>
                <span className="font-mono font-semibold" data-testid="text-simulation-progress">
                  {Math.round(simulation.progress)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress 
                  value={simulation.progress} 
                  className="h-3" 
                  data-testid="progress-simulation"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Janvier</span>
                  <span>Juin</span>
                  <span>Décembre</span>
                </div>
              </div>

              {/* Error Display */}
              {simulation.error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">Erreur de simulation</p>
                    <p className="text-muted-foreground">{simulation.error}</p>
                  </div>
                </div>
              )}

              {/* French Business KPIs */}
              {simulation.taxes && (simulation.isRunning || simulation.status === 'completed') && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">TVA à Payer</p>
                          <p className="text-xl font-bold text-blue-600" data-testid="text-tva-amount">
                            {simulation.taxes.tva.toLocaleString('fr-FR', { 
                              style: 'currency', 
                              currency: 'EUR' 
                            })}
                          </p>
                        </div>
                        <Euro className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">URSSAF</p>
                          <p className="text-xl font-bold text-orange-600" data-testid="text-urssaf-amount">
                            {simulation.taxes.urssaf.toLocaleString('fr-FR', { 
                              style: 'currency', 
                              currency: 'EUR' 
                            })}
                          </p>
                        </div>
                        <Building2 className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Flux de Trésorerie Net</p>
                          <p className={`text-xl font-bold ${simulation.taxes.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-cashflow-amount">
                            {simulation.taxes.netCashFlow.toLocaleString('fr-FR', { 
                              style: 'currency', 
                              currency: 'EUR' 
                            })}
                          </p>
                        </div>
                        {simulation.taxes.netCashFlow >= 0 ? 
                          <TrendingUp className="h-8 w-8 text-green-500" /> :
                          <TrendingDown className="h-8 w-8 text-red-500" />
                        }
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Graph Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Visualisation des comptes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GraphVisualization 
              accounts={accounts} 
              simulationStatus={{
                isRunning: simulation.isRunning,
                currentMonth: simulation.currentMonth,
                progress: simulation.progress,
                status: simulation.status,
              }}
            />
          </CardContent>
        </Card>

        {/* Account Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account, index) => (
            <Card key={index} className="hover-elevate" data-testid={`card-account-${index}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {account.name}
                    </p>
                    <p className={`text-2xl font-bold font-mono ${getBalanceColor(account.balance, account.type)}`} data-testid={`text-balance-${index}`}>
                      {account.balance.toLocaleString('fr-FR', { 
                        style: 'currency', 
                        currency: 'EUR' 
                      })}
                    </p>
                  </div>
                  <div className={getBalanceColor(account.balance, account.type)}>
                    {getBalanceIcon(account.balance)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}