-- LIMPEZA FINAL - Apenas 20 permissões essenciais
-- Data: 2025-01-21

-- 1. Limpar completamente todas as permissões
DELETE FROM public.nivel_permissoes;
DELETE FROM public.permissoes;

-- 2. Inserir APENAS as 20 permissões essenciais (sem duplicatas)
INSERT INTO public.permissoes (nome, descricao, modulo, acao) VALUES
-- Ordens de Serviço (5)
('os_visualizar', 'Visualizar ordens de serviço', 'ordens_servico', 'read'),
('os_criar', 'Criar ordens de serviço', 'ordens_servico', 'create'),
('os_editar', 'Editar ordens de serviço', 'ordens_servico', 'update'),
('os_excluir', 'Excluir ordens de serviço', 'ordens_servico', 'delete'),
('os_gerenciar_tempo', 'Gerenciar tempo de execução', 'ordens_servico', 'manage_time'),

-- Clientes (4)
('cliente_visualizar', 'Visualizar clientes', 'clientes', 'read'),
('cliente_criar', 'Criar clientes', 'clientes', 'create'),
('cliente_editar', 'Editar clientes', 'clientes', 'update'),
('cliente_excluir', 'Excluir clientes', 'clientes', 'delete'),

-- Colaboradores (4)
('colaborador_visualizar', 'Visualizar colaboradores', 'colaboradores', 'read'),
('colaborador_criar', 'Criar colaboradores', 'colaboradores', 'create'),
('colaborador_editar', 'Editar colaboradores', 'colaboradores', 'update'),
('colaborador_excluir', 'Excluir colaboradores', 'colaboradores', 'delete'),

-- Produtos (4)
('produto_visualizar', 'Visualizar produtos', 'produtos', 'read'),
('produto_criar', 'Criar produtos', 'produtos', 'create'),
('produto_editar', 'Editar produtos', 'produtos', 'update'),
('produto_excluir', 'Excluir produtos', 'produtos', 'delete'),

-- Relatórios (3)
('relatorio_visualizar', 'Visualizar relatórios', 'relatorios', 'read'),
('relatorio_exportar', 'Exportar relatórios', 'relatorios', 'export'),
('relatorio_imprimir', 'Imprimir relatórios', 'relatorios', 'print'),

-- Configurações (2)
('config_visualizar', 'Visualizar configurações', 'configuracoes', 'read'),
('config_editar', 'Editar configurações', 'configuracoes', 'update'),

-- Usuários (1)
('usuario_gerenciar', 'Gerenciar usuários', 'usuarios', 'manage'),

-- Auditoria (1)
('auditoria_visualizar', 'Visualizar auditoria', 'auditoria', 'read');

-- 3. Associar permissões aos níveis (apenas as 20 essenciais)

-- ADMINISTRADOR: Todas as 20 permissões
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'Administrador';

-- GERENTE: 19 permissões (todas exceto gerenciar usuários)
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'Gerente' 
AND p.nome != 'usuario_gerenciar';

-- COLABORADOR: 6 permissões (apenas visualização e gerenciamento de tempo)
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'Colaborador' 
AND p.nome IN (
    'os_visualizar', 'os_gerenciar_tempo',
    'cliente_visualizar', 'colaborador_visualizar', 'produto_visualizar',
    'relatorio_visualizar'
);

-- 4. Atualizar estatísticas
ANALYZE public.permissoes;
ANALYZE public.nivel_permissoes;

-- 5. Verificar resultado final
SELECT 
    'RESULTADO FINAL - APENAS 20 PERMISSÕES ESSENCIAIS' as info;

-- 6. Contar permissões por nível
SELECT 
    n.nome as nivel,
    n.descricao,
    COUNT(np.permissao_id) as total_permissoes
FROM public.niveis_acesso n
LEFT JOIN public.nivel_permissoes np ON n.id = np.nivel_id
GROUP BY n.id, n.nome, n.descricao
ORDER BY n.nome;

-- 7. Listar todas as permissões organizadas por módulo
SELECT 
    'PERMISSÕES POR MÓDULO' as info,
    p.modulo,
    COUNT(*) as total,
    STRING_AGG(p.nome, ', ' ORDER BY p.acao) as permissoes
FROM public.permissoes p
GROUP BY p.modulo
ORDER BY p.modulo;

-- 8. Verificar se não há duplicatas
SELECT 
    'VERIFICAÇÃO DE DUPLICATAS' as info,
    COUNT(*) as total_permissoes,
    COUNT(DISTINCT nome) as nomes_unicos,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT nome) THEN '✅ SEM DUPLICATAS'
        ELSE '❌ HÁ DUPLICATAS'
    END as status
FROM public.permissoes;

-- ✅ SISTEMA FINAL: 3 NÍVEIS + 20 PERMISSÕES ÚNICAS
