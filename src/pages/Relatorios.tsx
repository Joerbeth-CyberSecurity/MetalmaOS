import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import {
  Card,
  CardContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  Loader2,
  FileText,
  Download,
  Printer,
  Users,
  BarChart3,
  Clock,
  AlertTriangle,
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOSDetail, setSelectedOSDetail] = useState(null);

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

  const getDateRange = () => {
    const now = new Date();
    if (period === 'mes') {
      return {
        start: startOfMonth(now).toISOString(),
        end: endOfMonth(now).toISOString(),
      };
    } else if (period === 'semana') {
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
        end: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
      };
    } else if (period === 'personalizado') {
      return {
        start: startDate ? new Date(startDate).toISOString() : startOfMonth(now).toISOString(),
        end: endDate ? new Date(endDate).toISOString() : endOfMonth(now).toISOString(),
      };
    } else {
      return {
        start: startOfMonth(now).toISOString(),
        end: endOfMonth(now).toISOString(),
      };
    }
  };

  const generateReport = async () => {
    setLoading(true);

    try {
      const { start, end } = getDateRange();

      switch (selectedReport) {
        case 'produtividade':
          await generateProdutividadeReport(start, end);
          break;
        case 'paradas':
          await generateParadasReport(start, end);
          break;
        case 'os_status':
          await generateOsStatusReport(start, end);
          break;
        case 'tempo':
          await generateTempoReport(start, end);
          break;
        case 'emissao_os':
          await generateEmissaoOSReport(start, end);
          break;
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setLoading(false);
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

      // Processar dados
      const colabMap = {};

      (colaboradores || []).forEach((colab) => {
        colabMap[colab.id] = {
          nome: colab.nome,
          meta_hora: colab.meta_hora || 0,
          horas_trabalhadas: 0,
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

      // Calcular eficiência
      Object.values(colabMap).forEach((colab) => {
        colab.eficiencia =
          colab.meta_hora > 0
            ? Math.min(100, (colab.horas_trabalhadas / colab.meta_hora) * 100)
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
        os_numero: p.os?.numero_os || 'N/A',
        colaborador: p.colaborador?.nome || 'N/A',
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

  const generateOsStatusReport = async (start, end) => {
    try {
      const { data: ordens } = await supabase
        .from('ordens_servico')
        .select('status, data_abertura')
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
          percentual: total > 0 ? (quantidade / total) * 100 : 0,
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
      const tempoData = (ordens || []).map((os) => {
        // Calcular tempo real baseado nos registros de os_tempo
        const temposOS = (tempos || []).filter((t) => t.os_id === os.id);
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

      const { data: ordens, error } = await query;

      if (error) {
        console.error('Erro ao buscar OS:', error);
        return;
      }

      // Processar dados para o relatório
      const osData = (ordens || []).map((os) => ({
        numero_os: os.numero_os,
        cliente: os.clientes,
        descricao: os.descricao,
        status: os.status,
        data_abertura: os.data_abertura,
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
      }));

      setReportData({
        type: 'emissao_os',
        data: osData,
        period: { start, end },
        filters: { 
          cliente: clienteFilter,
          osNumber: osNumberFilter,
          startDate,
          endDate
        },
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de emissão de OS:', error);
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
              body { margin: 0; padding: 15px; }
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
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  // Função para exportar PDF
  const handleExportPDF = () => {
    console.log('Botão Exportar PDF clicado');
    console.log('reportData:', reportData);

    if (reportData) {
      try {
        const reportTitle = getReportTitle(reportData.type);
        console.log('Gerando PDF para:', reportTitle);

        // Teste simples primeiro
        const doc = new jsPDF();
        doc.text('Teste PDF - Metalma', 20, 20);
        doc.text(`Relatório: ${reportTitle}`, 20, 30);
        doc.text(`Data: ${formatDate(new Date().toISOString())}`, 20, 40);

        const fileName = `teste_${reportTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);
        console.log('PDF de teste salvo como:', fileName);

        alert('PDF gerado com sucesso! Verifique a pasta de downloads.');
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF: ' + error.message);
      }
    } else {
      console.log('Nenhum dado de relatório disponível');
      alert('Gere um relatório primeiro antes de exportar o PDF.');
    }
  };

  const formatHours = (hours) => `${hours.toFixed(1)}h`;
  const formatDate = (dateString) =>
    format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handlePrintOSDetail = () => {
    if (selectedOSDetail) {
      const printWindow = window.open('', '_blank');
      const os = selectedOSDetail;
      
      const totalProdutos = os.produtos.reduce(
        (total, produto) => total + (produto.subtotal || 0),
        0
      );

      // Converter logo para base64
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const logoBase64 = canvas.toDataURL('image/png');

        printWindow.document.write(`
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
                body { margin: 0; padding: 15px; }
              }
            </style>
          </head>
          <body>
            <div class="relatorio-impressao">
              <div class="relatorio-cabecalho">
                <img src="${logoBase64}" alt="Logo Metalma" class="relatorio-logo" />
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
      };
      
      img.onerror = () => {
        // Se a imagem não carregar, usar apenas texto
        printWindow.document.write(`
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
      };
      
      img.src = logo;
    }
  };

  const handleExportPDFOSDetail = () => {
    if (selectedOSDetail) {
      try {
        const os = selectedOSDetail;
        const doc = new jsPDF();
        
        // Configurações da página
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPosition = 20;

        // Converter logo para base64 e adicionar ao PDF
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          const logoBase64 = canvas.toDataURL('image/png');

          // Adicionar logo ao PDF
          doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 30, yPosition, 60, 20);
          yPosition += 35;

          // Cabeçalho
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('ORDEM DE SERVIÇO', pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 10;

          doc.setFontSize(12);
          doc.text(`Nº ${os.numero_os}`, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 20;

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
        };
        
        img.src = logo;
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
          <th>Cliente</th>
          <th>Data</th>
          <th>Status</th>
          <th>Valor Total</th>
          <th>Desconto</th>
          <th>Total Final</th>
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
            <td>${os.cliente?.nome || 'N/A'}</td>
            <td>${formatDate(os.data_abertura)}</td>
            <td>${os.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</td>
            <td>${formatCurrency(os.valor_total)}</td>
            <td>${os.desconto_valor ? formatCurrency(os.desconto_valor) : '-'}</td>
            <td>${formatCurrency(os.valor_total_com_desconto || os.valor_total)}</td>
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
            <TableHead>Cliente</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Valor Total</TableHead>
            <TableHead>Desconto</TableHead>
            <TableHead>Total Final</TableHead>
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
              <div className="space-y-2">
                <Label>Número da OS</Label>
                <Input
                  placeholder="Ex: OS0001/2024"
                  value={osNumberFilter}
                  onChange={(e) => setOsNumberFilter(e.target.value)}
                />
              </div>
            )}

            {period === 'personalizado' && (
              <>
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
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
    </div>
  );
}
