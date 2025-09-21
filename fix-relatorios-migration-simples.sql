-- Script SIMPLES para corrigir problemas dos relatórios
-- Execute este script no Supabase SQL Editor

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

-- 4. Adicionar campo unidade na tabela produtos
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS unidade VARCHAR(10) DEFAULT 'UN';

-- 5. Pular atualização de valor_total_com_desconto (é uma coluna gerada)
-- Esta coluna será calculada automaticamente pelo Supabase

-- 6. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_ordens_servico_data_abertura ON ordens_servico(data_abertura);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status ON ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_os_tempo_data_inicio ON os_tempo(data_inicio);
CREATE INDEX IF NOT EXISTS idx_os_tempo_tipo ON os_tempo(tipo);

-- 7. Verificar se as colunas foram criadas
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('ordens_servico', 'colaboradores', 'os_tempo', 'produtos')
    AND column_name IN ('data_fim', 'tempo_execucao_real', 'tempo_parada', 'desconto_tipo', 'desconto_valor', 'valor_total_com_desconto', 'observacoes', 'meta_hora', 'horas_calculadas', 'unidade')
ORDER BY table_name, column_name;
