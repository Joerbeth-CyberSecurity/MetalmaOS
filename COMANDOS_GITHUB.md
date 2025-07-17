# 🚀 Comandos para Subir no GitHub

## 📋 Comandos Rápidos

### 1 Inicializar Git (se necessário)
```bash
cd MetalmaOS
git init
```

###2Adicionar arquivos
```bash
git add .
```

### 3. Primeiro commit
```bash
git commit -m "feat: Sistema Metalma OS - CRUD completo"
```

### 4. Criar repositório no GitHub
- Acesse: https://github.com/new
- Nome: `metalma-os`
- Descrição: `Sistema de Ordens de Serviço - Metalma`
- **NÃO** marque Add a README file"
- Clique em Create repository
### 5 Conectar e enviar
```bash
git remote add origin https://github.com/SEU_USUARIO/metalma-os.git
git branch -M main
git push -u origin main
```

## 🔄 Comandos para Atualizações Futuras

```bash
# Ver status
git status

# Adicionar mudanças
git add .

# Fazer commit
git commit -m "feat: nova funcionalidade"

# Enviar para GitHub
git push
```

## 🌐 Deploy Automático (Vercel)1. Acesse: https://vercel.com
2. Conecte sua conta GitHub
3. Clique em Import Project"4elecione o repositório `metalma-os`
5re:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
6. Clique em "Deploy"

## 🔐 Configurar Variáveis no Vercel1m Project Settings > Environment Variables2. Adicione:
   - `VITE_SUPABASE_URL` = sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua chave anônima

## ✅ Checklist Final

- [ ] Git inicializado
- [ ] Arquivos adicionados
- [ ] Primeiro commit feito
- [ ] Repositório criado no GitHub
- [ ] Push inicial realizado
- ] Deploy no Vercel configurado
- [ ] Variáveis de ambiente configuradas

## 🎉 Pronto!

Seu projeto estará disponível em:
- **GitHub**: https://github.com/SEU_USUARIO/metalma-os
- **Vercel**: https://metalma-os.vercel.app

---

**🚀 Sistema Metalma OS no ar!** 