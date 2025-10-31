# 🚨 MIGRAÇÃO NECESSÁRIA - Campos de Orçamento

## Problema
O sistema está tentando salvar campos que não existem na tabela `orcamentos`:
- `data_prevista`
- `tempo_execucao_previsto` 
- `meta_por_hora`

## Solução
Execute o seguinte SQL no Supabase Dashboard (SQL Editor):

```sql
-- Adicionar novos campos à tabela orcamentos
ALTER TABLE public.orcamentos 
ADD COLUMN IF NOT EXISTS data_prevista TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tempo_execucao_previsto VARCHAR(10),
ADD COLUMN IF NOT EXISTS meta_por_hora DECIMAL(10,2) DEFAULT 0;

-- Comentários nas novas colunas
COMMENT ON COLUMN public.orcamentos.data_prevista IS 'Data prevista para conclusão do orçamento';
COMMENT ON COLUMN public.orcamentos.tempo_execucao_previsto IS 'Tempo de execução previsto no formato HH:MM:SS';
COMMENT ON COLUMN public.orcamentos.meta_por_hora IS 'Meta de valor por hora em reais';

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_orcamentos_data_prevista ON public.orcamentos(data_prevista);
CREATE INDEX IF NOT EXISTS idx_orcamentos_meta_por_hora ON public.orcamentos(meta_por_hora);
```

## Como executar:
1. Acesse o Supabase Dashboard
2. Vá em "SQL Editor"
3. Cole o SQL acima
4. Execute o comando
5. Após executar, descomente os campos no código

## Campos que serão adicionados:
- **data_prevista**: Data prevista para conclusão
- **tempo_execucao_previsto**: Tempo no formato HH:MM:SS
- **meta_por_hora**: Meta de valor por hora em reais

## Após a migração:
Descomente as linhas no arquivo `src/components/OrcamentoForm.tsx`:
- Linhas 335-337 (criação)
- Linhas 285-287 (atualização)
