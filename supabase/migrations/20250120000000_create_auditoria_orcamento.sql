-- ============================================================
-- CRIAR TABELA AUDITORIA_ORCAMENTO
-- Data: 20/11/2025
-- Descrição: Tabela dedicada para auditoria de ações em orçamentos
-- ============================================================

-- PASSO 1: Remover tabela se existir (para recriar limpa)
DROP TABLE IF EXISTS public.auditoria_orcamento CASCADE;

-- PASSO 2: Criar tabela auditoria_orcamento
CREATE TABLE public.auditoria_orcamento (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    nome_usuario VARCHAR(100),
    email_usuario VARCHAR(100),
    acao VARCHAR(50) NOT NULL,
    orcamento_id UUID,
    numero_orcamento VARCHAR(20),
    dados_anteriores JSONB,
    dados_novos JSONB,
    detalhes TEXT,
    data_acao TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- PASSO 3: Adicionar comentários
COMMENT ON TABLE public.auditoria_orcamento IS 'Registro de todas as ações realizadas em orçamentos';
COMMENT ON COLUMN public.auditoria_orcamento.user_id IS 'ID do usuário que executou a ação';
COMMENT ON COLUMN public.auditoria_orcamento.nome_usuario IS 'Nome do usuário que executou a ação';
COMMENT ON COLUMN public.auditoria_orcamento.email_usuario IS 'Email do usuário que executou a ação';
COMMENT ON COLUMN public.auditoria_orcamento.acao IS 'Tipo de ação: EXCLUSAO_ORCAMENTO, CRIACAO_ORCAMENTO, EDICAO_ORCAMENTO, etc';
COMMENT ON COLUMN public.auditoria_orcamento.orcamento_id IS 'ID do orçamento afetado';
COMMENT ON COLUMN public.auditoria_orcamento.numero_orcamento IS 'Número do orçamento (ex: ORC0001/2025)';
COMMENT ON COLUMN public.auditoria_orcamento.dados_anteriores IS 'Dados do orçamento antes da ação (JSON)';
COMMENT ON COLUMN public.auditoria_orcamento.dados_novos IS 'Dados do orçamento depois da ação (JSON)';
COMMENT ON COLUMN public.auditoria_orcamento.detalhes IS 'Detalhes adicionais da ação';
COMMENT ON COLUMN public.auditoria_orcamento.data_acao IS 'Data e hora da ação';

-- PASSO 4: Criar índices para melhorar performance
CREATE INDEX idx_auditoria_orcamento_user_id ON public.auditoria_orcamento(user_id);
CREATE INDEX idx_auditoria_orcamento_nome_usuario ON public.auditoria_orcamento(nome_usuario);
CREATE INDEX idx_auditoria_orcamento_email_usuario ON public.auditoria_orcamento(email_usuario);
CREATE INDEX idx_auditoria_orcamento_acao ON public.auditoria_orcamento(acao);
CREATE INDEX idx_auditoria_orcamento_numero_orcamento ON public.auditoria_orcamento(numero_orcamento);
CREATE INDEX idx_auditoria_orcamento_data_acao ON public.auditoria_orcamento(data_acao);
CREATE INDEX idx_auditoria_orcamento_created_at ON public.auditoria_orcamento(created_at);

-- PASSO 5: Ativar RLS (Row Level Security)
ALTER TABLE public.auditoria_orcamento ENABLE ROW LEVEL SECURITY;

-- PASSO 6: Criar políticas de segurança
CREATE POLICY "Allow all for authenticated users" 
ON public.auditoria_orcamento
FOR ALL 
TO authenticated
USING (true);

-- PASSO 7: Atualizar estatísticas
ANALYZE public.auditoria_orcamento;

-- PASSO 8: Inserir registro de teste
INSERT INTO public.auditoria_orcamento (
    nome_usuario,
    email_usuario,
    acao,
    numero_orcamento,
    detalhes,
    data_acao
) VALUES (
    'Sistema',
    'sistema@metalma.com',
    'SYSTEM_INIT',
    'SYSTEM',
    'Tabela de auditoria de orçamentos inicializada com sucesso',
    now()
);

-- Log de conclusão
DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Tabela auditoria_orcamento criada com sucesso!';
    RAISE NOTICE 'Campos disponíveis:';
    RAISE NOTICE '  - id (UUID)';
    RAISE NOTICE '  - user_id (UUID)';
    RAISE NOTICE '  - nome_usuario (VARCHAR 100)';
    RAISE NOTICE '  - email_usuario (VARCHAR 100)';
    RAISE NOTICE '  - acao (VARCHAR 50)';
    RAISE NOTICE '  - orcamento_id (UUID)';
    RAISE NOTICE '  - numero_orcamento (VARCHAR 20)';
    RAISE NOTICE '  - dados_anteriores (JSONB)';
    RAISE NOTICE '  - dados_novos (JSONB)';
    RAISE NOTICE '  - detalhes (TEXT)';
    RAISE NOTICE '  - data_acao (TIMESTAMP)';
    RAISE NOTICE '  - created_at (TIMESTAMP)';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Índices criados para melhor performance';
    RAISE NOTICE 'RLS ativado e políticas configuradas';
    RAISE NOTICE 'Sistema pronto para registrar auditorias!';
    RAISE NOTICE '=================================================';
END $$;
