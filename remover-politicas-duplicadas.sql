-- Script simples para remover políticas RLS duplicadas
-- Data: 2025-01-21

-- Remover todas as políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Admins can view all admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can insert admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can update admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can delete admins" ON public.admins;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.admins;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.admins;

-- Remover políticas de outras tabelas se existirem
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.nivel_permissoes;
DROP POLICY IF EXISTS "Users can view their own access level" ON public.niveis_acesso;
DROP POLICY IF EXISTS "Users can view permissions" ON public.permissoes;

-- Verificar se as políticas foram removidas
SELECT 
    'Políticas restantes' as info,
    COUNT(*) as total
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('admins', 'nivel_permissoes', 'niveis_acesso', 'permissoes');

-- ✅ POLÍTICAS DUPLICADAS REMOVIDAS
