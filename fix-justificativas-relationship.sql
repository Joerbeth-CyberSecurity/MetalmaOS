-- Script para corrigir o relacionamento entre ordens_servico e justificativas_os
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Verificar se a tabela justificativas_os existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'justificativas_os') THEN
        -- Criar tabela justificativas_os se não existir
        CREATE TABLE public.justificativas_os (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            os_id UUID NOT NULL,
            tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pausa', 'parada')),
            justificativa TEXT NOT NULL,
            data_justificativa TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            colaborador_id UUID,
            tempo_tolerancia_minutos INTEGER DEFAULT 0,
            excedeu_tolerancia BOOLEAN DEFAULT FALSE,
            notificacao_enviada BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. Adicionar foreign key se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'justificativas_os_os_id_fkey'
    ) THEN
        ALTER TABLE public.justificativas_os 
        ADD CONSTRAINT justificativas_os_os_id_fkey 
        FOREIGN KEY (os_id) REFERENCES public.ordens_servico(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Adicionar foreign key para colaboradores se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'justificativas_os_colaborador_id_fkey'
    ) THEN
        ALTER TABLE public.justificativas_os 
        ADD CONSTRAINT justificativas_os_colaborador_id_fkey 
        FOREIGN KEY (colaborador_id) REFERENCES public.colaboradores(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_justificativas_os_id ON public.justificativas_os(os_id);
CREATE INDEX IF NOT EXISTS idx_justificativas_tipo ON public.justificativas_os(tipo);
CREATE INDEX IF NOT EXISTS idx_justificativas_data ON public.justificativas_os(data_justificativa);

-- 5. Habilitar RLS
ALTER TABLE public.justificativas_os ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS
DROP POLICY IF EXISTS "Permitir leitura de justificativas para usuários autenticados" ON public.justificativas_os;
CREATE POLICY "Permitir leitura de justificativas para usuários autenticados" ON public.justificativas_os
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir inserção de justificativas para usuários autenticados" ON public.justificativas_os;
CREATE POLICY "Permitir inserção de justificativas para usuários autenticados" ON public.justificativas_os
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir atualização de justificativas para usuários autenticados" ON public.justificativas_os;
CREATE POLICY "Permitir atualização de justificativas para usuários autenticados" ON public.justificativas_os
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir exclusão de justificativas para usuários autenticados" ON public.justificativas_os;
CREATE POLICY "Permitir exclusão de justificativas para usuários autenticados" ON public.justificativas_os
    FOR DELETE USING (auth.role() = 'authenticated');

-- 7. Atualizar estatísticas
ANALYZE public.justificativas_os;

-- 8. Verificar se o relacionamento foi criado corretamente
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='justificativas_os';
