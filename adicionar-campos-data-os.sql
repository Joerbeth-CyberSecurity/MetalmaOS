-- Script para adicionar novos campos de data na tabela ordens_servico
-- Este script é idempotente e pode ser executado múltiplas vezes sem problemas

-- Adicionar campo 'data_atual' (data do dia atual, não editável)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ordens_servico' AND column_name = 'data_atual'
  ) THEN
    EXECUTE 'ALTER TABLE public.ordens_servico ADD COLUMN data_atual TIMESTAMP WITH TIME ZONE DEFAULT now()';
  END IF;
END$$;

-- Adicionar campo 'data_conclusao' (substitui data_previsao)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ordens_servico' AND column_name = 'data_conclusao'
  ) THEN
    EXECUTE 'ALTER TABLE public.ordens_servico ADD COLUMN data_conclusao TIMESTAMP WITH TIME ZONE NULL';
  END IF;
END$$;

-- Criar índices para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_ordens_servico_data_atual ON public.ordens_servico(data_atual);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_data_conclusao ON public.ordens_servico(data_conclusao);

-- Comentários para documentar os campos
COMMENT ON COLUMN public.ordens_servico.data_atual IS 'Data atual do sistema (não editável pelo usuário)';
COMMENT ON COLUMN public.ordens_servico.data_conclusao IS 'Data prevista para conclusão da OS (substitui data_previsao)';

-- Atualizar o campo data_atual para registros existentes (se necessário)
UPDATE public.ordens_servico 
SET data_atual = created_at 
WHERE data_atual IS NULL;

-- Verificar se os campos foram criados corretamente
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'ordens_servico' 
  AND column_name IN ('data_abertura', 'data_atual', 'data_conclusao', 'data_previsao')
ORDER BY column_name;
