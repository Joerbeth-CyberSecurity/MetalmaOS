-- 1. Criar a tabela 'os_produtos' para armazenar os produtos de cada Ordem de Serviço.
CREATE TABLE public.os_produtos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL,
  produto_id uuid NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL,
  valor_total_item numeric GENERATED ALWAYS AS ((quantidade * valor_unitario)) STORED,
  CONSTRAINT os_produtos_pkey PRIMARY KEY (id),
  CONSTRAINT os_produtos_os_id_fkey FOREIGN KEY (os_id) REFERENCES public.ordens_servico (id) ON DELETE CASCADE,
  CONSTRAINT os_produtos_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos (id)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.os_produtos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para a tabela 'os_produtos'
-- Permite que usuários autenticados visualizem os produtos de uma OS.
CREATE POLICY "Allow authenticated users to read os_produtos"
ON public.os_produtos
FOR SELECT
TO authenticated
USING (true);

-- Permite que usuários autenticados insiram produtos em uma OS.
CREATE POLICY "Allow authenticated users to insert os_produtos"
ON public.os_produtos
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permite que usuários autenticados atualizem os produtos de uma OS.
CREATE POLICY "Allow authenticated users to update os_produtos"
ON public.os_produtos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Permite que usuários autenticados excluam produtos de uma OS.
CREATE POLICY "Allow authenticated users to delete os_produtos"
ON public.os_produtos
FOR DELETE
TO authenticated
USING (true);

-- 2. Adicionar um campo 'valor_servicos' na tabela 'ordens_servico' (opcional)
-- Isso permite adicionar custos de mão de obra ou outros serviços além dos produtos.
ALTER TABLE public.ordens_servico
ADD COLUMN valor_servicos numeric NULL DEFAULT 0;

-- Atualizar a política de escrita para incluir o novo campo.
-- (Se você já tem uma política, pode precisar usar ALTER POLICY em vez de CREATE)
DROP POLICY IF EXISTS "Allow authenticated users to insert orders" ON public.ordens_servico;
CREATE POLICY "Allow authenticated users to insert orders"
ON public.ordens_servico
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update orders" ON public.ordens_servico;
CREATE POLICY "Allow authenticated users to update orders"
ON public.ordens_servico
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true); 