-- Script de Rollback das Melhorias de Segurança
-- Execute APENAS se quiser reverter as mudanças
-- Data: 2025-01-20

-- ⚠️ ATENÇÃO: Este script reverte TODAS as melhorias implementadas
-- ⚠️ Execute apenas se tiver certeza de que quer reverter

-- 1. Remover triggers de auditoria
DROP TRIGGER IF EXISTS trigger_audit_clientes ON public.clientes;
DROP TRIGGER IF EXISTS trigger_audit_colaboradores ON public.colaboradores;
DROP TRIGGER IF EXISTS trigger_audit_produtos ON public.produtos;
DROP TRIGGER IF EXISTS trigger_audit_ordens_servico ON public.ordens_servico;
DROP TRIGGER IF EXISTS trigger_audit_admins ON public.admins;

-- 2. Remover funções de auditoria
DROP FUNCTION IF EXISTS public.audit_clientes();
DROP FUNCTION IF EXISTS public.audit_colaboradores();
DROP FUNCTION IF EXISTS public.audit_produtos();
DROP FUNCTION IF EXISTS public.audit_ordens_servico();
DROP FUNCTION IF EXISTS public.audit_admins();

-- 3. Remover funções de segurança
DROP FUNCTION IF EXISTS public.registrar_auditoria(VARCHAR, VARCHAR, UUID, JSONB, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.registrar_login(VARCHAR, JSONB);
DROP FUNCTION IF EXISTS public.criar_alerta_seguranca(VARCHAR, VARCHAR, VARCHAR, TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS public.user_has_permission(TEXT);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.can_manage_users();

-- 4. Remover tabelas de auditoria
DROP TABLE IF EXISTS public.alertas_seguranca CASCADE;
DROP TABLE IF EXISTS public.auditoria_login CASCADE;
DROP TABLE IF EXISTS public.auditoria_sistema CASCADE;

-- 5. Remover tabelas de níveis de acesso
DROP TABLE IF EXISTS public.nivel_permissoes CASCADE;
DROP TABLE IF EXISTS public.permissoes CASCADE;
DROP TABLE IF EXISTS public.niveis_acesso CASCADE;

-- 6. Remover coluna nivel_id da tabela admins
ALTER TABLE public.admins DROP COLUMN IF EXISTS nivel_id;

-- 7. Restaurar políticas RLS originais (mais permissivas)
-- Políticas para admins
DROP POLICY IF EXISTS "Admins can view all admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can manage all admins" ON public.admins;
CREATE POLICY "Authenticated users can view all records" ON public.admins
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.admins
    FOR ALL TO authenticated USING (true);

-- Políticas para clientes
DROP POLICY IF EXISTS "Users can view clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can create clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can update clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete clients" ON public.clientes;
CREATE POLICY "Authenticated users can view all records" ON public.clientes
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.clientes
    FOR ALL TO authenticated USING (true);

-- Políticas para colaboradores
DROP POLICY IF EXISTS "Users can view collaborators" ON public.colaboradores;
DROP POLICY IF EXISTS "Users can create collaborators" ON public.colaboradores;
DROP POLICY IF EXISTS "Users can update collaborators" ON public.colaboradores;
DROP POLICY IF EXISTS "Users can delete collaborators" ON public.colaboradores;
CREATE POLICY "Authenticated users can view all records" ON public.colaboradores
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.colaboradores
    FOR ALL TO authenticated USING (true);

-- Políticas para produtos
DROP POLICY IF EXISTS "Users can view products" ON public.produtos;
DROP POLICY IF EXISTS "Users can create products" ON public.produtos;
DROP POLICY IF EXISTS "Users can update products" ON public.produtos;
DROP POLICY IF EXISTS "Users can delete products" ON public.produtos;
CREATE POLICY "Authenticated users can view all records" ON public.produtos
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.produtos
    FOR ALL TO authenticated USING (true);

-- Políticas para ordens de serviço
DROP POLICY IF EXISTS "Users can view orders" ON public.ordens_servico;
DROP POLICY IF EXISTS "Users can create orders" ON public.ordens_servico;
DROP POLICY IF EXISTS "Users can update orders" ON public.ordens_servico;
DROP POLICY IF EXISTS "Users can delete orders" ON public.ordens_servico;
CREATE POLICY "Authenticated users can view all records" ON public.ordens_servico
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.ordens_servico
    FOR ALL TO authenticated USING (true);

-- Políticas para os_colaboradores
DROP POLICY IF EXISTS "Users can view os_collaborators" ON public.os_colaboradores;
DROP POLICY IF EXISTS "Users can manage os_collaborators" ON public.os_colaboradores;
CREATE POLICY "Authenticated users can view all records" ON public.os_colaboradores
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.os_colaboradores
    FOR ALL TO authenticated USING (true);

-- Políticas para os_produtos
DROP POLICY IF EXISTS "Users can view os_products" ON public.os_produtos;
DROP POLICY IF EXISTS "Users can manage os_products" ON public.os_produtos;
CREATE POLICY "Authenticated users can view all records" ON public.os_produtos
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.os_produtos
    FOR ALL TO authenticated USING (true);

-- Políticas para os_tempo
DROP POLICY IF EXISTS "Users can view os_time" ON public.os_tempo;
DROP POLICY IF EXISTS "Users can manage os_time" ON public.os_tempo;
CREATE POLICY "Authenticated users can view all records" ON public.os_tempo
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.os_tempo
    FOR ALL TO authenticated USING (true);

-- Políticas para retrabalhos
DROP POLICY IF EXISTS "Users can view retrabalhos" ON public.retrabalhos;
DROP POLICY IF EXISTS "Users can manage retrabalhos" ON public.retrabalhos;
CREATE POLICY "Authenticated users can view all records" ON public.retrabalhos
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.retrabalhos
    FOR ALL TO authenticated USING (true);

-- Políticas para configurações
DROP POLICY IF EXISTS "Users can view configurations" ON public.configuracoes;
DROP POLICY IF EXISTS "Users can update configurations" ON public.configuracoes;
CREATE POLICY "Authenticated users can view all records" ON public.configuracoes
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.configuracoes
    FOR ALL TO authenticated USING (true);

-- 8. Remover funções de performance (opcional - mantém os índices)
DROP FUNCTION IF EXISTS public.get_dashboard_stats();
DROP FUNCTION IF EXISTS public.get_financial_metrics(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_monthly_revenue(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_client_revenue(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_product_revenue(DATE, DATE);
DROP FUNCTION IF EXISTS public.cleanup_old_data();

-- 9. Remover índices de performance (opcional)
-- Comentado para manter performance mesmo após rollback
-- DROP INDEX IF EXISTS idx_ordens_servico_status;
-- DROP INDEX IF EXISTS idx_ordens_servico_data_abertura;
-- DROP INDEX IF EXISTS idx_clientes_ativo;
-- DROP INDEX IF EXISTS idx_colaboradores_ativo;
-- DROP INDEX IF EXISTS idx_produtos_ativo;
-- DROP INDEX IF EXISTS idx_os_colaboradores_os_id;
-- DROP INDEX IF EXISTS idx_os_produtos_os_id;
-- DROP INDEX IF EXISTS idx_os_tempo_os_id;
-- DROP INDEX IF EXISTS idx_retrabalhos_os_id;

-- 10. Atualizar estatísticas
ANALYZE public.admins;
ANALYZE public.clientes;
ANALYZE public.colaboradores;
ANALYZE public.produtos;
ANALYZE public.ordens_servico;
ANALYZE public.os_colaboradores;
ANALYZE public.os_produtos;
ANALYZE public.os_tempo;
ANALYZE public.retrabalhos;
ANALYZE public.configuracoes;

-- ✅ ROLLBACK CONCLUÍDO
-- O sistema voltou ao estado anterior às melhorias
-- Todas as funcionalidades originais foram restauradas
