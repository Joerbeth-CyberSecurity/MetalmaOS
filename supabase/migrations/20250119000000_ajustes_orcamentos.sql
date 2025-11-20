-- Ajustes no módulo de Orçamentos
-- Data: 19/01/2025
-- Descrição: Adiciona status 'cancelado' e renomeia data_vencimento para data_criacao

-- 1. Adicionar status 'cancelado' na constraint
DO $$
BEGIN
    -- Remover constraint antiga
    ALTER TABLE public.orcamentos 
    DROP CONSTRAINT IF EXISTS orcamentos_status_check;
    
    -- Adicionar nova constraint com 'cancelado'
    ALTER TABLE public.orcamentos 
    ADD CONSTRAINT orcamentos_status_check 
    CHECK (status IN ('aberto', 'aprovado', 'rejeitado', 'cancelado', 'transformado'));
    
    RAISE NOTICE 'Constraint de status atualizada com sucesso';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao atualizar constraint: %', SQLERRM;
END $$;

-- 2. Renomear coluna data_vencimento para data_criacao
DO $$
BEGIN
    -- Verificar se a coluna data_vencimento existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orcamentos' 
        AND column_name = 'data_vencimento'
    ) THEN
        -- Renomear a coluna
        ALTER TABLE public.orcamentos 
        RENAME COLUMN data_vencimento TO data_criacao;
        
        RAISE NOTICE 'Coluna data_vencimento renomeada para data_criacao';
    ELSE
        RAISE NOTICE 'Coluna data_vencimento não encontrada, provavelmente já foi renomeada';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao renomear coluna: %', SQLERRM;
END $$;

-- 3. Atualizar comentário da coluna
COMMENT ON COLUMN public.orcamentos.data_criacao IS 'Data de criação do orçamento (gerada automaticamente)';

-- 4. Criar índice para o novo status (se não existir)
CREATE INDEX IF NOT EXISTS idx_orcamentos_status_cancelado 
ON public.orcamentos(status) 
WHERE status = 'cancelado';

-- 5. Atualizar orçamentos que estão marcados como 'rejeitado' mas têm observação de cancelamento
-- (Opcional: descomentar se quiser migrar dados antigos)
-- UPDATE public.orcamentos 
-- SET status = 'cancelado'
-- WHERE status = 'rejeitado' 
-- AND observacoes LIKE 'CANCELADO:%';

-- Comentários finais
COMMENT ON CONSTRAINT orcamentos_status_check ON public.orcamentos 
IS 'Status válidos: aberto (novo), aprovado (cliente aprovou), rejeitado (cliente rejeitou), cancelado (empresa cancelou), transformado (virou OS)';

-- Log de conclusão
DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Migração 20250119000000_ajustes_orcamentos concluída';
    RAISE NOTICE 'Mudanças aplicadas:';
    RAISE NOTICE '  - Status "cancelado" adicionado';
    RAISE NOTICE '  - Coluna data_vencimento → data_criacao';
    RAISE NOTICE '  - Índices e comentários atualizados';
    RAISE NOTICE '=================================================';
END $$;
