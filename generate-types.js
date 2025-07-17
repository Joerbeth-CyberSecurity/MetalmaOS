const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://mezwwjzchbvfpptljmya.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lend3anpjaGJ2ZnBwdGxqbXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NjE0NDcsImV4cCI6MjA2ODIzNzQ0N30.lB4HBcu2Gnsx03ozkEjZLfWkkVW_hgWxwdsQyrXJnSA";

// Criar diretório temporário para o .env
const tempDir = path.join(__dirname, '.supabase');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Criar arquivo de configuração temporário
const configPath = path.join(tempDir, 'config.json');
fs.writeFileSync(configPath, JSON.stringify({
  project_id: "mezwwjzchbvfpptljmya",
  api: {
    url: SUPABASE_URL,
    key: SUPABASE_KEY
  }
}));

try {
  // Instalar dependências necessárias
  execSync('npm install --save-dev supabase@latest', { stdio: 'inherit' });
  
  // Gerar tipos
  execSync(`npx supabase gen types typescript --project-id mezwwjzchbvfpptljmya --config-file ${configPath} > src/integrations/supabase/types.ts`, { stdio: 'inherit' });
  
  console.log('Tipos gerados com sucesso!');
} catch (error) {
  console.error('Erro ao gerar tipos:', error);
} finally {
  // Limpar arquivos temporários
  fs.rmSync(tempDir, { recursive: true, force: true });
} 