# 🚀 Deploy no GitHub - Metalma OS

## 📋 Pré-requisitos

1. **Conta no GitHub** - [github.com](https://github.com)
2 **Git instalado** no seu computador3. **GitHub CLI** (opcional, mas recomendado)

## 🔧 Passo a Passo

### 1. Inicializar o Git (se ainda não foi feito)

```bash
cd MetalmaOS
git init
```

### 2 Criar o arquivo .gitignore

Crie um arquivo `.gitignore` na raiz do projeto:

```bash
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Supabase
.supabase/

# Vite
.vite/
```

###3Adicionar arquivos ao Git

```bash
git add .
git commit -m "Initial commit: Sistema Metalma OS"
```

### 4. Criar repositório no GitHub

#### Opção A: Via GitHub Web1Acesse [github.com](https://github.com)2em New repository"3 Nome: `metalma-os` ou `sistema-metalma`
4. Descrição: Sistema de Ordens de Serviço - Metalma"
5**NÃO** inicialize com README (já temos arquivos)
6. Clique em Create repository"

#### Opção B: Via GitHub CLI
```bash
gh repo create metalma-os --public --description Sistema de Ordens de Serviço - Metalma"
```

### 5. Conectar repositório local ao GitHub

```bash
git remote add origin https://github.com/SEU_USUARIO/metalma-os.git
git branch -M main
git push -u origin main
```

## 🌐 Deploy Automático (Opcional)

### GitHub Pages (Frontend Estático)

1. **Configurar GitHub Actions**

Crie o arquivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 18       cache: npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

2. **Configurar GitHub Pages**
   - Vá em Settings > Pages
   - Source: "Deploy from a branch   - Branch: `gh-pages`
   - Folder: `/ (root)`

### Vercel (Recomendado)
1Acesse [vercel.com](https://vercel.com)
2. Conecte sua conta GitHub
3. Importe o repositório `metalma-os`
4re:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

## 🔐 Variáveis de Ambiente

### Para Deploy

Crie um arquivo `.env.example`:

```env
# Supabase
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase

# Outras variáveis
VITE_APP_NAME=Metalma OS
VITE_APP_VERSION=1.00``

### Configurar no GitHub/Vercel

1. **GitHub Secrets** (para Actions):
   - Settings > Secrets and variables > Actions
   - Adicione: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

2. **Vercel Environment Variables**:
   - Project Settings > Environment Variables
   - Adicione as mesmas variáveis

## 📝 README.md

Atualize o `README.md` do projeto:

```markdown
# 🏭 Metalma OS - Sistema de Ordens de Serviço

Sistema completo para gerenciamento de ordens de serviço da Metalma.

## 🚀 Tecnologias

- React18 TypeScript
- Vite
- Tailwind CSS
- Supabase
- shadcn/ui

## 📦 Instalação

```bash
git clone https://github.com/SEU_USUARIO/metalma-os.git
cd metalma-os
npm install
```

## 🔧 Configuração

1. Copie `.env.example` para `.env`
2. Configure as variáveis do Supabase
3. Execute `npm run dev`

## 📋 Funcionalidades

- ✅ Gestão de Clientes
- ✅ Gestão de Colaboradores
- ✅ Gestão de Produtos
- ✅ Ordens de Serviço
- ✅ Relatórios
- ✅ Configurações

## 🌐 Deploy

- **GitHub Pages**: [metalma-os.vercel.app](https://metalma-os.vercel.app)
- **Vercel**: [metalma-os.vercel.app](https://metalma-os.vercel.app)

## 📄 Licença

MIT
```

## 🔄 Comandos Úteis

```bash
# Verificar status
git status

# Adicionar mudanças
git add .

# Fazer commit
git commit -m Descrição das mudanças"

# Enviar para GitHub
git push

# Ver histórico
git log --oneline

# Criar nova branch
git checkout -b feature/nova-funcionalidade

# Voltar para main
git checkout main
```

## 🎯 Próximos Passos

1 Criar repositório no GitHub
2. ✅ Fazer push inicial
3. ✅ Configurar deploy automático
4. ✅ Configurar variáveis de ambiente
5. ✅ Atualizar README
6 🚀 Compartilhar o projeto!

## 🔗 Links Úteis

- [GitHub](https://github.com)
- [Vercel](https://vercel.com)
- [Supabase](https://supabase.com)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

---

**🎉 Seu projeto está pronto para o mundo!** 