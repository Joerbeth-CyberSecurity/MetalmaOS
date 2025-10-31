import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Calendar, 
  DollarSign, 
  User, 
  Search,
  Filter,
  MoreHorizontal,
  Play,
  CheckCircle,
  AlertCircle,
  X,
  Printer
} from 'lucide-react';
import { OrcamentoForm } from '@/components/OrcamentoForm';
import { TransformarOrcamentoDialog } from '@/components/TransformarOrcamentoDialog';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Orcamento {
  id: string;
  numero_orcamento: string;
  cliente_id: string;
  descricao: string;
  valor_total: number;
  percentual_aplicado: number;
  valor_final: number;
  status: string;
  data_abertura: string;
  data_prevista?: string;
  tempo_execucao_previsto?: string;
  meta_por_hora?: number;
  data_aprovacao?: string;
  data_vencimento?: string;
  observacoes?: string;
  clientes?: {
    nome: string;
    cpf_cnpj: string;
  };
  orcamento_produtos?: Array<{
    id: string;
    produto_id: string;
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
    produtos?: {
      nome: string;
      descricao: string;
      unidade: string;
    };
  }>;
}

export default function Orcamentos() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrcamento, setEditingOrcamento] = useState<Orcamento | null>(null);
  const [showTransformDialog, setShowTransformDialog] = useState(false);
  const [orcamentoToTransform, setOrcamentoToTransform] = useState<Orcamento | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [orcamentoToCancel, setOrcamentoToCancel] = useState<Orcamento | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [orcamentoToExport, setOrcamentoToExport] = useState<Orcamento | null>(null);
  const [orcamentoToPrint, setOrcamentoToPrint] = useState<Orcamento | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrcamentos();
    fetchClientes();
    fetchProdutos();
  }, []);

  const fetchOrcamentos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          *,
          clientes (
            nome,
            cpf_cnpj
          ),
          orcamento_produtos (
            *,
            produtos (
              nome,
              descricao,
              unidade
            )
          )
        `)
        .order('data_abertura', { ascending: false });

      if (error) throw error;
      setOrcamentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error);
      toast({
        title: 'Erro ao buscar orçamentos',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, cpf_cnpj')
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const fetchProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, descricao, preco_unitario, unidade')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  const handleCreateOrcamento = () => {
    setEditingOrcamento(null);
    setShowForm(true);
  };

  const handleEditOrcamento = (orcamento: Orcamento) => {
    setEditingOrcamento(orcamento);
    setShowForm(true);
  };

  const handleDeleteOrcamento = async (orcamento: Orcamento) => {
    if (!window.confirm(`Tem certeza que deseja excluir o orçamento ${orcamento.numero_orcamento}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('orcamentos')
        .delete()
        .eq('id', orcamento.id);

      if (error) throw error;

      toast({
        title: 'Orçamento excluído com sucesso!',
        description: `Orçamento ${orcamento.numero_orcamento} foi excluído.`
      });

      fetchOrcamentos();
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      toast({
        title: 'Erro ao excluir orçamento',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  };

  const handleTransformOrcamento = (orcamento: Orcamento) => {
    setOrcamentoToTransform(orcamento);
    setShowTransformDialog(true);
  };

  const handleAplicarPercentual = async (orcamento: Orcamento, percentual: number) => {
    try {
      const valorFinal = orcamento.valor_total * (1 + percentual / 100);
      
      const { error } = await supabase
        .from('orcamentos')
        .update({
          percentual_aplicado: percentual,
          valor_final: valorFinal,
          updated_at: new Date().toISOString()
        })
        .eq('id', orcamento.id);

      if (error) throw error;

      toast({
        title: 'Percentual aplicado com sucesso!',
        description: `Percentual de ${percentual}% aplicado ao orçamento ${orcamento.numero_orcamento}.`
      });

      fetchOrcamentos();
    } catch (error) {
      console.error('Erro ao aplicar percentual:', error);
      toast({
        title: 'Erro ao aplicar percentual',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  };

  const handleAprovarOrcamento = async (orcamento: Orcamento) => {
    try {
      const { error } = await supabase
        .from('orcamentos')
        .update({
          status: 'aprovado',
          data_aprovacao: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orcamento.id);

      if (error) throw error;

      toast({
        title: 'Orçamento aprovado com sucesso!',
        description: `Orçamento ${orcamento.numero_orcamento} foi aprovado.`
      });

      fetchOrcamentos();
    } catch (error) {
      console.error('Erro ao aprovar orçamento:', error);
      toast({
        title: 'Erro ao aprovar orçamento',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  };

  const handleCancelarOrcamento = (orcamento: Orcamento) => {
    setOrcamentoToCancel(orcamento);
    setMotivoCancelamento('');
    setShowCancelDialog(true);
  };

  const handleConfirmarCancelamento = async () => {
    if (!orcamentoToCancel || !motivoCancelamento.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Por favor, informe o motivo do cancelamento.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('orcamentos')
        .update({
          // Usa 'rejeitado' para compatibilidade com a constraint atual; mantém observação indicando cancelamento
          status: 'rejeitado',
          observacoes: `CANCELADO: ${motivoCancelamento}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', orcamentoToCancel.id);

      if (error) throw error;

      toast({
        title: 'Orçamento cancelado com sucesso!',
        description: `Orçamento ${orcamentoToCancel.numero_orcamento} foi cancelado.`
      });

      setShowCancelDialog(false);
      setOrcamentoToCancel(null);
      setMotivoCancelamento('');
      fetchOrcamentos();
    } catch (error) {
      console.error('Erro ao cancelar orçamento:', error);
      toast({
        title: 'Erro ao cancelar orçamento',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  };

  const handleExportarPDF = (orcamento: Orcamento) => {
    setOrcamentoToExport(orcamento);
    setShowExportDialog(true);
  };

  const handleConfirmarExportacao = async (incluirAjuste: boolean) => {
    if (!orcamentoToExport) return;
    
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 15;

      // Logo (tentar carregar a logo)
      try {
        // Criar um elemento img temporário para carregar a logo
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = '/src/assets/logo2.png';
        
        // Aguardar o carregamento da imagem
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          setTimeout(reject, 3000); // timeout de 3 segundos
        });
        
        doc.addImage(img, 'PNG', pageWidth / 2 - 25, y, 50, 18);
      } catch (error) {
        console.log('Logo não carregada, continuando sem ela');
      }
      
      y += 30;

      // Título e informações
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('METALMA INOX & CIA', pageWidth / 2, y, { align: 'center' });
      y += 8;
      
      doc.setFontSize(16);
      doc.text('ORÇAMENTO', pageWidth / 2, y, { align: 'center' });
      y += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`Nº ${orcamentoToExport.numero_orcamento}`, pageWidth / 2, y, { align: 'center' });
      y += 15;

      // Linha separadora
      doc.setLineWidth(0.5);
      doc.line(15, y, pageWidth - 15, y);
      y += 10;

      // Dados do Orçamento
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Dados do Orçamento', 15, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const dadosOrcamento = [
        [`Número:`, orcamentoToExport.numero_orcamento],
        [`Status:`, orcamentoToExport.status],
        [`Data de Abertura:`, new Date(orcamentoToExport.data_abertura).toLocaleDateString('pt-BR')],
        [`Data Prevista:`, orcamentoToExport.data_prevista ? new Date(orcamentoToExport.data_prevista).toLocaleDateString('pt-BR') : 'N/A'],
        [`Tempo Previsto:`, orcamentoToExport.tempo_execucao_previsto || 'N/A'],
        [`Meta por Hora:`, `R$ ${orcamentoToExport.meta_por_hora ? orcamentoToExport.meta_por_hora.toFixed(2).replace('.', ',') : '0,00'}`]
      ];

      dadosOrcamento.forEach(([label, value]) => {
        doc.text(label, 15, y);
        doc.text(value, 60, y);
        y += 5;
      });
      y += 5;

      // Dados do Cliente
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Dados do Cliente', 15, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Nome: ${orcamentoToExport.clientes?.nome || 'N/A'}`, 15, y);
      y += 5;
      doc.text(`CPF/CNPJ: ${orcamentoToExport.clientes?.cpf_cnpj || 'N/A'}`, 15, y);
      y += 10;

      // Descrição do Orçamento
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Descrição do Orçamento', 15, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const descricaoLines = doc.splitTextToSize(orcamentoToExport.descricao, pageWidth - 30);
      doc.text(descricaoLines, 15, y);
      y += descricaoLines.length * 5 + 10;

      // Produtos Incluídos
      if (orcamentoToExport.orcamento_produtos && orcamentoToExport.orcamento_produtos.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Produtos Incluídos', 15, y);
        y += 8;

        const tableData = orcamentoToExport.orcamento_produtos.map(produto => [
          produto.produtos?.nome || 'N/A',
          produto.quantidade.toString(),
          produto.produtos?.unidade || 'UN',
          `R$ ${produto.preco_unitario.toFixed(2).replace('.', ',')}`,
          `R$ ${produto.subtotal.toFixed(2).replace('.', ',')}`
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Produto', 'Qtd.', 'Unidade', 'Valor Unit.', 'Subtotal']],
          body: tableData,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [240, 240, 240], textColor: 0 },
          margin: { left: 15, right: 15 },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Resumo Financeiro
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Resumo Financeiro', 15, y);
      y += 8;

      if (incluirAjuste && orcamentoToExport.percentual_aplicado > 0) {
        // Com ajuste: mostrar valor total, percentual e valor final
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Valor Total: R$ ${orcamentoToExport.valor_total.toFixed(2).replace('.', ',')}`, 15, y);
        y += 5;
        doc.text(`Percentual Aplicado: +${orcamentoToExport.percentual_aplicado}%`, 15, y);
        y += 5;
      }

      // Sempre mostrar o valor final
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(46, 125, 50); // Verde
      doc.text(`Valor Final: R$ ${orcamentoToExport.valor_final.toFixed(2).replace('.', ',')}`, 15, y);
      doc.setTextColor(0, 0, 0); // Voltar ao preto
      y += 15;

      // Observações
      if (orcamentoToExport.observacoes) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Observações', 15, y);
        y += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const observacoesLines = doc.splitTextToSize(orcamentoToExport.observacoes, pageWidth - 30);
        doc.text(observacoesLines, 15, y);
        y += observacoesLines.length * 5 + 15;
      }

      // Assinatura do Cliente (apenas se não incluir ajuste)
      if (!incluirAjuste) {
        doc.setLineWidth(0.5);
        doc.line(15, y, pageWidth - 15, y);
        y += 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Assinatura do Cliente:', pageWidth / 2, y, { align: 'center' });
        y += 15;

        // Assinatura e Data lado a lado
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Assinatura:', 50, y);
        doc.text('Data:', pageWidth - 100, y);
        y += 5;

        // Linhas para assinatura e data
        doc.setLineWidth(0.3);
        doc.line(50, y, 120, y); // Linha da assinatura
        doc.line(pageWidth - 100, y, pageWidth - 50, y); // Linha da data
        y += 20;
      }

      // Rodapé
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Metalma Inox & Cia - Sistema de Controle de Orçamentos', pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.text(`Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, y, { align: 'center' });

      // Salvar o PDF
      const nomeArquivo = `orcamento_${orcamentoToExport.numero_orcamento}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nomeArquivo);
      
      toast({
        title: 'PDF exportado com sucesso!',
        description: `Orçamento ${orcamentoToExport.numero_orcamento} foi exportado${incluirAjuste ? ' com ajuste' : ' sem ajuste'}.`
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: 'Erro ao exportar PDF',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  };

  const handleImprimir = (orcamento: Orcamento) => {
    // Perguntar antes de imprimir, como no fluxo de Exportar
    setOrcamentoToPrint(orcamento);
    setShowPrintDialog(true);
  };

  const handleConfirmarImpressao = async (orcamento: Orcamento, incluirAjuste: boolean) => {
    if (!orcamento) return;
    
    try {
      // Usar logo diretamente como URL
      const logoUrl = '/src/assets/logo2.png';

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
        <html>
          <head>
            <title>Orçamento ${orcamento.numero_orcamento}</title>
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
              .valor-verde { color: #2e7d32; font-weight: bold; }
              @media print {
                body { margin: 0; padding: 0; }
              }
            </style>
          </head>
          <body>
            <div class="relatorio-impressao">
              <div class="relatorio-cabecalho">
                <img src="${logoUrl}" alt="Logo Metalma" class="relatorio-logo" />
                <div class="relatorio-empresa">METALMA INOX & CIA</div>
                <div class="relatorio-titulo">ORÇAMENTO</div>
                <div class="relatorio-info">Nº ${orcamento.numero_orcamento}</div>
            </div>
              
              <div class="relatorio-secao">
                <h3>Dados do Orçamento</h3>
                <div class="relatorio-grid">
                  <div><strong>Número:</strong> ${orcamento.numero_orcamento}</div>
                  <div><strong>Status:</strong> ${orcamento.status}</div>
                  <div><strong>Data de Abertura:</strong> ${new Date(orcamento.data_abertura).toLocaleDateString('pt-BR')}</div>
                  <div><strong>Data Prevista:</strong> ${orcamento.data_prevista ? new Date(orcamento.data_prevista).toLocaleDateString('pt-BR') : 'N/A'}</div>
                  <div><strong>Tempo Previsto:</strong> ${orcamento.tempo_execucao_previsto || 'N/A'}</div>
                  <div><strong>Meta por Hora:</strong> R$ ${orcamento.meta_por_hora ? orcamento.meta_por_hora.toFixed(2).replace('.', ',') : '0,00'}</div>
                </div>
              </div>
              
              <div class="relatorio-secao">
                <h3>Dados do Cliente</h3>
                <div class="relatorio-grid">
                  <div><strong>Nome:</strong> ${orcamento.clientes?.nome || 'N/A'}</div>
                  <div><strong>CPF/CNPJ:</strong> ${orcamento.clientes?.cpf_cnpj || 'N/A'}</div>
                </div>
              </div>
              
              <div class="relatorio-secao">
                <h3>Descrição do Orçamento</h3>
                <p>${orcamento.descricao}</p>
              </div>
              
              ${orcamento.orcamento_produtos && orcamento.orcamento_produtos.length > 0 ? `
              <div class="relatorio-secao">
                <h3>Produtos Incluídos</h3>
                <div class="relatorio-tabela">
                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Qtd.</th>
                        <th>Unidade</th>
                        <th>Valor Unit.</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${orcamento.orcamento_produtos.map(produto => `
                        <tr>
                          <td>${produto.produtos?.nome || 'N/A'}</td>
                          <td>${produto.quantidade}</td>
                          <td>${produto.produtos?.unidade || 'UN'}</td>
                          <td>R$ ${produto.preco_unitario.toFixed(2).replace('.', ',')}</td>
                          <td>R$ ${produto.subtotal.toFixed(2).replace('.', ',')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
              ` : ''}
              
              <div class="relatorio-resumo">
                <h3>Resumo Financeiro</h3>
                ${incluirAjuste && orcamento.percentual_aplicado > 0 ? `
                  <div><strong>Valor Total:</strong> R$ ${orcamento.valor_total.toFixed(2).replace('.', ',')}</div>
                  <div><strong>Percentual Aplicado:</strong> +${orcamento.percentual_aplicado}%</div>
                ` : ''}
                <div class="total-final valor-verde"><strong>Valor Final:</strong> R$ ${orcamento.valor_final.toFixed(2).replace('.', ',')}</div>
              </div>
              
              ${orcamento.observacoes ? `
              <div class="relatorio-secao">
                <h3>Observações</h3>
                <p>${orcamento.observacoes}</p>
              </div>
              ` : ''}

              ${!incluirAjuste ? `
              <div class="relatorio-secao" style="margin-top: 30px;">
                <h3>Autorização do Cliente</h3>
                <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:20px;">
                  <div style="width:45%; text-align:center;">
                    <div style="border-top:1px solid #333; height:1px; margin-bottom:6px;"></div>
                    <div style="font-size:11px; color:#666;">Assinatura</div>
                  </div>
                  <div style="width:30%; text-align:center;">
                    <div style="border-top:1px solid #333; height:1px; margin-bottom:6px;"></div>
                    <div style="font-size:11px; color:#666;">Data</div>
                  </div>
                </div>
              </div>
              ` : ''}
              
              <div class="relatorio-rodape">
                <div>Metalma Inox & Cia - Sistema de Controle de Orçamentos</div>
                <div>Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
              </div>
            </div>
          </body>
        </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        // Aguardar carregamento da imagem antes de imprimir
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
      
      toast({
        title: 'Impressão iniciada!',
        description: `Orçamento ${orcamento.numero_orcamento} será impresso${incluirAjuste ? ' com ajuste' : ' sem ajuste'}.`
      });
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast({
        title: 'Erro ao imprimir',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'aberto': 'secondary',
      'aprovado': 'default',
      'rejeitado': 'destructive',
      'cancelado': 'destructive',
      'transformado': 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
      </Badge>
    );
  };

  const filteredOrcamentos = orcamentos.filter(orcamento => {
    const matchesSearch = orcamento.numero_orcamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         orcamento.clientes?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || orcamento.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orçamentos</h1>
          <p className="text-muted-foreground">
            Gerencie orçamentos e transforme-os em ordens de serviço.
          </p>
        </div>
        <Button onClick={handleCreateOrcamento} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Orçamento
        </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Número do orçamento ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="transformado">Transformado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('todos');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Orçamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Orçamentos ({filteredOrcamentos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Carregando orçamentos...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrcamentos.map((orcamento) => (
                <Card key={orcamento.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{orcamento.numero_orcamento}</Badge>
                          {getStatusBadge(orcamento.status)}
                          {orcamento.percentual_aplicado > 0 && (
                            <Badge variant="secondary">
                              +{orcamento.percentual_aplicado}%
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm">
                          <strong>Cliente:</strong> {orcamento.clientes?.nome || 'N/A'}
                        </div>
                        <div className="text-sm">
                          <strong>Descrição:</strong> {orcamento.descricao}
                        </div>
                        <div className="text-sm">
                          <strong>Valor:</strong> {formatCurrency(orcamento.valor_total)}
                          {orcamento.valor_final !== orcamento.valor_total && (
                            <span className="ml-2 text-green-600 font-medium">
                              → {formatCurrency(orcamento.valor_final)}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <strong>Data:</strong> {formatDate(orcamento.data_abertura)}
                          {orcamento.data_vencimento && (
                            <span className="ml-4">
                              <strong>Vencimento:</strong> {formatDate(orcamento.data_vencimento)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Aprovar */}
                        {orcamento.status === 'aberto' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleAprovarOrcamento(orcamento)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                        )}
                        
                        {/* Editar */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditOrcamento(orcamento)}
                          disabled={['cancelado','rejeitado','transformado'].includes(orcamento.status)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        
                        {/* Cancelar */}
                        {orcamento.status === 'aberto' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelarOrcamento(orcamento)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                        )}
                        
                        {/* Exportar PDF */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportarPDF(orcamento)}
                          disabled={orcamento.status === 'cancelado'}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Exportar
                        </Button>
                        
                        {/* Imprimir */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleImprimir(orcamento)}
                          disabled={orcamento.status === 'cancelado'}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Imprimir
                        </Button>
                        
                        {/* Transformar em OS */}
                        {orcamento.status === 'aprovado' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleTransformOrcamento(orcamento)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Transformar em OS
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredOrcamentos.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum orçamento encontrado.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulário de Orçamento */}
      <OrcamentoForm
        open={showForm}
        onOpenChange={setShowForm}
        orcamento={editingOrcamento}
        clientes={clientes}
        produtos={produtos}
        onSuccess={fetchOrcamentos}
      />

      {/* Dialog de Transformação */}
      <TransformarOrcamentoDialog
        open={showTransformDialog}
        onOpenChange={setShowTransformDialog}
        orcamento={orcamentoToTransform}
        onSuccess={fetchOrcamentos}
      />

      {/* Dialog de Cancelamento */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
              <Textarea
                id="motivo"
                placeholder="Informe o motivo do cancelamento..."
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleConfirmarCancelamento}>
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação para Exportar */}
      <ConfirmationDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        title="Exportar PDF"
        description="Deseja exportar o PDF com o percentual de ajuste aplicado?"
        onConfirm={() => handleConfirmarExportacao(true)}
        onCancel={() => handleConfirmarExportacao(false)}
        confirmText="Sim"
        cancelText="Não"
      />

      {/* Dialog de Confirmação para Imprimir */}
      <ConfirmationDialog
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        title="Imprimir Orçamento"
        description="Deseja imprimir com o percentual de ajuste aplicado?"
        onConfirm={() => handleConfirmarImpressao(orcamentoToPrint!, true)}
        onCancel={() => handleConfirmarImpressao(orcamentoToPrint!, false)}
        confirmText="Sim"
        cancelText="Não"
      />
    </div>
  );
}
