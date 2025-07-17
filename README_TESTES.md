# Sistema de Testes - Metalma OS

## 🎯 Status da Configuração

✅ **Configurado automaticamente:**
- Dependências de teste adicionadas ao `package.json`
- Scripts de teste configurados
- Configuração do Vitest no `vite.config.ts`

🔧 **Precisa ser feito manualmente:**
- Instalar dependências com `npm install`
- Criar arquivo de setup de testes
- Criar testes para as páginas

## 📦 Instalação

1. **Instalar dependências:**
```bash
cd MetalmaOS
npm install
```

2**Criar arquivo de setup** (`src/test/setup.ts`):
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

## 🚀 Comandos de Teste

```bash
# Teste interativo (modo watch)
npm run test

# Teste com interface gráfica
npm run test:ui

# Execução única
npm run test:run

# Teste com cobertura
npm run test:coverage
```

## 📝 Exemplo de Teste

Crie `src/pages/__tests__/Clientes.test.tsx`:

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

## 📁 Estrutura Recomendada

```
src/
├── pages/
│   ├── __tests__/
│   │   ├── Clientes.test.tsx
│   │   ├── Colaboradores.test.tsx
│   │   ├── Produtos.test.tsx
│   │   └── OrdensServico.test.tsx
│   └── ...
├── components/
│   ├── __tests__/
│   │   └── ...
│   └── ...
└── test/
    └── setup.ts
```

## 🎯 Benefícios

- ✅ Testes automatizados para qualidade
- ✅ Cobertura de código
- ✅ Mocks para serviços externos
- ✅ Interface gráfica para testes
- ✅ Pronto para CI/CD

## 🔧 Troubleshooting

**Erro de tipos:** Verifique se o arquivo `src/types/vitest.d.ts` existe
**Erro de módulos:** Verifique os aliases no `vite.config.ts`
**Erro de ambiente:** Certifique-se de que `jsdom` está instalado

---

**Próximo passo:** Execute `npm install` e comece a criar seus testes! 