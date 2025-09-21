-- Script SIMPLES para garantir acesso administrativo total
-- Usuário: informatica@jkinfonet.com.br
-- Data: 2025-01-21

-- 1. Atualizar usuário para nível Administrador
UPDATE public.admins 
SET 
    nivel_id = (SELECT id FROM public.niveis_acesso WHERE nome = 'Administrador'),
    tipo_usuario = 'admin',
    ativo = true
WHERE email = 'informatica@jkinfonet.com.br';

-- 2. Garantir que o nível Administrador tenha TODAS as permissões
-- (Caso alguma permissão não esteja associada)
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT 
    n.id as nivel_id,
    p.id as permissao_id
FROM public.niveis_acesso n
CROSS JOIN public.permissoes p
WHERE n.nome = 'Administrador'
ON CONFLICT (nivel_id, permissao_id) DO NOTHING;

-- 3. Verificar resultado
SELECT 
    'USUÁRIO RESTAURADO' as status,
    a.nome,
    a.email,
    n.nome as nivel,
    COUNT(np.permissao_id) as total_permissoes
FROM public.admins a
JOIN public.niveis_acesso n ON a.nivel_id = n.id
LEFT JOIN public.nivel_permissoes np ON n.id = np.nivel_id
WHERE a.email = 'informatica@jkinfonet.com.br'
GROUP BY a.id, a.nome, a.email, n.nome;

-- ✅ ACESSO ADMINISTRATIVO GARANTIDO
