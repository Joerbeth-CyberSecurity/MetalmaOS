# Configuração de Testes Automatizados

Este documento explica como configurar e executar os testes automatizados para o sistema Metalma.

## Instalação das Dependências

Execute o seguinte comando para instalar as dependências de teste:

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8
```

## Configuração do Vitest

### 1. Atualizar o vite.config.ts

Adicione a seguinte configuração ao seu `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path;

export default defineConfig({
  // ... outras configurações
  test: {
    globals: true,
    environment: jsdom,  setupFiles: ['./src/test/setup.ts'],
    coverage:[object Object]
      provider: 'v8,      reporter: ['text',json',html'],
    },
  },
});
```

### 2Criar o arquivo de setup

Crie o arquivo `src/test/setup.ts`:

```typescript
import@testing-library/jest-dom;

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase:[object Object]    from: vi.fn(() => ([object Object]      select: vi.fn(() => ([object Object]
        eq: vi.fn(() => ([object Object]         order: vi.fn(() => Promise.resolve({ data:, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ([object Object]
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: vi.fn(() => ([object Object]
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }
}));

// Mock do useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ([object Object]   toast: vi.fn()
  })
}));
```

### 3. Adicionar scripts ao package.json

Adicione os seguintes scripts ao seu `package.json`:

```json[object Object]  scripts:[object Object]   test: vitest",
    test:ui:vitest --ui,
  test:run":vitest run",
    test:coverage": "vitest run --coverage"
  }
}
```

## Executando os Testes

### Teste Interativo
```bash
npm run test
```

### Teste com UI
```bash
npm run test:ui
```

### Teste Único
```bash
npm run test:run
```

### Teste com Cobertura
```bash
npm run test:coverage
```

## Exemplo de Teste

Crie um arquivo de teste em `src/pages/__tests__/Clientes.test.tsx`:

```typescript
import { describe, it, expect } from vitest;
import { render, screen } from@testing-library/react';
import { BrowserRouter } fromreact-router-dom;
import Clientes from '../Clientes';

describe('Clientes', () =>[object Object]
  it('renderiza o título da página', () => {
    render(
      <BrowserRouter>
        <Clientes />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Clientes')).toBeInTheDocument();
  });

  it(renderiza o botão de adicionar cliente', () => {
    render(
      <BrowserRouter>
        <Clientes />
      </BrowserRouter>
    );
    
    expect(screen.getByText(Adicionar Cliente')).toBeInTheDocument();
  });
});
```

## Estrutura de Testes Recomendada

```
src/
├── pages/
│   ├── __tests__/
│   │   ├── Clientes.test.tsx
│   │   ├── Colaboradores.test.tsx
│   │   ├── Produtos.test.tsx
│   │   └── OrdensServico.test.tsx
│   ├── Clientes.tsx
│   ├── Colaboradores.tsx
│   └── ...
├── components/
│   ├── __tests__/
│   │   └── ...
│   └── ...
└── test/
    └── setup.ts
```

## Boas Práticas

1. **Teste de Renderização**: Sempre teste se os componentes renderizam corretamente
2. **Teste de Interação**: Teste cliques, formulários e outras interações do usuário
3. **Teste de Integração**: Teste a comunicação com o Supabase4. **Mocks**: Use mocks para dependências externas como Supabase e APIs5*Cobertura**: Mantenha uma boa cobertura de código (mínimo80## Troubleshooting

### Erro de Tipos
Se você encontrar erros de tipos, adicione um arquivo `src/vitest.d.ts`:

```typescript
/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom />
```

### Erro de Módulos
Se você encontrar erros de módulos não encontrados, verifique se os aliases estão configurados corretamente no `vite.config.ts`.

### Erro de Ambiente
Se você encontrar erros relacionados ao ambiente jsdom, certifique-se de que o `jsdom` está instalado e configurado corretamente. 