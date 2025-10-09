-- Script para criar tabela de colaboradores por produto específico da OS
-- Esta tabela permite associar colaboradores a produtos específicos dentro de uma OS

-- Criar tabela para colaboradores por produto
CREATE TABLE IF NOT EXISTS public.os_colaboradores_produtos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos(id),
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id),
    data_inicio TIMESTAMP WITH TIME ZONE,
    data_fim TIMESTAMP WITH TIME ZONE,
    horas_trabalhadas DECIMAL(8,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_os_colaboradores_produtos_os_id ON public.os_colaboradores_produtos(os_id);
CREATE INDEX IF NOT EXISTS idx_os_colaboradores_produtos_produto_id ON public.os_colaboradores_produtos(produto_id);
CREATE INDEX IF NOT EXISTS idx_os_colaboradores_produtos_colaborador_id ON public.os_colaboradores_produtos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_os_colaboradores_produtos_ativo ON public.os_colaboradores_produtos(ativo);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.os_colaboradores_produtos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para a tabela 'os_colaboradores_produtos'
-- Permite que usuários autenticados visualizem os colaboradores por produto
CREATE POLICY "Allow authenticated users to read os_colaboradores_produtos"
ON public.os_colaboradores_produtos
FOR SELECT
TO authenticated
USING (true);

-- Permite que usuários autenticados insiram colaboradores por produto
CREATE POLICY "Allow authenticated users to insert os_colaboradores_produtos"
ON public.os_colaboradores_produtos
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permite que usuários autenticados atualizem os colaboradores por produto
CREATE POLICY "Allow authenticated users to update os_colaboradores_produtos"
ON public.os_colaboradores_produtos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Permite que usuários autenticados excluam colaboradores por produto
CREATE POLICY "Allow authenticated users to delete os_colaboradores_produtos"
ON public.os_colaboradores_produtos
FOR DELETE
TO authenticated
USING (true);

-- Comentários para documentar a tabela
COMMENT ON TABLE public.os_colaboradores_produtos IS 'Tabela para associar colaboradores a produtos específicos dentro de uma OS';
COMMENT ON COLUMN public.os_colaboradores_produtos.os_id IS 'ID da Ordem de Serviço';
COMMENT ON COLUMN public.os_colaboradores_produtos.produto_id IS 'ID do produto específico';
COMMENT ON COLUMN public.os_colaboradores_produtos.colaborador_id IS 'ID do colaborador';
COMMENT ON COLUMN public.os_colaboradores_produtos.data_inicio IS 'Data de início do trabalho no produto';
COMMENT ON COLUMN public.os_colaboradores_produtos.data_fim IS 'Data de fim do trabalho no produto';
COMMENT ON COLUMN public.os_colaboradores_produtos.horas_trabalhadas IS 'Horas trabalhadas no produto específico';

-- Verificar se a tabela foi criada corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'os_colaboradores_produtos'
ORDER BY ordinal_position;
