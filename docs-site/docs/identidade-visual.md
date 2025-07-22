# Temas, Cores e Identidade Visual

## Paleta de Cores
- Gradientes de fundo (ex: de `from-background` para `to-secondary/10`)
- Cores principais:
  - `primary`
  - `secondary`
  - `muted`
  - `foreground`
  - `background`

## Logomarca
- Versão clara: `logo.png`
- Versão escura: `logo2.png`

## Dark Mode
- Alternância automática/manual entre tema claro e escuro
- Ícone de alternância disponível no cabeçalho

## Responsividade
- Layout adaptável a qualquer dispositivo (desktop, tablet, mobile)
- Componentes responsivos e acessíveis

## Exemplo Visual
```jsx
<div className="bg-gradient-to-br from-background to-secondary/10 p-6 rounded-xl shadow-lg">
  <img src="/logo.png" alt="Logo MetalmaOS" className="h-16 mb-4" />
  <h1 className="text-2xl font-bold text-foreground">MetalmaOS</h1>
  <p className="text-muted-foreground">Gestão Moderna de Ordens de Serviço</p>
</div>
``` 