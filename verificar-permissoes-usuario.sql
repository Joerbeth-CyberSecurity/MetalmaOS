-- Script para verificar permissões do usuário informatica@jkinfonet.com.br
-- Data: 2025-01-21

-- 1. Verificar dados do usuário
SELECT 
    'DADOS DO USUÁRIO' as info,
    a.id,
    a.nome,
    a.email,
    a.tipo_usuario,
    a.ativo,
    a.nivel_id,
    n.nome as nivel_nome,
    n.descricao as nivel_descricao
FROM public.admins a
LEFT JOIN public.niveis_acesso n ON a.nivel_id = n.id
WHERE a.email = 'informatica@jkinfonet.com.br';

-- 2. Verificar permissões do nível do usuário
SELECT 
    'PERMISSÕES DO NÍVEL' as info,
    COUNT(np.permissao_id) as total_permissoes,
    STRING_AGG(p.nome, ', ' ORDER BY p.modulo, p.acao) as permissoes
FROM public.admins a
JOIN public.niveis_acesso n ON a.nivel_id = n.id
JOIN public.nivel_permissoes np ON n.id = np.nivel_id
JOIN public.permissoes p ON np.permissao_id = p.id
WHERE a.email = 'informatica@jkinfonet.com.br';

-- 3. Listar todas as permissões específicas
SELECT 
    'PERMISSÕES ESPECÍFICAS' as info,
    p.modulo,
    p.acao,
    p.nome,
    p.descricao
FROM public.admins a
JOIN public.niveis_acesso n ON a.nivel_id = n.id
JOIN public.nivel_permissoes np ON n.id = np.nivel_id
JOIN public.permissoes p ON np.permissao_id = p.id
WHERE a.email = 'informatica@jkinfonet.com.br'
ORDER BY p.modulo, p.acao;

-- 4. Verificar se as permissões do menu existem
SELECT 
    'PERMISSÕES DO MENU' as info,
    p.nome,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.admins a
            JOIN public.niveis_acesso n ON a.nivel_id = n.id
            JOIN public.nivel_permissoes np ON n.id = np.nivel_id
            WHERE a.email = 'informatica@jkinfonet.com.br' 
            AND np.permissao_id = p.id
        ) THEN '✅ TEM ACESSO'
        ELSE '❌ SEM ACESSO'
    END as status
FROM public.permissoes p
WHERE p.nome IN (
    'os_visualizar',
    'cliente_visualizar', 
    'colaborador_visualizar',
    'produto_visualizar',
    'relatorio_visualizar',
    'config_visualizar'
)
ORDER BY p.nome;

-- ✅ VERIFICAÇÃO COMPLETA DAS PERMISSÕES
