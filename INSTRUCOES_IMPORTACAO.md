# Instruções para Importar Produtos do CSV

## Passo 1: Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=sua_url_do_supabase_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase_aqui
```

## Passo 2: Instalar Dependências

```bash
npm install @supabase/supabase-js
```

## Passo 3: Executar o Script de Importação

```bash
node import-produtos-final.js
```

## Estrutura dos Dados

O arquivo `produtos.csv` contém:
- **PRODUTO**: Nome/descrição do produto
- **CUSTO**: Preço de custo (não usado na importação)
- **VENDA**: Preço de venda (usado como preço unitário)

## Campos Importados

- `nome`: Nome do produto (coluna PRODUTO)
- `preco_unitario`: Preço de venda (coluna VENDA)
- `estoque`: 0 (padrão)
- `unidade`: 'UN' (padrão)
- `ativo`: true (padrão)
- `percentual_global`: 0 (padrão)

## Resultado Esperado

O script irá:
1. Ler o arquivo CSV (400 produtos)
2. Processar em lotes de 50 produtos
3. Inserir no banco de dados Supabase
4. Mostrar progresso e resultado final

## Solução de Problemas

Se houver erro de autenticação:
- Verifique se as credenciais do Supabase estão corretas
- Certifique-se de que o arquivo `.env` está na raiz do projeto

Se houver erro de permissão:
- Verifique se as políticas RLS estão configuradas corretamente
- Certifique-se de que o usuário tem permissão para inserir na tabela `produtos` 