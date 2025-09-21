-- Criar tabela para justificativas de pausa e parada de OS
CREATE TABLE IF NOT EXISTS justificativas_os (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  os_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pausa', 'parada')),
  justificativa TEXT NOT NULL,
  data_justificativa TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  colaborador_id UUID REFERENCES colaboradores(id),
  tempo_tolerancia_minutos INTEGER DEFAULT 0, -- Tempo de tolerância em minutos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_justificativas_os_id ON justificativas_os(os_id);
CREATE INDEX IF NOT EXISTS idx_justificativas_tipo ON justificativas_os(tipo);
CREATE INDEX IF NOT EXISTS idx_justificativas_data ON justificativas_os(data_justificativa);

-- Adicionar coluna de tempo de tolerância para pausas na tabela de configurações
INSERT INTO configuracoes (chave, valor, descricao) 
VALUES ('tempo_tolerancia_pausa', '120', 'Tempo de tolerância para pausas em minutos (padrão: 120 min = 2h)')
ON CONFLICT (chave) DO NOTHING;

-- Adicionar coluna para controlar se a pausa excedeu o tempo de tolerância
ALTER TABLE justificativas_os 
ADD COLUMN IF NOT EXISTS excedeu_tolerancia BOOLEAN DEFAULT FALSE;

-- Adicionar coluna para controlar se a notificação foi enviada
ALTER TABLE justificativas_os 
ADD COLUMN IF NOT EXISTS notificacao_enviada BOOLEAN DEFAULT FALSE;

-- Criar função para verificar pausas que excederam o tempo de tolerância
CREATE OR REPLACE FUNCTION verificar_pausas_excedidas()
RETURNS TABLE (
  justificativa_id UUID,
  os_id UUID,
  numero_os TEXT,
  tempo_excedido_minutos INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.os_id,
    os.numero_os,
    EXTRACT(EPOCH FROM (NOW() - j.data_justificativa))::INTEGER / 60 as tempo_excedido_minutos
  FROM justificativas_os j
  JOIN ordens_servico os ON j.os_id = os.id
  WHERE j.tipo = 'pausa'
    AND j.excedeu_tolerancia = FALSE
    AND j.notificacao_enviada = FALSE
    AND os.status = 'pausada'
    AND EXTRACT(EPOCH FROM (NOW() - j.data_justificativa))::INTEGER / 60 > j.tempo_tolerancia_minutos;
END;
$$ LANGUAGE plpgsql;

-- Criar função para marcar justificativa como excedida
CREATE OR REPLACE FUNCTION marcar_justificativa_excedida(justificativa_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE justificativas_os 
  SET excedeu_tolerancia = TRUE, notificacao_enviada = TRUE
  WHERE id = justificativa_uuid;
END;
$$ LANGUAGE plpgsql;

-- Adicionar RLS (Row Level Security)
ALTER TABLE justificativas_os ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "Permitir leitura de justificativas para usuários autenticados" ON justificativas_os
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserção para usuários autenticados
CREATE POLICY "Permitir inserção de justificativas para usuários autenticados" ON justificativas_os
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir atualização para usuários autenticados
CREATE POLICY "Permitir atualização de justificativas para usuários autenticados" ON justificativas_os
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para permitir exclusão para usuários autenticados
CREATE POLICY "Permitir exclusão de justificativas para usuários autenticados" ON justificativas_os
  FOR DELETE USING (auth.role() = 'authenticated');
