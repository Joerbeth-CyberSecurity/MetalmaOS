-- Script para atualizar registros existentes de os_tempo com produto_id
-- Este script associa o tempo registrado ao produto específico baseado na data de apontamento

-- 1. Atualizar registros de os_tempo que não têm produto_id
-- Associar tempo ao produto mais recente apontado para o colaborador
UPDATE public.os_tempo 
SET produto_id = (
  SELECT ocp.produto_id 
  FROM public.os_colaboradores_produtos ocp
  WHERE ocp.os_id = os_tempo.os_id 
    AND ocp.colaborador_id = os_tempo.colaborador_id
    AND ocp.created_at <= os_tempo.data_inicio
  ORDER BY ocp.created_at DESC
  LIMIT 1
)
WHERE produto_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.os_colaboradores_produtos ocp2
    WHERE ocp2.os_id = os_tempo.os_id 
      AND ocp2.colaborador_id = os_tempo.colaborador_id
  );

-- 2. Comentário explicativo
COMMENT ON COLUMN public.os_tempo.produto_id IS 'ID do produto específico que está sendo trabalhado. NULL significa tempo geral da OS. Atualizado automaticamente baseado na data de apontamento.';
