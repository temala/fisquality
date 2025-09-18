import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  Euro,
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  RotateCcw,
  LogOut,
} from "lucide-react";
import GraphVisualization from "@/components/GraphVisualization";

// Import Company type from shared schema
import type { Company } from "@shared/schema";

interface AccountBalance {
  name: string;
  balance: number;
  type: "asset" | "expense" | "revenue" | "tax";
}

interface SimulationState {
  isRunning: boolean;
  progress: number;
  currentMonth: number;
}

export default function Dashboard() {
  // All hooks must be declared at the top before any conditional returns
  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const [accounts] = useState<AccountBalance[]>([
    { name: "Compte Courant", balance: 125400, type: "asset" },
    { name: "Chiffre d'Affaires", balance: 240000, type: "revenue" },
    { name: "Charges Sociales", balance: -45600, type: "tax" },
    { name: "TVA à Payer", balance: -12800, type: "tax" },
    { name: "Frais Généraux", balance: -28400, type: "expense" },
  ]);

  const [simulation, setSimulation] = useState<SimulationState>({
    isRunning: false,
    progress: 45,
    currentMonth: 6,
  });

  // Use first company as default or show company selection
  const company = companies?.[0];

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

  const handleSimulationToggle = () => {
    console.log("Simulation toggle triggered");
    setSimulation((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const handleReset = () => {
    console.log("Reset simulation triggered");
    setSimulation({ isRunning: false, progress: 0, currentMonth: 1 });
  };

  const handleLogout = () => {
    console.log("Logout triggered");
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
                onClick={handleSimulationToggle}
                variant={simulation.isRunning ? "secondary" : "default"}
                data-testid="button-toggle-simulation"
              >
                {simulation.isRunning ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Démarrer
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReset}
                data-testid="button-reset-simulation"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression</span>
                <span data-testid="text-simulation-progress">{simulation.progress}%</span>
              </div>
              <Progress value={simulation.progress} className="h-2" />
              <p className="text-xs text-muted-foreground" data-testid="text-current-month">
                Mois {simulation.currentMonth}/12
              </p>
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
            <GraphVisualization accounts={accounts} />
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