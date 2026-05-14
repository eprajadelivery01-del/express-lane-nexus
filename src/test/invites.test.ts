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

  it("mantém a origem atual para convites de company", () => {
    expect(buildInviteLink("xyz", "company", "https://painel.eprajadelivery.com")).toBe(
      "https://painel.eprajadelivery.com/invite/xyz",
    );
  });
});