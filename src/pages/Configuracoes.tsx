import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ReportTemplate } from '@/components/ui/ReportTemplate';
import { useRef } from 'react';

// Esquema de validação
const configSchema = z.object({
  percentual_global_produtos: z.coerce.number().min(0, "O percentual não pode ser negativo."),
  meta_hora_padrao: z.coerce.number().min(0, "A meta de horas não pode ser negativa."),
  prefixo_os: z.string().min(1, "O prefixo é obrigatório."),
});

type ConfigFormData = z.infer<typeof configSchema>;

export default function Configuracoes() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ nome: '', email: '', tipo_usuario: 'colaborador', ativo: true, nivel_id: '', senha: '', confirmarSenha: '' });
  
  // Estados para níveis de acesso
  const [niveis, setNiveis] = useState<Array<{ id: string; nome: string; descricao: string; ativo: boolean }>>([]);
  const [permissoes, setPermissoes] = useState<Array<{ id: string; nome: string; descricao: string; modulo: string; acao: string }>>([]);
  const [showNivelModal, setShowNivelModal] = useState(false);
  const [editingNivel, setEditingNivel] = useState(null);
  const [nivelForm, setNivelForm] = useState({ nome: '', descricao: '', ativo: true });
  const [selectedNivelPermissoes, setSelectedNivelPermissoes] = useState<string[]>([]);

  // Estados para auditoria
  const [auditoria, setAuditoria] = useState([]);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroTipoEvento, setFiltroTipoEvento] = useState('');
  const [showPrint, setShowPrint] = useState(false); // Corrige ReferenceError

  // Estado para controlar a impressão
  const printRef = useRef();
  // Remover showPrint e setShowPrint

  useEffect(() => {
    fetchConfiguracoes();
    fetchUsuarios();
    fetchNiveis();
    fetchPermissoes();
  }, []);

  // Funções para níveis de acesso
  async function fetchNiveis() {
    const { data, error } = await supabase.from('niveis_acesso').select('*').order('nome');
    if (error) {
      toast({ title: 'Erro ao buscar níveis', description: error.message, variant: 'destructive' });
    } else {
      setNiveis(data || []);
    }
  }

  async function fetchPermissoes() {
    const { data, error } = await supabase.from('permissoes').select('*').order('modulo, acao');
    if (error) {
      toast({ title: 'Erro ao buscar permissões', description: error.message, variant: 'destructive' });
    } else {
      setPermissoes(data || []);
    }
  }

  // Função para buscar auditoria
  async function fetchAuditoria() {
    if (!filtroDataInicio && !filtroDataFim) {
      toast({ title: 'Informe pelo menos uma data para buscar auditoria.' });
      setAuditoria([]);
      return;
    }
    setLoadingAuditoria(true);
    try {
      let query = supabase
        .from('auditoria_login')
        .select('*')
        .order('data_hora', { ascending: false });

      // Aplicar filtros
      if (filtroUsuario) {
        query = query.or(`nome_usuario.ilike.%${filtroUsuario}%,email_usuario.ilike.%${filtroUsuario}%`);
      }
      
      if (filtroDataInicio) {
        query = query.gte('data_hora', filtroDataInicio + 'T00:00:00');
      }
      
      if (filtroDataFim) {
        query = query.lte('data_hora', filtroDataFim + 'T23:59:59');
      }
      
      if (filtroTipoEvento) {
        query = query.eq('tipo_evento', filtroTipoEvento);
      }

      const { data, error } = await query;
      
      if (error) {
        toast({ title: 'Erro ao buscar auditoria', description: error.message, variant: 'destructive' });
      } else {
        setAuditoria(data || []);
      }
    } catch (error) {
      toast({ title: 'Erro ao buscar auditoria', description: error.message, variant: 'destructive' });
    } finally {
      setLoadingAuditoria(false);
    }
  }

  // Função para limpar filtros
  function limparFiltros() {
    setFiltroUsuario('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroTipoEvento('');
  }

  // Função para exportar auditoria
  function exportarAuditoria() {
    const csvContent = [
      ['Usuário', 'Email', 'Evento', 'Data/Hora', 'User Agent'],
      ...auditoria.map(item => [
        item.nome_usuario,
        item.email_usuario,
        item.tipo_evento,
        new Date(item.data_hora).toLocaleString('pt-BR'),
        item.user_agent
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `auditoria_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Função para imprimir
  function handlePrint() {
    window.print();
  }

  async function fetchNivelPermissoes(nivelId: string) {
    const { data, error } = await supabase
      .from('nivel_permissoes')
      .select('permissao_id')
      .eq('nivel_id', nivelId);
    
    if (error) {
      toast({ title: 'Erro ao buscar permissões do nível', description: error.message, variant: 'destructive' });
      return [];
    }
    
    return data?.map(item => item.permissao_id) || [];
  }

  function handleEditNivel(nivel) {
    setEditingNivel(nivel);
    setNivelForm({ nome: nivel.nome, descricao: nivel.descricao, ativo: nivel.ativo });
    fetchNivelPermissoes(nivel.id).then(permissoes => {
      setSelectedNivelPermissoes(permissoes);
    });
    setShowNivelModal(true);
  }

  function handleCloseNivelModal() {
    setShowNivelModal(false);
    setEditingNivel(null);
    setNivelForm({ nome: '', descricao: '', ativo: true });
    setSelectedNivelPermissoes([]);
  }

  async function handleSubmitNivel(e) {
    e.preventDefault();
    
    try {
      let nivelId;
      
      if (editingNivel) {
        // Atualizar nível
        const { error } = await supabase
          .from('niveis_acesso')
          .update(nivelForm)
          .eq('id', editingNivel.id);
        
        if (error) throw error;
        nivelId = editingNivel.id;
      } else {
        // Criar novo nível
        const { data, error } = await supabase
          .from('niveis_acesso')
          .insert([nivelForm])
          .select()
          .single();
        
        if (error) throw error;
        nivelId = data.id;
      }

      // Atualizar permissões do nível
      if (nivelId) {
        // Remover todas as permissões atuais
        await supabase.from('nivel_permissoes').delete().eq('nivel_id', nivelId);
        
        // Adicionar as permissões selecionadas
        if (selectedNivelPermissoes.length > 0) {
          const nivelPermissoes = selectedNivelPermissoes.map(permissaoId => ({
            nivel_id: nivelId,
            permissao_id: permissaoId
          }));
          
          await supabase.from('nivel_permissoes').insert(nivelPermissoes);
        }
      }

      toast({ title: 'Nível salvo com sucesso!' });
      await fetchNiveis();
      handleCloseNivelModal();
    } catch (error) {
      toast({ title: 'Erro ao salvar nível', description: error.message, variant: 'destructive' });
    }
  }

  async function handleDeleteNivel(id) {
    if (window.confirm('Tem certeza que deseja excluir este nível? Isso pode afetar usuários associados.')) {
      const { error } = await supabase.from('niveis_acesso').delete().eq('id', id);
      if (error) {
        toast({ title: 'Erro ao excluir nível', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Nível excluído com sucesso!' });
        await fetchNiveis();
      }
    }
  }

  // Função para reenviar email de reset de senha
  async function handleResendEmail(user) {
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
      const response = await fetch('https://mezwwjzchbvfpptljmya.supabase.co/functions/v1/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({
          action: 'resend_email',
          email: user.email
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao reenviar email');
      }

      toast({ title: 'Email reenviado com sucesso!', description: 'Verifique a caixa de entrada do usuário.' });
    } catch (error) {
      console.error('Erro ao reenviar email:', error);
      toast({ title: 'Erro ao reenviar email', description: error.message, variant: 'destructive' });
    }
  }

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      percentual_global_produtos: 0,
      meta_hora_padrao: 0,
      prefixo_os: 'OS',
    },
  });

  useEffect(() => { fetchUsuarios(); }, []);

  // Corrigir fetchUsuarios para buscar apenas da tabela admins
  async function fetchUsuarios() {
    console.log('Buscando usuários da tabela admins...');
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('id, nome, email, tipo_usuario, ativo, user_id, created_at, nivel_id');
      
      console.log('Resultado da busca:', { data, error });
      if (error) {
        console.error('Erro ao buscar usuários:', error);
        // Se for erro de relação, buscar apenas os campos básicos
        if (error.message.includes('relationship')) {
          const { data: basicData, error: basicError } = await supabase
            .from('admins')
            .select('id, nome, email, tipo_usuario, ativo, user_id, created_at');
          
          if (basicError) {
            toast({ title: 'Erro ao buscar usuários', description: basicError.message, variant: 'destructive' });
          } else {
            console.log('Usuários encontrados (sem nível):', basicData);
            setUsuarios(basicData || []);
          }
        } else {
          toast({ title: 'Erro ao buscar usuários', description: error.message, variant: 'destructive' });
        }
      } else {
        console.log('Usuários encontrados:', data);
        setUsuarios(data || []);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast({ title: 'Erro ao buscar usuários', description: 'Erro inesperado', variant: 'destructive' });
    }
  }

  function handleEditUser(user) {
    setEditingUser(user);
    setUserForm({ 
      nome: user.nome, 
      email: user.email, 
      tipo_usuario: user.tipo_usuario, 
      ativo: user.ativo, 
      nivel_id: user.nivel_id || '', 
      senha: '',
      confirmarSenha: ''
    });
    setShowUserModal(true);
  }

  function handleCloseUserModal() {
    setShowUserModal(false);
    setEditingUser(null);
    setUserForm({ nome: '', email: '', tipo_usuario: 'colaborador', ativo: true, nivel_id: '', senha: '', confirmarSenha: '' });
  }

  async function handleSubmitUser(e) {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingUser) {
        // ATUALIZAÇÃO DE USUÁRIO
        const updateData = {
          nome: userForm.nome,
          tipo_usuario: userForm.tipo_usuario,
          ativo: userForm.ativo,
          nivel_id: userForm.nivel_id || null
        };

        // Se senha foi fornecida, validar e incluir na atualização
        if (userForm.senha) {
          if (userForm.senha !== userForm.confirmarSenha) {
            toast({ title: 'Erro', description: 'As senhas não coincidem', variant: 'destructive' });
            setIsSaving(false);
            return;
          }
          if (userForm.senha.length < 6) {
            toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
            setIsSaving(false);
            return;
          }
          
          // Atualizar senha via Edge Function
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
          const passwordResponse = await fetch('https://mezwwjzchbvfpptljmya.supabase.co/functions/v1/invite-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${anonKey}`
            },
            body: JSON.stringify({
              action: 'update_password',
              user_id: editingUser.user_id,
              senha: userForm.senha
            })
          });

          if (!passwordResponse.ok) {
            const passwordError = await passwordResponse.json();
            throw new Error(passwordError.error || 'Erro ao atualizar senha');
          }
        }

        // Atualizar dados do usuário
        const { error } = await supabase
          .from('admins')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;

        toast({ title: 'Usuário atualizado com sucesso!' });
        await fetchUsuarios();
        handleCloseUserModal();
      } else {
        // CRIAÇÃO DE USUÁRIO (código existente)
        const body = {
          email: userForm.email,
          nome: userForm.nome,
          tipo_usuario: userForm.tipo_usuario,
          ativo: userForm.ativo,
          nivel_id: userForm.nivel_id || null
        };
        console.log('Enviando para invite-user:', body);

        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
        const response = await fetch('https://mezwwjzchbvfpptljmya.supabase.co/functions/v1/invite-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`
          },
          body: JSON.stringify(body)
        });

        console.log('invite-user response status:', response.status);
        const data = await response.json().catch(() => ({}));
        console.log('invite-user response body:', data);

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao criar usuário');
        }

        console.log('Usuário criado com sucesso, buscando lista atualizada...');
        toast({ title: 'Usuário cadastrado com sucesso!', description: 'O usuário receberá um e-mail para criar a senha.' });
        await fetchUsuarios();
        console.log('Lista de usuários atualizada após cadastro');
        handleCloseUserModal();
      }
    } catch (error) {
      console.error('Erro:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteUser(id) {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      console.log('Excluindo usuário com ID:', id);
      
      // Primeiro, buscar o user_id para excluir do Auth
      const { data: userData, error: fetchError } = await supabase
        .from('admins')
        .select('user_id, email')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Erro ao buscar dados do usuário:', fetchError);
        toast({ title: 'Erro ao buscar dados do usuário', description: fetchError.message, variant: 'destructive' });
        return;
      }
      
      console.log('Dados do usuário encontrados:', userData);
      
      // Excluir da tabela admins
      const { error: deleteError } = await supabase.from('admins').delete().eq('id', id);
      if (deleteError) {
        console.error('Erro ao excluir da tabela admins:', deleteError);
        toast({ title: 'Erro ao excluir usuário', description: deleteError.message, variant: 'destructive' });
        return;
      }
      
      console.log('Usuário excluído da tabela admins');
      
      // Excluir do Auth via Edge Function (se tiver user_id)
      if (userData.user_id) {
        try {
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
          const response = await fetch('https://mezwwjzchbvfpptljmya.supabase.co/functions/v1/invite-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${anonKey}`
            },
            body: JSON.stringify({ 
              action: 'delete',
              user_id: userData.user_id 
            })
          });
          
          if (!response.ok) {
            const data = await response.json();
            console.error('Erro ao excluir do Auth:', data);
            toast({ title: 'Aviso', description: 'Usuário excluído da tabela, mas houve erro ao excluir do Auth: ' + (data.error || 'Erro desconhecido'), variant: 'destructive' });
          } else {
            console.log('Usuário excluído do Auth com sucesso');
          }
        } catch (authErr) {
          console.error('Erro ao excluir do Auth:', authErr);
        }
      }
      
      toast({ title: 'Usuário excluído com sucesso!' });
      await fetchUsuarios();
    }
  }

  const fetchConfiguracoes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('configuracoes').select('chave, valor');
    if (error) {
      toast({ title: "Erro ao buscar configurações", description: error.message, variant: "destructive" });
    } else {
      const configMap = data.reduce((acc, { chave, valor }) => {
        acc[chave] = valor;
        return acc;
      }, {} as Record<string, string>);
      
      form.reset({
        percentual_global_produtos: parseFloat(configMap.percentual_global_produtos || '0'),
        meta_hora_padrao: parseFloat(configMap.meta_hora_padrao || '0'),
        prefixo_os: configMap.prefixo_os || 'OS',
      });
    }
    setLoading(false);
  };

  const onSubmit = async (values: ConfigFormData) => {
    setIsSaving(true);
    
    const updates = Object.entries(values).map(([chave, valor]) => 
      supabase
        .from('configuracoes')
        .update({ valor: String(valor) })
        .eq('chave', chave)
    );

    const results = await Promise.all(updates);
    const hasError = results.some(res => res.error);

    if (hasError) {
      toast({ title: "Erro ao salvar configurações", description: "Uma ou mais configurações não puderam ser salvas.", variant: "destructive" });
    } else {
      toast({ title: "Configurações salvas com sucesso!" });
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Ajuste os parâmetros globais do sistema.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parâmetros do Sistema</CardTitle>
          <CardDescription>Esses valores afetam diferentes partes do sistema. Use com cuidado.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="percentual_global_produtos" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percentual Global de Produtos (%)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="meta_hora_padrao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta de Horas Padrão (por colaborador)</FormLabel>
                      <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="prefixo_os" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prefixo para Ordens de Serviço</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>Gerencie os usuários do sistema e seus níveis de acesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <Button onClick={() => setShowUserModal(true)}>
              + Novo Usuário
            </Button>
          </div>
          {/* Tabela de usuários */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-muted">
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">E-mail</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Ativo</th>
                  <th className="px-3 py-2 text-left">Nível de Acesso</th>
                  <th className="px-3 py-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="px-3 py-2">{user.nome}</td>
                    <td className="px-3 py-2">{user.email}</td>
                    <td className="px-3 py-2">{user.tipo_usuario === 'admin' ? 'Administrador' : 'Usuário'}</td>
                    <td className="px-3 py-2">{user.ativo ? 'Sim' : 'Não'}</td>
                    <td className="px-3 py-2">{user.nivel_id ? 'Nível ID: ' + user.nivel_id : 'N/A'}</td>
                    <td className="px-3 py-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditUser(user)}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)}>Excluir</Button>
                      {user.user_id && (
                        <Button size="sm" variant="outline" onClick={() => handleResendEmail(user)}>Reenviar Email</Button>
                      )}
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">Nenhum usuário cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Níveis de Acesso</CardTitle>
          <CardDescription>Gerencie os níveis de acesso e suas permissões no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <Button onClick={() => setShowNivelModal(true)}>
              + Novo Nível
            </Button>
          </div>
          
          {/* Tabela de níveis */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-muted">
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-left">Ativo</th>
                  <th className="px-3 py-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {niveis.map((nivel) => (
                  <tr key={nivel.id} className="border-b">
                    <td className="px-3 py-2">{nivel.nome}</td>
                    <td className="px-3 py-2">{nivel.descricao}</td>
                    <td className="px-3 py-2">{nivel.ativo ? 'Sim' : 'Não'}</td>
                    <td className="px-3 py-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditNivel(nivel)}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteNivel(nivel.id)}>Excluir</Button>
                    </td>
                  </tr>
                ))}
                {niveis.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">Nenhum nível cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Auditoria de Login/Logout</CardTitle>
          <CardDescription>Monitore todos os acessos ao sistema com filtros avançados.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-1">Usuário</label>
              <Input 
                placeholder="Nome ou email"
                value={filtroUsuario}
                onChange={(e) => setFiltroUsuario(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Início</label>
              <Input 
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Fim</label>
              <Input 
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Evento</label>
              <select 
                className="w-full border rounded px-2 py-1 bg-background text-foreground border-border"
                value={filtroTipoEvento}
                onChange={(e) => setFiltroTipoEvento(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
              </select>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-between mb-4">
            <div className="flex gap-2">
              <Button onClick={fetchAuditoria} disabled={loadingAuditoria}>
                {loadingAuditoria && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Buscar
              </Button>
              <Button variant="outline" onClick={limparFiltros}>
                Limpar Filtros
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportarAuditoria} disabled={auditoria.length === 0}>
                Exportar CSV
              </Button>
              <Button onClick={handlePrint} disabled={auditoria.length === 0} variant="secondary">
                Imprimir
              </Button>
            </div>
          </div>

          {/* Tabela de auditoria */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-muted">
                  <th className="px-3 py-2 text-left">Usuário</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Evento</th>
                  <th className="px-3 py-2 text-left">Data/Hora</th>
                  <th className="px-3 py-2 text-left">User Agent</th>
                </tr>
              </thead>
              <tbody>
                {loadingAuditoria ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : auditoria.length > 0 ? (
                  auditoria.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-3 py-2 font-medium">{item.nome_usuario}</td>
                      <td className="px-3 py-2">{item.email_usuario}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.tipo_evento === 'login' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.tipo_evento === 'login' ? 'Login' : 'Logout'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {new Date(item.data_hora).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs truncate">
                        {item.user_agent}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted-foreground">
                      Nenhum registro de auditoria encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Estatísticas */}
          {auditoria.length > 0 && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">Estatísticas</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total de registros:</span>
                  <div className="font-medium">{auditoria.length}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Logins:</span>
                  <div className="font-medium text-green-600">
                    {auditoria.filter(item => item.tipo_evento === 'login').length}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Logouts:</span>
                  <div className="font-medium text-red-600">
                    {auditoria.filter(item => item.tipo_evento === 'logout').length}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Usuários únicos:</span>
                  <div className="font-medium">
                    {new Set(auditoria.map(item => item.email_usuario)).size}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de cadastro/edição de usuário */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
            <form onSubmit={handleSubmitUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <Input value={userForm.nome} onChange={e => setUserForm(f => ({ ...f, nome: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">E-mail</label>
                <Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select className="w-full border rounded px-2 py-1 bg-background text-foreground border-border" value={userForm.tipo_usuario} onChange={e => setUserForm(f => ({ ...f, tipo_usuario: e.target.value }))}>
                  <option value="admin">Administrador</option>
                  <option value="colaborador">Usuário</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nível de Acesso</label>
                <select className="w-full border rounded px-2 py-1 bg-background text-foreground border-border" value={userForm.nivel_id} onChange={e => setUserForm(f => ({ ...f, nivel_id: e.target.value }))}>
                  <option value="">Selecione um nível</option>
                  {niveis.map(nivel => (
                    <option key={nivel.id} value={nivel.id}>{nivel.nome}</option>
                  ))}
                </select>
              </div>
              
              {/* Campos de senha apenas na edição */}
              {editingUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nova Senha (deixe em branco para manter a atual)</label>
                    <Input 
                      type="password" 
                      value={userForm.senha} 
                      onChange={e => setUserForm(f => ({ ...f, senha: e.target.value }))} 
                      placeholder="Digite a nova senha"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Confirmar Nova Senha</label>
                    <Input 
                      type="password" 
                      value={userForm.confirmarSenha} 
                      onChange={e => setUserForm(f => ({ ...f, confirmarSenha: e.target.value }))} 
                      placeholder="Confirme a nova senha"
                    />
                  </div>
                </>
              )}
              
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo" checked={userForm.ativo} onChange={e => setUserForm(f => ({ ...f, ativo: e.target.checked }))} />
                <label htmlFor="ativo" className="text-sm">Ativo</label>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={handleCloseUserModal}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de cadastro/edição de nível */}
      {showNivelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editingNivel ? 'Editar Nível' : 'Novo Nível'}</h2>
            <form onSubmit={handleSubmitNivel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <Input value={nivelForm.nome} onChange={e => setNivelForm(f => ({ ...f, nome: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <Textarea 
                  className="h-20"
                  value={nivelForm.descricao} 
                  onChange={e => setNivelForm(f => ({ ...f, descricao: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="nivel_ativo" checked={nivelForm.ativo} onChange={e => setNivelForm(f => ({ ...f, ativo: e.target.checked }))} />
                <label htmlFor="nivel_ativo" className="text-sm">Ativo</label>
              </div>
              
              {/* Seção de permissões */}
              <div>
                <label className="block text-sm font-medium mb-2">Permissões</label>
                <div className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto border rounded p-3">
                  {permissoes.map((permissao) => (
                    <div key={permissao.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`perm_${permissao.id}`}
                        checked={selectedNivelPermissoes.includes(permissao.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedNivelPermissoes(prev => [...prev, permissao.id]);
                          } else {
                            setSelectedNivelPermissoes(prev => prev.filter(id => id !== permissao.id));
                          }
                        }}
                      />
                      <label htmlFor={`perm_${permissao.id}`} className="text-sm">
                        <div className="font-medium">{permissao.nome}</div>
                        <div className="text-xs text-muted-foreground">{permissao.descricao}</div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={handleCloseNivelModal}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renderização condicional para impressão */}
      {/* No JSX, remova showPrint e sempre renderize o relatório, mas escondido na tela */}
      {/* Impressão: renderizar relatório só ao clicar em Imprimir, desmontar após o print */}
      {showPrint && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }} className="print-auditoria">
          <ReportTemplate
            title="Relatório de Auditoria"
            period={{ start: filtroDataInicio || '2023-01-01', end: filtroDataFim || new Date().toISOString().split('T')[0] }}
            type="Auditoria de Login/Logout"
          >
            <div className="mb-4">
              <strong>Filtros aplicados:</strong>
              <ul className="text-xs">
                <li>Usuário: {filtroUsuario || 'Todos'}</li>
                <li>Data Início: {filtroDataInicio || '...'}</li>
                <li>Data Fim: {filtroDataFim || '...'}</li>
                <li>Tipo de Evento: {filtroTipoEvento || 'Todos'}</li>
              </ul>
            </div>
            <div className="report-content">
              <table>
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Email</th>
                    <th>Evento</th>
                    <th>Data/Hora</th>
                    <th>User Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {auditoria.map((item) => (
                    <tr key={item.id}>
                      <td>{item.nome_usuario}</td>
                      <td>{item.email_usuario}</td>
                      <td>{item.tipo_evento === 'login' ? 'Login' : 'Logout'}</td>
                      <td>{new Date(item.data_hora).toLocaleString('pt-BR')}</td>
                      <td style={{ maxWidth: 200, wordBreak: 'break-all' }}>{item.user_agent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Estatísticas */}
              <div className="mt-4">
                <strong>Estatísticas:</strong>
                <ul className="text-xs">
                  <li>Total de registros: {auditoria.length}</li>
                  <li>Logins: {auditoria.filter(item => item.tipo_evento === 'login').length}</li>
                  <li>Logouts: {auditoria.filter(item => item.tipo_evento === 'logout').length}</li>
                  <li>Usuários únicos: {new Set(auditoria.map(item => item.email_usuario)).size}</li>
                </ul>
              </div>
            </div>
          </ReportTemplate>
        </div>
      )}

      {/* CSS para impressão: só mostra .print-auditoria na impressão */}
      <style>{`
        @media print {
          body *:not(.print-auditoria):not(.print-auditoria *) {
            display: none !important;
          }
          .print-auditoria {
            display: block !important;
            position: static !important;
            left: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
} 