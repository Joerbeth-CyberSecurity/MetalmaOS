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
  StopCircle,
  Percent,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';
import { Checkbox } from '@/components/ui/checkbox';
import { OSResponsiveTable } from '@/components/ui/responsive-table';
import { JustificativaDialog } from '@/components/JustificativaDialog';
import { useAuditoriaOS } from '@/hooks/useAuditoriaOS';
// Remover import do ReportTemplate se não for mais usado
// import { ReportTemplate } from '@/components/ui/ReportTemplate';

// Tipos baseados no schema do Supabase (types.ts)
type ClienteRow = Database['public']['Tables']['clientes']['Row'];
type ProdutoRow = Database['public']['Tables']['produtos']['Row'];
type OrdemServicoRow = Database['public']['Tables']['ordens_servico']['Row'] & {
  desconto_tipo?: 'valor' | 'percentual' | null;
  desconto_valor?: number | null;
  valor_total_com_desconto?: number | null;
};
type OsProdutosRow = Database['public']['Tables']['os_produtos']['Row'];
type ColaboradorRow = Database['public']['Tables']['colaboradores']['Row'];

// Esquema de validação para produtos dentro da OS (formulário)
const osProdutoSchema = z.object({
  produto_id: z.string({ required_error: 'Selecione um produto.' }),
  quantidade: z
    .number()
    .min(1, 'A quantidade deve ser pelo menos 1.')
    .default(1),
  preco_unitario: z
    .number()
    .min(0, 'Valor unitário não pode ser negativo.')
    .max(1_000_000, 'Valor unitário muito alto.'),
  nome: z.string(), // Campo obrigatório para exibição
});

// Esquema de validação principal da OS (formulário)
const osSchema = z.object({
  cliente_id: z.string({ required_error: 'Selecione um cliente.' }),
  descricao: z
    .string()
    .min(5, { message: 'A descrição deve ter pelo menos 5 caracteres.' }),
  status: z.string().default('aberta'),
  fabrica: z.string().optional(),
  produtos: z
    .array(osProdutoSchema)
    .min(1, 'Adicione pelo menos um produto à OS.'),
  tempo_execucao_previsto: z
    .number()
    .min(0, 'O tempo previsto não pode ser negativo.')
    .optional(),
  meta_hora: z
    .number()
    .min(0, 'A meta por hora não pode ser negativa.')
    .optional(),
  colaboradores: z
    .array(z.string())
    .min(1, 'Selecione pelo menos um colaborador.')
    .optional(),
  valor_total: z.number().min(0).optional(),
  numero_os: z.string().optional(),
  data_abertura: z.string().optional(),
  data_previsao: z.string().optional(),
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
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
const formatDate = (dateString: string | null) =>
  dateString
    ? new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : 'N/A';
const getStatusClass = (status: string | null): string => {
  switch (status) {
    case 'aberta':
      return 'status-aberta';
    case 'em_andamento':
      return 'status-em-andamento';
    case 'finalizada':
      return 'status-finalizada';
    case 'cancelada':
      return 'status-cancelada';
    case 'pausada':
      return 'status-pausada';
    case 'falta_material':
      return 'status-falta-material';
    default:
      return 'status-aberta';
  }
};

// Converte strings como "R$ 1.234,56" ou "1234,56" para número 1234.56
const parseCurrencyToNumber = (input: string): number => {
  if (!input) return 0;
  const cleaned = input
    .replace(/\s/g, '')
    .replace(/R\$\s?/i, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

// Mantém apenas dígitos e vírgula, remove pontos de milhar e limita a 2 casas decimais
const sanitizeCurrencyInput = (raw: string): string => {
  if (!raw) return '';
  // remove tudo que não for dígito, vírgula ou ponto
  let s = raw.replace(/[^0-9.,]/g, '');
  // remove pontos (milhar)
  s = s.replace(/\./g, '');
  // mantém apenas a primeira vírgula
  const parts = s.split(',');
  if (parts.length > 1) {
    const dec = parts.slice(1).join('');
    s = parts[0] + ',' + dec;
  }
  // limita a 2 casas decimais se houver vírgula
  const [intPart, decPart] = s.split(',');
  if (typeof decPart !== 'undefined') {
    s = intPart + ',' + decPart.slice(0, 2);
  }
  // remove zeros à esquerda excessivos no inteiro
  const intSan = intPart.replace(/^0+(\d)/, '$1');
  return typeof decPart === 'undefined' ? intSan : intSan + ',' + decPart?.slice(0, 2);
};

export default function OrdensServico() {
  const [ordens, setOrdens] = useState<OrdemServicoComRelacoes[]>([]);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [produtos, setProdutos] = useState<ProdutoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedOs, setSelectedOs] = useState<OrdemServicoComRelacoes | null>(
    null
  );
  const [osToDelete, setOsToDelete] = useState<OrdemServicoComRelacoes | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  // Hook de auditoria
  const {
    auditarCriacaoOS,
    auditarEdicaoOS,
    auditarExclusaoOS,
    auditarInicioOS,
    auditarReinicioOS,
    auditarPausaOS,
    auditarParadaOS,
    auditarFinalizacaoOS,
    auditarAdicaoColaborador,
    auditarRemocaoColaborador
  } = useAuditoriaOS();
  const [colaboradores, setColaboradores] = useState<ColaboradorRow[]>([]);
  const [showColaboradoresDialog, setShowColaboradoresDialog] = useState(false);
  const [selectedColaboradores, setSelectedColaboradores] = useState<string[]>(
    []
  );
  const [isStarting, setIsStarting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showDescontoDialog, setShowDescontoDialog] = useState(false);
  const [tipoDesconto, setTipoDesconto] = useState<'valor' | 'percentual'>('valor');
  const [valorDesconto, setValorDesconto] = useState<number>(0);
  const [showParadaDialog, setShowParadaDialog] = useState(false);
  const [motivoParada, setMotivoParada] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [produtoSearch, setProdutoSearch] = useState('');
  const [descontoFilter, setDescontoFilter] = useState<'todos' | 'com' | 'sem'>('todos');
  const [showJustificativaDialog, setShowJustificativaDialog] = useState(false);
  const [justificativaTipo, setJustificativaTipo] = useState<'pausa' | 'parada'>('pausa');
  const [osParaJustificativa, setOsParaJustificativa] = useState<OrdemServicoComRelacoes | null>(null);
  const [tempoTolerancia, setTempoTolerancia] = useState<number>(120);
  // Controla o texto exibido no input de preço por linha enquanto o usuário digita
  const [priceInputs, setPriceInputs] = useState<Record<number, string>>({});
  const setPriceDisplay = (idx: number, text: string) =>
    setPriceInputs((prev) => ({ ...prev, [idx]: text }));

  const form = useForm<OsFormData>({
    resolver: zodResolver(osSchema),
    defaultValues: { status: 'aberta', produtos: [], fabrica: 'Metalma', data_abertura: new Date().toISOString().slice(0, 10), data_previsao: new Date().toISOString().slice(0, 10) },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'produtos',
  });

  const watchedProdutos = form.watch('produtos');
  const valorTotalOS = watchedProdutos.reduce(
    (total, p) => total + p.quantidade * p.preco_unitario,
    0
  );

  // Carga de expediente dinâmica via configuracoes
  const [expSegSex, setExpSegSex] = useState<number>(8);
  const [expSab, setExpSab] = useState<number>(4);
  const [expDom, setExpDom] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('configuracoes')
          .select('chave, valor')
          .in('chave', [
            'expediente_horas_segsex',
            'expediente_horas_sabado',
            'expediente_horas_domingo',
          ]);
        const map = Object.fromEntries((data || []).map((r: any) => [r.chave, r.valor]));
        setExpSegSex(isNaN(parseFloat(map.expediente_horas_segsex)) ? 8 : parseFloat(map.expediente_horas_segsex));
        setExpSab(isNaN(parseFloat(map.expediente_horas_sabado)) ? 4 : parseFloat(map.expediente_horas_sabado));
        setExpDom(isNaN(parseFloat(map.expediente_horas_domingo)) ? 0 : parseFloat(map.expediente_horas_domingo));
      } catch {}
    })();
  }, []);

  // Calcula horas úteis entre data_abertura e data_previsao conforme expediente configurado
  const calcularHorasUteis = (inicioISO?: string, fimISO?: string): number => {
    if (!inicioISO || !fimISO) return 0;
    const inicio = new Date(`${inicioISO}T00:00:00Z`);
    const fim = new Date(`${fimISO}T00:00:00Z`);
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return 0;
    if (fim < inicio) return 0;

    let horas = 0;
    const cursor = new Date(inicio);
    while (cursor <= fim) {
      const day = cursor.getUTCDay(); // 0=Dom,6=Sáb
      if (day === 0) {
        horas += expDom;
      } else if (day === 6) {
        horas += expSab;
      } else {
        horas += expSegSex;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return horas;
  };

  // Pré-visualização leve para UI (sem efeitos colaterais)
  const aberturaPreview = ((): string | undefined => {
    try {
      return form.watch('data_abertura');
    } catch { return undefined; }
  })();
  const previsaoPreview = ((): string | undefined => {
    try {
      // @ts-ignore
      return (form.watch('data_previsao') as any) as string | undefined;
    } catch { return undefined; }
  })();
  const horasPreview = calcularHorasUteis(aberturaPreview, previsaoPreview);
  const intervaloInvalido = Boolean(
    aberturaPreview && previsaoPreview && new Date(`${previsaoPreview}T00:00:00Z`) < new Date(`${aberturaPreview}T00:00:00Z`)
  );

  // Atualiza automaticamente o tempo_execucao_previsto quando datas mudam (evita loop)
  useEffect(() => {
    const sub = form.watch((values, info) => {
      const changedField = info?.name;
      if (changedField !== 'data_abertura' && changedField !== 'data_previsao') return;
      const horas = calcularHorasUteis(values.data_abertura, (values as any).data_previsao);
      if (isNaN(horas)) return;
      const current = form.getValues('tempo_execucao_previsto');
      if (current !== horas) {
        form.setValue('tempo_execucao_previsto', horas, { shouldDirty: true });
      }
    });
    return () => sub.unsubscribe();
  }, [form, expSegSex, expSab, expDom]);

  // Define o tempo previsto inicial com base nas datas atuais (ex.: hoje = 8h, sábado = 4h, domingo = 0h)
  useEffect(() => {
    const v = form.getValues();
    const horas = calcularHorasUteis(v.data_abertura, (v as any).data_previsao);
    if (!isNaN(horas)) {
      form.setValue('tempo_execucao_previsto', horas, { shouldDirty: true });
    }
    // também quando as janelas de expediente carregarem
  }, [form, expSegSex, expSab, expDom]);

  useEffect(() => {
    fetchOrdensServico();
    fetchClientes();
    fetchProdutos();
    fetchColaboradores();
    fetchTempoTolerancia();
  }, []);

  const fetchTempoTolerancia = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'tempo_tolerancia_pausa')
        .single();

      if (data) {
        setTempoTolerancia(parseInt(data.valor) || 120);
      }
    } catch (error) {
      console.error('Erro ao buscar tempo de tolerância:', error);
    }
  };

  useEffect(() => {
    if (dialogOpen) {
      if (selectedOs) {
        // Primeiro, vamos garantir que temos todos os dados necessários
        const produtosComNome = selectedOs.os_produtos.map((p) => {
          const produtoCompleto = produtos.find(
            (prod) => prod.id === p.produto_id
          );
          return {
            produto_id: p.produto_id ?? '',
            quantidade: p.quantidade,
            preco_unitario: p.preco_unitario,
            nome:
              produtoCompleto?.nome ||
              p.produtos?.nome ||
              'Produto não encontrado',
          };
        });

        form.reset({
          cliente_id: selectedOs.cliente_id ?? '',
          descricao: selectedOs.descricao,
          status: selectedOs.status ?? 'aberta',
          fabrica: (selectedOs as any).fabrica || 'Metalma',
          produtos: produtosComNome,
          data_abertura: (selectedOs as any)?.data_abertura
            ? String((selectedOs as any).data_abertura).slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          data_previsao: (selectedOs as any)?.data_previsao
            ? String((selectedOs as any).data_previsao).slice(0, 10)
            : String((selectedOs as any)?.data_abertura || new Date().toISOString()).slice(0, 10),
        });
      } else {
        form.reset({
          descricao: '',
          cliente_id: '',
          status: 'aberta',
          fabrica: 'Metalma',
          produtos: [],
          data_abertura: new Date().toISOString().slice(0, 10),
          data_previsao: new Date().toISOString().slice(0, 10),
        });
        const v = form.getValues();
        const horas = calcularHorasUteis(v.data_abertura, (v as any).data_previsao);
        if (!isNaN(horas)) {
          form.setValue('tempo_execucao_previsto', horas, { shouldDirty: true });
        }
      }
    }
  }, [selectedOs, dialogOpen, form, produtos]);

  const fetchOrdensServico = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ordens_servico')
      .select(
        `
        *,
        clientes ( nome ),
        os_produtos ( *, produtos ( nome ) ),
        os_colaboradores ( id, colaborador_id, colaborador:colaboradores(nome) ),
        os_tempo ( tipo, data_inicio, data_fim, colaborador:colaboradores(nome) )
      `
      )
      .order('data_abertura', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao buscar OS',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setOrdens(data as OrdemServicoComRelacoes[]);
    }
    setLoading(false);
  };

  const fetchClientes = async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    if (error)
      toast({
        title: 'Erro ao buscar clientes',
        description: error.message,
        variant: 'destructive',
      });
    else setClientes(data);
  };

  const fetchProdutos = async () => {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    if (error)
      toast({
        title: 'Erro ao buscar produtos',
        description: error.message,
        variant: 'destructive',
      });
    else setProdutos(data);
  };

  const fetchColaboradores = async () => {
    const { data, error } = await supabase
      .from('colaboradores')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error)
      toast({
        title: 'Erro ao buscar colaboradores',
        description: error.message,
        variant: 'destructive',
      });
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
    if (fields.some((p) => p.produto_id === produto.id)) {
      toast({
        title: 'Produto já adicionado',
        description: 'Este produto já está na lista.',
      });
      return;
    }
    append({
      produto_id: produto.id,
      nome: produto.nome,
      preco_unitario: produto.preco_unitario,
      quantidade: 1,
    });
  };

  const onSubmit = async (values: OsFormData) => {
    setIsSaving(true);
    const { produtos: produtosForm } = values;

    console.log('Produtos do formulário:', produtosForm);

    try {
      if (selectedOs) {
        // UPDATE
        const osDataToUpdate: Database['public']['Tables']['ordens_servico']['Update'] =
          {
            cliente_id: values.cliente_id,
            descricao: values.descricao,
            status: values.status,
            fabrica: (values as any).fabrica || null,
            valor_total: valorTotalOS,
            tempo_execucao_previsto: values.tempo_execucao_previsto,
            // meta_hora removido do envio ao banco
            data_abertura: values.data_abertura
              ? new Date(values.data_abertura).toISOString()
              : undefined,
            data_previsao: (values as any).data_previsao
              ? new Date((values as any).data_previsao).toISOString()
              : undefined,
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
        const produtosToSave: Database['public']['Tables']['os_produtos']['Insert'][] =
          produtosForm.map((p) => ({
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

        // Auditoria: edição de OS
        await auditarEdicaoOS(selectedOs, {
          ...selectedOs,
          ...osDataToUpdate,
          valor_total: valorTotalOS
        });

        toast({ title: 'OS atualizada com sucesso!' });
        setDialogOpen(false);
        fetchOrdensServico();
      } else {
        // Antes de inserir, obter o valor exato da próxima OS, priorizando 'proxima_os'
        let numeroOsValor = '';
        let usouProxima = false;
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
        try {
          const { data: cfgProx } = await supabase
            .from('configuracoes')
            .select('valor')
            .eq('chave', 'proxima_os')
            .single();
          const prox = (cfgProx?.valor || '').trim();
          if (prox) {
            numeroOsValor = prox;
            usouProxima = true;
          } else {
            const { data: cfgPrefixo } = await supabase
              .from('configuracoes')
              .select('valor')
              .eq('chave', 'prefixo_os')
              .single();
            numeroOsValor = (cfgPrefixo?.valor || '').trim() || 'Gerando...';
          }
        } catch {}

        // Garante unicidade antes do INSERT (evita duplicate key)
        const ensureUniqueNumeroOs = async (valor: string): Promise<string> => {
          if (!valor || valor === 'Gerando...') return valor;
          let atual = valor;
          for (let i = 0; i < 20; i++) {
            const { count } = await supabase
              .from('ordens_servico')
              .select('id', { count: 'exact', head: true })
              .eq('numero_os', atual);
            if ((count || 0) === 0) return atual;
            atual = incrementOsNotation(atual);
          }
          return atual;
        };
        const numeroUnicoParaInserir = await ensureUniqueNumeroOs(numeroOsValor);

        // INSERT
        const { data: newOs, error: osError } = await supabase
          .from('ordens_servico')
          .insert({
            descricao: values.descricao,
            cliente_id: values.cliente_id,
            status: values.status,
            fabrica: (values as any).fabrica || null,
            valor_total: valorTotalOS,
            tempo_execucao_previsto: values.tempo_execucao_previsto,
            // meta_hora removido do envio ao banco
            // Definimos aqui o número exato; o trigger respeitará se não for 'Gerando...'
            numero_os: numeroUnicoParaInserir,
            data_abertura: values.data_abertura
              ? new Date(values.data_abertura).toISOString()
              : new Date().toISOString(),
            data_previsao: (values as any).data_previsao
              ? new Date((values as any).data_previsao).toISOString()
              : null,
          })
          .select()
          .single();

        if (osError || !newOs) throw osError || new Error('Falha ao criar OS');

        console.log('OS criada:', newOs);

        // Se usamos 'proxima_os', incrementa e salva o próximo para evitar duplicidade
        if (usouProxima && numeroUnicoParaInserir && numeroUnicoParaInserir !== 'Gerando...') {
          const proximo = incrementOsNotation(numeroUnicoParaInserir);
          if (proximo && proximo !== numeroOsValor) {
            await supabase
              .from('configuracoes')
              .upsert({ chave: 'proxima_os', valor: proximo }, { onConflict: 'chave' });
          }
        }

        const produtosToSave: Database['public']['Tables']['os_produtos']['Insert'][] =
          produtosForm.map((p) => ({
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

        // Auditoria: criação de OS
        await auditarCriacaoOS(newOs);

        toast({ title: 'OS salva com sucesso!' });
        setDialogOpen(false);
        fetchOrdensServico();
      }
    } catch (error) {
      console.error('Erro ao salvar OS:', error);
      let msg =
        'Erro ao salvar OS. Verifique os campos obrigatórios e tente novamente.';
      if (error && typeof error === 'object') {
        if ('message' in error && error.message) {
          msg += `\n${error.message}`;
        } else if ('toString' in error) {
          msg += `\n${error.toString()}`;
        }
      }
      toast({
        title: 'Erro ao salvar OS',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!osToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase
      .from('ordens_servico')
      .delete()
      .eq('id', osToDelete.id);
    if (error)
      toast({
        title: 'Erro ao excluir OS',
        description: error.message,
        variant: 'destructive',
      });
    else {
      // Auditoria: exclusão de OS
      await auditarExclusaoOS(osToDelete);
      
      toast({ title: 'OS excluída com sucesso!' });
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
          data_inicio: new Date().toISOString(),
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
      if (!colaboradoresOS || colaboradoresOS.length === 0)
        throw new Error('Nenhum colaborador ativo na OS.');

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

      // Auditoria: início ou reinício de OS baseado no status anterior
      if (os.status === 'pausada') {
        await auditarReinicioOS(os, colaboradoresOS);
      } else {
        await auditarInicioOS(os, colaboradoresOS);
      }

      toast({ title: 'OS iniciada com sucesso!' });
      fetchOrdensServico();
    } catch (error) {
      toast({
        title: 'Erro ao iniciar OS',
        description:
          error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handlePauseOS = (os: OrdemServicoComRelacoes) => {
    setOsParaJustificativa(os);
    setJustificativaTipo('pausa');
    setShowJustificativaDialog(true);
  };

  const handlePararOS = (os: OrdemServicoComRelacoes) => {
    setOsParaJustificativa(os);
    setJustificativaTipo('parada');
    setShowJustificativaDialog(true);
  };

  const handleConfirmJustificativa = async (justificativa: string) => {
    if (!osParaJustificativa) return;

    setIsPausing(true);
    try {
      // Encontrar o registro de tempo atual sem data_fim
      const { data: tempoAtual } = await supabase
        .from('os_tempo')
        .select('*')
        .eq('os_id', osParaJustificativa.id)
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

      // Buscar colaboradores ativos na OS
      const { data: colaboradoresOS, error: colabError } = await supabase
        .from('os_colaboradores')
        .select('colaborador_id')
        .eq('os_id', osParaJustificativa.id)
        .eq('ativo', true);

      if (colabError) throw colabError;
      if (!colaboradoresOS || colaboradoresOS.length === 0)
        throw new Error('Nenhum colaborador ativo na OS.');

      // Inserir registro de pausa/parada para cada colaborador
      const registrosTempo = colaboradoresOS.map(({ colaborador_id }) => ({
        os_id: osParaJustificativa.id,
        colaborador_id,
        tipo: justificativaTipo === 'pausa' ? 'pausa' : 'parada_material',
        data_inicio: new Date().toISOString(),
        motivo: justificativa,
      }));

      const { error: tempoError } = await supabase
        .from('os_tempo')
        .insert(registrosTempo);

      if (tempoError) throw tempoError;

      // Salvar justificativa na tabela de justificativas
      const { error: justificativaError } = await supabase
        .from('justificativas_os')
        .insert({
          os_id: osParaJustificativa.id,
          tipo: justificativaTipo,
          justificativa: justificativa,
          colaborador_id: colaboradoresOS[0]?.colaborador_id, // Usar o primeiro colaborador como referência
          tempo_tolerancia_minutos: justificativaTipo === 'pausa' ? tempoTolerancia : 0,
        });

      if (justificativaError) throw justificativaError;

      // Atualizar status da OS
      const { error: osError } = await supabase
        .from('ordens_servico')
        .update({
          status: 'pausada',
        })
        .eq('id', osParaJustificativa.id);

      if (osError) throw osError;

      // Atualizar contador de paradas para cada colaborador (se for parada)
      if (justificativaTipo === 'parada') {
        const updatePromises = colaboradoresOS.map(({ colaborador_id }) =>
          supabase.rpc('increment_paradas_material', { colaborador_id })
        );
        await Promise.all(updatePromises);
      }

      // Auditoria: pausa ou parada de OS
      if (justificativaTipo === 'pausa') {
        await auditarPausaOS(osParaJustificativa, justificativa);
      } else {
        await auditarParadaOS(osParaJustificativa, justificativa);
      }

      toast({
        title: justificativaTipo === 'pausa' ? 'OS pausada com sucesso!' : 'OS parada com sucesso!',
        description: justificativaTipo === 'pausa' 
          ? `OS pausada. Tempo de tolerância: ${tempoTolerancia} minutos.`
          : 'A parada foi registrada e afetará a produtividade.',
      });

      fetchOrdensServico();
    } catch (error) {
      let msg = '';
      if (error && typeof error === 'object') {
        if ('message' in error && error.message) msg += error.message + '\n';
        if ('details' in error && error.details) msg += error.details + '\n';
        if ('hint' in error && error.hint) msg += error.hint + '\n';
        if ('code' in error && error.code)
          msg += 'Código: ' + error.code + '\n';
        if (!msg && error.toString) msg += error.toString();
      } else {
        msg = String(error);
      }
      toast({
        title: `Erro ao ${justificativaTipo === 'pausa' ? 'pausar' : 'parar'} OS`,
        description: msg || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsPausing(false);
      setShowJustificativaDialog(false);
      setOsParaJustificativa(null);
    }
  };

  const finalizarComDesconto = async (
    os: OrdemServicoComRelacoes,
    tipo: 'valor' | 'percentual',
    valor: number
  ) => {
    setIsFinishing(true);
    try {
      const totalAtual = os.valor_total || 0;
      const descontoValor = tipo === 'valor' ? valor : (totalAtual * (valor || 0)) / 100;
      const descontoAplicado = Math.max(0, Math.min(descontoValor, totalAtual));
      const novoTotal = Math.max(0, totalAtual - descontoAplicado);
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

      // Atualizar status e descontos da OS
      const { error: osError } = await supabase
        .from('ordens_servico')
        .update({
          status: 'finalizada',
          data_fim: new Date().toISOString(),
          desconto_tipo: tipo,
          desconto_valor: descontoAplicado,
          // valor_total_com_desconto é coluna gerada no banco; não atualizar aqui
        })
        .eq('id', os.id);

      if (osError) throw osError;

      // Auditoria: finalização de OS
      await auditarFinalizacaoOS(os);

      toast({ title: 'OS finalizada com sucesso!' });
      fetchOrdensServico();
    } catch (error) {
      toast({
        title: 'Erro ao finalizar OS',
        description:
          error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsFinishing(false);
    }
  };

  const handleFinishOS = (os: OrdemServicoComRelacoes) => {
    setSelectedOs(os);
    setTipoDesconto('valor');
    setValorDesconto(0);
    setShowDescontoDialog(true);
  };

  const handleAssociateColaboradores = async (os: OrdemServicoComRelacoes) => {
    try {
      const colaboradoresToSave = selectedColaboradores.map(
        (colaboradorId) => ({
          os_id: os.id,
          colaborador_id: colaboradorId,
        })
      );

      const { error } = await supabase
        .from('os_colaboradores')
        .insert(colaboradoresToSave);

      if (error) throw error;

      // Auditoria: adição de colaboradores
      for (const colaboradorId of selectedColaboradores) {
        const colaborador = colaboradores.find(c => c.id === colaboradorId);
        if (colaborador) {
          await auditarAdicaoColaborador(os, colaborador);
        }
      }

      toast({ title: 'Colaboradores associados com sucesso!' });
      setShowColaboradoresDialog(false);
      setSelectedColaboradores([]);
      fetchOrdensServico();
    } catch (error) {
      toast({
        title: 'Erro ao associar colaboradores',
        description:
          error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveColaborador = async (os: any, colaboracao: any) => {
    try {
      const { error } = await supabase
        .from('os_colaboradores')
        .delete()
        .eq('os_id', os.id)
        .eq('colaborador_id', colaboracao.id);

      if (error) throw error;

      // Auditoria: remoção de colaborador
      await auditarRemocaoColaborador(os, colaboracao);

      toast({ title: 'Colaborador removido com sucesso!' });
      fetchOrdensServico();
    } catch (error) {
      toast({
        title: 'Erro ao remover colaborador',
        description:
          error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const filteredOrdensBase = statusFilter
    ? ordens.filter((os) => os.status === statusFilter)
    : ordens;

  const filteredOrdens = filteredOrdensBase.filter((os) => {
    if (descontoFilter === 'com') return (os.desconto_valor || 0) > 0;
    if (descontoFilter === 'sem') return (os.desconto_valor || 0) <= 0;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Ordens de Serviço
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Crie e gerencie as ordens de serviço.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleAddNew} type="button" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nova Ordem de Serviço</span>
            <span className="sm:hidden">Nova OS</span>
          </Button>
          <Button
            onClick={() => window.print()}
            type="button"
            className="bg-primary font-semibold text-white shadow-soft transition hover:bg-primary/80 w-full sm:w-auto"
          >
            <span className="hidden sm:inline">Imprimir / Exportar PDF</span>
            <span className="sm:hidden">Imprimir</span>
          </Button>
        </div>
      </div>
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-sm font-medium text-foreground">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-auto"
          >
            <option value="">Todos</option>
            <option value="aberta">Aberta</option>
            <option value="em_andamento">Em andamento</option>
            <option value="finalizada">Finalizada</option>
            <option value="cancelada">Cancelada</option>
            <option value="pausada">Pausada</option>
            <option value="falta_material">Falta de material</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-sm font-medium text-foreground">Desconto:</label>
          <select
            value={descontoFilter}
            onChange={(e) => setDescontoFilter(e.target.value as any)}
            className="rounded border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-auto"
          >
            <option value="todos">Todos</option>
            <option value="com">Com desconto</option>
            <option value="sem">Sem desconto</option>
          </select>
        </div>
      </div>
      <OSResponsiveTable
        data={filteredOrdens}
        loading={loading}
        onEdit={handleEdit}
        onDelete={setOsToDelete}
        onStart={handleStartOS}
        onPause={handlePauseOS}
        onFinish={handleFinishOS}
        onAssociateColaboradores={(os) => {
          setSelectedOs(os);
          setShowColaboradoresDialog(true);
        }}
        onParadaMaterial={handlePararOS}
        onRemoveColaborador={handleRemoveColaborador}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>
              {selectedOs ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
            </DialogTitle>
            <DialogDescription>
              {selectedOs
                ? 'Altere os dados da OS.'
                : 'Preencha os dados da nova OS.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-grow flex-col space-y-4 overflow-y-auto pb-4"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  name="cliente_id"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Cliente</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                'w-full justify-between',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value
                                ? clientes.find((c) => c.id === field.value)
                                    ?.nome
                                : 'Selecione um cliente'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar cliente..." />
                            <CommandEmpty>
                              Nenhum cliente encontrado.
                            </CommandEmpty>
                            <CommandList>
                              <CommandGroup>
                                {clientes.map((c) => (
                                  <CommandItem
                                    value={c.nome}
                                    key={c.id}
                                    onSelect={() => {
                                      form.setValue('cliente_id', c.id);
                                    }}
                                  >
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
                  )}
                />
                <FormField
                  name="status"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Input
                          disabled
                          {...field}
                          value={field.value
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Campo Fábrica (no topo) */}
                <FormField
                  name="fabrica"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fábrica</FormLabel>
                      <FormControl>
                        <select
                          className="border rounded h-9 px-3 text-sm bg-background"
                          value={field.value || 'Metalma'}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                        >
                          <option value="Metalma">Metalma</option>
                          <option value="Galpão">Galpão</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                name="descricao"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição dos Serviços</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o serviço a ser realizado..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Datas (Abertura e Previsão) lado a lado */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  name="data_abertura"
                  control={form.control}
                  render={({ field }) => {
                    const selectedDate = field.value
                      ? new Date(`${field.value}T00:00:00`)
                      : undefined;
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data</FormLabel>
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="icon">
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date:any) => {
                                  if (!date) return;
                                  const iso = new Date(
                                    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
                                  )
                                    .toISOString()
                                    .slice(0, 10);
                                  field.onChange(iso);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <div className="h-9 rounded border bg-background px-3 text-sm flex items-center">
                            {(field.value || new Date().toISOString().slice(0,10))
                              ? new Date(`${field.value || new Date().toISOString().slice(0,10)}T00:00:00`).toLocaleDateString('pt-BR')
                              : ''}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  name="data_previsao"
                  control={form.control}
                  render={({ field }) => {
                    const selectedDate = field.value
                      ? new Date(`${field.value}T00:00:00`)
                      : undefined;
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data Previsão</FormLabel>
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="icon">
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date:any) => {
                                  if (!date) return;
                                  const iso = new Date(
                                    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
                                  )
                                    .toISOString()
                                    .slice(0, 10);
                                  field.onChange(iso);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <div className="h-9 rounded border bg-background px-3 text-sm flex items-center">
                            {field.value
                              ? new Date(`${field.value}T00:00:00`).toLocaleDateString('pt-BR')
                              : ''}
                          </div>
                        </div>
                        <div className="mt-2 text-xs">
                          {intervaloInvalido ? (
                            <span className="text-destructive">
                              A data de previsão não pode ser anterior à data de abertura.
                            </span>
                          ) : (
                            previsaoPreview ? (
                              <span className="text-muted-foreground">
                                Horas úteis previstas (expediente): {horasPreview}
                              </span>
                            ) : null
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  name="tempo_execucao_previsto"
                  control={form.control}
                  render={({ field }) => {
                    // Função para converter horas decimais para HH:MM:SS
                    const formatHoursToTime = (hours: number): string => {
                      if (!hours || hours === 0) return '00:00:00';
                      const totalMinutes = Math.round(hours * 60);
                      const h = Math.floor(totalMinutes / 60);
                      const m = Math.floor((totalMinutes % 60));
                      const s = Math.floor(((totalMinutes % 60) - m) * 60);
                      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    };

                    // Função para converter HH:MM:SS para horas decimais
                    const parseTimeToHours = (timeString: string): number => {
                      if (!timeString || timeString === '00:00:00') return 0;
                      const parts = timeString.split(':');
                      if (parts.length !== 3) return 0;
                      const hours = parseInt(parts[0]) || 0;
                      const minutes = parseInt(parts[1]) || 0;
                      const seconds = parseInt(parts[2]) || 0;
                      return hours + (minutes / 60) + (seconds / 3600);
                    };

                    // Função para aplicar máscara de entrada
                    const applyTimeMask = (value: string): string => {
                      // Remove caracteres não numéricos
                      const numbers = value.replace(/\D/g, '');
                      
                      // Limita a 6 dígitos (HHMMSS)
                      const limited = numbers.slice(0, 6);
                      
                      // Aplica a máscara HH:MM:SS
                      if (limited.length <= 2) {
                        return limited;
                      } else if (limited.length <= 4) {
                        return `${limited.slice(0, 2)}:${limited.slice(2)}`;
                      } else {
                        return `${limited.slice(0, 2)}:${limited.slice(2, 4)}:${limited.slice(4)}`;
                      }
                    };

                    // Função para incrementar/decrementar tempo
                    const adjustTime = (currentHours: number, increment: number): number => {
                      const totalMinutes = Math.round(currentHours * 60) + increment;
                      return Math.max(0, totalMinutes / 60);
                    };

                    return (
                      <FormItem>
                        <FormLabel>Tempo de Execução Previsto (HH:MM:SS)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="00:00:00"
                              value={field.value ? formatHoursToTime(field.value) : '00:00:00'}
                              onChange={(e) => {
                                const maskedValue = applyTimeMask(e.target.value);
                                const hoursValue = parseTimeToHours(maskedValue);
                                field.onChange(isNaN(hoursValue) ? 0 : hoursValue);
                              }}
                              onKeyDown={(e) => {
                                // Permitir navegação com setas
                                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                                  return;
                                }
                                // Permitir backspace e delete
                                if (e.key === 'Backspace' || e.key === 'Delete') {
                                  return;
                                }
                                // Permitir apenas números
                                if (!/[0-9]/.test(e.key) && !['Tab', 'Enter'].includes(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                              className="pr-20"
                            />
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
                              <button
                                type="button"
                                onClick={() => field.onChange(adjustTime(field.value || 0, 1))}
                                className="h-4 w-4 flex items-center justify-center text-gray-500 hover:text-gray-700"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => field.onChange(adjustTime(field.value || 0, -1))}
                                className="h-4 w-4 flex items-center justify-center text-gray-500 hover:text-gray-700"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-muted-foreground">
                          Formato: HH:MM:SS (ex: 02:30:00 para 2h30min)
                        </p>
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  name="meta_hora"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta por Hora (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              field.onChange(0);
                            } else {
                              const numValue = parseFloat(value);
                              field.onChange(isNaN(numValue) ? 0 : numValue);
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="text-lg font-semibold">Produtos</h3>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Adicionar Produto
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar produto..." />
                      <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {produtos.map((p) => (
                            <CommandItem
                              value={p.nome}
                              key={p.id}
                              onSelect={() => handleAddProduct(p)}
                            >
                              {p.nome} - {formatCurrency(p.preco_unitario)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <div className="max-h-48 overflow-y-auto">
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
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                          >
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
                                value={
                                  form.watch(`produtos.${index}.quantidade`) ||
                                  1
                                }
                                min={1}
                                className="h-8"
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '') {
                                    form.setValue(
                                      `produtos.${index}.quantidade`,
                                      1
                                    );
                                  } else {
                                    const numValue = parseInt(value);
                                    form.setValue(
                                      `produtos.${index}.quantidade`,
                                      isNaN(numValue) ? 1 : numValue
                                    );
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                inputMode="decimal"
                                className="h-8"
                                value={
                                  priceInputs[index] ?? String(
                                    (form.watch(`produtos.${index}.preco_unitario`) as number) ?? field.preco_unitario ?? ''
                                  )
                                }
                                placeholder="0,00"
                                onChange={(e) => {
                                  const raw = sanitizeCurrencyInput(e.target.value);
                                  setPriceDisplay(index, raw);
                                  if (raw === '') {
                                    form.setValue(
                                      `produtos.${index}.preco_unitario`,
                                      0,
                                      { shouldDirty: true }
                                    );
                                    return;
                                  }
                                  let numValue = parseCurrencyToNumber(raw);
                                  if (numValue < 0) numValue = 0;
                                  if (numValue > 1000000) numValue = 1000000;
                                  form.setValue(
                                    `produtos.${index}.preco_unitario`,
                                    numValue,
                                    { shouldDirty: true }
                                  );
                                }}
                                onBlur={(e) => {
                                  const raw = e.target.value;
                                  if (raw === '') {
                                    setPriceDisplay(index, '');
                                    form.setValue(
                                      `produtos.${index}.preco_unitario`,
                                      0,
                                      { shouldValidate: true, shouldDirty: true }
                                    );
                                    return;
                                  }
                                  let numValue = parseCurrencyToNumber(raw);
                                  if (numValue < 0) numValue = 0;
                                  if (numValue > 1000000) numValue = 1000000;
                                  const normalized = Number(numValue.toFixed(2));
                                  form.setValue(
                                    `produtos.${index}.preco_unitario`,
                                    normalized,
                                    { shouldValidate: true, shouldDirty: true }
                                  );
                                  // após normalizar, atualiza o texto exibido para o número simples com vírgula
                                  setPriceDisplay(
                                    index,
                                    normalized.toFixed(2).replace('.', ',')
                                  );
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {formatCurrency(
                                watchedProdutos[index]?.quantidade *
                                  watchedProdutos[index]?.preco_unitario
                              )}
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

              <div className="space-y-1 pt-5 text-right">
                <p className="text-muted-foreground">Valor Total:</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(valorTotalOS)}
                </p>
              </div>
            </form>

            <DialogFooter className="border-t pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSaving}
                onClick={form.handleSubmit(onSubmit)}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Salvando...' : 'Salvar OS'}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!osToDelete}
        onOpenChange={(open) => !open && setOsToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a
              OS <span className="font-bold">{osToDelete?.numero_os}</span> e
              todos os seus produtos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={showColaboradoresDialog}
        onOpenChange={setShowColaboradoresDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associar Colaboradores</DialogTitle>
            <DialogDescription>
              Selecione os colaboradores que trabalharão nesta OS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {colaboradores.map((colaborador) => (
              <div key={colaborador.id} className="flex items-center space-x-2">
                <Checkbox
                  id={colaborador.id}
                  checked={selectedColaboradores.includes(colaborador.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedColaboradores([
                        ...selectedColaboradores,
                        colaborador.id,
                      ]);
                    } else {
                      setSelectedColaboradores(
                        selectedColaboradores.filter(
                          (id) => id !== colaborador.id
                        )
                      );
                    }
                  }}
                />
                <label htmlFor={colaborador.id}>{colaborador.nome}</label>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowColaboradoresDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={() => handleAssociateColaboradores(selectedOs!)}>
              Confirmar
            </Button>
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
              <label className="mb-1 block text-sm font-medium">Motivo</label>
              <textarea
                className="min-h-[80px] w-full rounded border px-3 py-2"
                placeholder="Descreva o motivo da parada..."
                value={motivoParada}
                onChange={(e) => setMotivoParada(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowParadaDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedOs && handlePararOS(selectedOs)
              }
              disabled={!motivoParada.trim() || !selectedOs}
            >
              Confirmar Parada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDescontoDialog} onOpenChange={setShowDescontoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar OS - Desconto</DialogTitle>
            <DialogDescription>
              Informe um desconto em valor (R$) ou percentual (%). O total da OS será abatido e os campos ficarão salvos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <input
                  id="tipo-valor"
                  type="radio"
                  name="tipo-desconto"
                  checked={tipoDesconto === 'valor'}
                  onChange={() => setTipoDesconto('valor')}
                />
                <label htmlFor="tipo-valor">Valor (R$)</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="tipo-percentual"
                  type="radio"
                  name="tipo-desconto"
                  checked={tipoDesconto === 'percentual'}
                  onChange={() => setTipoDesconto('percentual')}
                />
                <label htmlFor="tipo-percentual">Percentual (%)</label>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Valor do Desconto</label>
              <Input
                type="number"
                step={tipoDesconto === 'valor' ? '0.01' : '0.1'}
                value={Number.isNaN(valorDesconto) ? '' : valorDesconto}
                onChange={(e) => setValorDesconto(parseFloat(e.target.value) || 0)}
              />
            </div>
            {selectedOs && (
              <div className="text-sm text-muted-foreground">
                <div>Total atual: {formatCurrency(selectedOs.valor_total || 0)}</div>
                <div>
                  Desconto aplicado:{' '}
                  {tipoDesconto === 'valor'
                    ? formatCurrency(Math.max(0, Math.min(valorDesconto || 0, selectedOs.valor_total || 0)))
                    : `${Math.max(0, Math.min(valorDesconto || 0, 100)).toFixed(2)}%`}
                </div>
                <div>
                  Novo total:{' '}
                  {formatCurrency(
                    Math.max(
                      0,
                      (selectedOs.valor_total || 0) -
                        (tipoDesconto === 'valor'
                          ? Math.max(0, Math.min(valorDesconto || 0, selectedOs.valor_total || 0))
                          : ((selectedOs.valor_total || 0) * Math.max(0, Math.min(valorDesconto || 0, 100))) / 100)
                    )
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDescontoDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!selectedOs) return;
                setShowDescontoDialog(false);
                finalizarComDesconto(selectedOs, tipoDesconto, valorDesconto);
              }}
              disabled={!selectedOs}
            >
              Confirmar e Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <JustificativaDialog
        open={showJustificativaDialog}
        onOpenChange={setShowJustificativaDialog}
        onConfirm={handleConfirmJustificativa}
        tipo={justificativaTipo}
        osNumero={osParaJustificativa?.numero_os || ''}
        tempoTolerancia={justificativaTipo === 'pausa' ? tempoTolerancia : undefined}
        loading={isPausing}
      />
    </div>
  );
}
