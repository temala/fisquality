import { useState } from "react";
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
  LogOut
} from "lucide-react";
import GraphVisualization from "./GraphVisualization";

interface Company {
  name: string;
  legalForm: string;
  activity: string;
  capital: number;
}

interface AccountBalance {
  name: string;
  balance: number;
  type: 'asset' | 'expense' | 'revenue' | 'tax';
}

interface SimulationState {
  isRunning: boolean;
  progress: number;
  currentMonth: number;
}

export default function Dashboard() {
  // todo: remove mock functionality
  const [company] = useState<Company>({
    name: "SARL TechInnovation",
    legalForm: "SARL", 
    activity: "Services informatiques",
    capital: 50000
  });

  const [accounts] = useState<AccountBalance[]>([
    { name: "Compte Courant", balance: 125400, type: 'asset' },
    { name: "Chiffre d'Affaires", balance: 240000, type: 'revenue' },
    { name: "Charges Sociales", balance: -45600, type: 'tax' },
    { name: "TVA à Payer", balance: -12800, type: 'tax' },
    { name: "Frais Généraux", balance: -28400, type: 'expense' },
  ]);

  const [simulation, setSimulation] = useState<SimulationState>({
    isRunning: false,
    progress: 45,
    currentMonth: 6
  });

  const handleSimulationToggle = () => {
    console.log('Simulation toggle triggered');
    setSimulation(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const handleReset = () => {
    console.log('Reset simulation triggered');
    setSimulation({ isRunning: false, progress: 0, currentMonth: 1 });
  };

  const handleLogout = () => {
    console.log('Logout triggered');
    window.location.href = '/api/logout';
  };

  const getBalanceColor = (balance: number, type: string) => {
    if (type === 'revenue') return 'text-chart-2';
    if (type === 'tax' || type === 'expense') return 'text-chart-4';
    return balance >= 0 ? 'text-chart-2' : 'text-chart-4';
  };

  const getBalanceIcon = (balance: number) => {
    return balance >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
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
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Forme juridique</p>
                <Badge variant="secondary" data-testid="badge-legal-form">{company.legalForm}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activité</p>
                <p className="font-medium" data-testid="text-activity">{company.activity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capital</p>
                <p className="font-mono font-bold" data-testid="text-capital">
                  {company.capital.toLocaleString('fr-FR')} €
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut simulation</p>
                <Badge 
                  variant={simulation.isRunning ? "default" : "secondary"}
                  data-testid="badge-simulation-status"
                >
                  {simulation.isRunning ? "En cours" : "Arrêtée"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Simulation Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Contrôles de simulation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleSimulationToggle}
                  data-testid="button-simulation-toggle"
                  className="flex-shrink-0"
                >
                  {simulation.isRunning ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Lancer
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  data-testid="button-reset"
                  className="flex-shrink-0"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Mois {simulation.currentMonth}/12</span>
                    <span>{Math.round(simulation.progress)}%</span>
                  </div>
                  <Progress value={simulation.progress} data-testid="progress-simulation" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Graph Visualization */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Visualisation des flux financiers</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <GraphVisualization accounts={accounts} />
              </CardContent>
            </Card>
          </div>

          {/* Account Balances */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Soldes des comptes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {accounts.map((account, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg"
                    data-testid={`account-${index}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{account.name}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {account.type === 'asset' && 'Actif'}
                        {account.type === 'revenue' && 'Recette'}
                        {account.type === 'expense' && 'Charge'}
                        {account.type === 'tax' && 'Taxe'}
                      </Badge>
                    </div>
                    <div className={`text-right ${getBalanceColor(account.balance, account.type)}`}>
                      <div className="flex items-center gap-1 justify-end">
                        {getBalanceIcon(account.balance)}
                        <span className="font-mono font-bold">
                          {Math.abs(account.balance).toLocaleString('fr-FR')} €
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Bilan prévisionnel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenus totaux</span>
                  <span className="font-mono font-bold text-chart-2" data-testid="text-total-revenue">
                    240 000 €
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Charges totales</span>
                  <span className="font-mono font-bold text-chart-4" data-testid="text-total-expenses">
                    86 800 €
                  </span>
                </div>
                <hr />
                <div className="flex justify-between font-bold">
                  <span>Résultat prévisionnel</span>
                  <span className="font-mono text-chart-2" data-testid="text-projected-result">
                    153 200 €
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}