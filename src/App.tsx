import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Clientes from "./pages/Clientes";
import Colaboradores from "./pages/Colaboradores";
import Produtos from "./pages/Produtos";
import OrdensServico from "./pages/OrdensServico";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Dashboard from "./pages/Dashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />

          {/* Rotas Protegidas com Layout */}
          <Route path="/" element={<Index />}>
            <Route index element={<Dashboard />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="colaboradores" element={<Colaboradores />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="ordens-servico" element={<OrdensServico />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>

          {/* Rota Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
