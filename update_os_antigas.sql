-- Script para atualizar OS antigas com ações corretas
-- Data: Janeiro 2025
-- Descrição: Atualiza OS criadas antes das últimas correções para garantir compatibilidade

-- 1. Atualizar OS que têm data_inicio mas estão com status 'aberta'
UPDATE ordens_servico 
SET status = 'em_andamento' 
WHERE status = 'aberta' 
AND data_inicio IS NOT NULL
AND data_inicio < NOW();

-- 2. Atualizar OS que têm data_fim mas estão com status 'em_andamento'
UPDATE ordens_servico 
SET status = 'finalizada' 
WHERE status = 'em_andamento' 
AND data_fim IS NOT NULL
AND data_fim < NOW();

-- 3. Atualizar OS que têm data_fim mas estão com status 'pausada'
UPDATE ordens_servico 
SET status = 'finalizada' 
WHERE status = 'pausada' 
AND data_fim IS NOT NULL
AND data_fim < NOW();

-- 4. Atualizar OS que têm data_fim mas estão com status 'falta_material'
UPDATE ordens_servico 
SET status = 'finalizada' 
WHERE status = 'falta_material' 
AND data_fim IS NOT NULL
AND data_fim < NOW();

-- 5. Garantir que OS com colaboradores ativos tenham status correto
UPDATE ordens_servico 
SET status = 'em_andamento' 
WHERE id IN (
    SELECT DISTINCT os_id 
    FROM os_tempo 
    WHERE data_fim IS NULL 
    AND tipo = 'trabalho'
    AND data_inicio < NOW()
)
AND status NOT IN ('finalizada', 'cancelada');

-- 6. Atualizar configurações para marcar que as correções foram aplicadas
INSERT INTO configuracoes (chave, valor, descricao) 
VALUES (
    'os_acoes_atualizadas', 
    'true', 
    'OS antigas foram atualizadas com status corretos em Janeiro 2025'
) 
ON CONFLICT (chave) DO UPDATE SET 
    valor = 'true',
    updated_at = NOW();

-- 7. Criar índice para melhorar performance das consultas de status
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status_data 
ON ordens_servico (status, data_abertura, data_inicio, data_fim);

-- 8. Atualizar estatísticas da tabela
ANALYZE ordens_servico;

-- 9. Log das alterações realizadas
INSERT INTO configuracoes (chave, valor, descricao) 
VALUES (
    'os_atualizacao_log', 
    NOW()::text, 
    'Data da última atualização de OS antigas'
) 
ON CONFLICT (chave) DO UPDATE SET 
    valor = NOW()::text,
    updated_at = NOW();

-- Verificar resultados
SELECT 
    status,
    COUNT(*) as quantidade,
    MIN(data_abertura) as primeira_os,
    MAX(data_abertura) as ultima_os
FROM ordens_servico 
GROUP BY status 
ORDER BY status;
