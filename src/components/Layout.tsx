import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/hooks/useAuth.jsx';
import { Button } from '@/components/ui/button';
import { User, Bell } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import { MobileNavigation } from '@/components/MobileNavigation';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, userProfile, refreshUserProfile } = useAuth();

  const handleRefreshProfile = async () => {
    await refreshUserProfile();
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background to-secondary/10">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          {/* Header */}
          <header className="flex h-14 items-center justify-between border-b border-border/60 bg-card/50 px-2 sm:px-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 sm:gap-4">
              <SidebarTrigger className="transition-colors hover:bg-muted/30 hover:text-foreground" />
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-medium text-foreground">
                  Sistema de Controle de OS
                </span>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  Metalma - Gestão Moderna
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex transition-colors hover:bg-muted/30 hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
              </Button>
              <DarkModeToggle />
              <Button
                variant="ghost"
                size="sm"
                className="transition-colors hover:bg-muted/30 hover:text-foreground"
                onClick={handleRefreshProfile}
                title="Atualizar perfil"
              >
                <User className="h-4 w-4" />
                <span className="ml-1 sm:ml-2 text-xs sm:text-sm hidden sm:inline">
                  {userProfile?.nome || user?.email || 'Usuário'}
                </span>
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-2 sm:p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <MobileNavigation />
    </SidebarProvider>
  );
}
