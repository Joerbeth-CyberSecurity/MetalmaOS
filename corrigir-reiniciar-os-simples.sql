-- SCRIPT SUPER SIMPLES PARA ADICIONAR 'reiniciar_os' NA AUDITORIA
-- Execute apenas este comando no SQL Editor do Supabase

-- Remover constraint antigo e adicionar novo com reiniciar_os
ALTER TABLE public.auditoria_os DROP CONSTRAINT IF EXISTS auditoria_os_acao_check;

ALTER TABLE public.auditoria_os 
ADD CONSTRAINT auditoria_os_acao_check 
CHECK (acao IN ('criar_os', 'editar_os', 'excluir_os', 'iniciar_os', 'reiniciar_os', 'pausar_os', 'parar_os', 'finalizar_os', 'adicionar_colaborador', 'remover_colaborador', 'cancelar_os', 'reabrir_os'));

-- Verificar se funcionou
SELECT 'Constraint atualizado com sucesso! reiniciar_os agora é aceito na auditoria de OS' as resultado;
