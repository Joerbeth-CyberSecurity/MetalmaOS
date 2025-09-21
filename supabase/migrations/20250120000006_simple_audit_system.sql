-- Sistema de auditoria simplificado para Supabase Dashboard
-- Data: 2025-01-20

-- 1. Tabela de auditoria do sistema
CREATE TABLE IF NOT EXISTS public.auditoria_sistema (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES public.admins(user_id) ON DELETE SET NULL,
    usuario_nome VARCHAR(100),
    usuario_email VARCHAR(100),
    acao VARCHAR(50) NOT NULL, -- CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT
    tabela VARCHAR(50), -- Nome da tabela afetada
    registro_id UUID, -- ID do registro afetado
    dados_anteriores JSONB, -- Dados antes da alteração
    dados_novos JSONB, -- Dados após a alteração
    ip_address INET,
    user_agent TEXT,
    url TEXT,
    detalhes TEXT, -- Informações adicionais
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabela de auditoria de login
CREATE TABLE IF NOT EXISTS public.auditoria_login (
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

-- 3. Tabela de alertas de segurança
CREATE TABLE IF NOT EXISTS public.alertas_seguranca (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo_alerta VARCHAR(50) NOT NULL, -- SUSPICIOUS_ACTIVITY, MULTIPLE_FAILED_LOGINS, UNAUTHORIZED_ACCESS
    severidade VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    usuario_id UUID REFERENCES public.admins(user_id) ON DELETE SET NULL,
    ip_address INET,
    dados_contexto JSONB,
    resolvido BOOLEAN DEFAULT false,
    resolvido_por UUID REFERENCES public.admins(user_id),
    resolvido_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Função para registrar auditoria
CREATE OR REPLACE FUNCTION public.registrar_auditoria(
    p_acao VARCHAR(50),
    p_tabela VARCHAR(50) DEFAULT NULL,
    p_registro_id UUID DEFAULT NULL,
    p_dados_anteriores JSONB DEFAULT NULL,
    p_dados_novos JSONB DEFAULT NULL,
    p_detalhes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_usuario_id UUID;
    v_usuario_nome VARCHAR(100);
    v_usuario_email VARCHAR(100);
    v_ip_address INET;
    v_user_agent TEXT;
    v_url TEXT;
BEGIN
    -- Obter dados do usuário atual
    SELECT user_id, nome, email
    INTO v_usuario_id, v_usuario_nome, v_usuario_email
    FROM public.admins
    WHERE user_id = auth.uid();
    
    -- Obter IP e User Agent (se disponível)
    v_ip_address := inet_client_addr();
    v_user_agent := current_setting('request.headers', true)::json->>'user-agent';
    v_url := current_setting('request.headers', true)::json->>'referer';
    
    -- Inserir registro de auditoria
    INSERT INTO public.auditoria_sistema (
        usuario_id,
        usuario_nome,
        usuario_email,
        acao,
        tabela,
        registro_id,
        dados_anteriores,
        dados_novos,
        ip_address,
        user_agent,
        url,
        detalhes
    ) VALUES (
        v_usuario_id,
        v_usuario_nome,
        v_usuario_email,
        p_acao,
        p_tabela,
        p_registro_id,
        p_dados_anteriores,
        p_dados_novos,
        v_ip_address,
        v_user_agent,
        v_url,
        p_detalhes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função para registrar login
CREATE OR REPLACE FUNCTION public.registrar_login(
    p_tipo_evento VARCHAR(20),
    p_detalhes JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_usuario_id UUID;
    v_nome_usuario VARCHAR(100);
    v_email_usuario VARCHAR(100);
    v_ip_address INET;
    v_user_agent TEXT;
    v_url TEXT;
BEGIN
    -- Obter dados do usuário atual
    SELECT user_id, nome, email
    INTO v_usuario_id, v_nome_usuario, v_email_usuario
    FROM public.admins
    WHERE user_id = auth.uid();
    
    -- Obter IP e User Agent
    v_ip_address := inet_client_addr();
    v_user_agent := current_setting('request.headers', true)::json->>'user-agent';
    v_url := current_setting('request.headers', true)::json->>'referer';
    
    -- Inserir registro de login
    INSERT INTO public.auditoria_login (
        usuario_id,
        nome_usuario,
        email_usuario,
        tipo_evento,
        ip_address,
        user_agent,
        url,
        detalhes
    ) VALUES (
        v_usuario_id,
        v_nome_usuario,
        v_email_usuario,
        p_tipo_evento,
        v_ip_address,
        v_user_agent,
        v_url,
        p_detalhes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Ativar RLS nas tabelas
ALTER TABLE public.auditoria_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_login ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_seguranca ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de segurança (apenas para admins)
CREATE POLICY "Admins can view system audit" ON public.auditoria_sistema
    FOR SELECT TO authenticated
    USING (true); -- Temporariamente permitir para todos os usuários autenticados

CREATE POLICY "Admins can view login audit" ON public.auditoria_login
    FOR SELECT TO authenticated
    USING (true); -- Temporariamente permitir para todos os usuários autenticados

CREATE POLICY "Admins can view security alerts" ON public.alertas_seguranca
    FOR SELECT TO authenticated
    USING (true); -- Temporariamente permitir para todos os usuários autenticados

-- 8. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_usuario_id ON public.auditoria_sistema(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_acao ON public.auditoria_sistema(acao);
CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_tabela ON public.auditoria_sistema(tabela);
CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_created_at ON public.auditoria_sistema(created_at);

CREATE INDEX IF NOT EXISTS idx_auditoria_login_usuario_id ON public.auditoria_login(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_tipo_evento ON public.auditoria_login(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_data_hora ON public.auditoria_login(data_hora);

CREATE INDEX IF NOT EXISTS idx_alertas_seguranca_severidade ON public.alertas_seguranca(severidade);
CREATE INDEX IF NOT EXISTS idx_alertas_seguranca_resolvido ON public.alertas_seguranca(resolvido);
CREATE INDEX IF NOT EXISTS idx_alertas_seguranca_created_at ON public.alertas_seguranca(created_at);

-- 9. Atualizar estatísticas
ANALYZE public.auditoria_sistema;
ANALYZE public.auditoria_login;
ANALYZE public.alertas_seguranca;
