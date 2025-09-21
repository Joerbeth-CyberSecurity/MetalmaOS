-- Script para verificar e corrigir a tabela auditoria_login
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Verificar se a tabela existe
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'auditoria_login'
ORDER BY ordinal_position;

-- 2. Se a tabela não existir ou estiver incompleta, criar/corrigir
DO $$
BEGIN
    -- Verificar se a tabela existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auditoria_login') THEN
        -- Criar tabela auditoria_login
        CREATE TABLE public.auditoria_login (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            nome_usuario TEXT NOT NULL,
            email_usuario TEXT NOT NULL,
            tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('login', 'logout')),
            data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            ip_address INET,
            user_agent TEXT,
            event_details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Criar índices para melhor performance
        CREATE INDEX idx_auditoria_login_user_id ON public.auditoria_login(user_id);
        CREATE INDEX idx_auditoria_login_data_hora ON public.auditoria_login(data_hora);
        CREATE INDEX idx_auditoria_login_tipo_evento ON public.auditoria_login(tipo_evento);
        CREATE INDEX idx_auditoria_login_email ON public.auditoria_login(email_usuario);
        
        -- Habilitar RLS (Row Level Security)
        ALTER TABLE public.auditoria_login ENABLE ROW LEVEL SECURITY;
        
        -- Política para permitir que usuários vejam apenas seus próprios registros
        CREATE POLICY "Users can view their own audit records" ON public.auditoria_login
            FOR SELECT USING (auth.uid() = user_id);
        
        -- Política para permitir inserção de registros de auditoria
        CREATE POLICY "Allow audit record insertion" ON public.auditoria_login
            FOR INSERT WITH CHECK (true);
        
        -- Política para administradores verem todos os registros
        CREATE POLICY "Admins can view all audit records" ON public.auditoria_login
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.admins 
                    WHERE user_id = auth.uid() 
                    AND tipo_usuario = 'admin'
                )
            );
        
        RAISE NOTICE 'Tabela auditoria_login criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela auditoria_login já existe.';
    END IF;
END $$;

-- 3. Verificar se há dados na tabela
SELECT COUNT(*) as total_registros FROM public.auditoria_login;

-- 4. Verificar os últimos registros
SELECT 
    nome_usuario,
    email_usuario,
    tipo_evento,
    data_hora,
    user_agent
FROM public.auditoria_login 
ORDER BY data_hora DESC 
LIMIT 10;

-- 5. Verificar se há registros de hoje
SELECT 
    COUNT(*) as registros_hoje,
    COUNT(CASE WHEN tipo_evento = 'login' THEN 1 END) as logins_hoje,
    COUNT(CASE WHEN tipo_evento = 'logout' THEN 1 END) as logouts_hoje
FROM public.auditoria_login 
WHERE DATE(data_hora) = CURRENT_DATE;
