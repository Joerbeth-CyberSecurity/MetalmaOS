-- Correção da tabela auditoria_login
-- Data: 2025-01-20

-- Primeiro, vamos verificar se a tabela existe e recriar se necessário
DROP TABLE IF EXISTS public.auditoria_login CASCADE;

-- Recriar a tabela auditoria_login com a estrutura correta
CREATE TABLE public.auditoria_login (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES public.admins(user_id) ON DELETE SET NULL,
    nome_usuario VARCHAR(100),
    email_usuario VARCHAR(100),
    tipo_evento VARCHAR(20) NOT NULL, -- LOGIN, LOGOUT, FAILED_LOGIN
    ip_address INET,
    user_agent TEXT,
    url TEXT,
    detalhes JSONB, -- Informações adicionais como localização, dispositivo, etc.
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ativar RLS na tabela
ALTER TABLE public.auditoria_login ENABLE ROW LEVEL SECURITY;

-- Políticas para auditoria de login
CREATE POLICY "Admins can view login audit" ON public.auditoria_login
    FOR SELECT TO authenticated
    USING (public.user_has_permission('auditoria_visualizar'));

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_auditoria_login_usuario_id ON public.auditoria_login(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_tipo_evento ON public.auditoria_login(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_data_hora ON public.auditoria_login(data_hora);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_ip_address ON public.auditoria_login(ip_address);

-- Atualizar estatísticas
ANALYZE public.auditoria_login;
