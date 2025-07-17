import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React from 'react';
import { ReportTemplate } from '@/components/ui/ReportTemplate';

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

// Adicionar tipos para detalhamento

type CollaboratorDetail = {
  os_numero: string;
  horas_trabalho: number;
  paradas_material: number;
  data_inicio: string;
  data_fim: string | null;
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
  const [period, setPeriod] = useState<'mes' | 'semana' | 'personalizado'>('mes');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [selectedColab, setSelectedColab] = useState<string | null>(null);
  const [colabDetail, setColabDetail] = useState<CollaboratorDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Função para obter o range de datas do filtro
  const getDateRange = () => {
    const now = new Date();
    if (period === 'mes') {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    } else if (period === 'semana') {
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    } else if (period === 'personalizado' && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    return { start: startOfMonth(now), end: endOfMonth(now) };
  };

  useEffect(() => {
    fetchReportData();
  }, [period, customStart, customEnd]);

  // Função principal de busca/refino dos dados
  const fetchReportData = async () => {
    setLoading(true);
    try {
      // 1. Buscar status das OS (sem filtro de período)
      const { data: osData, error: osError } = await supabase
        .from('ordens_servico')
        .select('status');
      if (osError) throw osError;
      // Process OS Status Data
      const counts = (osData as { status: string }[]).reduce((acc, { status }) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const chartData: OsStatusData[] = Object.entries(counts).map(([name, value]) => ({
        name: statusLabel(name),
        value: Number(value),
        key: name,
      }));
      setOsStatusData(chartData);

      // 2. Buscar dados de tempo das OS (últimas 10, filtrando por período)
      const { start, end } = getDateRange();
      const { data: timeData, error: timeError } = await supabase
        .from('ordens_servico')
        .select(`numero_os, tempo_execucao_real, tempo_pausa, tempo_falta_material, meta_hora, status, created_at`)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      if (timeError) throw timeError;
      setTimeControlData((timeData as any[]).map(os => ({
        os_numero: os.numero_os,
        tempo_execucao_real: os.tempo_execucao_real || 0,
        tempo_pausa: os.tempo_pausa || 0,
        tempo_falta_material: os.tempo_falta_material || 0,
        meta_hora: os.meta_hora || 0,
        status: os.status,
      })));

      // 3. Buscar colaboradores ativos e suas metas
      const { data: colaboradores, error: colabError } = await supabase
        .from('colaboradores')
        .select('id, nome, meta_hora')
        .eq('ativo', true);
      if (colabError) throw colabError;

      // 4. Buscar horas e paradas por colaborador na os_tempo (filtro de período)
      const { data: tempos, error: tempoError } = await supabase
        .from('os_tempo')
        .select('colaborador_id, tipo, horas_calculadas, os_id, data_inicio, data_fim')
        .gte('data_inicio', start.toISOString())
        .lte('data_inicio', end.toISOString());
      if (tempoError) throw tempoError;

      // 5. Processar dados de produtividade por colaborador
      const colabMap: Record<string, CollaboratorPerformance> = (colaboradores as any[]).reduce((acc, colab) => {
        acc[colab.id] = {
          nome: colab.nome,
          meta_hora: colab.meta_hora || 0,
          horas_trabalhadas: 0,
          eficiencia: 0,
          paradas_material: 0,
        };
        return acc;
      }, {} as Record<string, CollaboratorPerformance>);

      (tempos as any[]).forEach(t => {
        if (!colabMap[t.colaborador_id]) return;
        if (t.tipo === 'trabalho') {
          colabMap[t.colaborador_id].horas_trabalhadas += t.horas_calculadas || 0;
        }
        if (t.tipo === 'parada_material') {
          colabMap[t.colaborador_id].paradas_material += 1;
        }
      });

      const colabPerf: CollaboratorPerformance[] = Object.values(colabMap).map(c => ({
        nome: c.nome,
        horas_trabalhadas: c.horas_trabalhadas,
        meta_hora: c.meta_hora,
        eficiencia: c.meta_hora ? Math.min(100, (c.horas_trabalhadas / c.meta_hora) * 100) : 0,
        paradas_material: c.paradas_material,
      }));
      setCollaboratorData(colabPerf);
    } catch (error) {
      console.error('Erro ao buscar dados para os relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para detalhar colaborador
  const fetchColabDetail = async (nome: string) => {
    setDetailLoading(true);
    setSelectedColab(nome);
    try {
      const { start, end } = getDateRange();
      // Buscar colaborador pelo nome
      const { data: colab } = await supabase.from('colaboradores').select('id').eq('nome', nome).single();
      if (!colab) throw new Error('Colaborador não encontrado');
      // Buscar tempos desse colaborador no período
      const { data: tempos } = await supabase
        .from('os_tempo')
        .select('os_id, tipo, horas_calculadas, data_inicio, data_fim')
        .eq('colaborador_id', colab.id)
        .gte('data_inicio', start.toISOString())
        .lte('data_inicio', end.toISOString());
      // Buscar OSs para mapear numero_os
      const osIds = [...new Set(tempos.map(t => t.os_id))];
      const { data: osList } = await supabase
        .from('ordens_servico')
        .select('id, numero_os')
        .in('id', osIds);
      const osMap = osList.reduce((acc, os) => { acc[os.id] = os.numero_os; return acc; }, {} as Record<string, string>);
      // Montar detalhamento
      const detail: Record<string, CollaboratorDetail> = {};
      tempos.forEach(t => {
        const os_numero = osMap[t.os_id] || 'N/A';
        if (!detail[os_numero]) {
          detail[os_numero] = {
            os_numero,
            horas_trabalho: 0,
            paradas_material: 0,
            data_inicio: t.data_inicio,
            data_fim: t.data_fim,
          };
        }
        if (t.tipo === 'trabalho') detail[os_numero].horas_trabalho += t.horas_calculadas || 0;
        if (t.tipo === 'parada_material') detail[os_numero].paradas_material += 1;
      });
      setColabDetail(Object.values(detail));
    } catch (e) {
      setColabDetail([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatHours = (hours: number) => `${hours.toFixed(1)}h`;

  // UI de filtro de período
  const PeriodFilter = () => (
    <div className="flex gap-2 items-center mb-4">
      <label>Período:</label>
      <select value={period} onChange={e => setPeriod(e.target.value as any)} className="border rounded px-2 py-1">
        <option value="mes">Mês atual</option>
        <option value="semana">Semana atual</option>
        <option value="personalizado">Personalizado</option>
      </select>
      {period === 'personalizado' && (
        <>
          <input type="date" value={customStart ? format(customStart, 'yyyy-MM-dd') : ''} onChange={e => setCustomStart(e.target.value ? new Date(e.target.value) : null)} className="border rounded px-2 py-1" />
          <span>a</span>
          <input type="date" value={customEnd ? format(customEnd, 'yyyy-MM-dd') : ''} onChange={e => setCustomEnd(e.target.value ? new Date(e.target.value) : null)} className="border rounded px-2 py-1" />
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ReportTemplate>
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded bg-primary text-white font-semibold shadow-soft hover:bg-primary/80 transition"
        >
          Imprimir / Exportar PDF
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Visualize os dados e o desempenho da sua operação.
          </p>
        </div>
      </div>
      <PeriodFilter />
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
                <XAxis dataKey="nome"
                  tickFormatter={(nome) => typeof nome === 'string' ? nome : ''}
                  onClick={(e) => {
                    // Não é possível adicionar onClick diretamente no tickFormatter, então usar evento de click na barra
                  }}
                />
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

      {/* Modal de detalhamento do colaborador */}
      {selectedColab && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative">
            <button className="absolute top-2 right-2 text-xl" onClick={() => setSelectedColab(null)}>&times;</button>
            <h2 className="text-2xl font-bold mb-2">Detalhamento de {selectedColab}</h2>
            {detailLoading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : colabDetail.length === 0 ? (
              <p>Nenhum dado encontrado para o período selecionado.</p>
            ) : (
              <table className="w-full border mt-2">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">OS</th>
                    <th className="border px-2 py-1">Horas Trabalhadas</th>
                    <th className="border px-2 py-1">Paradas Material</th>
                    <th className="border px-2 py-1">Início</th>
                    <th className="border px-2 py-1">Fim</th>
                  </tr>
                </thead>
                <tbody>
                  {colabDetail.map((d, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1">{d.os_numero}</td>
                      <td className="border px-2 py-1">{formatHours(d.horas_trabalho)}</td>
                      <td className="border px-2 py-1">{d.paradas_material}</td>
                      <td className="border px-2 py-1">{d.data_inicio ? format(new Date(d.data_inicio), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}</td>
                      <td className="border px-2 py-1">{d.data_fim ? format(new Date(d.data_fim), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </ReportTemplate>
  );
} 