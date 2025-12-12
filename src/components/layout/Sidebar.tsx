import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Clock,
  LayoutDashboard,
  Users,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['employee', 'manager', 'admin'] },
  { icon: Clock, label: 'Meu Ponto', path: '/ponto', roles: ['employee', 'manager', 'admin'] },
  { icon: Clock, label: 'Ponto Rápido', path: '/ponto-rapido', roles: ['manager', 'admin'] },
  { icon: Users, label: 'Funcionários', path: '/funcionarios', roles: ['manager', 'admin'] },
  { icon: FileBarChart, label: 'Relatórios', path: '/relatorios', roles: ['manager', 'admin'] },
  { icon: Settings, label: 'Configurações', path: '/configuracoes', roles: ['manager', 'admin'] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(user?.role || 'employee')
  );

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 border-r border-border bg-card transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-border px-4">
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary-foreground" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <img src="/img/LOGOSISTEMA.png" alt="SerpPonto Logo" className="w-8 h-8 rounded-lg" />
            <span className="font-display font-semibold text-lg">SerpPonto</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          const linkContent = (
            <NavLink
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.path}>{linkContent}</div>;
        })}
      </nav>

      {/* Collapse Button */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Recolher</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
