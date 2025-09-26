import {
  ClipboardList,
  Users,
  Package,
  UserCheck,
  BarChart3,
  Settings,
} from 'lucide-react';

export type AppModule = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string | null;
  description?: string;
  external?: boolean;
};

export const mainModules: AppModule[] = [
  {
    title: 'Dashboard',
    url: '/',
    icon: BarChart3,
    permission: null,
    description: 'Visão geral de OS, horas, metas e produtividade.',
  },
  {
    title: 'Ordens de Serviço',
    url: '/ordens-servico',
    icon: ClipboardList,
    permission: 'os_visualizar',
    description: 'Cadastro/edição, controle de tempo, status e vínculos.',
  },
  {
    title: 'Clientes',
    url: '/clientes',
    icon: Users,
    permission: 'cliente_visualizar',
    description: 'Cadastro com validação de CPF/CNPJ, filtros e exportação.',
  },
  {
    title: 'Colaboradores',
    url: '/colaboradores',
    icon: UserCheck,
    permission: 'colaborador_visualizar',
    description: 'Cadastro, metas de horas e produtividade individual.',
  },
  {
    title: 'Produtos',
    url: '/produtos',
    icon: Package,
    permission: 'produto_visualizar',
    description: 'Cadastro com preço, estoque e percentual global.',
  },
  {
    title: 'Relatórios',
    url: '/relatorios',
    icon: BarChart3,
    permission: 'relatorio_visualizar',
    description: 'Produtividade, tempo real vs previsto, status de OS.',
  },
];

export const adminModules: AppModule[] = [
  {
    title: 'Configurações',
    url: '/configuracoes',
    icon: Settings,
    permission: 'config_visualizar',
    description:
      'Parâmetros, usuários, permissões, níveis de acesso e auditoria.',
  },
  {
    title: 'Ajuda',
    url: '/ajuda',
    icon: BarChart3,
    permission: 'config_visualizar',
    description: 'Central de Ajuda integrada ao sistema.',
  },
];


