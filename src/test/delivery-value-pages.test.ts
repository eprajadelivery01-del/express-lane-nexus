import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guardrail: garante que toda página que exibe o valor da corrida usa o
 * helper centralizado `formatDeliveryValue` / `getDeliveryValue` de
 * `@/lib/delivery` (ou, no mínimo, o fallback inline `value || price`).
 * Se alguém reintroduzir `value ?? 0` sem fallback, este teste quebra.
 */
const AFFECTED_FILES = [
  "src/pages/DeliveriesPage.tsx",
  "src/pages/lojista/BusinessHistoryPage.tsx",
  "src/pages/driver/DriverDeliveriesPage.tsx",
  "src/pages/driver/DriverHomePage.tsx",
  "src/pages/business/BusinessHomePage.tsx",
  "src/pages/ReportsPage.tsx",
  "src/components/admin/NotificationsPanel.tsx",
  "src/components/admin/NotificationsPopover.tsx",
];

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("fallback value→price está presente em todas as páginas afetadas", () => {
  it.each(AFFECTED_FILES)("%s usa o helper @/lib/delivery ou fallback inline", (file) => {
    const src = read(file);
    const usesHelper = /from\s+["']@\/lib\/delivery["']/.test(src);
    const usesInlineFallback = /\.value\s*\|\|\s*\([^)]*\)\.price/.test(src);
    expect(
      usesHelper || usesInlineFallback,
      `Esperava \`import ... from "@/lib/delivery"\` ou fallback inline em ${file}`,
    ).toBe(true);
  });

  it.each(AFFECTED_FILES)("%s não usa o padrão antigo `.value ?? 0` para exibir R$", (file) => {
    const src = read(file);
    const lines = src.split("\n");
    const offenders = lines.filter(
      (l) =>
        /toFixed/.test(l) &&
        /\.value\s*\?\?\s*0/.test(l) &&
        !/\.price/.test(l),
    );
    expect(
      offenders,
      `Linhas reintroduziram o bug em ${file}:\n${offenders.join("\n")}`,
    ).toHaveLength(0);
  });
});

/**
 * Telas de Financeiro/Faturas: a coluna `value` é a fonte autoritativa
 * de cobrança. NÃO devem usar o fallback para não alterar valores já
 * faturados aos lojistas.
 */
const BILLING_FILES = [
  "src/pages/lojista/BusinessFinancePage.tsx",
  "src/pages/admin/AdminInvoicesPage.tsx",
  "src/components/admin/PrintableInvoiceDialog.tsx",
];

describe("telas de cobrança preservam d.value autoritativo", () => {
  it.each(BILLING_FILES)("%s não importa o helper @/lib/delivery", (file) => {
    const src = read(file);
    expect(/from\s+["']@\/lib\/delivery["']/.test(src)).toBe(false);
  });
});
