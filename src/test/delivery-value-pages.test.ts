import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guardrail: garante que toda página que exibe o valor da corrida usa o
 * fallback `value || price || 0`. Se alguém reintroduzir `value ?? 0`
 * (sem fallback para price), este teste quebra e impede o regresso do bug.
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
  it.each(AFFECTED_FILES)("%s contém o fallback value || price", (file) => {
    const src = read(file);
    // Aceita variações de nome de variável (delivery, d, del, detailDelivery)
    const hasFallback = /\.value\s*\|\|\s*\([^)]*\)\.price/.test(src);
    expect(hasFallback, `Esperava encontrar \`.value || (...).price\` em ${file}`).toBe(true);
  });

  it.each(AFFECTED_FILES)("%s não usa o padrão antigo `.value ?? 0` para exibir R$", (file) => {
    const src = read(file);
    // Procura linhas que misturam R$, toFixed e o padrão buggy `.value ?? 0`
    // ignorando o caso onde já existe fallback `||` antes.
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
