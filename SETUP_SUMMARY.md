# Resumo da Configuração de Testes

## ✅ O que foi configurado automaticamente:
1 **Dependências adicionadas ao package.json**:
   - vitest
   - jsdom
   - @testing-library/react
   - @testing-library/jest-dom
   - @testing-library/user-event
   - @vitest/coverage-v8**Scripts de teste adicionados ao package.json**:
   - `npm run test` - Teste interativo
   - `npm run test:ui` - Teste com interface gráfica
   - `npm run test:run` - Execução única
   - `npm run test:coverage` - Teste com cobertura
3 **Configuração do Vitest no vite.config.ts**:
   - Ambiente jsdom configurado
   - Arquivo de setup definido
   - Cobertura de código habilitada

## 🔧 O que precisa ser feito manualmente:

### 1. Instalar as dependências
```bash
cd MetalmaOS
npm install
```

### 2Criar o arquivo de setup de testes
Crie o arquivo `src/test/setup.ts` com o seguinte conteúdo:

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

###3 Criar um teste de exemplo
Crie o arquivo `src/pages/__tests__/Clientes.test.tsx`:

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

## 🚀 Como executar os testes:1**Teste interativo** (modo watch):
   ```bash
   npm run test
   ```

2. **Teste com interface gráfica**:
   ```bash
   npm run test:ui
   ```

3. **Execução única**:
   ```bash
   npm run test:run
   ```
4este com cobertura de código**:
   ```bash
   npm run test:coverage
   ```

## 📁 Estrutura de testes recomendada:

```
src/
├── pages/
│   ├── __tests__/
│   │   ├── Clientes.test.tsx
│   │   ├── Colaboradores.test.tsx
│   │   ├── Produtos.test.tsx
│   │   ├── OrdensServico.test.tsx
│   │   ├── Relatorios.test.tsx
│   │   └── Configuracoes.test.tsx
│   └── ...
├── components/
│   ├── __tests__/
│   │   └── ...
│   └── ...
└── test/
    └── setup.ts
```

## 🎯 Próximos passos:

1. Execute `npm install` para instalar as dependências2 Crie o arquivo de setup conforme mostrado acima
3. Crie um teste de exemplo para verificar se tudo está funcionando
4. Execute `npm run test` para verificar a configuração5 Comece a escrever testes para cada página do sistema

## 🔍 Benefícios desta configuração:

- **Testes automatizados** para garantir qualidade do código
- **Cobertura de código** para identificar áreas não testadas
- **Mocks configurados** para Supabase e outros serviços externos
- **Interface gráfica** para visualizar e debugar testes
- **Integração contínua** pronta para CI/CD

Com esta configuração, você terá um ambiente de testes robusto e profissional para seu sistema Metalma! 