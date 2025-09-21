-- Script para restaurar acesso administrativo completo
-- Usuário: informatica@jkinfonet.com.br
-- Data: 2025-01-21

-- 1. Verificar o usuário atual
SELECT 
    'USUÁRIO ATUAL' as info,
    id,
    nome,
    email,
    tipo_usuario,
    ativo,
    nivel_id
FROM public.admins 
WHERE email = 'informatica@jkinfonet.com.br';

-- 2. Verificar níveis de acesso disponíveis
SELECT 
    'NÍVEIS DISPONÍVEIS' as info,
    id,
    nome,
    descricao,
    ativo
FROM public.niveis_acesso
ORDER BY nome;

-- 3. Atualizar o usuário para nível Administrador
UPDATE public.admins 
SET 
    nivel_id = (
        SELECT id FROM public.niveis_acesso 
        WHERE nome = 'Administrador'
    ),
    tipo_usuario = 'admin',
    ativo = true,
    updated_at = now()
WHERE email = 'informatica@jkinfonet.com.br';

-- 4. Verificar se a atualização foi bem-sucedida
SELECT 
    'USUÁRIO APÓS ATUALIZAÇÃO' as info,
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

-- 5. Verificar permissões do usuário
SELECT 
    'PERMISSÕES DO USUÁRIO' as info,
    COUNT(np.permissao_id) as total_permissoes,
    STRING_AGG(p.nome, ', ' ORDER BY p.modulo, p.acao) as permissoes
FROM public.admins a
JOIN public.niveis_acesso n ON a.nivel_id = n.id
JOIN public.nivel_permissoes np ON n.id = np.nivel_id
JOIN public.permissoes p ON np.permissao_id = p.id
WHERE a.email = 'informatica@jkinfonat.com.br';

-- 6. Se o usuário não tiver permissões, forçar associação
-- (Caso o nível Administrador não tenha todas as permissões)
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT 
    n.id as nivel_id,
    p.id as permissao_id
FROM public.niveis_acesso n
CROSS JOIN public.permissoes p
WHERE n.nome = 'Administrador'
AND NOT EXISTS (
    SELECT 1 FROM public.nivel_permissoes np 
    WHERE np.nivel_id = n.id AND np.permissao_id = p.id
);

-- 7. Verificar resultado final
SELECT 
    'RESULTADO FINAL' as info,
    a.nome,
    a.email,
    n.nome as nivel,
    COUNT(np.permissao_id) as total_permissoes
FROM public.admins a
JOIN public.niveis_acesso n ON a.nivel_id = n.id
LEFT JOIN public.nivel_permissoes np ON n.id = np.nivel_id
WHERE a.email = 'informatica@jkinfonet.com.br'
GROUP BY a.id, a.nome, a.email, n.nome;

-- 8. Listar todas as permissões do usuário
SELECT 
    'TODAS AS PERMISSÕES' as info,
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

-- ✅ ACESSO ADMINISTRATIVO RESTAURADO
