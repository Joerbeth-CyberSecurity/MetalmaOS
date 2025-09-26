-- Adiciona coluna data_previsao à tabela ordens_servico, idempotente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ordens_servico' AND column_name = 'data_previsao'
  ) THEN
    EXECUTE 'ALTER TABLE public.ordens_servico ADD COLUMN data_previsao TIMESTAMP WITH TIME ZONE NULL';
  END IF;
END$$;

-- Índice opcional para consultas por previsão
CREATE INDEX IF NOT EXISTS idx_ordens_servico_data_previsao ON public.ordens_servico(data_previsao);

