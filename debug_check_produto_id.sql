-- Script para verificar se o campo produto_id foi adicionado e está funcionando
-- Execute este script no Supabase SQL Editor para verificar

-- 1. Verificar se a coluna produto_id existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'os_tempo' 
  AND column_name = 'produto_id';

-- 2. Verificar registros recentes de os_tempo
SELECT 
  ot.id,
  ot.os_id,
  ot.colaborador_id,
  ot.tipo,
  ot.data_inicio,
  ot.data_fim,
  ot.produto_id,
  c.nome as colaborador_nome,
  p.nome as produto_nome
FROM os_tempo ot
LEFT JOIN colaboradores c ON c.id = ot.colaborador_id
LEFT JOIN produtos p ON p.id = ot.produto_id
ORDER BY ot.data_inicio DESC
LIMIT 10;

-- 3. Verificar os_colaboradores_produtos
SELECT 
  ocp.id,
  ocp.os_id,
  ocp.produto_id,
  ocp.colaborador_id,
  ocp.created_at,
  c.nome as colaborador_nome,
  p.nome as produto_nome
FROM os_colaboradores_produtos ocp
LEFT JOIN colaboradores c ON c.id = ocp.colaborador_id
LEFT JOIN produtos p ON p.id = ocp.produto_id
ORDER BY ocp.created_at DESC
LIMIT 10;
