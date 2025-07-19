import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import { Toaster } from './components/ui/toaster';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from './components/ThemeProvider'; 

// Importações de páginas
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import OrdensServico from './pages/OrdensServico';
import Clientes from './pages/Clientes';
import Produtos from './pages/Produtos';
import Colaboradores from './pages/Colaboradores';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';
import NotFound from './pages/NotFound';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider>
        <Toaster />
        <Router>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/ordens-servico" element={<OrdensServico />} />
                      <Route path="/clientes" element={<Clientes />} />
                      <Route path="/produtos" element={<Produtos />} />
                      <Route path="/colaboradores" element={<Colaboradores />} />
                      <Route path="/relatorios" element={<Relatorios />} />
                      <Route path="/configuracoes" element={<Configuracoes />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }/>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
