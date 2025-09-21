-- Script para verificar e limpar TODAS as duplicatas restantes
-- Data: 2025-01-21

-- 1. Verificar permissões duplicadas por nome
SELECT 
    'PERMISSÕES DUPLICADAS POR NOME' as info,
    nome,
    COUNT(*) as quantidade,
    STRING_AGG(id::text, ', ') as ids
FROM public.permissoes
GROUP BY nome
HAVING COUNT(*) > 1;

-- 2. Verificar permissões duplicadas por descrição
SELECT 
    'PERMISSÕES DUPLICADAS POR DESCRIÇÃO' as info,
    descricao,
    COUNT(*) as quantidade,
    STRING_AGG(nome, ', ') as nomes
FROM public.permissoes
WHERE descricao IS NOT NULL
GROUP BY descricao
HAVING COUNT(*) > 1;

-- 3. Verificar níveis duplicados
SELECT 
    'NÍVEIS DUPLICADOS' as info,
    nome,
    COUNT(*) as quantidade,
    STRING_AGG(id::text, ', ') as ids
FROM public.niveis_acesso
GROUP BY nome
HAVING COUNT(*) > 1;

-- 4. Se houver duplicatas, limpar completamente
-- (Execute apenas se houver duplicatas encontradas acima)

-- Limpar todas as permissões e recriar do zero
DELETE FROM public.nivel_permissoes;
DELETE FROM public.permissoes;

-- Inserir apenas as permissões essenciais (sem duplicatas)
INSERT INTO public.permissoes (nome, descricao, modulo, acao) VALUES
-- Ordens de Serviço
('os_visualizar', 'Visualizar ordens de serviço', 'ordens_servico', 'read'),
('os_criar', 'Criar ordens de serviço', 'ordens_servico', 'create'),
('os_editar', 'Editar ordens de serviço', 'ordens_servico', 'update'),
('os_excluir', 'Excluir ordens de serviço', 'ordens_servico', 'delete'),
('os_gerenciar_tempo', 'Gerenciar tempo de execução', 'ordens_servico', 'manage_time'),

-- Clientes
('cliente_visualizar', 'Visualizar clientes', 'clientes', 'read'),
('cliente_criar', 'Criar clientes', 'clientes', 'create'),
('cliente_editar', 'Editar clientes', 'clientes', 'update'),
('cliente_excluir', 'Excluir clientes', 'clientes', 'delete'),

-- Colaboradores
('colaborador_visualizar', 'Visualizar colaboradores', 'colaboradores', 'read'),
('colaborador_criar', 'Criar colaboradores', 'colaboradores', 'create'),
('colaborador_editar', 'Editar colaboradores', 'colaboradores', 'update'),
('colaborador_excluir', 'Excluir colaboradores', 'colaboradores', 'delete'),

-- Produtos
('produto_visualizar', 'Visualizar produtos', 'produtos', 'read'),
('produto_criar', 'Criar produtos', 'produtos', 'create'),
('produto_editar', 'Editar produtos', 'produtos', 'update'),
('produto_excluir', 'Excluir produtos', 'produtos', 'delete'),

-- Relatórios
('relatorio_visualizar', 'Visualizar relatórios', 'relatorios', 'read'),
('relatorio_exportar', 'Exportar relatórios', 'relatorios', 'export'),
('relatorio_imprimir', 'Imprimir relatórios', 'relatorios', 'print'),

-- Configurações
('config_visualizar', 'Visualizar configurações', 'configuracoes', 'read'),
('config_editar', 'Editar configurações', 'configuracoes', 'update'),

-- Usuários
('usuario_gerenciar', 'Gerenciar usuários', 'usuarios', 'manage'),

-- Auditoria
('auditoria_visualizar', 'Visualizar auditoria', 'auditoria', 'read');

-- 5. Reassociar permissões aos níveis
-- Administrador: todas as permissões
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'Administrador';

-- Gerente: todas exceto gerenciar usuários
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'Gerente' 
AND p.nome != 'usuario_gerenciar';

-- Colaborador: apenas visualização e gerenciamento de tempo
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'Colaborador' 
AND p.nome IN (
    'os_visualizar', 'os_gerenciar_tempo',
    'cliente_visualizar', 'colaborador_visualizar', 'produto_visualizar',
    'relatorio_visualizar'
);

-- 6. Verificar resultado final
SELECT 
    'RESULTADO FINAL - PERMISSÕES ÚNICAS' as info,
    COUNT(*) as total_permissoes,
    COUNT(DISTINCT nome) as nomes_unicos,
    COUNT(DISTINCT descricao) as descricoes_unicas
FROM public.permissoes;

-- 7. Listar todas as permissões organizadas
SELECT 
    'TODAS AS PERMISSÕES' as info,
    modulo,
    acao,
    nome,
    descricao
FROM public.permissoes
ORDER BY modulo, acao, nome;

-- ✅ VERIFICAÇÃO E LIMPEZA COMPLETA
