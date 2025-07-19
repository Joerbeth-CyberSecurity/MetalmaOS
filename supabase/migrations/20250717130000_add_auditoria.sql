-- Tabela de auditoria de login/logout
CREATE TABLE public.auditoria_login (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES public.admins(id) ON DELETE CASCADE,
    nome_usuario VARCHAR(255) NOT NULL,
    email_usuario VARCHAR(255) NOT NULL,
    tipo_evento VARCHAR(20) NOT NULL CHECK (tipo_evento IN ('login', 'logout')),
    ip_address INET,
    user_agent TEXT,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_auditoria_login_user_id ON public.auditoria_login(user_id);
CREATE INDEX idx_auditoria_login_admin_id ON public.auditoria_login(admin_id);
CREATE INDEX idx_auditoria_login_data_hora ON public.auditoria_login(data_hora);
CREATE INDEX idx_auditoria_login_tipo_evento ON public.auditoria_login(tipo_evento);

-- Enable RLS
ALTER TABLE public.auditoria_login ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (apenas admins podem ver)
CREATE POLICY "Admins can view all audit records" ON public.auditoria_login FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.admins 
        WHERE admins.user_id = auth.uid() 
        AND admins.tipo_usuario = 'admin'
    )
);

CREATE POLICY "Admins can insert audit records" ON public.auditoria_login FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admins 
        WHERE admins.user_id = auth.uid() 
        AND admins.tipo_usuario = 'admin'
    )
); 