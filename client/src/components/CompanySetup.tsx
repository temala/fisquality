import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CompanyFormData {
  name: string;
  legalForm: string;
  activity: string;
  capital: number;
  bank: string;
}

const LEGAL_FORMS = [
  { value: "sarl", label: "SARL - Société à Responsabilité Limitée" },
  { value: "sas", label: "SAS - Société par Actions Simplifiée" },
  { value: "eurl", label: "EURL - Entreprise Unipersonnelle à Responsabilité Limitée" },
  { value: "sa", label: "SA - Société Anonyme" },
  { value: "sasu", label: "SASU - Société par Actions Simplifiée Unipersonnelle" }
];

const ACTIVITY_SECTORS = [
  { value: "services_info", label: "Services informatiques" },
  { value: "conseil", label: "Conseil et consulting" },
  { value: "commerce", label: "Commerce de détail" },
  { value: "industrie", label: "Industrie manufacturière" },
  { value: "btp", label: "Bâtiment et travaux publics" },
  { value: "restauration", label: "Restauration et hôtellerie" },
  { value: "sante", label: "Santé et services sociaux" },
  { value: "education", label: "Éducation et formation" }
];

const BANKS = [
  { value: "bnp", label: "BNP Paribas" },
  { value: "credit_agricole", label: "Crédit Agricole" },
  { value: "societe_generale", label: "Société Générale" },
  { value: "lcl", label: "LCL" },
  { value: "credit_mutuel", label: "Crédit Mutuel" },
  { value: "banque_populaire", label: "Banque Populaire" },
  { value: "caisse_epargne", label: "Caisse d'Épargne" }
];

export default function CompanySetup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: "",
    legalForm: "",
    activity: "",
    capital: 10000,
    bank: ""
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    console.log(`Step ${currentStep} completed`);
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const { toast } = useToast();

  const createCompanyMutation = useMutation({
    mutationFn: async (companyData: CompanyFormData) => {
      return await apiRequest('POST', '/api/companies', {
        name: companyData.name,
        legalForm: companyData.legalForm,
        activitySector: companyData.activity,
        capital: companyData.capital,
        bankPartner: companyData.bank,
      });
    },
    onSuccess: () => {
      // Invalidate companies cache
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      
      toast({
        title: "Entreprise créée !",
        description: "Votre entreprise a été configurée avec succès.",
      });
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    },
    onError: (error) => {
      console.error('Error creating company:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'entreprise. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const handleComplete = () => {
    console.log('Company setup completed:', formData);
    createCompanyMutation.mutate(formData);
  };

  const updateFormData = (field: keyof CompanyFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1: return formData.name.length > 0;
      case 2: return formData.legalForm.length > 0 && formData.activity.length > 0;
      case 3: return formData.capital > 0;
      case 4: return formData.bank.length > 0;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Configuration de l'entreprise</h1>
          <p className="text-muted-foreground">
            Configurez votre entreprise pour commencer la simulation fiscale
          </p>
          <div className="mt-4">
            <Progress value={progress} className="h-2" data-testid="progress-setup" />
            <p className="text-sm text-muted-foreground mt-2">
              Étape {currentStep} sur {totalSteps}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 4 && <CheckCircle className="h-5 w-5 text-chart-2" />}
              {currentStep === 1 && "Informations générales"}
              {currentStep === 2 && "Forme juridique et activité"}
              {currentStep === 3 && "Capital social"}
              {currentStep === 4 && "Choix de la banque"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Company Name */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nom de l'entreprise *</Label>
                  <Input
                    id="company-name"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="Ex: SARL TechInnovation"
                    data-testid="input-company-name"
                  />
                </div>
                <div className="p-4 bg-secondary/10 rounded-lg">
                  <h4 className="font-medium mb-2">À propos de cette étape</h4>
                  <p className="text-sm text-muted-foreground">
                    Le nom de votre entreprise apparaîtra dans tous les documents et simulations. 
                    Vous pouvez le modifier plus tard si nécessaire.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Legal Form & Activity */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="legal-form">Forme juridique *</Label>
                  <Select 
                    onValueChange={(value) => updateFormData('legalForm', value)}
                    data-testid="select-legal-form"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisissez la forme juridique" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEGAL_FORMS.map(form => (
                        <SelectItem key={form.value} value={form.value}>
                          {form.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity">Secteur d'activité *</Label>
                  <Select 
                    onValueChange={(value) => updateFormData('activity', value)}
                    data-testid="select-activity"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisissez votre secteur d'activité" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_SECTORS.map(sector => (
                        <SelectItem key={sector.value} value={sector.value}>
                          {sector.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.legalForm && (
                  <div className="p-4 bg-secondary/10 rounded-lg">
                    <h4 className="font-medium mb-2">
                      <Badge variant="secondary">{LEGAL_FORMS.find(f => f.value === formData.legalForm)?.label}</Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {formData.legalForm === 'sarl' && "Idéal pour les PME, responsabilité limitée aux apports."}
                      {formData.legalForm === 'sas' && "Flexible pour les startups et projets d'envergure."}
                      {formData.legalForm === 'eurl' && "Parfait pour l'entrepreneur individuel qui veut protéger son patrimoine."}
                      {formData.legalForm === 'sa' && "Adapté aux grandes entreprises avec conseil d'administration."}
                      {formData.legalForm === 'sasu' && "Version unipersonnelle de la SAS, très souple."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Capital */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="capital">Capital social (€) *</Label>
                  <Input
                    id="capital"
                    type="number"
                    value={formData.capital}
                    onChange={(e) => updateFormData('capital', parseInt(e.target.value) || 0)}
                    min="1"
                    placeholder="10000"
                    data-testid="input-capital"
                  />
                  <p className="text-sm text-muted-foreground">
                    Montant minimum requis selon la forme juridique choisie
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => updateFormData('capital', 1000)}
                    data-testid="button-capital-1k"
                  >
                    1 000 €
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => updateFormData('capital', 10000)}
                    data-testid="button-capital-10k"
                  >
                    10 000 €
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => updateFormData('capital', 50000)}
                    data-testid="button-capital-50k"
                  >
                    50 000 €
                  </Button>
                </div>

                <div className="p-4 bg-secondary/10 rounded-lg">
                  <h4 className="font-medium mb-2">Impact du capital sur la simulation</h4>
                  <p className="text-sm text-muted-foreground">
                    Le capital initial influencera votre trésorerie de départ et les calculs 
                    de rentabilité dans la simulation.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Bank Selection */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bank">Banque partenaire *</Label>
                  <Select 
                    onValueChange={(value) => updateFormData('bank', value)}
                    data-testid="select-bank"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisissez votre banque" />
                    </SelectTrigger>
                    <SelectContent>
                      {BANKS.map(bank => (
                        <SelectItem key={bank.value} value={bank.value}>
                          {bank.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-secondary/10 rounded-lg">
                  <h4 className="font-medium mb-2">Configuration terminée !</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Votre entreprise sera configurée avec les paramètres suivants :
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Nom :</span>
                      <span className="font-medium" data-testid="text-summary-name">{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Forme :</span>
                      <Badge variant="secondary" data-testid="badge-summary-form">
                        {LEGAL_FORMS.find(f => f.value === formData.legalForm)?.label.split(' - ')[0]}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Activité :</span>
                      <span className="font-medium" data-testid="text-summary-activity">
                        {ACTIVITY_SECTORS.find(a => a.value === formData.activity)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Capital :</span>
                      <span className="font-mono font-bold" data-testid="text-summary-capital">
                        {formData.capital.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Banque :</span>
                      <span className="font-medium" data-testid="text-summary-bank">
                        {BANKS.find(b => b.value === formData.bank)?.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                data-testid="button-previous"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Précédent
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid(currentStep)}
                  data-testid="button-next"
                >
                  Suivant
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!isStepValid(currentStep)}
                  data-testid="button-complete-setup"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Terminer la configuration
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}