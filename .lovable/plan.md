

## Reformulação do Painel Admin – Dashboard

### Objetivo
Remover o mapa hero do Dashboard, reorganizar a hierarquia de informações, e adicionar funções administrativas que faltam para tornar o painel verdadeiramente operacional como o admin central de todo o ecossistema (Marketplace, Lojista, Entregador, Cliente).

---

### 1. Limpeza e Reorganização do Dashboard (`src/pages/DashboardPage.tsx`)

**Remover:**
- `<HeroMapSection />` e o card que o envolve (responsável pelo mapa enorme com botões "Explorar Estabelecimentos", "DRIVERS ONLINE" duplicado, etc.)
- Texto duplicado "DRIVERS ONLINE / REGIONS ACTIVE" (já está no painel de status)

**Nova hierarquia visual (de cima para baixo):**

```text
┌──────────────────────────────────────────────────────────────┐
│ Header: Período (Hoje/7d/30d) + Resumo + Exportar + Atualizar│
├──────────────────────────────────────────────────────────────┤
│ KPIs (4 cards): Em Trânsito | Frota Online | Faturamento |   │
│                  Volume Total                                  │
├──────────────────────────────────────────────────────────────┤
│ Faixa de Quick Stats (6 mini-cards):                         │
│  Pendentes | Aceitos | Coletando | Entregues | Cancelados |  │
│  Ticket Médio                                                 │
├──────────────────────────────────────────────────────────────┤
│ Faixa Operacional (3 cards):                                 │
│  Empresas Ativas | Cidades Ativas | Taxa Conversão           │
├──────────────────────────────────────────────────────────────┤
│ Charts row 1 (2 col): Tendência Receita | Pizza Status       │
├──────────────────────────────────────────────────────────────┤
│ Charts row 2 (2 col): Volume por Hora | Ranking Motoboys     │
├──────────────────────────────────────────────────────────────┤
│ Operacional (3 col):                                         │
│  Status Frota (motoboys) | Lojistas Ativos | Atividade Recente│
└──────────────────────────────────────────────────────────────┘
```

---

### 2. Funções Administrativas Faltantes (a implementar)

**a) Cards de KPI adicionais** com dados reais já existentes na DB:
- Ticket médio (`periodRevenue / periodDelivered`)
- Taxa de cancelamento (`cancelled / total`)
- Tempo médio de entrega (calcular `delivered_at - accepted_at`)

**b) Botão "Atualizar Dados"** no header (refetch React Query global) com feedback visual.

**c) Painel de Alertas Críticos** (novo card no topo se houver):
- Entregas pendentes há > 30 min sem motoboy aceitar
- Motoboys offline com entrega ativa
- Empresas com 0 motoboy disponível na cidade

**d) Atalhos rápidos** (botões no header):
- "Nova Empresa" → abre `CreateCompanyDialog`
- "Convidar Entregador" → abre `GenerateInviteDialog`
- "Ver Mapa Completo" → navega para `/admin/regions`

**e) Validação de funções existentes do admin** (verificar se rotas funcionam):
- `/admin/deliveries` (Corridas) ✓ existente
- `/admin/companies` ✓ existente
- `/admin/drivers` ✓ existente
- `/admin/regions` ✓ existente
- `/admin/reports` (Financeiro) ✓ existente
- `/admin/chat` ✓ existente
- `/admin/profile` ✓ existente
- `/admin/reviews` ⚠️ atualmente é placeholder "Em construção" — **manter como está** (escopo separado)

---

### 3. Detalhes Técnicos

**Arquivos a editar:**
- `src/pages/DashboardPage.tsx` — remover Hero, reorganizar grids, adicionar novos KPIs, atalhos rápidos e painel de alertas
- Não criar novos componentes pesados — reutilizar `CreateCompanyDialog`, `GenerateInviteDialog` já existentes
- `src/components/admin/DashboardCharts.tsx` — manter, apenas ajustar a grid do grid pai

**Cálculos derivados (memoizados):**
- `avgTicket = periodRevenue / Math.max(periodDelivered, 1)`
- `cancelRate = cancelled / Math.max(total, 1) * 100`
- `avgDeliveryTime = média de (delivered_at - accepted_at) em min`
- `criticalAlerts = pendentes há > 30min sem motoboy`

**Layout responsivo:**
- Mobile: cards empilhados (1 col)
- Tablet: 2 col
- Desktop (≥lg): grids 4-col / 3-col conforme seção

**Sem mudanças de DB** — todas as métricas usam tabelas e hooks existentes (`useDeliveries`, `useDrivers`, `useCompanies`, `useDeliveryStats`, `useRegions`).

---

### Resultado Final
Dashboard limpo, denso de informação útil, com hierarquia clara: **KPIs principais → métricas operacionais → gráficos → listas de monitoramento**, sem o mapa "hero" decorativo que ocupava espaço sem valor analítico, e com atalhos rápidos para as ações administrativas mais frequentes.

