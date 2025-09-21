-- Implementação de políticas RLS granulares por nível de acesso
-- Data: 2025-01-20

-- Primeiro, vamos criar as tabelas de níveis de acesso e permissões se não existirem
CREATE TABLE IF NOT EXISTS public.niveis_acesso (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    modulo VARCHAR(50) NOT NULL,
    acao VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nivel_permissoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nivel_id UUID REFERENCES public.niveis_acesso(id) ON DELETE CASCADE,
    permissao_id UUID REFERENCES public.permissoes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(nivel_id, permissao_id)
);

-- Adicionar coluna nivel_id na tabela admins se não existir
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS nivel_id UUID REFERENCES public.niveis_acesso(id);

-- Inserir níveis de acesso padrão
INSERT INTO public.niveis_acesso (nome, descricao, ativo) VALUES
('admin', 'Administrador completo do sistema', true),
('gerente', 'Gerente com acesso a relatórios e gestão', true),
('supervisor', 'Supervisor com acesso limitado a operações', true),
('colaborador', 'Colaborador com acesso básico', true),
('visualizador', 'Apenas visualização de dados', true)
ON CONFLICT (nome) DO NOTHING;

-- Inserir permissões do sistema
INSERT INTO public.permissoes (nome, descricao, modulo, acao) VALUES
-- Módulo de OS
('os_visualizar', 'Visualizar ordens de serviço', 'ordens_servico', 'read'),
('os_criar', 'Criar ordens de serviço', 'ordens_servico', 'create'),
('os_editar', 'Editar ordens de serviço', 'ordens_servico', 'update'),
('os_excluir', 'Excluir ordens de serviço', 'ordens_servico', 'delete'),
('os_gerenciar_tempo', 'Gerenciar tempo de execução', 'ordens_servico', 'manage_time'),

-- Módulo de Clientes
('cliente_visualizar', 'Visualizar clientes', 'clientes', 'read'),
('cliente_criar', 'Criar clientes', 'clientes', 'create'),
('cliente_editar', 'Editar clientes', 'clientes', 'update'),
('cliente_excluir', 'Excluir clientes', 'clientes', 'delete'),

-- Módulo de Colaboradores
('colaborador_visualizar', 'Visualizar colaboradores', 'colaboradores', 'read'),
('colaborador_criar', 'Criar colaboradores', 'colaboradores', 'create'),
('colaborador_editar', 'Editar colaboradores', 'colaboradores', 'update'),
('colaborador_excluir', 'Excluir colaboradores', 'colaboradores', 'delete'),

-- Módulo de Produtos
('produto_visualizar', 'Visualizar produtos', 'produtos', 'read'),
('produto_criar', 'Criar produtos', 'produtos', 'create'),
('produto_editar', 'Editar produtos', 'produtos', 'update'),
('produto_excluir', 'Excluir produtos', 'produtos', 'delete'),

-- Módulo de Relatórios
('relatorio_visualizar', 'Visualizar relatórios', 'relatorios', 'read'),
('relatorio_exportar', 'Exportar relatórios', 'relatorios', 'export'),
('relatorio_imprimir', 'Imprimir relatórios', 'relatorios', 'print'),

-- Módulo de Configurações
('config_visualizar', 'Visualizar configurações', 'configuracoes', 'read'),
('config_editar', 'Editar configurações', 'configuracoes', 'update'),
('usuario_gerenciar', 'Gerenciar usuários', 'usuarios', 'manage'),
('auditoria_visualizar', 'Visualizar auditoria', 'auditoria', 'read')
ON CONFLICT (nome) DO NOTHING;

-- Associar permissões aos níveis
-- Admin: todas as permissões
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'admin'
ON CONFLICT (nivel_id, permissao_id) DO NOTHING;

-- Gerente: quase todas, exceto gerenciar usuários
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'gerente' 
AND p.nome != 'usuario_gerenciar'
ON CONFLICT (nivel_id, permissao_id) DO NOTHING;

-- Supervisor: operações básicas
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'supervisor' 
AND p.nome IN (
    'os_visualizar', 'os_criar', 'os_editar', 'os_gerenciar_tempo',
    'cliente_visualizar', 'cliente_criar', 'cliente_editar',
    'colaborador_visualizar', 'produto_visualizar',
    'relatorio_visualizar', 'relatorio_exportar', 'relatorio_imprimir'
)
ON CONFLICT (nivel_id, permissao_id) DO NOTHING;

-- Colaborador: apenas visualização e gerenciamento de tempo próprio
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'colaborador' 
AND p.nome IN (
    'os_visualizar', 'os_gerenciar_tempo',
    'cliente_visualizar', 'colaborador_visualizar', 'produto_visualizar',
    'relatorio_visualizar'
)
ON CONFLICT (nivel_id, permissao_id) DO NOTHING;

-- Visualizador: apenas visualização
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'visualizador' 
AND p.acao = 'read'
ON CONFLICT (nivel_id, permissao_id) DO NOTHING;

-- Função para verificar permissão do usuário
CREATE OR REPLACE FUNCTION public.user_has_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_level_id UUID;
    has_permission BOOLEAN := FALSE;
BEGIN
    -- Buscar o nível do usuário atual
    SELECT nivel_id INTO user_level_id
    FROM public.admins
    WHERE user_id = auth.uid();
    
    -- Se não tiver nível definido, usar colaborador como padrão
    IF user_level_id IS NULL THEN
        SELECT id INTO user_level_id
        FROM public.niveis_acesso
        WHERE nome = 'colaborador';
    END IF;
    
    -- Verificar se o nível tem a permissão
    SELECT EXISTS(
        SELECT 1
        FROM public.nivel_permissoes np
        JOIN public.permissoes p ON np.permissao_id = p.id
        WHERE np.nivel_id = user_level_id
        AND p.nome = permission_name
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_level_id UUID;
    is_admin_user BOOLEAN := FALSE;
BEGIN
    SELECT nivel_id INTO user_level_id
    FROM public.admins
    WHERE user_id = auth.uid();
    
    -- Verificar se é admin
    SELECT EXISTS(
        SELECT 1
        FROM public.niveis_acesso
        WHERE id = user_level_id AND nome = 'admin'
    ) INTO is_admin_user;
    
    RETURN is_admin_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se pode gerenciar usuários
CREATE OR REPLACE FUNCTION public.can_manage_users()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.user_has_permission('usuario_gerenciar');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agora vamos remover as políticas antigas e criar as novas
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.admins;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.admins;
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.colaboradores;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.colaboradores;
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.produtos;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.produtos;
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.ordens_servico;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.ordens_servico;
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.os_colaboradores;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.os_colaboradores;
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.os_produtos;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.os_produtos;
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.os_tempo;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.os_tempo;
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.retrabalhos;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.retrabalhos;
DROP POLICY IF EXISTS "Authenticated users can view all records" ON public.configuracoes;
DROP POLICY IF EXISTS "Authenticated users can manage all records" ON public.configuracoes;

-- Políticas para tabela admins
CREATE POLICY "Admins can view all admins" ON public.admins
    FOR SELECT TO authenticated
    USING (public.user_has_permission('usuario_gerenciar'));

CREATE POLICY "Admins can manage all admins" ON public.admins
    FOR ALL TO authenticated
    USING (public.user_has_permission('usuario_gerenciar'));

-- Políticas para clientes
CREATE POLICY "Users can view clients" ON public.clientes
    FOR SELECT TO authenticated
    USING (public.user_has_permission('cliente_visualizar'));

CREATE POLICY "Users can create clients" ON public.clientes
    FOR INSERT TO authenticated
    WITH CHECK (public.user_has_permission('cliente_criar'));

CREATE POLICY "Users can update clients" ON public.clientes
    FOR UPDATE TO authenticated
    USING (public.user_has_permission('cliente_editar'));

CREATE POLICY "Users can delete clients" ON public.clientes
    FOR DELETE TO authenticated
    USING (public.user_has_permission('cliente_excluir'));

-- Políticas para colaboradores
CREATE POLICY "Users can view collaborators" ON public.colaboradores
    FOR SELECT TO authenticated
    USING (public.user_has_permission('colaborador_visualizar'));

CREATE POLICY "Users can create collaborators" ON public.colaboradores
    FOR INSERT TO authenticated
    WITH CHECK (public.user_has_permission('colaborador_criar'));

CREATE POLICY "Users can update collaborators" ON public.colaboradores
    FOR UPDATE TO authenticated
    USING (public.user_has_permission('colaborador_editar'));

CREATE POLICY "Users can delete collaborators" ON public.colaboradores
    FOR DELETE TO authenticated
    USING (public.user_has_permission('colaborador_excluir'));

-- Políticas para produtos
CREATE POLICY "Users can view products" ON public.produtos
    FOR SELECT TO authenticated
    USING (public.user_has_permission('produto_visualizar'));

CREATE POLICY "Users can create products" ON public.produtos
    FOR INSERT TO authenticated
    WITH CHECK (public.user_has_permission('produto_criar'));

CREATE POLICY "Users can update products" ON public.produtos
    FOR UPDATE TO authenticated
    USING (public.user_has_permission('produto_editar'));

CREATE POLICY "Users can delete products" ON public.produtos
    FOR DELETE TO authenticated
    USING (public.user_has_permission('produto_excluir'));

-- Políticas para ordens de serviço
CREATE POLICY "Users can view orders" ON public.ordens_servico
    FOR SELECT TO authenticated
    USING (public.user_has_permission('os_visualizar'));

CREATE POLICY "Users can create orders" ON public.ordens_servico
    FOR INSERT TO authenticated
    WITH CHECK (public.user_has_permission('os_criar'));

CREATE POLICY "Users can update orders" ON public.ordens_servico
    FOR UPDATE TO authenticated
    USING (public.user_has_permission('os_editar'));

CREATE POLICY "Users can delete orders" ON public.ordens_servico
    FOR DELETE TO authenticated
    USING (public.user_has_permission('os_excluir'));

-- Políticas para os_colaboradores
CREATE POLICY "Users can view os_collaborators" ON public.os_colaboradores
    FOR SELECT TO authenticated
    USING (public.user_has_permission('os_visualizar'));

CREATE POLICY "Users can manage os_collaborators" ON public.os_colaboradores
    FOR ALL TO authenticated
    USING (public.user_has_permission('os_editar'));

-- Políticas para os_produtos
CREATE POLICY "Users can view os_products" ON public.os_produtos
    FOR SELECT TO authenticated
    USING (public.user_has_permission('os_visualizar'));

CREATE POLICY "Users can manage os_products" ON public.os_produtos
    FOR ALL TO authenticated
    USING (public.user_has_permission('os_editar'));

-- Políticas para os_tempo
CREATE POLICY "Users can view os_time" ON public.os_tempo
    FOR SELECT TO authenticated
    USING (public.user_has_permission('os_visualizar'));

CREATE POLICY "Users can manage os_time" ON public.os_tempo
    FOR ALL TO authenticated
    USING (public.user_has_permission('os_gerenciar_tempo'));

-- Políticas para retrabalhos
CREATE POLICY "Users can view retrabalhos" ON public.retrabalhos
    FOR SELECT TO authenticated
    USING (public.user_has_permission('os_visualizar'));

CREATE POLICY "Users can manage retrabalhos" ON public.retrabalhos
    FOR ALL TO authenticated
    USING (public.user_has_permission('os_editar'));

-- Políticas para configurações
CREATE POLICY "Users can view configurations" ON public.configuracoes
    FOR SELECT TO authenticated
    USING (public.user_has_permission('config_visualizar'));

CREATE POLICY "Users can update configurations" ON public.configuracoes
    FOR UPDATE TO authenticated
    USING (public.user_has_permission('config_editar'));

-- Políticas para níveis de acesso
CREATE POLICY "Admins can view access levels" ON public.niveis_acesso
    FOR SELECT TO authenticated
    USING (public.user_has_permission('usuario_gerenciar'));

CREATE POLICY "Admins can manage access levels" ON public.niveis_acesso
    FOR ALL TO authenticated
    USING (public.user_has_permission('usuario_gerenciar'));

-- Políticas para permissões
CREATE POLICY "Admins can view permissions" ON public.permissoes
    FOR SELECT TO authenticated
    USING (public.user_has_permission('usuario_gerenciar'));

-- Políticas para nível_permissões
CREATE POLICY "Admins can view level_permissions" ON public.nivel_permissoes
    FOR SELECT TO authenticated
    USING (public.user_has_permission('usuario_gerenciar'));

CREATE POLICY "Admins can manage level_permissions" ON public.nivel_permissoes
    FOR ALL TO authenticated
    USING (public.user_has_permission('usuario_gerenciar'));

-- Ativar RLS nas novas tabelas
ALTER TABLE public.niveis_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nivel_permissoes ENABLE ROW LEVEL SECURITY;

-- Atualizar usuários existentes para ter nível admin por padrão
UPDATE public.admins 
SET nivel_id = (SELECT id FROM public.niveis_acesso WHERE nome = 'admin')
WHERE nivel_id IS NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_admins_nivel_id ON public.admins(nivel_id);
CREATE INDEX IF NOT EXISTS idx_nivel_permissoes_nivel_id ON public.nivel_permissoes(nivel_id);
CREATE INDEX IF NOT EXISTS idx_nivel_permissoes_permissao_id ON public.nivel_permissoes(permissao_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_nome ON public.permissoes(nome);
