-- Correção pontual e segura para status por produto/colaborador na OS (somente esta OS)
-- 1) Preenche produto_id nos tempos com base no apontamento ativo na data de início
-- 2) Ajusta created_at do apontamento antigo para ficar antes do primeiro TRABALHO
--    (evita que um reapontamento posterior "apague" o histórico para a inferência de status)

-- Bloco 1) Preencher produto_id dos tempos sem produto
WITH params AS (
  SELECT 
    'OS0079/2025'::text                              AS os_numero,
    'ANTONIO WILLISTON LAUNE MAIA'::text             AS colaborador_nome
),
os_sel AS (
  SELECT o.id AS os_id FROM ordens_servico o
  JOIN params p ON p.os_numero = o.numero_os
),
colab_sel AS (
  SELECT c.id AS colaborador_id FROM colaboradores c
  JOIN params p ON p.colaborador_nome = c.nome
)
UPDATE os_tempo t
SET produto_id = sub.produto_id
FROM (
  SELECT t1.id AS tempo_id,
         (
           SELECT a.produto_id
           FROM os_colaboradores_produtos a
           WHERE a.os_id = t1.os_id
             AND a.colaborador_id = t1.colaborador_id
             AND a.created_at <= COALESCE(t1.data_inicio, now())
           ORDER BY a.created_at DESC
           LIMIT 1
         ) AS produto_id
  FROM os_tempo t1
  JOIN os_sel s ON s.os_id = t1.os_id
  JOIN colab_sel c ON c.colaborador_id = t1.colaborador_id
  WHERE t1.produto_id IS NULL
) sub
WHERE t.id = sub.tempo_id AND t.produto_id IS NULL;

-- Bloco 2) Ajustar created_at do apontamento antigo para ficar antes do primeiro TRABALHO
WITH params AS (
  SELECT 
    'OS0079/2025'::text                              AS os_numero,
    'ANTONIO WILLISTON LAUNE MAIA'::text             AS colaborador_nome,
    '(SISTEMA ANTIGO) - ABRACADEIRA DE ACO PARA LAMP FLUOR 25'::text AS produto_antigo_nome
),
os_sel AS (
  SELECT o.id AS os_id FROM ordens_servico o
  JOIN params p ON p.os_numero = o.numero_os
),
colab_sel AS (
  SELECT c.id AS colaborador_id FROM colaboradores c
  JOIN params p ON p.colaborador_nome = c.nome
),
prod_antigo AS (
  SELECT op.produto_id
  FROM os_produtos op
  JOIN os_sel s ON s.os_id = op.os_id
  JOIN produtos pr ON pr.id = op.produto_id
  JOIN params p ON p.produto_antigo_nome = pr.nome
),
first_work AS (
  SELECT MIN(t.data_inicio) AS primeira_data_trabalho
  FROM os_tempo t
  JOIN os_sel s ON s.os_id = t.os_id
  JOIN colab_sel c ON c.colaborador_id = t.colaborador_id
  WHERE t.tipo = 'trabalho'
),
target AS (
  SELECT a.* FROM os_colaboradores_produtos a
  JOIN os_sel s ON s.os_id = a.os_id
  JOIN colab_sel c ON c.colaborador_id = a.colaborador_id
  JOIN prod_antigo pa ON pa.produto_id = a.produto_id
)
UPDATE os_colaboradores_produtos a
SET created_at = LEAST(a.created_at, (SELECT primeira_data_trabalho FROM first_work) - interval '1 second')
FROM target tg
WHERE a.os_id = tg.os_id AND a.colaborador_id = tg.colaborador_id AND a.produto_id = tg.produto_id;

-- Após executar, rode o debug_os_diagnostico.sql (bloco DIAG) para confirmar o status inferido.

