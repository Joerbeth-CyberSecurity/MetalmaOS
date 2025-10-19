-- Adicionar campo produto_id na tabela os_tempo para associar tempo a produtos específicos
-- Isso resolve o problema de status de colaboradores em produtos diferentes

-- 1. Adicionar a coluna produto_id (opcional, pode ser NULL para compatibilidade)
ALTER TABLE public.os_tempo 
ADD COLUMN produto_id UUID REFERENCES public.produtos(id);

-- 2. Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_os_tempo_produto_id ON public.os_tempo(produto_id);

-- 3. Adicionar comentário explicativo
COMMENT ON COLUMN public.os_tempo.produto_id IS 'ID do produto específico que está sendo trabalhado. NULL significa tempo geral da OS.';

-- 4. Atualizar registros existentes (opcional - você pode executar isso depois se quiser)
-- UPDATE public.os_tempo 
-- SET produto_id = (
--   SELECT op.produto_id 
--   FROM public.os_produtos op 
--   WHERE op.os_id = os_tempo.os_id 
--   LIMIT 1
-- ) 
-- WHERE produto_id IS NULL;

-- 5. Criar função para facilitar consultas de tempo por produto
CREATE OR REPLACE FUNCTION get_tempo_por_produto(
  p_os_id UUID,
  p_colaborador_id UUID,
  p_produto_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  tipo VARCHAR(20),
  data_inicio TIMESTAMP WITH TIME ZONE,
  data_fim TIMESTAMP WITH TIME ZONE,
  horas_calculadas DECIMAL(8,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ot.id,
    ot.tipo,
    ot.data_inicio,
    ot.data_fim,
    ot.horas_calculadas
  FROM public.os_tempo ot
  WHERE ot.os_id = p_os_id
    AND ot.colaborador_id = p_colaborador_id
    AND (p_produto_id IS NULL OR ot.produto_id = p_produto_id)
  ORDER BY ot.data_inicio;
END;
$$ LANGUAGE plpgsql;

-- 6. Comentário da função
COMMENT ON FUNCTION get_tempo_por_produto(UUID, UUID, UUID) IS 'Retorna registros de tempo filtrados por OS, colaborador e produto específico.';
