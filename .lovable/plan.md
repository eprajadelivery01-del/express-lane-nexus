

# Plano: Ecossistema Multi-App com Supabase Integrado

## Limitação Importante

Lovable é uma plataforma de **app único por projeto** — cada projeto gera uma aplicação React independente. Não é possível criar um monorepo com 4 apps separados dentro de um único projeto Lovable.

**Abordagem recomendada:** Construir os 4 módulos como **rotas dentro deste mesmo projeto**, com separação clara por role (admin, driver, business, marketplace). Cada módulo terá seu próprio layout, navegação e experiência. Na prática, funciona como 4 apps numa única base de código — e quando o projeto migrar para GitHub, pode ser separado em apps independentes.

---

## Fase 1: Backend Supabase (Banco de Dados + Auth)

Conectar ao projeto Supabase `nptkxlrhrlssdsevpgqe` e criar a modelagem completa:

**Tabelas:**
- `user_roles` (admin, company, driver, customer) — tabela separada por segurança
- `profiles` (nome, avatar, telefone, documento)
- `companies` (dados do lojista, região, endereço)
- `delivery_drivers` (veículo, status online, comissão)
- `customers` + `addresses` (múltiplos endereços por cliente)
- `regions` (nome, cor, polígono GeoJSON, preço)
- `deliveries` (status, empresa, entregador, cliente, endereço, valor, comissão)
- `orders` + `order_items` (marketplace)
- `products` (vinculados a empresas)
- `reviews` + `occurrences`
- `invitations` (sistema de convite do admin)

**Auth:** Email + senha via Supabase Auth. Sistema de convite: admin gera link, usuário completa cadastro.

**RLS:** Políticas por role usando função `has_role()` security definer.

**Realtime:** Habilitar nos canais de `deliveries` e `delivery_drivers`.

---

## Fase 2: Estrutura de Rotas Multi-App

```text
/                  → Landing / Login
/admin/*           → Painel Administrativo
/driver/*          → App do Entregador
/business/*        → App do Lojista
/marketplace/*     → App do Consumidor
```

Cada módulo com seu próprio layout, sidebar e navegação. Proteção por role via auth context.

---

## Fase 3: Painel Admin Melhorado (`/admin`)

- Dashboard com métricas em tempo real (Supabase Realtime)
- Mapa MapLibre com **regiões desenháveis** (polígonos GeoJSON com cores)
- Entregadores e corridas ativas no mapa em tempo real
- Gestão de corridas com ações rápidas (editar, cancelar, reatribuir)
- Cadastro de usuários via convite
- Upload de foto de perfil (Supabase Storage)
- Filtros avançados e tabelas com paginação
- Relatórios exportáveis (Excel/PDF)
- Gestão de regiões: desenhar, nomear, colorir, associar preço

---

## Fase 4: App do Entregador (`/driver`)

- Layout mobile-first com botões grandes
- Toggle online/offline
- Receber corridas broadcast em tempo real
- Preview antes de aceitar (valor, comissão, empresa)
- Após aceitar: dados completos + botões de ação (Maps, WhatsApp)
- Reportar ocorrências

---

## Fase 5: App do Lojista (`/business`)

- Criar corrida em 3 passos (cliente → endereço → detalhes)
- Acompanhar entrega em tempo real
- Avaliar entregador
- Histórico de pedidos

---

## Fase 6: Marketplace (`/marketplace`)

- Listagem de lojas e produtos
- Carrinho e checkout
- Pedido integrado com entrega

---

## Detalhes Técnicos

- **Regiões no mapa:** Armazenar polígonos como GeoJSON na coluna `geometry` da tabela `regions`. Usar MapLibre `fill` layers para renderizar com cores. Editor de polígonos via `@mapbox/mapbox-gl-draw` adaptado para MapLibre.
- **Realtime:** `supabase.channel('deliveries').on('postgres_changes', ...)` para sincronização instantânea de status.
- **Storage:** Bucket `avatars` para fotos de perfil.
- **Convites:** Tabela `invitations` com token UUID, role, email. Admin gera link, usuário acessa e completa cadastro.

---

## Ordem de Implementação Sugerida

1. Conectar Supabase + criar schema do banco
2. Auth + sistema de convites + roles
3. Refatorar admin para dados reais
4. Sistema de regiões com polígonos no mapa
5. App do entregador
6. App do lojista
7. Marketplace

Começaremos pela **Fase 1 (banco) + Fase 2 (rotas) + Fase 3 (admin melhorado)** como primeiro bloco de implementação.

