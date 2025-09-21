-- Script corrigido para evitar erros de políticas duplicadas
-- Execute este script no SQL Editor do Supabase

-- 1. Primeiro, vamos verificar a estrutura atual das tabelas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('justificativas_os', 'auditoria_login', 'configuracoes', 'niveis_acesso', 'permissoes', 'nivel_permissoes', 'admins')
ORDER BY table_name, ordinal_position;

-- 2. Verificar se as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('justificativas_os', 'auditoria_login', 'configuracoes', 'niveis_acesso', 'permissoes', 'nivel_permissoes', 'admins')
ORDER BY table_name;

-- 3. Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('justificativas_os', 'auditoria_login', 'configuracoes', 'niveis_acesso', 'permissoes', 'nivel_permissoes', 'admins')
ORDER BY tablename, policyname;
