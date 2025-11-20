import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Download,
  Printer,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ComparacaoOrcamentoOS {
  orcamento_id: string;
  numero_orcamento: string;
  os_id: string;
  numero_os: string;
  cliente_nome: string;
  valor_orcamento: number;
  valor_os: number;
  diferenca: number;
  percentual_variacao: number;
  status_os: string;
  data_abertura_orcamento: string;
  data_abertura_os: string;
}

export default function RelatorioFinanceiroOrcamentoOS() {
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<ComparacaoOrcamentoOS[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteFilter, setClienteFilter] = useState('todos');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState('todos');
  const { toast } = useToast();

  useEffect(() => {
    fetchClientes();
    fetchDados();
  }, [clienteFilter, startDate, endDate, statusFilter]);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const fetchDados = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('ordens_servico')
        .select(`
          id,
          numero_os,
          valor_total,
          status,
          data_abertura,
          orcamento_id,
          orcamentos (
            id,
            numero_orcamento,
            valor_total,
            data_abertura,
            clientes (
              nome
            )
          )
        `)
        .not('orcamento_id', 'is', null);

      // Aplicar filtros
      if (clienteFilter !== 'todos') {
        query = query.eq('orcamentos.cliente_id', clienteFilter);
      }

      if (startDate) {
        query = query.gte('data_abertura', startDate.toISOString());
      }

      if (endDate) {
        const endDatePlusOne = new Date(endDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        query = query.lt('data_abertura', endDatePlusOne.toISOString());
      }

      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.order('data_abertura', { ascending: false });

      if (error) throw error;

      // Processar dados para comparação
      const comparacoes: ComparacaoOrcamentoOS[] = (data || [])
        .filter((os: any) => os.orcamentos)
        .map((os: any) => {
          const valorOrcamento = parseFloat(os.orcamentos.valor_total) || 0;
          const valorOS = parseFloat(os.valor_total) || 0;
          // INVERTIDO: Orçamento - OS
          // Se positivo = lucro (gastou menos que orçou)
          // Se negativo = prejuízo (gastou mais que orçou)
          const diferenca = valorOrcamento - valorOS;
          const percentualVariacao = valorOrcamento > 0 
            ? (diferenca / valorOrcamento) * 100 
            : 0;

          return {
            orcamento_id: os.orcamentos.id,
            numero_orcamento: os.orcamentos.numero_orcamento,
            os_id: os.id,
            numero_os: os.numero_os,
            cliente_nome: os.orcamentos.clientes?.nome || 'N/A',
            valor_orcamento: valorOrcamento,
            valor_os: valorOS,
            diferenca: diferenca,
            percentual_variacao: percentualVariacao,
            status_os: os.status,
            data_abertura_orcamento: os.orcamentos.data_abertura,
            data_abertura_os: os.data_abertura,
          };
        });

      setDados(comparacoes);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: 'Erro ao buscar dados',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getDiferencaBadge = (diferenca: number, percentual: number) => {
    if (diferenca > 0) {
      return (
        <Badge variant="default" className="bg-green-600">
          <TrendingUp className="h-3 w-3 mr-1" />
          +{formatCurrency(diferenca)} ({percentual.toFixed(2)}%)
        </Badge>
      );
    } else if (diferenca < 0) {
      return (
        <Badge variant="destructive">
          <TrendingDown className="h-3 w-3 mr-1" />
          {formatCurrency(diferenca)} ({percentual.toFixed(2)}%)
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          {formatCurrency(0)} (0%)
        </Badge>
      );
    }
  };

  const calcularResumo = () => {
    const totalOrcamento = dados.reduce((sum, item) => sum + item.valor_orcamento, 0);
    const totalOS = dados.reduce((sum, item) => sum + item.valor_os, 0);
    // INVERTIDO: Orçamento - OS (positivo = lucro, negativo = prejuízo)
    const totalDiferenca = totalOrcamento - totalOS;
    const percentualTotal = totalOrcamento > 0 ? (totalDiferenca / totalOrcamento) * 100 : 0;
    // Lucro = diferença positiva (gastou menos que orçou)
    const lucro = dados.filter((item) => item.diferenca > 0).length;
    // Prejuízo = diferença negativa (gastou mais que orçou)
    const prejuizo = dados.filter((item) => item.diferenca < 0).length;
    const semVariacao = dados.filter((item) => item.diferenca === 0).length;

    return {
      totalOrcamento,
      totalOS,
      totalDiferenca,
      percentualTotal,
      lucro,
      prejuizo,
      semVariacao,
    };
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('METALMA INOX & CIA', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(16);
    doc.text('Relatório Financeiro: Orçamento vs OS', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Resumo
    const resumo = calcularResumo();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Resumo Geral', 15, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Orçamentos: ${formatCurrency(resumo.totalOrcamento)}`, 15, y);
    y += 5;
    doc.text(`Total OS: ${formatCurrency(resumo.totalOS)}`, 15, y);
    y += 5;
    doc.text(`Diferença Total: ${formatCurrency(resumo.totalDiferenca)}`, 15, y);
    y += 5;
    doc.text(`Variação Percentual: ${resumo.percentualTotal.toFixed(2)}%`, 15, y);
    y += 5;
    doc.text(`OS com Lucro: ${resumo.lucro}`, 15, y);
    y += 5;
    doc.text(`OS com Prejuízo: ${resumo.prejuizo}`, 15, y);
    y += 10;

    // Tabela
    const tableData = dados.map((item) => [
      item.numero_orcamento,
      item.numero_os,
      item.cliente_nome,
      formatCurrency(item.valor_orcamento),
      formatCurrency(item.valor_os),
      formatCurrency(item.diferenca),
      `${item.percentual_variacao.toFixed(2)}%`,
      item.status_os,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Orçamento', 'OS', 'Cliente', 'Valor Orç.', 'Valor OS', 'Diferença', 'Variação %', 'Status']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [240, 240, 240], textColor: 0 },
      margin: { left: 15, right: 15 },
    });

    // Rodapé
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      pageWidth / 2,
      finalY,
      { align: 'center' }
    );

    doc.save(`relatorio_financeiro_orcamento_os_${new Date().toISOString().split('T')[0]}.pdf`);

    toast({
      title: 'PDF exportado com sucesso!',
      description: 'Relatório financeiro foi exportado.',
    });
  };

  const resumo = calcularResumo();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatório Financeiro: Orçamento vs OS</h1>
          <p className="text-muted-foreground">
            Compare valores de orçamentos com suas respectivas ordens de serviço.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="cliente">Cliente</Label>
              <Select value={clienteFilter} onValueChange={setClienteFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status OS</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="finalizada">Finalizada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Data Final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    {endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setClienteFilter('todos');
                setStatusFilter('todos');
                setStartDate(undefined);
                setEndDate(undefined);
              }}
            >
              Limpar Filtros
            </Button>
            <Button onClick={fetchDados}>
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Orçamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(resumo.totalOrcamento)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total OS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(resumo.totalOS)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Diferença Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${resumo.totalDiferenca >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(resumo.totalDiferenca)}
            </div>
            <div className="text-xs text-muted-foreground">
              {resumo.percentualTotal.toFixed(2)}% de variação
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Análise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-sm text-green-600">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                Lucro: {resumo.lucro}
              </div>
              <div className="text-sm text-red-600">
                <TrendingDown className="h-3 w-3 inline mr-1" />
                Prejuízo: {resumo.prejuizo}
              </div>
              <div className="text-sm text-muted-foreground">
                Sem variação: {resumo.semVariacao}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Comparação Detalhada</CardTitle>
              <CardDescription>
                {dados.length} registro(s) encontrado(s)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Carregando dados...</p>
            </div>
          ) : dados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum dado encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orçamento</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor Orçamento</TableHead>
                    <TableHead className="text-right">Valor OS</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead className="text-right">Variação %</TableHead>
                    <TableHead>Status OS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.map((item) => (
                    <TableRow key={`${item.orcamento_id}-${item.os_id}`}>
                      <TableCell className="font-medium">{item.numero_orcamento}</TableCell>
                      <TableCell className="font-medium">{item.numero_os}</TableCell>
                      <TableCell>{item.cliente_nome}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.valor_orcamento)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.valor_os)}</TableCell>
                      <TableCell className="text-right">
                        {getDiferencaBadge(item.diferenca, item.percentual_variacao)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.percentual_variacao.toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.status_os}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

