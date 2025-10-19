-- Diagnóstico completo de status por OS/Colaborador/Produto (somente SELECTs)
-- IMPORTANTE: Em Postgres o WITH vale para apenas 1 SELECT. Por isso, cada bloco abaixo
-- repete o WITH para que rode isoladamente sem erro.

-- ===================== 1) CONTEXTO =====================
WITH params AS (
  SELECT 
    'OS0079/2025'::text                              AS os_numero,
    'ANTONIO WILLISTON LAUNE MAIA'::text             AS colaborador_nome,
    '(SISTEMA ANTIGO) - ABRACADEIRA DE ACO PARA LAMP FLUOR 25'::text AS produto_finalizado_nome,
    '(SERVIÇO) - LIMPEZA COIFA'::text                AS produto_novo_nome
),
os_sel AS (
  SELECT o.id AS os_id, o.numero_os
  FROM ordens_servico o
  JOIN params p ON p.os_numero = o.numero_os
),
colab_sel AS (
  SELECT c.id AS colaborador_id, c.nome
  FROM colaboradores c
  JOIN params p ON p.colaborador_nome = c.nome
),
prod_os AS (
  SELECT op.produto_id, pr.nome
  FROM os_sel s
  JOIN os_produtos op ON op.os_id = s.os_id
  LEFT JOIN produtos pr ON pr.id = op.produto_id
),
prod_finalizado AS (
  SELECT po.produto_id, po.nome FROM prod_os po
  JOIN params p ON p.produto_finalizado_nome = po.nome
),
prod_novo AS (
  SELECT po.produto_id, po.nome FROM prod_os po
  JOIN params p ON p.produto_novo_nome = po.nome
)
SELECT 'CTX' AS tag, * FROM (
  SELECT 
    (SELECT os_id FROM os_sel LIMIT 1)                                 AS os_id,
    (SELECT numero_os FROM os_sel LIMIT 1)                             AS numero_os,
    (SELECT colaborador_id FROM colab_sel LIMIT 1)                     AS colaborador_id,
    (SELECT nome FROM colab_sel LIMIT 1)                               AS colaborador_nome,
    (SELECT produto_id FROM prod_finalizado LIMIT 1)                   AS produto_finalizado_id,
    (SELECT nome FROM prod_finalizado LIMIT 1)                         AS produto_finalizado_nome,
    (SELECT produto_id FROM prod_novo LIMIT 1)                         AS produto_novo_id,
    (SELECT nome FROM prod_novo LIMIT 1)                               AS produto_novo_nome
) x;

-- ===================== 2) APONTAMENTOS =====================
WITH params AS (
  SELECT 
    'OS0079/2025'::text AS os_numero,
    'ANTONIO WILLISTON LAUNE MAIA'::text AS colaborador_nome
),
os_sel AS (
  SELECT o.id AS os_id FROM ordens_servico o
  JOIN params p ON p.os_numero = o.numero_os
),
colab_sel AS (
  SELECT c.id AS colaborador_id FROM colaboradores c
  JOIN params p ON p.colaborador_nome = c.nome
)
SELECT 'APONTAMENTOS' AS tag, a.*
FROM os_colaboradores_produtos a
JOIN os_sel s ON s.os_id = a.os_id
JOIN colab_sel c ON c.colaborador_id = a.colaborador_id
ORDER BY a.created_at ASC;

-- ===================== 3) TEMPOS =====================
WITH params AS (
  SELECT 
    'OS0079/2025'::text AS os_numero,
    'ANTONIO WILLISTON LAUNE MAIA'::text AS colaborador_nome
),
os_sel AS (
  SELECT o.id AS os_id FROM ordens_servico o
  JOIN params p ON p.os_numero = o.numero_os
),
colab_sel AS (
  SELECT c.id AS colaborador_id FROM colaboradores c
  JOIN params p ON p.colaborador_nome = c.nome
)
SELECT 'TEMPOS' AS tag, t.id, t.tipo, t.produto_id, t.data_inicio, t.data_fim
FROM os_tempo t
JOIN os_sel s ON s.os_id = t.os_id
JOIN colab_sel c ON c.colaborador_id = t.colaborador_id
ORDER BY t.data_inicio ASC NULLS LAST;

-- ===================== 4) DIAGNÓSTICO POR PRODUTO =====================
WITH params AS (
  SELECT 
    'OS0079/2025'::text                              AS os_numero,
    'ANTONIO WILLISTON LAUNE MAIA'::text             AS colaborador_nome,
    '(SISTEMA ANTIGO) - ABRACADEIRA DE ACO PARA LAMP FLUOR 25'::text AS produto_finalizado_nome,
    '(SERVIÇO) - LIMPEZA COIFA'::text                AS produto_novo_nome
),
os_sel AS (
  SELECT o.id AS os_id, o.numero_os FROM ordens_servico o
  JOIN params p ON p.os_numero = o.numero_os
),
colab_sel AS (
  SELECT c.id AS colaborador_id, c.nome FROM colaboradores c
  JOIN params p ON p.colaborador_nome = c.nome
),
prod_os AS (
  SELECT op.produto_id, pr.nome FROM os_produtos op
  JOIN os_sel s ON s.os_id = op.os_id
  LEFT JOIN produtos pr ON pr.id = op.produto_id
),
prod_finalizado AS (
  SELECT po.produto_id, po.nome FROM prod_os po
  JOIN params p ON p.produto_finalizado_nome = po.nome
),
prod_novo AS (
  SELECT po.produto_id, po.nome FROM prod_os po
  JOIN params p ON p.produto_novo_nome = po.nome
),
apontamentos AS (
  SELECT a.* FROM os_colaboradores_produtos a
  JOIN os_sel s ON s.os_id = a.os_id
  JOIN colab_sel c ON c.colaborador_id = a.colaborador_id
),
tempos AS (
  SELECT t.* FROM os_tempo t
  JOIN os_sel s ON s.os_id = t.os_id
  JOIN colab_sel c ON c.colaborador_id = t.colaborador_id
)
SELECT 'DIAG' AS tag,
  base.produto_id,
  base.produto_nome,
  base.apontado_em,
  base.tem_trabalho_ativo,
  base.houve_trabalho_apos_apontar,
  CASE
    WHEN base.tem_trabalho_ativo THEN 'iniciado'
    WHEN base.houve_trabalho_apos_apontar THEN 'finalizado'
    WHEN base.apontado_em IS NOT NULL THEN 'apontado'
    ELSE ''
  END AS status_inferido
FROM (
  SELECT 
    s.os_id,
    c.colaborador_id,
    po.produto_id,
    po.nome AS produto_nome,
    MIN(a.created_at) FILTER (WHERE a.produto_id = po.produto_id) AS apontado_em,
    EXISTS (
      SELECT 1 FROM tempos t
      WHERE (t.produto_id = po.produto_id OR t.produto_id IS NULL)
        AND t.data_fim IS NULL
    ) AS tem_trabalho_ativo,
    EXISTS (
      SELECT 1 FROM tempos t
      WHERE (t.produto_id = po.produto_id OR t.produto_id IS NULL)
        AND (MIN(a.created_at) FILTER (WHERE a.produto_id = po.produto_id)) IS NOT NULL
        AND t.data_inicio >= (MIN(a.created_at) FILTER (WHERE a.produto_id = po.produto_id))
        AND (t.tipo = 'trabalho' OR t.tipo IS NULL)
    ) AS houve_trabalho_apos_apontar
  FROM os_sel s
  JOIN colab_sel c ON TRUE
  JOIN prod_os po ON TRUE
  LEFT JOIN apontamentos a ON a.os_id = s.os_id AND a.colaborador_id = c.colaborador_id
  GROUP BY s.os_id, c.colaborador_id, po.produto_id, po.nome
) base
WHERE base.produto_id IN (
  (SELECT produto_id FROM prod_finalizado LIMIT 1),
  (SELECT produto_id FROM prod_novo LIMIT 1)
)
ORDER BY base.produto_nome;


