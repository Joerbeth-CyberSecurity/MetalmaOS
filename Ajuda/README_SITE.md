# Site Metalma OS

## Descrição
Site estático moderno desenvolvido para apresentar o sistema Metalma OS - Sistema de Controle de Ordens de Serviço. O site foi criado com base no README.md fornecido e utiliza as cores da logomarca da empresa.

## Características
- **Design Moderno**: Interface limpa e profissional
- **Menu Lateral**: Navegação intuitiva com sidebar retrátil
- **Modo Escuro/Claro**: Toggle para alternar entre temas
- **Responsivo**: Adaptável para desktop, tablet e mobile
- **Cores da Marca**: Utiliza verde (#228B22) e cinza da logomarca
- **Animações Suaves**: Transições e efeitos visuais

## Estrutura do Projeto
```
metalma-site/
├── index.html          # Página principal
├── css/
│   └── style.css       # Estilos principais
├── js/
│   └── main.js         # Funcionalidades JavaScript
├── images/
│   └── logo.png        # Logomarca da empresa
│   └── OFICIALCYBERJKNET.png # Nova logomarca do parceiro de tecnologia
└── README_SITE.md      # Esta documentação
```

## Funcionalidades

### 1. Navegação
- Menu lateral com ícones e labels
- Navegação entre seções sem recarregar a página
- Indicador visual da seção ativa
- Menu colapsível em desktop
- Menu overlay em mobile

### 2. Temas
- **Modo Claro**: Fundo branco, texto escuro
- **Modo Escuro**: Fundo escuro, texto claro
- Toggle no header para alternar temas
- Preferência salva no localStorage

### 3. Seções do Site
- **Dashboard**: Página inicial com visão geral
- **Sobre**: Informações sobre o sistema
- **Ordens de Serviço**: Detalhes do módulo de OS
- **Clientes**: Gestão de clientes
- **Colaboradores**: Gestão de equipe
- **Produtos**: Controle de produtos
- **Relatórios**: Tipos de relatórios disponíveis
- **Configurações**: Parâmetros do sistema
- **Fluxos e Lógicas de Negócio**: Entendimento do funcionamento interno e cálculos do sistema
- **Suporte**: Informações de contato

### 4. Responsividade
- Layout adaptável para diferentes tamanhos de tela
- Menu lateral se transforma em overlay em mobile
- Cards e grids se reorganizam automaticamente
- Tipografia escalável

## Como Usar

### 1. Instalação
1. Extraia todos os arquivos em uma pasta
2. Abra o arquivo `index.html` em um navegador web
3. Não é necessário servidor web (funciona localmente)

### 2. Navegação
- Use o menu lateral para navegar entre seções
- Clique no ícone de hambúrguer para colapsar/expandir o menu
- Use o ícone de sol/lua para alternar entre temas

### 3. Personalização
Para personalizar o site, edite os seguintes arquivos:

#### Cores (css/style.css)
```css
:root {
    --primary: #228B22;        /* Verde principal */
    --secondary: #6B7280;      /* Cinza secundário */
    /* ... outras variáveis */
}
```

#### Conteúdo (index.html)
- Edite o texto das seções conforme necessário
- Adicione ou remova cards e elementos
- Modifique links e informações de contato

#### Funcionalidades (js/main.js)
- Adicione novas seções ao array de navegação
- Customize animações e transições
- Implemente funcionalidades adicionais

## Tecnologias Utilizadas
- **HTML5**: Estrutura semântica
- **CSS3**: Estilos modernos com variáveis CSS
- **JavaScript ES6+**: Funcionalidades interativas
- **Font Awesome**: Ícones
- **Google Fonts**: Tipografia (Inter)

## Compatibilidade
- **Navegadores**: Chrome, Firefox, Safari, Edge (versões modernas)
- **Dispositivos**: Desktop, tablet, smartphone
- **Resolução**: Otimizado para 320px até 1920px+

## Suporte
Para dúvidas ou suporte técnico:
- E-mail: informatica@jkinfonet.com.br
- LinkedIn: www.linkedin.com/in/joerbeth-serra-costa
- Site: www.jkinfonet.com.br

**Parceiro de Tecnologia:** JK Infonet (Logomarca atualizada)

## Licença
© 2024 Metalma INOX & CIA. Todos os direitos reservados.

---

**Desenvolvido com base na documentação oficial do MetalmaOS**

