import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Building2,
  ClipboardList,
  Users,
  Package,
  UserCheck,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth.jsx';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';

const items = [
  { title: 'Dashboard', url: '/', icon: BarChart3, permission: null }, // Sempre visível
  {
    title: 'Ordens de Serviço',
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

const adminItems = [
  {
    title: 'Configurações',
    url: '/configuracoes',
    icon: Settings,
    permission: 'configuracoes_visualizar',
  },
  {
    title: 'Ajuda',
    url: 'https://joerbeth-cybersecurity.github.io/ajudaMetalmaOS/', // Link correto do GitHub Pages
    icon: BarChart3, // Pode trocar por um ícone mais apropriado
    permission: 'configuracoes_visualizar',
    external: true, // Garante que abra em nova aba
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut, hasPermission } = useAuth();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'bg-sidebar-primary/10 text-sidebar-primary border border-sidebar-primary/20'
      : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10';

  // Filtrar itens baseado nas permissões
  const filteredItems = items.filter(
    (item) => item.permission === null || hasPermission(item.permission)
  );

  const filteredAdminItems = adminItems.filter((item) =>
    hasPermission(item.permission)
  );

  // --- Sessão do usuário ---
  const [logonTime, setLogonTime] = useState(() => {
    const stored = sessionStorage.getItem('logonTime');
    if (stored) return new Date(stored);
    const now = new Date();
    sessionStorage.setItem('logonTime', now.toISOString());
    return now;
  });
  const [now, setNow] = useState(new Date());
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
      const diff = Math.floor((Date.now() - logonTime.getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(`${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [logonTime]);

  return (
    <Sidebar
      className={`${collapsed ? 'w-14' : 'w-64'} border-r border-border/60 bg-sidebar backdrop-blur-sm`}
      collapsible="icon"
    >
      <SidebarContent>
        {/* Header */}
        <div className="border-b border-sidebar-border p-4">
          <div className="flex w-full items-center justify-center">
            <Logo
              width={collapsed ? 32 : 120}
              height={collapsed ? 32 : 50}
              className="object-contain"
            />
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Navigation - Só mostra se tiver itens */}
        {filteredAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      {item.external ? (
                        <NavLink
                          to={item.url}
                          end
                          className={getNavCls}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      ) : (
                        <NavLink to={item.url} end className={getNavCls}>
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Logout Button */}
        <div className="mt-auto border-t border-sidebar-border p-4">
          {/* Sessão do usuário */}
          <div className="mb-3">
            <div className="flex flex-col gap-1 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Logon:</span>{' '}
                {logonTime.toLocaleTimeString()}
              </div>
              <div>
                <span className="font-medium">Tempo conectado:</span> {elapsed}
              </div>
              <div>
                <span className="font-medium">Agora:</span>{' '}
                {now.toLocaleString()}
              </div>
            </div>
          </div>

          <Button
            onClick={signOut}
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
