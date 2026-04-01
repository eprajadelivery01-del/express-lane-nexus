

# Plano: Melhorias de Arquitetura, Integração e UX

Este plano cobre 5 blocos de trabalho, priorizados por impacto.

---

## Bloco 1: Camada de Serviços Centralizada

Criar `src/services/` com módulos que encapsulam todas as queries Supabase, eliminando chamadas diretas espalhadas pelos componentes.

**Arquivos a criar:**
- `src/services/deliveries.ts` — CRUD de entregas, filtros, realtime subscription
- `src/services/users.ts` — profiles, roles, convites
- `src/services/regions.ts` — CRUD de regiões com GeoJSON
- `src/services/drivers.ts` — status online/offline, localização
- `src/services/companies.ts` — CRUD empresas
- `src/services/realtime.ts` — setup centralizado de channels realtime

**Padrão:** cada service exporta funções assíncronas + hooks React Query (`useDeliveries`, `useRegions`, etc.) para cache e refetch automático.

**Eventos realtime padronizados:** um único channel `deliveries` e `delivery_drivers` com listeners centralizados em `realtime.ts`, consumidos via hooks nos componentes.

---

## Bloco 2: Sistema de Convites e Cadastro

### Rota `/invite/:token`
Nova página pública de onboarding onde o convidado completa o cadastro:
- Valida token contra tabela `invitations`
- Formulário: nome, telefone, documento, senha, upload de avatar
- Cria conta via `supabase.auth.signUp`, insere role e profile
- Marca convite como `accepted`

### Admin: Tela de Convites
Em `/admin/users`, adicionar botão "Convidar Usuário" que abre modal:
- Email, role (empresa/entregador)
- Gera token e mostra link copiável

### Tela de Perfil `/profile`
- Foto, nome, telefone, documento
- Upload de avatar para bucket `avatars`
- Acessível por todos os roles

---

## Bloco 3: Sistema de Regiões com Polígonos no Mapa

### Refatorar `/admin/regions`
Substituir a listagem atual por uma tela split: **mapa à esquerda + painel à direita**.

**Mapa MapLibre:**
- Renderizar regiões existentes como `fill` + `line` layers usando GeoJSON da coluna `geometry`
- Cada região com sua cor (`color`) e transparência
- Popup ao clicar: nome, preço

**Editor de polígonos:**
- Usar `@mapbox/mapbox-gl-draw` (compatível com MapLibre) para desenhar/editar polígonos
- Ao salvar: converter coordenadas para GeoJSON e gravar na tabela `regions`
- Botões: Criar Região, Editar, Excluir

**Painel lateral:**
- Lista de regiões com cor, nome, preço
- Form para editar nome/cor/preço da região selecionada

**Associação automática de endereço → região:**
- Criar função SQL `find_region_for_point(lat, lng)` que faz point-in-polygon usando os GeoJSON armazenados
- Chamar ao criar/editar endereço

### Migração SQL necessária:
- Função `find_region_for_point` que itera `regions` e verifica se o ponto está dentro do polígono

---

## Bloco 4: Dashboard Admin com Dados Reais + Realtime

Refatorar `DashboardPage.tsx` para usar os services ao invés de mockData:

- `useDeliveries()` para contagens e lista
- `useDrivers()` para motoboys online
- `useCompanies()` para locais ativos
- Realtime: subscrever `deliveries` e `delivery_drivers` para atualizar automaticamente

**MapView melhorado:**
- Mostrar entregadores com posição real (lat/lng da tabela `delivery_drivers`)
- Mostrar corridas ativas com markers
- Mostrar regiões como polígonos coloridos (reusar layer do Bloco 3)

---

## Bloco 5: Tabela de Entregas Melhorada

Refatorar `DeliveriesPage.tsx`:
- Buscar dados reais via `useDeliveries()` com filtros server-side
- Adicionar filtros: por empresa (select), por entregador (select), por data (date range)
- Ações rápidas em cada linha: Editar, Cancelar, Reatribuir (dropdowns/modals)
- Loading skeleton enquanto carrega
- Paginação

---

## Detalhes Técnicos

**Dependências a adicionar:** `@mapbox/mapbox-gl-draw` para editor de polígonos

**Estrutura de pastas final:**
```text
src/
  services/        ← NOVO: camada de dados
  hooks/           ← hooks existentes + novos React Query hooks
  components/
    admin/
    auth/
    business/
    driver/
    shared/        ← NOVO: componentes reutilizáveis entre módulos
  pages/
    admin/         ← NOVO: mover páginas admin para subpasta
    driver/
    business/
    marketplace/
```

**Ordem de implementação:**
1. Camada de serviços (base para tudo)
2. Sistema de convites + perfil
3. Regiões com polígonos no mapa
4. Dashboard com dados reais
5. Tabela de entregas melhorada

