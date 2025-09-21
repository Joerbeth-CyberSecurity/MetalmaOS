-- Script para corrigir a auditoria sem conflitos
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se a tabela auditoria_login existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auditoria_login') THEN
        -- Criar tabela auditoria_login
        CREATE TABLE public.auditoria_login (
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
        
        -- Criar índices
        CREATE INDEX idx_auditoria_login_user_id ON public.auditoria_login(user_id);
        CREATE INDEX idx_auditoria_login_data_hora ON public.auditoria_login(data_hora);
        CREATE INDEX idx_auditoria_login_tipo_evento ON public.auditoria_login(tipo_evento);
        
        -- Habilitar RLS
        ALTER TABLE public.auditoria_login ENABLE ROW LEVEL SECURITY;
        
        -- Criar políticas (usando IF NOT EXISTS)
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auditoria_login' AND policyname = 'Enable read access for all users') THEN
                CREATE POLICY "Enable read access for all users" ON public.auditoria_login FOR SELECT USING (true);
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auditoria_login' AND policyname = 'Enable insert for authenticated users') THEN
                CREATE POLICY "Enable insert for authenticated users" ON public.auditoria_login FOR INSERT WITH CHECK (auth.role() = 'authenticated');
            END IF;
        END $$;
        
        -- Inserir dados de exemplo
        INSERT INTO public.auditoria_login (user_id, nome_usuario, email_usuario, tipo_evento, user_agent, ip_address)
        VALUES 
            (gen_random_uuid(), 'João Silva', 'joao@exemplo.com', 'login', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '192.168.1.100'),
            (gen_random_uuid(), 'Maria Santos', 'maria@exemplo.com', 'login', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', '192.168.1.101'),
            (gen_random_uuid(), 'João Silva', 'joao@exemplo.com', 'logout', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '192.168.1.100')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Tabela auditoria_login criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela auditoria_login já existe.';
    END IF;
END $$;

-- 2. Verificar se a tabela justificativas_os existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'justificativas_os') THEN
        -- Criar tabela justificativas_os
        CREATE TABLE public.justificativas_os (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            os_id UUID NOT NULL,
            tipo TEXT NOT NULL,
            justificativa TEXT NOT NULL,
            data_justificativa TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            colaborador_id UUID NULL,
            tempo_tolerancia_minutos INTEGER NULL,
            excedeu_tolerancia BOOLEAN NOT NULL DEFAULT false,
            CONSTRAINT justificativas_os_pkey PRIMARY KEY (id),
            CONSTRAINT justificativas_os_colaborador_id_fkey FOREIGN KEY (colaborador_id) REFERENCES public.colaboradores (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT justificativas_os_os_id_fkey FOREIGN KEY (os_id) REFERENCES public.ordens_servico (id) ON UPDATE CASCADE ON DELETE CASCADE
        );
        
        -- Criar índices
        CREATE INDEX justificativas_os_os_id_idx ON public.justificativas_os(os_id);
        
        -- Habilitar RLS
        ALTER TABLE public.justificativas_os ENABLE ROW LEVEL SECURITY;
        
        -- Criar políticas
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'justificativas_os' AND policyname = 'Enable read access for all users') THEN
                CREATE POLICY "Enable read access for all users" ON public.justificativas_os FOR SELECT USING (true);
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'justificativas_os' AND policyname = 'Enable insert for authenticated users') THEN
                CREATE POLICY "Enable insert for authenticated users" ON public.justificativas_os FOR INSERT WITH CHECK (auth.role() = 'authenticated');
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'justificativas_os' AND policyname = 'Enable update for authenticated users') THEN
                CREATE POLICY "Enable update for authenticated users" ON public.justificativas_os FOR UPDATE USING (auth.role() = 'authenticated');
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'justificativas_os' AND policyname = 'Enable delete for authenticated users') THEN
                CREATE POLICY "Enable delete for authenticated users" ON public.justificativas_os FOR DELETE USING (auth.role() = 'authenticated');
            END IF;
        END $$;
        
        RAISE NOTICE 'Tabela justificativas_os criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela justificativas_os já existe.';
    END IF;
END $$;

-- 3. Verificar se a coluna tempo_tolerancia_pausa existe na tabela configuracoes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes' AND column_name = 'tempo_tolerancia_pausa') THEN
        -- Adicionar coluna tempo_tolerancia_pausa
        ALTER TABLE public.configuracoes ADD COLUMN tempo_tolerancia_pausa INTEGER DEFAULT 120;
        
        -- Inserir valor padrão se não existir
        INSERT INTO public.configuracoes (chave, valor, descricao)
        VALUES ('tempo_tolerancia_pausa', '120', 'Tempo de tolerância para pausas em minutos')
        ON CONFLICT (chave) DO NOTHING;
        
        RAISE NOTICE 'Coluna tempo_tolerancia_pausa adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna tempo_tolerancia_pausa já existe.';
    END IF;
END $$;

-- 4. Verificar estrutura final
SELECT 'Estrutura das tabelas criadas:' as status;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('justificativas_os', 'auditoria_login', 'configuracoes')
ORDER BY table_name, ordinal_position;
