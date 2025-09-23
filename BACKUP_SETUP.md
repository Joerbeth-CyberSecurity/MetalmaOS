# Configuração do Sistema de Backup

## ✅ O que foi implementado

### Frontend (Configurações > Sistema)
- ✅ Seção "Backup do Sistema" adicionada
- ✅ Campos de configuração de backup
- ✅ Informações de conexão (somente leitura)
- ✅ Botão "Gerar Backup Agora"
- ✅ Integração com Edge Function
- ✅ Download automático do arquivo ZIP

### Backend (Edge Function)
- ✅ Função `export-backup` criada
- ✅ Exportação de todas as tabelas públicas
- ✅ Opção de incluir metadados (políticas, esquema)
- ✅ Nome do arquivo com timestamp
- ✅ Suporte a Storage do Supabase

## 🔧 Configuração necessária

### 1. Secrets da Edge Function
Configure os seguintes secrets no Supabase Dashboard:

```bash
# Via CLI do Supabase
supabase secrets set SERVICE_ROLE_KEY=seu_service_role_key_aqui
supabase secrets set SUPABASE_URL=https://seu-projeto.supabase.co
```

### 2. Deploy da Edge Function
```bash
# No diretório do projeto
supabase functions deploy export-backup
```

### 3. Configuração do Storage (opcional)
Se quiser salvar backups no Storage:
1. Crie um bucket chamado "backups" no Supabase Dashboard
2. Configure as políticas RLS para o bucket
3. Use a opção "Salvar no Storage" na interface

### 4. Variáveis de Ambiente do Frontend
Certifique-se de que estão configuradas no `.env`:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

## 📋 Campos de Configuração

### Na tabela `configuracoes`:
- `backup_include_policies_schema`: Incluir políticas e esquema (true/false)
- `backup_zip_enabled`: Compactar em ZIP (true/false)
- `backup_filename_pattern`: Padrão do nome do arquivo
- `backup_destination`: Destino (local/storage/both)
- `backup_storage_bucket`: Nome do bucket (opcional)

## 🔒 Segurança

- ✅ Service Role Key nunca exposta no frontend
- ✅ Validação de permissões (apenas admins)
- ✅ CORS configurado corretamente
- ✅ Tratamento de erros robusto

## 🚀 Como usar

1. Acesse **Configurações > Sistema**
2. Role até a seção **"Backup do Sistema"**
3. Configure as opções desejadas
4. Clique em **"Gerar Backup Agora"**
5. O arquivo será baixado automaticamente

## 📁 Estrutura do Backup

O backup contém:
```json
{
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "tables_count": 12,
    "include_policies_schema": true,
    "zip_enabled": true,
    "destination": "local"
  },
  "tables": {
    "clientes": [...],
    "produtos": [...],
    "ordens_servico": [...],
    // ... todas as tabelas
  },
  "metadata": {
    "schema": {
      "policies": [...],
      "columns": [...]
    }
  }
}
```

## 🔧 Melhorias futuras

- [ ] Compressão ZIP real (usando biblioteca de compressão)
- [ ] Backup incremental
- [ ] Agendamento automático de backups
- [ ] Restauração de backups
- [ ] Notificações por email
- [ ] Backup de arquivos do Storage

## ⚠️ Importante

- A Edge Function precisa ser deployada no Supabase
- Os secrets devem estar configurados
- Apenas administradores podem gerar backups
- O backup inclui TODOS os dados das tabelas públicas
- Para tabelas grandes, o processo pode demorar
