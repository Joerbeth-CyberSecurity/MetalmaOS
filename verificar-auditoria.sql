-- Script específico para verificar a estrutura da auditoria
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se existe alguma tabela de auditoria
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%auditoria%' OR table_name LIKE '%audit%' OR table_name LIKE '%login%');

-- 2. Se existir auditoria_login, verificar sua estrutura
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'auditoria_login'
ORDER BY ordinal_position;

-- 3. Verificar se existem triggers de auditoria
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND (trigger_name LIKE '%auditoria%' OR trigger_name LIKE '%login%');

-- 4. Verificar se existe função de auditoria
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND (routine_name LIKE '%auditoria%' OR routine_name LIKE '%login%');

-- 5. Verificar se existem políticas RLS para auditoria
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename LIKE '%auditoria%' OR tablename LIKE '%login%';
