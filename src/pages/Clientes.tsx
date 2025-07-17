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
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ReportTemplate } from '@/components/ui/ReportTemplate';

// Função para aplicar máscara de CPF
function maskCPF(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
}
// Função para aplicar máscara de CNPJ
function maskCNPJ(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
    .slice(0, 18);
}
// Função para validar CPF
function isValidCPF(cpf: string) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i-1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i-1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cpf.substring(10, 11))) return false;
  return true;
}
// Função para validar CNPJ
function isValidCNPJ(cnpj: string) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  if (/^([0-9])\1+$/.test(cnpj)) return false;
  let t = cnpj.length - 2, d = cnpj.substring(t), d1 = parseInt(d.charAt(0)), d2 = parseInt(d.charAt(1)), calc = x => {
    let n = cnpj.substring(0, x), y = x - 7, s = 0, r = 2;
    for (let i = x; i >= 1; i--) {
      s += n.charAt(x - i) * r++;
      if (r > 9) r = 2;
    }
    return s;
  };
  let dg1 = calc(t), dg2 = calc(t + 1);
  dg1 = 11 - (dg1 % 11); if (dg1 >= 10) dg1 = 0;
  dg2 = 11 - (dg2 % 11); if (dg2 >= 10) dg2 = 0;
  return dg1 === d1 && dg2 === d2;
}

// Esquema de validação para o formulário de cliente
const clienteSchema = z.object({
  nome: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  telefone: z.string().min(8, { message: 'O telefone é obrigatório.' }),
  cpf_cnpj: z.string().min(11, { message: 'O CPF/CNPJ é obrigatório.' }).refine(
    (val) => {
      const num = val.replace(/\D/g, '');
      if (num.length === 11) return isValidCPF(val);
      if (num.length === 14) return isValidCNPJ(val);
      return false;
    },
    { message: 'CPF/CNPJ inválido.' }
  ),
  email: z.string().email({ message: 'E-mail inválido.' }).optional().or(z.literal('')),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

// Tipagem para um cliente, com base na tabela do Supabase
type Cliente = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  cpf_cnpj: string | null;
  endereco: string | null;
  cep: string | null;
  ativo: boolean;
};

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const [exportOpen, setExportOpen] = useState(false);

  const form = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      cpf_cnpj: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
    },
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  // Popula o formulário quando um cliente é selecionado para edição
  useEffect(() => {
    if (selectedCliente) {
      form.reset(selectedCliente);
    } else {
      form.reset({
        nome: '',
        email: '',
        telefone: '',
        cpf_cnpj: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
      });
    }
  }, [selectedCliente, sheetOpen, form]);


  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      toast({ title: "Erro ao buscar clientes", description: error.message, variant: "destructive" });
    } else {
      setClientes(data);
    }
    setLoading(false);
  };

  const handleAddNew = () => {
    setSelectedCliente(null);
    setSheetOpen(true);
  };

  const handleEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setSheetOpen(true);
  };

  const onSubmit = async (values: ClienteFormData) => {
    setIsSaving(true);
    
    const { error } = selectedCliente
      ? await supabase.from('clientes').update(values).eq('id', selectedCliente.id)
      : await supabase.from('clientes').insert([values]);

    if (error) {
      let msg = error.message;
      if (msg && msg.includes('clientes_cpf_cnpj_key')) {
        msg = 'Já existe um cliente cadastrado com este CPF/CNPJ.';
      }
      toast({
        title: `Erro ao ${selectedCliente ? 'atualizar' : 'salvar'} cliente`,
        description: msg,
        variant: "destructive",
      });
    } else {
      toast({
        title: `Cliente ${selectedCliente ? 'atualizado' : 'salvo'} com sucesso!`,
      });
      setSheetOpen(false);
      fetchClientes(); // Re-fetch data para atualizar a tabela
    }
    setIsSaving(false);
  };

  const handleDeleteConfirm = async () => {
    if (!clienteToDelete) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', clienteToDelete.id);

    if (error) {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cliente excluído com sucesso!",
      });
      setClienteToDelete(null);
      fetchClientes();
    }
    setIsDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie os clientes da sua empresa.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddNew} type="button">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Cliente
          </Button>
          <Button onClick={() => setExportOpen(true)} type="button" className="bg-primary text-white font-semibold shadow-soft hover:bg-primary/80 transition">
            Imprimir / Exportar PDF
          </Button>
        </div>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : (
              clientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium">{cliente.nome}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{cliente.email}</span>
                      <span className="text-xs text-muted-foreground">
                        {cliente.telefone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {cliente.cidade && cliente.estado
                      ? `${cliente.cidade}, ${cliente.estado}`
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={cliente.ativo ? 'default' : 'destructive'}>
                      {cliente.ativo ? 'Ativo' : 'Inativo'}
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
                        <DropdownMenuItem onClick={() => handleEdit(cliente)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setClienteToDelete(cliente)}
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
      {/* Modal de exportação */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-3xl p-0">
          <DialogHeader>
            <DialogTitle>Relatório de Clientes</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            <ReportTemplate>
              <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Lista de Clientes</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 8 }}>Nome</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 8 }}>Contato</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 8 }}>Localização</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 8 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => (
                    <tr key={cliente.id}>
                      <td style={{ padding: 8 }}>{cliente.nome}</td>
                      <td style={{ padding: 8 }}>
                        <div>{cliente.email}</div>
                        <div style={{ fontSize: 13, color: '#888' }}>{cliente.telefone}</div>
                      </td>
                      <td style={{ padding: 8 }}>{cliente.cidade && cliente.estado ? `${cliente.cidade}, ${cliente.estado}` : 'N/A'}</td>
                      <td style={{ padding: 8 }}>{cliente.ativo ? 'Ativo' : 'Inativo'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportTemplate>
          </div>
          <DialogFooter>
            <Button onClick={() => window.print()} className="bg-primary text-white">Imprimir / Salvar PDF</Button>
            <DialogClose asChild>
              <Button variant="outline">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Painel Lateral (Sheet) para Adicionar/Editar Cliente */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedCliente ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</SheetTitle>
            <SheetDescription>
              {selectedCliente ? 'Altere os dados do cliente.' : 'Preencha os dados do novo cliente.'}
            </SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome*</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo do cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone*</FormLabel>
                    <FormControl>
                      <Input placeholder="(99) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="cpf_cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF/CNPJ*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="00.000.000/0000-00"
                        {...field}
                        maxLength={18}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, '');
                          if (v.length <= 11) field.onChange(maskCPF(e.target.value));
                          else field.onChange(maskCNPJ(e.target.value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="UF" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="pt-6 flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSaving ? 'Salvando...' : 'Salvar Cliente'}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Diálogo de Confirmação para Excluir */}
      <AlertDialog open={!!clienteToDelete} onOpenChange={(open) => !open && setClienteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente <span className="font-bold">{clienteToDelete?.nome}</span> do banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
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