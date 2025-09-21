-- Script para limpar políticas RLS duplicadas e reorganizar permissões
-- Data: 2025-01-21

-- 1. Remover todas as políticas RLS existentes para evitar conflitos
DROP POLICY IF EXISTS "Admins can view all admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can insert admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can update admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can delete admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can view login audit" ON public.auditoria_login;
DROP POLICY IF EXISTS "Admins can insert audit records" ON public.auditoria_login;
DROP POLICY IF EXISTS "Admins can view all audit records" ON public.auditoria_login;
DROP POLICY IF EXISTS "Admins can insert audit records" ON public.auditoria_login;

-- 2. Limpar completamente todas as permissões e níveis
DELETE FROM public.nivel_permissoes;
DELETE FROM public.permissoes;
DELETE FROM public.niveis_acesso;

-- 3. Recriar apenas os 3 níveis essenciais
INSERT INTO public.niveis_acesso (nome, descricao, ativo) VALUES
('Administrador', 'Acesso total ao sistema - pode gerenciar tudo', true),
('Gerente', 'Acesso gerencial com algumas limitações - não pode gerenciar usuários', true),
('Colaborador', 'Acesso básico para operações do dia a dia - apenas visualização e gerenciamento de tempo próprio', true);

-- 4. Inserir APENAS as permissões essenciais (20 únicas)
INSERT INTO public.permissoes (nome, descricao, modulo, acao) VALUES
-- Ordens de Serviço
('os_visualizar', 'Visualizar ordens de serviço', 'ordens_servico', 'read'),
('os_criar', 'Criar ordens de serviço', 'ordens_servico', 'create'),
('os_editar', 'Editar ordens de serviço', 'ordens_servico', 'update'),
('os_excluir', 'Excluir ordens de serviço', 'ordens_servico', 'delete'),
('os_gerenciar_tempo', 'Gerenciar tempo de execução', 'ordens_servico', 'manage_time'),

-- Clientes
('cliente_visualizar', 'Visualizar clientes', 'clientes', 'read'),
('cliente_criar', 'Criar clientes', 'clientes', 'create'),
('cliente_editar', 'Editar clientes', 'clientes', 'update'),
('cliente_excluir', 'Excluir clientes', 'clientes', 'delete'),

-- Colaboradores
('colaborador_visualizar', 'Visualizar colaboradores', 'colaboradores', 'read'),
('colaborador_criar', 'Criar colaboradores', 'colaboradores', 'create'),
('colaborador_editar', 'Editar colaboradores', 'colaboradores', 'update'),
('colaborador_excluir', 'Excluir colaboradores', 'colaboradores', 'delete'),

-- Produtos
('produto_visualizar', 'Visualizar produtos', 'produtos', 'read'),
('produto_criar', 'Criar produtos', 'produtos', 'create'),
('produto_editar', 'Editar produtos', 'produtos', 'update'),
('produto_excluir', 'Excluir produtos', 'produtos', 'delete'),

-- Relatórios
('relatorio_visualizar', 'Visualizar relatórios', 'relatorios', 'read'),
('relatorio_exportar', 'Exportar relatórios', 'relatorios', 'export'),
('relatorio_imprimir', 'Imprimir relatórios', 'relatorios', 'print'),

-- Configurações
('config_visualizar', 'Visualizar configurações', 'configuracoes', 'read'),
('config_editar', 'Editar configurações', 'configuracoes', 'update'),

-- Usuários
('usuario_gerenciar', 'Gerenciar usuários', 'usuarios', 'manage'),

-- Auditoria
('auditoria_visualizar', 'Visualizar auditoria', 'auditoria', 'read');

-- 5. Associar permissões aos níveis
-- Administrador: todas as permissões
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'Administrador';

-- Gerente: todas exceto gerenciar usuários
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'Gerente' 
AND p.nome != 'usuario_gerenciar';

-- Colaborador: apenas visualização e gerenciamento de tempo
INSERT INTO public.nivel_permissoes (nivel_id, permissao_id)
SELECT n.id, p.id
FROM public.niveis_acesso n, public.permissoes p
WHERE n.nome = 'Colaborador' 
AND p.nome IN (
    'os_visualizar', 'os_gerenciar_tempo',
    'cliente_visualizar', 'colaborador_visualizar', 'produto_visualizar',
    'relatorio_visualizar'
);

-- 6. Atualizar usuários para usar os novos níveis
UPDATE public.admins 
SET nivel_id = (
    SELECT id FROM public.niveis_acesso 
    WHERE nome = 'Administrador'
)
WHERE nivel_id IS NULL;

-- Mapear usuários baseado no tipo_usuario
UPDATE public.admins 
SET nivel_id = (
    SELECT id FROM public.niveis_acesso 
    WHERE nome = 'Administrador'
)
WHERE tipo_usuario = 'admin';

UPDATE public.admins 
SET nivel_id = (
    SELECT id FROM public.niveis_acesso 
    WHERE nome = 'Gerente'
)
WHERE tipo_usuario IN ('gerente', 'supervisor');

UPDATE public.admins 
SET nivel_id = (
    SELECT id FROM public.niveis_acesso 
    WHERE nome = 'Colaborador'
)
WHERE tipo_usuario IN ('colaborador', 'visualizador');

-- 7. Recriar políticas RLS limpas
-- Políticas para tabela admins
CREATE POLICY "Admins can view all admins" ON public.admins
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins can insert admins" ON public.admins
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can update admins" ON public.admins
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins can delete admins" ON public.admins
    FOR DELETE TO authenticated
    USING (true);

-- Políticas para auditoria_login
CREATE POLICY "Admins can view audit records" ON public.auditoria_login
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins can insert audit records" ON public.auditoria_login
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- 8. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_admins_nivel_id ON public.admins (nivel_id);
CREATE INDEX IF NOT EXISTS idx_nivel_permissoes_nivel_id ON public.nivel_permissoes(nivel_id);
CREATE INDEX IF NOT EXISTS idx_nivel_permissoes_permissao_id ON public.nivel_permissoes (permissao_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_nome ON public.permissoes (nome);

-- 9. Atualizar estatísticas
ANALYZE public.niveis_acesso;
ANALYZE public.permissoes;
ANALYZE public.nivel_permissoes;
ANALYZE public.admins;

-- 10. Verificar resultado final
SELECT 
    'RESULTADO FINAL' as info,
    'Níveis de Acesso' as tipo,
    COUNT(*) as total
FROM public.niveis_acesso
UNION ALL
SELECT 
    'RESULTADO FINAL' as info,
    'Permissões' as tipo,
    COUNT(*) as total
FROM public.permissoes
UNION ALL
SELECT 
    'RESULTADO FINAL' as info,
    'Associações' as tipo,
    COUNT(*) as total
FROM public.nivel_permissoes;

-- 11. Listar permissões por nível
SELECT 
    n.nome as nivel,
    COUNT(np.permissao_id) as total_permissoes,
    STRING_AGG(p.nome, ', ' ORDER BY p.modulo, p.acao) as permissoes
FROM public.niveis_acesso n
LEFT JOIN public.nivel_permissoes np ON n.id = np.nivel_id
LEFT JOIN public.permissoes p ON np.permissao_id = p.id
GROUP BY n.id, n.nome
ORDER BY n.nome;

-- ✅ SISTEMA COMPLETAMENTE LIMPO E ORGANIZADO
