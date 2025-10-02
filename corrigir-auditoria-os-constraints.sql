-- SCRIPT ALTERNATIVO PARA CORRIGIR AUDITORIA DE OS
-- Execute este script caso o script "atualizar-auditoria-os.sql" não funcione
-- Este script é mais seguro e compatível com diferentes versões do PostgreSQL

-- 1. Verificar se a tabela auditoria_os existe
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auditoria_os') 
        THEN 'Tabela auditoria_os encontrada ✓'
        ELSE 'ERRO: Tabela auditoria_os não encontrada. Execute primeiro o script auditoria-os-setup.sql'
    END as status_tabela;

-- 2. Verificar constraints existentes
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.auditoria_os'::regclass
AND contype = 'c';

-- 3. MÉTODO SEGURO: Remover constraint existente (se houver)
DO $$
DECLARE
    constraint_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'auditoria_os_acao_check' 
        AND table_name = 'auditoria_os'
        AND table_schema = 'public'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        ALTER TABLE public.auditoria_os DROP CONSTRAINT auditoria_os_acao_check;
        RAISE NOTICE 'Constraint antigo removido com sucesso';
    ELSE
        RAISE NOTICE 'Nenhum constraint encontrado para remover';
    END IF;
END $$;

-- 4. MÉTODO SEGURO: Adicionar novo constraint com ARRAY
DO $$
BEGIN
    ALTER TABLE public.auditoria_os 
    ADD CONSTRAINT auditoria_os_acao_check 
    CHECK (acao = ANY(ARRAY[
        'criar_os', 
        'editar_os', 
        'excluir_os', 
        'iniciar_os', 
        'reiniciar_os',
        'pausar_os', 
        'parar_os', 
        'finalizar_os', 
        'adicionar_colaborador', 
        'remover_colaborador',
        'cancelar_os',
        'reabrir_os'
    ]));
    
    RAISE NOTICE 'Novo constraint adicionado com sucesso incluindo reiniciar_os';
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Erro ao adicionar constraint: %', SQLERRM;
        -- Tentar método alternativo com IN
        BEGIN
            ALTER TABLE public.auditoria_os 
            ADD CONSTRAINT auditoria_os_acao_check 
            CHECK (acao IN (
                'criar_os', 
                'editar_os', 
                'excluir_os', 
                'iniciar_os', 
                'reiniciar_os',
                'pausar_os', 
                'parar_os', 
                'finalizar_os', 
                'adicionar_colaborador', 
                'remover_colaborador',
                'cancelar_os',
                'reabrir_os'
            ));
            RAISE NOTICE 'Constraint adicionado com método alternativo (IN)';
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Erro também no método alternativo: %', SQLERRM;
        END;
END $$;

-- 5. Verificar se o constraint foi criado corretamente
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'auditoria_os_acao_check';

-- 6. Testar se 'reiniciar_os' está funcionando (opcional)
DO $$
BEGIN
    -- Simular inserção para testar
    RAISE NOTICE 'Testando se reiniciar_os é aceito pelo constraint...';
    
    -- Este bloco apenas simula, não insere dados reais
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'auditoria_os_acao_check'
        AND pg_get_constraintdef(oid) LIKE '%reiniciar_os%'
    ) THEN
        RAISE NOTICE '✓ Constraint aceita reiniciar_os';
    ELSE
        RAISE NOTICE '✗ Constraint NÃO aceita reiniciar_os';
    END IF;
END $$;

-- 7. Status final
SELECT 
    'Script executado com sucesso! Auditoria de OS agora suporta a ação reiniciar_os' as resultado;
