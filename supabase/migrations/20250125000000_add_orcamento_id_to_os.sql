-- Adicionar coluna orcamento_id na tabela ordens_servico
-- Para relacionar OS com o Orçamento que a originou

DO $$
BEGIN
    -- Verificar se a coluna já existe antes de adicionar
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ordens_servico' 
        AND column_name = 'orcamento_id'
    ) THEN
        ALTER TABLE public.ordens_servico 
        ADD COLUMN orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN public.ordens_servico.orcamento_id IS 'ID do orçamento que originou esta OS';
        
        -- Criar índice para melhorar performance de consultas
        CREATE INDEX IF NOT EXISTS idx_ordens_servico_orcamento_id ON public.ordens_servico(orcamento_id);
    END IF;
END $$;

