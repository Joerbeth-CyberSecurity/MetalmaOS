import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Loader2, FileText, Download, Printer, Users, BarChart3, Clock, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logo from '../assets/logo.png';

export default function Relatorios() {
  const [selectedReport, setSelectedReport] = useState('produtividade');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [colaboradores, setColaboradores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [period, setPeriod] = useState('mes');
  const [colabFilter, setColabFilter] = useState('todos');
  const [clienteFilter, setClienteFilter] = useState('todos');

  const reportTypes = [
    {
      id: 'produtividade',
      title: 'Produtividade por Colaboradores',
      description: 'Análise de eficiência e horas trabalhadas',
      icon: Users
    },
    {
      id: 'paradas',
      title: 'Paradas por Falta de Material',
      description: 'Controle de interrupções',
      icon: AlertTriangle
    },
    {
      id: 'os_status',
      title: 'Status das Ordens de Serviço',
      description: 'Distribuição de OS por status',
      icon: BarChart3
    },
    {
      id: 'tempo',
      title: 'Controle do Tempo',
      description: 'Análise de tempo real vs previsto',
      icon: Clock
    }
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
        end: endOfMonth(now).toISOString() 
      };
    } else if (period === 'semana') {
      return { 
        start: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), 
        end: endOfWeek(now, { weekStartsOn: 1 }).toISOString() 
      };
    } else {
      return { 
        start: startOfMonth(now).toISOString(), 
        end: endOfMonth(now).toISOString() 
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
          os_finalizadas: 0
        };
      });

      (tempos || []).forEach((tempo) => {
        if (colabMap[tempo.colaborador_id]) {
          if (tempo.tipo === 'trabalho') {
            colabMap[tempo.colaborador_id].horas_trabalhadas += tempo.horas_calculadas || 0;
          } else if (tempo.tipo === 'parada_material') {
            colabMap[tempo.colaborador_id].paradas_material += 1;
          }
        }
      });

      // Calcular eficiência
      Object.values(colabMap).forEach((colab) => {
        colab.eficiencia = colab.meta_hora > 0 
          ? Math.min(100, (colab.horas_trabalhadas / colab.meta_hora) * 100) 
          : 0;
      });

      setReportData({
        type: 'produtividade',
        data: Object.values(colabMap),
        period: { start, end },
        filters: { colaborador: colabFilter }
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de produtividade:', error);
    }
  };

  const generateParadasReport = async (start, end) => {
    try {
      const { data: paradas } = await supabase
        .from('os_tempo')
        .select(`
          tipo,
          data_inicio,
          data_fim,
          motivo,
          os_id,
          colaborador:colaboradores(nome),
          os:ordens_servico(numero_os)
        `)
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
          ? (new Date(p.data_fim).getTime() - new Date(p.data_inicio).getTime()) / (1000 * 60 * 60)
          : 0
      }));

      setReportData({
        type: 'paradas',
        data: paradasData,
        period: { start, end },
        filters: { colaborador: colabFilter }
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

      const statusData = Object.entries(statusCount).map(([status, quantidade]) => ({
        status: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        quantidade,
        percentual: total > 0 ? (quantidade / total) * 100 : 0
      }));

      setReportData({
        type: 'os_status',
        data: statusData,
        period: { start, end },
        total
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
        .select(`
          numero_os,
          tempo_execucao_real,
          tempo_parada,
          tempo_execucao_previsto,
          status,
          data_abertura,
          cliente:clientes(nome)
        `)
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
        .select(`
          os_id,
          tipo,
          data_inicio,
          data_fim,
          horas_calculadas,
          motivo
        `)
        .gte('data_inicio', start)
        .lte('data_inicio', end);

      if (err2) {
        console.error('Erro ao buscar tempos:', err2);
        return;
      }

      // Processar dados combinando informações das duas tabelas
      const tempoData = (ordens || []).map((os) => {
        // Calcular tempo real baseado nos registros de os_tempo
        const temposOS = (tempos || []).filter(t => t.os_id === os.id);
        let tempoRealCalculado = 0;
        let tempoParadaCalculado = 0;

        temposOS.forEach(tempo => {
          if (tempo.tipo === 'trabalho') {
            // Calcular horas se data_fim existe, senão usar horas_calculadas
            if (tempo.data_fim && tempo.data_inicio) {
              const duracao = (new Date(tempo.data_fim).getTime() - new Date(tempo.data_inicio).getTime()) / (1000 * 60 * 60);
              tempoRealCalculado += duracao;
            } else if (tempo.horas_calculadas) {
              tempoRealCalculado += tempo.horas_calculadas;
            }
          } else if (tempo.tipo === 'parada_material' || tempo.tipo === 'pausa') {
            if (tempo.data_fim && tempo.data_inicio) {
              const duracao = (new Date(tempo.data_fim).getTime() - new Date(tempo.data_inicio).getTime()) / (1000 * 60 * 60);
              tempoParadaCalculado += duracao;
            } else if (tempo.horas_calculadas) {
              tempoParadaCalculado += tempo.horas_calculadas;
            }
          }
        });

        // Usar dados calculados ou dados da OS (priorizar os calculados)
        const tempoReal = tempoRealCalculado > 0 ? tempoRealCalculado : (os.tempo_execucao_real || 0);
        const tempoParada = tempoParadaCalculado > 0 ? tempoParadaCalculado : (os.tempo_parada || 0);
        const tempoPrevisto = os.tempo_execucao_previsto || 0;

        return {
          os_numero: os.numero_os,
          cliente: os.cliente?.nome || 'N/A',
          tempo_execucao_real: tempoReal,
          tempo_parada: tempoParada,
          tempo_previsto: tempoPrevisto,
          status: os.status,
          data_abertura: os.data_abertura,
          eficiencia: tempoPrevisto > 0 ? Math.min(100, (tempoReal / tempoPrevisto) * 100) : 0
        };
      });

      setReportData({
        type: 'tempo',
        data: tempoData,
        period: { start, end },
        filters: { cliente: clienteFilter }
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de tempo:', error);
    }
  };

  const handlePreview = () => {
    if (reportData) {
      alert('Preview do relatório: ' + reportData.type);
    }
  };

  // Função para imprimir
  const handlePrint = () => {
    window.print();
  };

  // Função para exportar PDF
  const handleExportPDF = () => {
    window.print();
  };

  const formatHours = (hours) => `${hours.toFixed(1)}h`;
  const formatDate = (dateString) => format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });

  const renderTableContent = () => {
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
      default:
        return null;
    }
  };

  const renderTableRows = () => {
    if (!reportData) return null;

    switch (reportData.type) {
      case 'produtividade':
        return reportData.data.map((colab, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{colab.nome}</TableCell>
            <TableCell>{formatHours(colab.horas_trabalhadas)}</TableCell>
            <TableCell>{formatHours(colab.meta_hora)}</TableCell>
            <TableCell>
              <Badge variant={colab.eficiencia >= 80 ? "default" : colab.eficiencia >= 60 ? "secondary" : "destructive"}>
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
              <Badge variant={tempo.eficiencia >= 80 ? "default" : tempo.eficiencia >= 60 ? "secondary" : "destructive"}>
                {tempo.eficiencia.toFixed(1)}%
              </Badge>
            </TableCell>
            <TableCell>
              <Badge className={`status-${tempo.status.replace('_', '-')}`}>
                {tempo.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <Button
                  key={report.id}
                  variant={selectedReport === report.id ? "default" : "outline"}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setSelectedReport(report.id)}
                >
                  <Icon className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">{report.title}</div>
                    <div className="text-xs text-muted-foreground">{report.description}</div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select value={colabFilter} onValueChange={setColabFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os colaboradores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os colaboradores</SelectItem>
                  {colaboradores.map(colab => (
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
                  {clientes.map(cliente => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2 mt-6">
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
              <>
                <Button variant="outline" onClick={handlePreview}>
                  <FileText className="mr-2 h-4 w-4" />
                  Visualizar
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
                <Button variant="outline" onClick={handleExportPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
              </>
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
                <TableRow>
                  {renderTableContent()}
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderTableRows()}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 