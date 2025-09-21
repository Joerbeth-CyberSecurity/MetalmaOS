-- MIGRAÇÃO FINAL - RESOLVER TODOS OS PROBLEMAS DE AUDITORIA
-- Data: 2025-01-20

-- 1. REMOVER TABELAS EXISTENTES (se existirem)
DROP TABLE IF EXISTS public.auditoria_sistema CASCADE;
DROP TABLE IF EXISTS public.auditoria_login CASCADE;
DROP TABLE IF EXISTS public.alertas_seguranca CASCADE;

-- 2. REMOVER FUNÇÕES EXISTENTES (se existirem)
DROP FUNCTION IF EXISTS public.registrar_auditoria(VARCHAR, VARCHAR, UUID, JSONB, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.registrar_login(VARCHAR, JSONB);

-- 3. CRIAR TABELA AUDITORIA_SISTEMA
CREATE TABLE public.auditoria_sistema (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_nome VARCHAR(100) DEFAULT 'Sistema',
    usuario_email VARCHAR(100),
    acao VARCHAR(50) NOT NULL,
    tabela VARCHAR(50),
    registro_id UUID,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address TEXT,
    user_agent TEXT,
    url TEXT,
    detalhes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. CRIAR TABELA AUDITORIA_LOGIN
CREATE TABLE public.auditoria_login (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    tipo_evento VARCHAR(20) NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    detalhes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. CRIAR TABELA ALERTAS_SEGURANCA
CREATE TABLE public.alertas_seguranca (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo_alerta VARCHAR(50) NOT NULL,
    severidade VARCHAR(20) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    usuario_nome VARCHAR(100),
    ip_address TEXT,
    dados_contexto JSONB,
    resolvido BOOLEAN DEFAULT false,
    resolvido_por VARCHAR(100),
    resolvido_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. ATIVAR RLS
ALTER TABLE public.auditoria_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_login ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_seguranca ENABLE ROW LEVEL SECURITY;

-- 7. CRIAR POLÍTICAS DE SEGURANÇA
CREATE POLICY "Allow all for system audit" ON public.auditoria_sistema
    FOR ALL TO authenticated
    USING (true);

CREATE POLICY "Allow all for login audit" ON public.auditoria_login
    FOR ALL TO authenticated
    USING (true);

CREATE POLICY "Allow all for security alerts" ON public.alertas_seguranca
    FOR ALL TO authenticated
    USING (true);

-- 8. CRIAR ÍNDICES
CREATE INDEX idx_auditoria_sistema_acao ON public.auditoria_sistema(acao);
CREATE INDEX idx_auditoria_sistema_tabela ON public.auditoria_sistema(tabela);
CREATE INDEX idx_auditoria_sistema_created_at ON public.auditoria_sistema(created_at);

CREATE INDEX idx_auditoria_login_tipo_evento ON public.auditoria_login(tipo_evento);
CREATE INDEX idx_auditoria_login_created_at ON public.auditoria_login(created_at);

CREATE INDEX idx_alertas_seguranca_severidade ON public.alertas_seguranca(severidade);
CREATE INDEX idx_alertas_seguranca_resolvido ON public.alertas_seguranca(resolvido);
CREATE INDEX idx_alertas_seguranca_created_at ON public.alertas_seguranca(created_at);

-- 9. CRIAR FUNÇÃO REGISTRAR_AUDITORIA
CREATE OR REPLACE FUNCTION public.registrar_auditoria(
    p_acao VARCHAR(50),
    p_tabela VARCHAR(50) DEFAULT NULL,
    p_registro_id UUID DEFAULT NULL,
    p_dados_anteriores JSONB DEFAULT NULL,
    p_dados_novos JSONB DEFAULT NULL,
    p_detalhes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.auditoria_sistema (
        acao,
        tabela,
        registro_id,
        dados_anteriores,
        dados_novos,
        detalhes
    ) VALUES (
        p_acao,
        p_tabela,
        p_registro_id,
        p_dados_anteriores,
        p_dados_novos,
        p_detalhes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. CRIAR FUNÇÃO REGISTRAR_LOGIN
CREATE OR REPLACE FUNCTION public.registrar_login(
    p_tipo_evento VARCHAR(20),
    p_detalhes JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.auditoria_login (
        tipo_evento,
        detalhes
    ) VALUES (
        p_tipo_evento,
        p_detalhes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. INSERIR DADOS DE TESTE
INSERT INTO public.auditoria_sistema (acao, tabela, detalhes) 
VALUES ('SYSTEM_INIT', 'auditoria_sistema', 'Sistema de auditoria inicializado com sucesso');

INSERT INTO public.auditoria_login (tipo_evento, detalhes) 
VALUES ('SYSTEM_INIT', '{"status": "sistema_inicializado"}');

INSERT INTO public.alertas_seguranca (tipo_alerta, severidade, titulo, descricao) 
VALUES ('SYSTEM_INIT', 'LOW', 'Sistema Inicializado', 'Sistema de auditoria foi inicializado com sucesso');

-- 12. ATUALIZAR ESTATÍSTICAS
ANALYZE public.auditoria_sistema;
ANALYZE public.auditoria_login;
ANALYZE public.alertas_seguranca;

-- ✅ SISTEMA DE AUDITORIA COMPLETO E FUNCIONANDO
