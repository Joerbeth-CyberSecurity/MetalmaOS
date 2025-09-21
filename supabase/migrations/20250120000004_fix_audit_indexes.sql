-- Correção dos índices de auditoria
-- Data: 2025-01-20

-- Verificar se as tabelas existem e criar os índices necessários
DO $$
BEGIN
    -- Verificar e criar índices para auditoria_sistema
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auditoria_sistema' AND table_schema = 'public') THEN
        -- Verificar se as colunas existem antes de criar os índices
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auditoria_sistema' AND column_name = 'usuario_id' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_usuario_id ON public.auditoria_sistema(usuario_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auditoria_sistema' AND column_name = 'acao' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_acao ON public.auditoria_sistema(acao);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auditoria_sistema' AND column_name = 'tabela' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_tabela ON public.auditoria_sistema(tabela);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auditoria_sistema' AND column_name = 'created_at' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_created_at ON public.auditoria_sistema(created_at);
        END IF;
    END IF;

    -- Verificar e criar índices para auditoria_login
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auditoria_login' AND table_schema = 'public') THEN
        -- Verificar se as colunas existem antes de criar os índices
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auditoria_login' AND column_name = 'usuario_id' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_auditoria_login_usuario_id ON public.auditoria_login(usuario_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auditoria_login' AND column_name = 'tipo_evento' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_auditoria_login_tipo_evento ON public.auditoria_login(tipo_evento);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auditoria_login' AND column_name = 'data_hora' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_auditoria_login_data_hora ON public.auditoria_login(data_hora);
        END IF;
    END IF;

    -- Verificar e criar índices para alertas_seguranca
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alertas_seguranca' AND table_schema = 'public') THEN
        -- Verificar se as colunas existem antes de criar os índices
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alertas_seguranca' AND column_name = 'severidade' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_alertas_seguranca_severidade ON public.alertas_seguranca(severidade);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alertas_seguranca' AND column_name = 'resolvido' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_alertas_seguranca_resolvido ON public.alertas_seguranca(resolvido);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alertas_seguranca' AND column_name = 'created_at' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_alertas_seguranca_created_at ON public.alertas_seguranca(created_at);
        END IF;
    END IF;
END $$;

-- Atualizar estatísticas das tabelas de auditoria
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auditoria_sistema' AND table_schema = 'public') THEN
        ANALYZE public.auditoria_sistema;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auditoria_login' AND table_schema = 'public') THEN
        ANALYZE public.auditoria_login;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alertas_seguranca' AND table_schema = 'public') THEN
        ANALYZE public.alertas_seguranca;
    END IF;
END $$;
