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
import { useToast } from '@/components/ui/use-toast';

// Função para aplicar máscara de CPF
function maskCPF(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
}
// Função para validar CPF
function isValidCPF(cpf: string) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) return false;
  let sum = 0,
    rest;
  for (let i = 1; i <= 9; i++)
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++)
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(10, 11))) return false;
  return true;
}

// Esquema de validação para o formulário de colaborador
const colaboradorSchema = z.object({
  nome: z.string().min(3, { message: 'O nome é obrigatório.' }),
  cargo: z.string().min(2, { message: 'O cargo é obrigatório.' }),
  salario: z
    .number()
    .min(0, { message: 'O salário deve ser um número válido.' }),
  data_admissao: z
    .string()
    .min(1, { message: 'A data de admissão é obrigatória.' }),
  email: z
    .string()
    .email({ message: 'E-mail inválido.' })
    .optional()
    .or(z.literal('')),
  telefone: z.string().optional(),
  cpf: z
    .string()
    .optional()
    .refine((val) => !val || isValidCPF(val), { message: 'CPF inválido.' }),
  endereco: z.string().optional(),
  meta_hora: z
    .number()
    .min(0, { message: 'A meta de horas deve ser um número válido.' })
    .optional(),
});

type ColaboradorFormData = z.infer<typeof colaboradorSchema>;

// Tipagem completa para um colaborador
type Colaborador = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  endereco: string | null;
  cargo: string | null;
  salario: number | null;
  meta_hora: number | null;
  data_admissao: string | null;
  ativo: boolean;
};

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedColaborador, setSelectedColaborador] =
    useState<Colaborador | null>(null);
  const [colaboradorToDelete, setColaboradorToDelete] =
    useState<Colaborador | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ColaboradorFormData>({
    resolver: zodResolver(colaboradorSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      cpf: '',
      endereco: '',
      cargo: '',
      salario: 0,
      meta_hora: 8,
      data_admissao: '',
    },
  });

  useEffect(() => {
    fetchColaboradores();
  }, []);

  useEffect(() => {
    if (selectedColaborador) {
      form.reset({
        ...selectedColaborador,
        salario: selectedColaborador.salario || 0,
        meta_hora: selectedColaborador.meta_hora || 8,
        data_admissao: selectedColaborador.data_admissao || '',
      });
    } else {
      form.reset({
        nome: '',
        email: '',
        telefone: '',
        cpf: '',
        endereco: '',
        cargo: '',
        salario: 0,
        meta_hora: 8,
        data_admissao: '',
      });
    }
  }, [selectedColaborador, sheetOpen, form]);

  const fetchColaboradores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('colaboradores')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      toast({
        title: 'Erro ao buscar colaboradores',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setColaboradores(data);
    }
    setLoading(false);
  };

  const handleAddNew = () => {
    setSelectedColaborador(null);
    setSheetOpen(true);
  };

  const handleEdit = (colaborador: Colaborador) => {
    setSelectedColaborador(colaborador);
    setSheetOpen(true);
  };

  const onSubmit = async (values: ColaboradorFormData) => {
    setIsSaving(true);

    // Converte campos vazios para null antes de enviar
    const dataToSave = {
      ...values,
      salario: values.salario || null,
      meta_hora: values.meta_hora ?? 8,
      data_admissao: values.data_admissao || null,
      cpf: values.cpf && values.cpf.trim() !== '' ? values.cpf : null, // CPF null se vazio
    };

    const { error } = selectedColaborador
      ? await supabase
          .from('colaboradores')
          .update(dataToSave)
          .eq('id', selectedColaborador.id)
      : await supabase.from('colaboradores').insert([dataToSave]);

    if (error) {
      let msg = error.message;
      if (msg && msg.includes('colaboradores_cpf_key')) {
        msg = 'Já existe um colaborador cadastrado com este CPF.';
      }
      toast({
        title: `Erro ao ${selectedColaborador ? 'atualizar' : 'salvar'} colaborador`,
        description: msg,
        variant: 'destructive',
      });
    } else {
      toast({
        title: `Colaborador ${selectedColaborador ? 'atualizado' : 'salvo'} com sucesso!`,
      });
      setSheetOpen(false);
      fetchColaboradores();
    }
    setIsSaving(false);
  };

  const handleDeleteConfirm = async () => {
    if (!colaboradorToDelete) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from('colaboradores')
      .delete()
      .eq('id', colaboradorToDelete.id);

    if (error) {
      toast({
        title: 'Erro ao excluir colaborador',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Colaborador excluído com sucesso!' });
      setColaboradorToDelete(null);
      fetchColaboradores();
    }
    setIsDeleting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Colaboradores</h1>
          <p className="text-muted-foreground">
            Gerencie os colaboradores da sua equipe.
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Colaborador
        </Button>
      </div>

      {/* Tabela de Colaboradores */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Contato</TableHead>
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
              colaboradores.map((colaborador) => (
                <TableRow key={colaborador.id}>
                  <TableCell className="font-medium">
                    {colaborador.nome}
                  </TableCell>
                  <TableCell>{colaborador.cargo || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{colaborador.email}</span>
                      <span className="text-xs text-muted-foreground">
                        {colaborador.telefone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={colaborador.ativo ? 'default' : 'destructive'}
                    >
                      {colaborador.ativo ? 'Ativo' : 'Inativo'}
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
                        <DropdownMenuItem
                          onClick={() => handleEdit(colaborador)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setColaboradorToDelete(colaborador)}
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

      {/* Painel Lateral (Sheet) para Adicionar/Editar */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {selectedColaborador
                ? 'Editar Colaborador'
                : 'Adicionar Novo Colaborador'}
            </SheetTitle>
            <SheetDescription>
              {selectedColaborador
                ? 'Altere os dados do colaborador.'
                : 'Preencha os dados do novo colaborador.'}
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
                    <FormLabel>Nome*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome completo"
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
                name="email"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="email@exemplo.com"
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
                name="telefone"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(99) 99999-9999"
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
                name="cpf"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="000.000.000-00"
                        value={field.value || ''}
                        maxLength={14}
                        onChange={(e) =>
                          field.onChange(maskCPF(e.target.value))
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="cargo"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Desenvolvedor"
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
                  name="salario"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salário*</FormLabel>
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
                  name="meta_hora"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta de Horas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value || 8}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              field.onChange(8);
                            } else {
                              const numValue = parseInt(value);
                              field.onChange(isNaN(numValue) ? 8 : numValue);
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
              <FormField
                name="data_admissao"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Admissão*</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
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
              <div className="flex justify-end pt-6">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSaving ? 'Salvando...' : 'Salvar Colaborador'}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Diálogo de Confirmação para Excluir */}
      <AlertDialog
        open={!!colaboradorToDelete}
        onOpenChange={(open) => !open && setColaboradorToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o
              colaborador{' '}
              <span className="font-bold">{colaboradorToDelete?.nome}</span>.
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
