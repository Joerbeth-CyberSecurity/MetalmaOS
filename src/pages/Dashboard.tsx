import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ClipboardList,
  Users,
  UserCheck,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalOS: number;
  osAbertas: number;
  osEmAndamento: number;
  osFinalizadas: number;
  totalClientes: number;
  totalColaboradores: number;
  metaHoraMedia: number;
  horasTrabalhadasMes: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalOS: 0,
    osAbertas: 0,
    osEmAndamento: 0,
    osFinalizadas: 0,
    totalClientes: 0,
    totalColaboradores: 0,
    metaHoraMedia: 0,
    horasTrabalhadasMes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Buscar estatísticas das OS
      const { data: ordensServico } = await supabase
        .from('ordens_servico')
        .select('status');

      const { data: clientes } = await supabase
        .from('clientes')
        .select('id')
        .eq('ativo', true);

      const { data: colaboradores } = await supabase
        .from('colaboradores')
        .select('horas_trabalhadas, meta_hora')
        .eq('ativo', true);

      if (ordensServico) {
        const totalOS = ordensServico.length;
        const osAbertas = ordensServico.filter(
          (os) => os.status === 'aberta'
        ).length;
        const osEmAndamento = ordensServico.filter(
          (os) => os.status === 'em_andamento'
        ).length;
        const osFinalizadas = ordensServico.filter(
          (os) => os.status === 'finalizada'
        ).length;

        const horasTrabalhadasMes =
          colaboradores?.reduce(
            (acc, col) => acc + (col.horas_trabalhadas || 0),
            0
          ) || 0;
        const metaHoraMedia = colaboradores?.length
          ? colaboradores.reduce((acc, col) => acc + (col.meta_hora || 0), 0) /
            colaboradores.length
          : 0;

        setStats({
          totalOS,
          osAbertas,
          osEmAndamento,
          osFinalizadas,
          totalClientes: clientes?.length || 0,
          totalColaboradores: colaboradores?.length || 0,
          metaHoraMedia,
          horasTrabalhadasMes,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const progressPercent =
    stats.metaHoraMedia > 0
      ? Math.min(
          (stats.horasTrabalhadasMes /
            (stats.metaHoraMedia * stats.totalColaboradores)) *
            100,
          100
        )
      : 0;

  // Funções de navegação para ações rápidas
  const handleNovaOS = () => navigate('/ordens-servico');
  const handleNovoCliente = () => navigate('/clientes');
  const handleNovoColaborador = () => navigate('/colaboradores');
  const handleRelatorios = () => navigate('/relatorios');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="card-modern animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-1/2 rounded bg-muted"></div>
                <div className="h-4 w-4 rounded bg-muted"></div>
              </CardHeader>
              <CardContent>
                <div className="mb-2 h-8 w-1/3 rounded bg-muted"></div>
                <div className="h-3 w-2/3 rounded bg-muted"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Visão geral do sistema de controle de ordens de serviço
        </p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-modern transition-all duration-200 hover:shadow-medium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de OS</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats.totalOS}
            </div>
            <p className="text-xs text-muted-foreground">
              Ordens de serviço no sistema
            </p>
          </CardContent>
        </Card>

        <Card className="card-modern transition-all duration-200 hover:shadow-medium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">
              {stats.totalClientes}
            </div>
            <p className="text-xs text-muted-foreground">Clientes ativos</p>
          </CardContent>
        </Card>

        <Card className="card-modern transition-all duration-200 hover:shadow-medium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {stats.totalColaboradores}
            </div>
            <p className="text-xs text-muted-foreground">
              Colaboradores ativos
            </p>
          </CardContent>
        </Card>

        <Card className="card-modern transition-all duration-200 hover:shadow-medium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Horas Trabalhadas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {stats.horasTrabalhadasMes.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Horas no mês atual</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-status-aberta" />
              OS Abertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-3xl font-bold text-status-aberta">
              {stats.osAbertas}
            </div>
            <Badge className="status-aberta">Aguardando início</Badge>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-status-em-andamento" />
              OS em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-3xl font-bold text-status-em-andamento">
              {stats.osEmAndamento}
            </div>
            <Badge className="status-em-andamento">Em execução</Badge>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-status-finalizada" />
              OS Finalizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-3xl font-bold text-status-finalizada">
              {stats.osFinalizadas}
            </div>
            <Badge className="status-finalizada">Concluídas</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Meta de Produtividade</CardTitle>
          <CardDescription>
            Progresso das horas trabalhadas em relação à meta estabelecida
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {stats.horasTrabalhadasMes.toFixed(1)}h de{' '}
              {(stats.metaHoraMedia * stats.totalColaboradores).toFixed(1)}h
            </span>
            <span className="text-sm text-muted-foreground">
              {progressPercent.toFixed(1)}%
            </span>
          </div>
          <Progress value={progressPercent} className="w-full" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Meta por colaborador: {stats.metaHoraMedia.toFixed(1)}h</span>
            <span>{stats.totalColaboradores} colaboradores ativos</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="card-modern">
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Funcionalidades principais do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          <div
            onClick={handleNovaOS}
            className="flex cursor-pointer flex-col items-center rounded-lg border p-4 transition-colors hover:bg-secondary/50"
          >
            <ClipboardList className="mb-2 h-8 w-8 text-primary" />
            <span className="text-sm font-medium">Nova OS</span>
          </div>
          <div
            onClick={handleNovoCliente}
            className="flex cursor-pointer flex-col items-center rounded-lg border p-4 transition-colors hover:bg-secondary/50"
          >
            <Users className="mb-2 h-8 w-8 text-info" />
            <span className="text-sm font-medium">Novo Cliente</span>
          </div>
          <div
            onClick={handleNovoColaborador}
            className="flex cursor-pointer flex-col items-center rounded-lg border p-4 transition-colors hover:bg-secondary/50"
          >
            <UserCheck className="mb-2 h-8 w-8 text-success" />
            <span className="text-sm font-medium">Novo Colaborador</span>
          </div>
          <div
            onClick={handleRelatorios}
            className="flex cursor-pointer flex-col items-center rounded-lg border p-4 transition-colors hover:bg-secondary/50"
          >
            <TrendingUp className="mb-2 h-8 w-8 text-warning" />
            <span className="text-sm font-medium">Relatórios</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
