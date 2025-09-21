-- Script para corrigir problemas dos relatórios
-- Adiciona campos ausentes nas tabelas

-- 1. Adicionar campos ausentes na tabela ordens_servico
ALTER TABLE ordens_servico 
ADD COLUMN IF NOT EXISTS data_fim TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tempo_execucao_real DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS tempo_parada DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS desconto_tipo VARCHAR(20),
ADD COLUMN IF NOT EXISTS desconto_valor DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS valor_total_com_desconto DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 2. Adicionar campo meta_hora na tabela colaboradores
ALTER TABLE colaboradores 
ADD COLUMN IF NOT EXISTS meta_hora DECIMAL(10,2) DEFAULT 8.0;

-- 3. Adicionar campo horas_calculadas na tabela os_tempo
ALTER TABLE os_tempo 
ADD COLUMN IF NOT EXISTS horas_calculadas DECIMAL(10,2);

-- 4. Adicionar campo unidade na tabela produtos (se não existir)
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS unidade VARCHAR(10) DEFAULT 'UN';

-- 5. Atualizar dados existentes para garantir compatibilidade
-- Copiar data_fechamento para data_fim se existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'ordens_servico' AND column_name = 'data_fechamento') THEN
        UPDATE ordens_servico 
        SET data_fim = data_fechamento 
        WHERE data_fim IS NULL AND data_fechamento IS NOT NULL;
    END IF;
END $$;

-- Atualizar valor_total_com_desconto com valor_total
UPDATE ordens_servico 
SET valor_total_com_desconto = valor_total 
WHERE valor_total_com_desconto IS NULL AND valor_total IS NOT NULL;

-- 6. Criar índices para melhorar performance dos relatórios
CREATE INDEX IF NOT EXISTS idx_ordens_servico_data_abertura ON ordens_servico(data_abertura);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status ON ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_os_tempo_data_inicio ON os_tempo(data_inicio);
CREATE INDEX IF NOT EXISTS idx_os_tempo_tipo ON os_tempo(tipo);

-- 7. Comentários para documentação
COMMENT ON COLUMN ordens_servico.data_fim IS 'Data de finalização da OS';
COMMENT ON COLUMN ordens_servico.tempo_execucao_real IS 'Tempo real de execução em horas';
COMMENT ON COLUMN ordens_servico.tempo_parada IS 'Tempo de paradas em horas';
COMMENT ON COLUMN ordens_servico.desconto_tipo IS 'Tipo de desconto: percentual ou valor';
COMMENT ON COLUMN ordens_servico.desconto_valor IS 'Valor do desconto';
COMMENT ON COLUMN ordens_servico.valor_total_com_desconto IS 'Valor total com desconto aplicado';
COMMENT ON COLUMN ordens_servico.observacoes IS 'Observações adicionais da OS';
COMMENT ON COLUMN colaboradores.meta_hora IS 'Meta de horas de trabalho por dia';
COMMENT ON COLUMN os_tempo.horas_calculadas IS 'Horas calculadas automaticamente';
COMMENT ON COLUMN produtos.unidade IS 'Unidade de medida do produto';
