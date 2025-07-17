# 🏭 Metalma OS - Sistema de Ordens de Serviço

Sistema completo para gerenciamento de ordens de serviço da Metalma, desenvolvido com tecnologias modernas e interface intuitiva.

## 🚀 Tecnologias

- **React18lioteca JavaScript para interfaces
- **TypeScript** - Tipagem estática para JavaScript
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS utilitário
- **Supabase** - Backend como serviço (BaaS)
- **shadcn/ui** - Componentes de UI modernos
- **React Router** - Roteamento da aplicação
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de esquemas

## 📋 Funcionalidades

### ✅ Gestão de Clientes
- Cadastro completo de clientes
- Edição e exclusão de registros
- Busca e filtros
- Validação de dados

### ✅ Gestão de Colaboradores
- Controle de funcionários
- Perfis e permissões
- Histórico de atividades

### ✅ Gestão de Produtos
- Catálogo de produtos
- Controle de estoque
- Preços e especificações

### ✅ Ordens de Serviço
- Criação de OS
- Acompanhamento de status
- Relatórios detalhados

### ✅ Relatórios
- Relatórios gerenciais
- Exportação de dados
- Gráficos e estatísticas

### ✅ Configurações
- Configurações do sistema
- Perfis de usuário
- Backup e restauração

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta no Supabase

### Passos

1. **Clone o repositório**
```bash
git clone https://github.com/SEU_USUARIO/metalma-os.git
cd metalma-os
```

2. **Instale as dependências**
```bash
npm install
```
3*Configure as variáveis de ambiente**
```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações do Supabase:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

4. **Execute o projeto**
```bash
npm run dev
```

O projeto estará disponível em: http://localhost:880 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia o servidor de desenvolvimento
npm run build        # Gera build de produção
npm run build:dev    # Gera build de desenvolvimento
npm run preview      # Preview do build

# Qualidade de código
npm run lint         # Executa o linter
```

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes de UI (shadcn/ui)
│   ├── AppSidebar.tsx  # Sidebar da aplicação
│   ├── Layout.tsx      # Layout principal
│   └── ProtectedRoute.tsx # Rota protegida
├── hooks/              # Custom hooks
│   ├── useAuth.ts      # Hook de autenticação
│   └── use-mobile.tsx  # Hook para mobile
├── integrations/       # Integrações externas
│   └── supabase/       # Configuração do Supabase
├── lib/                # Utilitários
│   └── utils.ts        # Funções utilitárias
├── pages/              # Páginas da aplicação
│   ├── Auth.tsx        # Página de autenticação
│   ├── Dashboard.tsx   # Dashboard principal
│   ├── Index.tsx       # Página inicial
│   └── NotFound.tsx    # Página 404
└── main.tsx           # Ponto de entrada
```

## 🌐 Deploy

### Vercel (Recomendado)1Acesse [vercel.com](https://vercel.com)
2. Conecte sua conta GitHub
3. Importe o repositório `metalma-os`
4. Configure as variáveis de ambiente
5. Deploy automático a cada push

### GitHub Pages
1. Configure GitHub Actions
2. Build automático na branch main
3. Deploy na branch gh-pages

## 🔐 Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase | ✅ |
| `VITE_APP_NAME` | Nome da aplicação | ❌ |
| `VITE_APP_VERSION` | Versão da aplicação | ❌ |

## 🎨 Interface

O sistema utiliza uma interface moderna e responsiva com:
- Design system consistente
- Componentes acessíveis
- Tema escuro/claro
- Layout responsivo
- Navegação intuitiva

## 🔄 Desenvolvimento

### Adicionando novas funcionalidades
1. Crie uma nova branch: `git checkout -b feature/nova-funcionalidade`
2. Desenvolva a funcionalidade
3. Teste localmente4 Faça commit: `git commit -m "feat: nova funcionalidade"`
5: `git push origin feature/nova-funcionalidade`
6. Crie um Pull Request

### Padrões de código
- TypeScript para tipagem
- ESLint para qualidade
- Prettier para formatação
- Conventional Commits

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuição

1. Fork o projeto
2ie uma branch para sua feature
3mmit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para suporte e dúvidas:
- Abra uma [Issue](https://github.com/SEU_USUARIO/metalma-os/issues)
- Entre em contato: [seu-email@exemplo.com]

---

**🎉 Sistema Metalma OS - Gerenciando ordens de serviço com excelência!**
