import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Building2, 
  TrendingUp, 
  Settings, 
  Play 
} from "lucide-react";

interface NavigationItem {
  id: string;
  label: string;
  icon: any;
  badge?: string;
  active?: boolean;
}

export default function MobileNavigation() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // todo: remove mock functionality
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: Home,
      active: activeTab === 'dashboard'
    },
    {
      id: 'company',
      label: 'Entreprise',
      icon: Building2,
      active: activeTab === 'company'
    },
    {
      id: 'simulation',
      label: 'Simulation',
      icon: TrendingUp,
      badge: 'Actif',
      active: activeTab === 'simulation'
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings,
      active: activeTab === 'settings'
    }
  ];

  const handleTabClick = (tabId: string) => {
    console.log(`Navigation to ${tabId} triggered`);
    setActiveTab(tabId);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => console.log('Run simulation triggered')}
          data-testid="button-fab-simulation"
        >
          <Play className="h-6 w-6" />
        </Button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`
                flex flex-col items-center p-2 min-w-0 flex-1 relative
                ${item.active 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
              data-testid={`nav-${item.id}`}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.badge && (
                  <Badge 
                    className="absolute -top-2 -right-2 text-xs px-1 min-w-0 h-4"
                    variant="destructive"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs mt-1 truncate w-full text-center">
                {item.label}
              </span>
              {item.active && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-t"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Spacer for bottom navigation */}
      <div className="h-16"></div>
    </>
  );
}