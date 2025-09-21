-- Script para verificar permissões do usuário ceobpofinanceiro@gmail.com
-- Data: 2025-01-21

-- 1. Dados do usuário
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
WHERE a.email = 'ceobpofinanceiro@gmail.com';

-- 2. Total de permissões do usuário
SELECT 
    'TOTAL DE PERMISSÕES' as info,
    COUNT(np.permissao_id) as total_permissoes
FROM public.admins a
JOIN public.niveis_acesso n ON a.nivel_id = n.id
JOIN public.nivel_permissoes np ON n.id = np.nivel_id
WHERE a.email = 'ceobpofinanceiro@gmail.com';

-- 3. Lista detalhada das permissões
SELECT 
    'PERMISSÕES DETALHADAS' as info,
    p.modulo,
    p.acao,
    p.nome,
    p.descricao
FROM public.admins a
JOIN public.niveis_acesso n ON a.nivel_id = n.id
JOIN public.nivel_permissoes np ON n.id = np.nivel_id
JOIN public.permissoes p ON np.permissao_id = p.id
WHERE a.email = 'ceobpofinanceiro@gmail.com'
ORDER BY p.modulo, p.acao;

-- 4. Resumo por módulo
SELECT 
    'RESUMO POR MÓDULO' as info,
    p.modulo,
    COUNT(*) as total_permissoes,
    STRING_AGG(p.acao, ', ' ORDER BY p.acao) as acoes
FROM public.admins a
JOIN public.niveis_acesso n ON a.nivel_id = n.id
JOIN public.nivel_permissoes np ON n.id = np.nivel_id
JOIN public.permissoes p ON np.permissao_id = p.id
WHERE a.email = 'ceobpofinanceiro@gmail.com'
GROUP BY p.modulo
ORDER BY p.modulo;

-- ✅ VERIFICAÇÃO COMPLETA DAS PERMISSÕES
