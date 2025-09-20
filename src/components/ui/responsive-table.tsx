import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
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
    label: string;
    render?: (value: any, item: any) => React.ReactNode;
    className?: string;
    hideOnMobile?: boolean;
  }[];
  actions?: {
    label: string;
    icon: React.ComponentType<any>;
    onClick: (item: any) => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  }[];
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
                    {actions.length > 0 && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {actions.map((action, actionIndex) => (
                              <DropdownMenuItem
                                key={actionIndex}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  action.onClick(item);
                                }}
                                className={action.variant === 'destructive' ? 'text-destructive' : ''}
                              >
                                <action.icon className="mr-2 h-4 w-4" />
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
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
                {actions.length > 0 && (
                  <div className="flex gap-2 pt-2 border-t">
                    {actions.map((action, actionIndex) => (
                      <Button
                        key={actionIndex}
                        variant={action.variant || 'outline'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick(item);
                        }}
                        className="flex-1"
                      >
                        <action.icon className="mr-2 h-4 w-4" />
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
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
      render: (value: any) => `${value || 0}h`,
      hideOnMobile: true,
    },
    {
      key: 'horas_trabalhadas',
      label: 'Horas Trabalhadas',
      render: (value: any) => `${value || 0}h`,
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
  onFinish,
  onAssociateColaboradores,
  onParadaMaterial,
  loading = false,
}: {
  data: any[];
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onStart?: (item: any) => void;
  onPause?: (item: any) => void;
  onFinish?: (item: any) => void;
  onAssociateColaboradores?: (item: any) => void;
  onParadaMaterial?: (item: any) => void;
  loading?: boolean;
}) {
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

  const getStatusVariant = (
    status: string | null
  ): 'secondary' | 'default' | 'destructive' | 'outline' => {
    switch (status) {
      case 'aberta':
        return 'secondary';
      case 'em_andamento':
        return 'default';
      case 'finalizada':
        return 'default';
      case 'cancelada':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const columns = [
    {
      key: 'numero_os',
      label: 'OS',
      className: 'font-medium',
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
      label: 'Status',
      render: (value: any) => (
        <Badge variant={getStatusVariant(value)}>
          {value?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
        </Badge>
      ),
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
      label: 'Data',
      render: (value: any) => formatDate(value),
      hideOnMobile: true,
    },
    {
      key: 'os_colaboradores',
      label: 'Colaboradores',
      render: (value: any) => (
        <div className="flex flex-wrap gap-1">
          {value?.map((c: any, index: number) => (
            <Badge key={index} variant="outline" className="text-xs">
              {c.colaborador?.nome}
            </Badge>
          ))}
        </div>
      ),
      hideOnMobile: true,
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
      emptyMessage="Nenhuma ordem de serviço encontrada"
    />
  );
}
