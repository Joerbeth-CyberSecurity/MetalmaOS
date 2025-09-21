import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
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
  ComposedChart,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialMetrics {
  receitaTotal: number;
  receitaMes: number;
  receitaAnterior: number;
  crescimentoReceita: number;
  ticketMedio: number;
  ticketMedioAnterior: number;
  crescimentoTicket: number;
  margemLucro: number;
  margemLucroAnterior: number;
  crescimentoMargem: number;
  osFinalizadas: number;
  osFinalizadasAnterior: number;
  crescimentoOS: number;
  eficienciaMedia: number;
  eficienciaAnterior: number;
  crescimentoEficiencia: number;
}

interface MonthlyRevenue {
  mes: string;
  receita: number;
  custos: number;
  lucro: number;
  os: number;
  ticketMedio: number;
  margemLucro: number;
}

interface ClientRevenue {
  cliente: string;
  receita: number;
  os: number;
  ticketMedio: number;
  ultimaOS: string;
}

interface ProductRevenue {
  produto: string;
  receita: number;
  quantidade: number;
  precoMedio: number;
  margemLucro: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function RelatoriosFinanceiros() {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    receitaTotal: 0,
    receitaMes: 0,
    receitaAnterior: 0,
    crescimentoReceita: 0,
    ticketMedio: 0,
    ticketMedioAnterior: 0,
    crescimentoTicket: 0,
    margemLucro: 0,
    margemLucroAnterior: 0,
    crescimentoMargem: 0,
    osFinalizadas: 0,
    osFinalizadasAnterior: 0,
    crescimentoOS: 0,
    eficienciaMedia: 0,
    eficienciaAnterior: 0,
    crescimentoEficiencia: 0,
  });

  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [clientRevenue, setClientRevenue] = useState<ClientRevenue[]>([]);
  const [productRevenue, setProductRevenue] = useState<ProductRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    inicio: format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd'),
    fim: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    fetchFinancialData();
  }, [dateRange]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchFinancialMetrics(),
        fetchMonthlyRevenue(),
        fetchClientRevenue(),
        fetchProductRevenue(),
      ]);
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialMetrics = async () => {
    try {
      const { data: ordensServico } = await supabase
        .from('ordens_servico')
        .select('*')
        .gte('data_abertura', dateRange.inicio)
        .lte('data_abertura', dateRange.fim);

      if (ordensServico) {
        const currentMonth = startOfMonth(new Date());
        const previousMonth = startOfMonth(subMonths(new Date(), 1));

        const currentMonthOS = ordensServico.filter(os => {
          const osDate = new Date(os.data_abertura);
          return osDate >= currentMonth && osDate <= endOfMonth(currentMonth);
        });

        const previousMonthOS = ordensServico.filter(os => {
          const osDate = new Date(os.data_abertura);
          return osDate >= previousMonth && osDate <= endOfMonth(previousMonth);
        });

        const receitaTotal = ordensServico
          .filter(os => os.valor_total)
          .reduce((acc, os) => acc + (os.valor_total || 0), 0);

        const receitaMes = currentMonthOS
          .filter(os => os.valor_total)
          .reduce((acc, os) => acc + (os.valor_total || 0), 0);

        const receitaAnterior = previousMonthOS
          .filter(os => os.valor_total)
          .reduce((acc, os) => acc + (os.valor_total || 0), 0);

        const osFinalizadas = ordensServico.filter(os => os.status === 'finalizada').length;
        const osFinalizadasAnterior = previousMonthOS.filter(os => os.status === 'finalizada').length;

        const ticketMedio = osFinalizadas > 0 ? receitaTotal / osFinalizadas : 0;
        const ticketMedioAnterior = osFinalizadasAnterior > 0 ? receitaAnterior / osFinalizadasAnterior : 0;

        // Calcular margem de lucro (assumindo 30% de custos)
        const custosTotal = receitaTotal * 0.3;
        const margemLucro = receitaTotal > 0 ? ((receitaTotal - custosTotal) / receitaTotal) * 100 : 0;
        const custosAnterior = receitaAnterior * 0.3;
        const margemLucroAnterior = receitaAnterior > 0 ? ((receitaAnterior - custosAnterior) / receitaAnterior) * 100 : 0;

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

        const osComTempoAnterior = previousMonthOS.filter(
          os => os.tempo_execucao_real && os.tempo_execucao_previsto
        );
        const eficienciaAnterior = osComTempoAnterior.length > 0
          ? osComTempoAnterior.reduce((acc, os) => {
              const eficiencia = (os.tempo_execucao_previsto! / os.tempo_execucao_real!) * 100;
              return acc + Math.min(eficiencia, 100);
            }, 0) / osComTempoAnterior.length
          : 0;

        setMetrics({
          receitaTotal,
          receitaMes,
          receitaAnterior,
          crescimentoReceita: receitaAnterior > 0 ? ((receitaMes - receitaAnterior) / receitaAnterior) * 100 : 0,
          ticketMedio,
          ticketMedioAnterior,
          crescimentoTicket: ticketMedioAnterior > 0 ? ((ticketMedio - ticketMedioAnterior) / ticketMedioAnterior) * 100 : 0,
          margemLucro,
          margemLucroAnterior,
          crescimentoMargem: margemLucroAnterior > 0 ? ((margemLucro - margemLucroAnterior) / margemLucroAnterior) * 100 : 0,
          osFinalizadas,
          osFinalizadasAnterior,
          crescimentoOS: osFinalizadasAnterior > 0 ? ((osFinalizadas - osFinalizadasAnterior) / osFinalizadasAnterior) * 100 : 0,
          eficienciaMedia,
          eficienciaAnterior,
          crescimentoEficiencia: eficienciaAnterior > 0 ? ((eficienciaMedia - eficienciaAnterior) / eficienciaAnterior) * 100 : 0,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar métricas financeiras:', error);
    }
  };

  const fetchMonthlyRevenue = async () => {
    try {
      const { data: ordensServico } = await supabase
        .from('ordens_servico')
        .select('*')
        .gte('data_abertura', dateRange.inicio)
        .lte('data_abertura', dateRange.fim)
        .order('data_abertura');

      if (ordensServico) {
        // Agrupar por mês
        const monthlyData = ordensServico.reduce((acc, os) => {
          const month = format(new Date(os.data_abertura), 'MMM/yyyy', { locale: ptBR });
          if (!acc[month]) {
            acc[month] = { receita: 0, os: 0 };
          }
          acc[month].receita += os.valor_total || 0;
          acc[month].os += 1;
          return acc;
        }, {} as Record<string, { receita: number; os: number }>);

        const monthlyRevenueData = Object.entries(monthlyData).map(([mes, data]) => {
          const custos = data.receita * 0.3;
          const lucro = data.receita - custos;
          const ticketMedio = data.os > 0 ? data.receita / data.os : 0;
          const margemLucro = data.receita > 0 ? (lucro / data.receita) * 100 : 0;

          return {
            mes,
            receita: data.receita,
            custos,
            lucro,
            os: data.os,
            ticketMedio,
            margemLucro,
          };
        });

        setMonthlyRevenue(monthlyRevenueData);
      }
    } catch (error) {
      console.error('Erro ao buscar receita mensal:', error);
    }
  };

  const fetchClientRevenue = async () => {
    try {
      const { data: ordensServico } = await supabase
        .from('ordens_servico')
        .select(`
          valor_total,
          data_abertura,
          clientes (nome)
        `)
        .gte('data_abertura', dateRange.inicio)
        .lte('data_abertura', dateRange.fim)
        .eq('status', 'finalizada');

      if (ordensServico) {
        // Agrupar por cliente
        const clientData = ordensServico.reduce((acc, os) => {
          const cliente = os.clientes?.nome || 'Cliente não identificado';
          if (!acc[cliente]) {
            acc[cliente] = { receita: 0, os: 0, ultimaOS: os.data_abertura };
          }
          acc[cliente].receita += os.valor_total || 0;
          acc[cliente].os += 1;
          if (new Date(os.data_abertura) > new Date(acc[cliente].ultimaOS)) {
            acc[cliente].ultimaOS = os.data_abertura;
          }
          return acc;
        }, {} as Record<string, { receita: number; os: number; ultimaOS: string }>);

        const clientRevenueData = Object.entries(clientData).map(([cliente, data]) => ({
          cliente,
          receita: data.receita,
          os: data.os,
          ticketMedio: data.os > 0 ? data.receita / data.os : 0,
          ultimaOS: format(new Date(data.ultimaOS), 'dd/MM/yyyy', { locale: ptBR }),
        })).sort((a, b) => b.receita - a.receita);

        setClientRevenue(clientRevenueData);
      }
    } catch (error) {
      console.error('Erro ao buscar receita por cliente:', error);
    }
  };

  const fetchProductRevenue = async () => {
    try {
      const { data: osProdutos } = await supabase
        .from('os_produtos')
        .select(`
          quantidade,
          preco_unitario,
          produtos (nome),
          ordens_servico!inner (
            data_abertura,
            status
          )
        `)
        .gte('ordens_servico.data_abertura', dateRange.inicio)
        .lte('ordens_servico.data_abertura', dateRange.fim)
        .eq('ordens_servico.status', 'finalizada');

      if (osProdutos) {
        // Agrupar por produto
        const productData = osProdutos.reduce((acc, item) => {
          const produto = item.produtos?.nome || 'Produto não identificado';
          if (!acc[produto]) {
            acc[produto] = { receita: 0, quantidade: 0, precoTotal: 0 };
          }
          const receita = (item.quantidade || 0) * (item.preco_unitario || 0);
          acc[produto].receita += receita;
          acc[produto].quantidade += item.quantidade || 0;
          acc[produto].precoTotal += item.preco_unitario || 0;
          return acc;
        }, {} as Record<string, { receita: number; quantidade: number; precoTotal: number }>);

        const productRevenueData = Object.entries(productData).map(([produto, data]) => {
          const precoMedio = data.quantidade > 0 ? data.precoTotal / data.quantidade : 0;
          const custoMedio = precoMedio * 0.7; // Assumindo 30% de margem
          const margemLucro = precoMedio > 0 ? ((precoMedio - custoMedio) / precoMedio) * 100 : 0;

          return {
            produto,
            receita: data.receita,
            quantidade: data.quantidade,
            precoMedio,
            margemLucro,
          };
        }).sort((a, b) => b.receita - a.receita);

        setProductRevenue(productRevenueData);
      }
    } catch (error) {
      console.error('Erro ao buscar receita por produto:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getGrowthColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4" />;
    if (value < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

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
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Relatórios Financeiros</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Análise completa da performance financeira do sistema
        </p>
      </div>

      {/* Filtros de Data */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="data-inicio">Data Início</Label>
              <Input
                id="data-inicio"
                type="date"
                value={dateRange.inicio}
                onChange={(e) => setDateRange(prev => ({ ...prev, inicio: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="data-fim">Data Fim</Label>
              <Input
                id="data-fim"
                type="date"
                value={dateRange.fim}
                onChange={(e) => setDateRange(prev => ({ ...prev, fim: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchFinancialData} className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.receitaTotal)}</div>
            <div className={`flex items-center text-xs ${getGrowthColor(metrics.crescimentoReceita)}`}>
              {getGrowthIcon(metrics.crescimentoReceita)}
              <span className="ml-1">{formatPercentage(metrics.crescimentoReceita)} vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.ticketMedio)}</div>
            <div className={`flex items-center text-xs ${getGrowthColor(metrics.crescimentoTicket)}`}>
              {getGrowthIcon(metrics.crescimentoTicket)}
              <span className="ml-1">{formatPercentage(metrics.crescimentoTicket)} vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem de Lucro</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.margemLucro.toFixed(1)}%</div>
            <div className={`flex items-center text-xs ${getGrowthColor(metrics.crescimentoMargem)}`}>
              {getGrowthIcon(metrics.crescimentoMargem)}
              <span className="ml-1">{formatPercentage(metrics.crescimentoMargem)} vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiência</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.eficienciaMedia.toFixed(1)}%</div>
            <div className={`flex items-center text-xs ${getGrowthColor(metrics.crescimentoEficiencia)}`}>
              {getGrowthIcon(metrics.crescimentoEficiencia)}
              <span className="ml-1">{formatPercentage(metrics.crescimentoEficiencia)} vs mês anterior</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Receita
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="efficiency" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Eficiência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Receita Mensal</CardTitle>
                <CardDescription>Evolução da receita ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Receita']} />
                    <Area
                      type="monotone"
                      dataKey="receita"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receita vs Custos</CardTitle>
                <CardDescription>Comparação entre receita e custos mensais</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Valor']} />
                    <Bar dataKey="receita" fill="#8884d8" name="Receita" />
                    <Bar dataKey="custos" fill="#ff7300" name="Custos" />
                    <Line dataKey="lucro" stroke="#00c49f" name="Lucro" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Margem de Lucro Mensal</CardTitle>
              <CardDescription>Evolução da margem de lucro ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Margem']} />
                  <Line
                    type="monotone"
                    dataKey="margemLucro"
                    stroke="#00c49f"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Clientes por Receita</CardTitle>
              <CardDescription>Clientes que mais geraram receita no período</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={clientRevenue.slice(0, 10)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="cliente" type="category" width={100} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Receita']} />
                  <Bar dataKey="receita" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes dos Clientes</CardTitle>
              <CardDescription>Informações detalhadas sobre cada cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-left">Receita</th>
                      <th className="px-3 py-2 text-left">OS</th>
                      <th className="px-3 py-2 text-left">Ticket Médio</th>
                      <th className="px-3 py-2 text-left">Última OS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientRevenue.map((client, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-3 py-2 font-medium">{client.cliente}</td>
                        <td className="px-3 py-2">{formatCurrency(client.receita)}</td>
                        <td className="px-3 py-2">{client.os}</td>
                        <td className="px-3 py-2">{formatCurrency(client.ticketMedio)}</td>
                        <td className="px-3 py-2">{client.ultimaOS}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Receita por Produto</CardTitle>
                <CardDescription>Distribuição da receita entre produtos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={productRevenue.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ produto, percent }) => `${produto} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="receita"
                    >
                      {productRevenue.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Receita']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top 10 Produtos por Receita</CardTitle>
                <CardDescription>Produtos que mais geraram receita</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productRevenue.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="produto" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Receita']} />
                    <Bar dataKey="receita" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes dos Produtos</CardTitle>
              <CardDescription>Informações detalhadas sobre cada produto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-3 py-2 text-left">Produto</th>
                      <th className="px-3 py-2 text-left">Receita</th>
                      <th className="px-3 py-2 text-left">Quantidade</th>
                      <th className="px-3 py-2 text-left">Preço Médio</th>
                      <th className="px-3 py-2 text-left">Margem de Lucro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productRevenue.map((product, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-3 py-2 font-medium">{product.produto}</td>
                        <td className="px-3 py-2">{formatCurrency(product.receita)}</td>
                        <td className="px-3 py-2">{product.quantidade}</td>
                        <td className="px-3 py-2">{formatCurrency(product.precoMedio)}</td>
                        <td className="px-3 py-2">{product.margemLucro.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Eficiência</CardTitle>
              <CardDescription>Métricas de performance e produtividade</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{metrics.eficienciaMedia.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Eficiência Média</div>
                  <div className={`text-xs ${getGrowthColor(metrics.crescimentoEficiencia)}`}>
                    {formatPercentage(metrics.crescimentoEficiencia)} vs mês anterior
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-success">{metrics.osFinalizadas}</div>
                  <div className="text-sm text-muted-foreground">OS Finalizadas</div>
                  <div className={`text-xs ${getGrowthColor(metrics.crescimentoOS)}`}>
                    {formatPercentage(metrics.crescimentoOS)} vs mês anterior
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-warning">{formatCurrency(metrics.ticketMedio)}</div>
                  <div className="text-sm text-muted-foreground">Ticket Médio</div>
                  <div className={`text-xs ${getGrowthColor(metrics.crescimentoTicket)}`}>
                    {formatPercentage(metrics.crescimentoTicket)} vs mês anterior
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
