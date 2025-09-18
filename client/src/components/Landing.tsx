import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, TrendingUp, Calculator, BarChart3 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">SimuFiscal</h1>
          </div>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
          >
            Se connecter
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Simulez une année d'exercice
            <br />
            <span className="text-primary">pour votre entreprise française</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Visualisez les flux financiers, calculez les taxes et optimisez votre stratégie 
            avec notre plateforme de simulation interactive
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-get-started"
            className="text-lg px-8 py-3"
          >
            Commencer la simulation
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">
            Fonctionnalités principales
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card data-testid="card-feature-setup">
              <CardContent className="p-6 text-center">
                <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
                <h4 className="text-xl font-semibold mb-2">Configuration d'entreprise</h4>
                <p className="text-muted-foreground">
                  Choisissez la forme juridique, le secteur d'activité, le capital et la banque
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-simulation">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 text-chart-2 mx-auto mb-4" />
                <h4 className="text-xl font-semibold mb-2">Simulation de flux</h4>
                <p className="text-muted-foreground">
                  Modélisez les revenus et dépenses récurrents sur une année complète
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-taxes">
              <CardContent className="p-6 text-center">
                <Calculator className="h-12 w-12 text-chart-3 mx-auto mb-4" />
                <h4 className="text-xl font-semibold mb-2">Calculs fiscaux</h4>
                <p className="text-muted-foreground">
                  TVA, URSSAF et autres taxes calculés automatiquement selon la réglementation française
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Visualization Preview */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-8">
            Visualisation interactive des comptes
          </h3>
          <div className="bg-card border rounded-lg p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <BarChart3 className="h-24 w-24" />
            </div>
            <p className="mt-4 text-muted-foreground">
              Graphique interactif montrant les flux entre comptes fiscaux avec zoom et détails
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 SimuFiscal - Plateforme de simulation fiscale française</p>
        </div>
      </footer>
    </div>
  );
}