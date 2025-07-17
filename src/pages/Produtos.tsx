import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';

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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/components/ui/use-toast"

// Esquema de validação Zod
const produtoSchema = z.object({
  nome: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  descricao: z.string().optional(),
  preco_unitario: z.number().min(0, { message: 'O preço não pode ser negativo.' }),
  estoque: z.number().optional(),
  unidade: z.string().optional(),
  percentual_global: z.number().optional(),
});

type ProdutoFormData = z.infer<typeof produtoSchema>;

// Tipagem completa do produto
type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco_unitario: number;
  estoque: number | null;
  unidade: string | null;
  percentual_global: number | null;
  ativo: boolean;
};

// Função para formatar moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [produtoToDelete, setProdutoToDelete] = useState<Produto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      preco_unitario: 0,
      estoque: 0,
      unidade: 'UN',
      percentual_global: 0,
    },
  });

  useEffect(() => {
    fetchProdutos();
  }, []);

  useEffect(() => {
    if (selectedProduto) {
      form.reset({
        ...selectedProduto,
        preco_unitario: selectedProduto.preco_unitario || 0,
        estoque: selectedProduto.estoque || undefined,
        percentual_global: selectedProduto.percentual_global || undefined,
      });
    } else {
      form.reset({
        nome: '',
        descricao: '',
        preco_unitario: 0,
        estoque: 0,
        unidade: 'UN',
        percentual_global: 0,
      });
    }
  }, [selectedProduto, sheetOpen, form]);

  const fetchProdutos = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('produtos').select('*').order('nome', { ascending: true });
    if (error) {
      toast({ title: "Erro ao buscar produtos", description: error.message, variant: "destructive" });
    } else {
      setProdutos(data);
    }
    setLoading(false);
  };

  const handleAddNew = () => {
    setSelectedProduto(null);
    setSheetOpen(true);
  };

  const handleEdit = (produto: Produto) => {
    setSelectedProduto(produto);
    setSheetOpen(true);
  };

  const onSubmit = async (values: ProdutoFormData) => {
    setIsSaving(true);
    const dataToSave = {
      ...values,
      estoque: values.estoque || null,
      percentual_global: values.percentual_global || null,
    };

    const { error } = selectedProduto
      ? await supabase.from('produtos').update(dataToSave).eq('id', selectedProduto.id)
      : await supabase.from('produtos').insert([dataToSave]);

    if (error) {
      toast({ title: `Erro ao ${selectedProduto ? 'atualizar' : 'salvar'} produto`, description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Produto ${selectedProduto ? 'atualizado' : 'salvo'} com sucesso!` });
      setSheetOpen(false);
      fetchProdutos();
    }
    setIsSaving(false);
  };

  const handleDeleteConfirm = async () => {
    if (!produtoToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.from('produtos').delete().eq('id', produtoToDelete.id);
    if (error) {
      toast({ title: "Erro ao excluir produto", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Produto excluído com sucesso!" });
      setProdutoToDelete(null);
      fetchProdutos();
    }
    setIsDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground">Gerencie os produtos e o estoque da sua empresa.</p>
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Produto
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Preço Unitário</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : (
              produtos.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell className="font-medium">{produto.nome}</TableCell>
                  <TableCell>{formatCurrency(produto.preco_unitario)}</TableCell>
                  <TableCell>{`${produto.estoque || 0} ${produto.unidade || 'UN'}`}</TableCell>
                  <TableCell><Badge variant={produto.ativo ? 'default' : 'destructive'}>{produto.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(produto)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setProdutoToDelete(produto)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedProduto ? 'Editar Produto' : 'Adicionar Novo Produto'}</SheetTitle>
            <SheetDescription>{selectedProduto ? 'Altere os dados do produto.' : 'Preencha os dados do novo produto.'}</SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField name="nome" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Nome do produto" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="descricao" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Descrição detalhada do produto" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField name="preco_unitario" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Preço Unitário</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="percentual_global" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>% Global</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField name="estoque" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Estoque</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="unidade" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Unidade</FormLabel><FormControl><Input placeholder="UN, KG, L" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="pt-6 flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSaving ? 'Salvando...' : 'Salvar Produto'}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!produtoToDelete} onOpenChange={(open) => !open && setProdutoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o produto <span className="font-bold">{produtoToDelete?.nome}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 