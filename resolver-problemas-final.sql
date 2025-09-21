-- Script para resolver todos os problemas de uma vez
-- Execute este script no SQL Editor do Supabase

-- 1. Primeiro, vamos limpar e recriar as tabelas corretamente
DROP TABLE IF EXISTS public.auditoria_login CASCADE;
DROP TABLE IF EXISTS public.justificativas_os CASCADE;

-- 2. Criar tabela justificativas_os
CREATE TABLE public.justificativas_os (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    os_id UUID NOT NULL,
    tipo TEXT NOT NULL,
    justificativa TEXT NOT NULL,
    data_justificativa TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    colaborador_id UUID NULL,
    tempo_tolerancia_minutos INTEGER NULL,
    excedeu_tolerancia BOOLEAN NOT NULL DEFAULT false
);

-- 3. Criar tabela auditoria_login
CREATE TABLE public.auditoria_login (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    nome_usuario VARCHAR(255),
    email_usuario VARCHAR(255),
    tipo_evento VARCHAR(50) NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Adicionar coluna tempo_tolerancia_pausa na tabela configuracoes
ALTER TABLE public.configuracoes 
ADD COLUMN IF NOT EXISTS tempo_tolerancia_pausa INTEGER DEFAULT 120;

-- 5. Criar índices
CREATE INDEX idx_justificativas_os_os_id ON public.justificativas_os(os_id);
CREATE INDEX idx_auditoria_login_user_id ON public.auditoria_login(user_id);
CREATE INDEX idx_auditoria_login_data_hora ON public.auditoria_login(data_hora);
CREATE INDEX idx_auditoria_login_tipo_evento ON public.auditoria_login(tipo_evento);

-- 6. Habilitar RLS
ALTER TABLE public.justificativas_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_login ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas RLS
CREATE POLICY "justificativas_read" ON public.justificativas_os FOR SELECT USING (true);
CREATE POLICY "justificativas_insert" ON public.justificativas_os FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "justificativas_update" ON public.justificativas_os FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "justificativas_delete" ON public.justificativas_os FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "auditoria_read" ON public.auditoria_login FOR SELECT USING (true);
CREATE POLICY "auditoria_insert" ON public.auditoria_login FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 8. Inserir dados de exemplo
INSERT INTO public.auditoria_login (user_id, nome_usuario, email_usuario, tipo_evento, user_agent, ip_address)
VALUES 
    (gen_random_uuid(), 'João Silva', 'joao@exemplo.com', 'login', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '192.168.1.100'),
    (gen_random_uuid(), 'Maria Santos', 'maria@exemplo.com', 'login', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', '192.168.1.101'),
    (gen_random_uuid(), 'João Silva', 'joao@exemplo.com', 'logout', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '192.168.1.100');

-- 9. Inserir configuração
INSERT INTO public.configuracoes (chave, valor, descricao)
VALUES ('tempo_tolerancia_pausa', '120', 'Tempo de tolerância para pausas em minutos')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;

-- 10. Verificar se tudo foi criado
SELECT 'SUCESSO: Tabelas criadas!' as status;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('justificativas_os', 'auditoria_login')
ORDER BY table_name, ordinal_position;
