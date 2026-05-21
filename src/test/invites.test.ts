import { describe, expect, it } from "vitest";
import { buildInviteLink, getInviteBaseUrl } from "@/lib/invites";

describe("invite links", () => {
  it("sempre usa o domínio do app do entregador para convites de driver", () => {
    const token = "abc-123";

    expect(getInviteBaseUrl("driver", "https://painel.eprajadelivery.com")).toBe("https://entregador.eprajadelivery.com");
    expect(buildInviteLink(token, "driver", "https://painel.eprajadelivery.com")).toBe(
      "https://entregador.eprajadelivery.com/invite/abc-123",
    );
  });

  it("redireciona para o domínio do lojista em produção e preserva localhost em desenvolvimento", () => {
    expect(buildInviteLink("xyz", "company", "https://painel.eprajadelivery.com")).toBe(
      "https://lojista.eprajadelivery.com/invite/xyz",
    );
    expect(buildInviteLink("xyz", "company", "http://localhost:5173")).toBe(
      "http://localhost:5173/invite/xyz",
    );
  });
});