-- Desabilitar temporariamente os triggers de auditoria para evitar conflitos
DROP TRIGGER IF EXISTS audit_admins_changes ON public.admins;
DROP TRIGGER IF EXISTS audit_configuracoes_changes ON public.configuracoes;

-- Verificar se os triggers foram removidos
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE 'audit_%'; 