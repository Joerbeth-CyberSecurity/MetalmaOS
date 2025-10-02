-- Script para atualizar a tabela de auditoria de OS adicionando a ação 'reiniciar_os'
-- Execute este script no SQL Editor do Supabase Dashboard

-- Primeiro, verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auditoria_os') THEN
        RAISE EXCEPTION 'Tabela auditoria_os não encontrada. Execute primeiro o script auditoria-os-setup.sql';
    END IF;
END $$;

-- Remover o constraint existente (se houver)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'auditoria_os_acao_check' 
        AND table_name = 'auditoria_os'
    ) THEN
        ALTER TABLE public.auditoria_os DROP CONSTRAINT auditoria_os_acao_check;
    END IF;
END $$;

-- Adicionar o novo constraint com 'reiniciar_os'
ALTER TABLE public.auditoria_os 
ADD CONSTRAINT auditoria_os_acao_check 
CHECK (acao = ANY(ARRAY[
    'criar_os'::text, 
    'editar_os'::text, 
    'excluir_os'::text, 
    'iniciar_os'::text, 
    'reiniciar_os'::text,
    'pausar_os'::text, 
    'parar_os'::text, 
    'finalizar_os'::text, 
    'adicionar_colaborador'::text, 
    'remover_colaborador'::text,
    'cancelar_os'::text,
    'reabrir_os'::text
]));

-- Verificar se a atualização foi aplicada
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'auditoria_os_acao_check';
