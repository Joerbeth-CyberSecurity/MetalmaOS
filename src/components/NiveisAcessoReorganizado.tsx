import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  ClipboardList, 
  UserCheck, 
  Package, 
  BarChart3, 
  Settings, 
  FileText,
  HelpCircle,
  Check,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Permissao {
  id: string;
  nome: string;
  descricao: string;
  modulo: string;
  acao: string;
}

interface NivelAcesso {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

interface ModuloPermissoes {
  modulo: string;
  titulo: string;
  icone: React.ComponentType<{ className?: string }>;
  permissaoPrincipal: string;
  permissoes: Permissao[];
}

const modulos: ModuloPermissoes[] = [
  {
    modulo: 'dashboard',
    titulo: 'Dashboard',
    icone: BarChart3,
    permissaoPrincipal: 'dashboard_visualizar',
    permissoes: [
      { id: '', nome: 'dashboard_visualizar', descricao: 'Acesso ao Dashboard principal', modulo: 'dashboard', acao: 'visualizar' },
      { id: '', nome: 'dashboard_avancado', descricao: 'Acesso ao Dashboard avançado', modulo: 'dashboard', acao: 'avancado' },
      { id: '', nome: 'dashboard_visao_geral', descricao: 'Acesso à visão geral do Dashboard', modulo: 'dashboard', acao: 'visao_geral' }
    ]
  },
  {
    modulo: 'ordens_servico',
    titulo: 'Ordens de Serviço',
    icone: ClipboardList,
    permissaoPrincipal: 'os_visualizar',
    permissoes: [
      { id: '', nome: 'os_visualizar', descricao: 'Visualizar ordens de serviço', modulo: 'ordens_servico', acao: 'visualizar' },
      { id: '', nome: 'os_criar', descricao: 'Criar novas ordens de serviço', modulo: 'ordens_servico', acao: 'criar' },
      { id: '', nome: 'os_editar', descricao: 'Editar ordens de serviço', modulo: 'ordens_servico', acao: 'editar' },
      { id: '', nome: 'os_excluir', descricao: 'Excluir ordens de serviço', modulo: 'ordens_servico', acao: 'excluir' },
      { id: '', nome: 'os_finalizar', descricao: 'Finalizar ordens de serviço', modulo: 'ordens_servico', acao: 'finalizar' },
      { id: '', nome: 'os_pausar', descricao: 'Pausar ordens de serviço', modulo: 'ordens_servico', acao: 'pausar' },
      { id: '', nome: 'os_reiniciar', descricao: 'Reiniciar ordens de serviço', modulo: 'ordens_servico', acao: 'reiniciar' },
      { id: '', nome: 'os_gerenciar_tempo', descricao: 'Gerenciar tempo de execução', modulo: 'ordens_servico', acao: 'gerenciar_tempo' },
      { id: '', nome: 'os_ajustar_horas', descricao: 'Ajustar horas de colaboradores', modulo: 'ordens_servico', acao: 'ajustar_horas' }
    ]
  },
  {
    modulo: 'clientes',
    titulo: 'Clientes',
    icone: Users,
    permissaoPrincipal: 'cliente_visualizar',
    permissoes: [
      { id: '', nome: 'cliente_visualizar', descricao: 'Visualizar clientes', modulo: 'clientes', acao: 'visualizar' },
      { id: '', nome: 'cliente_criar', descricao: 'Criar novos clientes', modulo: 'clientes', acao: 'criar' },
      { id: '', nome: 'cliente_editar', descricao: 'Editar clientes', modulo: 'clientes', acao: 'editar' },
      { id: '', nome: 'cliente_excluir', descricao: 'Excluir clientes', modulo: 'clientes', acao: 'excluir' },
      { id: '', nome: 'cliente_exportar', descricao: 'Exportar lista de clientes', modulo: 'clientes', acao: 'exportar' }
    ]
  },
  {
    modulo: 'colaboradores',
    titulo: 'Colaboradores',
    icone: UserCheck,
    permissaoPrincipal: 'colaborador_visualizar',
    permissoes: [
      { id: '', nome: 'colaborador_visualizar', descricao: 'Visualizar colaboradores', modulo: 'colaboradores', acao: 'visualizar' },
      { id: '', nome: 'colaborador_criar', descricao: 'Criar novos colaboradores', modulo: 'colaboradores', acao: 'criar' },
      { id: '', nome: 'colaborador_editar', descricao: 'Editar colaboradores', modulo: 'colaboradores', acao: 'editar' },
      { id: '', nome: 'colaborador_excluir', descricao: 'Excluir colaboradores', modulo: 'colaboradores', acao: 'excluir' },
      { id: '', nome: 'colaborador_gerenciar_metas', descricao: 'Gerenciar metas de colaboradores', modulo: 'colaboradores', acao: 'gerenciar_metas' }
    ]
  },
  {
    modulo: 'produtos',
    titulo: 'Produtos',
    icone: Package,
    permissaoPrincipal: 'produto_visualizar',
    permissoes: [
      { id: '', nome: 'produto_visualizar', descricao: 'Visualizar produtos', modulo: 'produtos', acao: 'visualizar' },
      { id: '', nome: 'produto_criar', descricao: 'Criar novos produtos', modulo: 'produtos', acao: 'criar' },
      { id: '', nome: 'produto_editar', descricao: 'Editar produtos', modulo: 'produtos', acao: 'editar' },
      { id: '', nome: 'produto_excluir', descricao: 'Excluir produtos', modulo: 'produtos', acao: 'excluir' },
      { id: '', nome: 'produto_gerenciar_estoque', descricao: 'Gerenciar estoque de produtos', modulo: 'produtos', acao: 'gerenciar_estoque' }
    ]
  },
  {
    modulo: 'relatorios',
    titulo: 'Relatórios',
    icone: BarChart3,
    permissaoPrincipal: 'relatorio_visualizar',
    permissoes: [
      { id: '', nome: 'relatorio_visualizar', descricao: 'Visualizar relatórios', modulo: 'relatorios', acao: 'visualizar' },
      { id: '', nome: 'relatorio_exportar', descricao: 'Exportar relatórios', modulo: 'relatorios', acao: 'exportar' },
      { id: '', nome: 'relatorio_imprimir', descricao: 'Imprimir relatórios', modulo: 'relatorios', acao: 'imprimir' },
      { id: '', nome: 'relatorio_produtividade', descricao: 'Acesso a relatórios de produtividade', modulo: 'relatorios', acao: 'produtividade' },
      { id: '', nome: 'relatorio_atraso', descricao: 'Acesso a relatórios de atraso', modulo: 'relatorios', acao: 'atraso' }
    ]
  },
  {
    modulo: 'orcamentos',
    titulo: 'Orçamentos',
    icone: FileText,
    permissaoPrincipal: 'orcamento_visualizar',
    permissoes: [
      { id: '', nome: 'orcamento_visualizar', descricao: 'Visualizar orçamentos', modulo: 'orcamentos', acao: 'visualizar' },
      { id: '', nome: 'orcamento_criar', descricao: 'Criar novos orçamentos', modulo: 'orcamentos', acao: 'criar' },
      { id: '', nome: 'orcamento_editar', descricao: 'Editar orçamentos', modulo: 'orcamentos', acao: 'editar' },
      { id: '', nome: 'orcamento_excluir', descricao: 'Excluir orçamentos', modulo: 'orcamentos', acao: 'excluir' },
      { id: '', nome: 'orcamento_transformar_os', descricao: 'Transformar orçamento em OS', modulo: 'orcamentos', acao: 'transformar_os' },
      { id: '', nome: 'orcamento_aplicar_desconto', descricao: 'Aplicar desconto em orçamentos', modulo: 'orcamentos', acao: 'aplicar_desconto' }
    ]
  },
  {
    modulo: 'configuracoes',
    titulo: 'Configurações',
    icone: Settings,
    permissaoPrincipal: 'config_visualizar',
    permissoes: [
      { id: '', nome: 'config_visualizar', descricao: 'Visualizar configurações', modulo: 'configuracoes', acao: 'visualizar' },
      { id: '', nome: 'config_editar', descricao: 'Editar configurações', modulo: 'configuracoes', acao: 'editar' },
      { id: '', nome: 'config_usuarios', descricao: 'Gerenciar usuários', modulo: 'configuracoes', acao: 'usuarios' },
      { id: '', nome: 'config_niveis', descricao: 'Gerenciar níveis de acesso', modulo: 'configuracoes', acao: 'niveis' },
      { id: '', nome: 'config_auditoria', descricao: 'Visualizar auditoria', modulo: 'configuracoes', acao: 'auditoria' },
      { id: '', nome: 'config_ajuste_os', descricao: 'Acesso ao ajuste de OS', modulo: 'configuracoes', acao: 'ajuste_os' }
    ]
  },
  {
    modulo: 'ajuda',
    titulo: 'Ajuda',
    icone: HelpCircle,
    permissaoPrincipal: 'ajuda_visualizar',
    permissoes: [
      { id: '', nome: 'ajuda_visualizar', descricao: 'Acesso à central de ajuda', modulo: 'ajuda', acao: 'visualizar' }
    ]
  }
];

export default function NiveisAcessoReorganizado() {
  const [niveis, setNiveis] = useState<NivelAcesso[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [selectedNivel, setSelectedNivel] = useState<NivelAcesso | null>(null);
  const [selectedPermissoes, setSelectedPermissoes] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingNivel, setEditingNivel] = useState<NivelAcesso | null>(null);
  const [nivelForm, setNivelForm] = useState({
    nome: '',
    descricao: '',
    ativo: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchNiveis();
    fetchPermissoes();
  }, []);

  const fetchNiveis = async () => {
    const { data, error } = await supabase
      .from('niveis_acesso')
      .select('*')
      .order('nome');
    
    if (error) {
      toast({
        title: 'Erro ao buscar níveis',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setNiveis(data || []);
    }
  };

  const fetchPermissoes = async () => {
    const { data, error } = await supabase
      .from('permissoes')
      .select('*')
      .order('modulo, acao');
    
    if (error) {
      toast({
        title: 'Erro ao buscar permissões',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setPermissoes(data || []);
    }
  };

  const fetchNivelPermissoes = async (nivelId: string) => {
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
    } else {
      setSelectedPermissoes(data?.map(p => p.permissao_id) || []);
    }
  };

  const handleEditNivel = async (nivel: NivelAcesso) => {
    setSelectedNivel(nivel);
    setEditingNivel(nivel);
    setNivelForm({
      nome: nivel.nome,
      descricao: nivel.descricao,
      ativo: nivel.ativo
    });
    await fetchNivelPermissoes(nivel.id);
    setShowModal(true);
  };

  const handleSaveNivel = async () => {
    try {
      let nivelId = selectedNivel?.id;

      if (editingNivel) {
        // Atualizar nível existente
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
          .select();
        
        if (error) throw error;
        nivelId = data[0].id;
      }

      // Atualizar permissões
      if (nivelId) {
        // Remover permissões existentes
        await supabase
          .from('nivel_permissoes')
          .delete()
          .eq('nivel_id', nivelId);

        // Adicionar novas permissões
        if (selectedPermissoes.length > 0) {
          const nivelPermissoes = selectedPermissoes.map(permissaoId => ({
            nivel_id: nivelId,
            permissao_id: permissaoId
          }));

          await supabase
            .from('nivel_permissoes')
            .insert(nivelPermissoes);
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Nível de acesso salvo com sucesso!',
      });

      await fetchNiveis();
      setShowModal(false);
      setSelectedNivel(null);
      setEditingNivel(null);
      setNivelForm({ nome: '', descricao: '', ativo: true });
      setSelectedPermissoes([]);
    } catch (error) {
      toast({
        title: 'Erro ao salvar nível',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNivel = async (nivelId: string) => {
    if (confirm('Tem certeza que deseja excluir este nível de acesso?')) {
      try {
        const { error } = await supabase
          .from('niveis_acesso')
          .delete()
          .eq('id', nivelId);
        
        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Nível de acesso excluído com sucesso!',
        });

        await fetchNiveis();
      } catch (error) {
        toast({
          title: 'Erro ao excluir nível',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleModuloToggle = (modulo: ModuloPermissoes, checked: boolean) => {
    const moduloPermissoes = permissoes.filter(p => p.modulo === modulo.modulo);
    const permissaoIds = moduloPermissoes.map(p => p.id);
    
    if (checked) {
      // Adicionar todas as permissões do módulo
      setSelectedPermissoes(prev => [...prev, ...permissaoIds.filter(id => !prev.includes(id))]);
    } else {
      // Remover todas as permissões do módulo
      setSelectedPermissoes(prev => prev.filter(id => !permissaoIds.includes(id)));
    }
  };

  const isModuloCompleto = (modulo: ModuloPermissoes) => {
    const moduloPermissoes = permissoes.filter(p => p.modulo === modulo.modulo);
    return moduloPermissoes.every(p => selectedPermissoes.includes(p.id));
  };

  const isModuloParcial = (modulo: ModuloPermissoes) => {
    const moduloPermissoes = permissoes.filter(p => p.modulo === modulo.modulo);
    const temAlguma = moduloPermissoes.some(p => selectedPermissoes.includes(p.id));
    const temTodas = moduloPermissoes.every(p => selectedPermissoes.includes(p.id));
    return temAlguma && !temTodas;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Níveis de Acesso</h2>
          <p className="text-muted-foreground">
            Gerencie os níveis de acesso e suas permissões de forma organizada por módulo.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          + Novo Nível
        </Button>
      </div>

      {/* Lista de Níveis */}
      <div className="grid gap-4">
        {niveis.map((nivel) => (
          <Card key={nivel.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{nivel.nome}</h3>
                    <Badge variant={nivel.ativo ? 'default' : 'secondary'}>
                      {nivel.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{nivel.descricao}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditNivel(nivel)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteNivel(nivel.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Edição */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-card p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">
              {editingNivel ? 'Editar Nível' : 'Novo Nível'}
            </h2>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSaveNivel(); }} className="space-y-6">
              {/* Informações do Nível */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={nivelForm.nome}
                    onChange={(e) => setNivelForm(prev => ({ ...prev, nome: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ativo"
                    checked={nivelForm.ativo}
                    onCheckedChange={(checked) => setNivelForm(prev => ({ ...prev, ativo: !!checked }))}
                  />
                  <Label htmlFor="ativo">Ativo</Label>
                </div>
              </div>
              
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={nivelForm.descricao}
                  onChange={(e) => setNivelForm(prev => ({ ...prev, descricao: e.target.value }))}
                  className="h-20"
                />
              </div>

              <Separator />

              {/* Permissões por Módulo */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Permissões por Módulo</h3>
                <div className="space-y-6">
                  {modulos.map((modulo) => {
                    const Icone = modulo.icone;
                    const moduloPermissoes = permissoes.filter(p => p.modulo === modulo.modulo);
                    const isCompleto = isModuloCompleto(modulo);
                    const isParcial = isModuloParcial(modulo);
                    
                    return (
                      <Card key={modulo.modulo}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Icone className="h-5 w-5" />
                              <CardTitle className="text-base">{modulo.titulo}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isCompleto}
                                ref={(el) => {
                                  if (el) {
                                    el.indeterminate = isParcial;
                                  }
                                }}
                                onCheckedChange={(checked) => handleModuloToggle(modulo, !!checked)}
                              />
                              <span className="text-sm text-muted-foreground">
                                {isCompleto ? 'Todos' : isParcial ? 'Parcial' : 'Nenhum'}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {moduloPermissoes.map((permissao) => (
                              <div key={permissao.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`perm_${permissao.id}`}
                                  checked={selectedPermissoes.includes(permissao.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedPermissoes(prev => [...prev, permissao.id]);
                                    } else {
                                      setSelectedPermissoes(prev => prev.filter(id => id !== permissao.id));
                                    }
                                  }}
                                />
                                <Label htmlFor={`perm_${permissao.id}`} className="text-sm">
                                  <div className="font-medium">{permissao.nome.replace(/_/g, ' ')}</div>
                                  <div className="text-xs text-muted-foreground">{permissao.descricao}</div>
                                </Label>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedNivel(null);
                    setEditingNivel(null);
                    setNivelForm({ nome: '', descricao: '', ativo: true });
                    setSelectedPermissoes([]);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
