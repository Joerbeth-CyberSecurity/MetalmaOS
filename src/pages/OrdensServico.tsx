import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  PlusCircle, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Loader2, 
  ChevronsUpDown, 
  X,
  UserPlus,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  Clock,
  Timer,
  StopCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Database } from '@/integrations/supabase/types';
import { Checkbox } from '@/components/ui/checkbox';
// Remover import do ReportTemplate se não for mais usado
// import { ReportTemplate } from '@/components/ui/ReportTemplate';

// Tipos baseados no schema do Supabase (types.ts)
type ClienteRow = Database['public']['Tables']['clientes']['Row'];
type ProdutoRow = Database['public']['Tables']['produtos']['Row'];
type OrdemServicoRow = Database['public']['Tables']['ordens_servico']['Row'];
type OsProdutosRow = Database['public']['Tables']['os_produtos']['Row'];
type ColaboradorRow = Database['public']['Tables']['colaboradores']['Row'];

// Esquema de validação para produtos dentro da OS (formulário)
const osProdutoSchema = z.object({
  produto_id: z.string({ required_error: "Selecione um produto." }),
  quantidade: z.number().min(1, "A quantidade deve ser pelo menos 1.").default(1),
  preco_unitario: z.number(),
  nome: z.string(), // Campo obrigatório para exibição
});

// Esquema de validação principal da OS (formulário)
const osSchema = z.object({
  cliente_id: z.string({ required_error: "Selecione um cliente." }),
  descricao: z.string().min(5, { message: "A descrição deve ter pelo menos 5 caracteres." }),
  status: z.string().default('aberta'),
  produtos: z.array(osProdutoSchema).min(1, "Adicione pelo menos um produto à OS."),
  tempo_execucao_previsto: z.number().min(0, "O tempo previsto não pode ser negativo.").optional(),
  meta_hora: z.number().min(0, "A meta por hora não pode ser negativa.").optional(),
  colaboradores: z.array(z.string()).min(1, "Selecione pelo menos um colaborador.").optional(),
  valor_total: z.number().min(0).optional(),
  numero_os: z.string().optional(),
  data_abertura: z.string().optional(),
});
type OsFormData = z.infer<typeof osSchema>;

// Tipo local para a PÁGINA, refletindo a query com joins e campos customizados
type OrdemServicoComRelacoes = OrdemServicoRow & {
  clientes: Pick<ClienteRow, 'nome'> | null;
  os_produtos: (OsProdutosRow & {
    produtos: Pick<ProdutoRow, 'nome'> | null;
  })[];
  os_colaboradores: {
    colaborador: Pick<ColaboradorRow, 'nome'> | null;
  }[];
  os_tempo: {
    tipo: string;
    data_inicio: string;
    data_fim: string | null;
    colaborador: Pick<ColaboradorRow, 'nome'> | null;
  }[];
};

// Funções utilitárias
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};
const formatDate = (dateString: string | null) => dateString ? new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A';
const getStatusVariant = (status: string | null): 'secondary' | 'default' | 'destructive' | 'outline' => {
  switch (status) {
    case 'aberta': return 'secondary';
    case 'em_andamento': return 'default';
    case 'finalizada': return 'default';
    case 'cancelada': return 'destructive';
    default: return 'outline';
  }
};

export default function OrdensServico() {
  const [ordens, setOrdens] = useState<OrdemServicoComRelacoes[]>([]);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [produtos, setProdutos] = useState<ProdutoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedOs, setSelectedOs] = useState<OrdemServicoComRelacoes | null>(null);
  const [osToDelete, setOsToDelete] = useState<OrdemServicoComRelacoes | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const [colaboradores, setColaboradores] = useState<ColaboradorRow[]>([]);
  const [showColaboradoresDialog, setShowColaboradoresDialog] = useState(false);
  const [selectedColaboradores, setSelectedColaboradores] = useState<string[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showParadaDialog, setShowParadaDialog] = useState(false);
  const [motivoParada, setMotivoParada] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [produtoSearch, setProdutoSearch] = useState('');

  const form = useForm<OsFormData>({
    resolver: zodResolver(osSchema),
    defaultValues: { status: 'aberta', produtos: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "produtos",
  });
  
  const watchedProdutos = form.watch("produtos");
  const valorTotalOS = watchedProdutos.reduce((total, p) => total + (p.quantidade * p.preco_unitario), 0);

  useEffect(() => {
    fetchOrdensServico();
    fetchClientes();
    fetchProdutos();
    fetchColaboradores();
  }, []);

  useEffect(() => {
    if (dialogOpen) {
      if (selectedOs) {
        // Primeiro, vamos garantir que temos todos os dados necessários
        const produtosComNome = selectedOs.os_produtos.map(p => {
          const produtoCompleto = produtos.find(prod => prod.id === p.produto_id);
          return {
            produto_id: p.produto_id ?? '',
            quantidade: p.quantidade,
            preco_unitario: p.preco_unitario,
            nome: produtoCompleto?.nome || p.produtos?.nome || 'Produto não encontrado',
          };
        });

        form.reset({
          cliente_id: selectedOs.cliente_id ?? '',
          descricao: selectedOs.descricao,
          status: selectedOs.status ?? 'aberta',
          produtos: produtosComNome,
        });
      } else {
        form.reset({ descricao: '', cliente_id: '', status: 'aberta', produtos: [] });
      }
    }
  }, [selectedOs, dialogOpen, form, produtos]);
  
  const fetchOrdensServico = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ordens_servico')
      .select(`
        *,
        clientes ( nome ),
        os_produtos ( *, produtos ( nome ) ),
        os_colaboradores ( colaborador:colaboradores(nome) ),
        os_tempo ( tipo, data_inicio, data_fim, colaborador:colaboradores(nome) )
      `)
      .order('data_abertura', { ascending: false });
    
    if (error) {
      toast({ title: "Erro ao buscar OS", description: error.message, variant: "destructive" });
    } else {
      setOrdens(data as OrdemServicoComRelacoes[]);
    }
    setLoading(false);
  };
  
  const fetchClientes = async () => {
    const { data, error } = await supabase.from('clientes').select('*').eq('ativo', true).order('nome');
    if (error) toast({ title: "Erro ao buscar clientes", description: error.message, variant: "destructive" });
    else setClientes(data);
  };

  const fetchProdutos = async () => {
    const { data, error } = await supabase.from('produtos').select('*').eq('ativo', true).order('nome');
    if (error) toast({ title: "Erro ao buscar produtos", description: error.message, variant: "destructive" });
    else setProdutos(data);
  };

  const fetchColaboradores = async () => {
    const { data, error } = await supabase
      .from('colaboradores')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    
    if (error) toast({ title: "Erro ao buscar colaboradores", description: error.message, variant: "destructive" });
    else setColaboradores(data);
  };

  const handleAddNew = () => {
    setSelectedOs(null);
    setDialogOpen(true);
  };

  const handleEdit = (os: OrdemServicoComRelacoes) => {
    setSelectedOs(os);
    setDialogOpen(true);
  };
  
  const handleAddProduct = (produto: ProdutoRow) => {
    if (fields.some(p => p.produto_id === produto.id)) {
      toast({ title: "Produto já adicionado", description: "Este produto já está na lista." });
      return;
    }
    append({ produto_id: produto.id, nome: produto.nome, preco_unitario: produto.preco_unitario, quantidade: 1 });
  };

  const onSubmit = async (values: OsFormData) => {
    setIsSaving(true);
    const { produtos: produtosForm } = values;

    console.log('Produtos do formulário:', produtosForm);

    try {
      if (selectedOs) {
        // UPDATE
        const osDataToUpdate: Database['public']['Tables']['ordens_servico']['Update'] = {
          cliente_id: values.cliente_id,
          descricao: values.descricao,
          status: values.status,
          valor_total: valorTotalOS,
          tempo_execucao_previsto: values.tempo_execucao_previsto,
          // meta_hora removido do envio ao banco
        };

      console.log('Atualizando OS:', osDataToUpdate);

      const { error: osError } = await supabase
        .from('ordens_servico')
        .update(osDataToUpdate)
        .eq('id', selectedOs.id);

      if (osError) throw osError;
      
      // Deletar produtos existentes
      console.log('Deletando produtos existentes da OS:', selectedOs.id);
      const { error: deleteError } = await supabase
        .from('os_produtos')
        .delete()
        .eq('os_id', selectedOs.id);

      if (deleteError) throw deleteError;

      // Inserir novos produtos
      const produtosToSave: Database['public']['Tables']['os_produtos']['Insert'][] = produtosForm.map(p => ({
        os_id: selectedOs.id,
        produto_id: p.produto_id,
        quantidade: p.quantidade,
        preco_unitario: p.preco_unitario,
        subtotal: p.quantidade * p.preco_unitario,
      }));

      console.log('Salvando novos produtos:', produtosToSave);

      const { error: produtosError } = await supabase
        .from('os_produtos')
        .insert(produtosToSave);

      if (produtosError) throw produtosError;

      toast({ title: "OS atualizada com sucesso!" });
      setDialogOpen(false);
      fetchOrdensServico();
    } else {
      // INSERT
      const { data: newOs, error: osError } = await supabase
        .from('ordens_servico')
        .insert({
          descricao: values.descricao,
          cliente_id: values.cliente_id,
          status: values.status,
          valor_total: valorTotalOS,
          tempo_execucao_previsto: values.tempo_execucao_previsto,
          // meta_hora removido do envio ao banco
          numero_os: 'Gerando...',
          data_abertura: new Date().toISOString()
        })
        .select()
        .single();
      
      if (osError || !newOs) throw osError || new Error('Falha ao criar OS');

      console.log('OS criada:', newOs);

      const produtosToSave: Database['public']['Tables']['os_produtos']['Insert'][] = produtosForm.map(p => ({
        os_id: newOs.id,
        produto_id: p.produto_id,
        quantidade: p.quantidade,
        preco_unitario: p.preco_unitario,
        subtotal: p.quantidade * p.preco_unitario,
      }));

      console.log('Salvando produtos da nova OS:', produtosToSave);

      const { error: produtosError } = await supabase
        .from('os_produtos')
        .insert(produtosToSave);

      if (produtosError) throw produtosError;

      toast({ title: "OS salva com sucesso!" });
      setDialogOpen(false);
      fetchOrdensServico();
    }
  } catch (error) {
    console.error('Erro ao salvar OS:', error);
    let msg = 'Erro ao salvar OS. Verifique os campos obrigatórios e tente novamente.';
    if (error && typeof error === 'object') {
      if ('message' in error && error.message) {
        msg += `\n${error.message}`;
      } else if ('toString' in error) {
        msg += `\n${error.toString()}`;
      }
    }
    toast({ 
      title: "Erro ao salvar OS", 
      description: msg, 
      variant: "destructive" 
    });
  } finally {
    setIsSaving(false);
  }
};

  const handleDeleteConfirm = async () => {
    if (!osToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.from('ordens_servico').delete().eq('id', osToDelete.id);
    if (error) toast({ title: "Erro ao excluir OS", description: error.message, variant: "destructive" });
    else {
      toast({ title: "OS excluída com sucesso!" });
      setOsToDelete(null);
      fetchOrdensServico();
    }
    setIsDeleting(false);
  };

  const handleStartOS = async (os: OrdemServicoComRelacoes) => {
    setIsStarting(true);
    try {
      // Atualizar status da OS
      const { error: osError } = await supabase
        .from('ordens_servico')
        .update({ 
          status: 'em_andamento',
          data_inicio: new Date().toISOString()
        })
        .eq('id', os.id);

      if (osError) throw osError;

      // Buscar colaboradores ativos na OS
      const { data: colaboradoresOS, error: colabError } = await supabase
        .from('os_colaboradores')
        .select('colaborador_id')
        .eq('os_id', os.id)
        .eq('ativo', true);

      if (colabError) throw colabError;
      if (!colaboradoresOS || colaboradoresOS.length === 0) throw new Error('Nenhum colaborador ativo na OS.');

      // Registrar início no os_tempo para cada colaborador
      const registrosTempo = colaboradoresOS.map(({ colaborador_id }) => ({
        os_id: os.id,
        colaborador_id,
        tipo: 'trabalho',
        data_inicio: new Date().toISOString(),
      }));

      const { error: tempoError } = await supabase
        .from('os_tempo')
        .insert(registrosTempo);

      if (tempoError) throw tempoError;

      toast({ title: "OS iniciada com sucesso!" });
      fetchOrdensServico();
    } catch (error) {
      toast({ 
        title: "Erro ao iniciar OS", 
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive" 
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handlePauseOS = async (os: OrdemServicoComRelacoes, tipo: 'pausa' | 'parada_material' = 'pausa') => {
    setIsPausing(true);
    try {
      // Encontrar o registro de tempo atual sem data_fim
      const { data: tempoAtual } = await supabase
        .from('os_tempo')
        .select('*')
        .eq('os_id', os.id)
        .is('data_fim', null)
        .single();

      if (tempoAtual) {
        // Finalizar o tempo atual
        const { error: updateError } = await supabase
          .from('os_tempo')
          .update({ data_fim: new Date().toISOString() })
          .eq('id', tempoAtual.id);

        if (updateError) throw updateError;
      }

      if (tipo === 'parada_material') {
        // Buscar colaboradores ativos na OS
        const { data: colaboradoresOS, error: colabError } = await supabase
          .from('os_colaboradores')
          .select('colaborador_id')
          .eq('os_id', os.id)
          .eq('ativo', true);

        if (colabError) throw colabError;
        if (!colaboradoresOS || colaboradoresOS.length === 0) throw new Error('Nenhum colaborador ativo na OS.');

        // Inserir um registro de parada para cada colaborador
        const registrosParada = colaboradoresOS.map(({ colaborador_id }) => ({
          os_id: os.id,
          colaborador_id,
          tipo: 'parada_material',
          data_inicio: new Date().toISOString(),
          motivo: motivoParada
        }));
        const { error: pausaError } = await supabase
          .from('os_tempo')
          .insert(registrosParada);
        if (pausaError) throw pausaError;
      } else {
        // Registrar pausa normal para todos os colaboradores ativos
        const { data: colaboradoresOS, error: colabError } = await supabase
          .from('os_colaboradores')
          .select('colaborador_id')
          .eq('os_id', os.id)
          .eq('ativo', true);

        if (colabError) throw colabError;
        if (colaboradoresOS && colaboradoresOS.length > 0) {
          const registrosPausa = colaboradoresOS.map(({ colaborador_id }) => ({
            os_id: os.id,
            colaborador_id,
            tipo: tipo,
            data_inicio: new Date().toISOString(),
            motivo: null
          }));
          const { error: pausaError } = await supabase
            .from('os_tempo')
            .insert(registrosPausa);
          if (pausaError) throw pausaError;
        }
      }

      // Atualizar status da OS
      const { error: osError } = await supabase
        .from('ordens_servico')
        .update({ 
          status: 'pausada'
        })
        .eq('id', os.id);
      if (osError) throw osError;

      // Atualizar contador de paradas para cada colaborador (se for parada_material)
      if (tipo === 'parada_material') {
        const { data: colaboradoresOS } = await supabase
          .from('os_colaboradores')
          .select('colaborador_id')
          .eq('os_id', os.id)
          .eq('ativo', true);
        if (colaboradoresOS && colaboradoresOS.length > 0) {
          const updatePromises = colaboradoresOS.map(({ colaborador_id }) =>
            supabase.rpc('increment_paradas_material', { colaborador_id })
          );
          await Promise.all(updatePromises);
        }
      }

      toast({ 
        title: tipo === 'pausa' ? "OS pausada com sucesso!" : "Parada por falta de material registrada!",
        description: tipo === 'parada_material' ? "Os colaboradores foram notificados e o tempo será contabilizado." : undefined
      });
      fetchOrdensServico();
    } catch (error) {
      let msg = '';
      if (error && typeof error === 'object') {
        if ('message' in error && error.message) msg += error.message + '\n';
        if ('details' in error && error.details) msg += error.details + '\n';
        if ('hint' in error && error.hint) msg += error.hint + '\n';
        if ('code' in error && error.code) msg += 'Código: ' + error.code + '\n';
        if (!msg && error.toString) msg += error.toString();
      } else {
        msg = String(error);
      }
      toast({ 
        title: "Erro ao pausar OS", 
        description: msg || 'Erro desconhecido',
        variant: "destructive" 
      });
    } finally {
      setIsPausing(false);
      setShowParadaDialog(false);
      setMotivoParada('');
    }
  };

  const handleFinishOS = async (os: OrdemServicoComRelacoes) => {
    setIsFinishing(true);
    try {
      // Encontrar o registro de tempo atual sem data_fim
      const { data: tempoAtual } = await supabase
        .from('os_tempo')
        .select('*')
        .eq('os_id', os.id)
        .is('data_fim', null)
        .single();

      if (tempoAtual) {
        // Finalizar o tempo atual
        const { error: updateError } = await supabase
          .from('os_tempo')
          .update({ data_fim: new Date().toISOString() })
          .eq('id', tempoAtual.id);

        if (updateError) throw updateError;
      }

      // Atualizar status da OS
      const { error: osError } = await supabase
        .from('ordens_servico')
        .update({ 
          status: 'finalizada',
          data_fim: new Date().toISOString()
        })
        .eq('id', os.id);

      if (osError) throw osError;

      toast({ title: "OS finalizada com sucesso!" });
      fetchOrdensServico();
    } catch (error) {
      toast({ 
        title: "Erro ao finalizar OS", 
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive" 
      });
    } finally {
      setIsFinishing(false);
    }
  };

  const handleAssociateColaboradores = async (os: OrdemServicoComRelacoes) => {
    try {
      const colaboradoresToSave = selectedColaboradores.map(colaboradorId => ({
        os_id: os.id,
        colaborador_id: colaboradorId,
      }));

      const { error } = await supabase
        .from('os_colaboradores')
        .insert(colaboradoresToSave);

      if (error) throw error;

      toast({ title: "Colaboradores associados com sucesso!" });
      setShowColaboradoresDialog(false);
      setSelectedColaboradores([]);
      fetchOrdensServico();
    } catch (error) {
      toast({ 
        title: "Erro ao associar colaboradores", 
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive" 
      });
    }
  };
  
  const filteredOrdens = statusFilter ? ordens.filter(os => os.status === statusFilter) : ordens;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ordens de Serviço</h1>
          <p className="text-muted-foreground">Crie e gerencie as ordens de serviço.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddNew} type="button">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Ordem de Serviço
          </Button>
          <Button onClick={() => window.print()} type="button" className="bg-primary text-white font-semibold shadow-soft hover:bg-primary/80 transition">
            Imprimir / Exportar PDF
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <label>Status:</label>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Todos</option>
          <option value="aberta">Aberta</option>
          <option value="em_andamento">Em andamento</option>
          <option value="finalizada">Finalizada</option>
          <option value="cancelada">Cancelada</option>
          <option value="pausada">Pausada</option>
          <option value="falta_material">Falta de material</option>
        </select>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OS</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Colaboradores</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : (
              filteredOrdens.map((os) => (
                <TableRow key={os.id}>
                  <TableCell className="font-medium">{os.numero_os}</TableCell>
                  <TableCell>{os.clientes?.nome || 'N/A'}</TableCell>
                  <TableCell className="truncate max-w-xs">{os.descricao}</TableCell>
                  <TableCell>
                    <span className={`status-${os.status?.replace('_', '-')} px-2 py-1 rounded text-xs font-semibold border`}>
                      {os.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </TableCell>
                  <TableCell>{formatCurrency(os.valor_total)}</TableCell>
                  <TableCell>{formatDate(os.data_abertura)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {os.os_colaboradores?.map(c => (
                        <Badge key={c.colaborador?.nome} variant="outline">
                          {c.colaborador?.nome}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(os)}>
                          <Pencil className="mr-2 h-4 w-4" />Editar
                        </DropdownMenuItem>
                        {os.status === 'aberta' && (
                          <>
                            <DropdownMenuItem onClick={() => {
                              setSelectedOs(os);
                              setShowColaboradoresDialog(true);
                            }}>
                              <UserPlus className="mr-2 h-4 w-4" />Associar Colaboradores
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStartOS(os)} disabled={isStarting}>
                              <Play className="mr-2 h-4 w-4" />Iniciar OS
                            </DropdownMenuItem>
                          </>
                        )}
                        {os.status === 'em_andamento' && (
                          <>
                            <DropdownMenuItem onClick={() => handlePauseOS(os)} disabled={isPausing}>
                              <Pause className="mr-2 h-4 w-4" />Pausar OS
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedOs(os);
                                setShowParadaDialog(true);
                              }} 
                              disabled={isPausing}
                              className="text-destructive"
                            >
                              <AlertTriangle className="mr-2 h-4 w-4" />Parada por Falta de Material
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleFinishOS(os)} disabled={isFinishing}>
                              <CheckCircle className="mr-2 h-4 w-4" />Finalizar OS
                            </DropdownMenuItem>
                          </>
                        )}
                        {os.status === 'pausada' && (
                          <DropdownMenuItem onClick={() => handleStartOS(os)} disabled={isStarting}>
                            <Play className="mr-2 h-4 w-4" />Retomar OS
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive" 
                          onClick={() => setOsToDelete(os)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedOs ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</DialogTitle>
            <DialogDescription>{selectedOs ? 'Altere os dados da OS.' : 'Preencha os dados da nova OS.'}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto flex flex-col space-y-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="cliente_id" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Cliente</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                            {field.value ? clientes.find(c => c.id === field.value)?.nome : "Selecione um cliente"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar cliente..." />
                          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {clientes.map((c) => (
                                <CommandItem value={c.id} key={c.id} onSelect={() => {form.setValue("cliente_id", c.id)}}>
                                  {c.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="status" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Input disabled {...field} value={field.value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField name="descricao" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição dos Serviços</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva o serviço a ser realizado..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="tempo_execucao_previsto" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo de Execução Previsto (horas)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.5"
                        {...field}
                        onChange={e => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="meta_hora" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta por Hora (R$)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field}
                        onChange={e => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="text-lg font-semibold">Produtos</h3>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button">
                      <PlusCircle className="mr-2 h-4 w-4" />Adicionar Produto
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar produto..." />
                      <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {produtos.map((p) => (
                            <CommandItem value={p.nome} key={p.id} onSelect={() => handleAddProduct(p)}>
                              {p.nome} - {formatCurrency(p.preco_unitario)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                <div className="overflow-y-auto max-h-48">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="w-24">Qtd.</TableHead>
                        <TableHead className="w-32">Vlr. Unit.</TableHead>
                        <TableHead className="w-32">Subtotal</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Nenhum produto adicionado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        fields.map((field, index) => (
                          <TableRow key={field.id}>
                            <TableCell>{field.nome}</TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                {...form.register(`produtos.${index}.quantidade`, { valueAsNumber: true })} 
                                min={1} 
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>{formatCurrency(field.preco_unitario)}</TableCell>
                            <TableCell>
                              {formatCurrency(watchedProdutos[index]?.quantidade * watchedProdutos[index]?.preco_unitario)}
                            </TableCell>
                            <TableCell>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive" 
                                onClick={() => remove(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="text-right space-y-1 pt-5">
                <p className="text-muted-foreground">Valor Total:</p>
                <p className="text-2xl font-bold">{formatCurrency(valorTotalOS)}</p>
              </div>
            </form>
            
            <DialogFooter className="pt-4 border-t">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving} onClick={form.handleSubmit(onSubmit)}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Salvando...' : 'Salvar OS'}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!osToDelete} onOpenChange={(open) => !open && setOsToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente a OS <span className="font-bold">{osToDelete?.numero_os}</span> e todos os seus produtos.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showColaboradoresDialog} onOpenChange={setShowColaboradoresDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associar Colaboradores</DialogTitle>
            <DialogDescription>Selecione os colaboradores que trabalharão nesta OS.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {colaboradores.map((colaborador) => (
              <div key={colaborador.id} className="flex items-center space-x-2">
                <Checkbox
                  id={colaborador.id}
                  checked={selectedColaboradores.includes(colaborador.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedColaboradores([...selectedColaboradores, colaborador.id]);
                    } else {
                      setSelectedColaboradores(selectedColaboradores.filter(id => id !== colaborador.id));
                    }
                  }}
                />
                <label htmlFor={colaborador.id}>{colaborador.nome}</label>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowColaboradoresDialog(false)}>Cancelar</Button>
            <Button onClick={() => handleAssociateColaboradores(selectedOs!)}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showParadaDialog} onOpenChange={setShowParadaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parada por Falta de Material</DialogTitle>
            <DialogDescription>Informe o motivo da parada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Motivo</label>
              <textarea
                className="w-full border rounded px-3 py-2 min-h-[80px]"
                placeholder="Descreva o motivo da parada..."
                value={motivoParada}
                onChange={(e) => setMotivoParada(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowParadaDialog(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedOs && handlePauseOS(selectedOs, 'parada_material')}
              disabled={!motivoParada.trim() || !selectedOs}
            >
              Confirmar Parada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 