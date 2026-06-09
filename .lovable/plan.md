# Cupons Globais (Admin)

Permitir que o admin crie cupons que valem em **todas as lojas** ou apenas em **um conjunto selecionado de lojas**, e fazer o marketplace respeitar essa regra na hora de aplicar o desconto.

## Modelo de dados

A tabela `public.coupons` já existe (`code`, `discount_type`, `discount_value`, `min_order_value`, `max_discount_value`, `expires_at`, `usage_limit`, `used_count`, `company_id`, `active`).

Regras de escopo:
- `company_id IS NULL` **e** sem linhas em `coupon_companies` → **cupom global** (vale em qualquer loja).
- `company_id IS NULL` **e** com linhas em `coupon_companies` → **cupom restrito** às lojas selecionadas.
- `company_id` preenchido → cupom legado da loja (continua funcionando como hoje).

Nova tabela:

```
coupon_companies
  coupon_id  uuid  FK coupons(id) ON DELETE CASCADE
  company_id uuid  FK companies(id) ON DELETE CASCADE
  PRIMARY KEY (coupon_id, company_id)
```

RLS:
- `SELECT` para `authenticated` (cliente precisa ler para validar no checkout).
- `INSERT/UPDATE/DELETE` apenas para `admin` (via `has_role`).
- Em `coupons`, adicionar policy de `INSERT/UPDATE/DELETE` para admin (hoje só lojista mexe nos próprios).

## Backend: validação de escopo no checkout

Atualizar `create_order_v3` (passo 6 — aplicação do cupom) para rejeitar quando a loja do pedido não estiver no escopo do cupom:

```
IF v_coupon.company_id IS NOT NULL AND v_coupon.company_id <> p_company_id THEN
  v_discount := 0;  -- (ou retornar erro "cupom não válido nesta loja")
ELSIF v_coupon.company_id IS NULL AND EXISTS (SELECT 1 FROM coupon_companies WHERE coupon_id = v_coupon.id) THEN
  IF NOT EXISTS (SELECT 1 FROM coupon_companies WHERE coupon_id = v_coupon.id AND company_id = p_company_id) THEN
     v_discount := 0;
  END IF;
END IF;
```

Também incrementar `used_count` e respeitar `usage_limit`/`expires_at` (hoje a função não checa — incluir no mesmo bloco).

Nova RPC auxiliar para o marketplace pré-validar antes de submeter:
`validate_coupon(p_code text, p_company_id uuid, p_subtotal numeric) → jsonb` retornando `{valid, discount, reason}`.

## Admin UI

Nova página `src/pages/admin/CouponsPage.tsx` + rota `/admin/coupons` em `App.tsx` (protegida por `requiredRole="admin"`).

Item no `AdminSidebar` (`Ticket` icon do lucide), entre Regiões e Financeiro.

Layout:
- Tabela com cupons existentes (código, tipo, valor, escopo "Global" / "N lojas" / nome da loja, validade, usos, status).
- Botão **Novo cupom** abre dialog com:
  - código, descrição
  - tipo (`percentage` / `fixed`) e valor
  - pedido mínimo, desconto máximo
  - validade, limite de usos
  - **escopo**: radio `Todas as lojas` | `Lojas selecionadas` → quando "selecionadas", mostra multi-select (Command/Checkbox) com as lojas ativas vindas de `companies`.
- Editar/desativar/excluir.

Serviço: `src/services/coupons.ts` com `listCoupons`, `createCoupon`, `updateCoupon`, `deleteCoupon`, `setCouponCompanies` (substitui as linhas em `coupon_companies`), `listCompanyOptions`. Hooks React Query para invalidação.

## Marketplace (app cliente)

O fluxo de checkout do marketplace chama `create_order_v3`, então o desconto passa a respeitar o escopo automaticamente assim que a função for atualizada.

Para feedback imediato no carrinho (antes de finalizar), o componente de aplicar cupom passa a chamar a nova RPC `validate_coupon(code, company_id, subtotal)` e exibir mensagem de erro quando o cupom não vale para a loja.

## Arquivos a criar / editar

- **migration**: criar `coupon_companies` + GRANTs + RLS; ALTER nas policies de `coupons` (admin full access); atualizar `create_order_v3`; criar `validate_coupon`.
- **novo**: `src/pages/admin/CouponsPage.tsx`, `src/components/admin/CouponDialog.tsx`, `src/services/coupons.ts`.
- **editar**: `src/App.tsx` (rota), `src/components/admin/AdminSidebar.tsx` (item).
- **editar marketplace cart**: localizar componente de aplicar cupom (provavelmente em `src/contexts/CartContext.tsx` ou página de checkout do cliente) e trocar a validação local pela RPC.

## Observações

- Não mexe na estrutura de `user_coupons` (continua registrando uso por cliente).
- Cupons criados por lojistas (`company_id` preenchido) continuam funcionando sem alteração.
- O usuário precisa ter perfil `admin` em `user_roles` para acessar a nova página (já garantido pelo `ProtectedRoute`).
