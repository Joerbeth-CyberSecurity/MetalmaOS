import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { MoreHorizontal, Eye, Edit, Trash2, UserPlus, Play, Pause, CheckCircle, AlertTriangle, StopCircle } from 'lucide-react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from './hover-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

interface ResponsiveTableProps {
  data: any[];
  columns: {
    key: string;
    label: React.ReactNode;
    render?: (value: any, item: any) => React.ReactNode;
    className?: string;
    hideOnMobile?: boolean;
  }[];
  actions?: {
    label: string;
    icon: React.ComponentType<any>;
    onClick: (item: any) => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    disabled?: boolean;
  }[] | ((item: any) => {
    label: string;
    icon: React.ComponentType<any>;
    onClick: (item: any) => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    disabled?: boolean;
  }[]);
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: any) => void;
}

export function ResponsiveTable({
  data,
  columns,
  actions = [],
  loading = false,
  emptyMessage = 'Nenhum item encontrado',
  onRowClick,
}: ResponsiveTableProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden lg:block">
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.key} className={column.className}>
                      {column.label}
                    </TableHead>
                  ))}
                  {actions.length > 0 && <TableHead className="w-12">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, index) => (
                  <TableRow
                    key={index}
                    className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.render
                          ? column.render(item[column.key], item)
                          : item[column.key]}
                      </TableCell>
                    ))}
                    {(() => {
                      const itemActions = typeof actions === 'function' ? actions(item) : actions;
                      return itemActions.length > 0 && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {itemActions.map((action, actionIndex) => (
                                <DropdownMenuItem
                                  key={actionIndex}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!action.disabled) action.onClick(item);
                                  }}
                                  disabled={!!action.disabled}
                                  className={action.variant === 'destructive' ? 'text-destructive' : ''}
                                >
                                  <action.icon className="mr-2 h-4 w-4" />
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      );
                    })()}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {data.map((item, index) => (
          <Card
            key={index}
            className={`${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''} transition-colors`}
            onClick={() => onRowClick?.(item)}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Main content */}
                <div className="space-y-2">
                  {columns
                    .filter((column) => !column.hideOnMobile)
                    .map((column) => (
                      <div key={column.key} className="flex justify-between items-start">
                        <span className="text-sm font-medium text-muted-foreground">
                          {column.label}:
                        </span>
                        <div className="text-right max-w-[60%]">
                          {column.render
                            ? column.render(item[column.key], item)
                            : item[column.key]}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Actions */}
                {(() => {
                  const itemActions = typeof actions === 'function' ? actions(item) : actions;
                  return itemActions.length > 0 && (
                    <div className="flex gap-2 pt-2 border-t">
                      {itemActions.map((action, actionIndex) => (
                        <Button
                          key={actionIndex}
                          variant={action.variant || 'outline'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!action.disabled) action.onClick(item);
                          }}
                          className={`flex-1 ${action.disabled ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          <action.icon className="mr-2 h-4 w-4" />
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Componente específico para tabelas de Clientes
export function ClientesResponsiveTable({
  data,
  onEdit,
  onDelete,
  loading = false,
}: {
  data: any[];
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  loading?: boolean;
}) {
  const formatPhone = (phone: string | null) => {
    if (!phone) return 'N/A';
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
  };

  const formatCpfCnpj = (value: string | null) => {
    if (!value) return 'N/A';
    if (value.length === 11) {
      return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (value.length === 14) {
      return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const columns = [
    {
      key: 'nome',
      label: 'Nome',
      className: 'font-medium',
    },
    {
      key: 'cpf_cnpj',
      label: 'CPF/CNPJ',
      render: (value: any) => formatCpfCnpj(value),
      hideOnMobile: true,
    },
    {
      key: 'telefone',
      label: 'Telefone',
      render: (value: any) => formatPhone(value),
      hideOnMobile: true,
    },
    {
      key: 'email',
      label: 'Email',
      render: (value: any) => (
        <div className="max-w-xs truncate" title={value}>
          {value || 'N/A'}
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'cidade',
      label: 'Cidade/UF',
      render: (value: any, item: any) => `${value || 'N/A'} / ${item.estado || 'N/A'}`,
      hideOnMobile: true,
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (value: any) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
  ];

  const actions = [
    ...(onEdit ? [{ label: 'Editar', icon: Edit, onClick: onEdit }] : []),
    ...(onDelete ? [{ label: 'Excluir', icon: Trash2, onClick: onDelete, variant: 'destructive' as const }] : []),
  ];

  return (
    <ResponsiveTable
      data={data}
      columns={columns}
      actions={actions}
      loading={loading}
      emptyMessage="Nenhum cliente encontrado"
    />
  );
}

// Componente específico para tabelas de Colaboradores
export function ColaboradoresResponsiveTable({
  data,
  onEdit,
  onDelete,
  loading = false,
}: {
  data: any[];
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  loading?: boolean;
}) {
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return 'N/A';
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
  };

  const columns = [
    {
      key: 'nome',
      label: 'Nome',
      className: 'font-medium',
    },
    {
      key: 'cargo',
      label: 'Cargo',
      render: (value: any) => value || 'N/A',
      hideOnMobile: true,
    },
    {
      key: 'telefone',
      label: 'Telefone',
      render: (value: any) => formatPhone(value),
      hideOnMobile: true,
    },
    {
      key: 'salario',
      label: 'Salário',
      render: (value: any) => formatCurrency(value),
      hideOnMobile: true,
    },
    {
      key: 'meta_hora',
      label: 'Meta (h)',
      render: (value: any) => {
        const formatHoursToTime = (hours: number): string => {
          if (!hours || hours === 0) return '00:00:00';
          const totalMinutes = Math.round(hours * 60);
          const h = Math.floor(totalMinutes / 60);
          const m = Math.floor((totalMinutes % 60));
          const s = Math.floor(((totalMinutes % 60) - m) * 60);
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };
        return formatHoursToTime(value || 0);
      },
      hideOnMobile: true,
    },
    {
      key: 'horas_trabalhadas',
      label: 'Horas Trabalhadas',
      render: (value: any) => {
        const formatHoursToTime = (hours: number): string => {
          if (!hours || hours === 0) return '00:00:00';
          const totalMinutes = Math.round(hours * 60);
          const h = Math.floor(totalMinutes / 60);
          const m = Math.floor((totalMinutes % 60));
          const s = Math.floor(((totalMinutes % 60) - m) * 60);
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };
        return formatHoursToTime(value || 0);
      },
      hideOnMobile: true,
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (value: any) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
  ];

  const actions = [
    ...(onEdit ? [{ label: 'Editar', icon: Edit, onClick: onEdit }] : []),
    ...(onDelete ? [{ label: 'Excluir', icon: Trash2, onClick: onDelete, variant: 'destructive' as const }] : []),
  ];

  return (
    <ResponsiveTable
      data={data}
      columns={columns}
      actions={actions}
      loading={loading}
      emptyMessage="Nenhum colaborador encontrado"
    />
  );
}

// Componente específico para tabelas de OS
export function OSResponsiveTable({
  data,
  onEdit,
  onDelete,
  onStart,
  onPause,
  onPauseColaborador,
  onFinish,
  onFinishColaborador,
  onAssociateColaboradores,
  onParadaMaterial,
  onPararColaborador,
  onRemoveColaborador,
  onRestartColaborador,
  onStartColaborador,
  loading = false,
  // Novos controles opcionais no cabeçalho
  statusFilterValue,
  onChangeStatusFilter,
  dateSort,
  onChangeDateSort,
}: {
  data: any[];
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onStart?: (item: any) => void;
  onPause?: (item: any) => void;
  onPauseColaborador?: (item: any) => void;
  onFinish?: (item: any) => void;
  onFinishColaborador?: (item: any) => void;
  onAssociateColaboradores?: (item: any) => void;
  onParadaMaterial?: (item: any) => void;
  onPararColaborador?: (item: any) => void;
  onRemoveColaborador?: (os: any, colaboracao: any) => void;
  onRestartColaborador?: (os: any, colaboracao: any) => void;
  onStartColaborador?: (os: any, colaboracao: any) => void;
  loading?: boolean;
  statusFilterValue?: string;
  onChangeStatusFilter?: (value: string) => void;
  dateSort?: 'asc' | 'desc' | '';
  onChangeDateSort?: (value: 'asc' | 'desc' | '') => void;
}) {
  // Força re-render a cada minuto para atualizar tempos exibidos nos hovers
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

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
      case 'em_andamento_parcial':
        return 'status-em-andamento';
      case 'finalizada':
        return 'status-finalizada';
      case 'cancelada':
        return 'status-cancelada';
      case 'pausada':
        return 'status-pausada';
      case 'falta_material':
        return 'status-falta-material';
      case 'em_cliente':
        return 'status-em-cliente';
      default:
        return 'status-aberta';
    }
  };

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const getColaboradorElapsed = (os: any, colaborador: any): { tipo: string | null; duracao: string | null } => {
    if (!Array.isArray(os?.os_tempo)) return { tipo: null, duracao: null };
    const now = Date.now();
    // Procura registro ativo para este colaborador (sem data_fim)
    const ativo = os.os_tempo.find((t:any) => !t?.data_fim && t?.colaborador?.nome === colaborador?.colaborador?.nome);
    if (!ativo || !ativo?.data_inicio) return { tipo: null, duracao: null };
    const inicio = new Date(ativo.data_inicio).getTime();
    const duracao = formatDuration(now - inicio);
    return { tipo: ativo.tipo || 'trabalho', duracao };
  };

  const renderColaboradoresCell = (value: any, item: any) => {
    const colabs: any[] = Array.isArray(value) ? value : [];
    const assoc: { c: any; produtoNome: string | null; status: string }[] = [];
    colabs.forEach((c: any) => {
      const produtosDoColab = Array.isArray(item.os_colaboradores_produtos)
        ? item.os_colaboradores_produtos
            .filter((p:any) => p.colaborador_id === (c.colaborador_id || c.colaborador?.id))
            .map((p:any) => ({ 
              nome: p.produto_nome || p.produtos?.nome, 
              created_at: p.created_at,
              produto_id: p.produto_id  // CORREÇÃO: Incluir produto_id
            }))
            .filter(p => p.nome)
        : [];
      if (produtosDoColab.length === 0) {
        assoc.push({ c, produtoNome: null, status: c.status || '' });
      } else {
        produtosDoColab.forEach((p: any) => {
          // Calcular status específico para este produto
          const colaboradorId = c.colaborador_id || c.colaborador?.id;
          const produtoId = p.produto_id;
          const colaboradorNome = c.colaborador?.nome;
          
          // Seleciona tempos do colaborador por id; quando houver produto_id nos tempos, usar correspondência pelo produto também
          let tempoColaborador = (item.os_tempo || []).filter((t: any) => {
            const sameColab = (t.colaborador_id || t.colaborador?.id) === colaboradorId || t.colaborador?.nome === colaboradorNome;
            if (!sameColab) return false;
            // Se o tempo tem produto_id, respeitar filtro por produto; se não tiver, considerar para fallback/histórico
            if (typeof t.produto_id !== 'undefined' && t.produto_id !== null) {
              return t.produto_id === produtoId;
            }
            return true;
          });
          
          let statusProduto = '';
          
          if (tempoColaborador.length > 0) {
            const temPausaAtiva = tempoColaborador.some((t: any) => 
              t.tipo === 'pausa' && !t.data_fim
            );
            const temParadaAtiva = tempoColaborador.some((t: any) => 
              t.tipo === 'parada_material' && !t.data_fim
            );
            const temTrabalhoAtivo = tempoColaborador.some((t: any) => 
              t.tipo === 'trabalho' && !t.data_fim
            );
            
            if (temPausaAtiva) {
              statusProduto = 'pausado';
            } else if (temParadaAtiva) {
              statusProduto = 'parado';
            } else if (temTrabalhoAtivo) {
              statusProduto = 'iniciado';
            } else {
              // Se há histórico de tempo mas não há ativos, verificar se este produto específico foi trabalhado
              const dataApontamentoProduto = new Date(p.created_at).getTime();
              const tempoAposApontamento = tempoColaborador.filter((t: any) => {
                const dataInicioTempo = new Date(t.data_inicio).getTime();
                // Se o tempo possui produto_id, usar match por produto; senão, considerar datas após o apontamento como indício
                if (typeof t.produto_id !== 'undefined' && t.produto_id !== null) {
                  return t.produto_id === produtoId && dataInicioTempo >= dataApontamentoProduto;
                }
                return dataInicioTempo >= dataApontamentoProduto;
              });

              if (tempoAposApontamento.length > 0) {
                // Há tempo registrado após o apontamento deste produto: "finalizado"
                statusProduto = 'finalizado';
              } else {
                // Não há tempo registrado após o apontamento: "apontado"
                statusProduto = 'apontado';
              }
            }
          } else {
            // Sem histórico de tempo: "apontado"
            statusProduto = 'apontado';
          }
          
          assoc.push({ c, produtoNome: p.nome, status: statusProduto, produtoId: p.produto_id });
        });
      }
    });
    // Ordenar por produto e depois por nome, para "juntar" colaboradores do mesmo produto
    assoc.sort((a, b) => {
      const pa = (a.produtoNome || '').localeCompare(b.produtoNome || '');
      if (pa !== 0) return pa;
      const na = (a.c?.colaborador?.nome || '').localeCompare(b.c?.colaborador?.nome || '');
      return na;
    });

    return (
      <div className="flex flex-wrap gap-1">
        {assoc.map(({ c, produtoNome, status, produtoId }, index: number) => {
          const emTrabalho = Array.isArray(item.os_tempo)
            ? item.os_tempo.some((t:any) => {
                const sameColab = (t.colaborador_id || t.colaborador?.id) === (c.colaborador_id || c.colaborador?.id) || t?.colaborador?.nome === c?.colaborador?.nome;
                if (!sameColab) return false;
                const sameProduto = typeof t.produto_id === 'undefined' || t.produto_id === null || (typeof produtoId !== 'undefined' && t.produto_id === produtoId);
                return t?.tipo === 'trabalho' && !t?.data_fim && sameProduto;
              })
            : false;
          const produtosDoColab = Array.isArray(item.os_colaboradores_produtos)
            ? item.os_colaboradores_produtos
                .filter((p:any) => p.colaborador_id === (c.colaborador_id || c.colaborador?.id))
                .map((p:any) => p.produto_nome || p.produtos?.nome)
                .filter(Boolean)
            : [];
          const produtosTitulo = produtosDoColab && produtosDoColab.length > 0 ? produtosDoColab.join(', ') : undefined;
          const showStatus = status === 'pausado' || status === 'parado' || status === 'finalizado' || status === 'apontado' || status === 'iniciado';
          return (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={`text-xs ${emTrabalho ? 'text-primary font-semibold' : ''}`}
                        title={produtosTitulo}
                      >
                        {c.colaborador?.nome}
                      </Badge>
                      {emTrabalho && (
                        <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden="true"></span>
                      )}
                      {produtoNome && (
                        <Badge variant="secondary" className="text-xs" title={produtoNome}>
                          {produtoNome}
                        </Badge>
                      )}
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <div className="text-sm">
                      <div className="font-medium mb-1">{c.colaborador?.nome}</div>
                      {(() => {
                        const info = getColaboradorElapsed(item, c);
                        if (info && info.duracao) {
                          const label = info.tipo === 'pausa' ? 'Em pausa há' : info.tipo === 'parada_material' ? 'Em parada há' : 'Em trabalho há';
                          return (
                            <div className="mb-1"><span className="text-muted-foreground">{label}:</span> {info.duracao}</div>
                          );
                        }
                        return null;
                      })()}
                      {produtosDoColab && produtosDoColab.length > 0 && (
                        <div className="mb-1">
                          <div className="text-muted-foreground">Produtos/Serviços:</div>
                          <ul className="list-disc list-inside">
                            {produtosDoColab.map((p: string, i: number) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {status && (
                        <div>
                          <span className="text-muted-foreground">Status:</span> {status}
                        </div>
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
                {/* Sem indicador global de "em trabalho" para evitar ambiguidade entre produtos */}
                <>
                    {(status === 'pausado' || status === 'parado' || status === 'finalizado') && (
                      <button
                        type="button"
                        aria-label="Reiniciar colaborador"
                        className={`inline-flex h-5 w-5 items-center justify-center rounded border transition border-border text-muted-foreground hover:text-green-600 hover:border-green-600`}
                        title={status === 'finalizado' ? 'Reiniciar colaborador finalizado' : 'Reiniciar colaborador'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestartColaborador?.(item, c);
                        }}
                      >
                        <Play className="h-3 w-3" />
                      </button>
                    )}
                    {status === 'apontado' && (
                      <button
                        type="button"
                        aria-label="Iniciar colaborador"
                        className={`inline-flex h-5 w-5 items-center justify-center rounded border transition border-border text-muted-foreground hover:text-green-600 hover:border-green-600`}
                        title={'Iniciar colaborador'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartColaborador?.(item, { ...c, produto_id: produtoId });
                        }}
                      >
                        <Play className="h-3 w-3" />
                      </button>
                    )}
                </>
                <button
                  type="button"
                  aria-label="Remover colaborador"
                  className={`inline-flex h-5 w-5 items-center justify-center rounded border transition border-border text-muted-foreground hover:text-destructive hover:border-destructive`}
                  title={'Remover colaborador'}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (onRemoveColaborador) {
                      onRemoveColaborador(item, c);
                      return;
                    }
                    const proceed = window.confirm('Remover este colaborador da OS?');
                    if (!proceed) return;
                    const id = (c && (c.id)) as string | undefined;
                    const colaboradorId = (c && (c.colaborador_id)) as string | undefined;
                    const osId = (item && (item.id)) as string | undefined;
                    try {
                      if (id) {
                        await supabase.from('os_colaboradores').delete().eq('id', id);
                      }
                      if (osId && colaboradorId) {
                        await supabase
                          .from('os_colaboradores_produtos')
                          .delete()
                          .eq('os_id', osId)
                          .eq('colaborador_id', colaboradorId);
                      }
                      window.location.reload();
                    } catch (err) {
                      console.error('Erro ao remover colaborador:', err);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              {/* Exibir badge de status abaixo (Pausado/Parado/Finalizado) */}
              {showStatus && (
                <div className="text-xs">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${
                      status === 'pausado' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                      status === 'parado' ? 'bg-red-100 text-red-800 border-red-300' :
                      status === 'finalizado' ? 'bg-gray-200 text-gray-800 border-gray-300' :
                      status === 'apontado' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                      status === 'iniciado' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      'bg-gray-100 text-gray-800 border-gray-300'
                    }`}
                  >
                    {status === 'pausado' ? 'Pausado' : status === 'parado' ? 'Parado' : status === 'finalizado' ? 'Finalizado' : status === 'apontado' ? 'Apontado' : 'Iniciado'}
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const columns = [
    {
      key: 'numero_os',
      label: 'OS',
      className: 'font-medium',
    },
    {
      key: 'fabrica',
      label: 'Fábrica',
      hideOnMobile: true,
    },
    {
      key: 'clientes',
      label: 'Cliente',
      render: (value: any) => value?.nome || 'N/A',
    },
    {
      key: 'descricao',
      label: 'Descrição',
      render: (value: any) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'status',
      label: (
        <div className="flex items-center gap-2">
          <span>Status</span>
          {onChangeStatusFilter && (
            <select
              aria-label="Filtrar por status"
              value={statusFilterValue ?? ''}
              onChange={(e) => onChangeStatusFilter?.(e.target.value)}
              className="ml-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="aberta">Aberta</option>
              <option value="em_andamento">Em andamento</option>
              <option value="finalizada">Finalizada</option>
              <option value="cancelada">Cancelada</option>
              <option value="pausada">Pausada</option>
              <option value="falta_material">Falta de material</option>
              <option value="em_cliente">Em cliente</option>
            </select>
          )}
        </div>
      ),
      render: (_: any, item: any) => {
        const statusValue = item.status;
        const ativos = Array.isArray(item.os_tempo)
          ? item.os_tempo.filter((t: any) => t?.tipo === 'trabalho' && !t?.data_fim)
          : [];
        const trabalhoAtivoCount = ativos.length;
        const nomesAtivos = ativos.map((t:any) => t?.colaborador?.nome).filter(Boolean);
        const totalColabs = Array.isArray(item.os_colaboradores) ? item.os_colaboradores.length : 0;
        const textoBase = statusValue === 'em_andamento_parcial'
          ? 'Em Andamento Parcial'
          : String(statusValue || '')
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (l: string) => l.toUpperCase());
        const texto = (statusValue === 'em_andamento_parcial' || statusValue === 'em_andamento') && totalColabs > 0
          ? `${textoBase} (${Math.min(trabalhoAtivoCount, totalColabs)}/${totalColabs})`
          : textoBase;
        const title = trabalhoAtivoCount > 0
          ? `${trabalhoAtivoCount} colaborador(es) em trabalho: ${nomesAtivos.join(', ')}`
          : undefined;
        return (
          <Badge className={getStatusClass(statusValue)} title={title}>
            {texto}
          </Badge>
        );
      },
    },
    {
      key: 'valor_total',
      label: 'Valor',
      render: (value: any) => formatCurrency(value),
      hideOnMobile: true,
    },
    {
      key: 'desconto_valor',
      label: 'Desconto',
      render: (value: any, item: any) => {
        if (!value || value <= 0) return '-';
        const percCalculado = item.valor_total > 0
          ? ((value / item.valor_total) * 100)
          : 0;
        return (
          <div className="text-right">
            <div className="text-sm font-medium">
              {item.desconto_tipo === 'percentual'
                ? `${percCalculado.toFixed(2)}%`
                : formatCurrency(value)}
            </div>
          </div>
        );
      },
      hideOnMobile: true,
    },
    {
      key: 'valor_total_com_desconto',
      label: 'Total c/ desconto',
      render: (value: any, item: any) => formatCurrency(value || item.valor_total),
      hideOnMobile: true,
    },
    {
      key: 'data_abertura',
      label: (
        <div className="flex items-center gap-2">
          <span>Data</span>
          {onChangeDateSort && (
            <button
              type="button"
              aria-label="Ordenar por data"
              className="rounded border border-border px-1 py-0.5 text-xs hover:bg-muted"
              onClick={() => {
                const next = dateSort === 'asc' ? 'desc' : dateSort === 'desc' ? '' : 'asc';
                onChangeDateSort?.(next);
              }}
              title={
                dateSort === 'asc'
                  ? 'Ordenação: Crescente (clique para Decrescente)'
                  : dateSort === 'desc'
                  ? 'Ordenação: Decrescente (clique para Remover)'
                  : 'Sem ordenação (clique para Crescente)'
              }
            >
              {dateSort === 'asc' ? '▲' : dateSort === 'desc' ? '▼' : '⇅'}
            </button>
          )}
        </div>
      ),
      render: (value: any) => formatDate(value),
      hideOnMobile: true,
    },
    {
      key: 'os_colaboradores',
      label: 'Colaboradores',
      render: (value: any, item: any) => renderColaboradoresCell(value, item),
      hideOnMobile: true,
    },
  ];

  const getActionsForOS = (os: any) => {
    const actions = [];
    
    // Ações baseadas no status da OS
    if (os.status === 'aberta') {
      if (onAssociateColaboradores) {
        actions.push({ 
          label: 'Apontar Colaboradores', 
          icon: UserPlus, 
          onClick: () => onAssociateColaboradores(os) 
        });
      }
      if (onStart) {
        const hasColaboradores = Array.isArray(os.os_colaboradores) && os.os_colaboradores.length > 0;
        actions.push({ 
          label: 'Iniciar OS', 
          icon: Play, 
          onClick: () => onStart(os),
          disabled: !hasColaboradores,
        });
      }
    }
    
    if (os.status === 'em_andamento' || os.status === 'em_andamento_parcial') {
      // Permitir adicionar/associar colaboradores mesmo com OS em andamento
      if (onAssociateColaboradores) {
        actions.push({ 
          label: 'Apontar Colaboradores', 
          icon: UserPlus, 
          onClick: () => onAssociateColaboradores(os) 
        });
      }
      if (onPause) {
        actions.push({ 
          label: 'Pausar OS Completa', 
          icon: Pause, 
          onClick: () => onPause(os) 
        });
      }
      const hasAnyColab = Array.isArray(os.os_colaboradores) && os.os_colaboradores.length > 0;
      if (hasAnyColab && onPauseColaborador) {
        actions.push({ 
          label: 'Pausar Colaborador', 
          icon: Pause, 
          onClick: () => onPauseColaborador(os) 
        });
      }
      if (onParadaMaterial) {
        actions.push({ 
          label: 'Parar OS Completa', 
          icon: StopCircle, 
          onClick: () => onParadaMaterial(os),
          variant: 'destructive' as const
        });
      }
      if (hasAnyColab && onPararColaborador) {
        actions.push({ 
          label: 'Parar Colaborador', 
          icon: StopCircle, 
          onClick: () => onPararColaborador(os),
          variant: 'destructive' as const
        });
      }
      if (onFinish) {
        actions.push({ 
          label: 'Finalizar OS Completa', 
          icon: CheckCircle, 
          onClick: () => onFinish(os) 
        });
      }
      const hasAnyColab2 = Array.isArray(os.os_colaboradores) && os.os_colaboradores.length > 0;
      if (hasAnyColab2 && onFinishColaborador) {
        actions.push({ 
          label: 'Finalizar Colaborador', 
          icon: CheckCircle, 
          onClick: () => onFinishColaborador(os) 
        });
      }
    }
    
    if (os.status === 'pausada') {
      if (onStart) {
        actions.push({ 
          label: 'Reiniciar OS', 
          icon: Play, 
          onClick: () => onStart(os) 
        });
      }
      if (onFinish) {
        actions.push({ 
          label: 'Finalizar OS Completa', 
          icon: CheckCircle, 
          onClick: () => onFinish(os) 
        });
      }
    }
    
    // Ações sempre disponíveis
    if (onEdit) {
      actions.push({ 
        label: 'Editar', 
        icon: Edit, 
        onClick: () => onEdit(os) 
      });
    }
    if (onDelete) {
      actions.push({ 
        label: 'Excluir', 
        icon: Trash2, 
        onClick: () => onDelete(os), 
        variant: 'destructive' as const 
      });
    }
    
    return actions;
  };

  return (
    <ResponsiveTable
      data={data}
      columns={columns}
      actions={getActionsForOS}
      loading={loading}
      emptyMessage="Nenhuma ordem de serviço encontrada"
    />
  );
}
