-- Corrigir tabela auditoria_login - adicionar coluna event_details
ALTER TABLE auditoria_login 
ADD COLUMN IF NOT EXISTS event_details JSONB;

-- Comentário na coluna
COMMENT ON COLUMN auditoria_login.event_details IS 'Detalhes adicionais do evento em formato JSON';

-- Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'auditoria_login' 
AND column_name = 'event_details'; 