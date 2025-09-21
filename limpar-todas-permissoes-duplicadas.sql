-- Script COMPLETO para limpar TODAS as permissões duplicadas
-- Manter apenas as permissões essenciais e únicas
-- Data: 2025-01-21

-- 1. Limpar completamente todas as permissões e níveis
DELETE FROM public.nivel_permissoes;
DELETE FROM public.permissoes;

-- 2. Recriar apenas os 3 níveis essenciais
DELETE FROM public.niveis_acesso;
INSERT INTO public.niveis_acesso (nome, descricao, ativo) VALUES
('Administrador', 'Acesso total ao sistema - pode gerenciar tudo', true),
('Gerente', 'Acesso gerencial com algumas limitações - não pode gerenciar usuários', true),
('Colaborador', 'Acesso básico para operações do dia a dia - apenas visualização e gerenciamento de tempo próprio', true);

-- 3. Inserir APENAS as permissões essenciais e únicas (sem duplicatas)
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

-- 4. Associar permissões aos níveis de forma clara e organizada

-- ADMINISTRADOR: Todas as permissões (20 permissões)
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'Administrador'
ORDER BY p.modulo, p.acao;

-- GERENTE: Quase todas, exceto gerenciar usuários (19 permissões)
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'Gerente' 
AND p.nome != 'usuario_gerenciar'
ORDER BY p.modulo, p.acao;

-- COLABORADOR: Apenas visualização e gerenciamento de tempo próprio (6 permissões)
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'Colaborador' 
AND p.nome IN (
    'os_visualizar', 'os_gerenciar_tempo',
    'cliente_visualizar', 'colaborador_visualizar', 'produto_visualizar',
    'relatorio_visualizar'
)
ORDER BY p.modulo, p.acao;

-- 5. Atualizar usuários para usar os novos níveis
UPDATE public.admins 
SET nivel_id = (
    SELECT id FROM public.niveis_acesso 
    WHERE nome = 'Colaborador'
)
WHERE nivel_id IS NULL;

-- Mapear usuários baseado no tipo_usuario existente
UPDATE public.admins 
SET nivel_id = (
    SELECT id FROM public.niveis_acesso 
    WHERE nome = 'Administrador'
)
WHERE tipo_usuario = 'admin';

UPDATE public.admins 
SET nivel_id = (
    SELECT id FROM public.niveis_acesso 
    WHERE nome = 'Gerente'
)
WHERE tipo_usuario IN ('gerente', 'supervisor');

UPDATE public.admins 
SET nivel_id = (
    SELECT id FROM public.niveis_acesso 
    WHERE nome = 'Colaborador'
)
WHERE tipo_usuario IN ('colaborador', 'visualizador');

-- 6. Atualizar estatísticas
ANALYZE public.niveis_acesso;
ANALYZE public.permissoes;
ANALYZE public.nivel_permissoes;

-- 7. Verificar resultado - permissões por módulo
SELECT 
    'PERMISSÕES POR MÓDULO' as info,
    p.modulo,
    COUNT(p.id) as total_permissoes,
    STRING_AGG(p.nome, ', ' ORDER BY p.nome) as permissoes
FROM public.permissoes p
GROUP BY p.modulo
ORDER BY p.modulo;

-- 8. Verificar permissões por nível
SELECT 
    'PERMISSÕES POR NÍVEL' as info,
    n.nome as nivel,
    COUNT(np.permissao_id) as total_permissoes,
    STRING_AGG(p.nome, ', ' ORDER BY p.modulo, p.acao) as permissoes
FROM public.niveis_acesso n
LEFT JOIN public.nivel_permissoes np ON n.id = np.nivel_id
LEFT JOIN public.permissoes p ON np.permissao_id = p.id
GROUP BY n.id, n.nome
ORDER BY n.nome;

-- 9. Verificar usuários e seus níveis
SELECT 
    'USUÁRIOS E NÍVEIS' as info,
    a.nome,
    a.email,
    a.tipo_usuario,
    n.nome as nivel_atual
FROM public.admins a
LEFT JOIN public.niveis_acesso n ON a.nivel_id = n.id
ORDER BY a.nome;

-- ✅ SISTEMA COMPLETAMENTE LIMPO E ORGANIZADO
