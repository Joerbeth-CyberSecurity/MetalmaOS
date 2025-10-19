-- Script para verificar se os registros de os_tempo têm produto_id preenchido
-- Execute este script no Supabase SQL Editor

-- 1. Verificar registros de os_tempo do Carlos
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
WHERE c.nome = 'CARLOS LUIS RIBEIRO ARAUJO'
ORDER BY ot.data_inicio DESC;

-- 2. Verificar os_colaboradores_produtos do Carlos
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
WHERE c.nome = 'CARLOS LUIS RIBEIRO ARAUJO'
ORDER BY ocp.created_at DESC;
