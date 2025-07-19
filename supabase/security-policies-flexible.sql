-- ========================================
-- POLÍTICAS DE SEGURANÇA FLEXÍVEIS - METALMA OS
-- ========================================

-- 1. REMOVER POLÍTICAS RESTRITIVAS
DROP POLICY IF EXISTS "Admin users can view admins" ON public.admins;
DROP POLICY IF EXISTS "Admin users can manage admins" ON public.admins;
DROP POLICY IF EXISTS "Authenticated users can view clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admin users can manage clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can view colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Admin users can manage colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Authenticated users can view produtos" ON public.produtos;
DROP POLICY IF EXISTS "Admin users can manage produtos" ON public.produtos;
DROP POLICY IF EXISTS "Authenticated users can view ordens_servico" ON public.ordens_servico;
DROP POLICY IF EXISTS "Authenticated users can manage ordens_servico" ON public.ordens_servico;
DROP POLICY IF EXISTS "Admin users can view configuracoes" ON public.configuracoes;
DROP POLICY IF EXISTS "Admin users can manage configuracoes" ON public.configuracoes;

-- 2. POLÍTICAS FLEXÍVEIS PARA ADMINS
-- Permitir que usuários autenticados vejam admins (para verificar se é admin)
CREATE POLICY "Authenticated users can view admins" ON public.admins 
FOR SELECT TO authenticated 
USING (true);

-- Permitir que admins gerenciem admins
CREATE POLICY "Admin users can manage admins" ON public.admins 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND tipo_usuario = 'admin'
  )
);

-- 3. POLÍTICAS FLEXÍVEIS PARA CLIENTES
-- Todos os usuários autenticados podem ver e gerenciar clientes
CREATE POLICY "Authenticated users can manage clientes" ON public.clientes 
FOR ALL TO authenticated 
USING (true);

-- 4. POLÍTICAS FLEXÍVEIS PARA COLABORADORES
-- Todos os usuários autenticados podem ver e gerenciar colaboradores
CREATE POLICY "Authenticated users can manage colaboradores" ON public.colaboradores 
FOR ALL TO authenticated 
USING (true);

-- 5. POLÍTICAS FLEXÍVEIS PARA PRODUTOS
-- Todos os usuários autenticados podem ver e gerenciar produtos
CREATE POLICY "Authenticated users can manage produtos" ON public.produtos 
FOR ALL TO authenticated 
USING (true);

-- 6. POLÍTICAS FLEXÍVEIS PARA ORDENS DE SERVIÇO
-- Todos os usuários autenticados podem ver e gerenciar ordens de serviço
CREATE POLICY "Authenticated users can manage ordens_servico" ON public.ordens_servico 
FOR ALL TO authenticated 
USING (true);

-- 7. POLÍTICAS FLEXÍVEIS PARA CONFIGURAÇÕES
-- Todos os usuários autenticados podem ver configurações
CREATE POLICY "Authenticated users can view configuracoes" ON public.configuracoes 
FOR SELECT TO authenticated 
USING (true);

-- Apenas admins podem gerenciar configurações
CREATE POLICY "Admin users can manage configuracoes" ON public.configuracoes 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND tipo_usuario = 'admin'
  )
);

-- 8. POLÍTICAS PARA TABELAS RELACIONADAS
-- OS Colaboradores
CREATE POLICY "Authenticated users can manage os_colaboradores" ON public.os_colaboradores 
FOR ALL TO authenticated 
USING (true);

-- OS Produtos
CREATE POLICY "Authenticated users can manage os_produtos" ON public.os_produtos 
FOR ALL TO authenticated 
USING (true);

-- OS Tempo
CREATE POLICY "Authenticated users can manage os_tempo" ON public.os_tempo 
FOR ALL TO authenticated 
USING (true);

-- Retrabalhos
CREATE POLICY "Authenticated users can manage retrabalhos" ON public.retrabalhos 
FOR ALL TO authenticated 
USING (true);

-- 9. FUNÇÃO DE LOG DE AUDITORIA (MANTIDA)
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  event_details JSONB,
  user_id UUID DEFAULT auth.uid()
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.auditoria_login (
    user_id,
    nome_usuario,
    email_usuario,
    tipo_evento,
    data_hora,
    user_agent,
    ip_address,
    event_details
  ) VALUES (
    user_id,
    (SELECT nome FROM public.admins WHERE user_id = user_id LIMIT 1),
    (SELECT email FROM auth.users WHERE id = user_id),
    event_type,
    NOW(),
    current_setting('request.headers')::json->>'user-agent',
    current_setting('request.headers')::json->>'x-forwarded-for',
    event_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. TRIGGER PARA AUDITORIA (MANTIDO)
CREATE OR REPLACE FUNCTION public.audit_sensitive_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log de alterações em admins
  IF TG_TABLE_NAME = 'admins' THEN
    PERFORM public.log_security_event(
      'ADMIN_MODIFIED',
      jsonb_build_object(
        'action', TG_OP,
        'old_data', to_jsonb(OLD),
        'new_data', to_jsonb(NEW),
        'table', TG_TABLE_NAME
      )
    );
  END IF;
  
  -- Log de alterações em configurações
  IF TG_TABLE_NAME = 'configuracoes' THEN
    PERFORM public.log_security_event(
      'CONFIG_MODIFIED',
      jsonb_build_object(
        'action', TG_OP,
        'old_data', to_jsonb(OLD),
        'new_data', to_jsonb(NEW),
        'table', TG_TABLE_NAME
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. APLICAR TRIGGERS (MANTIDO)
DROP TRIGGER IF EXISTS audit_admins_changes ON public.admins;
CREATE TRIGGER audit_admins_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

DROP TRIGGER IF EXISTS audit_configuracoes_changes ON public.configuracoes;
CREATE TRIGGER audit_configuracoes_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.configuracoes
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

-- 12. FUNÇÃO DE VALIDAÇÃO (MANTIDA)
CREATE OR REPLACE FUNCTION public.validate_input(
  input_text TEXT,
  max_length INTEGER DEFAULT 1000
)
RETURNS TEXT AS $$
BEGIN
  IF input_text IS NULL THEN
    RAISE EXCEPTION 'Input não pode ser nulo';
  END IF;
  
  IF LENGTH(input_text) > max_length THEN
    RAISE EXCEPTION 'Input excede o tamanho máximo permitido';
  END IF;
  
  IF input_text ~* '<script|javascript:|on\w+\s*=|data:text/html|vbscript:' THEN
    RAISE EXCEPTION 'Input contém conteúdo não permitido';
  END IF;
  
  RETURN TRIM(input_text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. FUNÇÃO DE RATE LIMITING (MANTIDA)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  user_id UUID,
  action_type TEXT,
  max_requests INTEGER DEFAULT 100,
  window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
  request_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM public.auditoria_login
  WHERE user_id = check_rate_limit.user_id
    AND tipo_evento = action_type
    AND data_hora > NOW() - INTERVAL '1 minute' * window_minutes;
  
  RETURN request_count < max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. ATIVAR RLS EM TODAS AS TABELAS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_tempo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retrabalhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- 15. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_auditoria_login_user_id ON public.auditoria_login(user_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_data_hora ON public.auditoria_login(data_hora);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_tipo_evento ON public.auditoria_login(tipo_evento);

-- 16. VERIFICAR SE TUDO FOI APLICADO
SELECT 'Políticas de segurança flexíveis aplicadas com sucesso!' as status; 