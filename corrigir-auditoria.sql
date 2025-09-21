-- Script para corrigir a estrutura da auditoria
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela auditoria_login se não existir
CREATE TABLE IF NOT EXISTS public.auditoria_login (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    nome_usuario VARCHAR(255),
    email_usuario VARCHAR(255),
    tipo_evento VARCHAR(50) NOT NULL, -- 'login' ou 'logout'
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_auditoria_login_user_id ON public.auditoria_login(user_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_data_hora ON public.auditoria_login(data_hora);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_tipo_evento ON public.auditoria_login(tipo_evento);

-- 3. Habilitar RLS
ALTER TABLE public.auditoria_login ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS
DROP POLICY IF EXISTS "Enable read access for all users" ON public.auditoria_login;
CREATE POLICY "Enable read access for all users" ON public.auditoria_login FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.auditoria_login;
CREATE POLICY "Enable insert for authenticated users" ON public.auditoria_login FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. Criar função para inserir dados de auditoria
CREATE OR REPLACE FUNCTION public.inserir_auditoria_login(
    p_user_id UUID,
    p_nome_usuario VARCHAR(255),
    p_email_usuario VARCHAR(255),
    p_tipo_evento VARCHAR(50),
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    auditoria_id UUID;
BEGIN
    INSERT INTO public.auditoria_login (
        user_id,
        nome_usuario,
        email_usuario,
        tipo_evento,
        user_agent,
        ip_address
    ) VALUES (
        p_user_id,
        p_nome_usuario,
        p_email_usuario,
        p_tipo_evento,
        p_user_agent,
        p_ip_address
    ) RETURNING id INTO auditoria_id;
    
    RETURN auditoria_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Inserir alguns dados de exemplo
INSERT INTO public.auditoria_login (user_id, nome_usuario, email_usuario, tipo_evento, user_agent, ip_address)
VALUES 
    (gen_random_uuid(), 'João Silva', 'joao@exemplo.com', 'login', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '192.168.1.100'),
    (gen_random_uuid(), 'Maria Santos', 'maria@exemplo.com', 'login', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', '192.168.1.101'),
    (gen_random_uuid(), 'João Silva', 'joao@exemplo.com', 'logout', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '192.168.1.100')
ON CONFLICT DO NOTHING;
