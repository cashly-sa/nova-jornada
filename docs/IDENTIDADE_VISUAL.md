# IDENTIDADE_VISUAL.md - Design System

> Design system mobile-first com Tailwind CSS e tema Cashly

## Cores

### Paleta Principal
```css
/* Primarias */
--color-primary: #00C853;    /* Verde Cashly */

/* Secundarias */
--color-secondary: #2962FF;  /* Azul */

/* Neutras */
--color-gray-50: #f9fafb;
--color-gray-100: #f3f4f6;
--color-gray-200: #e5e7eb;
--color-gray-300: #d1d5db;
--color-gray-400: #9ca3af;
--color-gray-500: #6b7280;
--color-gray-600: #4b5563;
--color-gray-700: #374151;
--color-gray-800: #1f2937;
--color-gray-900: #111827;

/* Semanticas */
--color-success: #00C853;    /* Verde */
--color-warning: #FF9800;    /* Laranja */
--color-error: #EF4444;      /* Vermelho */
```

### Uso de Cores (Tailwind)
| Contexto | Classe | Cor |
|----------|--------|-----|
| Botao principal | bg-primary | #00C853 |
| Texto primario | text-gray-900 | #111827 |
| Texto secundario | text-gray-500 | #6b7280 |
| Borda padrao | border-gray-200 | #e5e7eb |
| Background | bg-gray-50 | #f9fafb |
| Erro | text-red-500 | #EF4444 |
| Sucesso | text-green-500 | #00C853 |

## Tipografia

### Fontes
```css
--font-primary: Inter, system-ui, sans-serif;
--font-mono: ui-monospace, monospace;
```
Configurado via Next.js font optimization.

### Escala (Tailwind)
| Nome | Tamanho | Uso |
|------|---------|-----|
| text-xs | 0.75rem (12px) | Legendas, hints |
| text-sm | 0.875rem (14px) | Labels, texto auxiliar |
| text-base | 1rem (16px) | Corpo de texto |
| text-lg | 1.125rem (18px) | Subtitulos |
| text-xl | 1.25rem (20px) | Titulos de secao |
| text-2xl | 1.5rem (24px) | Titulos de pagina |
| text-3xl | 1.875rem (30px) | Titulos grandes |

### Pesos
| Peso | Valor | Uso |
|------|-------|-----|
| font-normal | 400 | Texto corrido |
| font-medium | 500 | Labels, enfase |
| font-semibold | 600 | Subtitulos |
| font-bold | 700 | Titulos, botoes |

## Espacamentos

### Escala (Tailwind)
| Token | Valor | Uso |
|-------|-------|-----|
| p-1, m-1 | 0.25rem (4px) | Micro espacamento |
| p-2, m-2 | 0.5rem (8px) | Espacamento interno |
| p-3, m-3 | 0.75rem (12px) | Padding botoes |
| p-4, m-4 | 1rem (16px) | Padding cards |
| p-6, m-6 | 1.5rem (24px) | Espacamento entre secoes |
| p-8, m-8 | 2rem (32px) | Margem de pagina |

### Padroes
- Padding de pagina: `px-4` (16px) mobile
- Gap entre elementos: `gap-4` (16px)
- Margem entre secoes: `mb-6` (24px)
- Padding de cards: `p-4` ou `p-6`

## Bordas e Sombras

### Border Radius (Tailwind)
| Nome | Valor | Uso |
|------|-------|-----|
| rounded | 0.25rem (4px) | Badges |
| rounded-md | 0.375rem (6px) | Inputs |
| rounded-lg | 0.5rem (8px) | Cards |
| rounded-xl | 0.75rem (12px) | Modais |
| rounded-full | 9999px | Botoes circulares |

### Sombras (tailwind.config.ts)
```css
/* Customizadas */
--shadow-soft: 0 2px 8px rgba(0, 0, 0, 0.08);
--shadow-medium: 0 4px 16px rgba(0, 0, 0, 0.12);

/* Tailwind padrao */
shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
```

## Breakpoints

| Nome | Valor | Uso |
|------|-------|-----|
| (default) | < 640px | Mobile (principal) |
| sm | >= 640px | Mobile large |
| md | >= 768px | Tablet (bloqueado) |
| lg | >= 1024px | Desktop (bloqueado) |
| xl | >= 1280px | Desktop large (bloqueado) |

## Estados

### Botoes
| Estado | Estilo |
|--------|--------|
| Default | bg-primary text-white |
| Hover | bg-primary/90 (10% mais escuro) |
| Focus | ring-2 ring-primary ring-offset-2 |
| Disabled | bg-gray-300 text-gray-500 cursor-not-allowed |
| Loading | opacity-70 + spinner |

### Inputs
| Estado | Estilo |
|--------|--------|
| Default | border-gray-300 bg-white |
| Focus | border-primary ring-1 ring-primary |
| Error | border-red-500 |
| Disabled | bg-gray-100 text-gray-400 |

## Icones

- **Biblioteca:** Lucide React
- **Tamanhos:** 16px (sm), 20px (md), 24px (lg)
- **Cores:** currentColor (herda do texto)

```tsx
import { Check, X, ChevronRight } from 'lucide-react'

<Check className="w-5 h-5" />        // 20px
<X className="w-4 h-4 text-red-500" />
```

## Componentes Visuais

### Cards
```tsx
<div className="bg-white rounded-lg shadow-soft p-4">
  {/* Conteudo */}
</div>
```

### Badges
```tsx
<span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
  Aprovado
</span>
```

### Modais
```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center">
  <div className="bg-white rounded-xl p-6 max-w-md mx-4">
    {/* Conteudo */}
  </div>
</div>
```

### Botao Primario
```tsx
<button className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed">
  Continuar
</button>
```

### Input
```tsx
<input
  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
  placeholder="Digite aqui"
/>
```

## Animacoes (tailwind.config.ts)

### Customizadas
```javascript
animation: {
  'fade-in': 'fadeIn 0.3s ease-out',
  'slide-up': 'slideUp 0.3s ease-out'
}

keyframes: {
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' }
  },
  slideUp: {
    '0%': { opacity: '0', transform: 'translateY(10px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' }
  }
}
```

### Uso
```tsx
<div className="animate-fade-in">Conteudo</div>
<div className="animate-slide-up">Conteudo</div>
<div className="animate-spin">Loading</div>
```

## Dark Mode

(SEM INFORMACAO DE CONTEXTO - nao implementado)

---

*Ultima atualizacao: 2025-12-22*
