import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  PlusCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
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
import { useToast } from '@/components/ui/use-toast';
// Remover import do ReportTemplate se não for mais usado
// import { ReportTemplate } from '@/components/ui/ReportTemplate';

// Esquema de validação Zod
const produtoSchema = z.object({
  nome: z
    .string()
    .min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  descricao: z.string().nullable().optional(),
  preco_unitario: z
    .number()
    .min(0, { message: 'O preço não pode ser negativo.' }),
  estoque: z.number().nullable().optional(),
  unidade: z.string().nullable().optional(),
  percentual_global: z.number().nullable().optional(),
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
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [produtoToDelete, setProdutoToDelete] = useState<Produto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
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

  // Filtrar produtos baseado no termo de pesquisa
  useEffect(() => {
    if (termoPesquisa.trim() === '') {
      setProdutosFiltrados(produtos);
    } else {
      const filtrados = produtos.filter((produto) =>
        produto.nome.toLowerCase().includes(termoPesquisa.toLowerCase())
      );
      setProdutosFiltrados(filtrados);
    }
  }, [produtos, termoPesquisa]);

  useEffect(() => {
    if (selectedProduto) {
      form.reset({
        ...selectedProduto,
        descricao: selectedProduto.descricao || '',
        preco_unitario: selectedProduto.preco_unitario || 0,
        estoque: selectedProduto.estoque || 0,
        unidade: selectedProduto.unidade || 'UN',
        percentual_global: selectedProduto.percentual_global || 0,
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
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('nome', { ascending: true });
    if (error) {
      toast({
        title: 'Erro ao buscar produtos',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setProdutos(data);
      setProdutosFiltrados(data); // Inicializar produtos filtrados
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
      descricao: values.descricao || null,
      estoque: values.estoque || null,
      unidade: values.unidade || null,
      percentual_global: values.percentual_global || null,
    };

    const { error } = selectedProduto
      ? await supabase
          .from('produtos')
          .update(dataToSave)
          .eq('id', selectedProduto.id)
      : await supabase.from('produtos').insert([dataToSave]);

    if (error) {
      toast({
        title: `Erro ao ${selectedProduto ? 'atualizar' : 'salvar'} produto`,
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: `Produto ${selectedProduto ? 'atualizado' : 'salvo'} com sucesso!`,
      });
      setSheetOpen(false);
      fetchProdutos();
    }
    setIsSaving(false);
  };

  const handleDeleteConfirm = async () => {
    if (!produtoToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', produtoToDelete.id);
    if (error) {
      toast({
        title: 'Erro ao excluir produto',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Produto excluído com sucesso!' });
      setProdutoToDelete(null);
      fetchProdutos();
    }
    setIsDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie os produtos e o estoque da sua empresa.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddNew} type="button">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Produto
          </Button>
          <Button
            onClick={() => window.print()}
            type="button"
            className="bg-primary font-semibold text-white shadow-soft transition hover:bg-primary/80"
          >
            Imprimir / Exportar PDF
          </Button>
        </div>
      </div>
      {/* Campo de pesquisa */}
      <div className="mb-4">
        <Input
          placeholder="Pesquisar produtos por nome..."
          value={termoPesquisa}
          onChange={(e) => setTermoPesquisa(e.target.value)}
          className="max-w-md"
        />
        {termoPesquisa && (
          <p className="mt-1 text-sm text-muted-foreground">
            {produtosFiltrados.length} produto(s) encontrado(s)
          </p>
        )}
      </div>

      <div className="rounded-lg border print-area">
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
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : (
              produtosFiltrados.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell className="font-medium">{produto.nome}</TableCell>
                  <TableCell>
                    {formatCurrency(produto.preco_unitario)}
                  </TableCell>
                  <TableCell>{`${produto.estoque || 0} ${produto.unidade || 'UN'}`}</TableCell>
                  <TableCell>
                    <Badge variant={produto.ativo ? 'default' : 'destructive'}>
                      {produto.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
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
                        <DropdownMenuItem onClick={() => handleEdit(produto)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setProdutoToDelete(produto)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
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
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100vw;
            background: white;
            z-index: 9999;
          }
        }
      `}</style>
      {/* Painel Lateral (Sheet) para Adicionar/Editar Produto */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {selectedProduto ? 'Editar Produto' : 'Adicionar Novo Produto'}
            </SheetTitle>
            <SheetDescription>
              {selectedProduto
                ? 'Altere os dados do produto.'
                : 'Preencha os dados do novo produto.'}
            </SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-4"
            >
              <FormField
                name="nome"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome do produto"
                        value={field.value || ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="descricao"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição detalhada do produto"
                        value={field.value || ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="preco_unitario"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço Unitário</FormLabel>
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
                <FormField
                  name="percentual_global"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>% Global</FormLabel>
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="estoque"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estoque</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              field.onChange(0);
                            } else {
                              const numValue = parseInt(value);
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
                <FormField
                  name="unidade"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="UN, KG, L"
                          value={field.value || ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end pt-6">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSaving ? 'Salvando...' : 'Salvar Produto'}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!produtoToDelete}
        onOpenChange={(open) => !open && setProdutoToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o
              produto <span className="font-bold">{produtoToDelete?.nome}</span>
              .
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
    </div>
  );
}
