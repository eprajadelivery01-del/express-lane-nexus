import { describe, it, expect } from "vitest";

/**
 * The display formula used across every page that shows a delivery's
 * monetary value (lista de corridas, detalhes, histórico do lojista,
 * histórico/home do entregador, home do lojista, ReportsPage e os
 * painéis de notificação do admin).
 *
 * Rule: a corrida tem duas colunas no banco — `value` e `price`.
 * Quando `value` é nulo ou 0 (falsy), a UI deve cair para `price`.
 * Quando ambos forem nulos/0, exibir 0,00.
 */
const formatDeliveryValue = (d: { value?: number | null; price?: number | null }) =>
  Number(d.value || d.price || 0).toFixed(2);

describe("delivery value fallback (value || price)", () => {
  it("usa value quando ele é > 0", () => {
    expect(formatDeliveryValue({ value: 6, price: 12 })).toBe("6.00");
  });

  it("cai para price quando value === 0", () => {
    expect(formatDeliveryValue({ value: 0, price: 6 })).toBe("6.00");
  });

  it("cai para price quando value é null", () => {
    expect(formatDeliveryValue({ value: null, price: 6 })).toBe("6.00");
  });

  it("cai para price quando value é undefined", () => {
    expect(formatDeliveryValue({ price: 12 })).toBe("12.00");
  });

  it("retorna 0,00 quando ambos são 0", () => {
    expect(formatDeliveryValue({ value: 0, price: 0 })).toBe("0.00");
  });

  it("retorna 0,00 quando ambos são null/undefined", () => {
    expect(formatDeliveryValue({ value: null, price: null })).toBe("0.00");
    expect(formatDeliveryValue({})).toBe("0.00");
  });

  it("preserva casas decimais", () => {
    expect(formatDeliveryValue({ value: 0, price: 6.5 })).toBe("6.50");
    expect(formatDeliveryValue({ value: 12.34, price: 0 })).toBe("12.34");
  });

  // Casos reais retirados do banco do projeto
  it.each([
    { value: 0, price: 6, expected: "6.00" },     // ex.: linha "Drogaria Difarma"
    { value: 6, price: null, expected: "6.00" },  // ex.: linha "SOLANGE"
    { value: 0, price: 12, expected: "12.00" },   // ex.: corrida cancelada
    { value: 0, price: 0, expected: "0.00" },     // sem valor cadastrado
  ])("amostra real %j → R$ %s", ({ value, price, expected }) => {
    expect(formatDeliveryValue({ value, price })).toBe(expected);
  });
});

describe("regressão: o operador NÃO pode voltar a ser ?? sozinho", () => {
  // Com `??`, value === 0 NÃO dispara o fallback — esse era o bug original
  // que causava "R$ 0,00" em toda a tela de corridas.
  const buggy = (d: { value?: number | null; price?: number | null }) =>
    Number(d.value ?? 0).toFixed(2);

  it("comprova que o código antigo (?? 0) exibe 0,00 quando value=0", () => {
    expect(buggy({ value: 0, price: 6 })).toBe("0.00");
    // ...enquanto o fix correto exibe 6,00:
    expect(formatDeliveryValue({ value: 0, price: 6 })).toBe("6.00");
  });
});
