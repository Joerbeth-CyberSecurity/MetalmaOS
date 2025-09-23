-- Adiciona coluna 'fabrica' à tabela de ordens de serviço
-- Valores esperados: 'Metalma' ou 'Galpão'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ordens_servico' AND column_name = 'fabrica'
  ) THEN
    EXECUTE 'ALTER TABLE public.ordens_servico ADD COLUMN fabrica VARCHAR(20)';
  END IF;
END$$;


