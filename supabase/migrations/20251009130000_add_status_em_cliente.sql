-- Torna a constraint de status compatível com 'em_cliente' (idempotente)
DO $$
BEGIN
  -- Detecta se a coluna 'status' já possui o valor 'em_cliente' na CHECK constraint
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu
      ON cc.constraint_name = ccu.constraint_name AND cc.constraint_schema = ccu.constraint_schema
    WHERE ccu.table_schema = 'public'
      AND ccu.table_name = 'ordens_servico'
      AND ccu.column_name = 'status'
      AND cc.check_clause ILIKE '%em_cliente%'
  ) THEN
    -- Remover constraint antiga (nome varia; localizar dinamicamente)
    DECLARE cons_name text;
    BEGIN
      SELECT tc.constraint_name INTO cons_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name AND tc.constraint_schema = ccu.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'ordens_servico'
        AND tc.constraint_type = 'CHECK'
        AND ccu.column_name = 'status'
      LIMIT 1;

      IF cons_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.ordens_servico DROP CONSTRAINT %I', cons_name);
      END IF;

      -- Criar nova constraint incluindo 'em_cliente'
      EXECUTE 'ALTER TABLE public.ordens_servico
               ADD CONSTRAINT ordens_servico_status_check
               CHECK (status IN (''aberta'',''em_andamento'',''pausada'',''finalizada'',''cancelada'',''falta_material'',''em_cliente''))';
    END;
  END IF;
END$$;

-- Índice por status (idempotente)
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status ON public.ordens_servico(status);


