import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/hooks/useAuth.jsx';
import { Button } from '@/components/ui/button';
import { User, Bell } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background to-secondary/10">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 border-b border-border/60 bg-card/50 backdrop-blur-sm flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-muted/30 hover:text-foreground transition-colors" />
              {/* <Logo width={110} height={32} /> */}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  Sistema de Controle de OS
                </span>
                <span className="text-xs text-muted-foreground">
                  Metalma - Gestão Moderna
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="hover:bg-muted/30 hover:text-foreground transition-colors">
                <Bell className="h-4 w-4" />
              </Button>
              <DarkModeToggle />
              <Button variant="ghost" size="sm" className="hover:bg-muted/30 hover:text-foreground transition-colors">
                <User className="h-4 w-4" />
                <span className="ml-2 text-sm">
                  {user?.user_metadata?.nome || user?.email}
                </span>
              </Button>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}