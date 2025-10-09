import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { cn } from '../lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Loader2,
  FileText,
  Download,
  Printer,
  Users,
  BarChart3,
  Clock,
  AlertTriangle,
  DollarSign,
  Shield,
  Activity,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logo from '../assets/logo2.png';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import OSReportDetail from '../components/OSReportDetail';
import RelatoriosFinanceiros from './RelatoriosFinanceiros';
import { PermissionGuard } from '../components/PermissionGuard';

export default function Relatorios() {
  const [selectedReport, setSelectedReport] = useState('produtividade');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [colaboradores, setColaboradores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [period, setPeriod] = useState('mes');
  const [colabFilter, setColabFilter] = useState('todos');
  const [clienteFilter, setClienteFilter] = useState('todos');
  const [osNumberFilter, setOsNumberFilter] = useState('');
  const [fabricaFilter, setFabricaFilter] = useState('todas');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOSDetail, setSelectedOSDetail] = useState(null);
  const [justificativaFilter, setJustificativaFilter] = useState('todos');
  const [incluirExcluidas, setIncluirExcluidas] = useState(false);

  const reportTypes = [
    {
      id: 'produtividade',
      title: 'Produtividade por Colaboradores',
      description: 'Análise de eficiência e horas trabalhadas',
      icon: Users,
    },
    {
      id: 'paradas',
      title: 'Paradas por Falta de Material',
      description: 'Controle de interrupções',
      icon: AlertTriangle,
    },
    {
      id: 'os_status',
      title: 'Status das Ordens de Serviço',
      description: 'Distribuição de OS por status',
      icon: BarChart3,
    },
    {
      id: 'tempo',
      title: 'Controle do Tempo',
      description: 'Análise de tempo real vs previsto',
      icon: Clock,
    },
    {
      id: 'emissao_os',
      title: 'Emissão de OS',
      description: 'Relatório detalhado de ordens de serviço',
      icon: FileText,
    },
    {
      id: 'retrabalhos',
      title: 'Retrabalhos',
      description: 'Débitos de horas por OS e colaborador',
      icon: AlertTriangle,
    },
  ];

  useEffect(() => {
    fetchColaboradores();
    fetchClientes();
  }, []);

  const fetchColaboradores = async () => {
    try {
      const { data } = await supabase
        .from('colaboradores')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      setColaboradores(data || []);
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
    }
  };

  const fetchClientes = async () => {
    try {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const fetchProdutividadeReport = async () => {
    setLoading(true);
    try {
      // Buscar dados de tempo dos colaboradores
      const { data: tempoData } = await supabase
        .from('os_tempo')
        .select(`
          *,
          colaborador:colaboradores(nome),
          os:ordens_servico(numero_os, status)
        `)
        .eq('tipo', 'trabalho');

      // Buscar OS concluídas
      const { data: osData } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          os_colaboradores(
            colaborador:colaboradores(nome)
          )
        `)
        .in('status', ['finalizada', 'em_andamento']);

      // Processar dados
      const colaboradoresMap = new Map();
      
      // Processar tempo trabalhado
      tempoData?.forEach(item => {
        const colabId = item.colaborador_id;
        const colabNome = item.colaborador?.nome || 'Desconhecido';
        
        if (!colaboradoresMap.has(colabId)) {
          colaboradoresMap.set(colabId, {
            id: colabId,
            nome: colabNome,
            horasTrabalhadas: 0,
            osConcluidas: 0,
            totalOS: 0
          });
        }
        
        const colaborador = colaboradoresMap.get(colabId);
        if (item.data_fim) {
          const inicio = new Date(item.data_inicio);
          const fim = new Date(item.data_fim);
          const horas = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);
          colaborador.horasTrabalhadas += horas;
        }
      });

      // Processar OS
      osData?.forEach(os => {
        os.os_colaboradores?.forEach(oc => {
          const colabId = oc.colaborador_id;
          const colabNome = oc.colaborador?.nome || 'Desconhecido';
          
          if (!colaboradoresMap.has(colabId)) {
            colaboradoresMap.set(colabId, {
              id: colabId,
              nome: colabNome,
              horasTrabalhadas: 0,
              osConcluidas: 0,
              totalOS: 0
            });
          }
          
          const colaborador = colaboradoresMap.get(colabId);
          colaborador.totalOS++;
          if (os.status === 'finalizada') {
            colaborador.osConcluidas++;
          }
        });
      });

      // Calcular métricas
      const colaboradores = Array.from(colaboradoresMap.values());
      const totalHoras = colaboradores.reduce((sum, colab) => sum + colab.horasTrabalhadas, 0);
      const totalOS = colaboradores.reduce((sum, colab) => sum + colab.totalOS, 0);
      const osConcluidas = colaboradores.reduce((sum, colab) => sum + colab.osConcluidas, 0);
      
      colaboradores.forEach(colab => {
        colab.eficiencia = colab.totalOS > 0 ? (colab.osConcluidas / colab.totalOS) * 100 : 0;
        colab.mediaDiaria = colab.horasTrabalhadas / Math.max(1, Math.ceil(colab.horasTrabalhadas / 8));
      });

      const eficienciaGeral = totalOS > 0 ? (osConcluidas / totalOS) * 100 : 0;
      const mediaDiaria = colaboradores.length > 0 ? totalHoras / colaboradores.length : 0;

      setReportData({
        produtividade: {
          colaboradores,
          totalHoras,
          totalDias: Math.ceil(totalHoras / 8),
          mediaDiaria,
          eficienciaGeral,
          osConcluidas,
          totalOS
        }
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de produtividade:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setPeriod('mes');
    setColabFilter('todos');
    setClienteFilter('todos');
    setOsNumberFilter('');
    setStartDate('');
    setEndDate('');
    setReportData(null);
  };

  const exportProdutividadePDF = () => {
    if (!reportData?.produtividade) return;

    const doc = new jsPDF();
    
    // Logo
    doc.addImage(logo, 'PNG', 15, 10, 30, 20);
    
    // Título
    doc.setFontSize(20);
    doc.text('Relatório de Produtividade', 50, 25);
    
    // Data
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 15, 40);
    
    // Métricas gerais
    doc.setFontSize(14);
    doc.text('Métricas Gerais', 15, 55);
    
    doc.setFontSize(10);
    doc.text(`Total de Horas: ${reportData.produtividade.totalHoras.toFixed(1)}h`, 15, 65);
    doc.text(`Média Diária: ${reportData.produtividade.mediaDiaria.toFixed(1)}h`, 15, 70);
    doc.text(`Eficiência Geral: ${reportData.produtividade.eficienciaGeral.toFixed(1)}%`, 15, 75);
    doc.text(`OS Concluídas: ${reportData.produtividade.osConcluidas}/${reportData.produtividade.totalOS}`, 15, 80);
    
    // Tabela de colaboradores
    doc.setFontSize(14);
    doc.text('Produtividade por Colaborador', 15, 95);
    
    const tableData = reportData.produtividade.colaboradores.map(colab => [
      colab.nome,
      `${colab.horasTrabalhadas.toFixed(1)}h`,
      colab.osConcluidas.toString(),
      `${colab.eficiencia.toFixed(1)}%`,
      `${colab.mediaDiaria.toFixed(1)}h`
    ]);
    
    autoTable(doc, {
      head: [['Colaborador', 'Horas', 'OS Concluídas', 'Eficiência', 'Média Diária']],
      body: tableData,
      startY: 100,
      styles: { fontSize: 8 }
    });
    
    doc.save('relatorio-produtividade.pdf');
  };

  const fetchSegurancaReport = async () => {
    setLoading(true);
    try {
      // Buscar dados de auditoria
      const { data: auditoriaData } = await supabase
        .from('auditoria_login')
        .select('*')
        .order('data_hora', { ascending: false })
        .limit(100);

      if (!auditoriaData) {
        setReportData({
          seguranca: {
            totalAcessos: 0,
            loginsSucesso: 0,
            loginsFalha: 0,
            percentualSucesso: 0,
            percentualFalha: 0,
            usuariosUnicos: 0,
            logs: []
          }
        });
        return;
      }

      // Processar dados
      const totalAcessos = auditoriaData.length;
      const loginsSucesso = auditoriaData.filter(log => 
        log.tipo_evento === 'login' || log.tipo_evento === 'logout'
      ).length;
      const loginsFalha = auditoriaData.filter(log => 
        log.tipo_evento === 'failed_login'
      ).length;
      
      const percentualSucesso = totalAcessos > 0 ? (loginsSucesso / totalAcessos) * 100 : 0;
      const percentualFalha = totalAcessos > 0 ? (loginsFalha / totalAcessos) * 100 : 0;
      
      const usuariosUnicos = new Set(
        auditoriaData
          .filter(log => log.nome_usuario)
          .map(log => log.nome_usuario)
      ).size;

      setReportData({
        seguranca: {
          totalAcessos,
          loginsSucesso,
          loginsFalha,
          percentualSucesso,
          percentualFalha,
          usuariosUnicos,
          logs: auditoriaData
        }
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de segurança:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportSegurancaPDF = () => {
    if (!reportData?.seguranca) return;

    const doc = new jsPDF();
    
    // Logo
    doc.addImage(logo, 'PNG', 15, 10, 30, 20);
    
    // Título
    doc.setFontSize(20);
    doc.text('Relatório de Segurança', 50, 25);
    
    // Data
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 15, 40);
    
    // Métricas gerais
    doc.setFontSize(14);
    doc.text('Métricas de Segurança', 15, 55);
    
    doc.setFontSize(10);
    doc.text(`Total de Acessos: ${reportData.seguranca.totalAcessos}`, 15, 65);
    doc.text(`Logins Bem-sucedidos: ${reportData.seguranca.loginsSucesso} (${reportData.seguranca.percentualSucesso.toFixed(1)}%)`, 15, 70);
    doc.text(`Tentativas Falhadas: ${reportData.seguranca.loginsFalha} (${reportData.seguranca.percentualFalha.toFixed(1)}%)`, 15, 75);
    doc.text(`Usuários Únicos: ${reportData.seguranca.usuariosUnicos}`, 15, 80);
    
    // Tabela de logs
    doc.setFontSize(14);
    doc.text('Log de Auditoria', 15, 95);
    
    const tableData = reportData.seguranca.logs.slice(0, 20).map(log => [
      log.nome_usuario || 'N/A',
      log.email_usuario || 'N/A',
      log.tipo_evento === 'login' ? 'Login' : 
      log.tipo_evento === 'logout' ? 'Logout' : 'Tentativa Falhada',
      log.data_hora ? new Date(log.data_hora).toLocaleString('pt-BR') : 'N/A',
      log.ip_address || 'N/A'
    ]);
    
    autoTable(doc, {
      head: [['Usuário', 'Email', 'Evento', 'Data/Hora', 'IP']],
      body: tableData,
      startY: 100,
      styles: { fontSize: 8 }
    });
    
    doc.save('relatorio-seguranca.pdf');
  };

  const getDateRange = () => {
    const now = new Date();
    console.log('Calculando período para:', period);
    console.log('Data atual:', now);
    console.log('startDate:', startDate);
    console.log('endDate:', endDate);
    
    if (period === 'mes') {
      const result = {
        start: startOfMonth(now).toISOString(),
        end: endOfMonth(now).toISOString(),
      };
      console.log('Período mensal:', result);
      return result;
    } else if (period === 'semana') {
      const result = {
        start: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
        end: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
      };
      console.log('Período semanal:', result);
      return result;
    } else if (period === 'personalizado') {
      const result = {
        start: startDate ? new Date(startDate).toISOString() : startOfMonth(now).toISOString(),
        end: endDate ? new Date(endDate).toISOString() : endOfMonth(now).toISOString(),
      };
      console.log('Período personalizado:', result);
      return result;
    } else {
      const result = {
        start: startOfMonth(now).toISOString(),
        end: endOfMonth(now).toISOString(),
      };
      console.log('Período padrão (mensal):', result);
      return result;
    }
  };

  const generateReport = async () => {
    console.log('Iniciando geração de relatório...');
    console.log('Tipo de relatório selecionado:', selectedReport);
    setLoading(true);

    try {
      const { start, end } = getDateRange();
      console.log('Período calculado:', { start, end });

      switch (selectedReport) {
        case 'produtividade':
          console.log('Gerando relatório de produtividade...');
          await generateProdutividadeReport(start, end);
          break;
        case 'paradas':
          console.log('Gerando relatório de paradas...');
          await generateParadasReport(start, end);
          break;
        case 'retrabalhos':
          console.log('Gerando relatório de retrabalhos...');
          await generateRetrabalhosReport(start, end);
          break;
        case 'os_status':
          console.log('Gerando relatório de status...');
          await generateOsStatusReport(start, end);
          break;
        case 'tempo':
          console.log('Gerando relatório de tempo...');
          await generateTempoReport(start, end);
          break;
        case 'emissao_os':
          console.log('Gerando relatório de emissão de OS...');
          await generateEmissaoOSReport(start, end);
          break;
        default:
          console.log('Tipo de relatório não reconhecido:', selectedReport);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório: ' + error.message);
    } finally {
      setLoading(false);
      console.log('Geração de relatório finalizada');
    }
  };

  const generateProdutividadeReport = async (start, end) => {
    try {
      // Buscar colaboradores ativos
      const { data: colaboradores } = await supabase
        .from('colaboradores')
        .select('id, nome, meta_hora')
        .eq('ativo', true)
        .order('nome');

      // Buscar tempos de trabalho
      const { data: tempos } = await supabase
        .from('os_tempo')
        .select('colaborador_id, tipo, horas_calculadas, os_id, data_inicio')
        .gte('data_inicio', start)
        .lte('data_inicio', end);

      // Buscar débitos formais em retrabalhos (abatimentos)
      const { data: retrabalhos } = await supabase
        .from('retrabalhos')
        .select('colaborador_id, horas_abatidas')
        .gte('data_retrabalho', start)
        .lte('data_retrabalho', end);

      // Processar dados
      const colabMap = {};

      (colaboradores || []).forEach((colab) => {
        colabMap[colab.id] = {
          nome: colab.nome,
          meta_hora: colab.meta_hora || 0,
          horas_trabalhadas: 0,
          horas_debitadas: 0,
          eficiencia: 0,
          paradas_material: 0,
          os_finalizadas: 0,
        };
      });

      (tempos || []).forEach((tempo) => {
        if (colabMap[tempo.colaborador_id]) {
          if (tempo.tipo === 'trabalho') {
            colabMap[tempo.colaborador_id].horas_trabalhadas +=
              tempo.horas_calculadas || 0;
          } else if (tempo.tipo === 'parada_material') {
            colabMap[tempo.colaborador_id].paradas_material += 1;
          }
        }
      });

      // Somar débitos formais
      (retrabalhos || []).forEach((r) => {
        if (colabMap[r.colaborador_id]) {
          colabMap[r.colaborador_id].horas_debitadas += r.horas_abatidas || 0;
        }
      });

      // Calcular eficiência
      Object.values(colabMap as any).forEach((colab: any) => {
        const horasLiquidas = Math.max(0, (colab.horas_trabalhadas || 0) - (colab.horas_debitadas || 0));
        colab.eficiencia =
          colab.meta_hora > 0
            ? Math.min(100, (horasLiquidas / colab.meta_hora) * 100)
            : 0;
      });

      setReportData({
        type: 'produtividade',
        data: Object.values(colabMap),
        period: { start, end },
        filters: { colaborador: colabFilter },
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de produtividade:', error);
    }
  };

  const generateParadasReport = async (start, end) => {
    try {
      const { data: paradas } = await supabase
        .from('os_tempo')
        .select(
          `
          tipo,
          data_inicio,
          data_fim,
          motivo,
          os_id,
          colaborador:colaboradores(nome),
          os:ordens_servico(numero_os)
        `
        )
        .eq('tipo', 'parada_material')
        .gte('data_inicio', start)
        .lte('data_inicio', end)
        .order('data_inicio', { ascending: false });

      const paradasData = (paradas || []).map((p) => ({
        os_numero: (p as any).os?.numero_os || 'N/A',
        colaborador: (p as any).colaborador?.nome || 'N/A',
        motivo: p.motivo || 'Falta de material',
        data_inicio: p.data_inicio,
        data_fim: p.data_fim,
        duracao: p.data_fim
          ? (new Date(p.data_fim).getTime() -
              new Date(p.data_inicio).getTime()) /
            (1000 * 60 * 60)
          : 0,
      }));

      setReportData({
        type: 'paradas',
        data: paradasData,
        period: { start, end },
        filters: { colaborador: colabFilter },
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de paradas:', error);
    }
  };

  const generateRetrabalhosReport = async (start, end) => {
    try {
      const { data } = await supabase
        .from('retrabalhos')
        .select(`
          horas_abatidas,
          motivo,
          data_retrabalho,
          colaborador:colaboradores(nome),
          os:ordens_servico(numero_os, cliente:clientes(nome))
        `)
        .gte('data_retrabalho', start)
        .lte('data_retrabalho', end)
        .order('data_retrabalho', { ascending: false });

      const rows = (data || []).map((r: any) => ({
        os_numero: r.os?.numero_os || 'N/A',
        colaborador: r.colaborador?.nome || 'N/A',
        cliente: r.os?.cliente || 'N/A',
        motivo: r.motivo || 'retrabalho',
        horas: r.horas_abatidas || 0,
        data: r.data_retrabalho,
      }));

      setReportData({ type: 'retrabalhos', data: rows, period: { start, end } });
    } catch (error) {
      console.error('Erro ao gerar relatório de retrabalhos:', error);
    }
  };

  const generateOsStatusReport = async (start, end) => {
    try {
      const { data: ordens } = await supabase
        .from('ordens_servico')
        .select('id, status, data_abertura')
        .gte('data_abertura', start)
        .lte('data_abertura', end);

      const statusCount = {};
      let total = 0;

      (ordens || []).forEach((os) => {
        statusCount[os.status] = (statusCount[os.status] || 0) + 1;
        total++;
      });

      const statusData = Object.entries(statusCount).map(
        ([status, quantidade]) => ({
          status: status
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          quantidade,
          percentual: total > 0 ? (Number(quantidade) / total) * 100 : 0,
        })
      );

      setReportData({
        type: 'os_status',
        data: statusData,
        period: { start, end },
        total,
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de status:', error);
    }
  };

  const generateTempoReport = async (start, end) => {
    try {
      // Buscar ordens de serviço com dados de tempo corretos
      const { data: ordens, error: err1 } = await supabase
        .from('ordens_servico')
        .select(
          `
          numero_os,
          tempo_execucao_real,
          tempo_parada,
          tempo_execucao_previsto,
          status,
          data_abertura,
          cliente:clientes(nome)
        `
        )
        .gte('data_abertura', start)
        .lte('data_abertura', end)
        .order('data_abertura', { ascending: false });

      if (err1) {
        console.error('Erro ao buscar ordens:', err1);
        return;
      }

      // Buscar dados de tempo da tabela os_tempo para cálculos mais precisos
      const { data: tempos, error: err2 } = await supabase
        .from('os_tempo')
        .select(
          `
          os_id,
          tipo,
          data_inicio,
          data_fim,
          horas_calculadas,
          motivo
        `
        )
        .gte('data_inicio', start)
        .lte('data_inicio', end);

      if (err2) {
        console.error('Erro ao buscar tempos:', err2);
        return;
      }

      // Processar dados combinando informações das duas tabelas
      const tempoData = (ordens || []).map((os: any) => {
        // Calcular tempo real baseado nos registros de os_tempo
        const temposOS = (tempos || []).filter((t: any) => t.os_id === os.id);
        let tempoRealCalculado = 0;
        let tempoParadaCalculado = 0;

        temposOS.forEach((tempo) => {
          if (tempo.tipo === 'trabalho') {
            // Calcular horas se data_fim existe, senão usar horas_calculadas
            if (tempo.data_fim && tempo.data_inicio) {
              const duracao =
                (new Date(tempo.data_fim).getTime() -
                  new Date(tempo.data_inicio).getTime()) /
                (1000 * 60 * 60);
              tempoRealCalculado += duracao;
            } else if (tempo.horas_calculadas) {
              tempoRealCalculado += tempo.horas_calculadas;
            }
          } else if (
            tempo.tipo === 'parada_material' ||
            tempo.tipo === 'pausa'
          ) {
            if (tempo.data_fim && tempo.data_inicio) {
              const duracao =
                (new Date(tempo.data_fim).getTime() -
                  new Date(tempo.data_inicio).getTime()) /
                (1000 * 60 * 60);
              tempoParadaCalculado += duracao;
            } else if (tempo.horas_calculadas) {
              tempoParadaCalculado += tempo.horas_calculadas;
            }
          }
        });

        // Usar dados calculados ou dados da OS (priorizar os calculados)
        const tempoReal =
          tempoRealCalculado > 0
            ? tempoRealCalculado
            : os.tempo_execucao_real || 0;
        const tempoParada =
          tempoParadaCalculado > 0
            ? tempoParadaCalculado
            : os.tempo_parada || 0;
        const tempoPrevisto = os.tempo_execucao_previsto || 0;

        return {
          os_numero: os.numero_os,
          cliente: os.cliente?.nome || 'N/A',
          tempo_execucao_real: tempoReal,
          tempo_parada: tempoParada,
          tempo_previsto: tempoPrevisto,
          status: os.status,
          data_abertura: os.data_abertura,
          eficiencia:
            tempoPrevisto > 0
              ? Math.min(100, (tempoReal / tempoPrevisto) * 100)
              : 0,
        };
      });

      setReportData({
        type: 'tempo',
        data: tempoData,
        period: { start, end },
        filters: { cliente: clienteFilter },
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de tempo:', error);
    }
  };

  const generateEmissaoOSReport = async (start, end) => {
    try {
      console.log('Iniciando geração do relatório de emissão de OS...');
      console.log('Período:', { start, end });
      console.log('Filtros:', { osNumberFilter, clienteFilter, justificativaFilter, incluirExcluidas });

      let ordens = [];
      let osExcluidas = [];

      // Buscar OS ativas
      let query = supabase
        .from('ordens_servico')
        .select(`
          *,
          clientes (
            nome,
            cpf_cnpj,
            telefone,
            email,
            endereco,
            cidade,
            estado,
            cep
          ),
          os_produtos (
            *,
            produtos (
              nome,
              descricao,
              unidade
            )
          ),
          os_colaboradores (
            colaborador:colaboradores(nome)
          ),
          justificativas_os (
            id,
            tipo,
            justificativa,
            data_justificativa,
            tempo_tolerancia_minutos,
            excedeu_tolerancia
          )
        `)
        .gte('data_abertura', start)
        .lte('data_abertura', end)
        .order('data_abertura', { ascending: false });

      // Aplicar filtros específicos
      if (osNumberFilter.trim()) {
        query = query.ilike('numero_os', `%${osNumberFilter.trim()}%`);
      }

      if (clienteFilter !== 'todos') {
        query = query.eq('cliente_id', clienteFilter);
      }

      if (fabricaFilter !== 'todas') {
        query = query.eq('fabrica', fabricaFilter);
      }

      console.log('Executando query de OS ativas...');
      const { data: ordensAtivas, error: errorAtivas } = await query;

      if (errorAtivas) {
        console.error('Erro ao buscar OS ativas:', errorAtivas);
        alert('Erro ao buscar dados: ' + errorAtivas.message);
        return;
      }

      ordens = ordensAtivas || [];

      // Se solicitado, buscar OS excluídas da auditoria
      if (incluirExcluidas) {
        const { data: auditoriaExcluidas, error: errorExcluidas } = await supabase
          .from('auditoria_os')
          .select('*')
          .eq('acao', 'excluir_os')
          .gte('created_at', start + 'T00:00:00')
          .lte('created_at', end + 'T23:59:59')
          .order('created_at', { ascending: false });

        if (errorExcluidas) {
          console.error('Erro ao buscar OS excluídas:', errorExcluidas);
          alert('Erro ao buscar OS excluídas: ' + errorExcluidas.message);
        } else {
          osExcluidas = auditoriaExcluidas || [];
        }
      }

      // Processar dados para o relatório
      let osData = (ordens || []).map((os) => ({
        numero_os: os.numero_os,
        fabrica: (os as any).fabrica,
        cliente: os.clientes,
        descricao: os.descricao,
        status: os.status,
        data_abertura: os.data_abertura,
        data_atual: (os as any).data_atual,
        data_conclusao: (os as any).data_conclusao,
        data_fim: os.data_fim,
        valor_total: os.valor_total,
        desconto_tipo: os.desconto_tipo,
        desconto_valor: os.desconto_valor,
        valor_total_com_desconto: os.valor_total_com_desconto,
        tempo_execucao_previsto: os.tempo_execucao_previsto,
        tempo_execucao_real: os.tempo_execucao_real,
        observacoes: os.observacoes,
        produtos: os.os_produtos || [],
        colaboradores: os.os_colaboradores || [],
        justificativas: os.justificativas_os || [],
        tem_justificativa: (os.justificativas_os || []).length > 0,
        isExcluded: false,
      }));

      // Adicionar OS excluídas se solicitado
      if (incluirExcluidas && osExcluidas.length > 0) {
        console.log('Processando OS excluídas para o relatório...');
        const osExcluidasData = osExcluidas.map((audit) => {
          // Extrair o motivo da exclusão dos detalhes
          let motivo_exclusao = 'Motivo não informado';
          if (audit.detalhes) {
            try {
              // Tentar parsear como JSON
              const detalhesObj = typeof audit.detalhes === 'string' 
                ? JSON.parse(audit.detalhes) 
                : audit.detalhes;
              
              if (detalhesObj.motivo) {
                motivo_exclusao = detalhesObj.motivo;
              } else if (detalhesObj.includes && detalhesObj.includes('Motivo:')) {
                motivo_exclusao = detalhesObj.split('Motivo:')[1]?.trim();
              }
            } catch (e) {
              // Se não for JSON, tentar extrair do texto
              if (typeof audit.detalhes === 'string' && audit.detalhes.includes('Motivo:')) {
                motivo_exclusao = audit.detalhes.split('Motivo:')[1]?.trim();
              } else {
                motivo_exclusao = audit.detalhes;
              }
            }
          }
          
          return {
            numero_os: audit.numero_os,
            fabrica: audit.dados_anteriores?.fabrica || 'N/A',
            cliente: { nome: audit.dados_anteriores?.cliente_nome || 'Cliente não informado' },
            descricao: audit.dados_anteriores?.descricao || 'OS foi excluída do sistema',
            status: 'excluida',
            data_abertura: audit.created_at,
            data_atual: null,
            data_conclusao: null,
            data_fim: audit.created_at,
            valor_total: audit.dados_anteriores?.valor_total || 0,
            desconto_tipo: null,
            desconto_valor: null,
            valor_total_com_desconto: audit.dados_anteriores?.valor_total || 0,
            tempo_execucao_previsto: 0,
            tempo_execucao_real: 0,
            observacoes: motivo_exclusao,
            produtos: [],
            colaboradores: [],
            justificativas: [],
            tem_justificativa: false,
            isExcluded: true,
            motivo_exclusao: motivo_exclusao,
          };
        });

        osData = [...osData, ...osExcluidasData];
      }


      // Aplicar filtro de justificativa
      if (justificativaFilter === 'com') {
        osData = osData.filter(os => os.tem_justificativa);
      } else if (justificativaFilter === 'sem') {
        osData = osData.filter(os => !os.tem_justificativa);
      }

      const reportData = {
        type: 'emissao_os',
        data: osData,
        period: { start, end },
        filters: { 
          cliente: clienteFilter,
          osNumber: osNumberFilter,
          justificativa: justificativaFilter,
          fabrica: fabricaFilter,
          startDate,
          endDate
        },
      };

      console.log('Definindo reportData:', reportData);
      setReportData(reportData);
      console.log('Relatório de emissão de OS gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar relatório de emissão de OS:', error);
      alert('Erro ao gerar relatório: ' + error.message);
    }
  };

  // Função para obter título do relatório
  const getReportTitle = (type) => {
    switch (type) {
      case 'produtividade':
        return 'RELATÓRIO DE PRODUTIVIDADE';
      case 'paradas':
        return 'RELATÓRIO DE PARADAS POR FALTA DE MATERIAL';
      case 'os_status':
        return 'RELATÓRIO DE STATUS DAS ORDENS DE SERVIÇO';
      case 'tempo':
        return 'RELATÓRIO DE CONTROLE DE TEMPO';
      case 'emissao_os':
        return 'RELATÓRIO DE EMISSÃO DE ORDENS DE SERVIÇO';
      default:
        return 'RELATÓRIO';
    }
  };

  // Função para imprimir
  const handlePrint = () => {
    if (reportData) {
      // Criar elemento de impressão
      const printWindow = window.open('', '_blank');
      const reportTitle = getReportTitle(reportData.type);

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0; 
              background: white; 
              color: black; 
            }
            .relatorio-impressao { 
              width: 190mm; 
              margin: 0 auto; 
            }
            .relatorio-cabecalho { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333; 
              padding-bottom: 20px; 
            }
            .relatorio-logo { 
              width: 120px; 
              height: auto; 
              margin: 0 auto 15px auto; 
              display: block; 
            }
            .relatorio-empresa { 
              font-size: 18px; 
              font-weight: bold; 
              margin: 0 0 5px 0; 
              color: #333; 
            }
            .relatorio-titulo { 
              font-size: 16px; 
              font-weight: bold; 
              margin: 0 0 10px 0; 
              color: #333; 
              text-transform: uppercase; 
            }
            .relatorio-info { 
              font-size: 11px; 
              color: #666; 
              margin: 0; 
            }
            .relatorio-tabela { 
              margin: 20px 0; 
            }
            .relatorio-tabela table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 0; 
            }
            .relatorio-tabela th, .relatorio-tabela td { 
              border: 1px solid #333; 
              padding: 8px; 
              text-align: left; 
              font-size: 11px; 
            }
            .relatorio-tabela th { 
              background-color: #f0f0f0; 
              font-weight: bold; 
              color: #333; 
            }
            .relatorio-rodape { 
              text-align: center; 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #ccc; 
              font-size: 10px; 
              color: #666; 
            }
            @media print {
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="relatorio-impressao">
            <div class="relatorio-cabecalho">
              <img src="${logo}" alt="Logo Metalma" class="relatorio-logo" />
              <div class="relatorio-empresa">METALMA INOX & CIA</div>
              <div class="relatorio-titulo">${reportTitle}</div>
              <div class="relatorio-info">
                Período: ${formatDate(reportData.period.start)} a ${formatDate(reportData.period.end)}<br/>
                Gerado em: ${formatDate(new Date().toISOString())}
              </div>
            </div>
            <div class="relatorio-tabela">
              <table>
                <thead>
                  <tr>
                    ${renderTableContent()}
                  </tr>
                </thead>
                <tbody>
                  ${renderTableRows()}
                </tbody>
              </table>
            </div>
            <div class="relatorio-rodape">
              Metalma Inox & Cia - Sistema de Controle de OS
            </div>
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };
    }
  };

  // Função para exportar PDF (com logomarca e layout A4)
  const handleExportPDF = () => {
    console.log('Botão Exportar PDF clicado');
    console.log('reportData:', reportData);

    if (reportData) {
      try {
        const reportTitle = getReportTitle(reportData.type);
        console.log('Gerando PDF para:', reportTitle);

        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 15;

        // Logo (usa logo importado)
        try {
          doc.addImage(logo, 'PNG', pageWidth / 2 - 25, y, 50, 18);
        } catch {}
        y += 24;

        // Título e período
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(reportTitle, pageWidth / 2, y, { align: 'center' });
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Período: ${formatDate(reportData.period.start)} a ${formatDate(reportData.period.end)}`, pageWidth / 2, y, { align: 'center' });
        y += 6;
        doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, pageWidth / 2, y, { align: 'center' });
        y += 8;

        // Tabela (usa autoTable existente conforme tipo)
        const tableHead = [renderTableHeadersForPdf(reportData.type)];
        const tableBody = renderTableRowsForPdf(reportData.type);
        autoTable(doc, {
          startY: y,
          head: tableHead,
          body: tableBody,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [240, 240, 240], textColor: 0 },
          margin: { left: 15, right: 15 },
        });

        const fileName = `${reportTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF: ' + error.message);
      }
    } else {
      console.log('Nenhum dado de relatório disponível');
      alert('Gere um relatório primeiro antes de exportar o PDF.');
    }
  };

  const formatHours = (hours) => {
    if (!hours || hours === 0) return '00:00:00';
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor((totalMinutes % 60));
    const s = Math.floor(((totalMinutes % 60) - m) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  const formatDate = (dateString) =>
    format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Helpers para PDF (mantém compatível com as colunas existentes)
  const renderTableHeadersForPdf = (type: string) => {
    switch (type) {
      case 'produtividade':
        return ['Colaborador', 'Horas', 'OS Concluídas', 'Eficiência', 'Média Diária'];
      case 'seguranca':
        return ['Usuário', 'Email', 'Evento', 'Data/Hora', 'IP'];
      case 'emissao_os':
      default:
        return renderTableContent().match(/<th>(.*?)<\/th>/g)?.map((h) => h.replace(/<\/?th>/g, '')) || [];
    }
  };

  const renderTableRowsForPdf = (type: string) => {
    // Aproveita dados já carregados em reportData.rows
    const rows = (reportData as any)?.rows || [];
    switch (type) {
      case 'produtividade':
        return rows.map((r: any) => [
          r.colaborador,
          `${(r.horas_trabalhadas ?? 0).toFixed(1)}h`,
          String(r.os_concluidas ?? 0),
          `${(r.eficiencia ?? 0).toFixed(0)}%`,
          `${(r.media_diaria ?? 0).toFixed(1)}h`,
        ]);
      case 'seguranca':
        return rows.map((r: any) => [
          r.usuario ?? '-',
          r.email ?? '-',
          r.evento ?? '-',
          r.data_hora ? formatDate(r.data_hora) : '-',
          r.ip ?? '-',
        ]);
      case 'emissao_os':
      default:
        // Tenta extrair células de renderTableRows() (fallback simples)
        return rows.map((r: any) => Object.values(r).map((v) => String(v ?? '-')));
    }
  };

  const handlePrintOSDetail = () => {
    if (selectedOSDetail) {
      const printWindow = window.open('', '_blank');
      const os = selectedOSDetail;
      
      const totalProdutos = os.produtos.reduce(
        (total, produto) => total + (produto.subtotal || 0),
        0
      );

      // Usar logo diretamente como URL
      const logoUrl = logo;

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>OS ${os.numero_os}</title>
            <style>
              @page { size: A4; margin: 12mm; }
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 0; 
                background: white; 
                color: black; 
              }
              .relatorio-impressao { 
                width: 190mm; 
                margin: 0 auto; 
                padding: 12mm 0;
              }
              .relatorio-cabecalho { 
                text-align: center; 
                margin-bottom: 30px; 
                border-bottom: 2px solid #333; 
                padding-bottom: 20px; 
              }
              .relatorio-logo { 
                width: 120px; 
                height: auto; 
                margin: 0 auto 15px auto; 
                display: block; 
              }
              .relatorio-empresa { 
                font-size: 18px; 
                font-weight: bold; 
                margin: 0 0 5px 0; 
                color: #333; 
              }
              .relatorio-titulo { 
                font-size: 16px; 
                font-weight: bold; 
                margin: 0 0 10px 0; 
                color: #333; 
                text-transform: uppercase; 
              }
              .relatorio-info { 
                font-size: 11px; 
                color: #666; 
                margin: 0; 
              }
              .relatorio-secao { 
                margin: 20px 0; 
              }
              .relatorio-secao h3 { 
                font-size: 14px; 
                font-weight: bold; 
                margin: 0 0 10px 0; 
                color: #333; 
                border-bottom: 1px solid #ccc; 
                padding-bottom: 5px; 
              }
              .relatorio-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 20px; 
                margin: 15px 0; 
              }
              .relatorio-tabela { 
                margin: 20px 0; 
              }
              .relatorio-tabela table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 0; 
              }
              .relatorio-tabela th, .relatorio-tabela td { 
                border: 1px solid #333; 
                padding: 8px; 
                text-align: left; 
                font-size: 11px; 
              }
              .relatorio-tabela th { 
                background-color: #f0f0f0; 
                font-weight: bold; 
                color: #333; 
              }
              .relatorio-resumo { 
                background-color: #f9f9f9; 
                padding: 15px; 
                border: 1px solid #ccc; 
                margin: 20px 0; 
              }
              .relatorio-resumo .total-final { 
                border-top: 2px solid #333; 
                padding-top: 10px; 
                margin-top: 10px; 
                font-weight: bold; 
                font-size: 14px; 
              }
              .relatorio-rodape { 
                text-align: center; 
                margin-top: 30px; 
                padding-top: 20px; 
                border-top: 1px solid #ccc; 
                font-size: 10px; 
                color: #666; 
              }
              @media print {
                body { margin: 0; padding: 0; }
              }
            </style>
          </head>
          <body>
            <div class="relatorio-impressao">
              <div class="relatorio-cabecalho">
                <img src="${logoUrl}" alt="Logo Metalma" class="relatorio-logo" />
                <div class="relatorio-titulo">ORDEM DE SERVIÇO</div>
                <div class="relatorio-info">Nº ${os.numero_os}</div>
              </div>

            <div class="relatorio-secao">
              <div class="relatorio-grid">
                <div>
                  <h3>Dados da OS</h3>
                  <div style="font-size: 11px; line-height: 1.6;">
                    <div><strong>Número:</strong> ${os.numero_os}</div>
                    <div><strong>Status:</strong> ${os.status.replace(/_/g, ' ').replace(/\\b\\w/g, (l) => l.toUpperCase())}</div>
                    <div><strong>Fábrica:</strong> ${os.fabrica || 'N/A'}</div>
                    <div><strong>Data de Abertura:</strong> ${formatDate(os.data_abertura)}</div>
                    ${os.data_fim ? `<div><strong>Data de Finalização:</strong> ${formatDate(os.data_fim)}</div>` : ''}
                    <div><strong>Tempo Previsto:</strong> ${os.tempo_execucao_previsto || 0}h</div>
                    <div><strong>Tempo Real:</strong> ${os.tempo_execucao_real || 0}h</div>
                  </div>
                </div>
                <div>
                  <h3>Dados do Cliente</h3>
                  <div style="font-size: 11px; line-height: 1.6;">
                    <div><strong>Nome:</strong> ${os.cliente?.nome || 'N/A'}</div>
                    <div><strong>CPF/CNPJ:</strong> ${os.cliente?.cpf_cnpj || 'N/A'}</div>
                    <div><strong>Telefone:</strong> ${os.cliente?.telefone || 'N/A'}</div>
                    <div><strong>Email:</strong> ${os.cliente?.email || 'N/A'}</div>
                    <div><strong>Endereço:</strong> ${os.cliente?.endereco || 'N/A'}</div>
                    <div><strong>Cidade/UF:</strong> ${os.cliente?.cidade || 'N/A'} / ${os.cliente?.estado || 'N/A'}</div>
                    <div><strong>CEP:</strong> ${os.cliente?.cep || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="relatorio-secao">
              <h3>Descrição dos Serviços</h3>
              <div style="background-color: #f9f9f9; padding: 10px; border: 1px solid #ccc; font-size: 11px;">
                ${os.descricao.replace(/\\n/g, '<br>')}
              </div>
            </div>

            <div class="relatorio-secao">
              <h3>Produtos Utilizados</h3>
              <div class="relatorio-tabela">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Descrição</th>
                      <th>Qtd.</th>
                      <th>Unidade</th>
                      <th>Valor Unit.</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${os.produtos.map(produto => `
                      <tr>
                        <td>${produto.produtos?.nome || 'N/A'}</td>
                        <td>${produto.produtos?.descricao || '-'}</td>
                        <td style="text-align: center;">${produto.quantidade}</td>
                        <td style="text-align: center;">${produto.produtos?.unidade || 'UN'}</td>
                        <td style="text-align: right;">${formatCurrency(produto.preco_unitario)}</td>
                        <td style="text-align: right; font-weight: bold;">${formatCurrency(produto.subtotal)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="relatorio-secao">
              <h3>Resumo Financeiro</h3>
              <div class="relatorio-resumo">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <span style="font-weight: bold;">Valor Total:</span>
                  <span style="font-size: 16px; font-weight: bold;">${formatCurrency(totalProdutos)}</span>
                </div>
                ${os.desconto_valor && os.desconto_valor > 0 ? `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <span style="font-weight: bold;">Desconto:</span>
                  <span style="font-size: 16px; font-weight: bold; color: #dc2626;">
                    ${os.desconto_tipo === 'percentual' 
                      ? `${((os.desconto_valor / totalProdutos) * 100).toFixed(2)}%`
                      : formatCurrency(os.desconto_valor)
                    }
                  </span>
                </div>
                ` : ''}
                <div class="total-final" style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: bold; font-size: 18px;">Total com Desconto:</span>
                  <span style="font-size: 20px; font-weight: bold; color: #059669;">
                    ${formatCurrency(os.valor_total_com_desconto || totalProdutos)}
                  </span>
                </div>
              </div>
            </div>

            ${os.colaboradores.length > 0 ? `
            <div class="relatorio-secao">
              <h3>Colaboradores Envolvidos</h3>
              <div style="font-size: 11px;">
                ${os.colaboradores.map(colab => colab.colaborador?.nome || 'N/A').join(', ')}
              </div>
            </div>
            ` : ''}


            ${os.observacoes ? `
            <div class="relatorio-secao">
              <h3>Observações</h3>
              <div style="background-color: #f9f9f9; padding: 10px; border: 1px solid #ccc; font-size: 11px;">
                ${os.observacoes.replace(/\\n/g, '<br>')}
              </div>
            </div>
            ` : ''}

            <div class="relatorio-rodape" style="text-align: center;">
              Metalma Inox & Cia - Sistema de Controle de OS<br/>
              Relatório gerado em: ${formatDate(new Date().toISOString())}
            </div>
          </div>
        </body>
        </html>
        `);

        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        };
      };
      
      // Fallback antigo removido: a janela já aguarda onload para imprimir
      /* printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>OS ${os.numero_os}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: white; 
                color: black; 
              }
              .relatorio-impressao { 
                max-width: 800px; 
                margin: 0 auto; 
              }
              .relatorio-cabecalho { 
                text-align: center; 
                margin-bottom: 30px; 
                border-bottom: 2px solid #333; 
                padding-bottom: 20px; 
              }
              .relatorio-titulo { 
                font-size: 16px; 
                font-weight: bold; 
                margin: 0 0 10px 0; 
                color: #333; 
                text-transform: uppercase; 
              }
              .relatorio-info { 
                font-size: 11px; 
                color: #666; 
                margin: 0; 
              }
              .relatorio-secao { 
                margin: 20px 0; 
              }
              .relatorio-secao h3 { 
                font-size: 14px; 
                font-weight: bold; 
                margin: 0 0 10px 0; 
                color: #333; 
                border-bottom: 1px solid #ccc; 
                padding-bottom: 5px; 
              }
              .relatorio-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 20px; 
                margin: 15px 0; 
              }
              .relatorio-tabela { 
                margin: 20px 0; 
              }
              .relatorio-tabela table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 0; 
              }
              .relatorio-tabela th, .relatorio-tabela td { 
                border: 1px solid #333; 
                padding: 8px; 
                text-align: left; 
                font-size: 11px; 
              }
              .relatorio-tabela th { 
                background-color: #f0f0f0; 
                font-weight: bold; 
                color: #333; 
              }
              .relatorio-rodape { 
                text-align: center; 
                margin-top: 30px; 
                padding-top: 20px; 
                border-top: 1px solid #ccc; 
                font-size: 10px; 
                color: #666; 
              }
              @media print {
                body { margin: 0; padding: 15px; }
              }
            </style>
          </head>
          <body>
            <div class="relatorio-impressao">
              <div class="relatorio-cabecalho">
                <div class="relatorio-titulo">ORDEM DE SERVIÇO</div>
                <div class="relatorio-info">Nº ${os.numero_os}</div>
              </div>

            <div class="relatorio-secao">
              <div class="relatorio-grid">
                <div>
                  <h3>Dados da OS</h3>
                  <div style="font-size: 11px; line-height: 1.6;">
                    <div><strong>Número:</strong> ${os.numero_os}</div>
                    <div><strong>Status:</strong> ${os.status.replace(/_/g, ' ').replace(/\\b\\w/g, (l) => l.toUpperCase())}</div>
                    <div><strong>Fábrica:</strong> ${os.fabrica || 'N/A'}</div>
                    <div><strong>Data de Abertura:</strong> ${formatDate(os.data_abertura)}</div>
                    ${os.data_fim ? `<div><strong>Data de Finalização:</strong> ${formatDate(os.data_fim)}</div>` : ''}
                    <div><strong>Tempo Previsto:</strong> ${os.tempo_execucao_previsto || 0}h</div>
                    <div><strong>Tempo Real:</strong> ${os.tempo_execucao_real || 0}h</div>
                  </div>
                </div>
                <div>
                  <h3>Dados do Cliente</h3>
                  <div style="font-size: 11px; line-height: 1.6;">
                    <div><strong>Nome:</strong> ${os.cliente?.nome || 'N/A'}</div>
                    <div><strong>CPF/CNPJ:</strong> ${os.cliente?.cpf_cnpj || 'N/A'}</div>
                    <div><strong>Telefone:</strong> ${os.cliente?.telefone || 'N/A'}</div>
                    <div><strong>Email:</strong> ${os.cliente?.email || 'N/A'}</div>
                    <div><strong>Endereço:</strong> ${os.cliente?.endereco || 'N/A'}</div>
                    <div><strong>Cidade/UF:</strong> ${os.cliente?.cidade || 'N/A'} / ${os.cliente?.estado || 'N/A'}</div>
                    <div><strong>CEP:</strong> ${os.cliente?.cep || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="relatorio-secao">
              <h3>Descrição dos Serviços</h3>
              <div style="background-color: #f9f9f9; padding: 10px; border: 1px solid #ccc; font-size: 11px;">
                ${os.descricao.replace(/\\n/g, '<br>')}
              </div>
            </div>

            <div class="relatorio-secao">
              <h3>Produtos Utilizados</h3>
              <div class="relatorio-tabela">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Descrição</th>
                      <th>Qtd.</th>
                      <th>Unidade</th>
                      <th>Valor Unit.</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${os.produtos.map(produto => `
                      <tr>
                        <td>${produto.produtos?.nome || 'N/A'}</td>
                        <td>${produto.produtos?.descricao || '-'}</td>
                        <td style="text-align: center;">${produto.quantidade}</td>
                        <td style="text-align: center;">${produto.produtos?.unidade || 'UN'}</td>
                        <td style="text-align: right;">${formatCurrency(produto.preco_unitario)}</td>
                        <td style="text-align: right; font-weight: bold;">${formatCurrency(produto.subtotal)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="relatorio-secao">
              <h3>Resumo Financeiro</h3>
              <div class="relatorio-resumo">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <span style="font-weight: bold;">Valor Total:</span>
                  <span style="font-size: 16px; font-weight: bold;">${formatCurrency(totalProdutos)}</span>
                </div>
                ${os.desconto_valor && os.desconto_valor > 0 ? `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <span style="font-weight: bold;">Desconto:</span>
                  <span style="font-size: 16px; font-weight: bold; color: #dc2626;">
                    ${os.desconto_tipo === 'percentual' 
                      ? `${((os.desconto_valor / totalProdutos) * 100).toFixed(2)}%`
                      : formatCurrency(os.desconto_valor)
                    }
                  </span>
                </div>
                ` : ''}
                <div class="total-final" style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: bold; font-size: 18px;">Total com Desconto:</span>
                  <span style="font-size: 20px; font-weight: bold; color: #059669;">
                    ${formatCurrency(os.valor_total_com_desconto || totalProdutos)}
                  </span>
                </div>
              </div>
            </div>

            ${os.colaboradores.length > 0 ? `
            <div class="relatorio-secao">
              <h3>Colaboradores Envolvidos</h3>
              <div style="font-size: 11px;">
                ${os.colaboradores.map(colab => colab.colaborador?.nome || 'N/A').join(', ')}
              </div>
            </div>
            ` : ''}

            ${os.observacoes ? `
            <div class="relatorio-secao">
              <h3>Observações</h3>
              <div style="background-color: #f9f9f9; padding: 10px; border: 1px solid #ccc; font-size: 11px;">
                ${os.observacoes.replace(/\\n/g, '<br>')}
              </div>
            </div>
            ` : ''}

            <div class="relatorio-rodape" style="text-align: center;">
              Metalma Inox & Cia - Sistema de Controle de OS<br/>
              Relatório gerado em: ${formatDate(new Date().toISOString())}
            </div>
          </div>
        </body>
        </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    } */
  };

  const handleExportPDFOSDetail = () => {
    if (selectedOSDetail) {
      try {
        const os = selectedOSDetail;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        
        // Configurações da página
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPosition = 15;

        // Adicionar logo ao PDF
        doc.addImage(logo, 'PNG', pageWidth / 2 - 25, yPosition, 50, 18);
          yPosition += 26;

          // Cabeçalho
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('ORDEM DE SERVIÇO', pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 10;

          doc.setFontSize(12);
          doc.text(`Nº ${os.numero_os}`, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 14;

        // Dados da OS
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Dados da OS', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Número: ${os.numero_os}`, 20, yPosition);
        yPosition += 6;
        doc.text(`Status: ${os.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}`, 20, yPosition);
        yPosition += 6;
        doc.text(`Fábrica: ${os.fabrica || 'N/A'}`, 20, yPosition);
        yPosition += 6;
        doc.text(`Data de Abertura: ${formatDate(os.data_abertura)}`, 20, yPosition);
        yPosition += 6;
        if (os.data_fim) {
          doc.text(`Data de Finalização: ${formatDate(os.data_fim)}`, 20, yPosition);
          yPosition += 6;
        }
        doc.text(`Tempo Previsto: ${os.tempo_execucao_previsto || 0}h`, 20, yPosition);
        yPosition += 6;
        doc.text(`Tempo Real: ${os.tempo_execucao_real || 0}h`, 20, yPosition);
        yPosition += 15;

        // Dados do Cliente
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Dados do Cliente', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Nome: ${os.cliente?.nome || 'N/A'}`, 20, yPosition);
        yPosition += 6;
        doc.text(`CPF/CNPJ: ${os.cliente?.cpf_cnpj || 'N/A'}`, 20, yPosition);
        yPosition += 6;
        doc.text(`Telefone: ${os.cliente?.telefone || 'N/A'}`, 20, yPosition);
        yPosition += 6;
        doc.text(`Email: ${os.cliente?.email || 'N/A'}`, 20, yPosition);
        yPosition += 6;
        doc.text(`Endereço: ${os.cliente?.endereco || 'N/A'}`, 20, yPosition);
        yPosition += 6;
        doc.text(`Cidade/UF: ${os.cliente?.cidade || 'N/A'} / ${os.cliente?.estado || 'N/A'}`, 20, yPosition);
        yPosition += 6;
        doc.text(`CEP: ${os.cliente?.cep || 'N/A'}`, 20, yPosition);
        yPosition += 15;

        // Descrição dos Serviços
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Descrição dos Serviços', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const descricaoLines = doc.splitTextToSize(os.descricao, pageWidth - 40);
        doc.text(descricaoLines, 20, yPosition);
        yPosition += descricaoLines.length * 5 + 10;

        // Produtos
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Produtos Utilizados', 20, yPosition);
        yPosition += 10;

        // Tabela de produtos
        const produtosData = os.produtos.map(produto => [
          produto.produtos?.nome || 'N/A',
          produto.produtos?.descricao || '-',
          produto.quantidade.toString(),
          produto.produtos?.unidade || 'UN',
          formatCurrency(produto.preco_unitario),
          formatCurrency(produto.subtotal)
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Produto', 'Descrição', 'Qtd.', 'Unidade', 'Valor Unit.', 'Subtotal']],
          body: produtosData,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [240, 240, 240] },
          margin: { left: 15, right: 15 },
          columnStyles: {
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'right' },
            5: { halign: 'right' }
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;

        // Resumo Financeiro
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumo Financeiro', 20, yPosition);
        yPosition += 10;

        const totalProdutos = os.produtos.reduce(
          (total, produto) => total + (produto.subtotal || 0),
          0
        );

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Valor Total: ${formatCurrency(totalProdutos)}`, 20, yPosition);
        yPosition += 6;

        if (os.desconto_valor && os.desconto_valor > 0) {
          const descontoText = os.desconto_tipo === 'percentual' 
            ? `${((os.desconto_valor / totalProdutos) * 100).toFixed(2)}%`
            : formatCurrency(os.desconto_valor);
          doc.text(`Desconto: ${descontoText}`, 20, yPosition);
          yPosition += 6;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`Total com Desconto: ${formatCurrency(os.valor_total_com_desconto || totalProdutos)}`, 20, yPosition);
        yPosition += 15;

        // Observações
        if (os.observacoes) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Observações', 20, yPosition);
          yPosition += 10;

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const observacoesLines = doc.splitTextToSize(os.observacoes, pageWidth - 40);
          doc.text(observacoesLines, 20, yPosition);
        }

        // Rodapé centralizado
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Metalma Inox & Cia - Sistema de Controle de OS', pageWidth / 2, pageHeight - 20, { align: 'center' });
        doc.text(`Relatório gerado em: ${formatDate(new Date().toISOString())}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

        const fileName = `OS_${os.numero_os.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        doc.save(fileName);
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF: ' + error.message);
      }
    }
  };

  const renderTableContent = () => {
    if (!reportData) return '';

    switch (reportData.type) {
      case 'produtividade':
        return `
          <th>Colaborador</th>
          <th>Horas Trabalhadas</th>
          <th>Horas Debitadas</th>
          <th>Horas Líquidas</th>
          <th>Meta (h)</th>
          <th>Eficiência (%)</th>
          <th>Paradas Material</th>
        `;
      case 'paradas':
        return `
          <th>OS</th>
          <th>Colaborador</th>
          <th>Motivo</th>
          <th>Data Início</th>
          <th>Duração (h)</th>
        `;
      case 'retrabalhos':
        return `
          <th>OS</th>
          <th>Cliente</th>
          <th>Colaborador</th>
          <th>Motivo</th>
          <th>Horas Debitadas</th>
          <th>Data</th>
        `;
      case 'os_status':
        return `
          <th>Status</th>
          <th>Quantidade</th>
          <th>Percentual</th>
        `;
      case 'tempo':
        return `
          <th>OS</th>
          <th>Cliente</th>
          <th>Tempo Real</th>
          <th>Tempo Parada</th>
          <th>Tempo Previsto</th>
          <th>Eficiência (%)</th>
          <th>Status</th>
        `;
      case 'emissao_os':
        return `
          <th>OS</th>
          <th>Fábrica</th>
          <th>Cliente</th>
          <th>Data</th>
          <th>Status</th>
          <th>Valor Total</th>
          <th>Desconto</th>
          <th>Total Final</th>
          <th>Justificativas</th>
        `;
      default:
        return '';
    }
  };

  const renderTableRows = () => {
    if (!reportData) return '';

    switch (reportData.type) {
      case 'produtividade':
        return reportData.data
          .map(
            (colab, index) => `
          <tr>
            <td style="font-weight: bold;">${colab.nome}</td>
            <td>${formatHours(colab.horas_trabalhadas)}</td>
            <td title="Horas debitadas de retrabalhos">${formatHours(colab.horas_debitadas || 0)}</td>
            <td title="Horas líquidas = trabalhadas - debitadas">${formatHours(Math.max(0, (colab.horas_trabalhadas||0) - (colab.horas_debitadas||0)))}</td>
            <td>${formatHours(colab.meta_hora)}</td>
            <td>${colab.eficiencia.toFixed(1)}%</td>
            <td>${colab.paradas_material}</td>
          </tr>
        `
          )
          .join('');
      case 'paradas':
        return reportData.data
          .map(
            (parada, index) => `
          <tr>
            <td style="font-weight: bold;">${parada.os_numero}</td>
            <td>${parada.colaborador}</td>
            <td>${parada.motivo}</td>
            <td>${formatDate(parada.data_inicio)}</td>
            <td>${formatHours(parada.duracao)}</td>
          </tr>
        `
          )
          .join('');
      case 'retrabalhos':
        return reportData.data
          .map(
            (r, index) => `
          <tr>
            <td style="font-weight: bold;">${r.os_numero}</td>
            <td>${r.cliente}</td>
            <td>${r.colaborador}</td>
            <td>${r.motivo}</td>
            <td>${formatHours(r.horas)}</td>
            <td>${formatDate(r.data)}</td>
          </tr>
        `
          )
          .join('');
      case 'os_status':
        return reportData.data
          .map(
            (status, index) => `
          <tr>
            <td style="font-weight: bold;">${status.status}</td>
            <td>${status.quantidade}</td>
            <td>${status.percentual.toFixed(1)}%</td>
          </tr>
        `
          )
          .join('');
      case 'tempo':
        return reportData.data
          .map(
            (tempo, index) => `
          <tr>
            <td style="font-weight: bold;">${tempo.os_numero}</td>
            <td>${tempo.cliente}</td>
            <td>${formatHours(tempo.tempo_execucao_real)}</td>
            <td>${formatHours(tempo.tempo_parada)}</td>
            <td>${formatHours(tempo.tempo_previsto)}</td>
            <td>${tempo.eficiencia.toFixed(1)}%</td>
            <td>${tempo.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</td>
          </tr>
        `
          )
          .join('');
      case 'emissao_os':
        return reportData.data
          .map(
            (os, index) => `
          <tr>
            <td style="font-weight: bold;">${os.numero_os}</td>
            <td>${os.fabrica || 'N/A'}</td>
            <td>${os.cliente?.nome || 'N/A'}</td>
            <td>${formatDate(os.data_abertura)}</td>
            <td>${os.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</td>
            <td>${formatCurrency(os.valor_total)}</td>
            <td>${os.desconto_valor ? formatCurrency(os.desconto_valor) : '-'}</td>
            <td>${formatCurrency(os.valor_total_com_desconto || os.valor_total)}</td>
            <td>${os.justificativas && os.justificativas.length > 0 
              ? os.justificativas.map(j => `${j.tipo === 'pausa' ? 'Pausa' : 'Parada'}: ${j.justificativa}`).join('; ')
              : '-'
            }</td>
          </tr>
        `
          )
          .join('');
      default:
        return '';
    }
  };

  // Funções JSX para renderizar na tela
  const renderTableContentJSX = () => {
    if (!reportData) return null;

    switch (reportData.type) {
      case 'produtividade':
        return (
          <>
            <TableHead>Colaborador</TableHead>
            <TableHead>Horas Trabalhadas</TableHead>
            <TableHead title="Horas debitadas de retrabalhos">Horas Debitadas</TableHead>
            <TableHead title="Horas líquidas = trabalhadas - debitadas">Horas Líquidas</TableHead>
            <TableHead>Meta (h)</TableHead>
            <TableHead>Eficiência (%)</TableHead>
            <TableHead>Paradas Material</TableHead>
          </>
        );
      case 'paradas':
        return (
          <>
            <TableHead>OS</TableHead>
            <TableHead>Colaborador</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Data Início</TableHead>
            <TableHead>Duração (h)</TableHead>
          </>
        );
      case 'retrabalhos':
        return (
          <>
            <TableHead>OS</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Colaborador</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Horas Debitadas</TableHead>
            <TableHead>Data</TableHead>
          </>
        );
      case 'os_status':
        return (
          <>
            <TableHead>Status</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead>Percentual</TableHead>
          </>
        );
      case 'tempo':
        return (
          <>
            <TableHead>OS</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Tempo Real</TableHead>
            <TableHead>Tempo Parada</TableHead>
            <TableHead>Tempo Previsto</TableHead>
            <TableHead>Eficiência (%)</TableHead>
            <TableHead>Status</TableHead>
          </>
        );
      case 'emissao_os':
        return (
          <>
            <TableHead>OS</TableHead>
            <TableHead>Fábrica</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Valor Total</TableHead>
            <TableHead>Desconto</TableHead>
            <TableHead>Total Final</TableHead>
            <TableHead>Justificativas</TableHead>
          </>
        );
      default:
        return null;
    }
  };

  const renderTableRowsJSX = () => {
    if (!reportData) return null;

    switch (reportData.type) {
      case 'produtividade':
        return reportData.data.map((colab, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{colab.nome}</TableCell>
            <TableCell>{formatHours(colab.horas_trabalhadas)}</TableCell>
            <TableCell title="Horas debitadas de retrabalhos">{formatHours(colab.horas_debitadas || 0)}</TableCell>
            <TableCell title="Horas líquidas = trabalhadas - debitadas">{formatHours(Math.max(0, (colab.horas_trabalhadas||0) - (colab.horas_debitadas||0)))}</TableCell>
            <TableCell>{formatHours(colab.meta_hora)}</TableCell>
            <TableCell>
              <Badge
                variant={
                  colab.eficiencia >= 80
                    ? 'default'
                    : colab.eficiencia >= 60
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {colab.eficiencia.toFixed(1)}%
              </Badge>
            </TableCell>
            <TableCell>{colab.paradas_material}</TableCell>
          </TableRow>
        ));
      case 'paradas':
        return reportData.data.map((parada, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{parada.os_numero}</TableCell>
            <TableCell>{parada.colaborador}</TableCell>
            <TableCell>{parada.motivo}</TableCell>
            <TableCell>{formatDate(parada.data_inicio)}</TableCell>
            <TableCell>{formatHours(parada.duracao)}</TableCell>
          </TableRow>
        ));
      case 'retrabalhos':
        return reportData.data.map((r, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{r.os_numero}</TableCell>
            <TableCell>{r.cliente}</TableCell>
            <TableCell>{r.colaborador}</TableCell>
            <TableCell>{r.motivo}</TableCell>
            <TableCell>{formatHours(r.horas)}</TableCell>
            <TableCell>{formatDate(r.data)}</TableCell>
          </TableRow>
        ));
      case 'os_status':
        return reportData.data.map((status, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{status.status}</TableCell>
            <TableCell>{status.quantidade}</TableCell>
            <TableCell>{status.percentual.toFixed(1)}%</TableCell>
          </TableRow>
        ));
      case 'tempo':
        return reportData.data.map((tempo, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{tempo.os_numero}</TableCell>
            <TableCell>{tempo.cliente}</TableCell>
            <TableCell>{formatHours(tempo.tempo_execucao_real)}</TableCell>
            <TableCell>{formatHours(tempo.tempo_parada)}</TableCell>
            <TableCell>{formatHours(tempo.tempo_previsto)}</TableCell>
            <TableCell>
              <Badge
                variant={
                  tempo.eficiencia >= 80
                    ? 'default'
                    : tempo.eficiencia >= 60
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {tempo.eficiencia.toFixed(1)}%
              </Badge>
            </TableCell>
            <TableCell>
              <Badge className={`status-${tempo.status.replace('_', '-')}`}>
                {tempo.status
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </Badge>
            </TableCell>
          </TableRow>
        ));
      case 'emissao_os':
        return reportData.data.map((os, index) => (
          <TableRow key={index} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedOSDetail(os)}>
            <TableCell className="font-medium">{os.numero_os}</TableCell>
            <TableCell>{os.fabrica || 'N/A'}</TableCell>
            <TableCell>{os.cliente?.nome || 'N/A'}</TableCell>
            <TableCell>{formatDate(os.data_abertura)}</TableCell>
            <TableCell>
              <Badge className={`status-${os.status.replace('_', '-')}`}>
                {os.status
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </Badge>
            </TableCell>
            <TableCell>{formatCurrency(os.valor_total)}</TableCell>
            <TableCell>
              {os.desconto_valor ? formatCurrency(os.desconto_valor) : '-'}
            </TableCell>
            <TableCell className="font-medium">
              {formatCurrency(os.valor_total_com_desconto || os.valor_total)}
            </TableCell>
            <TableCell>
              {os.justificativas && os.justificativas.length > 0 ? (
                <div className="space-y-1">
                  {os.justificativas.map((just, idx) => (
                    <div key={idx} className="text-xs">
                      <Badge 
                        variant={just.tipo === 'pausa' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {just.tipo === 'pausa' ? 'Pausa' : 'Parada'}
                      </Badge>
                      <div className="mt-1 text-muted-foreground">
                        {just.justificativa.length > 30 
                          ? `${just.justificativa.substring(0, 30)}...` 
                          : just.justificativa
                        }
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">-</span>
              )}
            </TableCell>
          </TableRow>
        ));
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-gray-600">
          Visualize os dados e o desempenho da sua operação
        </p>
      </div>

      <Tabs defaultValue="operacionais" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="operacionais" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Operacionais
          </TabsTrigger>
          <TabsTrigger value="financeiros" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financeiros
          </TabsTrigger>
          <TabsTrigger value="produtividade" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Produtividade
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operacionais" className="space-y-6">

      {/* Seleção de Relatório */}
      <Card>
        <CardHeader>
          <CardTitle>Seleção de Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <Button
                  key={report.id}
                  variant={selectedReport === report.id ? 'default' : 'outline'}
                  className="flex h-auto flex-col items-center gap-2 p-4"
                  onClick={() => setSelectedReport(report.id)}
                >
                  <Icon className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">{report.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {report.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes">Mês atual</SelectItem>
                  <SelectItem value="semana">Semana atual</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedReport === 'emissao_os' && (
              <>
                <div className="space-y-2">
                  <Label>Número da OS</Label>
                  <Input
                    placeholder="Ex: OS0001/2024"
                    value={osNumberFilter}
                    onChange={(e) => setOsNumberFilter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fábrica</Label>
                  <Select value={fabricaFilter} onValueChange={setFabricaFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as fábricas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="Metalma">Metalma</SelectItem>
                      <SelectItem value="Galpão">Galpão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Justificativa</Label>
                  <Select value={justificativaFilter} onValueChange={setJustificativaFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as OS" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas as OS</SelectItem>
                      <SelectItem value="com">Com Justificativa</SelectItem>
                      <SelectItem value="sem">Sem Justificativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="incluir-excluidas"
                      checked={incluirExcluidas}
                      onCheckedChange={setIncluirExcluidas}
                    />
                    <Label htmlFor="incluir-excluidas" className="text-sm font-medium">
                      Incluir OS Excluídas
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Inclui no relatório as OS que foram excluídas do sistema com seus motivos
                  </p>
                </div>
              </>
            )}

            {period === 'personalizado' && (
              <>
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start')}>
                        {startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Selecione a data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ? new Date(startDate) : undefined}
                        onSelect={(date:any) => {
                          if (!date) return;
                          const iso = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
                            .toISOString().slice(0,10);
                          setStartDate(iso);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start')}>
                        {endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Selecione a data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate ? new Date(endDate) : undefined}
                        onSelect={(date:any) => {
                          if (!date) return;
                          const iso = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
                            .toISOString().slice(0,10);
                          setEndDate(iso);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select value={colabFilter} onValueChange={setColabFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os colaboradores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os colaboradores</SelectItem>
                  {colaboradores.map((colab) => (
                    <SelectItem key={colab.id} value={colab.id}>
                      {colab.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clienteFilter} onValueChange={setClienteFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os clientes</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="mt-6 flex gap-2">
            <Button onClick={generateReport} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Gerar Relatório
                </>
              )}
            </Button>

            {reportData && (
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
            )}
            {!reportData && (
              <div className="text-sm text-muted-foreground">
                Gere um relatório primeiro para poder imprimir
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados do Relatório</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>{renderTableContentJSX()}</TableRow>
              </TableHeader>
              <TableBody>{renderTableRowsJSX()}</TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Relatório Detalhado de OS */}
      {selectedOSDetail && (
        <OSReportDetail
          osData={selectedOSDetail}
          onPrint={handlePrintOSDetail}
          onExportPDF={handleExportPDFOSDetail}
        />
      )}
        </TabsContent>

        <TabsContent value="financeiros">
          <RelatoriosFinanceiros />
        </TabsContent>

        <TabsContent value="produtividade" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios de Produtividade</CardTitle>
              <CardDescription>
                Análise de performance e eficiência dos colaboradores
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-muted/30 p-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="period">Período</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hoje">Hoje</SelectItem>
                      <SelectItem value="semana">Esta Semana</SelectItem>
                      <SelectItem value="mes">Este Mês</SelectItem>
                      <SelectItem value="trimestre">Este Trimestre</SelectItem>
                      <SelectItem value="ano">Este Ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="colabFilter">Colaborador</Label>
                  <Select value={colabFilter} onValueChange={setColabFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {colaboradores.map((colab) => (
                        <SelectItem key={colab.id} value={colab.id}>
                          {colab.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate">Data Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start')}>
                        {startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Selecione a data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ? new Date(startDate) : undefined}
                        onSelect={(date:any) => {
                          if (!date) return;
                          const iso = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
                            .toISOString().slice(0,10);
                          setStartDate(iso);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="endDate">Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start')}>
                        {endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Selecione a data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate ? new Date(endDate) : undefined}
                        onSelect={(date:any) => {
                          if (!date) return;
                          const iso = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
                            .toISOString().slice(0,10);
                          setEndDate(iso);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="mb-4 flex justify-between">
                <div className="flex gap-2">
                  <Button onClick={fetchProdutividadeReport} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Gerar Relatório
                  </Button>
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar Filtros
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={exportProdutividadePDF}
                    disabled={!reportData}
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar PDF
                  </Button>
                </div>
              </div>

              {/* Resultados */}
              {reportData && reportData.produtividade && (
                <div className="space-y-6">
                  {/* Cards de métricas */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total de Horas
                        </CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportData.produtividade.totalHoras.toFixed(1)}h
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {reportData.produtividade.totalDias} dias trabalhados
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Média Diária
                        </CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportData.produtividade.mediaDiaria.toFixed(1)}h
                        </div>
                        <p className="text-xs text-muted-foreground">
                          por colaborador
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Eficiência
                        </CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportData.produtividade.eficienciaGeral.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          média geral
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          OS Concluídas
                        </CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportData.produtividade.osConcluidas}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          de {reportData.produtividade.totalOS} total
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tabela de colaboradores */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Produtividade por Colaborador</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Colaborador</TableHead>
                            <TableHead>Horas Trabalhadas</TableHead>
                            <TableHead>OS Concluídas</TableHead>
                            <TableHead>Eficiência</TableHead>
                            <TableHead>Média Diária</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.produtividade.colaboradores.map((colab, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{colab.nome}</TableCell>
                              <TableCell>{colab.horasTrabalhadas.toFixed(1)}h</TableCell>
                              <TableCell>{colab.osConcluidas}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    colab.eficiencia >= 80
                                      ? 'default'
                                      : colab.eficiencia >= 60
                                        ? 'secondary'
                                        : 'destructive'
                                  }
                                >
                                  {colab.eficiencia.toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell>{colab.mediaDiaria.toFixed(1)}h</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!reportData && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Configure os filtros e clique em "Gerar Relatório" para ver os dados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios de Segurança</CardTitle>
              <CardDescription>
                Monitoramento de acessos e atividades do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-muted/30 p-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="period">Período</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hoje">Hoje</SelectItem>
                      <SelectItem value="semana">Esta Semana</SelectItem>
                      <SelectItem value="mes">Este Mês</SelectItem>
                      <SelectItem value="trimestre">Este Trimestre</SelectItem>
                      <SelectItem value="ano">Este Ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate">Data Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start')}>
                        {startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Selecione a data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ? new Date(startDate) : undefined}
                        onSelect={(date:any) => {
                          if (!date) return;
                          const iso = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
                            .toISOString().slice(0,10);
                          setStartDate(iso);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="endDate">Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start')}>
                        {endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Selecione a data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate ? new Date(endDate) : undefined}
                        onSelect={(date:any) => {
                          if (!date) return;
                          const iso = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
                            .toISOString().slice(0,10);
                          setEndDate(iso);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="eventType">Tipo de Evento</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="logout">Logout</SelectItem>
                      <SelectItem value="failed_login">Tentativa de Login</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="mb-4 flex justify-between">
                <div className="flex gap-2">
                  <Button onClick={fetchSegurancaReport} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Gerar Relatório
                  </Button>
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar Filtros
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={exportSegurancaPDF}
                    disabled={!reportData}
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar PDF
                  </Button>
                </div>
              </div>

              {/* Resultados */}
              {reportData && reportData.seguranca && (
                <div className="space-y-6">
                  {/* Cards de métricas */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total de Acessos
                        </CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportData.seguranca.totalAcessos}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          no período
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Logins Bem-sucedidos
                        </CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {reportData.seguranca.loginsSucesso}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {reportData.seguranca.percentualSucesso.toFixed(1)}% do total
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Tentativas Falhadas
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          {reportData.seguranca.loginsFalha}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {reportData.seguranca.percentualFalha.toFixed(1)}% do total
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Usuários Únicos
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportData.seguranca.usuariosUnicos}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ativos no período
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tabela de auditoria */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Log de Auditoria</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Evento</TableHead>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>IP</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.seguranca.logs.map((log, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{log.nome_usuario || 'N/A'}</TableCell>
                              <TableCell>{log.email_usuario || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    log.tipo_evento === 'login'
                                      ? 'default'
                                      : log.tipo_evento === 'logout'
                                        ? 'secondary'
                                        : 'destructive'
                                  }
                                >
                                  {log.tipo_evento === 'login' ? 'Login' : 
                                   log.tipo_evento === 'logout' ? 'Logout' : 
                                   'Tentativa Falhada'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {log.data_hora 
                                  ? new Date(log.data_hora).toLocaleString('pt-BR')
                                  : 'N/A'
                                }
                              </TableCell>
                              <TableCell>{log.ip_address || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    log.tipo_evento === 'login' || log.tipo_evento === 'logout'
                                      ? 'default'
                                      : 'destructive'
                                  }
                                >
                                  {log.tipo_evento === 'login' || log.tipo_evento === 'logout'
                                    ? 'Sucesso'
                                    : 'Falha'
                                  }
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!reportData && (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Configure os filtros e clique em "Gerar Relatório" para ver os dados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
