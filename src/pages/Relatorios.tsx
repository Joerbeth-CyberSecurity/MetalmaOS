import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React from 'react';
import { ReportTemplate } from '@/components/ui/ReportTemplate';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type OsStatusData = {
  name: string;
  value: number;
  key: string;
};

type TimeControlData = {
  os_numero: string;
  tempo_execucao_real: number;
  tempo_parada: number;
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
  const [reportType, setReportType] = useState<'produtividade' | 'paradas' | 'os_status' | 'tempo'>('produtividade');
  const [colabFilter, setColabFilter] = useState<string>('');

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
        .select(`numero_os, tempo_execucao_real, tempo_parada, status, created_at`)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      if (timeError) throw timeError;
      setTimeControlData((timeData as any[]).map(os => ({
        os_numero: os.numero_os,
        tempo_execucao_real: os.tempo_execucao_real || 0,
        tempo_parada: os.tempo_parada || 0,
        tempo_falta_material: 0, // Não existe na tabela atual
        meta_hora: 0, // Não existe na tabela atual
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

  // Filtros dinâmicos
  const renderFilters = () => (
    <div className="flex flex-wrap gap-2 items-center mb-4">
      <label>Relatório:</label>
      <Select value={reportType} onValueChange={v => setReportType(v as any)}>
        <SelectTrigger className="w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="produtividade">Produtividade de Colaboradores</SelectItem>
          <SelectItem value="paradas">Paradas por Falta de Material</SelectItem>
          <SelectItem value="os_status">Ordens de Serviço por Status</SelectItem>
          <SelectItem value="tempo">Controle de Tempo</SelectItem>
        </SelectContent>
      </Select>
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
      {/* Filtro de colaborador para todos os relatórios exceto os_status */}
      {reportType !== 'os_status' && (
        <>
          <label>Colaborador:</label>
          <select value={colabFilter} onChange={e => setColabFilter(e.target.value)} className="border rounded px-2 py-1">
            <option value="">Todos</option>
            {collaboratorData.map(c => (
              <option key={c.nome} value={c.nome}>{c.nome}</option>
            ))}
          </select>
        </>
      )}
      <Button onClick={fetchReportData} type="button" className="ml-2">Gerar Relatório</Button>
    </div>
  );

  // Renderização dos relatórios
  const renderReport = () => {
    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (reportType === 'produtividade') {
      const data = colabFilter ? collaboratorData.filter(c => c.nome === colabFilter) : collaboratorData;
      
      if (data.length === 0) {
        return (
          <div>
            <h2 className="text-xl font-bold mb-2">Produtividade de Colaboradores</h2>
            <div className="text-center py-8 text-gray-500">
              Nenhum colaborador encontrado no período selecionado.
            </div>
          </div>
        );
      }

      return (
        <div>
          <h2 className="text-xl font-bold mb-2">Produtividade de Colaboradores</h2>
          <table className="w-full border mb-4">
            <thead>
              <tr>
                <th className="border px-2 py-1">Colaborador</th>
                <th className="border px-2 py-1">Horas Trabalhadas</th>
                <th className="border px-2 py-1">Meta (h)</th>
                <th className="border px-2 py-1">Eficiência (%)</th>
                <th className="border px-2 py-1">Paradas Material</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">{c.nome}</td>
                  <td className="border px-2 py-1">{c.horas_trabalhadas.toFixed(1)}</td>
                  <td className="border px-2 py-1">{c.meta_hora}</td>
                  <td className="border px-2 py-1">{c.eficiencia.toFixed(1)}</td>
                  <td className="border px-2 py-1">{c.paradas_material}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (reportType === 'paradas') {
      // Filtrar apenas colaboradores que têm paradas de material
      const colaboradoresComParadas = collaboratorData.filter(c => c.paradas_material > 0);
      
      if (colaboradoresComParadas.length === 0) {
        return (
          <div>
            <h2 className="text-xl font-bold mb-2">Paradas por Falta de Material</h2>
            <div className="text-center py-8 text-gray-500">
              Nenhuma parada por falta de material registrada no período.
            </div>
          </div>
        );
      }

      return (
        <div>
          <h2 className="text-xl font-bold mb-2">Paradas por Falta de Material</h2>
          <table className="w-full border mb-4">
            <thead>
              <tr>
                <th className="border px-2 py-1">Colaborador</th>
                <th className="border px-2 py-1">Total de Paradas</th>
                <th className="border px-2 py-1">Período</th>
              </tr>
            </thead>
            <tbody>
              {colaboradoresComParadas.map((c, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">{c.nome}</td>
                  <td className="border px-2 py-1">{c.paradas_material}</td>
                  <td className="border px-2 py-1">
                    {period === 'mes' ? 'Mês atual' : 
                     period === 'semana' ? 'Semana atual' : 
                     'Período personalizado'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (reportType === 'os_status') {
      return (
        <div>
          <h2 className="text-xl font-bold mb-2">Ordens de Serviço por Status</h2>
          <table className="w-full border mb-4">
            <thead>
              <tr>
                <th className="border px-2 py-1">Status</th>
                <th className="border px-2 py-1">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {osStatusData.map((s, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">{s.name}</td>
                  <td className="border px-2 py-1">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (reportType === 'tempo') {
      if (timeControlData.length === 0) {
        return (
          <div>
            <h2 className="text-xl font-bold mb-2">Controle de Tempo</h2>
            <div className="text-center py-8 text-gray-500">
              Nenhuma OS encontrada no período selecionado.
            </div>
          </div>
        );
      }

      return (
        <div>
          <h2 className="text-xl font-bold mb-2">Controle de Tempo</h2>
          <table className="w-full border mb-4">
            <thead>
              <tr>
                <th className="border px-2 py-1">OS</th>
                <th className="border px-2 py-1">Tempo Execução</th>
                <th className="border px-2 py-1">Tempo Parada</th>
                <th className="border px-2 py-1">Tempo Falta Material</th>
                <th className="border px-2 py-1">Meta (h)</th>
                <th className="border px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {timeControlData.map((t, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">{t.os_numero}</td>
                  <td className="border px-2 py-1">{t.tempo_execucao_real}</td>
                  <td className="border px-2 py-1">{t.tempo_parada}</td>
                  <td className="border px-2 py-1">{t.tempo_falta_material}</td>
                  <td className="border px-2 py-1">{t.meta_hora}</td>
                  <td className="border px-2 py-1">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return null;
  };

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
        <Button onClick={() => window.print()} className="bg-green-600 text-white font-semibold shadow-soft hover:bg-green-700 transition">Imprimir / Exportar PDF</Button>
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Relatórios</h1>
      <p className="text-muted-foreground mb-4">Visualize os dados e o desempenho da sua operação.</p>
      {renderFilters()}
      {renderReport()}
    </ReportTemplate>
  );
} 