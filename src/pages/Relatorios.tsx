import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type OsStatusData = {
  name: string;
  value: number;
  key: string;
};

type TimeControlData = {
  os_numero: string;
  tempo_execucao_real: number;
  tempo_pausa: number;
  tempo_falta_material: number;
  meta_hora: number;
  status: string;
};

type CollaboratorPerformance = {
  nome: string;
  horas_trabalhadas: number;
  meta_hora: number;
  eficiencia: number;
  paradas_material: number;
};

const COLORS = {
  aberta: '#f97316',
  em_andamento: '#3b82f6',
  finalizada: '#22c55e',
  cancelada: '#ef4444',
  pausada: '#a16207',
  falta_material: '#dc2626',
};

const statusLabel = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

export default function Relatorios() {
  const [osStatusData, setOsStatusData] = useState<OsStatusData[]>([]);
  const [timeControlData, setTimeControlData] = useState<TimeControlData[]>([]);
  const [collaboratorData, setCollaboratorData] = useState<CollaboratorPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch OS Status Data
      const { data: osData, error: osError } = await supabase
        .from('ordens_servico')
        .select('status');

      if (osError) throw osError;

      // Fetch Time Control Data
      const { data: timeData, error: timeError } = await supabase
        .from('ordens_servico')
        .select(`
          numero_os,
          tempo_execucao_real,
          tempo_pausa,
          tempo_falta_material,
          meta_hora,
          status
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (timeError) throw timeError;

      // Fetch Collaborator Performance Data
      const { data: collabData, error: collabError } = await supabase
        .from('colaboradores')
        .select(`
          nome,
          horas_trabalhadas,
          meta_hora,
          paradas_material
        `)
        .eq('ativo', true);

      if (collabError) throw collabError;

      // Process OS Status Data
      const counts = osData.reduce((acc, { status }) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const chartData = Object.entries(counts).map(([name, value]) => ({
        name: statusLabel(name),
        value,
        key: name,
      }));
      
      setOsStatusData(chartData);

      // Process Time Control Data
      setTimeControlData(timeData.map(os => ({
        os_numero: os.numero_os,
        tempo_execucao_real: os.tempo_execucao_real || 0,
        tempo_pausa: os.tempo_pausa || 0,
        tempo_falta_material: os.tempo_falta_material || 0,
        meta_hora: os.meta_hora || 0,
        status: os.status,
      })));

      // Process Collaborator Data
      setCollaboratorData(collabData.map(colab => ({
        nome: colab.nome,
        horas_trabalhadas: colab.horas_trabalhadas || 0,
        meta_hora: colab.meta_hora || 0,
        eficiencia: colab.meta_hora ? (colab.horas_trabalhadas / colab.meta_hora) * 100 : 0,
        paradas_material: colab.paradas_material || 0,
      })));

    } catch (error) {
      console.error("Erro ao buscar dados para os relatórios:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Visualize os dados e o desempenho da sua operação.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* OS Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ordens de Serviço por Status</CardTitle>
            <CardDescription>Distribuição de todas as OSs por seu status atual.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={osStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={110}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {osStatusData.map((entry) => (
                    <Cell key={`cell-${entry.key}`} fill={COLORS[entry.key as keyof typeof COLORS] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} OS(s)`, 'Quantidade']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Time Control Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Controle de Tempo - Últimas 10 OSs</CardTitle>
            <CardDescription>Comparação entre tempo total, pausas e paradas por falta de material.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={timeControlData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="os_numero" />
                <YAxis tickFormatter={formatHours} />
                <Tooltip formatter={(value) => formatHours(Number(value))} />
                <Legend />
                <Bar name="Tempo Total" dataKey="tempo_execucao_real" fill={COLORS.em_andamento} />
                <Bar name="Tempo em Pausa" dataKey="tempo_pausa" fill={COLORS.pausada} />
                <Bar name="Falta de Material" dataKey="tempo_falta_material" fill={COLORS.falta_material} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Collaborator Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Desempenho dos Colaboradores</CardTitle>
            <CardDescription>Eficiência e paradas por falta de material por colaborador.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={collaboratorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis yAxisId="left" tickFormatter={(value) => `${value}%`} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" name="Eficiência" dataKey="eficiencia" fill={COLORS.finalizada} />
                <Bar yAxisId="right" name="Paradas por Material" dataKey="paradas_material" fill={COLORS.falta_material} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Time vs Goal Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Análise de Tempo vs Meta</CardTitle>
            <CardDescription>Comparação entre tempo de execução e meta estabelecida.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={timeControlData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="os_numero" />
                <YAxis tickFormatter={formatHours} />
                <Tooltip formatter={(value) => formatHours(Number(value))} />
                <Legend />
                <Bar name="Tempo Real" dataKey="tempo_execucao_real" fill={COLORS.em_andamento} />
                <Bar name="Meta (horas)" dataKey="meta_hora" fill={COLORS.finalizada} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 