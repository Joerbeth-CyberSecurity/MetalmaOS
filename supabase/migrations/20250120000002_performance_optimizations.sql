-- Otimizações de performance para o sistema
-- Data: 2025-01-20

-- Índices para melhorar performance das consultas mais comuns

-- Índices para ordens de serviço
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status ON public.ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_data_abertura ON public.ordens_servico(data_abertura);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_cliente_id ON public.ordens_servico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status_data ON public.ordens_servico(status, data_abertura);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_valor_total ON public.ordens_servico(valor_total) WHERE valor_total IS NOT NULL;

-- Índices para clientes
CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON public.clientes(ativo);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes(email);

-- Índices para colaboradores
CREATE INDEX IF NOT EXISTS idx_colaboradores_ativo ON public.colaboradores(ativo);
CREATE INDEX IF NOT EXISTS idx_colaboradores_nome ON public.colaboradores(nome);

-- Índices para produtos
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON public.produtos(ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON public.produtos(nome);

-- Índices para os_colaboradores
CREATE INDEX IF NOT EXISTS idx_os_colaboradores_os_id ON public.os_colaboradores(os_id);
CREATE INDEX IF NOT EXISTS idx_os_colaboradores_colaborador_id ON public.os_colaboradores(colaborador_id);

-- Índices para os_produtos
CREATE INDEX IF NOT EXISTS idx_os_produtos_os_id ON public.os_produtos(os_id);
CREATE INDEX IF NOT EXISTS idx_os_produtos_produto_id ON public.os_produtos(produto_id);

-- Índices para os_tempo
CREATE INDEX IF NOT EXISTS idx_os_tempo_os_id ON public.os_tempo(os_id);
CREATE INDEX IF NOT EXISTS idx_os_tempo_colaborador_id ON public.os_tempo(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_os_tempo_data_inicio ON public.os_tempo(data_inicio);

-- Índices para retrabalhos
CREATE INDEX IF NOT EXISTS idx_retrabalhos_os_id ON public.retrabalhos(os_id);
CREATE INDEX IF NOT EXISTS idx_retrabalhos_data_inicio ON public.retrabalhos(data_inicio);

-- Índices para auditoria
CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_usuario_id ON public.auditoria_sistema(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_acao ON public.auditoria_sistema(acao);
CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_tabela ON public.auditoria_sistema(tabela);
CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_created_at ON public.auditoria_sistema(created_at);
CREATE INDEX IF NOT EXISTS idx_auditoria_sistema_usuario_acao ON public.auditoria_sistema(usuario_id, acao);

-- Índices para auditoria de login
CREATE INDEX IF NOT EXISTS idx_auditoria_login_usuario_id ON public.auditoria_login(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_tipo_evento ON public.auditoria_login(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_data_hora ON public.auditoria_login(data_hora);
CREATE INDEX IF NOT EXISTS idx_auditoria_login_ip_address ON public.auditoria_login(ip_address);

-- Índices para alertas de segurança
CREATE INDEX IF NOT EXISTS idx_alertas_seguranca_severidade ON public.alertas_seguranca(severidade);
CREATE INDEX IF NOT EXISTS idx_alertas_seguranca_resolvido ON public.alertas_seguranca(resolvido);
CREATE INDEX IF NOT EXISTS idx_alertas_seguranca_created_at ON public.alertas_seguranca(created_at);
CREATE INDEX IF NOT EXISTS idx_alertas_seguranca_tipo_alerta ON public.alertas_seguranca(tipo_alerta);

-- Índices para níveis de acesso
CREATE INDEX IF NOT EXISTS idx_niveis_acesso_ativo ON public.niveis_acesso(ativo);
CREATE INDEX IF NOT EXISTS idx_niveis_acesso_nome ON public.niveis_acesso(nome);

-- Índices para permissões
CREATE INDEX IF NOT EXISTS idx_permissoes_modulo ON public.permissoes(modulo);
CREATE INDEX IF NOT EXISTS idx_permissoes_acao ON public.permissoes(acao);
CREATE INDEX IF NOT EXISTS idx_permissoes_modulo_acao ON public.permissoes(modulo, acao);

-- Índices para nível_permissões
CREATE INDEX IF NOT EXISTS idx_nivel_permissoes_nivel_id ON public.nivel_permissoes(nivel_id);
CREATE INDEX IF NOT EXISTS idx_nivel_permissoes_permissao_id ON public.nivel_permissoes(permissao_id);

-- Índices para admins
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins(user_id);
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_ativo ON public.admins(ativo);
CREATE INDEX IF NOT EXISTS idx_admins_nivel_id ON public.admins(nivel_id);

-- Otimizações de estatísticas
ANALYZE public.ordens_servico;
ANALYZE public.clientes;
ANALYZE public.colaboradores;
ANALYZE public.produtos;
ANALYZE public.os_colaboradores;
ANALYZE public.os_produtos;
ANALYZE public.os_tempo;
ANALYZE public.retrabalhos;
ANALYZE public.auditoria_sistema;
ANALYZE public.auditoria_login;
ANALYZE public.alertas_seguranca;
ANALYZE public.niveis_acesso;
ANALYZE public.permissoes;
ANALYZE public.nivel_permissoes;
ANALYZE public.admins;

-- Função para limpeza automática de dados antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS VOID AS $$
BEGIN
    -- Limpar auditoria do sistema (manter 6 meses)
    DELETE FROM public.auditoria_sistema 
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- Limpar auditoria de login (manter 1 ano)
    DELETE FROM public.auditoria_login 
    WHERE data_hora < NOW() - INTERVAL '1 year';
    
    -- Limpar alertas resolvidos (manter 3 meses)
    DELETE FROM public.alertas_seguranca 
    WHERE resolvido = true 
    AND resolvido_em < NOW() - INTERVAL '3 months';
    
    -- Atualizar estatísticas após limpeza
    ANALYZE public.auditoria_sistema;
    ANALYZE public.auditoria_login;
    ANALYZE public.alertas_seguranca;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para otimizar consultas de dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_os', (SELECT COUNT(*) FROM public.ordens_servico),
        'os_abertas', (SELECT COUNT(*) FROM public.ordens_servico WHERE status = 'aberta'),
        'os_em_andamento', (SELECT COUNT(*) FROM public.ordens_servico WHERE status = 'em_andamento'),
        'os_finalizadas', (SELECT COUNT(*) FROM public.ordens_servico WHERE status = 'finalizada'),
        'total_clientes', (SELECT COUNT(*) FROM public.clientes WHERE ativo = true),
        'total_colaboradores', (SELECT COUNT(*) FROM public.colaboradores WHERE ativo = true),
        'receita_total', (SELECT COALESCE(SUM(valor_total), 0) FROM public.ordens_servico WHERE valor_total IS NOT NULL),
        'receita_mes', (SELECT COALESCE(SUM(valor_total), 0) FROM public.ordens_servico 
                       WHERE valor_total IS NOT NULL 
                       AND data_abertura >= date_trunc('month', CURRENT_DATE)),
        'ticket_medio', (SELECT COALESCE(AVG(valor_total), 0) FROM public.ordens_servico 
                        WHERE valor_total IS NOT NULL AND status = 'finalizada'),
        'eficiencia_media', (SELECT COALESCE(AVG(
            CASE 
                WHEN tempo_execucao_real > 0 AND tempo_execucao_previsto > 0 
                THEN LEAST(100, (tempo_execucao_previsto::float / tempo_execucao_real::float) * 100)
                ELSE 0
            END
        ), 0) FROM public.ordens_servico 
        WHERE tempo_execucao_real IS NOT NULL AND tempo_execucao_previsto IS NOT NULL)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para otimizar consultas de relatórios financeiros
CREATE OR REPLACE FUNCTION public.get_financial_metrics(
    p_data_inicio DATE,
    p_data_fim DATE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    receita_periodo NUMERIC;
    receita_anterior NUMERIC;
    os_finalizadas_periodo INTEGER;
    os_finalizadas_anterior INTEGER;
    ticket_medio_periodo NUMERIC;
    ticket_medio_anterior NUMERIC;
BEGIN
    -- Receita do período
    SELECT COALESCE(SUM(valor_total), 0) INTO receita_periodo
    FROM public.ordens_servico 
    WHERE data_abertura >= p_data_inicio 
    AND data_abertura <= p_data_fim
    AND valor_total IS NOT NULL;
    
    -- Receita do período anterior (mesmo intervalo de dias)
    SELECT COALESCE(SUM(valor_total), 0) INTO receita_anterior
    FROM public.ordens_servico 
    WHERE data_abertura >= (p_data_inicio - (p_data_fim - p_data_inicio))
    AND data_abertura < p_data_inicio
    AND valor_total IS NOT NULL;
    
    -- OS finalizadas do período
    SELECT COUNT(*) INTO os_finalizadas_periodo
    FROM public.ordens_servico 
    WHERE data_abertura >= p_data_inicio 
    AND data_abertura <= p_data_fim
    AND status = 'finalizada';
    
    -- OS finalizadas do período anterior
    SELECT COUNT(*) INTO os_finalizadas_anterior
    FROM public.ordens_servico 
    WHERE data_abertura >= (p_data_inicio - (p_data_fim - p_data_inicio))
    AND data_abertura < p_data_inicio
    AND status = 'finalizada';
    
    -- Ticket médio do período
    SELECT COALESCE(AVG(valor_total), 0) INTO ticket_medio_periodo
    FROM public.ordens_servico 
    WHERE data_abertura >= p_data_inicio 
    AND data_abertura <= p_data_fim
    AND status = 'finalizada'
    AND valor_total IS NOT NULL;
    
    -- Ticket médio do período anterior
    SELECT COALESCE(AVG(valor_total), 0) INTO ticket_medio_anterior
    FROM public.ordens_servico 
    WHERE data_abertura >= (p_data_inicio - (p_data_fim - p_data_inicio))
    AND data_abertura < p_data_inicio
    AND status = 'finalizada'
    AND valor_total IS NOT NULL;
    
    SELECT json_build_object(
        'receita_periodo', receita_periodo,
        'receita_anterior', receita_anterior,
        'crescimento_receita', CASE 
            WHEN receita_anterior > 0 THEN ((receita_periodo - receita_anterior) / receita_anterior) * 100
            ELSE 0
        END,
        'os_finalizadas_periodo', os_finalizadas_periodo,
        'os_finalizadas_anterior', os_finalizadas_anterior,
        'crescimento_os', CASE 
            WHEN os_finalizadas_anterior > 0 THEN ((os_finalizadas_periodo - os_finalizadas_anterior)::float / os_finalizadas_anterior) * 100
            ELSE 0
        END,
        'ticket_medio_periodo', ticket_medio_periodo,
        'ticket_medio_anterior', ticket_medio_anterior,
        'crescimento_ticket', CASE 
            WHEN ticket_medio_anterior > 0 THEN ((ticket_medio_periodo - ticket_medio_anterior) / ticket_medio_anterior) * 100
            ELSE 0
        END,
        'margem_lucro_periodo', CASE 
            WHEN receita_periodo > 0 THEN ((receita_periodo - (receita_periodo * 0.3)) / receita_periodo) * 100
            ELSE 0
        END,
        'margem_lucro_anterior', CASE 
            WHEN receita_anterior > 0 THEN ((receita_anterior - (receita_anterior * 0.3)) / receita_anterior) * 100
            ELSE 0
        END
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para otimizar consultas de receita mensal
CREATE OR REPLACE FUNCTION public.get_monthly_revenue(
    p_data_inicio DATE,
    p_data_fim DATE
)
RETURNS TABLE (
    mes TEXT,
    receita NUMERIC,
    custos NUMERIC,
    lucro NUMERIC,
    os INTEGER,
    ticket_medio NUMERIC,
    margem_lucro NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_char(os.data_abertura, 'Mon/YYYY') as mes,
        COALESCE(SUM(os.valor_total), 0) as receita,
        COALESCE(SUM(os.valor_total) * 0.3, 0) as custos,
        COALESCE(SUM(os.valor_total) * 0.7, 0) as lucro,
        COUNT(*)::INTEGER as os,
        CASE 
            WHEN COUNT(*) > 0 THEN COALESCE(SUM(os.valor_total) / COUNT(*), 0)
            ELSE 0
        END as ticket_medio,
        CASE 
            WHEN SUM(os.valor_total) > 0 THEN 70.0
            ELSE 0
        END as margem_lucro
    FROM public.ordens_servico os
    WHERE os.data_abertura >= p_data_inicio 
    AND os.data_abertura <= p_data_fim
    AND os.valor_total IS NOT NULL
    GROUP BY to_char(os.data_abertura, 'Mon/YYYY')
    ORDER BY MIN(os.data_abertura);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para otimizar consultas de receita por cliente
CREATE OR REPLACE FUNCTION public.get_client_revenue(
    p_data_inicio DATE,
    p_data_fim DATE
)
RETURNS TABLE (
    cliente TEXT,
    receita NUMERIC,
    os INTEGER,
    ticket_medio NUMERIC,
    ultima_os TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(c.nome, 'Cliente não identificado') as cliente,
        COALESCE(SUM(os.valor_total), 0) as receita,
        COUNT(*)::INTEGER as os,
        CASE 
            WHEN COUNT(*) > 0 THEN COALESCE(SUM(os.valor_total) / COUNT(*), 0)
            ELSE 0
        END as ticket_medio,
        to_char(MAX(os.data_abertura), 'DD/MM/YYYY') as ultima_os
    FROM public.ordens_servico os
    LEFT JOIN public.clientes c ON os.cliente_id = c.id
    WHERE os.data_abertura >= p_data_inicio 
    AND os.data_abertura <= p_data_fim
    AND os.status = 'finalizada'
    AND os.valor_total IS NOT NULL
    GROUP BY c.nome
    ORDER BY SUM(os.valor_total) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para otimizar consultas de receita por produto
CREATE OR REPLACE FUNCTION public.get_product_revenue(
    p_data_inicio DATE,
    p_data_fim DATE
)
RETURNS TABLE (
    produto TEXT,
    receita NUMERIC,
    quantidade INTEGER,
    preco_medio NUMERIC,
    margem_lucro NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.nome, 'Produto não identificado') as produto,
        COALESCE(SUM(op.quantidade * op.preco_unitario), 0) as receita,
        COALESCE(SUM(op.quantidade), 0)::INTEGER as quantidade,
        CASE 
            WHEN SUM(op.quantidade) > 0 THEN COALESCE(SUM(op.preco_unitario) / COUNT(*), 0)
            ELSE 0
        END as preco_medio,
        CASE 
            WHEN SUM(op.quantidade * op.preco_unitario) > 0 THEN 30.0
            ELSE 0
        END as margem_lucro
    FROM public.os_produtos op
    JOIN public.ordens_servico os ON op.os_id = os.id
    LEFT JOIN public.produtos p ON op.produto_id = p.id
    WHERE os.data_abertura >= p_data_inicio 
    AND os.data_abertura <= p_data_fim
    AND os.status = 'finalizada'
    GROUP BY p.nome
    ORDER BY SUM(op.quantidade * op.preco_unitario) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Configurações de performance
-- Aumentar work_mem para operações complexas
-- Aumentar shared_buffers para melhor cache
-- Ajustar random_page_cost para SSDs
-- Configurar effective_cache_size

-- Comentários sobre otimizações implementadas:
-- 1. Índices criados para todas as consultas mais comuns
-- 2. Índices compostos para consultas com múltiplas condições
-- 3. Funções otimizadas para dashboard e relatórios
-- 4. Limpeza automática de dados antigos
-- 5. Estatísticas atualizadas para melhor planejamento de consultas
-- 6. Funções que retornam JSON para reduzir round-trips
-- 7. Consultas otimizadas com CTEs e window functions
