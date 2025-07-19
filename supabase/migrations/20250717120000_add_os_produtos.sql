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

-- Tabelas para Níveis de Acesso
CREATE TABLE public.niveis_acesso (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.permissoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT,
    modulo VARCHAR(30) NOT NULL, -- 'usuarios', 'ordens_servico', 'relatorios', etc.
    acao VARCHAR(30) NOT NULL, -- 'criar', 'editar', 'excluir', 'visualizar'
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.nivel_permissoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nivel_id UUID REFERENCES public.niveis_acesso(id) ON DELETE CASCADE,
    permissao_id UUID REFERENCES public.permissoes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(nivel_id, permissao_id)
);

-- Adicionar coluna nivel_id na tabela admins
ALTER TABLE public.admins ADD COLUMN nivel_id UUID REFERENCES public.niveis_acesso(id);

-- Enable RLS nas novas tabelas
ALTER TABLE public.niveis_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nivel_permissoes ENABLE ROW LEVEL SECURITY;

-- Create policies para as novas tabelas
CREATE POLICY "Authenticated users can view all records" ON public.niveis_acesso FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.niveis_acesso FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all records" ON public.permissoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.permissoes FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all records" ON public.nivel_permissoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.nivel_permissoes FOR ALL TO authenticated USING (true);

-- Create triggers para update_updated_at
CREATE TRIGGER update_niveis_acesso_updated_at
    BEFORE UPDATE ON public.niveis_acesso
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_permissoes_updated_at
    BEFORE UPDATE ON public.permissoes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir níveis padrão
INSERT INTO public.niveis_acesso (nome, descricao) VALUES
('Administrador', 'Acesso total ao sistema'),
('Gerente', 'Acesso gerencial com algumas limitações'),
('Colaborador', 'Acesso básico para operações do dia a dia'),
('Visualizador', 'Apenas visualização de dados');

-- Inserir permissões padrão
INSERT INTO public.permissoes (nome, descricao, modulo, acao) VALUES
-- Usuários
('usuarios_criar', 'Criar novos usuários', 'usuarios', 'criar'),
('usuarios_editar', 'Editar usuários existentes', 'usuarios', 'editar'),
('usuarios_excluir', 'Excluir usuários', 'usuarios', 'excluir'),
('usuarios_visualizar', 'Visualizar lista de usuários', 'usuarios', 'visualizar'),

-- Ordens de Serviço
('os_criar', 'Criar novas ordens de serviço', 'ordens_servico', 'criar'),
('os_editar', 'Editar ordens de serviço', 'ordens_servico', 'editar'),
('os_excluir', 'Excluir ordens de serviço', 'ordens_servico', 'excluir'),
('os_visualizar', 'Visualizar ordens de serviço', 'ordens_servico', 'visualizar'),

-- Clientes
('clientes_criar', 'Criar novos clientes', 'clientes', 'criar'),
('clientes_editar', 'Editar clientes', 'clientes', 'editar'),
('clientes_excluir', 'Excluir clientes', 'clientes', 'excluir'),
('clientes_visualizar', 'Visualizar clientes', 'clientes', 'visualizar'),

-- Colaboradores
('colaboradores_criar', 'Criar novos colaboradores', 'colaboradores', 'criar'),
('colaboradores_editar', 'Editar colaboradores', 'colaboradores', 'editar'),
('colaboradores_excluir', 'Excluir colaboradores', 'colaboradores', 'excluir'),
('colaboradores_visualizar', 'Visualizar colaboradores', 'colaboradores', 'visualizar'),

-- Produtos
('produtos_criar', 'Criar novos produtos', 'produtos', 'criar'),
('produtos_editar', 'Editar produtos', 'produtos', 'editar'),
('produtos_excluir', 'Excluir produtos', 'produtos', 'excluir'),
('produtos_visualizar', 'Visualizar produtos', 'produtos', 'visualizar'),

-- Relatórios
('relatorios_visualizar', 'Visualizar relatórios', 'relatorios', 'visualizar'),
('relatorios_exportar', 'Exportar relatórios', 'relatorios', 'exportar'),

-- Configurações
('configuracoes_editar', 'Editar configurações do sistema', 'configuracoes', 'editar'),
('configuracoes_visualizar', 'Visualizar configurações', 'configuracoes', 'visualizar');

-- Atribuir permissões aos níveis
-- Administrador: todas as permissões
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT 
    (SELECT id FROM public.niveis_acesso WHERE nome = 'Administrador'),
    id
FROM public.permissoes;

-- Gerente: todas exceto exclusões e configurações
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT 
    (SELECT id FROM public.niveis_acesso WHERE nome = 'Gerente'),
    id
FROM public.permissoes
WHERE acao != 'excluir' AND modulo != 'configuracoes';

-- Colaborador: apenas visualização e criação/edição de OS
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT 
    (SELECT id FROM public.niveis_acesso WHERE nome = 'Colaborador'),
    id
FROM public.permissoes
WHERE (acao = 'visualizar' AND modulo != 'usuarios') 
   OR (modulo = 'ordens_servico' AND acao IN ('criar', 'editar'));

-- Visualizador: apenas visualização
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT 
    (SELECT id FROM public.niveis_acesso WHERE nome = 'Visualizador'),
    id
FROM public.permissoes
WHERE acao = 'visualizar'; 