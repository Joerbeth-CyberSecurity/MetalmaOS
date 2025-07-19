-- Adicionar coluna event_details à tabela auditoria_login
ALTER TABLE auditoria_login 
ADD COLUMN IF NOT EXISTS event_details JSONB;

-- Comentário na coluna
COMMENT ON COLUMN auditoria_login.event_details IS 'Detalhes adicionais do evento em formato JSON'; 