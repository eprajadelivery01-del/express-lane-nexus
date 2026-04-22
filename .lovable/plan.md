

## Plano — Polimento Visual e Modo Compacto do Dashboard Admin

Cinco melhorias coordenadas para deixar o painel inferior mais consistente, acessível e adaptável a telas menores.

---

### 1. Microinterações e estado de seleção em itens clicáveis

**Onde:** `MotoboysSidebar.tsx`, cards de Top Empresas e Cidades em `DashboardPage.tsx`.

- **Hover:** elevação sutil (`hover:bg-*/40` + `hover:shadow-sm` + leve `translate-y-[-1px]` via `transition-all`).
- **Foco visível:** `focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none` em todos os botões/itens clicáveis (acessibilidade teclado).
- **Active/pressed:** `active:scale-[0.98]` para feedback tátil.
- **Seleção persistente:** motoboy clicado guarda `selectedDriverId` (estado local) com borda `border-primary/40` e fundo `bg-primary/5`; idem para empresa selecionada.
- **Chat shortcut:** botão de mensagem do motoboy passa de `opacity-0 group-hover:opacity-100` para sempre visível em densidade compacta (alvo de toque).

---

### 2. Empty states harmoniosos e que não quebram layout

Componente reutilizável `EmptyState` interno em `DashboardPage.tsx`:

```text
┌──────────────────────────┐
│        [ícone Ø]         │
│   Sem dados no período   │
│  Tente outro intervalo   │
└──────────────────────────┘
```

- Aplicado em **Top Empresas**, **Cidades**, **Frota (online/offline)** e **Atividade Recente**.
- Altura mínima (`min-h-[180px]`) para preservar a grade equilibrada mesmo vazio.
- Ícone monocromático em círculo tracejado (`border-dashed border-border/60`), título `text-sm font-bold`, subtítulo `text-xs text-muted-foreground`, e CTA opcional ("Convidar Entregador", "Adicionar Cidade") quando aplicável.

---

### 3. Hierarquia tipográfica e badges padronizados

Sistema de tokens visuais consistente em todo o painel inferior:

| Elemento            | Classe                                                 |
|---------------------|--------------------------------------------------------|
| Título de seção     | `text-sm font-bold text-foreground`                    |
| Subtítulo/legenda   | `text-[11px] text-muted-foreground`                    |
| Valor numérico      | `text-xs font-bold tabular-nums`                       |
| Label secundário    | `text-[10px] uppercase tracking-wider text-muted-foreground` |

**Componente `StatusBadge`** (novo, em `DashboardPage.tsx`) com variantes:
- `online` → ponto verde + "Online" + contagem em pill `bg-success/15 text-success`
- `offline` → ponto cinza + "Offline" + pill neutro
- `count` → genérico para "X reg.", "Y pedidos"
- `currency` → `text-success font-bold tabular-nums` para R$
- Tooltip nativo (`title=`) explicando o significado em todos os badges.

---

### 4. Modo compacto

**Toggle no header** (ao lado do seletor de auto-refresh):

```text
[ ⊟ Compacto ]   ← botão toggle
```

- Estado `compact: boolean` persistido em `localStorage` (`epj_dashboard_compact`).
- Quando ativo:
  - Grid inferior reduz `min-h-[560px]` → `min-h-[420px]`.
  - Padding de cards: `p-4` → `p-2.5`; `py-3` → `py-2`.
  - KPI cards: `text-2xl` → `text-xl`, ícone `h-9 w-9` → `h-8 w-8`.
  - QuickStats: altura reduzida, label oculto em telas <1280px (apenas ícone + valor com tooltip).
  - Lista de motoboys/atividades: itens `py-2` → `py-1.5`, avatar `h-9` → `h-8`.
- Detecção automática: se viewport < 1280px na primeira carga, sugere modo compacto via toast com botão "Ativar".

---

### 5. Padronização total dos 4 cards do painel inferior

Garantir consistência em **Frota, Top Empresas, Cidades, Atividade Recente**:

**Estrutura unificada** (todos seguem o mesmo esqueleto):
```text
┌─────────────────────────────────┐
│ [Header: ícone+título+ação]     │ ← SectionHeader compartilhado
├─────────────────────────────────┤
│ [Toolbar opcional: busca/tabs]  │ ← shrink-0
├─────────────────────────────────┤
│ [Lista scrollável]              │ ← flex-1 overflow-y-auto
├─────────────────────────────────┤
│ [Footer opcional: paginação]    │ ← shrink-0
└─────────────────────────────────┘
```

- **Mesma altura:** grid `lg:grid-cols-12` com `auto-rows-fr` + `min-h` único (560px / 420px compacto).
- **Mesmos paddings:** header `px-4 py-3`, lista `p-2`, item `px-2.5 py-2`.
- **Mesma tipografia:** definida na seção 3.
- **Migrar `NotificationsPanel`** para usar o mesmo `SectionHeader` exportado de `DashboardPage.tsx` (ou movido para `src/components/admin/SectionHeader.tsx` para compartilhar).
- **Cidades** muda de "card secundário dentro da coluna 2" para um card de altura plena na grade quando houver dados (linha de baixo opcional 4-4-4-4 → 3-3-3-3 quando todos preenchidos).

---

### Arquivos afetados

- `src/pages/DashboardPage.tsx` — toggle compacto, EmptyState, StatusBadge, ajuste de grid e tokens, persistência localStorage.
- `src/components/admin/MotoboysSidebar.tsx` — focus rings, seleção persistente, modo compacto via prop, tipografia padronizada.
- `src/components/admin/NotificationsPanel.tsx` — adoção do SectionHeader compartilhado, EmptyState, suporte a modo compacto via prop.
- `src/components/admin/SectionHeader.tsx` (novo) — extração para reuso entre Dashboard e NotificationsPanel.

**Sem mudanças de DB, hooks ou rotas.** Apenas camada de apresentação.

