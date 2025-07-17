import { NavLink, useLocation } from 'react-router-dom';
import { 
  Building2, 
  ClipboardList, 
  Users, 
  Package, 
  UserCheck, 
  BarChart3, 
  Settings,
  LogOut
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
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';

const items = [
  { title: 'Dashboard', url: '/', icon: BarChart3 },
  { title: 'Ordens de Serviço', url: '/ordens-servico', icon: ClipboardList },
  { title: 'Clientes', url: '/clientes', icon: Users },
  { title: 'Colaboradores', url: '/colaboradores', icon: UserCheck },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
];

const adminItems = [
  { title: 'Produtos', url: '/produtos', icon: Package },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut } = useAuth();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-secondary/50';

  return (
    <Sidebar
      className={`${collapsed ? 'w-14' : 'w-64'} border-r border-border/60 bg-card/50 backdrop-blur-sm`}
      collapsible="icon"
    >
      <SidebarContent>
        {/* Header */}
        <div className="p-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center bg-transparent">
              <Logo width={collapsed ? 32 : 64} height={collapsed ? 32 : 40} />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-semibold text-foreground">Metalma</h2>
                <p className="text-xs text-muted-foreground">Sistema OS</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
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

        {/* Admin Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
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

        {/* Logout Button */}
        <div className="mt-auto p-4 border-t border-border/60">
          <Button
            onClick={signOut}
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}