-- Script para resolver todos os problemas identificados
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar coluna event_details se não existir
ALTER TABLE auditoria_login 
ADD COLUMN IF NOT EXISTS event_details JSONB;

-- 2. Desabilitar triggers problemáticos
DROP TRIGGER IF EXISTS audit_admins_changes ON public.admins;
DROP TRIGGER IF EXISTS audit_configuracoes_changes ON public.configuracoes;

-- 3. Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'auditoria_login' 
AND column_name = 'event_details';

-- 4. Verificar se os triggers foram removidos
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE 'audit_%';

-- 5. Testar se a tabela admins está funcionando
SELECT id, nome, email, tipo_usuario, ativo, user_id, created_at, nivel_id 
FROM admins 
LIMIT 1; 