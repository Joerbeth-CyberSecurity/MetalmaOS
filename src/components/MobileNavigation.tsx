import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  ClipboardList,
  Users,
  UserCheck,
  Package,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';

const mobileItems = [
  { title: 'Dashboard', url: '/', icon: BarChart3, permission: null },
  {
    title: 'OS',
    url: '/ordens-servico',
    icon: ClipboardList,
    permission: 'os_visualizar',
  },
  {
    title: 'Clientes',
    url: '/clientes',
    icon: Users,
    permission: 'clientes_visualizar',
  },
  {
    title: 'Colaboradores',
    url: '/colaboradores',
    icon: UserCheck,
    permission: 'colaboradores_visualizar',
  },
  {
    title: 'Produtos',
    url: '/produtos',
    icon: Package,
    permission: 'produtos_visualizar',
  },
  {
    title: 'Relatórios',
    url: '/relatorios',
    icon: BarChart3,
    permission: 'relatorios_visualizar',
  },
];

export function MobileNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const filteredItems = mobileItems.filter(
    (item) => item.permission === null || hasPermission(item.permission)
  );

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border lg:hidden">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-2">
        {filteredItems.slice(0, 6).map((item) => (
          <Button
            key={item.title}
            variant={isActive(item.url) ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-2 px-1"
            onClick={() => navigate(item.url)}
          >
            <item.icon className="h-4 w-4" />
            <span className="text-xs font-medium">{item.title}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
