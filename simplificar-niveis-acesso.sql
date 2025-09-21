-- Script para simplificar níveis de acesso
-- Manter apenas: Administrador, Colaborador e Gerente
-- Data: 2025-01-21

-- 1. Primeiro, vamos limpar as permissões dos níveis existentes
DELETE FROM public.nivel_permissoes;

-- 2. Atualizar usuários para usar um nível temporário antes de deletar os níveis antigos
UPDATE public.admins 
SET nivel_id = NULL
WHERE nivel_id IS NOT NULL;

-- 3. Agora podemos deletar os níveis antigos
DELETE FROM public.niveis_acesso;

-- 4. Inserir apenas os 3 níveis essenciais
INSERT INTO public.niveis_acesso (nome, descricao, ativo) VALUES
('Administrador', 'Acesso total ao sistema - pode gerenciar tudo', true),
('Gerente', 'Acesso gerencial com algumas limitações - não pode gerenciar usuários', true),
('Colaborador', 'Acesso básico para operações do dia a dia - apenas visualização e gerenciamento de tempo próprio', true);

-- 5. Verificar se todas as permissões existem, se não, criar
INSERT INTO public.permissoes (nome, descricao, modulo, acao) VALUES
-- Módulo de OS
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
('usuario_gerenciar', 'Gerenciar usuários', 'usuarios', 'manage'),
('auditoria_visualizar', 'Visualizar auditoria', 'auditoria', 'read')
ON CONFLICT (nome) DO NOTHING;

-- 6. Associar permissões aos níveis

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

-- 7. Atualizar usuários existentes para usar os novos níveis
-- Primeiro, definir um nível padrão para usuários sem nível
UPDATE public.admins 
SET nivel_id = (
    SELECT id FROM public.niveis_acesso 
    WHERE nome = 'Colaborador'
)
WHERE nivel_id IS NULL;

-- Mapear níveis antigos para novos (se ainda existirem)
UPDATE public.admins 
SET nivel_id = (
    SELECT id FROM public.niveis_acesso 
    WHERE nome = 'Administrador'
)
WHERE nivel_id IN (
    SELECT id FROM public.niveis_acesso 
    WHERE nome IN ('admin', 'Administrador')
);

UPDATE public.admins 
SET nivel_id = (
    SELECT id FROM public.niveis_acesso 
    WHERE nome = 'Gerente'
)
WHERE nivel_id IN (
    SELECT id FROM public.niveis_acesso 
    WHERE nome IN ('gerente', 'Gerente', 'supervisor', 'Supervisor')
);

UPDATE public.admins 
SET nivel_id = (
    SELECT id FROM public.niveis_acesso 
    WHERE nome = 'Colaborador'
)
WHERE nivel_id IN (
    SELECT id FROM public.niveis_acesso 
    WHERE nome IN ('colaborador', 'Colaborador', 'visualizador', 'Visualizador')
);

-- 8. Atualizar estatísticas
ANALYZE public.niveis_acesso;
ANALYZE public.permissoes;
ANALYZE public.nivel_permissoes;

-- 9. Verificar resultado
SELECT 
    n.nome as nivel,
    n.descricao,
    COUNT(np.permissao_id) as total_permissoes
FROM public.niveis_acesso n
LEFT JOIN public.nivel_permissoes np ON n.id = np.nivel_id
GROUP BY n.id, n.nome, n.descricao
ORDER BY n.nome;

-- ✅ SISTEMA SIMPLIFICADO COM 3 NÍVEIS DE ACESSO
