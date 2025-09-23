-- Permitir múltiplos clientes com CPF/CNPJ zerado e duplicado
-- Mantém compatibilidade sem remover nada funcional além da unicidade rígida

DO $$
BEGIN
  -- Remover UNIQUE existente em clientes.cpf_cnpj se existir
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'clientes'
      AND indexname = 'clientes_cpf_cnpj_key'
  ) THEN
    EXECUTE 'ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_cpf_cnpj_key';
  END IF;

  -- Criar índice normal (não único) para performance de busca
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'clientes' AND indexname = 'idx_clientes_cpf_cnpj'
  ) THEN
    EXECUTE 'CREATE INDEX idx_clientes_cpf_cnpj ON public.clientes (cpf_cnpj)';
  END IF;
END$$;


