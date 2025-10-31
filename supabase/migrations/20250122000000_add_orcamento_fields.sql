-- Adicionar novos campos à tabela orcamentos
-- Data: Janeiro 2025

-- Adicionar colunas para datas e tempo de execução
ALTER TABLE public.orcamentos 
ADD COLUMN IF NOT EXISTS data_prevista TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tempo_execucao_previsto VARCHAR(10),
ADD COLUMN IF NOT EXISTS meta_por_hora DECIMAL(10,2) DEFAULT 0;

-- Comentários nas novas colunas
COMMENT ON COLUMN public.orcamentos.data_prevista IS 'Data prevista para conclusão do orçamento';
COMMENT ON COLUMN public.orcamentos.tempo_execucao_previsto IS 'Tempo de execução previsto no formato HH:MM:SS';
COMMENT ON COLUMN public.orcamentos.meta_por_hora IS 'Meta de valor por hora em reais';

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_orcamentos_data_prevista ON public.orcamentos(data_prevista);
CREATE INDEX IF NOT EXISTS idx_orcamentos_meta_por_hora ON public.orcamentos(meta_por_hora);
