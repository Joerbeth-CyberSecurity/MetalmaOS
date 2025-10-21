-- Script para reorganizar permissões e níveis de usuário
-- Data: 2025-01-21

-- Primeiro, vamos limpar as permissões existentes para reorganizar
DELETE FROM public.nivel_permissoes;
DELETE FROM public.permissoes;

-- Inserir permissões organizadas por módulo
INSERT INTO public.permissoes (nome, descricao, modulo, acao) VALUES
-- MÓDULO DASHBOARD
('dashboard_visualizar', 'Acesso ao Dashboard principal', 'dashboard', 'visualizar'),
('dashboard_avancado', 'Acesso ao Dashboard avançado', 'dashboard', 'avancado'),
('dashboard_visao_geral', 'Acesso à visão geral do Dashboard', 'dashboard', 'visao_geral'),

-- MÓDULO ORDENS DE SERVIÇO
('os_visualizar', 'Visualizar ordens de serviço', 'ordens_servico', 'visualizar'),
('os_criar', 'Criar novas ordens de serviço', 'ordens_servico', 'criar'),
('os_editar', 'Editar ordens de serviço', 'ordens_servico', 'editar'),
('os_excluir', 'Excluir ordens de serviço', 'ordens_servico', 'excluir'),
('os_finalizar', 'Finalizar ordens de serviço', 'ordens_servico', 'finalizar'),
('os_pausar', 'Pausar ordens de serviço', 'ordens_servico', 'pausar'),
('os_reiniciar', 'Reiniciar ordens de serviço', 'ordens_servico', 'reiniciar'),
('os_gerenciar_tempo', 'Gerenciar tempo de execução', 'ordens_servico', 'gerenciar_tempo'),
('os_ajustar_horas', 'Ajustar horas de colaboradores', 'ordens_servico', 'ajustar_horas'),

-- MÓDULO CLIENTES
('cliente_visualizar', 'Visualizar clientes', 'clientes', 'visualizar'),
('cliente_criar', 'Criar novos clientes', 'clientes', 'criar'),
('cliente_editar', 'Editar clientes', 'clientes', 'editar'),
('cliente_excluir', 'Excluir clientes', 'clientes', 'excluir'),
('cliente_exportar', 'Exportar lista de clientes', 'clientes', 'exportar'),

-- MÓDULO COLABORADORES
('colaborador_visualizar', 'Visualizar colaboradores', 'colaboradores', 'visualizar'),
('colaborador_criar', 'Criar novos colaboradores', 'colaboradores', 'criar'),
('colaborador_editar', 'Editar colaboradores', 'colaboradores', 'editar'),
('colaborador_excluir', 'Excluir colaboradores', 'colaboradores', 'excluir'),
('colaborador_gerenciar_metas', 'Gerenciar metas de colaboradores', 'colaboradores', 'gerenciar_metas'),

-- MÓDULO PRODUTOS
('produto_visualizar', 'Visualizar produtos', 'produtos', 'visualizar'),
('produto_criar', 'Criar novos produtos', 'produtos', 'criar'),
('produto_editar', 'Editar produtos', 'produtos', 'editar'),
('produto_excluir', 'Excluir produtos', 'produtos', 'excluir'),
('produto_gerenciar_estoque', 'Gerenciar estoque de produtos', 'produtos', 'gerenciar_estoque'),

-- MÓDULO RELATÓRIOS
('relatorio_visualizar', 'Visualizar relatórios', 'relatorios', 'visualizar'),
('relatorio_exportar', 'Exportar relatórios', 'relatorios', 'exportar'),
('relatorio_imprimir', 'Imprimir relatórios', 'relatorios', 'imprimir'),
('relatorio_produtividade', 'Acesso a relatórios de produtividade', 'relatorios', 'produtividade'),
('relatorio_atraso', 'Acesso a relatórios de atraso', 'relatorios', 'atraso'),

-- MÓDULO ORÇAMENTOS
('orcamento_visualizar', 'Visualizar orçamentos', 'orcamentos', 'visualizar'),
('orcamento_criar', 'Criar novos orçamentos', 'orcamentos', 'criar'),
('orcamento_editar', 'Editar orçamentos', 'orcamentos', 'editar'),
('orcamento_excluir', 'Excluir orçamentos', 'orcamentos', 'excluir'),
('orcamento_transformar_os', 'Transformar orçamento em OS', 'orcamentos', 'transformar_os'),
('orcamento_aplicar_desconto', 'Aplicar desconto em orçamentos', 'orcamentos', 'aplicar_desconto'),

-- MÓDULO CONFIGURAÇÕES
('config_visualizar', 'Visualizar configurações', 'configuracoes', 'visualizar'),
('config_editar', 'Editar configurações', 'configuracoes', 'editar'),
('config_usuarios', 'Gerenciar usuários', 'configuracoes', 'usuarios'),
('config_niveis', 'Gerenciar níveis de acesso', 'configuracoes', 'niveis'),
('config_auditoria', 'Visualizar auditoria', 'configuracoes', 'auditoria'),
('config_ajuste_os', 'Acesso ao ajuste de OS', 'configuracoes', 'ajuste_os'),

-- MÓDULO AJUDA
('ajuda_visualizar', 'Acesso à central de ajuda', 'ajuda', 'visualizar');

-- Atribuir permissões aos níveis existentes
-- Administrador: todas as permissões
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT 
    (SELECT id FROM public.niveis_acesso WHERE nome = 'Administrador'),
    id
FROM public.permissoes;

-- Gerente: todas exceto exclusões críticas e configurações avançadas
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT 
    (SELECT id FROM public.niveis_acesso WHERE nome = 'Gerente'),
    id
FROM public.permissoes
WHERE nome NOT IN (
    'os_excluir', 'cliente_excluir', 'colaborador_excluir', 'produto_excluir', 'orcamento_excluir',
    'config_usuarios', 'config_niveis'
);

-- Colaborador: operações básicas
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT 
    (SELECT id FROM public.niveis_acesso WHERE nome = 'Colaborador'),
    id
FROM public.permissoes
WHERE nome IN (
    'dashboard_visualizar', 'dashboard_visao_geral',
    'os_visualizar', 'os_criar', 'os_editar', 'os_gerenciar_tempo',
    'cliente_visualizar', 'cliente_criar', 'cliente_editar',
    'colaborador_visualizar',
    'produto_visualizar',
    'relatorio_visualizar', 'relatorio_exportar',
    'orcamento_visualizar', 'orcamento_criar', 'orcamento_editar',
    'ajuda_visualizar'
);

-- Visualizador: apenas visualização
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT 
    (SELECT id FROM public.niveis_acesso WHERE nome = 'Visualizador'),
    id
FROM public.permissoes
WHERE acao = 'visualizar';
