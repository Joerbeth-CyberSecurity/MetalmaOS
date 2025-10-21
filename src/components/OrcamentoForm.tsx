import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Save, X } from 'lucide-react';

interface ProdutoForm {
  id?: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

interface OrcamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento?: any;
  clientes: any[];
  produtos: any[];
  onSuccess: () => void;
}

export function OrcamentoForm({ 
  open, 
  onOpenChange, 
  orcamento, 
  clientes, 
  produtos, 
  onSuccess 
}: OrcamentoFormProps) {
  const [formData, setFormData] = useState({
    numero_orcamento: '',
    cliente_id: '',
    descricao: '',
    status: 'aberto',
    data_vencimento: '',
    observacoes: '',
    percentual_aplicado: 0
  });
  const [produtosForm, setProdutosForm] = useState<ProdutoForm[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (orcamento) {
        // Editando orçamento existente
        setFormData({
          numero_orcamento: orcamento.numero_orcamento || '',
          cliente_id: orcamento.cliente_id || '',
          descricao: orcamento.descricao || '',
          status: orcamento.status || 'aberto',
          data_vencimento: orcamento.data_vencimento ? orcamento.data_vencimento.split('T')[0] : '',
          observacoes: orcamento.observacoes || '',
          percentual_aplicado: orcamento.percentual_aplicado || 0
        });
        setProdutosForm(orcamento.orcamento_produtos || []);
      } else {
        // Novo orçamento
        setFormData({
          numero_orcamento: '',
          cliente_id: '',
          descricao: '',
          status: 'aberto',
          data_vencimento: '',
          observacoes: '',
          percentual_aplicado: 0
        });
        setProdutosForm([]);
      }
    }
  }, [open, orcamento]);

  const addProduto = () => {
    setProdutosForm([...produtosForm, {
      produto_id: '',
      quantidade: 0,
      preco_unitario: 0,
      subtotal: 0
    }]);
  };

  const removeProduto = (index: number) => {
    setProdutosForm(produtosForm.filter((_, i) => i !== index));
  };

  const updateProduto = (index: number, field: keyof ProdutoForm, value: any) => {
    const newProdutos = [...produtosForm];
    newProdutos[index] = { ...newProdutos[index], [field]: value };
    
    if (field === 'produto_id') {
      const produto = produtos.find(p => p.id === value);
      if (produto) {
        newProdutos[index].preco_unitario = produto.preco_unitario;
        newProdutos[index].subtotal = newProdutos[index].quantidade * produto.preco_unitario;
      }
    } else if (field === 'quantidade' || field === 'preco_unitario') {
      newProdutos[index].subtotal = newProdutos[index].quantidade * newProdutos[index].preco_unitario;
    }
    
    setProdutosForm(newProdutos);
  };

  const calcularValorTotal = () => {
    return produtosForm.reduce((total, produto) => total + produto.subtotal, 0);
  };

  const calcularValorFinal = () => {
    const valorTotal = calcularValorTotal();
    return valorTotal * (1 + formData.percentual_aplicado / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente_id || !formData.descricao || produtosForm.length === 0) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha cliente, descrição e adicione pelo menos um produto.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const valorTotal = calcularValorTotal();
      const valorFinal = calcularValorFinal();

      if (orcamento) {
        // Atualizar orçamento existente
        const { error: orcamentoError } = await supabase
          .from('orcamentos')
          .update({
            numero_orcamento: formData.numero_orcamento,
            cliente_id: formData.cliente_id,
            descricao: formData.descricao,
            status: formData.status,
            data_vencimento: formData.data_vencimento ? new Date(formData.data_vencimento).toISOString() : null,
            observacoes: formData.observacoes,
            valor_total: valorTotal,
            percentual_aplicado: formData.percentual_aplicado,
            valor_final: valorFinal,
            updated_at: new Date().toISOString()
          })
          .eq('id', orcamento.id);

        if (orcamentoError) throw orcamentoError;

        // Atualizar produtos
        await supabase
          .from('orcamento_produtos')
          .delete()
          .eq('orcamento_id', orcamento.id);

        const produtosToSave = produtosForm.map(produto => ({
          orcamento_id: orcamento.id,
          produto_id: produto.produto_id,
          quantidade: produto.quantidade,
          preco_unitario: produto.preco_unitario,
          subtotal: produto.subtotal
        }));

        if (produtosToSave.length > 0) {
          const { error: produtosError } = await supabase
            .from('orcamento_produtos')
            .insert(produtosToSave);

          if (produtosError) throw produtosError;
        }

        toast({
          title: 'Orçamento atualizado com sucesso!',
          description: `Orçamento ${formData.numero_orcamento} foi atualizado.`
        });
      } else {
        // Criar novo orçamento
        const { data: newOrcamento, error: orcamentoError } = await supabase
          .from('orcamentos')
          .insert({
            numero_orcamento: formData.numero_orcamento,
            cliente_id: formData.cliente_id,
            descricao: formData.descricao,
            status: formData.status,
            data_vencimento: formData.data_vencimento ? new Date(formData.data_vencimento).toISOString() : null,
            observacoes: formData.observacoes,
            valor_total: valorTotal,
            percentual_aplicado: formData.percentual_aplicado,
            valor_final: valorFinal
          })
          .select()
          .single();

        if (orcamentoError) throw orcamentoError;

        // Inserir produtos
        const produtosToSave = produtosForm.map(produto => ({
          orcamento_id: newOrcamento.id,
          produto_id: produto.produto_id,
          quantidade: produto.quantidade,
          preco_unitario: produto.preco_unitario,
          subtotal: produto.subtotal
        }));

        if (produtosToSave.length > 0) {
          const { error: produtosError } = await supabase
            .from('orcamento_produtos')
            .insert(produtosToSave);

          if (produtosError) throw produtosError;
        }

        toast({
          title: 'Orçamento criado com sucesso!',
          description: `Orçamento ${formData.numero_orcamento} foi criado.`
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      toast({
        title: 'Erro ao salvar orçamento',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {orcamento ? 'Editar Orçamento' : 'Novo Orçamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numero_orcamento">Número do Orçamento</Label>
                  <Input
                    id="numero_orcamento"
                    value={formData.numero_orcamento}
                    onChange={(e) => setFormData({ ...formData, numero_orcamento: e.target.value })}
                    placeholder="Ex: ORC0001/2024"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cliente_id">Cliente</Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome} - {cliente.cpf_cnpj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="rejeitado">Rejeitado</SelectItem>
                      <SelectItem value="transformado">Transformado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="data_vencimento">Data de Vencimento</Label>
                  <Input
                    id="data_vencimento"
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o orçamento..."
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

          {/* Produtos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Produtos</span>
                <Button type="button" onClick={addProduto} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {produtosForm.map((produto, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Produto {index + 1}</h4>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeProduto(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Produto</Label>
                        <Select
                          value={produto.produto_id}
                          onValueChange={(value) => updateProduto(index, 'produto_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {produtos.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nome} - {formatCurrency(p.preco_unitario)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={produto.quantidade}
                          onChange={(e) => updateProduto(index, 'quantidade', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Preço Unitário</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={produto.preco_unitario}
                          onChange={(e) => updateProduto(index, 'preco_unitario', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Subtotal</Label>
                        <Input
                          value={formatCurrency(produto.subtotal)}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {produtosForm.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum produto adicionado.</p>
                    <p className="text-sm">Clique em "Adicionar Produto" para começar.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resumo Financeiro */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="percentual_aplicado">Percentual de Ajuste (%)</Label>
                    <Input
                      id="percentual_aplicado"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.percentual_aplicado}
                      onChange={(e) => setFormData({ ...formData, percentual_aplicado: parseFloat(e.target.value) || 0 })}
                      placeholder="Ex: 10.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Valor Total:</span>
                      <span className="font-medium">{formatCurrency(calcularValorTotal())}</span>
                    </div>
                    {formData.percentual_aplicado > 0 && (
                      <div className="flex justify-between">
                        <span>Percentual Aplicado:</span>
                        <span className="font-medium">+{formData.percentual_aplicado}%</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Valor Final:</span>
                      <span className="text-green-600">{formatCurrency(calcularValorFinal())}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : (orcamento ? 'Atualizar' : 'Criar')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
