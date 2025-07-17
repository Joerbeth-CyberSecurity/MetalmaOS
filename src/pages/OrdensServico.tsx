import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// Esquema de validação
const osSchema = z.object({
  cliente_id: z.string({ required_error: "Selecione um cliente." }),
  descricao: z.string().min(5, { message: "A descrição deve ter pelo menos 5 caracteres." }),
  valor_total: z.number().optional(),
  status: z.string(),
});
type OsFormData = z.infer<typeof osSchema>;

// Tipagens
type Cliente = { id: string; nome: string; };
type OrdemServico = {
  id: string;
  numero_os: string;
  descricao: string;
  status: string;
  valor_total: number | null;
  data_abertura: string;
  cliente_id: string;
  clientes: { nome: string; } | null;
};

// Funções utilitárias
const formatCurrency = (value: number | null) => {
  if (value === null || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const getStatusVariant = (status: string): 'secondary' | 'default' | 'destructive' | 'outline' => {
  switch (status) {
    case 'aberta': return 'secondary';
    case 'em_andamento': return 'default';
    case 'finalizada': return 'default';
    case 'cancelada': return 'destructive';
    default: return 'outline';
  }
};

export default function OrdensServico() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedOs, setSelectedOs] = useState<OrdemServico | null>(null);
  const [osToDelete, setOsToDelete] = useState<OrdemServico | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const form = useForm<OsFormData>({
    resolver: zodResolver(osSchema),
    defaultValues: { status: 'aberta' },
  });

  useEffect(() => {
    fetchOrdensServico();
    fetchClientes();
  }, []);

  useEffect(() => {
    if (selectedOs) {
      form.reset({
        ...selectedOs,
        valor_total: selectedOs.valor_total || undefined,
      });
    } else {
      form.reset({ descricao: '', cliente_id: '', status: 'aberta', valor_total: undefined });
    }
  }, [selectedOs, sheetOpen, form]);
  
  const fetchOrdensServico = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ordens_servico').select(`id, numero_os, descricao, status, valor_total, data_abertura, cliente_id, clientes ( nome )`).order('data_abertura', { ascending: false });
    if (error) toast({ title: "Erro ao buscar OS", description: error.message, variant: "destructive" });
    else setOrdens(data as OrdemServico[]);
    setLoading(false);
  };
  
  const fetchClientes = async () => {
    const { data, error } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome');
    if (error) toast({ title: "Erro ao buscar clientes", description: error.message, variant: "destructive" });
    else setClientes(data);
  };

  const handleAddNew = () => {
    setSelectedOs(null);
    setSheetOpen(true);
  };

  const handleEdit = (os: OrdemServico) => {
    setSelectedOs(os);
    setSheetOpen(true);
  };

  const onSubmit = async (values: OsFormData) => {
    setIsSaving(true);
    const dataToSave = { ...values, valor_total: values.valor_total || null };
    const { error } = selectedOs
      ? await supabase.from('ordens_servico').update(dataToSave).eq('id', selectedOs.id)
      : await supabase.from('ordens_servico').insert([dataToSave]);

    if (error) {
      toast({ title: `Erro ao ${selectedOs ? 'atualizar' : 'salvar'} OS`, description: error.message, variant: "destructive" });
    } else {
      toast({ title: `OS ${selectedOs ? 'atualizada' : 'salva'} com sucesso!` });
      setSheetOpen(false);
      fetchOrdensServico();
    }
    setIsSaving(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ordens de Serviço</h1>
          <p className="text-muted-foreground">Crie e gerencie as ordens de serviço.</p>
        </div>
        <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" />Nova Ordem de Serviço</Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader><TableRow><TableHead>OS</TableHead><TableHead>Cliente</TableHead><TableHead>Descrição</TableHead><TableHead>Status</TableHead><TableHead>Valor</TableHead><TableHead>Data</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow> :
              ordens.map((os) => (
                <TableRow key={os.id}>
                  <TableCell className="font-medium">{os.numero_os}</TableCell>
                  <TableCell>{os.clientes?.nome || 'N/A'}</TableCell>
                  <TableCell className="truncate max-w-xs">{os.descricao}</TableCell>
                  <TableCell><Badge variant={getStatusVariant(os.status)} className={os.status === 'finalizada' ? 'bg-green-600 text-white' : ''}>{os.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Badge></TableCell>
                  <TableCell>{formatCurrency(os.valor_total)}</TableCell>
                  <TableCell>{formatDate(os.data_abertura)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(os)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setOsToDelete(os)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{selectedOs ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</SheetTitle><SheetDescription>{selectedOs ? 'Altere os dados da OS.' : 'Preencha os dados da nova OS.'}</SheetDescription></SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField name="cliente_id" control={form.control} render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Cliente</FormLabel>
                  <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                    {field.value ? clientes.find(c => c.id === field.value)?.nome : "Selecione um cliente"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Buscar cliente..." /><CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandList><CommandGroup>{clientes.map((c) => (<CommandItem value={c.id} key={c.id} onSelect={() => {form.setValue("cliente_id", c.id)}}>{c.nome}</CommandItem>))}</CommandGroup></CommandList>
                    </Command></PopoverContent>
                  </Popover><FormMessage /></FormItem>
              )} />
              <FormField name="descricao" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Descreva o serviço a ser realizado..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField name="valor_total" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Valor Total (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="status" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel><FormControl><Input disabled {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="pt-6 flex justify-end"><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isSaving ? 'Salvando...' : 'Salvar OS'}</Button></div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!osToDelete} onOpenChange={(open) => !open && setOsToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente a OS <span className="font-bold">{osToDelete?.numero_os}</span>.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 