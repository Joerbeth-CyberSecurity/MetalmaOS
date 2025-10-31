import React, { useState, useEffect } from 'react';
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import {
  ClipboardList,
  Users,
  UserCheck,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  DollarSign,
  Target,
  Activity,
  Zap,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDashboardStats, useFinancialMetrics, useMonthlyRevenue, useClientRevenue, useProductRevenue } from '@/hooks/useSupabaseQuery';
import { useCache, CACHE_KEYS, CACHE_TTL } from '@/hooks/useCache';

const formatHoursToTime = (hours: number): string => {
  if (!hours || hours === 0) return '00:00:00';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor((totalMinutes % 60));
  const s = Math.floor(((totalMinutes % 60) - m) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

interface DashboardStats {
  totalOS: number;
  osAbertas: number;
  osEmAndamento: number;
  osFinalizadas: number;
  totalClientes: number;
  totalColaboradores: number;
  metaHoraMedia: number;
  horasTrabalhadasMes: number;
  receitaTotal: number;
  receitaMes: number;
  ticketMedio: number;
  eficienciaMedia: number;
  orcamentosMes: number;
  orcamentosAprovadosMes: number;
  orcamentosTransformadosMes: number;
}

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

interface TimeSeriesData {
  data: string;
  valor: number;
  meta: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AdvancedDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOS: 0,
    osAbertas: 0,
    osEmAndamento: 0,
    osFinalizadas: 0,
    totalClientes: 0,
    totalColaboradores: 0,
    metaHoraMedia: 0,
    horasTrabalhadasMes: 0,
    receitaTotal: 0,
    receitaMes: 0,
    ticketMedio: 0,
    eficienciaMedia: 0,
    orcamentosMes: 0,
    orcamentosAprovadosMes: 0,
    orcamentosTransformadosMes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [productivityData, setProductivityData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Buscar estatísticas básicas
      await Promise.all([
        fetchBasicStats(),
        fetchChartData(),
        fetchTimeSeriesData(),
        fetchProductivityData(),
        fetchRevenueData(),
      ]);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBasicStats = async () => {
    try {
      // Buscar estatísticas das OS
      const { data: ordensServico } = await supabase
        .from('ordens_servico')
        .select('status, valor_total, data_abertura, tempo_execucao_real, tempo_execucao_previsto');

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
        const osAbertas = ordensServico.filter(os => os.status === 'aberta').length;
        const osEmAndamento = ordensServico.filter(os => os.status === 'em_andamento').length;
        const osFinalizadas = ordensServico.filter(os => os.status === 'finalizada').length;

        const horasTrabalhadasMes = colaboradores?.reduce(
          (acc, col) => acc + (col.horas_trabalhadas || 0),
          0
        ) || 0;

        const metaHoraMedia = colaboradores?.length
          ? colaboradores.reduce((acc, col) => acc + (col.meta_hora || 0), 0) / colaboradores.length
          : 0;

        const receitaTotal = ordensServico
          .filter(os => os.valor_total)
          .reduce((acc, os) => acc + (os.valor_total || 0), 0);

        const receitaMes = ordensServico
          .filter(os => {
            const osDate = new Date(os.data_abertura);
            const now = new Date();
            return osDate >= startOfMonth(now) && osDate <= endOfMonth(now);
          })
          .reduce((acc, os) => acc + (os.valor_total || 0), 0);

        const ticketMedio = osFinalizadas > 0 ? receitaTotal / osFinalizadas : 0;

        // Calcular eficiência média
        const osComTempo = ordensServico.filter(
          os => os.tempo_execucao_real && os.tempo_execucao_previsto
        );
        const eficienciaMedia = osComTempo.length > 0
          ? osComTempo.reduce((acc, os) => {
              const eficiencia = (os.tempo_execucao_previsto! / os.tempo_execucao_real!) * 100;
              return acc + Math.min(eficiencia, 100);
            }, 0) / osComTempo.length
          : 0;

        // Estatísticas de orçamentos (mês atual)
        const now = new Date();
        const start = startOfMonth(now).toISOString();
        const end = endOfMonth(now).toISOString();
        const { data: orcamentosMesData } = await supabase
          .from('orcamentos')
          .select('id, status, data_abertura')
          .gte('data_abertura', start)
          .lte('data_abertura', end);
        const orcamentosMes = orcamentosMesData?.length || 0;
        const orcamentosAprovadosMes = (orcamentosMesData || []).filter(o => o.status === 'aprovado').length;
        const orcamentosTransformadosMes = (orcamentosMesData || []).filter(o => o.status === 'transformado').length;

        setStats({
          totalOS,
          osAbertas,
          osEmAndamento,
          osFinalizadas,
          totalClientes: clientes?.length || 0,
          totalColaboradores: colaboradores?.length || 0,
          metaHoraMedia,
          horasTrabalhadasMes,
          receitaTotal,
          receitaMes,
          ticketMedio,
          eficienciaMedia,
          orcamentosMes,
          orcamentosAprovadosMes,
          orcamentosTransformadosMes,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas básicas:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      const { data: ordensServico } = await supabase
        .from('ordens_servico')
        .select('status, data_abertura')
        .gte('data_abertura', subMonths(new Date(), 6).toISOString());

      if (ordensServico) {
        const statusCount = ordensServico.reduce((acc, os) => {
          acc[os.status] = (acc[os.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const chartData = Object.entries(statusCount).map(([status, value]) => ({
          name: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value,
        }));

        setChartData(chartData);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do gráfico:', error);
    }
  };

  const fetchTimeSeriesData = async () => {
    try {
      const { data: ordensServico } = await supabase
        .from('ordens_servico')
        .select('data_abertura, valor_total')
        .gte('data_abertura', subMonths(new Date(), 6).toISOString())
        .order('data_abertura');

      if (ordensServico) {
        // Agrupar por mês
        const monthlyData = ordensServico.reduce((acc, os) => {
          const month = format(new Date(os.data_abertura), 'MMM/yyyy', { locale: ptBR });
          if (!acc[month]) {
            acc[month] = { valor: 0, count: 0 };
          }
          acc[month].valor += os.valor_total || 0;
          acc[month].count += 1;
          return acc;
        }, {} as Record<string, { valor: number; count: number }>);

        const timeSeriesData = Object.entries(monthlyData).map(([month, data]) => ({
          data: month,
          valor: data.valor,
          meta: data.valor * 1.2, // Meta 20% maior
        }));

        setTimeSeriesData(timeSeriesData);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de série temporal:', error);
    }
  };

  const fetchProductivityData = async () => {
    try {
      const { data: colaboradores } = await supabase
        .from('colaboradores')
        .select('nome, horas_trabalhadas, meta_hora')
        .eq('ativo', true);

      if (colaboradores) {
        const productivityData = colaboradores.map(col => ({
          nome: col.nome,
          horas: col.horas_trabalhadas || 0,
          meta: col.meta_hora || 0,
          eficiencia: col.meta_hora > 0 ? Math.min(100, ((col.horas_trabalhadas || 0) / col.meta_hora) * 100) : 0,
        }));

        setProductivityData(productivityData);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de produtividade:', error);
    }
  };

  const fetchRevenueData = async () => {
    try {
      const { data: ordensServico } = await supabase
        .from('ordens_servico')
        .select('data_abertura, valor_total, status')
        .gte('data_abertura', subMonths(new Date(), 12).toISOString())
        .order('data_abertura');

      if (ordensServico) {
        // Agrupar por mês
        const monthlyRevenue = ordensServico.reduce((acc, os) => {
          const month = format(new Date(os.data_abertura), 'MMM/yyyy', { locale: ptBR });
          if (!acc[month]) {
            acc[month] = { receita: 0, os: 0 };
          }
          acc[month].receita += os.valor_total || 0;
          acc[month].os += 1;
          return acc;
        }, {} as Record<string, { receita: number; os: number }>);

        const revenueData = Object.entries(monthlyRevenue).map(([month, data]) => ({
          mes: month,
          receita: data.receita,
          os: data.os,
        }));

        setRevenueData(revenueData);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de receita:', error);
    }
  };

  const progressPercent = stats.metaHoraMedia > 0
    ? Math.min((stats.horasTrabalhadasMes / (stats.metaHoraMedia * stats.totalColaboradores)) * 100, 100)
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard Avançado</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Visão geral completa do sistema com métricas e análises
        </p>
      </div>

      {/* Cards Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-modern">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(stats.receitaTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita acumulada
            </p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(stats.receitaMes)}
            </div>
            <p className="text-xs text-muted-foreground">
              Este mês
            </p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(stats.ticketMedio)}
            </div>
            <p className="text-xs text-muted-foreground">
              Por OS finalizada
            </p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiência Média</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {stats.eficienciaMedia.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Tempo real vs previsto
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orçamentos - Visão do Mês */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-modern">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orçamentos no mês</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.orcamentosMes}</div>
            <p className="text-xs text-muted-foreground">Criados neste mês</p>
          </CardContent>
        </Card>
        <Card className="card-modern">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.orcamentosAprovadosMes}</div>
            <p className="text-xs text-muted-foreground">no mês atual</p>
          </CardContent>
        </Card>
        <Card className="card-modern">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transformados em OS</CardTitle>
            <TrendingUp className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{stats.orcamentosTransformadosMes}</div>
            <p className="text-xs text-muted-foreground">no mês atual</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de Status das OS */}
        <Card>
          <CardHeader>
            <CardTitle>Status das Ordens de Serviço</CardTitle>
            <CardDescription>
              Distribuição por status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Receita ao Longo do Tempo */}
        <Card>
          <CardHeader>
            <CardTitle>Receita Mensal</CardTitle>
            <CardDescription>
              Evolução da receita nos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [
                    new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(value),
                    'Receita'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Produtividade dos Colaboradores */}
      <Card>
        <CardHeader>
          <CardTitle>Produtividade dos Colaboradores</CardTitle>
          <CardDescription>
            Horas trabalhadas vs meta por colaborador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="horas" fill="#8884d8" name="Horas Trabalhadas" />
              <Bar dataKey="meta" fill="#82ca9d" name="Meta" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cards de Status das OS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              Eficiência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-3xl font-bold text-warning">
              {stats.eficienciaMedia.toFixed(1)}%
            </div>
            <Badge variant="outline">Média geral</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Progresso da Meta */}
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
              {formatHoursToTime(stats.horasTrabalhadasMes)} de{' '}
              {formatHoursToTime(stats.metaHoraMedia * stats.totalColaboradores)}
            </span>
            <span className="text-sm text-muted-foreground">
              {progressPercent.toFixed(1)}%
            </span>
          </div>
          <Progress value={progressPercent} className="w-full" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Meta por colaborador: {formatHoursToTime(stats.metaHoraMedia)}</span>
            <span>{stats.totalColaboradores} colaboradores ativos</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
