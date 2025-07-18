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
import { useAuth } from '@/hooks/useAuth.jsx';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';

const items = [
  { title: 'Dashboard', url: '/', icon: BarChart3 },
  { title: 'Ordens de Serviço', url: '/ordens-servico', icon: ClipboardList },
  { title: 'Clientes', url: '/clientes', icon: Users },
  { title: 'Colaboradores', url: '/colaboradores', icon: UserCheck },
  { title: 'Produtos', url: '/produtos', icon: Package },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
];

const adminItems = [
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
    isActive 
      ? 'bg-sidebar-primary/10 text-sidebar-primary border border-sidebar-primary/20' 
      : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10';

  return (
    <Sidebar
      className={`${collapsed ? 'w-14' : 'w-64'} border-r border-border/60 bg-sidebar backdrop-blur-sm`}
      collapsible="icon"
    >
      <SidebarContent>
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-full">
            <Logo width={collapsed ? 32 : 120} height={collapsed ? 32 : 50} className="object-contain" />
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">Menu Principal</SidebarGroupLabel>
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
          <SidebarGroupLabel className="text-sidebar-foreground/70">Administração</SidebarGroupLabel>
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
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <Button
            onClick={signOut}
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}