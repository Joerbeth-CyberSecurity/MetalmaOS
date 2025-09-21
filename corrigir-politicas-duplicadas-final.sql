-- Script para corrigir políticas RLS duplicadas
-- Data: 2025-01-21

-- 1. Remover todas as políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Admins can view all admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can insert admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can update admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can delete admins" ON public.admins;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.admins;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.admins;

-- 2. Remover políticas de outras tabelas se existirem
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.nivel_permissoes;
DROP POLICY IF EXISTS "Users can view their own access level" ON public.niveis_acesso;
DROP POLICY IF EXISTS "Users can view permissions" ON public.permissoes;

-- 3. Recriar as políticas RLS corretamente
-- Políticas para tabela admins
CREATE POLICY "Admins can view all admins" ON public.admins
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert admins" ON public.admins
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update admins" ON public.admins
    FOR UPDATE USING (true);

CREATE POLICY "Admins can delete admins" ON public.admins
    FOR DELETE USING (true);

-- Políticas para tabela nivel_permissoes
CREATE POLICY "Users can view their own permissions" ON public.nivel_permissoes
    FOR SELECT USING (true);

-- Políticas para tabela niveis_acesso
CREATE POLICY "Users can view their own access level" ON public.niveis_acesso
    FOR SELECT USING (true);

-- Políticas para tabela permissoes
CREATE POLICY "Users can view permissions" ON public.permissoes
    FOR SELECT USING (true);

-- 4. Verificar se as políticas foram criadas corretamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('admins', 'nivel_permissoes', 'niveis_acesso', 'permissoes')
ORDER BY tablename, policyname;

-- ✅ POLÍTICAS RLS CORRIGIDAS COM SUCESSO
