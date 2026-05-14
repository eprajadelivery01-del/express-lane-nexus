const DRIVER_INVITE_BASE_URL = "https://entregador.eprajadelivery.com";

export type InviteRole = "driver" | "company";

export function getInviteBaseUrl(role: InviteRole, currentOrigin?: string) {
  if (role === "driver") {
    return DRIVER_INVITE_BASE_URL;
  }

  return currentOrigin ?? window.location.origin;
}

export function buildInviteLink(token: string, role: InviteRole, currentOrigin?: string) {
  return `${getInviteBaseUrl(role, currentOrigin)}/invite/${token}`;
}