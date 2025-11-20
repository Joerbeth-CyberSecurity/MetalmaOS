-- ============================================================
-- ADICIONAR OPÇÃO "Terceirizado" AO CAMPO FÁBRICA
-- Data: 20/11/2025
-- ============================================================

-- Alterar o ENUM do campo fabrica na tabela ordens_servico
ALTER TABLE public.ordens_servico 
DROP CONSTRAINT IF EXISTS ordens_servico_fabrica_check;

ALTER TABLE public.ordens_servico 
ADD CONSTRAINT ordens_servico_fabrica_check 
CHECK (fabrica IN ('Metalma', 'Galpão', 'Terceirizado'));

-- Verificar se funcionou
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'ordens_servico' AND column_name = 'fabrica';
