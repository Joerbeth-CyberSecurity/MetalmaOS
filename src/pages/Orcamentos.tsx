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
  AlertCircle
} from 'lucide-react';
import { OrcamentoForm } from '@/components/OrcamentoForm';
import { TransformarOrcamentoDialog } from '@/components/TransformarOrcamentoDialog';

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
                      <div className="flex items-center gap-2">
                        {orcamento.status === 'aberto' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <DollarSign className="h-4 w-4 mr-1" />
                                Aplicar %
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Aplicar Percentual</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Percentual (%)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Ex: 10.5"
                                    id="percentual"
                                  />
                                </div>
                                <Button
                                  onClick={() => {
                                    const percentual = parseFloat((document.getElementById('percentual') as HTMLInputElement)?.value || '0');
                                    if (percentual > 0) {
                                      handleAplicarPercentual(orcamento, percentual);
                                    }
                                  }}
                                  className="w-full"
                                >
                                  Aplicar Percentual
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditOrcamento(orcamento)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
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
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteOrcamento(orcamento)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
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
    </div>
  );
}
