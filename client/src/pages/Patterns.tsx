import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, TrendingUp, TrendingDown, Calendar, Euro, Edit2, Trash2, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RevenuePattern, ExpensePattern, Company, InsertRevenuePattern, InsertExpensePattern } from "@shared/schema";
import { insertRevenuePatternBaseSchema, insertExpensePatternBaseSchema } from "@shared/schema";

type PatternFormData = {
  name: string;
  amount: string;
  frequency: 'daily' | 'monthly' | 'quarterly' | 'yearly';
  startMonth: number;
  vatRate?: number;
  excludeWeekends?: number;
  excludeHolidays?: number;
  category?: string;
  vatDeductible?: number;
  // Daily pattern specific fields
  daysMask?: number;
  dayOffOverrides?: Array<{date: string; active: boolean; reason?: string}>;
  startDate?: string;
};

export default function Patterns() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [patternType, setPatternType] = useState<'revenue' | 'expense'>('revenue');
  const [editingPattern, setEditingPattern] = useState<RevenuePattern | ExpensePattern | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

  const { toast } = useToast();

  // Load companies first to get active company ID
  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set active company (use first company for now)
  useEffect(() => {
    if (companies && companies.length > 0 && !activeCompanyId) {
      setActiveCompanyId(companies[0].id);
    }
  }, [companies, activeCompanyId]);

  // Load patterns using company-scoped endpoints
  const { data: revenuePatterns, isLoading: revenueLoading } = useQuery<RevenuePattern[]>({
    queryKey: ['/api/companies', activeCompanyId, 'revenue-patterns'],
    enabled: !!activeCompanyId,
  });

  const { data: expensePatterns, isLoading: expenseLoading } = useQuery<ExpensePattern[]>({
    queryKey: ['/api/companies', activeCompanyId, 'expense-patterns'],
    enabled: !!activeCompanyId,
  });

  // Convert daysMask to array of selected days (0=Sunday, 1=Monday, etc.)
  const daysMaskToArray = (mask?: number): string[] => {
    if (!mask) return [];
    const days: string[] = [];
    const dayNames = ['0', '1', '2', '3', '4', '5', '6']; // 0=Sunday through 6=Saturday
    for (let i = 0; i < 7; i++) {
      if (mask & (1 << i)) {
        days.push(dayNames[i]);
      }
    }
    return days;
  };

  // Convert array of selected days to daysMask
  const arrayToDaysMask = (days: string[]): number => {
    let mask = 0;
    days.forEach(day => {
      const dayIndex = parseInt(day);
      mask |= (1 << dayIndex);
    });
    return mask;
  };

  // Get default form values
  const getDefaultValues = (type: 'revenue' | 'expense', pattern?: RevenuePattern | ExpensePattern): PatternFormData => {
    if (pattern) {
      return {
        name: pattern.name,
        amount: pattern.amount,
        frequency: pattern.frequency as 'daily' | 'monthly' | 'quarterly' | 'yearly',
        startMonth: pattern.startMonth,
        daysMask: pattern.daysMask || undefined,
        dayOffOverrides: pattern.dayOffOverrides as Array<{date: string; active: boolean; reason?: string}> || [],
        startDate: pattern.startDate || undefined,
        ...(type === 'revenue' && 'vatRate' in pattern ? {
          vatRate: pattern.vatRate ? parseFloat(pattern.vatRate) : 20,
          excludeWeekends: pattern.excludeWeekends ?? 0,
          excludeHolidays: pattern.excludeHolidays ?? 0,
        } : {
          category: 'category' in pattern ? pattern.category : 'general',
          vatDeductible: 'vatDeductible' in pattern ? (pattern.vatDeductible ?? 1) : 1,
          excludeWeekends: 'excludeWeekends' in pattern ? (pattern.excludeWeekends ?? 1) : 1,
          excludeHolidays: 'excludeHolidays' in pattern ? (pattern.excludeHolidays ?? 1) : 1,
        }),
      };
    }

    return {
      name: '',
      amount: '',
      frequency: 'monthly',
      startMonth: new Date().getMonth() + 1,
      daysMask: 0,
      dayOffOverrides: [],
      startDate: format(new Date(), 'yyyy-MM-dd'),
      ...(type === 'revenue' ? {
        vatRate: 20,
        excludeWeekends: 1,
        excludeHolidays: 1,
      } : {
        category: 'general',
        vatDeductible: 1,
        excludeWeekends: 1,
        excludeHolidays: 1,
      }),
    };
  };

  // Form for create dialog
  const createForm = useForm<PatternFormData>({
    resolver: zodResolver(
      patternType === 'revenue' 
        ? insertRevenuePatternBaseSchema.omit({ companyId: true })
        : insertExpensePatternBaseSchema.omit({ companyId: true })
    ),
    defaultValues: getDefaultValues(patternType),
  });

  // Form for edit dialog
  const editForm = useForm<PatternFormData>({
    resolver: zodResolver(
      patternType === 'revenue' 
        ? insertRevenuePatternBaseSchema.omit({ companyId: true })
        : insertExpensePatternBaseSchema.omit({ companyId: true })
    ),
    defaultValues: getDefaultValues(patternType),
  });

  // Reset forms when pattern type changes
  useEffect(() => {
    createForm.reset(getDefaultValues(patternType));
  }, [patternType, createForm]);

  // Create pattern mutation
  const createPatternMutation = useMutation({
    mutationFn: async ({ type, data }: { type: 'revenue' | 'expense', data: PatternFormData }) => {
      if (!activeCompanyId) throw new Error('No active company');
      
      const endpoint = `/api/companies/${activeCompanyId}/${type}-patterns`;
      const payload = {
        ...data,
        amount: data.amount,
        startMonth: data.startMonth,
        ...(type === 'revenue' ? {
          vatRate: data.vatRate || 20,
          excludeWeekends: data.excludeWeekends || 0,
          excludeHolidays: data.excludeHolidays || 0,
        } : {
          category: data.category || 'general',
          vatDeductible: data.vatDeductible || 1,
          excludeWeekends: data.excludeWeekends || 1,
          excludeHolidays: data.excludeHolidays || 1,
        }),
      };
      
      return await apiRequest('POST', endpoint, payload);
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant cache using company-scoped keys
      queryClient.invalidateQueries({ 
        queryKey: ['/api/companies', activeCompanyId, `${variables.type}-patterns`] 
      });
      
      toast({
        title: "Schéma créé !",
        description: `Le schéma de ${variables.type === 'revenue' ? 'recette' : 'dépense'} a été créé avec succès.`,
      });
      
      setIsCreateDialogOpen(false);
      createForm.reset(getDefaultValues(patternType));
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

  // Update pattern mutation
  const updatePatternMutation = useMutation({
    mutationFn: async ({ type, id, data }: { type: 'revenue' | 'expense', id: string, data: PatternFormData }) => {
      if (!activeCompanyId) throw new Error('No active company');
      
      const endpoint = `/api/companies/${activeCompanyId}/${type}-patterns/${id}`;
      const payload = {
        ...data,
        amount: data.amount,
        startMonth: data.startMonth,
        ...(type === 'revenue' ? {
          vatRate: data.vatRate || 20,
          excludeWeekends: data.excludeWeekends || 0,
          excludeHolidays: data.excludeHolidays || 0,
        } : {
          category: data.category || 'general',
          vatDeductible: data.vatDeductible || 1,
          excludeWeekends: data.excludeWeekends || 1,
          excludeHolidays: data.excludeHolidays || 1,
        }),
      };
      
      return await apiRequest('PUT', endpoint, payload);
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant cache
      queryClient.invalidateQueries({ 
        queryKey: ['/api/companies', activeCompanyId, `${variables.type}-patterns`] 
      });
      
      toast({
        title: "Schéma modifié !",
        description: `Le schéma de ${variables.type === 'revenue' ? 'recette' : 'dépense'} a été modifié avec succès.`,
      });
      
      setIsEditDialogOpen(false);
      setEditingPattern(null);
      editForm.reset();
    },
    onError: (error) => {
      console.error('Error updating pattern:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le schéma. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  // Delete pattern mutation
  const deletePatternMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'revenue' | 'expense', id: string }) => {
      if (!activeCompanyId) throw new Error('No active company');
      
      const endpoint = `/api/companies/${activeCompanyId}/${type}-patterns/${id}`;
      return await apiRequest('DELETE', endpoint);
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant cache
      queryClient.invalidateQueries({ 
        queryKey: ['/api/companies', activeCompanyId, `${variables.type}-patterns`] 
      });
      
      toast({
        title: "Schéma supprimé !",
        description: `Le schéma de ${variables.type === 'revenue' ? 'recette' : 'dépense'} a été supprimé avec succès.`,
      });
    },
    onError: (error) => {
      console.error('Error deleting pattern:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le schéma. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = (data: PatternFormData) => {
    createPatternMutation.mutate({ type: patternType, data });
  };

  const handleEdit = (pattern: RevenuePattern | ExpensePattern, type: 'revenue' | 'expense') => {
    setEditingPattern(pattern);
    setPatternType(type);
    editForm.reset(getDefaultValues(type, pattern));
    setIsEditDialogOpen(true);
  };

  const handleUpdate = (data: PatternFormData) => {
    if (!editingPattern) return;
    updatePatternMutation.mutate({ 
      type: patternType, 
      id: editingPattern.id, 
      data 
    });
  };

  const handleDelete = (pattern: RevenuePattern | ExpensePattern, type: 'revenue' | 'expense') => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le schéma "${pattern.name}" ?`)) {
      deletePatternMutation.mutate({ type, id: pattern.id });
    }
  };

  const formatAmount = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return numAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };

  const getFrequencyText = (frequency: string) => {
    const mapping = {
      daily: 'Quotidien',
      monthly: 'Mensuel',
      quarterly: 'Trimestriel',
      yearly: 'Annuel',
    };
    return mapping[frequency as keyof typeof mapping] || frequency;
  };

  // Day presets for daily patterns
  const dayPresets = {
    weekdays: ['1', '2', '3', '4', '5'], // Monday-Friday
    weekend: ['0', '6'], // Saturday-Sunday
    all: ['0', '1', '2', '3', '4', '5', '6'], // All days
  };

  const dayNames = {
    '0': 'Dim',
    '1': 'Lun',
    '2': 'Mar',
    '3': 'Mer',
    '4': 'Jeu',
    '5': 'Ven',
    '6': 'Sam'
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
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => handleEdit(pattern, type)}
              data-testid={`button-edit-${pattern.id}`}
            >
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => handleDelete(pattern, type)}
              data-testid={`button-delete-${pattern.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-bold" data-testid={`text-amount-${pattern.id}`}>
              {formatAmount(pattern.amount)}
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
            {'excludeWeekends' in pattern && pattern.excludeWeekends && (
              <Badge variant="outline" className="text-xs">Sans WE</Badge>
            )}
            {'excludeHolidays' in pattern && pattern.excludeHolidays && (
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

  const PatternForm = ({ form, onSubmit, isSubmitting }: { 
    form: any, 
    onSubmit: (data: PatternFormData) => void,
    isSubmitting: boolean
  }) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Tabs 
          defaultValue="revenue" 
          value={patternType}
          onValueChange={(value) => setPatternType(value as 'revenue' | 'expense')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="revenue" data-testid="tab-revenue">Recette</TabsTrigger>
            <TabsTrigger value="expense" data-testid="tab-expense">Dépense</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom du schéma</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="ex: Chiffre d'affaires mensuel"
                    data-testid="input-pattern-name"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant (€)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      min="0"
                      step="0.01"
                      data-testid="input-pattern-amount"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {patternType === 'revenue' && (
              <FormField
                control={form.control}
                name="vatRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TVA (%)</FormLabel>
                    <Select 
                      value={field.value?.toString()} 
                      onValueChange={(value) => field.onChange(parseFloat(value))}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-vat-rate">
                          <SelectValue placeholder="Taux TVA" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">0% (exonéré)</SelectItem>
                        <SelectItem value="5.5">5,5% (réduit)</SelectItem>
                        <SelectItem value="10">10% (intermédiaire)</SelectItem>
                        <SelectItem value="20">20% (normal)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fréquence</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-frequency">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Quotidien</SelectItem>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                      <SelectItem value="quarterly">Trimestriel</SelectItem>
                      <SelectItem value="yearly">Annuel</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mois de début</FormLabel>
                  <Select 
                    value={field.value?.toString()} 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-start-month">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Daily Pattern Specific Fields */}
          {form.watch('frequency') === 'daily' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-3">
                <FormLabel>Paramètres quotidiens</FormLabel>
                
                {/* Start Date for Daily Patterns */}
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de début</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-start-date"
                            >
                              {field.value ? (
                                format(new Date(field.value), "dd/MM/yyyy")
                              ) : (
                                <span>Sélectionner une date</span>
                              )}
                              <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Days of Week Selection */}
                <FormField
                  control={form.control}
                  name="daysMask"
                  render={({ field }) => {
                    const selectedDays = daysMaskToArray(field.value);
                    const handleDaysChange = (newDays: string[]) => {
                      const newMask = arrayToDaysMask(newDays);
                      field.onChange(newMask);
                    };

                    return (
                      <FormItem>
                        <FormLabel>Jours de la semaine</FormLabel>
                        <div className="space-y-3">
                          {/* Day Presets */}
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDaysChange(dayPresets.weekdays)}
                              data-testid="button-preset-weekdays"
                            >
                              Lun-Ven
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDaysChange(dayPresets.weekend)}
                              data-testid="button-preset-weekend"
                            >
                              Week-end
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDaysChange(dayPresets.all)}
                              data-testid="button-preset-all"
                            >
                              Tous
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDaysChange([])}
                              data-testid="button-preset-none"
                            >
                              Aucun
                            </Button>
                          </div>

                          {/* Individual Day Selection */}
                          <FormControl>
                            <ToggleGroup 
                              type="multiple" 
                              value={selectedDays}
                              onValueChange={handleDaysChange}
                              className="justify-start"
                              data-testid="toggle-group-days"
                            >
                              {Object.entries(dayNames).map(([value, label]) => (
                                <ToggleGroupItem 
                                  key={value} 
                                  value={value}
                                  data-testid={`toggle-day-${value}`}
                                  className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                >
                                  {label}
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </div>
          )}

          {patternType === 'expense' && (
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie de dépense</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="space-y-3">
            <FormLabel>Options fiscal et calendrier</FormLabel>
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="excludeWeekends"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox 
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                        data-testid="checkbox-exclude-weekends"
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      Exclure les week-ends
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="excludeHolidays"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox 
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                        data-testid="checkbox-exclude-holidays"
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      Exclure les jours fériés français
                    </FormLabel>
                  </FormItem>
                )}
              />

              {patternType === 'expense' && (
                <FormField
                  control={form.control}
                  name="vatDeductible"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox 
                          checked={!!field.value}
                          onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                          data-testid="checkbox-vat-deductible"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        TVA déductible
                      </FormLabel>
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
            }}
            data-testid="button-cancel"
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            data-testid="button-submit-pattern"
          >
            {isSubmitting ? (editingPattern ? "Modification..." : "Création...") : (editingPattern ? "Modifier" : "Créer")}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (companiesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Chargement...</div>
          <div className="text-muted-foreground">Initialisation de l'application</div>
        </div>
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-medium mb-2">Aucune entreprise</h3>
            <p className="text-muted-foreground">
              Vous devez d'abord créer une entreprise pour gérer vos schémas financiers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Schémas Financiers</h1>
            <p className="text-muted-foreground mt-1">
              Définissez vos recettes et dépenses récurrentes avec le calendrier français
            </p>
            {companies && companies.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Entreprise: {companies.find(c => c.id === activeCompanyId)?.name}
              </p>
            )}
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
              <PatternForm 
                form={createForm} 
                onSubmit={handleCreate}
                isSubmitting={createPatternMutation.isPending}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Modifier le schéma financier</DialogTitle>
              </DialogHeader>
              <PatternForm 
                form={editForm} 
                onSubmit={handleUpdate}
                isSubmitting={updatePatternMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="revenue" className="w-full">
          <TabsList>
            <TabsTrigger value="revenue" data-testid="tab-revenue-list">
              Recettes ({revenuePatterns ? revenuePatterns.length : 0})
            </TabsTrigger>
            <TabsTrigger value="expense" data-testid="tab-expense-list">
              Dépenses ({expensePatterns ? expensePatterns.length : 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-6">
            {revenueLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement des schémas de recettes...
              </div>
            ) : revenuePatterns && revenuePatterns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {revenuePatterns.map((pattern: RevenuePattern) => (
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
            ) : expensePatterns && expensePatterns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expensePatterns.map((pattern: ExpensePattern) => (
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