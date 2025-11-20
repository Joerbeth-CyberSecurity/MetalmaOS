-- ============================================================
-- ADICIONAR CAMPOS À TABELA AUDITORIA_LOGIN
-- Data: 19/11/2025
-- Descrição: Adiciona campos nome_usuario, email_usuario e data_hora
-- ============================================================

-- PASSO 1: Adicionar colunas se não existirem
DO $$
BEGIN
    -- Adicionar nome_usuario
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'auditoria_login' 
        AND column_name = 'nome_usuario'
    ) THEN
        ALTER TABLE public.auditoria_login 
        ADD COLUMN nome_usuario VARCHAR(100);
        RAISE NOTICE 'Coluna nome_usuario adicionada';
    ELSE
        RAISE NOTICE 'Coluna nome_usuario já existe';
    END IF;

    -- Adicionar email_usuario
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'auditoria_login' 
        AND column_name = 'email_usuario'
    ) THEN
        ALTER TABLE public.auditoria_login 
        ADD COLUMN email_usuario VARCHAR(100);
        RAISE NOTICE 'Coluna email_usuario adicionada';
    ELSE
        RAISE NOTICE 'Coluna email_usuario já existe';
    END IF;

    -- Adicionar data_hora
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'auditoria_login' 
        AND column_name = 'data_hora'
    ) THEN
        ALTER TABLE public.auditoria_login 
        ADD COLUMN data_hora TIMESTAMP WITH TIME ZONE DEFAULT now();
        RAISE NOTICE 'Coluna data_hora adicionada';
    ELSE
        RAISE NOTICE 'Coluna data_hora já existe';
    END IF;

    -- Adicionar detalhes (JSONB)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'auditoria_login' 
        AND column_name = 'detalhes'
    ) THEN
        ALTER TABLE public.auditoria_login 
        ADD COLUMN detalhes JSONB;
        RAISE NOTICE 'Coluna detalhes adicionada';
    ELSE
        RAISE NOTICE 'Coluna detalhes já existe';
    END IF;
END $$;

-- PASSO 2: Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_auditoria_login_nome_usuario 
ON public.auditoria_login(nome_usuario);

CREATE INDEX IF NOT EXISTS idx_auditoria_login_email_usuario 
ON public.auditoria_login(email_usuario);

CREATE INDEX IF NOT EXISTS idx_auditoria_login_data_hora 
ON public.auditoria_login(data_hora);

CREATE INDEX IF NOT EXISTS idx_auditoria_login_tipo_evento 
ON public.auditoria_login(tipo_evento);

-- PASSO 3: Adicionar comentários nas colunas
COMMENT ON COLUMN public.auditoria_login.nome_usuario IS 'Nome do usuário que executou a ação';
COMMENT ON COLUMN public.auditoria_login.email_usuario IS 'Email do usuário que executou a ação';
COMMENT ON COLUMN public.auditoria_login.data_hora IS 'Data e hora da ação';
COMMENT ON COLUMN public.auditoria_login.tipo_evento IS 'Tipo de evento: login, logout, exclusao_orcamento, etc';
COMMENT ON COLUMN public.auditoria_login.detalhes IS 'Detalhes adicionais em formato JSON';

-- PASSO 4: Atualizar estatísticas
ANALYZE public.auditoria_login;

-- Log de conclusão
DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Migração concluída com sucesso!';
    RAISE NOTICE 'Campos adicionados à tabela auditoria_login:';
    RAISE NOTICE '  - nome_usuario (VARCHAR 100)';
    RAISE NOTICE '  - email_usuario (VARCHAR 100)';
    RAISE NOTICE '  - data_hora (TIMESTAMP)';
    RAISE NOTICE 'Índices criados para melhor performance';
    RAISE NOTICE '=================================================';
END $$;
