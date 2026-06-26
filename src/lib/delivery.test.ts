import { describe, it, expect } from "vitest";
import {
  getDeliveryValue,
  formatDeliveryValue,
  formatDeliveryValueBRL,
} from "@/lib/delivery";

describe("@/lib/delivery — getDeliveryValue", () => {
  it("usa value quando ele é > 0", () => {
    expect(getDeliveryValue({ value: 6, price: 12 })).toBe(6);
  });

  it("cai para price quando value === 0", () => {
    expect(getDeliveryValue({ value: 0, price: 6 })).toBe(6);
  });

  it("cai para price quando value é null/undefined", () => {
    expect(getDeliveryValue({ value: null, price: 6 })).toBe(6);
    expect(getDeliveryValue({ price: 6 })).toBe(6);
  });

  it("aceita strings vindas do Postgres numeric", () => {
    expect(getDeliveryValue({ value: "0", price: "6.50" })).toBe(6.5);
    expect(getDeliveryValue({ value: "12.34", price: "0" })).toBe(12.34);
  });

  it("retorna 0 quando ambos vazios", () => {
    expect(getDeliveryValue({ value: 0, price: 0 })).toBe(0);
    expect(getDeliveryValue({})).toBe(0);
    expect(getDeliveryValue(null)).toBe(0);
    expect(getDeliveryValue(undefined)).toBe(0);
  });
});

describe("@/lib/delivery — formatDeliveryValue", () => {
  it("formata com 2 casas decimais", () => {
    expect(formatDeliveryValue({ value: 0, price: 6 })).toBe("6.00");
    expect(formatDeliveryValue({ value: 12.5, price: 0 })).toBe("12.50");
    expect(formatDeliveryValue({})).toBe("0.00");
  });
});

describe("@/lib/delivery — formatDeliveryValueBRL", () => {
  it("prefixa R$ e usa ponto por padrão", () => {
    expect(formatDeliveryValueBRL({ value: 0, price: 6 })).toBe("R$ 6.00");
  });

  it("usa vírgula quando solicitado (impressão / CSV pt-BR)", () => {
    expect(formatDeliveryValueBRL({ value: 0, price: 6.5 }, { commaDecimal: true })).toBe("R$ 6,50");
  });
});
