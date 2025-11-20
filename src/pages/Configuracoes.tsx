import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Shield, AlertTriangle, Users, Settings, Paintbrush, Database, Download, Archive, FileText, Calendar, Search } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ReportTemplate } from '@/components/ui/ReportTemplate';
import { useRef } from 'react';
import ReactDOM from 'react-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/components/ThemeProvider';
import { AjusteOSDialog } from '@/components/AjusteOSDialog';
import NiveisAcessoReorganizado from '@/components/NiveisAcessoReorganizado';
import React from 'react';

function OsEmClienteSection() {
  const { toast } = useToast();
  const [inicio, setInicio] = useState<string>('');
  const [fim, setFim] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [lista, setLista] = useState<any[]>([]);

  const buscar = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ordens_servico')
        .select('id, numero_os, descricao, status, data_abertura, data_inicio, clientes(nome)')
        .in('status', ['em_andamento', 'pausada', 'aberta', 'em_cliente']);
      if (inicio) query = query.gte('data_abertura', inicio + 'T00:00:00');
      if (fim) query = query.lte('data_abertura', fim + 'T23:59:59');
      const { data, error } = await query.order('data_abertura', { ascending: false });
      if (error) throw error;
      setLista(data || []);
    } catch (e:any) {
      toast({ title: 'Erro ao buscar OS', description: e.message, variant: 'destructive' });
      setLista([]);
    } finally {
      setLoading(false);
    }
  };

  const marcarEmCliente = async (os:any) => {
    try {
      // Fecha tempos abertos e cria lançamento conforme regras atuais
      const { data: tempos } = await supabase
        .from('os_tempo')
        .select('*')
        .eq('os_id', os.id)
        .is('data_fim', null);
      if (tempos && tempos.length) {
        const nowIso = new Date().toISOString();
        // Atualiza cada registro calculando horas_calculadas
        for (const t of tempos) {
          const inicio = new Date(t.data_inicio).getTime();
          const fim = new Date().getTime();
          const horas = Math.max(0, (fim - inicio) / (1000 * 60 * 60));
          await supabase
            .from('os_tempo')
            .update({ data_fim: nowIso, horas_calculadas: Number(horas.toFixed(2)) })
            .eq('id', t.id);
        }
      }
      // Atualiza status para em_cliente e remove da listagem principal
      const { error: osError } = await supabase
        .from('ordens_servico')
        .update({ status: 'em_cliente' })
        .eq('id', os.id);
      if (osError) throw osError;

      // Auditoria da transição de status
      await supabase.from('auditoria_sistema').insert({
        acao: 'os_em_cliente',
        tabela: 'ordens_servico',
        registro_id: os.id,
        detalhes: `OS ${os.numero_os} marcada como em_cliente`
      });
      toast({ title: `OS ${os.numero_os} marcada como em cliente` });
      await buscar();
    } catch (e:any) {
      toast({ title: 'Erro ao marcar OS em cliente', description: e.message, variant: 'destructive' });
    }
  };

  const retornarProducao = async (os:any) => {
    try {
      // Fecha quaisquer tempos abertos antes de retornar
      const { data: abertos } = await supabase
        .from('os_tempo')
        .select('*')
        .eq('os_id', os.id)
        .is('data_fim', null);
      if (abertos && abertos.length) {
        const nowIso = new Date().toISOString();
        for (const t of abertos) {
          const inicio = new Date(t.data_inicio).getTime();
          const fim = new Date().getTime();
          const horas = Math.max(0, (fim - inicio) / (1000 * 60 * 60));
          await supabase
            .from('os_tempo')
            .update({ data_fim: nowIso, horas_calculadas: Number(horas.toFixed(2)) })
            .eq('id', t.id);

          // Se era parada de material, gerar retrabalho (débito formal de horas)
          if (t.tipo === 'parada_material' && t.colaborador_id) {
            await supabase.from('retrabalhos').insert({
              os_id: os.id,
              colaborador_id: t.colaborador_id,
              motivo: t.motivo || 'parada_material',
              horas_abatidas: Number(horas.toFixed(2)),
              observacoes: 'Débito gerado automaticamente ao retornar à produção'
            });
          }
        }
      }

      // Volta para em_andamento e reinicia contagem de banco de horas a partir de agora
      const { error: updError } = await supabase
        .from('ordens_servico')
        .update({ status: 'em_andamento' })
        .eq('id', os.id);
      if (updError) throw updError;

      // Buscar colaboradores ativos
      const { data: colaboradoresOS, error: colabError } = await supabase
        .from('os_colaboradores')
        .select('colaborador_id')
        .eq('os_id', os.id)
        .eq('ativo', true);
      if (colabError) throw colabError;

      if (colaboradoresOS && colaboradoresOS.length > 0) {
        const registrosTempo = colaboradoresOS.map(({ colaborador_id }:any) => ({
          os_id: os.id,
          colaborador_id,
          tipo: 'trabalho',
          data_inicio: new Date().toISOString(),
        }));
        const { error: tempoError } = await supabase.from('os_tempo').insert(registrosTempo);
        if (tempoError) throw tempoError;
      }

      // Auditoria da transição de status
      await supabase.from('auditoria_sistema').insert({
        acao: 'os_retorno_producao',
        tabela: 'ordens_servico',
        registro_id: os.id,
        detalhes: `OS ${os.numero_os} retornou à produção`
      });

      toast({ title: `OS ${os.numero_os} retornou à produção` });
      await buscar();
    } catch (e:any) {
      toast({ title: 'Erro ao retornar à produção', description: e.message, variant: 'destructive' });
    }
  };

  // Não carregar automaticamente - só quando buscar

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <Label>Data início</Label>
          <Input type="date" value={inicio} onChange={(e:any) => setInicio(e.target.value)} />
        </div>
        <div>
          <Label>Data fim</Label>
          <Input type="date" value={fim} onChange={(e:any) => setFim(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={buscar} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Buscar
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="px-3 py-2 text-left">Número</th>
              <th className="px-3 py-2 text-left">Cliente</th>
              <th className="px-3 py-2 text-left">Descrição</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-4 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </td>
              </tr>
            ) : lista.length > 0 ? (
              lista.map((os:any) => (
                <tr key={os.id} className="border-b">
                  <td className="px-3 py-2 font-mono">{os.numero_os}</td>
                  <td className="px-3 py-2">{os.clientes?.nome || 'N/A'}</td>
                  <td className="px-3 py-2 max-w-xs truncate" title={os.descricao}>{os.descricao}</td>
                  <td className="px-3 py-2">{String(os.status || '').replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2">{os.data_abertura ? new Date(os.data_abertura).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      {os.status === 'em_cliente' ? (
                        <Button size="sm" onClick={() => retornarProducao(os)}>Retornar à produção</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => marcarEmCliente(os)}>OS em cliente</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-4 text-center text-muted-foreground">Nenhuma OS encontrada para o período.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Esquema de validação
const configSchema = z.object({
  percentual_global_produtos: z.coerce
    .number()
    .min(0, 'O percentual não pode ser negativo.'),
  meta_hora_padrao: z.coerce
    .number()
    .min(0, 'A meta de horas não pode ser negativa.'),
  prefixo_os: z.string().min(1, 'O prefixo é obrigatório.'),
  tempo_tolerancia_pausa: z.coerce
    .number()
    .min(0, 'O tempo de tolerância não pode ser negativo.')
    .max(1440, 'O tempo de tolerância não pode ser maior que 24 horas.'),
  expediente_horas_segsex: z.coerce
    .number()
    .min(0, 'Horas devem ser >= 0.')
    .max(24, 'Horas diárias não podem exceder 24.'),
  expediente_horas_sabado: z.coerce
    .number()
    .min(0, 'Horas devem ser >= 0.')
    .max(24, 'Horas diárias não podem exceder 24.'),
  expediente_horas_domingo: z.coerce
    .number()
    .min(0, 'Horas devem ser >= 0.')
    .max(24, 'Horas diárias não podem exceder 24.'),
});

type ConfigFormData = z.infer<typeof configSchema>;

export default function Configuracoes() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    nome: '',
    email: '',
    tipo_usuario: 'colaborador',
    ativo: true,
    nivel_id: '',
    senha: '',
    confirmarSenha: '',
  });

  // Estados para níveis de acesso
  const [niveis, setNiveis] = useState<
    Array<{ id: string; nome: string; descricao: string; ativo: boolean }>
  >([]);

  // Estados para Ajuste de OS
  const [osFinalizadas, setOsFinalizadas] = useState<any[]>([]);
  const [dataInicioAjuste, setDataInicioAjuste] = useState<string>('');
  const [dataFimAjuste, setDataFimAjuste] = useState<string>('');
  const [osSelecionada, setOsSelecionada] = useState<any>(null);
  const [showAjusteDialog, setShowAjusteDialog] = useState(false);
  const [loadingAjuste, setLoadingAjuste] = useState(false);

  // Estados para auditoria
  const [auditoria, setAuditoria] = useState([]);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroTipoEvento, setFiltroTipoEvento] = useState('');

  // Estados para auditoria de OS
  const [auditoriaOS, setAuditoriaOS] = useState([]);
  const [loadingAuditoriaOS, setLoadingAuditoriaOS] = useState(false);
  const [filtroUsuarioOS, setFiltroUsuarioOS] = useState('');
  const [filtroDataInicioOS, setFiltroDataInicioOS] = useState('');
  const [filtroDataFimOS, setFiltroDataFimOS] = useState('');
  const [filtroTipoAcaoOS, setFiltroTipoAcaoOS] = useState('');
  const [filtroNumeroOS, setFiltroNumeroOS] = useState('');

  // Estados para auditoria de Orçamentos
  const [auditoriaOrcamento, setAuditoriaOrcamento] = useState([]);
  const [loadingAuditoriaOrcamento, setLoadingAuditoriaOrcamento] = useState(false);
  const [filtroUsuarioOrcamento, setFiltroUsuarioOrcamento] = useState('');
  const [filtroDataInicioOrcamento, setFiltroDataInicioOrcamento] = useState('');
  const [filtroDataFimOrcamento, setFiltroDataFimOrcamento] = useState('');
  const [filtroTipoAcaoOrcamento, setFiltroTipoAcaoOrcamento] = useState('');
  const [filtroNumeroOrcamento, setFiltroNumeroOrcamento] = useState('');

  // =============================
  // Numeração da Próxima OS
  // =============================
  const [nextOsNumber, setNextOsNumber] = useState<string>('');
  const [savingNextOs, setSavingNextOs] = useState<boolean>(false);

  // =============================
  // Numeração da Próxima Orçamento
  // =============================
  const [nextOrcamentoNumber, setNextOrcamentoNumber] = useState<string>('');
  const [savingNextOrcamento, setSavingNextOrcamento] = useState<boolean>(false);

  useEffect(() => {
    fetchConfiguracoes();
    fetchUsuarios();
  }, []);


  // Função para buscar auditoria
  async function fetchAuditoria() {
    setLoadingAuditoria(true);
    try {
      console.log('Iniciando busca de auditoria...');
      
      let query = supabase
        .from('auditoria_login')
        .select(`
          id,
          user_id,
          nome_usuario,
          email_usuario,
          tipo_evento,
          data_hora,
          ip_address,
          user_agent,
          created_at
        `)
        .order('data_hora', { ascending: false })
        .limit(100);

      // Aplicar filtros
      if (filtroUsuario) {
        query = query.or(
          `nome_usuario.ilike.%${filtroUsuario}%,email_usuario.ilike.%${filtroUsuario}%`
        );
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

      console.log('Executando query de auditoria...');
      const { data, error } = await query;

      if (error) {
        console.error('Erro na query de auditoria:', error);
        toast({
          title: 'Erro ao buscar auditoria',
          description: error.message,
          variant: 'destructive',
        });
        setAuditoria([]);
      } else {
        console.log('Dados de auditoria encontrados:', data);
        console.log('Total de registros:', data?.length || 0);
        setAuditoria(data || []);
        
        if (!data || data.length === 0) {
          console.log('Nenhum registro de auditoria encontrado');
        }
      }
    } catch (error) {
      console.error('Erro geral na auditoria:', error);
      toast({
        title: 'Erro ao buscar auditoria',
        description: 'Erro interno do sistema',
        variant: 'destructive',
      });
      setAuditoria([]);
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
    setAuditoria([]);
  }

  // Função para buscar auditoria de OS
  async function fetchAuditoriaOS() {
    setLoadingAuditoriaOS(true);
    try {
      console.log('Iniciando busca de auditoria de OS...');
      
      let query = supabase
        .from('auditoria_os')
        .select(`
          id,
          user_id,
          nome_usuario,
          email_usuario,
          acao,
          os_id,
          numero_os,
          dados_anteriores,
          dados_novos,
          detalhes,
          data_acao,
          created_at
        `)
        .order('data_acao', { ascending: false })
        .limit(100);

      // Aplicar filtros
      if (filtroUsuarioOS) {
        query = query.or(
          `nome_usuario.ilike.%${filtroUsuarioOS}%,email_usuario.ilike.%${filtroUsuarioOS}%`
        );
      }

      if (filtroDataInicioOS) {
        query = query.gte('data_acao', filtroDataInicioOS + 'T00:00:00');
      }

      if (filtroDataFimOS) {
        query = query.lte('data_acao', filtroDataFimOS + 'T23:59:59');
      }

      if (filtroTipoAcaoOS) {
        query = query.eq('acao', filtroTipoAcaoOS);
      }

      if (filtroNumeroOS) {
        query = query.ilike('numero_os', `%${filtroNumeroOS}%`);
      }

      console.log('Executando query de auditoria de OS...');
      const { data, error } = await query;

      if (error) {
        console.error('Erro na query de auditoria de OS:', error);
        toast({
          title: 'Erro ao buscar auditoria de OS',
          description: error.message,
          variant: 'destructive',
        });
        setAuditoriaOS([]);
      } else {
        console.log('Dados de auditoria de OS encontrados:', data);
        console.log('Total de registros:', data?.length || 0);
        setAuditoriaOS(data || []);
        
        if (!data || data.length === 0) {
          console.log('Nenhum registro de auditoria de OS encontrado');
        }
      }
    } catch (error) {
      console.error('Erro geral na auditoria de OS:', error);
      toast({
        title: 'Erro ao buscar auditoria de OS',
        description: 'Erro interno do sistema',
        variant: 'destructive',
      });
      setAuditoriaOS([]);
    } finally {
      setLoadingAuditoriaOS(false);
    }
  }

  // Função para limpar filtros de auditoria de OS
  function limparFiltrosOS() {
    setFiltroUsuarioOS('');
    setFiltroDataInicioOS('');
    setFiltroDataFimOS('');
    setFiltroTipoAcaoOS('');
    setFiltroNumeroOS('');
    setAuditoriaOS([]);
  }

  // Função para buscar auditoria de Orçamentos
  async function fetchAuditoriaOrcamento() {
    setLoadingAuditoriaOrcamento(true);
    try {
      console.log('Iniciando busca de auditoria de Orçamentos...');
      
      let query = supabase
        .from('auditoria_orcamento')
        .select(`
          id,
          user_id,
          nome_usuario,
          email_usuario,
          acao,
          orcamento_id,
          numero_orcamento,
          dados_anteriores,
          dados_novos,
          detalhes,
          data_acao,
          created_at
        `)
        .order('data_acao', { ascending: false })
        .limit(100);

      // Aplicar filtros
      if (filtroUsuarioOrcamento) {
        query = query.or(
          `nome_usuario.ilike.%${filtroUsuarioOrcamento}%,email_usuario.ilike.%${filtroUsuarioOrcamento}%`
        );
      }

      if (filtroDataInicioOrcamento) {
        query = query.gte('data_acao', filtroDataInicioOrcamento + 'T00:00:00');
      }

      if (filtroDataFimOrcamento) {
        query = query.lte('data_acao', filtroDataFimOrcamento + 'T23:59:59');
      }

      if (filtroTipoAcaoOrcamento) {
        query = query.eq('acao', filtroTipoAcaoOrcamento);
      }

      if (filtroNumeroOrcamento) {
        query = query.ilike('numero_orcamento', `%${filtroNumeroOrcamento}%`);
      }

      console.log('Executando query de auditoria de Orçamentos...');
      const { data, error } = await query;

      if (error) {
        console.error('Erro na query de auditoria de Orçamentos:', error);
        toast({
          title: 'Erro ao buscar auditoria de Orçamentos',
          description: error.message,
          variant: 'destructive',
        });
        setAuditoriaOrcamento([]);
      } else {
        console.log('Dados de auditoria de Orçamentos encontrados:', data);
        console.log('Total de registros:', data?.length || 0);
        setAuditoriaOrcamento(data || []);
        
        if (!data || data.length === 0) {
          console.log('Nenhum registro de auditoria de Orçamentos encontrado');
        }
      }
    } catch (error) {
      console.error('Erro geral na auditoria de Orçamentos:', error);
      toast({
        title: 'Erro ao buscar auditoria de Orçamentos',
        description: 'Erro interno do sistema',
        variant: 'destructive',
      });
      setAuditoriaOrcamento([]);
    } finally {
      setLoadingAuditoriaOrcamento(false);
    }
  }

  // Função para limpar filtros de auditoria de Orçamentos
  function limparFiltrosOrcamento() {
    setFiltroUsuarioOrcamento('');
    setFiltroDataInicioOrcamento('');
    setFiltroDataFimOrcamento('');
    setFiltroTipoAcaoOrcamento('');
    setFiltroNumeroOrcamento('');
    setAuditoriaOrcamento([]);
  }

  // Função para exportar auditoria de OS
  function exportarAuditoriaOS() {
    const csvContent = [
      ['Usuário', 'Email', 'Ação', 'Número OS', 'Data/Hora', 'Detalhes'],
      ...auditoriaOS.map((item) => [
        item.nome_usuario,
        item.email_usuario,
        item.acao,
        item.numero_os || 'N/A',
        new Date(item.data_acao).toLocaleString('pt-BR'),
        item.detalhes || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `auditoria_os_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Função para exportar auditoria de Orçamentos
  function exportarAuditoriaOrcamento() {
    const csvContent = [
      ['Usuário', 'Email', 'Ação', 'Número Orçamento', 'Data/Hora', 'Detalhes'],
      ...auditoriaOrcamento.map((item) => [
        item.nome_usuario,
        item.email_usuario,
        item.acao,
        item.numero_orcamento || 'N/A',
        new Date(item.data_acao).toLocaleString('pt-BR'),
        item.detalhes || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `auditoria_orcamento_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Função removida - não inserir mais dados fictícios na auditoria

  // Função para exportar auditoria
  function exportarAuditoria() {
    const csvContent = [
      ['Usuário', 'Email', 'Evento', 'Data/Hora', 'User Agent'],
      ...auditoria.map((item) => [
        item.nome_usuario,
        item.email_usuario,
        item.tipo_evento,
        new Date(item.data_hora).toLocaleString('pt-BR'),
        item.user_agent,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `auditoria_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Função para imprimir
  const handlePrint = () => {
    window.print();
  };

  async function fetchNivelPermissoes(nivelId: string) {
    const { data, error } = await supabase
      .from('nivel_permissoes')
      .select('permissao_id')
      .eq('nivel_id', nivelId);

    if (error) {
      toast({
        title: 'Erro ao buscar permissões do nível',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }

    return data?.map((item) => item.permissao_id) || [];
  }


  // Função para reenviar email de reset de senha
  async function handleResendEmail(user) {
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
      const response = await fetch(
        'https://mezwwjzchbvfpptljmya.supabase.co/functions/v1/invite-user',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            action: 'resend_email',
            email: user.email,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao reenviar email');
      }

      toast({
        title: 'Email reenviado com sucesso!',
        description: 'Verifique a caixa de entrada do usuário.',
      });
    } catch (error) {
      console.error('Erro ao reenviar email:', error);
      toast({
        title: 'Erro ao reenviar email',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      percentual_global_produtos: 0,
      meta_hora_padrao: 0,
      prefixo_os: 'OS',
      tempo_tolerancia_pausa: 120, // 2 horas em minutos
    },
  });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // Corrigir fetchUsuarios para buscar apenas da tabela admins
  async function fetchUsuarios() {
    console.log('Buscando usuários da tabela admins...');
    try {
      // Primeiro, buscar apenas os campos básicos para evitar conflitos
      const { data, error } = await supabase
        .from('admins')
        .select(
          'id, nome, email, tipo_usuario, ativo, user_id, created_at, nivel_id'
        );

      console.log('Resultado da busca:', { data, error });
      if (error) {
        console.error('Erro ao buscar usuários:', error);
        // Se houver erro, tentar buscar sem nivel_id
        const { data: basicData, error: basicError } = await supabase
          .from('admins')
          .select('id, nome, email, tipo_usuario, ativo, user_id, created_at');

        if (basicError) {
          toast({
            title: 'Erro ao buscar usuários',
            description: basicError.message,
            variant: 'destructive',
          });
        } else {
          console.log('Usuários encontrados (sem nível):', basicData);
          setUsuarios(basicData || []);
        }
      } else {
        console.log('Usuários encontrados:', data);
        setUsuarios(data || []);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast({
        title: 'Erro ao buscar usuários',
        description: 'Erro inesperado',
        variant: 'destructive',
      });
    }
  }

  function handleEditUser(user) {
    console.log('handleEditUser chamado com:', user);
    setEditingUser(user);
    setUserForm({
      nome: user.nome,
      email: user.email,
      tipo_usuario: user.tipo_usuario,
      ativo: user.ativo,
      nivel_id: user.nivel_id || '',
      senha: '',
      confirmarSenha: '',
    });
    console.log('Abrindo modal de usuário...');
    setShowUserModal(true);
    console.log('showUserModal definido como true');
  }

  function handleCloseUserModal() {
    setShowUserModal(false);
    setEditingUser(null);
    setUserForm({
      nome: '',
      email: '',
      tipo_usuario: 'colaborador',
      ativo: true,
      nivel_id: '',
      senha: '',
      confirmarSenha: '',
    });
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
          nivel_id: userForm.nivel_id || null,
        };

        // Se senha foi fornecida, validar e incluir na atualização
        if (userForm.senha) {
          if (userForm.senha !== userForm.confirmarSenha) {
            toast({
              title: 'Erro',
              description: 'As senhas não coincidem',
              variant: 'destructive',
            });
            setIsSaving(false);
            return;
          }
          // Buscar limites de segurança e validar tamanho
          let minLen = 8;
          let maxLen = 128;
          try {
            const { data } = await supabase
              .from('configuracoes')
              .select('chave, valor')
              .in('chave', ['security_min_password', 'security_max_password']);
            if (data && Array.isArray(data)) {
              const map = Object.fromEntries(data.map((r) => [r.chave, r.valor]));
              minLen = map.security_min_password ? Number(map.security_min_password) : minLen;
              maxLen = map.security_max_password ? Number(map.security_max_password) : maxLen;
            }
          } catch {}
          if (userForm.senha.length < minLen || userForm.senha.length > maxLen) {
            toast({
              title: 'Erro',
              description: `A senha deve ter entre ${minLen} e ${maxLen} caracteres`,
              variant: 'destructive',
            });
            setIsSaving(false);
            return;
          }

          // Complexidade: 1 minúscula, 1 maiúscula, 1 número, 1 especial
          const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).+$/;
          if (!complexityRegex.test(userForm.senha)) {
            toast({
              title: 'Erro',
              description: 'A senha deve conter ao menos 1 letra minúscula, 1 letra maiúscula, 1 número e 1 caractere especial.',
              variant: 'destructive',
            });
            setIsSaving(false);
            return;
          }

          // Atualizar senha via Edge Function
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
          const passwordResponse = await fetch(
            'https://mezwwjzchbvfpptljmya.supabase.co/functions/v1/invite-user',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${anonKey}`,
              },
              body: JSON.stringify({
                action: 'update_password',
                user_id: editingUser.user_id,
                senha: userForm.senha,
              }),
            }
          );

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
          nivel_id: userForm.nivel_id || null,
        };
        console.log('Enviando para invite-user:', body);

        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
        const response = await fetch(
          'https://mezwwjzchbvfpptljmya.supabase.co/functions/v1/invite-user',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${anonKey}`,
            },
            body: JSON.stringify(body),
          }
        );

        console.log('invite-user response status:', response.status);
        const data = await response.json().catch(() => ({}));
        console.log('invite-user response body:', data);

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao criar usuário');
        }

        console.log('Usuário criado com sucesso, buscando lista atualizada...');
        toast({
          title: 'Usuário cadastrado com sucesso!',
          description: 'O usuário receberá um e-mail para criar a senha.',
        });
        await fetchUsuarios();
        console.log('Lista de usuários atualizada após cadastro');
        handleCloseUserModal();
      }
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
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
        toast({
          title: 'Erro ao buscar dados do usuário',
          description: fetchError.message,
          variant: 'destructive',
        });
        return;
      }

      console.log('Dados do usuário encontrados:', userData);

      // Excluir da tabela admins
      const { error: deleteError } = await supabase
        .from('admins')
        .delete()
        .eq('id', id);
      if (deleteError) {
        console.error('Erro ao excluir da tabela admins:', deleteError);
        toast({
          title: 'Erro ao excluir usuário',
          description: deleteError.message,
          variant: 'destructive',
        });
        return;
      }

      console.log('Usuário excluído da tabela admins');

      // Excluir do Auth via Edge Function (se tiver user_id)
      if (userData.user_id) {
        try {
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
          const response = await fetch(
            'https://mezwwjzchbvfpptljmya.supabase.co/functions/v1/invite-user',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${anonKey}`,
              },
              body: JSON.stringify({
                action: 'delete',
                user_id: userData.user_id,
              }),
            }
          );

          if (!response.ok) {
            const data = await response.json();
            console.error('Erro ao excluir do Auth:', data);
            toast({
              title: 'Aviso',
              description:
                'Usuário excluído da tabela, mas houve erro ao excluir do Auth: ' +
                (data.error || 'Erro desconhecido'),
              variant: 'destructive',
            });
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
    const { data, error } = await supabase
      .from('configuracoes')
      .select('chave, valor');
    if (error) {
      toast({
        title: 'Erro ao buscar configurações',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      const configMap = data.reduce(
        (acc, { chave, valor }) => {
          acc[chave] = valor;
          return acc;
        },
        {} as Record<string, string>
      );

      form.reset({
        percentual_global_produtos: parseFloat(
          configMap.percentual_global_produtos || '0'
        ),
        meta_hora_padrao: parseFloat(configMap.meta_hora_padrao || '0'),
        prefixo_os: configMap.prefixo_os || 'OS',
        tempo_tolerancia_pausa: parseFloat(configMap.tempo_tolerancia_pausa || '120'),
        expediente_horas_segsex: parseFloat(configMap.expediente_horas_segsex || '8'),
        expediente_horas_sabado: parseFloat(configMap.expediente_horas_sabado || '4'),
        expediente_horas_domingo: parseFloat(configMap.expediente_horas_domingo || '0'),
      });

      // Carregar numeração da próxima OS (se existir)
      setNextOsNumber(configMap.proxima_os || '');

      // Carregar numeração da próxima Orçamento (se existir)
      setNextOrcamentoNumber(configMap.proxima_orcamento || '');

      // Não sobrescrever o valor manual de "Próxima OS" automaticamente.
      // Mantemos apenas o que está salvo em configuracoes.proxima_os.
    }
    setLoading(false);
  };

  const onSubmit = async (values: ConfigFormData) => {
    setIsSaving(true);

    // Upsert todas as chaves (cria se não existir)
    const entries = Object.entries(values).map(([chave, valor]) => ({ chave, valor: String(valor) }));
    const { error } = await supabase
      .from('configuracoes')
      .upsert(entries, { onConflict: 'chave' });
    const hasError = !!error;

    if (hasError) {
      toast({
        title: 'Erro ao salvar configurações',
        description: 'Uma ou mais configurações não puderam ser salvas.',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Configurações salvas com sucesso!' });
    }
    setIsSaving(false);
  };

  // Salvamento por seção: Parâmetros do Sistema
  const saveParametrosSistema = async () => {
    if (!isAdmin()) {
      toast({ title: 'Acesso negado', description: 'Apenas Administradores podem salvar.', variant: 'destructive' });
      return;
    }
    try {
      setIsSaving(true);
      const v = form.getValues();
      const entries: Array<{ chave: string; valor: string }> = [
        { chave: 'percentual_global_produtos', valor: String(v.percentual_global_produtos ?? 0) },
        { chave: 'meta_hora_padrao', valor: String(v.meta_hora_padrao ?? 0) },
        { chave: 'prefixo_os', valor: String(v.prefixo_os ?? 'OS') },
        { chave: 'tempo_tolerancia_pausa', valor: String(v.tempo_tolerancia_pausa ?? 120) },
      ];
      const { error } = await supabase.from('configuracoes').upsert(entries, { onConflict: 'chave' });
      if (error) throw error;
      toast({ title: 'Parâmetros do Sistema salvos' });
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: String((e as any)?.message || e), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Salvamento por seção: Janelas de Expediente
  const saveExpediente = async () => {
    if (!isAdmin()) {
      toast({ title: 'Acesso negado', description: 'Apenas Administradores podem salvar.', variant: 'destructive' });
      return;
    }
    try {
      const v = form.getValues();
      const entries: Array<{ chave: string; valor: string }> = [
        { chave: 'expediente_horas_segsex', valor: String((v as any).expediente_horas_segsex ?? 8) },
        { chave: 'expediente_horas_sabado', valor: String((v as any).expediente_horas_sabado ?? 4) },
        { chave: 'expediente_horas_domingo', valor: String((v as any).expediente_horas_domingo ?? 0) },
      ];
      const { error } = await supabase.from('configuracoes').upsert(entries, { onConflict: 'chave' });
      if (error) throw error;
      toast({ title: 'Janelas de Expediente salvas' });
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: String((e as any)?.message || e), variant: 'destructive' });
    }
  };

  // Garante que o print-root existe no body
  if (typeof window !== 'undefined' && !document.getElementById('print-root')) {
    const printDiv = document.createElement('div');
    printDiv.id = 'print-root';
    printDiv.style.position = 'absolute';
    printDiv.style.left = '-9999px';
    printDiv.style.top = '0';
    document.body.appendChild(printDiv);
  }

  const { isAdmin, canManageModule } = usePermissions();
  const { theme } = useTheme();
  const [appTheme, setAppTheme] = useState<string>(() => localStorage.getItem('app-theme') || 'theme-metalma-classic');

  const themes = [
    { key: 'theme-metalma-classic', name: 'Metalma Clássico', colors: ['#006516', '#39964D', '#000000', '#898987'] },
    { key: 'theme-metalma-deep', name: 'Metalma Profundo', colors: ['#004e11', '#2c6e3a', '#000000', '#7a7a78'] },
    { key: 'theme-metalma-light', name: 'Metalma Claro', colors: ['#3fa35a', '#2a5d34', '#222222', '#9a9a98'] },
    { key: 'theme-metalma-contrast', name: 'Metalma Contraste', colors: ['#006516', '#000000', '#000000', '#898987'] },
    { key: 'theme-metalma-gray', name: 'Metalma Cinza', colors: ['#265a31', '#898987', '#222222', '#b5b5b4'] },
    // Novos temas
    { key: 'theme-metalma-emerald', name: 'Metalma Esmeralda', colors: ['#0a7f3f', '#34c759', '#0f172a', '#94a3b8'] },
    { key: 'theme-metalma-forest', name: 'Metalma Floresta', colors: ['#064e3b', '#16a34a', '#0b0f0e', '#6b7280'] },
    { key: 'theme-metalma-slate', name: 'Metalma Ardósia', colors: ['#1f2937', '#10b981', '#111827', '#9ca3af'] },
    { key: 'theme-metalma-sunrise', name: 'Metalma Amanhecer', colors: ['#3f9142', '#f59e0b', '#111827', '#9ca3af'] },
    { key: 'theme-metalma-ocean', name: 'Metalma Oceano', colors: ['#006516', '#0ea5e9', '#0b1220', '#94a3b8'] },
    // Adicionais solicitados
    { key: 'theme-metalma-dark-pure', name: 'Metalma Escuro puro', colors: ['#000000', '#006516', '#FFFFFF', '#6b7280'] },
    { key: 'theme-metalma-high-contrast', name: 'Alto contraste acessível', colors: ['#000000', '#FFFFFF', '#00ff00', '#ffd700'] },
  ];

  const applyTheme = (key: string) => {
    setAppTheme(key);
    localStorage.setItem('app-theme', key);
    // Aplica imediatamente via classe no html (ThemeProvider já sincroniza também)
    const root = document.documentElement;
    const toRemove: string[] = [];
    root.classList.forEach((cls) => { if (cls.startsWith('theme-')) toRemove.push(cls); });
    toRemove.forEach((cls) => root.classList.remove(cls));
    root.classList.add(key);
    // Feedback visual
    toast({ title: 'Tema aplicado', description: themes.find(t => t.key === key)?.name });
  };

  // Estado da área de Segurança (persistência simples em configuracoes)
  const [securityForm, setSecurityForm] = useState({
    min_password: 8,
    max_password: 128,
    rl_window_min: 15,
    rl_max_requests: 100,
    xss_enabled: true,
    csrf_enabled: true,
  });

  // Estado da área de Backup
  const [backupForm, setBackupForm] = useState({
    include_policies_schema: true,
    zip_enabled: false,
    filename_pattern: 'metalmaos-backup-YYYY-MM-DD_HH-mm',
    destination: 'local',
    storage_bucket: '',
    output_format: 'csv' as 'json' | 'csv',
    csv_table: '',
  });
  // Restore (desativado por solicitação): estados e handlers removidos
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);

  useEffect(() => {
    // Carregar valores persistidos se existirem
    supabase
      .from('configuracoes')
      .select('chave, valor')
      .in('chave', [
        'security_min_password',
        'security_max_password',
        'security_rate_limit_window_min',
        'security_rate_limit_max_requests',
        'security_xss_enabled',
        'security_csrf_enabled',
        'backup_include_policies_schema',
        'backup_zip_enabled',
        'backup_filename_pattern',
        'backup_destination',
        'backup_storage_bucket',
        'backup_output_format',
      ])
      .then(({ data }) => {
        if (!data) return;
        const map = Object.fromEntries(data.map((r: any) => [r.chave, r.valor]));
        setSecurityForm((prev) => ({
          ...prev,
          min_password: map.security_min_password ? Number(map.security_min_password) : prev.min_password,
          max_password: map.security_max_password ? Number(map.security_max_password) : prev.max_password,
          rl_window_min: map.security_rate_limit_window_min ? Number(map.security_rate_limit_window_min) : prev.rl_window_min,
          rl_max_requests: map.security_rate_limit_max_requests ? Number(map.security_rate_limit_max_requests) : prev.rl_max_requests,
          xss_enabled: map.security_xss_enabled ? map.security_xss_enabled === 'true' : prev.xss_enabled,
          csrf_enabled: map.security_csrf_enabled ? map.security_csrf_enabled === 'true' : prev.csrf_enabled,
        }));
        setBackupForm((prev) => ({
          ...prev,
          include_policies_schema: map.backup_include_policies_schema ? map.backup_include_policies_schema === 'true' : prev.include_policies_schema,
          zip_enabled: map.backup_zip_enabled ? map.backup_zip_enabled === 'true' : prev.zip_enabled,
          filename_pattern: map.backup_filename_pattern || prev.filename_pattern,
          destination: map.backup_destination || prev.destination,
          storage_bucket: map.backup_storage_bucket || prev.storage_bucket,
          output_format: (map.backup_output_format === 'csv' ? 'csv' : 'json'),
        }));
      });
  }, []);

  const saveSecurity = async () => {
    if (!isAdmin()) {
      toast({ title: 'Acesso negado', description: 'Apenas Administradores podem salvar segurança.', variant: 'destructive' });
      return;
    }
    const entries: Array<{ chave: string; valor: string }> = [
      { chave: 'security_min_password', valor: String(securityForm.min_password) },
      { chave: 'security_max_password', valor: String(securityForm.max_password) },
      { chave: 'security_rate_limit_window_min', valor: String(securityForm.rl_window_min) },
      { chave: 'security_rate_limit_max_requests', valor: String(securityForm.rl_max_requests) },
      { chave: 'security_xss_enabled', valor: String(securityForm.xss_enabled) },
      { chave: 'security_csrf_enabled', valor: String(securityForm.csrf_enabled) },
    ];

    // Upsert por chave
    const results = await Promise.all(entries.map((e) =>
      supabase.from('configuracoes').upsert({ chave: e.chave, valor: e.valor }, { onConflict: 'chave' })
    ));
    const hasError = results.some((r) => r.error);
    if (hasError) {
      toast({ title: 'Erro ao salvar segurança', description: 'Tente novamente.', variant: 'destructive' });
    } else {
      toast({ title: 'Configurações de segurança salvas' });
    }
  };

  const saveBackupConfig = async () => {
    if (!isAdmin()) {
      toast({ title: 'Acesso negado', description: 'Apenas Administradores podem salvar configurações de backup.', variant: 'destructive' });
      return;
    }
    const entries: Array<{ chave: string; valor: string }> = [
      { chave: 'backup_include_policies_schema', valor: String(backupForm.include_policies_schema) },
      { chave: 'backup_zip_enabled', valor: String(backupForm.zip_enabled) },
      { chave: 'backup_filename_pattern', valor: backupForm.filename_pattern },
      { chave: 'backup_destination', valor: backupForm.destination },
      { chave: 'backup_storage_bucket', valor: backupForm.storage_bucket },
      { chave: 'backup_output_format', valor: 'json' },
    ];

    const results = await Promise.all(entries.map((e) =>
      supabase.from('configuracoes').upsert({ chave: e.chave, valor: e.valor }, { onConflict: 'chave' })
    ));
    const hasError = results.some((r) => r.error);
    if (hasError) {
      toast({ title: 'Erro ao salvar configurações de backup', description: 'Tente novamente.', variant: 'destructive' });
    } else {
      toast({ title: 'Configurações de backup salvas' });
    }
  };

  const generateBackup = async () => {
    if (!isAdmin()) {
      toast({ title: 'Acesso negado', description: 'Apenas Administradores podem gerar backups.', variant: 'destructive' });
      return;
    }

    setIsGeneratingBackup(true);
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
      const response = await fetch(
        'https://mezwwjzchbvfpptljmya.supabase.co/functions/v1/export-backup',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            include_policies_schema: backupForm.include_policies_schema,
            zip_enabled: false,
            filename_pattern: backupForm.filename_pattern,
            destination: 'local',
            storage_bucket: backupForm.storage_bucket,
            output_format: 'json',
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao gerar backup');
      }

      // Se for download direto
      if (backupForm.destination === 'local' || backupForm.destination === 'both') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Extrair nome do arquivo do header ou usar padrão
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'metalmaos-backup';
        filename = 'metalmaos-backup.json';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: 'Backup gerado com sucesso!',
        description: backupForm.destination === 'local' ? 'Arquivo baixado para seu computador.' : 'Backup salvo no storage.',
      });
    } catch (error) {
      console.error('Erro ao gerar backup:', error);
      toast({
        title: 'Erro ao gerar backup',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  // Funções para Ajuste de OS
  const buscarOsFinalizadas = async () => {
    if (!dataInicioAjuste || !dataFimAjuste) {
      toast({
        title: 'Datas obrigatórias',
        description: 'Selecione a data de início e fim para buscar OS finalizadas.',
        variant: 'destructive'
      });
      return;
    }

    setLoadingAjuste(true);
    try {
      // Converter datas para formato ISO
      const dataInicioISO = new Date(dataInicioAjuste + 'T00:00:00.000Z').toISOString();
      const dataFimISO = new Date(dataFimAjuste + 'T23:59:59.999Z').toISOString();

      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          clientes (
            nome,
            cpf_cnpj,
            telefone,
            email,
            endereco,
            cidade,
            estado,
            cep
          ),
          os_colaboradores (
            id,
            colaborador_id,
            horas_trabalhadas,
            colaboradores (
              nome
            )
          )
        `)
        .eq('status', 'finalizada')
        .gte('data_abertura', dataInicioISO)
        .lte('data_abertura', dataFimISO)
        .order('data_abertura', { ascending: false });

      if (error) {
        console.error('Erro na consulta:', error);
        throw error;
      }
      
      console.log('OS encontradas:', data?.length || 0);
      setOsFinalizadas(data || []);
    } catch (error) {
      console.error('Erro ao buscar OS finalizadas:', error);
      toast({
        title: 'Erro ao buscar OS',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setLoadingAjuste(false);
    }
  };

  const abrirAjusteOS = (os: any) => {
    setOsSelecionada(os);
    setShowAjusteDialog(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Ajuste os parâmetros globais do sistema e gerencie segurança.
        </p>
      </div>

      <Tabs defaultValue="system" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-1">
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Auditoria
          </TabsTrigger>
          <TabsTrigger value="audit-os" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Auditoria OS
          </TabsTrigger>
          <TabsTrigger value="audit-orcamento" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Auditoria Orçamento
          </TabsTrigger>
          <TabsTrigger value="ajuste-os" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Ajuste de OS
          </TabsTrigger>
          <TabsTrigger value="os-em-cliente" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            OS em Cliente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle>Parâmetros do Sistema</CardTitle>
          <CardDescription>
            Esses valores afetam diferentes partes do sistema. Use com cuidado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="percentual_global_produtos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percentual Global de Produtos (%)</FormLabel>
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
                    control={form.control}
                    name="meta_hora_padrao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Meta de Horas Padrão (por colaborador)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
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
                {/* Botão: salvar apenas Parâmetros do Sistema */}
                <div className="flex justify-end">
                  <Button type="button" onClick={saveParametrosSistema} disabled={isSaving || !isAdmin()}>
                    {isSaving ? 'Salvando...' : 'Salvar Parâmetros do Sistema'}
                  </Button>
                </div>

                {/* Configurações de Expediente */}
                <div className="rounded-lg border p-4">
                  <div className="mb-3 font-medium">Janelas de Expediente (horas por dia)</div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="expediente_horas_segsex"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Segunda a Sexta (h/dia)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              value={field.value || ''}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                field.onChange(isNaN(v) ? 8 : v);
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
                      control={form.control}
                      name="expediente_horas_sabado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sábado (h/dia)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              value={field.value || ''}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                field.onChange(isNaN(v) ? 4 : v);
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
                      control={form.control}
                      name="expediente_horas_domingo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Domingo (h/dia)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              value={field.value || ''}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                field.onChange(isNaN(v) ? 0 : v);
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
                  <p className="mt-2 text-xs text-muted-foreground">
                    Essas horas impactam imediatamente o cálculo do tempo previsto ao escolher a Data de Previsão nas OS.
                  </p>
                  <div className="mt-3 flex justify-end">
                    <Button type="button" onClick={saveExpediente} disabled={!isAdmin()}>
                      Salvar Janelas de Expediente
                    </Button>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="prefixo_os"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exemplo: Prefixo para Ordens de Serviço</FormLabel>
                      <FormControl>
                        <Input
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
                {/* Numeração da Próxima OS (único local) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="col-span-2">
                    <Label htmlFor="proxima_os">Numeração da Próxima OS</Label>
                    <Input
                      id="proxima_os"
                      placeholder="346-25"
                      value={nextOsNumber}
                      onChange={(e) => setNextOsNumber(e.target.value)}
                      disabled={!isAdmin()}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ex.: 346-25 → a próxima criada será 347-25.
                    </p>
                  </div>
                  <div className="flex md:justify-end">
                    <Button
                      onClick={async () => {
                        if (!isAdmin()) return;
                        try {
                          setSavingNextOs(true);
                          const { error } = await supabase
                            .from('configuracoes')
                            .upsert({ chave: 'proxima_os', valor: String(nextOsNumber || '') }, { onConflict: 'chave' });
                          if (error) throw error;
                          toast({ title: 'Numeração da próxima OS salva' });
                        } catch (e) {
                          toast({ title: 'Erro ao salvar', description: String((e as any)?.message || e), variant: 'destructive' });
                        } finally {
                          setSavingNextOs(false);
                        }
                      }}
                      disabled={savingNextOs || !isAdmin()}
                    >
                      {savingNextOs ? 'Salvando...' : 'Salvar Próxima OS'}
                    </Button>
                  </div>
                </div>

                {/* Numeração da Próxima Orçamento */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="col-span-2">
                    <Label htmlFor="proxima_orcamento">Numeração da Próxima Orçamento</Label>
                    <Input
                      id="proxima_orcamento"
                      placeholder="ORC0001/2025"
                      value={nextOrcamentoNumber}
                      onChange={(e) => setNextOrcamentoNumber(e.target.value)}
                      disabled={!isAdmin()}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ex.: ORC0001/2025 → a próxima criada será ORC0002/2025.
                    </p>
                  </div>
                  <div className="flex md:justify-end">
                    <Button
                      onClick={async () => {
                        if (!isAdmin()) return;
                        try {
                          setSavingNextOrcamento(true);
                          const { error } = await supabase
                            .from('configuracoes')
                            .upsert({ chave: 'proxima_orcamento', valor: String(nextOrcamentoNumber || '') }, { onConflict: 'chave' });
                          if (error) throw error;
                          toast({ title: 'Numeração da próxima Orçamento salva' });
                        } catch (e) {
                          toast({ title: 'Erro ao salvar', description: String((e as any)?.message || e), variant: 'destructive' });
                        } finally {
                          setSavingNextOrcamento(false);
                        }
                      }}
                      disabled={savingNextOrcamento || !isAdmin()}
                    >
                      {savingNextOrcamento ? 'Salvando...' : 'Salvar Próxima Orçamento'}
                    </Button>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="tempo_tolerancia_pausa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo de Tolerância para Pausas (minutos)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="15"
                          min="0"
                          max="1440"
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              field.onChange(120);
                            } else {
                              const numValue = parseFloat(value);
                              field.onChange(isNaN(numValue) ? 120 : numValue);
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-muted-foreground">
                        Tempo máximo que uma OS pode ficar pausada sem afetar produtividade e relatórios.
                      </p>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* Seção de Temas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Paintbrush className="h-5 w-5" /> Temas do Sistema</CardTitle>
          <CardDescription>
            Selecione um tema baseado nas cores da marca (verde #006516, verde #39964D, preto, cinza #898987).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {themes.map((t) => (
              <button
                key={t.key}
                onClick={() => applyTheme(t.key)}
                className={`rounded-lg border p-4 text-left transition ${appTheme === t.key ? 'border-primary ring-2 ring-primary/30' : 'hover:border-primary/40'}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-medium">{t.name}</div>
                  {appTheme === t.key && (
                    <span className="text-xs text-primary">Ativo</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {t.colors.map((c, idx) => (
                    <span key={idx} className="h-6 w-6 rounded border" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seção de Backup do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Backup do Sistema</CardTitle>
          <CardDescription>
            Configure e gere backups completos dos dados do Supabase. Os backups são compactados em ZIP com data+hora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Informações de Conexão (somente leitura) */}
            <div className="rounded-lg border p-4 bg-muted/30">
              <h4 className="font-medium mb-3">Informações de Conexão</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>URL do Projeto</Label>
                  <Input 
                    value={import.meta.env.VITE_SUPABASE_URL || 'Não configurado'} 
                    readOnly 
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label>Anon Key</Label>
                  <Input 
                    value={import.meta.env.VITE_SUPABASE_ANON_KEY ? '***' + import.meta.env.VITE_SUPABASE_ANON_KEY.slice(-8) : 'Não configurado'} 
                    readOnly 
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>

            {/* Configurações de Backup */}
            <div className="space-y-4">
              <h4 className="font-medium">Configurações de Backup</h4>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="include_policies"
                      checked={backupForm.include_policies_schema}
                      onChange={(e) => setBackupForm(prev => ({ ...prev, include_policies_schema: e.target.checked }))}
                      disabled={!isAdmin()}
                    />
                    <Label htmlFor="include_policies">Incluir Políticas e Esquema</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">Inclui definições de RLS, políticas e metadados do banco (opcional)</p>
                </div>
              </div>

              <div>
                <Label htmlFor="filename_pattern">Padrão do Nome do Arquivo</Label>
                <Input
                  id="filename_pattern"
                  value={backupForm.filename_pattern}
                  onChange={(e) => setBackupForm(prev => ({ ...prev, filename_pattern: e.target.value }))}
                  disabled={!isAdmin()}
                  placeholder="metalmaos-backup-YYYY-MM-DD_HH-mm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use YYYY-MM-DD_HH-mm para data/hora automática
                </p>
              </div>

              {/* Destino fixo em Download Local */}
              <div>
                <Label>Destino do Backup</Label>
                <Input readOnly value="Download Local" className="bg-muted" />
              </div>

              <div>
                <Label htmlFor="output_format">Formato do Backup</Label>
                <Input id="output_format" readOnly value="JSON geral (todas as tabelas)" className="bg-muted" />
              </div>

              

              {backupForm.destination === 'storage' || backupForm.destination === 'both' ? (
                <div>
                  <Label htmlFor="storage_bucket">Bucket do Storage (opcional)</Label>
                  <Input
                    id="storage_bucket"
                    value={backupForm.storage_bucket}
                    onChange={(e) => setBackupForm(prev => ({ ...prev, storage_bucket: e.target.value }))}
                    disabled={!isAdmin()}
                    placeholder="backups"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Deixe vazio para usar bucket padrão
                  </p>
                </div>
              ) : null}
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-4 border-t">
              {isAdmin() && (
                <Button onClick={saveBackupConfig} variant="outline">
                  Salvar Configurações
                </Button>
              )}
              <Button 
                onClick={generateBackup} 
                disabled={isGeneratingBackup || !isAdmin()}
                className="flex items-center gap-2"
              >
                {isGeneratingBackup ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                {isGeneratingBackup ? 'Gerando Backup...' : 'Gerar Backup Agora'}
              </Button>
              
            </div>

            {/* Aviso de Segurança */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Importante:</p>
                  <p className="text-amber-700 dark:text-amber-300">
                    O backup é gerado via Edge Function no Supabase usando Service Role Key. 
                    Certifique-se de que a função 'export-backup' está configurada com os secrets necessários.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção antiga removida: Numeração da Próxima OS já foi movida para Parâmetros do Sistema */}


      {/* Relatório de Auditoria para Impressão - SEMPRE PRESENTE NO DOM */}
      <div className="only-print">
        <ReportTemplate
          title="Relatório de Auditoria"
          period={{
            start: filtroDataInicio || '2023-01-01',
            end: filtroDataFim || new Date().toISOString().split('T')[0],
          }}
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
                    <td style={{ maxWidth: 200, wordBreak: 'break-all' }}>
                      {item.user_agent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Estatísticas */}
            <div className="mt-4">
              <strong>Estatísticas:</strong>
              <ul className="text-xs">
                <li>Total de registros: {auditoria.length}</li>
                <li>
                  Logins:{' '}
                  {
                    auditoria.filter((item) => item.tipo_evento === 'login')
                      .length
                  }
                </li>
                <li>
                  Logouts:{' '}
                  {
                    auditoria.filter((item) => item.tipo_evento === 'logout')
                      .length
                  }
                </li>
                <li>
                  Usuários únicos:{' '}
                  {new Set(auditoria.map((item) => item.email_usuario)).size}
                </li>
              </ul>
            </div>
          </div>
        </ReportTemplate>
      </div>

      {/* CSS para impressão: só mostra .only-print e esconde o resto */}
      <style>{`
        .only-print {
          display: none;
        }
        @media print {
          .only-print {
            display: block !important;
          }
          body *:not(.only-print):not(.only-print *) {
            display: none !important;
          }
        }
        /* Corrige o ícone do date picker no modo escuro */
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(2); /* deixa o ícone branco no dark */
          opacity: 1;
        }
        .dark input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(2);
          opacity: 1;
        }
        input[type="date"]::-ms-input-placeholder { color: #fff; }
        input[type="date"]::-webkit-input-placeholder { color: #fff; opacity: 1; }
        input[type="date"]::-moz-placeholder { color: #fff; opacity: 1; }
        input[type="date"]:-ms-input-placeholder { color: #fff; opacity: 1; }
        input[type="date"]::placeholder { color: #fff; opacity: 1; }
      `}</style>
        </TabsContent>

      

        <TabsContent value="users" className="space-y-6">
          <PermissionGuard permission="usuario_gerenciar">
            <Card>
              <CardHeader>
                <CardTitle>Usuários</CardTitle>
                <CardDescription>
                  Gerencie os usuários do sistema e seus níveis de acesso.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex justify-between">
                  <Button onClick={() => setShowUserModal(true)}>
                    + Novo Usuário
                  </Button>
                </div>
                {/* Tabela de usuários existente */}
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
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
                          <td className="px-3 py-2">
                            {user.tipo_usuario === 'admin'
                              ? 'Administrador'
                              : 'Usuário'}
                          </td>
                          <td className="px-3 py-2">{user.ativo ? 'Sim' : 'Não'}</td>
                          <td className="px-3 py-2">
                            {user.nivel_id ? 'Nível ID: ' + user.nivel_id : 'N/A'}
                          </td>
                          <td className="flex gap-2 px-3 py-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditUser(user)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              Excluir
                            </Button>
                            {user.user_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResendEmail(user)}
                              >
                                Reenviar Email
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {usuarios.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-4 text-center text-muted-foreground"
                          >
                            Nenhum usuário cadastrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Seção de Níveis de Acesso Reorganizada */}
            <NiveisAcessoReorganizado />

            {/* Modal de cadastro/edição de usuário */}
            {showUserModal && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
                <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
                  <h2 className="mb-4 text-lg font-bold">
                    {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                  </h2>
                  <form onSubmit={handleSubmitUser} className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Nome</label>
                      <Input
                        value={userForm.nome}
                        onChange={(e) =>
                          setUserForm((f) => ({ ...f, nome: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">E-mail</label>
                      <Input
                        type="email"
                        value={userForm.email}
                        onChange={(e) =>
                          setUserForm((f) => ({ ...f, email: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Tipo</label>
                      <select
                        className="w-full rounded border border-border bg-background px-2 py-1 text-foreground"
                        value={userForm.tipo_usuario}
                        onChange={(e) =>
                          setUserForm((f) => ({ ...f, tipo_usuario: e.target.value }))
                        }
                      >
                        <option value="admin">Administrador</option>
                        <option value="colaborador">Usuário</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Nível de Acesso
                      </label>
                      <select
                        className="w-full rounded border border-border bg-background px-2 py-1 text-foreground"
                        value={userForm.nivel_id}
                        onChange={(e) =>
                          setUserForm((f) => ({ ...f, nivel_id: e.target.value }))
                        }
                      >
                        <option value="">Selecione um nível</option>
                        {niveis.map((nivel) => (
                          <option key={nivel.id} value={nivel.id}>
                            {nivel.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Campos de senha apenas na edição */}
                    {editingUser && (
                      <>
                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Nova Senha (deixe em branco para manter a atual)
                          </label>
                          <Input
                            type="password"
                            value={userForm.senha}
                            onChange={(e) =>
                              setUserForm((f) => ({ ...f, senha: e.target.value }))
                            }
                            placeholder="Digite a nova senha"
                            autoComplete="new-password"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Confirmar Nova Senha
                          </label>
                          <Input
                            type="password"
                            value={userForm.confirmarSenha}
                            onChange={(e) =>
                              setUserForm((f) => ({
                                ...f,
                                confirmarSenha: e.target.value,
                              }))
                            }
                            placeholder="Confirme a nova senha"
                            autoComplete="new-password"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ativo"
                        checked={userForm.ativo}
                        onChange={(e) =>
                          setUserForm((f) => ({ ...f, ativo: e.target.checked }))
                        }
                      />
                      <label htmlFor="ativo" className="text-sm">
                        Ativo
                      </label>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseUserModal}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit">Salvar</Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </PermissionGuard>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Somente Administrador pode editar/salvar. Demais perfis veem leitura. */}
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Segurança</CardTitle>
                <CardDescription>
                  Configure políticas alinhadas ao que já existe no sistema (validações, CSRF, XSS, rate limiting).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Requisitos de Senha</div>
                        <div className="text-sm text-muted-foreground">Mínimo, complexidade e limite máximo</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="min_password">Mínimo de caracteres</Label>
                        <Input id="min_password" type="number" value={securityForm.min_password} onChange={(e) => setSecurityForm((p) => ({ ...p, min_password: Number(e.target.value) }))} disabled={!isAdmin()} />
                      </div>
                      <div>
                        <Label htmlFor="max_password">Máximo de caracteres</Label>
                        <Input id="max_password" type="number" value={securityForm.max_password} onChange={(e) => setSecurityForm((p) => ({ ...p, max_password: Number(e.target.value) }))} disabled={!isAdmin()} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Definido pelo código para segurança. Para alterar, solicite implementação.</p>
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="font-medium">Rate Limiting</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="rl_window">Janela (min)</Label>
                        <Input id="rl_window" type="number" value={securityForm.rl_window_min} onChange={(e) => setSecurityForm((p) => ({ ...p, rl_window_min: Number(e.target.value) }))} disabled={!isAdmin()} />
                      </div>
                      <div>
                        <Label htmlFor="rl_max">Máx. requisições</Label>
                        <Input id="rl_max" type="number" value={securityForm.rl_max_requests} onChange={(e) => setSecurityForm((p) => ({ ...p, rl_max_requests: Number(e.target.value) }))} disabled={!isAdmin()} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Controlado internamente via utilitário de segurança.</p>
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="font-medium">Proteções de XSS e Sanitização</div>
                    <p className="text-sm text-muted-foreground">Sanitização de HTML e detecção de padrões perigosos já ativa no sistema.</p>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={securityForm.xss_enabled} onChange={(e) => setSecurityForm((p) => ({ ...p, xss_enabled: e.target.checked }))} id="xss_protection" disabled={!isAdmin()} />
                      <Label htmlFor="xss_protection">Ativado</Label>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="font-medium">CSRF</div>
                    <p className="text-sm text-muted-foreground">Tokens gerados e validados pelo hook de segurança.</p>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={securityForm.csrf_enabled} onChange={(e) => setSecurityForm((p) => ({ ...p, csrf_enabled: e.target.checked }))} id="csrf_enabled" disabled={!isAdmin()} />
                      <Label htmlFor="csrf_enabled">Ativado</Label>
                    </div>
                  </div>
                </div>
                {isAdmin() && (
                  <div className="mt-4 flex justify-end">
                    <Button onClick={saveSecurity}>Salvar Segurança</Button>
                  </div>
                )}
              </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <PermissionGuard permission="auditoria_visualizar">
            <Card>
              <CardHeader>
                <CardTitle>Auditoria de Login/Logout</CardTitle>
                <CardDescription>
                  Monitore todos os acessos ao sistema com filtros avançados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filtros */}
                <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-muted/30 p-4 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Usuário</label>
                    <Input
                      placeholder="Nome ou email"
                      value={filtroUsuario}
                      onChange={(e) => setFiltroUsuario(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Data Início
                    </label>
                    <Input
                      type="date"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Data Fim</label>
                    <Input
                      type="date"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Tipo de Evento
                    </label>
                    <select
                      className="w-full rounded border border-border bg-background px-2 py-1 text-foreground"
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
                <div className="mb-4 flex justify-between">
                  <div className="flex gap-2">
                    <Button onClick={fetchAuditoria} disabled={loadingAuditoria}>
                      {loadingAuditoria && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Buscar
                    </Button>
                    <Button variant="outline" onClick={limparFiltros}>
                      Limpar Filtros
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={exportarAuditoria}
                      disabled={auditoria.length === 0}
                    >
                      Exportar CSV
                    </Button>
                  </div>
                </div>

                {/* Tabela de auditoria */}
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
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
                          <td colSpan={5} className="py-4 text-center">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                          </td>
                        </tr>
                      ) : auditoria.length > 0 ? (
                        auditoria.map((item) => (
                          <tr key={item.id} className="border-b">
                            <td className="px-3 py-2 font-medium">
                              {item.nome_usuario}
                            </td>
                            <td className="px-3 py-2">{item.email_usuario}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded px-2 py-1 text-xs ${
                                  item.tipo_evento === 'login'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {item.tipo_evento === 'login' ? 'Login' : 'Logout'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {item.data_hora 
                                ? new Date(item.data_hora).toLocaleString('pt-BR')
                                : 'Data não disponível'
                              }
                            </td>
                            <td className="max-w-xs truncate px-3 py-2 text-xs text-muted-foreground">
                              {item.user_agent}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-4 text-center text-muted-foreground"
                          >
                            Nenhum registro de auditoria encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Estatísticas */}
                {auditoria.length > 0 && (
                  <div className="mt-4 rounded-lg bg-muted/30 p-4">
                    <h4 className="mb-2 font-medium">Estatísticas</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground">
                          Total de registros:
                        </span>
                        <div className="font-medium">{auditoria.length}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Logins:</span>
                        <div className="font-medium text-green-600">
                          {
                            auditoria.filter((item) => item.tipo_evento === 'login')
                              .length
                          }
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Logouts:</span>
                        <div className="font-medium text-red-600">
                          {
                            auditoria.filter((item) => item.tipo_evento === 'logout')
                              .length
                          }
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Usuários únicos:
                        </span>
                        <div className="font-medium">
                          {new Set(auditoria.map((item) => item.email_usuario)).size}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>

        <TabsContent value="audit-os" className="space-y-6">
          <PermissionGuard permission="auditoria_visualizar">
            <Card>
              <CardHeader>
                <CardTitle>Auditoria de Ordens de Serviço</CardTitle>
                <CardDescription>
                  Monitore todas as ações realizadas pelos usuários nas Ordens de Serviço.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filtros para auditoria de OS */}
                <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-muted/30 p-4 md:grid-cols-5">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Usuário</label>
                    <Input
                      placeholder="Nome ou email"
                      value={filtroUsuarioOS}
                      onChange={(e) => setFiltroUsuarioOS(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Data Início
                    </label>
                    <Input
                      type="date"
                      value={filtroDataInicioOS}
                      onChange={(e) => setFiltroDataInicioOS(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Data Fim</label>
                    <Input
                      type="date"
                      value={filtroDataFimOS}
                      onChange={(e) => setFiltroDataFimOS(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Tipo de Ação
                    </label>
                    <select
                      className="w-full rounded border border-border bg-background px-2 py-1 text-foreground"
                      value={filtroTipoAcaoOS}
                      onChange={(e) => setFiltroTipoAcaoOS(e.target.value)}
                    >
                      <option value="">Todas</option>
                      <option value="criar_os">Criar OS</option>
                      <option value="editar_os">Editar OS</option>
                      <option value="excluir_os">Excluir OS</option>
                      <option value="iniciar_os">Iniciar OS</option>
                      <option value="reiniciar_os">Reiniciar OS</option>
                      <option value="pausar_os">Pausar OS</option>
                      <option value="parar_os">Parar OS</option>
                      <option value="finalizar_os">Finalizar OS</option>
                      <option value="adicionar_colaborador">Adicionar Colaborador</option>
                      <option value="remover_colaborador">Remover Colaborador</option>
                      <option value="cancelar_os">Cancelar OS</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Número da OS
                    </label>
                    <Input
                      placeholder="Ex: OS-001"
                      value={filtroNumeroOS}
                      onChange={(e) => setFiltroNumeroOS(e.target.value)}
                    />
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="mb-4 flex justify-between">
                  <div className="flex gap-2">
                    <Button onClick={fetchAuditoriaOS} disabled={loadingAuditoriaOS}>
                      {loadingAuditoriaOS && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Buscar
                    </Button>
                    <Button variant="outline" onClick={limparFiltrosOS}>
                      Limpar Filtros
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={exportarAuditoriaOS}
                      disabled={auditoriaOS.length === 0}
                    >
                      Exportar CSV
                    </Button>
                  </div>
                </div>

                {/* Tabela de auditoria de OS */}
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-3 py-2 text-left">Usuário</th>
                        <th className="px-3 py-2 text-left">Email</th>
                        <th className="px-3 py-2 text-left">Ação</th>
                        <th className="px-3 py-2 text-left">Número OS</th>
                        <th className="px-3 py-2 text-left">Data/Hora</th>
                        <th className="px-3 py-2 text-left">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingAuditoriaOS ? (
                        <tr>
                          <td colSpan={6} className="py-4 text-center">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                          </td>
                        </tr>
                      ) : auditoriaOS.length > 0 ? (
                        auditoriaOS.map((item) => (
                          <tr key={item.id} className="border-b">
                            <td className="px-3 py-2 font-medium">
                              {item.nome_usuario}
                            </td>
                            <td className="px-3 py-2">{item.email_usuario}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded px-2 py-1 text-xs ${
                                  item.acao === 'criar_os' || item.acao === 'iniciar_os' || item.acao === 'reiniciar_os' || item.acao === 'iniciar_colaborador'
                                    ? 'bg-green-100 text-green-800'
                                    : item.acao === 'excluir_os' || item.acao === 'parar_os'
                                    ? 'bg-red-100 text-red-800'
                                    : item.acao === 'pausar_os'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : item.acao === 'finalizar_os'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {item.acao === 'criar_os' && 'Criar OS'}
                                {item.acao === 'editar_os' && 'Editar OS'}
                                {item.acao === 'excluir_os' && 'Excluir OS'}
                                {item.acao === 'iniciar_os' && 'Iniciar OS'}
                                {item.acao === 'iniciar_colaborador' && 'Iniciar Colaborador'}
                                {item.acao === 'reiniciar_os' && 'Reiniciar OS'}
                                {item.acao === 'pausar_os' && 'Pausar OS'}
                                {item.acao === 'parar_os' && 'Parar OS'}
                                {item.acao === 'finalizar_os' && 'Finalizar OS'}
                                {item.acao === 'adicionar_colaborador' && 'Adicionar Colaborador'}
                                {item.acao === 'remover_colaborador' && 'Remover Colaborador'}
                                {item.acao === 'cancelar_os' && 'Cancelar OS'}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono">
                              {item.numero_os || 'N/A'}
                            </td>
                            <td className="px-3 py-2">
                              {item.data_acao 
                                ? new Date(item.data_acao).toLocaleString('pt-BR')
                                : 'Data não disponível'
                              }
                            </td>
                            <td className="max-w-xs truncate px-3 py-2 text-xs text-muted-foreground">
                              {item.detalhes}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-4 text-center text-muted-foreground"
                          >
                            Nenhum registro de auditoria de OS encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Estatísticas */}
                {auditoriaOS.length > 0 && (
                  <div className="mt-4 rounded-lg bg-muted/30 p-4">
                    <h4 className="mb-2 font-medium">Estatísticas</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground">
                          Total de ações:
                        </span>
                        <div className="font-medium">{auditoriaOS.length}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">OS criadas:</span>
                        <div className="font-medium text-green-600">
                          {
                            auditoriaOS.filter((item) => item.acao === 'criar_os')
                              .length
                          }
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">OS finalizadas:</span>
                        <div className="font-medium text-blue-600">
                          {
                            auditoriaOS.filter((item) => item.acao === 'finalizar_os')
                              .length
                          }
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Usuários únicos:
                        </span>
                        <div className="font-medium">
                          {new Set(auditoriaOS.map((item) => item.email_usuario)).size}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>

        {/* Aba Auditoria Orçamento */}
        <TabsContent value="audit-orcamento" className="space-y-6">
          <PermissionGuard permission="auditoria_visualizar">
            <Card>
              <CardHeader>
                <CardTitle>Auditoria de Orçamentos</CardTitle>
                <CardDescription>
                  Monitore todas as ações realizadas pelos usuários nos Orçamentos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filtros para auditoria de Orçamentos */}
                <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-muted/30 p-4 md:grid-cols-5">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Usuário</label>
                    <Input
                      placeholder="Nome ou email"
                      value={filtroUsuarioOrcamento}
                      onChange={(e) => setFiltroUsuarioOrcamento(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Data Início
                    </label>
                    <Input
                      type="date"
                      value={filtroDataInicioOrcamento}
                      onChange={(e) => setFiltroDataInicioOrcamento(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Data Fim</label>
                    <Input
                      type="date"
                      value={filtroDataFimOrcamento}
                      onChange={(e) => setFiltroDataFimOrcamento(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Tipo de Ação
                    </label>
                    <select
                      className="w-full rounded border border-border bg-background px-2 py-1 text-foreground"
                      value={filtroTipoAcaoOrcamento}
                      onChange={(e) => setFiltroTipoAcaoOrcamento(e.target.value)}
                    >
                      <option value="">Todas</option>
                      <option value="EXCLUSAO_ORCAMENTO">Exclusão</option>
                      <option value="CRIACAO_ORCAMENTO">Criação</option>
                      <option value="EDICAO_ORCAMENTO">Edição</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Número do Orçamento
                    </label>
                    <Input
                      placeholder="Ex: ORC0001/2025"
                      value={filtroNumeroOrcamento}
                      onChange={(e) => setFiltroNumeroOrcamento(e.target.value)}
                    />
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="mb-4 flex justify-between">
                  <div className="flex gap-2">
                    <Button onClick={fetchAuditoriaOrcamento} disabled={loadingAuditoriaOrcamento}>
                      {loadingAuditoriaOrcamento && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Buscar
                    </Button>
                    <Button variant="outline" onClick={limparFiltrosOrcamento}>
                      Limpar Filtros
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={exportarAuditoriaOrcamento}
                      disabled={auditoriaOrcamento.length === 0}
                    >
                      Exportar CSV
                    </Button>
                  </div>
                </div>

                {/* Tabela de auditoria de Orçamentos */}
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-3 py-2 text-left">Usuário</th>
                        <th className="px-3 py-2 text-left">Email</th>
                        <th className="px-3 py-2 text-left">Ação</th>
                        <th className="px-3 py-2 text-left">Número Orçamento</th>
                        <th className="px-3 py-2 text-left">Data/Hora</th>
                        <th className="px-3 py-2 text-left">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingAuditoriaOrcamento ? (
                        <tr>
                          <td colSpan={6} className="py-4 text-center">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                          </td>
                        </tr>
                      ) : auditoriaOrcamento.length > 0 ? (
                        auditoriaOrcamento.map((item) => (
                          <tr key={item.id} className="border-b">
                            <td className="px-3 py-2 font-medium">
                              {item.nome_usuario}
                            </td>
                            <td className="px-3 py-2">{item.email_usuario}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded px-2 py-1 text-xs ${
                                  item.acao === 'CRIACAO_ORCAMENTO'
                                    ? 'bg-green-100 text-green-800'
                                    : item.acao === 'EXCLUSAO_ORCAMENTO'
                                    ? 'bg-red-100 text-red-800'
                                    : item.acao === 'EDICAO_ORCAMENTO'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {item.acao === 'CRIACAO_ORCAMENTO' && 'Criação'}
                                {item.acao === 'EDICAO_ORCAMENTO' && 'Edição'}
                                {item.acao === 'EXCLUSAO_ORCAMENTO' && 'Exclusão'}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono">
                              {item.numero_orcamento || 'N/A'}
                            </td>
                            <td className="px-3 py-2">
                              {item.data_acao 
                                ? new Date(item.data_acao).toLocaleString('pt-BR')
                                : 'Data não disponível'
                              }
                            </td>
                            <td className="max-w-xs truncate px-3 py-2 text-xs text-muted-foreground">
                              {item.detalhes}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-4 text-center text-muted-foreground"
                          >
                            Nenhum registro de auditoria de Orçamentos encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>

        {/* Nova seção: OS em Cliente / Retornar à Produção */}
        <TabsContent value="ajuste-os" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ajuste de OS
              </CardTitle>
              <CardDescription>
                Filtre OS finalizadas por período e ajuste horas dos colaboradores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="data-inicio-ajuste">Data de Início</Label>
                  <Input
                    id="data-inicio-ajuste"
                    type="date"
                    value={dataInicioAjuste}
                    onChange={(e) => setDataInicioAjuste(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="data-fim-ajuste">Data de Fim</Label>
                  <Input
                    id="data-fim-ajuste"
                    type="date"
                    value={dataFimAjuste}
                    onChange={(e) => setDataFimAjuste(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={buscarOsFinalizadas} 
                    disabled={loadingAjuste}
                    className="w-full"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {loadingAjuste ? 'Buscando...' : 'Buscar OS'}
                  </Button>
                </div>
              </div>

              {/* Lista de OS */}
              {osFinalizadas.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">OS Finalizadas ({osFinalizadas.length})</h3>
                  <div className="grid gap-4">
                    {osFinalizadas.map((os) => (
                      <Card key={os.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">OS {os.numero_os}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(os.data_abertura).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <div className="text-sm">
                                <strong>Cliente:</strong> {os.clientes?.nome || 'N/A'}
                              </div>
                              <div className="text-sm">
                                <strong>Colaboradores:</strong> {os.os_colaboradores?.length || 0}
                              </div>
                            </div>
                            <Button 
                              onClick={() => abrirAjusteOS(os)}
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <Calendar className="h-4 w-4" />
                              Ajustar Horas
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {osFinalizadas.length === 0 && !loadingAjuste && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma OS finalizada encontrada no período selecionado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="os-em-cliente" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>OS em Cliente</CardTitle>
              <CardDescription>
                Filtre por data e gerencie OS enviadas ao cliente (pausa provisória) e retorno à produção.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OsEmClienteSection />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Ajuste de OS */}
      <AjusteOSDialog
        open={showAjusteDialog}
        onOpenChange={setShowAjusteDialog}
        os={osSelecionada}
      />
    </div>
  );
}
