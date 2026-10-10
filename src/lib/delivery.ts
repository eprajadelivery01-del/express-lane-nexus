/**
 * Utilitários de exibição para entregas (deliveries).
 *
 * A tabela `deliveries` no Supabase tem duas colunas monetárias herdadas
 * — `value` e `price`. Dependendo do fluxo que originou a corrida,
 * o valor real pode estar em uma OU em outra:
 *   - `value` = 0 / null  → usar `price`
 *   - `value` > 0         → usar `value`
 *   - ambos vazios        → 0
 *
 * Use estes helpers em qualquer lugar que EXIBA o valor da corrida
 * (lista, detalhes, histórico, relatórios, notificações).
 *
 * ⚠️ Não usar em telas de Financeiro/Faturas: lá a cobrança é calculada
 * a partir da coluna `value` autoritativa para não alterar valores
 * faturados ao lojista.
 */

export type DeliveryValueShape = {
  value?: number | string | null;
  price?: number | string | null;
  delivery_fee?: number | string | null;
};

export function getDeliveryValue(d: any): number {
  if (!d) return 0;
  
  let orderFee = 0;
  let hasOrderFee = false;
  
  // 1. Tenta pegar do pedido associado (Marketplace)
  if (d.orders) {
    if (Array.isArray(d.orders) && d.orders.length > 0 && d.orders[0].delivery_fee != null) {
      orderFee = Number(d.orders[0].delivery_fee);
      hasOrderFee = true;
    } else if (!Array.isArray(d.orders) && d.orders.delivery_fee != null) {
      orderFee = Number(d.orders.delivery_fee);
      hasOrderFee = true;
    }
  }

  // 2. Valores das colunas da própria tabela deliveries
  const v = Number(d.value) || 0;
  const p = Number(d.price) || 0;
  const df = Number(d.delivery_fee) || 0;

  // Se veio do Marketplace e tem taxa > 0, respeita a taxa original
  if (hasOrderFee && orderFee > 0) {
    return orderFee;
  }
  
  // Ordem autoritativa: value -> price -> delivery_fee
  if (v > 0) return v;
  if (p > 0) return p;
  if (df > 0) return df;
  
  // Se todos forem 0, então é de fato um Frete Grátis (0.00)
  return 0;
}

/** Mesma lógica, formatada com 2 casas decimais (ex.: "6.00"). */
export function formatDeliveryValue(d: DeliveryValueShape | null | undefined): string {
  return getDeliveryValue(d).toFixed(2);
}

/** Mesma lógica, já prefixada com "R$ " (ex.: "R$ 6,00"). */
export function formatDeliveryValueBRL(
  d: DeliveryValueShape | null | undefined,
  { commaDecimal = false }: { commaDecimal?: boolean } = {},
): string {
  const fixed = formatDeliveryValue(d);
  return `R$ ${commaDecimal ? fixed.replace(".", ",") : fixed}`;
}

export function isGenericCustomerName(val: string | null | undefined): boolean {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return (
    s === "" ||
    s === "cliente marketplace" ||
    s === "consumidor" ||
    s === "cliente" ||
    s === "usuário" ||
    s === "usuario" ||
    s === "visitante" ||
    s === "null" ||
    s === "undefined" ||
    s === "não informado" ||
    s === "nao informado"
  );
}

export function getDeliveryCustomerName(delivery: any): string {
  if (!delivery) return "Cliente";

  // 1. Tenta nome na entrega (se não for genérico)
  if (delivery.customer_name && !isGenericCustomerName(delivery.customer_name)) {
    return String(delivery.customer_name).trim();
  }

  // 2. Tenta do pedido associado (orders)
  const order = Array.isArray(delivery.orders) ? delivery.orders[0] : delivery.orders;
  if (order) {
    if (order.customer_name && !isGenericCustomerName(order.customer_name)) {
      return String(order.customer_name).trim();
    }
    if (order.customers?.name && !isGenericCustomerName(order.customers.name)) {
      return String(order.customers.name).trim();
    }
    if (order.profiles?.full_name && !isGenericCustomerName(order.profiles.full_name)) {
      return String(order.profiles.full_name).trim();
    }
    if (order.profile?.full_name && !isGenericCustomerName(order.profile.full_name)) {
      return String(order.profile.full_name).trim();
    }
  }

  // 3. Tenta do perfil direto se enriquecido
  if (delivery.profile?.full_name && !isGenericCustomerName(delivery.profile.full_name)) {
    return String(delivery.profile.full_name).trim();
  }
  if (delivery.profiles?.full_name && !isGenericCustomerName(delivery.profiles.full_name)) {
    return String(delivery.profiles.full_name).trim();
  }

  // 4. Tenta do cadastro de clientes direto se enriquecido
  if (delivery.customer?.name && !isGenericCustomerName(delivery.customer.name)) {
    return String(delivery.customer.name).trim();
  }
  if (delivery.customers?.name && !isGenericCustomerName(delivery.customers.name)) {
    return String(delivery.customers.name).trim();
  }

  return delivery.customer_name && !isGenericCustomerName(delivery.customer_name)
    ? String(delivery.customer_name).trim()
    : "Cliente";
}

export function getDeliveryCustomerPhone(delivery: any): string {
  if (!delivery) return "Não informado";
  const order = Array.isArray(delivery.orders) ? delivery.orders[0] : delivery.orders;
  const candidates = [
    delivery.customer_phone,
    order?.customer_phone,
    order?.customers?.phone,
    order?.profiles?.phone,
    order?.profile?.phone,
    delivery.profile?.phone,
    delivery.profiles?.phone,
    delivery.customer?.phone,
    delivery.customers?.phone,
  ];
  for (const c of candidates) {
    if (c && typeof c === "string") {
      const clean = c.trim();
      if (clean && clean !== "Não informado" && clean !== "nao informado" && clean !== "null") {
        return clean;
      }
    }
  }
  return "Não informado";
}
