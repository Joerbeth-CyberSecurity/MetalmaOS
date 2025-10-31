import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Play, CheckCircle, AlertCircle } from 'lucide-react';

interface TransformarOrcamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: any;
  onSuccess: () => void;
}

export function TransformarOrcamentoDialog({ 
  open, 
  onOpenChange, 
  orcamento, 
  onSuccess 
}: TransformarOrcamentoDialogProps) {
  const [formData, setFormData] = useState({
    numero_os: '',
    descricao: '',
    observacoes: '',
    data_abertura: new Date().toISOString().split('T')[0],
    data_conclusao: '',
    tempo_execucao_previsto: 0,
    meta_hora: 0
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Buscar próximo número de OS quando o dialog abrir
  useEffect(() => {
    if (open && orcamento) {
      fetchProximoNumeroOS();
      // Transferir dados do orçamento para os campos da OS
      const hhmmssToDecimalHours = (value: string | undefined): number => {
        if (!value) return 0;
        // Espera formato HH:MM:SS
        const parts = value.split(':');
        if (parts.length < 2) {
          const asNumber = parseFloat(value);
          return isNaN(asNumber) ? 0 : asNumber;
        }
        const hours = parseInt(parts[0] || '0', 10);
        const minutes = parseInt(parts[1] || '0', 10);
        const seconds = parseInt(parts[2] || '0', 10);
        if ([hours, minutes, seconds].some((n) => isNaN(n) || n < 0)) return 0;
        return hours + minutes / 60 + seconds / 3600;
      };
      setFormData(prev => ({
        ...prev,
        descricao: orcamento.descricao || '',
        observacoes: orcamento.observacoes || '',
        tempo_execucao_previsto: hhmmssToDecimalHours(orcamento.tempo_execucao_previsto),
        meta_hora: orcamento.meta_por_hora || 0,
        data_conclusao: orcamento.data_prevista ? orcamento.data_prevista.split('T')[0] : ''
      }));
    }
  }, [open, orcamento]);

  const fetchProximoNumeroOS = async () => {
    try {
      // Buscar configuração da próxima OS
      const { data: configProxima } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'proxima_os')
        .single();

      if (configProxima?.valor) {
        setFormData(prev => ({
          ...prev,
          numero_os: configProxima.valor
        }));
      } else {
        // Se não tiver configuração, buscar o último número do ano atual
        const anoAtual = new Date().getFullYear().toString();
        const { data: ultimaOS } = await supabase
          .from('ordens_servico')
          .select('numero_os')
          .like('numero_os', `OS%/${anoAtual}`)
          .order('numero_os', { ascending: false })
          .limit(1)
          .single();

        if (ultimaOS?.numero_os) {
          // Incrementar o número
          const match = ultimaOS.numero_os.match(/^(\D*?)(\d+)(.*)$/);
          if (match) {
            const prefixo = match[1] || '';
            const numStr = match[2] || '0';
            const sufixo = match[3] || '';
            const proximoNumero = String(parseInt(numStr, 10) + 1).padStart(numStr.length, '0');
            const novoNumero = `${prefixo}${proximoNumero}${sufixo}`;
            
            setFormData(prev => ({
              ...prev,
              numero_os: novoNumero
            }));
          }
        } else {
          // Primeira OS do ano
          setFormData(prev => ({
            ...prev,
            numero_os: `OS0001/${anoAtual}`
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao buscar próximo número de OS:', error);
      // Fallback para um número padrão
      const anoAtual = new Date().getFullYear().toString();
      setFormData(prev => ({
        ...prev,
        numero_os: `OS0001/${anoAtual}`
      }));
    }
  };

  const verificarUltimoNumeroOS = async (): Promise<string> => {
    try {
      // Buscar configuração da próxima OS
      const { data: configProxima } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'proxima_os')
        .single();

      if (configProxima?.valor) {
        // Verificar se o número ainda está disponível
        const { count } = await supabase
          .from('ordens_servico')
          .select('id', { count: 'exact', head: true })
          .eq('numero_os', configProxima.valor);

        if ((count || 0) === 0) {
          return configProxima.valor;
        }
      }

      // Se não estiver disponível ou não existir configuração, buscar o último número do ano atual
      const anoAtual = new Date().getFullYear().toString();
      const { data: ultimaOS } = await supabase
        .from('ordens_servico')
        .select('numero_os')
        .like('numero_os', `OS%/${anoAtual}`)
        .order('numero_os', { ascending: false })
        .limit(1)
        .single();

      if (ultimaOS?.numero_os) {
        // Incrementar o número
        const match = ultimaOS.numero_os.match(/^(\D*?)(\d+)(.*)$/);
        if (match) {
          const prefixo = match[1] || '';
          const numStr = match[2] || '0';
          const sufixo = match[3] || '';
          const proximoNumero = String(parseInt(numStr, 10) + 1).padStart(numStr.length, '0');
          return `${prefixo}${proximoNumero}${sufixo}`;
        }
      }

      // Primeira OS do ano
      return `OS0001/${anoAtual}`;
    } catch (error) {
      console.error('Erro ao verificar último número de OS:', error);
      // Fallback para um número padrão
      const anoAtual = new Date().getFullYear().toString();
      return `OS0001/${anoAtual}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.numero_os || !formData.descricao) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o número da OS e a descrição.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Verificação final em tempo real do número da OS
      const numeroOSFinal = await verificarUltimoNumeroOS();
      
      // Criar a OS
      const { data: newOS, error: osError } = await supabase
        .from('ordens_servico')
        .insert({
          numero_os: numeroOSFinal,
          cliente_id: orcamento.cliente_id,
          descricao: formData.descricao,
          valor_total: orcamento.valor_final || 0,
          tempo_execucao_previsto: formData.tempo_execucao_previsto || 0,
          status: 'aberta',
          data_abertura: new Date(formData.data_abertura).toISOString(),
          data_previsao: formData.data_conclusao ? new Date(formData.data_conclusao).toISOString() : null,
          observacoes: formData.observacoes || null
        })
        .select()
        .single();

      if (osError) {
        console.error('Erro detalhado ao criar OS:', osError);
        throw new Error(`Erro ao criar OS: ${osError.message || 'Erro desconhecido'}`);
      }

      // Copiar produtos do orçamento para a OS
      const { data: orcamentoProdutos, error: produtosError } = await supabase
        .from('orcamento_produtos')
        .select('*')
        .eq('orcamento_id', orcamento.id);

      if (produtosError) throw produtosError;

      if (orcamentoProdutos && orcamentoProdutos.length > 0) {
        // Alinhar com o schema atual de os_produtos (preco_unitario/subtotal)
        const produtosOS = orcamentoProdutos.map(produto => ({
          os_id: newOS.id,
          produto_id: produto.produto_id,
          quantidade: produto.quantidade,
          preco_unitario: produto.preco_unitario,
          subtotal: produto.subtotal
        }));

        const { error: insertProdutosError } = await supabase
          .from('os_produtos')
          .insert(produtosOS);

        if (insertProdutosError) {
          console.error('Erro detalhado ao inserir produtos:', insertProdutosError);
          throw new Error(`Erro ao inserir produtos: ${insertProdutosError.message || 'Erro desconhecido'}`);
        }
      }

      // Atualizar status do orçamento para "transformado"
      const { error: updateOrcamentoError } = await supabase
        .from('orcamentos')
        .update({
          status: 'transformado',
          updated_at: new Date().toISOString()
        })
        .eq('id', orcamento.id);

      if (updateOrcamentoError) throw updateOrcamentoError;

      // Atualizar próxima numeração de OS
      const incrementOsNotation = (input: string): string => {
        if (!input) return '';
        const m = input.match(/^(\D*?)(\d+)(.*)$/);
        if (!m) return input;
        const prefixo = m[1] || '';
        const numStr = m[2] || '0';
        const sufixo = m[3] || '';
        const next = String(parseInt(numStr, 10) + 1).padStart(numStr.length, '0');
        return `${prefixo}${next}${sufixo}`;
      };

      const proximoNumero = incrementOsNotation(numeroOSFinal);
      if (proximoNumero && proximoNumero !== numeroOSFinal) {
        await supabase
          .from('configuracoes')
          .upsert({ chave: 'proxima_os', valor: proximoNumero }, { onConflict: 'chave' });
      }

      // Registrar auditoria
      await supabase.from('auditoria_sistema').insert({
        acao: 'transformar_orcamento_os',
        tabela: 'ordens_servico',
        registro_id: newOS.id,
        detalhes: `Orçamento ${orcamento.numero_orcamento} transformado em OS ${numeroOSFinal}`
      });

      toast({
        title: 'OS criada com sucesso!',
        description: `Orçamento ${orcamento.numero_orcamento} foi transformado em OS ${numeroOSFinal}.`
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao transformar orçamento:', error);
      toast({
        title: 'Erro ao transformar orçamento',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (!orcamento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Transformar Orçamento em OS
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Orçamento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Orçamento Original</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{orcamento.numero_orcamento}</Badge>
                <Badge variant="secondary">{orcamento.status}</Badge>
              </div>
              <div className="text-sm">
                <strong>Cliente:</strong> {orcamento.clientes?.nome || 'N/A'}
              </div>
              <div className="text-sm">
                <strong>Descrição:</strong> {orcamento.descricao}
              </div>
              <div className="text-sm">
                <strong>Valor:</strong> {formatCurrency(orcamento.valor_final)}
              </div>
              {orcamento.percentual_aplicado > 0 && (
                <div className="text-sm">
                  <strong>Percentual Aplicado:</strong> +{orcamento.percentual_aplicado}%
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulário da OS */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nova Ordem de Serviço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="numero_os">Número da OS *</Label>
                    <Input
                      id="numero_os"
                      value={formData.numero_os}
                      onChange={(e) => setFormData({ ...formData, numero_os: e.target.value })}
                      placeholder="Ex: OS0001/2024"
                      required
                      disabled={true}
                      className="bg-muted cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Número gerado automaticamente pelo sistema
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="data_abertura">Data de Abertura</Label>
                    <Input
                      id="data_abertura"
                      type="date"
                      value={formData.data_abertura}
                      onChange={(e) => setFormData({ ...formData, data_abertura: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="data_conclusao">Data Prevista</Label>
                    <Input
                      id="data_conclusao"
                      type="date"
                      value={formData.data_conclusao}
                      onChange={(e) => setFormData({ ...formData, data_conclusao: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tempo_execucao_previsto">Tempo Previsto (horas)</Label>
                    <Input
                      id="tempo_execucao_previsto"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.tempo_execucao_previsto}
                      onChange={(e) => setFormData({ ...formData, tempo_execucao_previsto: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="meta_hora">Meta por Hora</Label>
                    <Input
                      id="meta_hora"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.meta_hora}
                      onChange={(e) => setFormData({ ...formData, meta_hora: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição da OS *</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descreva a ordem de serviço..."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Observações adicionais..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Resumo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo da Transformação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Orçamento:</span>
                    <span className="font-medium">{orcamento.numero_orcamento}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nova OS:</span>
                    <span className="font-medium">{formData.numero_os}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cliente:</span>
                    <span className="font-medium">{orcamento.clientes?.nome || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor:</span>
                    <span className="font-medium text-green-600">{formatCurrency(orcamento.valor_final)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Produtos:</span>
                    <span className="font-medium">{orcamento.orcamento_produtos?.length || 0} item(ns)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botões */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {loading ? 'Criando OS...' : 'Transformar em OS'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
