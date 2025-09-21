-- Script para limpar permissões duplicadas e manter apenas as essenciais
-- Data: 2025-01-21

-- 1. Primeiro, vamos limpar todas as permissões existentes
DELETE FROM public.nivel_permissoes;
DELETE FROM public.permissoes;

-- 2. Inserir apenas as permissões essenciais e únicas
INSERT INTO public.permissoes (nome, descricao, modulo, acao) VALUES
-- Módulo de Ordens de Serviço
('os_visualizar', 'Visualizar ordens de serviço', 'ordens_servico', 'read'),
('os_criar', 'Criar ordens de serviço', 'ordens_servico', 'create'),
('os_editar', 'Editar ordens de serviço', 'ordens_servico', 'update'),
('os_excluir', 'Excluir ordens de serviço', 'ordens_servico', 'delete'),
('os_gerenciar_tempo', 'Gerenciar tempo de execução', 'ordens_servico', 'manage_time'),

-- Módulo de Clientes
('cliente_visualizar', 'Visualizar clientes', 'clientes', 'read'),
('cliente_criar', 'Criar clientes', 'clientes', 'create'),
('cliente_editar', 'Editar clientes', 'clientes', 'update'),
('cliente_excluir', 'Excluir clientes', 'clientes', 'delete'),

-- Módulo de Colaboradores
('colaborador_visualizar', 'Visualizar colaboradores', 'colaboradores', 'read'),
('colaborador_criar', 'Criar colaboradores', 'colaboradores', 'create'),
('colaborador_editar', 'Editar colaboradores', 'colaboradores', 'update'),
('colaborador_excluir', 'Excluir colaboradores', 'colaboradores', 'delete'),

-- Módulo de Produtos
('produto_visualizar', 'Visualizar produtos', 'produtos', 'read'),
('produto_criar', 'Criar produtos', 'produtos', 'create'),
('produto_editar', 'Editar produtos', 'produtos', 'update'),
('produto_excluir', 'Excluir produtos', 'produtos', 'delete'),

-- Módulo de Relatórios
('relatorio_visualizar', 'Visualizar relatórios', 'relatorios', 'read'),
('relatorio_exportar', 'Exportar relatórios', 'relatorios', 'export'),
('relatorio_imprimir', 'Imprimir relatórios', 'relatorios', 'print'),

-- Módulo de Configurações
('config_visualizar', 'Visualizar configurações', 'configuracoes', 'read'),
('config_editar', 'Editar configurações', 'configuracoes', 'update'),

-- Módulo de Usuários
('usuario_gerenciar', 'Gerenciar usuários', 'usuarios', 'manage'),

-- Módulo de Auditoria
('auditoria_visualizar', 'Visualizar auditoria', 'auditoria', 'read');

-- 3. Associar permissões aos níveis de acesso

-- ADMINISTRADOR: Todas as permissões
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'Administrador'
ON CONFLICT (nivel_id, permissao_id) DO NOTHING;

-- GERENTE: Quase todas, exceto gerenciar usuários
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'Gerente' 
AND p.nome != 'usuario_gerenciar'
ON CONFLICT (nivel_id, permissao_id) DO NOTHING;

-- COLABORADOR: Apenas visualização e gerenciamento de tempo próprio
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'Colaborador' 
AND p.nome IN (
    'os_visualizar', 'os_gerenciar_tempo',
    'cliente_visualizar', 'colaborador_visualizar', 'produto_visualizar',
    'relatorio_visualizar'
)
ON CONFLICT (nivel_id, permissao_id) DO NOTHING;

-- 4. Atualizar estatísticas
ANALYZE public.permissoes;
ANALYZE public.nivel_permissoes;

-- 5. Verificar resultado - permissões por módulo
SELECT 
    p.modulo,
    COUNT(p.id) as total_permissoes,
    STRING_AGG(p.nome, ', ' ORDER BY p.nome) as permissoes
FROM public.permissoes p
GROUP BY p.modulo
ORDER BY p.modulo;

-- 6. Verificar permissões por nível
SELECT 
    n.nome as nivel,
    COUNT(np.permissao_id) as total_permissoes,
    STRING_AGG(p.nome, ', ' ORDER BY p.nome) as permissoes
FROM public.niveis_acesso n
LEFT JOIN public.nivel_permissoes np ON n.id = np.nivel_id
LEFT JOIN public.permissoes p ON np.permissao_id = p.id
GROUP BY n.id, n.nome
ORDER BY n.nome;

-- ✅ PERMISSÕES LIMPAS E ORGANIZADAS
