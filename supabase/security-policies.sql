-- Políticas de Segurança Avançadas para Metalma OS
-- Este arquivo contém políticas RLS mais rigorosas e configurações de segurança

-- 1. Políticas de Auditoria mais rigorosas
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.admins;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.admins;

-- Políticas para admins - apenas usuários admin podem gerenciar
CREATE POLICY "Admin users can view admins" ON public.admins 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND tipo_usuario = 'admin'
  )
);

CREATE POLICY "Admin users can manage admins" ON public.admins 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND tipo_usuario = 'admin'
  )
);

-- 2. Políticas para clientes - usuários autenticados podem ver, apenas admin pode gerenciar
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.clientes;

CREATE POLICY "Authenticated users can view clientes" ON public.clientes 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Admin users can manage clientes" ON public.clientes 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND tipo_usuario = 'admin'
  )
);

-- 3. Políticas para colaboradores
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.colaboradores;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.colaboradores;

CREATE POLICY "Authenticated users can view colaboradores" ON public.colaboradores 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Admin users can manage colaboradores" ON public.colaboradores 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND tipo_usuario = 'admin'
  )
);

-- 4. Políticas para produtos
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.produtos;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.produtos;

CREATE POLICY "Authenticated users can view produtos" ON public.produtos 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Admin users can manage produtos" ON public.produtos 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND tipo_usuario = 'admin'
  )
);

-- 5. Políticas para ordens de serviço
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.ordens_servico;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.ordens_servico;

CREATE POLICY "Authenticated users can view ordens_servico" ON public.ordens_servico 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can manage ordens_servico" ON public.ordens_servico 
FOR ALL TO authenticated 
USING (true);

-- 6. Políticas para configurações - apenas admin
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.configuracoes;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.configuracoes;

CREATE POLICY "Admin users can view configuracoes" ON public.configuracoes 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND tipo_usuario = 'admin'
  )
);

CREATE POLICY "Admin users can manage configuracoes" ON public.configuracoes 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND tipo_usuario = 'admin'
  )
);

-- 7. Função para log de auditoria de segurança
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

-- 8. Trigger para log automático de alterações sensíveis
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

-- 9. Aplicar trigger nas tabelas sensíveis
DROP TRIGGER IF EXISTS audit_admins_changes ON public.admins;
CREATE TRIGGER audit_admins_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

DROP TRIGGER IF EXISTS audit_configuracoes_changes ON public.configuracoes;
CREATE TRIGGER audit_configuracoes_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.configuracoes
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

-- 10. Função para validar entrada de dados
CREATE OR REPLACE FUNCTION public.validate_input(
  input_text TEXT,
  max_length INTEGER DEFAULT 1000
)
RETURNS TEXT AS $$
BEGIN
  -- Verificar se a entrada não é nula
  IF input_text IS NULL THEN
    RAISE EXCEPTION 'Input não pode ser nulo';
  END IF;
  
  -- Verificar tamanho máximo
  IF LENGTH(input_text) > max_length THEN
    RAISE EXCEPTION 'Input excede o tamanho máximo permitido';
  END IF;
  
  -- Verificar caracteres perigosos
  IF input_text ~* '<script|javascript:|on\w+\s*=|data:text/html|vbscript:' THEN
    RAISE EXCEPTION 'Input contém conteúdo não permitido';
  END IF;
  
  -- Retornar entrada sanitizada
  RETURN TRIM(input_text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Função para rate limiting
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
  -- Contar requisições na janela de tempo
  SELECT COUNT(*) INTO request_count
  FROM public.auditoria_login
  WHERE user_id = check_rate_limit.user_id
    AND tipo_evento = action_type
    AND data_hora > NOW() - INTERVAL '1 minute' * window_minutes;
  
  -- Retornar true se dentro do limite
  RETURN request_count < max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Configurações de segurança adicionais
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

-- 13. Índices para performance e segurança
CREATE INDEX IF NOT EXISTS idx_auditoria_login_user_id ON public.auditoria_login(user_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_data_hora ON public.auditoria_login(data_hora);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_tipo_evento ON public.auditoria_login(tipo_evento);

-- 14. Configurações de conexão segura
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-super-secret-jwt-token-with-at-least-32-characters-long';
ALTER DATABASE postgres SET "app.settings.jwt_expiry" TO '3600';
ALTER DATABASE postgres SET "app.settings.enable_row_level_security" TO 'on'; 