-- Script simplificado para corrigir a tabela auditoria_login
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Verificar se a tabela existe e sua estrutura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'auditoria_login'
ORDER BY ordinal_position;

-- 2. Se a tabela não existir, criar
CREATE TABLE IF NOT EXISTS public.auditoria_login (
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

-- 3. Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_auditoria_login_user_id ON public.auditoria_login(user_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_data_hora ON public.auditoria_login(data_hora);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_tipo_evento ON public.auditoria_login(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_email ON public.auditoria_login(email_usuario);

-- 4. Habilitar RLS se não estiver habilitado
ALTER TABLE public.auditoria_login ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas se não existirem
DO $$
BEGIN
    -- Política para permitir inserção de registros de auditoria
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'auditoria_login' 
        AND policyname = 'Allow audit record insertion'
    ) THEN
        CREATE POLICY "Allow audit record insertion" ON public.auditoria_login
            FOR INSERT WITH CHECK (true);
    END IF;

    -- Política para administradores verem todos os registros
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'auditoria_login' 
        AND policyname = 'Admins can view all audit records'
    ) THEN
        CREATE POLICY "Admins can view all audit records" ON public.auditoria_login
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.admins 
                    WHERE user_id = auth.uid() 
                    AND tipo_usuario = 'admin'
                )
            );
    END IF;

    -- Política para usuários verem apenas seus próprios registros
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'auditoria_login' 
        AND policyname = 'Users can view their own audit records'
    ) THEN
        CREATE POLICY "Users can view their own audit records" ON public.auditoria_login
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- 6. Verificar se há dados na tabela
SELECT COUNT(*) as total_registros FROM public.auditoria_login;

-- 7. Verificar os últimos registros
SELECT 
    nome_usuario,
    email_usuario,
    tipo_evento,
    data_hora,
    user_agent
FROM public.auditoria_login 
ORDER BY data_hora DESC 
LIMIT 10;
