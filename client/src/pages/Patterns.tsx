import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, TrendingUp, TrendingDown, Calendar, Euro, Edit2, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RevenuePattern, ExpensePattern } from "@shared/schema";

interface PatternFormData {
  name: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  startMonth: number;
  vatRate?: number;
  excludeWeekends?: boolean;
  excludeHolidays?: boolean;
  category?: string; // For expense patterns
  vatDeductible?: boolean; // For expense patterns
}

export default function Patterns() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [patternType, setPatternType] = useState<'revenue' | 'expense'>('revenue');
  const [formData, setFormData] = useState<PatternFormData>({
    name: '',
    amount: 0,
    frequency: 'monthly',
    startMonth: new Date().getMonth() + 1,
    vatRate: 20,
    excludeWeekends: true,
    excludeHolidays: true,
    category: 'general',
    vatDeductible: true,
  });

  const { toast } = useToast();

  // Load patterns
  const { data: revenuePatterns, isLoading: revenueLoading } = useQuery<RevenuePattern[]>({
    queryKey: ['/api/revenue-patterns'],
  });

  const { data: expensePatterns, isLoading: expenseLoading } = useQuery<ExpensePattern[]>({
    queryKey: ['/api/expense-patterns'],
  });

  // Create pattern mutation
  const createPatternMutation = useMutation({
    mutationFn: async ({ type, data }: { type: 'revenue' | 'expense', data: PatternFormData }) => {
      const endpoint = type === 'revenue' ? '/api/revenue-patterns' : '/api/expense-patterns';
      const payload = {
        name: data.name,
        amount: data.amount.toString(),
        frequency: data.frequency,
        startMonth: data.startMonth,
        ...(type === 'revenue' ? {
          vatRate: data.vatRate?.toString(),
          excludeWeekends: data.excludeWeekends ? 1 : 0,
          excludeHolidays: data.excludeHolidays ? 1 : 0,
        } : {
          category: data.category,
          vatDeductible: data.vatDeductible ? 1 : 0,
        }),
      };
      return await apiRequest('POST', endpoint, payload);
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant cache
      const cacheKey = variables.type === 'revenue' ? '/api/revenue-patterns' : '/api/expense-patterns';
      queryClient.invalidateQueries({ queryKey: [cacheKey] });
      
      toast({
        title: "Schéma créé !",
        description: `Le schéma de ${variables.type === 'revenue' ? 'recette' : 'dépense'} a été créé avec succès.`,
      });
      
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error creating pattern:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le schéma. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      amount: 0,
      frequency: 'monthly',
      startMonth: new Date().getMonth() + 1,
      vatRate: 20,
      excludeWeekends: true,
      excludeHolidays: true,
      category: 'general',
      vatDeductible: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.amount <= 0) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez remplir tous les champs requis.",
        variant: "destructive",
      });
      return;
    }
    createPatternMutation.mutate({ type: patternType, data: formData });
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };

  const getFrequencyText = (frequency: string) => {
    const mapping = {
      daily: 'Quotidien',
      weekly: 'Hebdomadaire', 
      monthly: 'Mensuel',
      quarterly: 'Trimestriel',
      yearly: 'Annuel',
      one_time: 'Ponctuel'
    };
    return mapping[frequency as keyof typeof mapping] || frequency;
  };

  const getPatternIcon = (type: 'revenue' | 'expense') => {
    return type === 'revenue' ? TrendingUp : TrendingDown;
  };

  const PatternCard = ({ pattern, type }: { pattern: RevenuePattern | ExpensePattern, type: 'revenue' | 'expense' }) => {
    const Icon = getPatternIcon(type);
    const currentMonth = new Date().getMonth() + 1;
    const isActive = pattern.startMonth <= currentMonth;

    return (
      <Card className="hover-elevate" data-testid={`card-pattern-${pattern.id}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className={`w-4 h-4 ${type === 'revenue' ? 'text-green-600' : 'text-red-600'}`} />
            {pattern.name}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" data-testid={`button-edit-${pattern.id}`}>
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" data-testid={`button-delete-${pattern.id}`}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-bold" data-testid={`text-amount-${pattern.id}`}>
              {formatAmount(parseFloat(pattern.amount))}
            </span>
            <Badge variant={isActive ? "default" : "secondary"} data-testid={`badge-status-${pattern.id}`}>
              {isActive ? "Actif" : "Inactif"}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {getFrequencyText(pattern.frequency)} (Mois {pattern.startMonth})
            </div>
            {type === 'revenue' && 'vatRate' in pattern && pattern.vatRate && (
              <div className="flex items-center gap-1 mt-1">
                <Euro className="w-3 h-3" />
                TVA {pattern.vatRate}%
              </div>
            )}
            {type === 'expense' && 'category' in pattern && (
              <div className="flex items-center gap-1 mt-1">
                <Euro className="w-3 h-3" />
                {pattern.category}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {type === 'revenue' && 'excludeWeekends' in pattern && pattern.excludeWeekends && (
              <Badge variant="outline" className="text-xs">Sans WE</Badge>
            )}
            {type === 'revenue' && 'excludeHolidays' in pattern && pattern.excludeHolidays && (
              <Badge variant="outline" className="text-xs">Sans fériés</Badge>
            )}
            {type === 'expense' && 'vatDeductible' in pattern && pattern.vatDeductible && (
              <Badge variant="outline" className="text-xs">TVA déductible</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Schémas Financiers</h1>
            <p className="text-muted-foreground mt-1">
              Définissez vos recettes et dépenses récurrentes avec le calendrier français
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-pattern">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau schéma
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Créer un schéma financier</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Tabs defaultValue="revenue" onValueChange={(value) => setPatternType(value as 'revenue' | 'expense')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="revenue" data-testid="tab-revenue">Recette</TabsTrigger>
                    <TabsTrigger value="expense" data-testid="tab-expense">Dépense</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nom du schéma</Label>
                    <Input 
                      id="name"
                      placeholder="ex: Chiffre d'affaires mensuel"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      data-testid="input-pattern-name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Montant (€)</Label>
                      <Input 
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                        data-testid="input-pattern-amount"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vatRate">TVA (%)</Label>
                      <Select 
                        value={formData.vatRate?.toString()} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, vatRate: parseFloat(value) }))}
                      >
                        <SelectTrigger data-testid="select-vat-rate">
                          <SelectValue placeholder="Taux TVA" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0% (exonéré)</SelectItem>
                          <SelectItem value="5.5">5,5% (réduit)</SelectItem>
                          <SelectItem value="10">10% (intermédiaire)</SelectItem>
                          <SelectItem value="20">20% (normal)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="frequency">Fréquence</Label>
                      <Select 
                        value={formData.frequency} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value as PatternFormData['frequency'] }))}
                      >
                        <SelectTrigger data-testid="select-frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensuel</SelectItem>
                          <SelectItem value="quarterly">Trimestriel</SelectItem>
                          <SelectItem value="yearly">Annuel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="startMonth">Mois de début</Label>
                      <Select 
                        value={formData.startMonth.toString()} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, startMonth: parseInt(value) }))}
                      >
                        <SelectTrigger data-testid="select-start-month">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Janvier</SelectItem>
                          <SelectItem value="2">Février</SelectItem>
                          <SelectItem value="3">Mars</SelectItem>
                          <SelectItem value="4">Avril</SelectItem>
                          <SelectItem value="5">Mai</SelectItem>
                          <SelectItem value="6">Juin</SelectItem>
                          <SelectItem value="7">Juillet</SelectItem>
                          <SelectItem value="8">Août</SelectItem>
                          <SelectItem value="9">Septembre</SelectItem>
                          <SelectItem value="10">Octobre</SelectItem>
                          <SelectItem value="11">Novembre</SelectItem>
                          <SelectItem value="12">Décembre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {patternType === 'expense' && (
                    <div>
                      <Label htmlFor="category">Catégorie de dépense</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger data-testid="select-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">Frais généraux</SelectItem>
                          <SelectItem value="rent">Loyer</SelectItem>
                          <SelectItem value="utilities">Charges/Utilities</SelectItem>
                          <SelectItem value="subscription">Abonnements</SelectItem>
                          <SelectItem value="insurance">Assurances</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="travel">Déplacements</SelectItem>
                          <SelectItem value="equipment">Matériel/Équipement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label>Options fiscal et calendrier</Label>
                    <div className="space-y-2">
                      {patternType === 'revenue' && (
                        <>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="excludeWeekends"
                              checked={formData.excludeWeekends}
                              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, excludeWeekends: !!checked }))}
                              data-testid="checkbox-exclude-weekends"
                            />
                            <Label htmlFor="excludeWeekends" className="text-sm">
                              Exclure les week-ends
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="excludeHolidays"
                              checked={formData.excludeHolidays}
                              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, excludeHolidays: !!checked }))}
                              data-testid="checkbox-exclude-holidays"
                            />
                            <Label htmlFor="excludeHolidays" className="text-sm">
                              Exclure les jours fériés français
                            </Label>
                          </div>
                        </>
                      )}
                      {patternType === 'expense' && (
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="vatDeductible"
                            checked={formData.vatDeductible}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, vatDeductible: !!checked }))}
                            data-testid="checkbox-vat-deductible"
                          />
                          <Label htmlFor="vatDeductible" className="text-sm">
                            TVA déductible
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createPatternMutation.isPending}
                    data-testid="button-submit-pattern"
                  >
                    {createPatternMutation.isPending ? "Création..." : "Créer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="revenue" className="w-full">
          <TabsList>
            <TabsTrigger value="revenue" data-testid="tab-revenue-list">
              Recettes ({revenuePatterns?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="expense" data-testid="tab-expense-list">
              Dépenses ({expensePatterns?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-6">
            {revenueLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement des schémas de recettes...
              </div>
            ) : revenuePatterns?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {revenuePatterns.map(pattern => (
                  <PatternCard key={pattern.id} pattern={pattern} type="revenue" />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun schéma de recette</h3>
                  <p className="text-muted-foreground mb-4">
                    Commencez par définir vos sources de revenus récurrentes
                  </p>
                  <Button onClick={() => {
                    setPatternType('revenue');
                    setIsCreateDialogOpen(true);
                  }} data-testid="button-create-revenue">
                    Créer un schéma de recette
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="expense" className="mt-6">
            {expenseLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement des schémas de dépenses...
              </div>
            ) : expensePatterns?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expensePatterns.map(pattern => (
                  <PatternCard key={pattern.id} pattern={pattern} type="expense" />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <TrendingDown className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun schéma de dépense</h3>
                  <p className="text-muted-foreground mb-4">
                    Définissez vos charges et frais récurrents
                  </p>
                  <Button onClick={() => {
                    setPatternType('expense');
                    setIsCreateDialogOpen(true);
                  }} data-testid="button-create-expense">
                    Créer un schéma de dépense
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}