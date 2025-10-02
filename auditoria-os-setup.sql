-- Script para criar a tabela de auditoria de ações nas Ordens de Serviço
-- Execute este script no SQL Editor do Supabase Dashboard

-- Tabela de auditoria de ações nas OS
CREATE TABLE IF NOT EXISTS public.auditoria_os (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
    nome_usuario VARCHAR(255) NOT NULL,
    email_usuario VARCHAR(255) NOT NULL,
    acao VARCHAR(50) NOT NULL CHECK (acao IN (
        'criar_os', 
        'editar_os', 
        'excluir_os', 
        'iniciar_os', 
        'reiniciar_os',
        'pausar_os', 
        'parar_os', 
        'finalizar_os', 
        'adicionar_colaborador', 
        'remover_colaborador',
        'cancelar_os',
        'reabrir_os'
    )),
    os_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
    numero_os VARCHAR(20),
    dados_anteriores JSONB, -- Estado anterior da OS/colaborador
    dados_novos JSONB, -- Estado novo da OS/colaborador
    detalhes TEXT, -- Informações adicionais como motivo da parada, justificativa, etc.
    ip_address INET,
    user_agent TEXT,
    data_acao TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_auditoria_os_user_id ON public.auditoria_os(user_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_os_admin_id ON public.auditoria_os(admin_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_os_acao ON public.auditoria_os(acao);
CREATE INDEX IF NOT EXISTS idx_auditoria_os_os_id ON public.auditoria_os(os_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_os_data_acao ON public.auditoria_os(data_acao);
CREATE INDEX IF NOT EXISTS idx_auditoria_os_numero_os ON public.auditoria_os(numero_os);

-- Enable RLS
ALTER TABLE public.auditoria_os ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (apenas admins podem ver)
CREATE POLICY "Admins can view all OS audit records" ON public.auditoria_os FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.admins 
        WHERE admins.user_id = auth.uid() 
        AND admins.tipo_usuario = 'admin'
    )
);

CREATE POLICY "Authenticated users can insert OS audit records" ON public.auditoria_os FOR INSERT TO authenticated WITH CHECK (
    true -- Qualquer usuário autenticado pode inserir registros de auditoria
);

-- Função para registrar auditoria das OS
CREATE OR REPLACE FUNCTION registrar_auditoria_os(
    p_acao VARCHAR,
    p_os_id UUID DEFAULT NULL,
    p_numero_os VARCHAR DEFAULT NULL,
    p_dados_anteriores JSONB DEFAULT NULL,
    p_dados_novos JSONB DEFAULT NULL,
    p_detalhes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_admin_id UUID;
    v_nome_usuario VARCHAR(255);
    v_email_usuario VARCHAR(255);
    v_audit_id UUID;
BEGIN
    -- Obter informações do usuário autenticado
    SELECT auth.uid() INTO v_user_id;
    
    -- Buscar dados do admin
    SELECT id, nome, email 
    INTO v_admin_id, v_nome_usuario, v_email_usuario
    FROM public.admins 
    WHERE user_id = v_user_id;
    
    -- Se não encontrou na tabela admins, usar dados básicos
    IF v_nome_usuario IS NULL THEN
        v_nome_usuario := 'Usuário';
        v_email_usuario := 'usuario@sistema.com';
    END IF;
    
    -- Inserir registro de auditoria
    INSERT INTO public.auditoria_os (
        user_id,
        admin_id,
        nome_usuario,
        email_usuario,
        acao,
        os_id,
        numero_os,
        dados_anteriores,
        dados_novos,
        detalhes
    ) VALUES (
        v_user_id,
        v_admin_id,
        v_nome_usuario,
        v_email_usuario,
        p_acao,
        p_os_id,
        p_numero_os,
        p_dados_anteriores,
        p_dados_novos,
        p_detalhes
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

-- Comentários sobre a tabela
COMMENT ON TABLE public.auditoria_os IS 'Tabela para registrar todas as ações dos usuários nas Ordens de Serviço';
COMMENT ON COLUMN public.auditoria_os.acao IS 'Tipo da ação realizada na OS';
COMMENT ON COLUMN public.auditoria_os.dados_anteriores IS 'Estado anterior da OS antes da modificação';
COMMENT ON COLUMN public.auditoria_os.dados_novos IS 'Estado novo da OS após a modificação';
COMMENT ON COLUMN public.auditoria_os.detalhes IS 'Informações adicionais como motivos, justificativas, etc.';
