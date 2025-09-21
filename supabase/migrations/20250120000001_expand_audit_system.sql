-- Sistema de auditoria expandido
-- Data: 2025-01-20

-- Tabela de auditoria geral do sistema
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

-- Tabela de auditoria de login/logout (melhorada)
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

-- Tabela de alertas de segurança
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

-- Função para registrar auditoria
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

-- Função para registrar login
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

-- Função para criar alerta de segurança
CREATE OR REPLACE FUNCTION public.criar_alerta_seguranca(
    p_tipo_alerta VARCHAR(50),
    p_severidade VARCHAR(20),
    p_titulo VARCHAR(200),
    p_descricao TEXT DEFAULT NULL,
    p_usuario_id UUID DEFAULT NULL,
    p_dados_contexto JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_alerta_id UUID;
    v_ip_address INET;
BEGIN
    v_ip_address := inet_client_addr();
    
    INSERT INTO public.alertas_seguranca (
        tipo_alerta,
        severidade,
        titulo,
        descricao,
        usuario_id,
        ip_address,
        dados_contexto
    ) VALUES (
        p_tipo_alerta,
        p_severidade,
        p_titulo,
        p_descricao,
        p_usuario_id,
        v_ip_address,
        p_dados_contexto
    ) RETURNING id INTO v_alerta_id;
    
    RETURN v_alerta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para auditoria automática

-- Trigger para auditoria de clientes
CREATE OR REPLACE FUNCTION public.audit_clientes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.registrar_auditoria(
            'CREATE',
            'clientes',
            NEW.id,
            NULL,
            to_jsonb(NEW),
            'Cliente criado'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.registrar_auditoria(
            'UPDATE',
            'clientes',
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            'Cliente atualizado'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.registrar_auditoria(
            'DELETE',
            'clientes',
            OLD.id,
            to_jsonb(OLD),
            NULL,
            'Cliente excluído'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_clientes
    AFTER INSERT OR UPDATE OR DELETE ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION public.audit_clientes();

-- Trigger para auditoria de colaboradores
CREATE OR REPLACE FUNCTION public.audit_colaboradores()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.registrar_auditoria(
            'CREATE',
            'colaboradores',
            NEW.id,
            NULL,
            to_jsonb(NEW),
            'Colaborador criado'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.registrar_auditoria(
            'UPDATE',
            'colaboradores',
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            'Colaborador atualizado'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.registrar_auditoria(
            'DELETE',
            'colaboradores',
            OLD.id,
            to_jsonb(OLD),
            NULL,
            'Colaborador excluído'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_colaboradores
    AFTER INSERT OR UPDATE OR DELETE ON public.colaboradores
    FOR EACH ROW EXECUTE FUNCTION public.audit_colaboradores();

-- Trigger para auditoria de produtos
CREATE OR REPLACE FUNCTION public.audit_produtos()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.registrar_auditoria(
            'CREATE',
            'produtos',
            NEW.id,
            NULL,
            to_jsonb(NEW),
            'Produto criado'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.registrar_auditoria(
            'UPDATE',
            'produtos',
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            'Produto atualizado'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.registrar_auditoria(
            'DELETE',
            'produtos',
            OLD.id,
            to_jsonb(OLD),
            NULL,
            'Produto excluído'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_produtos
    AFTER INSERT OR UPDATE OR DELETE ON public.produtos
    FOR EACH ROW EXECUTE FUNCTION public.audit_produtos();

-- Trigger para auditoria de ordens de serviço
CREATE OR REPLACE FUNCTION public.audit_ordens_servico()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.registrar_auditoria(
            'CREATE',
            'ordens_servico',
            NEW.id,
            NULL,
            to_jsonb(NEW),
            'Ordem de serviço criada'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.registrar_auditoria(
            'UPDATE',
            'ordens_servico',
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            'Ordem de serviço atualizada'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.registrar_auditoria(
            'DELETE',
            'ordens_servico',
            OLD.id,
            to_jsonb(OLD),
            NULL,
            'Ordem de serviço excluída'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_ordens_servico
    AFTER INSERT OR UPDATE OR DELETE ON public.ordens_servico
    FOR EACH ROW EXECUTE FUNCTION public.audit_ordens_servico();

-- Trigger para auditoria de usuários
CREATE OR REPLACE FUNCTION public.audit_admins()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.registrar_auditoria(
            'CREATE',
            'admins',
            NEW.id,
            NULL,
            to_jsonb(NEW),
            'Usuário criado'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.registrar_auditoria(
            'UPDATE',
            'admins',
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            'Usuário atualizado'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.registrar_auditoria(
            'DELETE',
            'admins',
            OLD.id,
            to_jsonb(OLD),
            NULL,
            'Usuário excluído'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_admins
    AFTER INSERT OR UPDATE OR DELETE ON public.admins
    FOR EACH ROW EXECUTE FUNCTION public.audit_admins();

-- Ativar RLS nas tabelas de auditoria
ALTER TABLE public.auditoria_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_login ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_seguranca ENABLE ROW LEVEL SECURITY;

-- Políticas para auditoria (apenas admins podem ver)
CREATE POLICY "Admins can view system audit" ON public.auditoria_sistema
    FOR SELECT TO authenticated
    USING (public.user_has_permission('auditoria_visualizar'));

CREATE POLICY "Admins can view login audit" ON public.auditoria_login
    FOR SELECT TO authenticated
    USING (public.user_has_permission('auditoria_visualizar'));

CREATE POLICY "Admins can view security alerts" ON public.alertas_seguranca
    FOR SELECT TO authenticated
    USING (public.user_has_permission('auditoria_visualizar'));

CREATE POLICY "Admins can manage security alerts" ON public.alertas_seguranca
    FOR ALL TO authenticated
    USING (public.user_has_permission('usuario_gerenciar'));

-- Criar índices para performance (apenas se as tabelas existirem)
DO $$
BEGIN
    -- Índices para auditoria_sistema
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auditoria_sistema' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_usuario_id ON public.auditoria_sistema(usuario_id);
        CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_acao ON public.auditoria_sistema(acao);
        CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_tabela ON public.auditoria_sistema(tabela);
        CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_created_at ON public.auditoria_sistema(created_at);
    END IF;

    -- Índices para auditoria_login
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auditoria_login' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_auditoria_login_usuario_id ON public.auditoria_login(usuario_id);
        CREATE INDEX IF NOT EXISTS idx_auditoria_login_tipo_evento ON public.auditoria_login(tipo_evento);
        CREATE INDEX IF NOT EXISTS idx_auditoria_login_data_hora ON public.auditoria_login(data_hora);
    END IF;

    -- Índices para alertas_seguranca
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alertas_seguranca' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_alertas_seguranca_severidade ON public.alertas_seguranca(severidade);
        CREATE INDEX IF NOT EXISTS idx_alertas_seguranca_resolvido ON public.alertas_seguranca(resolvido);
        CREATE INDEX IF NOT EXISTS idx_alertas_seguranca_created_at ON public.alertas_seguranca(created_at);
    END IF;
END $$;

-- Função para limpeza de logs antigos (manter apenas últimos 6 meses)
CREATE OR REPLACE FUNCTION public.limpar_logs_antigos()
RETURNS VOID AS $$
BEGIN
    -- Limpar auditoria do sistema (manter 6 meses)
    DELETE FROM public.auditoria_sistema 
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- Limpar auditoria de login (manter 1 ano)
    DELETE FROM public.auditoria_login 
    WHERE data_hora < NOW() - INTERVAL '1 year';
    
    -- Limpar alertas resolvidos (manter 3 meses)
    DELETE FROM public.alertas_seguranca 
    WHERE resolvido = true 
    AND resolvido_em < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agendar limpeza automática (executar mensalmente)
-- Nota: Isso seria configurado no cron do sistema ou via pg_cron se disponível
