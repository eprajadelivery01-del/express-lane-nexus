## Problema

O link de convite gerado no painel admin aponta para `https://entregador.eprajadelivery.com` (e `https://lojista.eprajadelivery.com` para empresas), mas esses domínios **não estão conectados / não resolvem DNS**. O usuário acaba sendo redirecionado para `admin.epraja.com.br` (também inexistente) por algum proxy externo, resultando em `DNS_PROBE_FINISHED_NXDOMAIN`.

A rota `/invite/:token` já existe **neste mesmo app** (ver `src/App.tsx:58`), e o domínio ativo hoje é `painel.eprajadelivery.com`. Não faz sentido o admin gerar links para outro host.

## Mudanças

### 1. `src/components/admin/GenerateInviteDialog.tsx`
Substituir o bloco hardcoded de `baseUrl`:

```ts
const baseUrl =
  selectedRole === "driver"
    ? "https://entregador.eprajadelivery.com"
    : "https://lojista.eprajadelivery.com";
const link = `${baseUrl}/invite/${token}`;
```

por:

```ts
const link = `${window.location.origin}/invite/${token}`;
```

Assim o link sempre usa o domínio onde o admin está logado (ex.: `https://painel.eprajadelivery.com/invite/<token>`), que é onde a rota efetivamente existe.

### 2. `src/pages/InvitePage.tsx` (linhas 114–121)
Trocar o redirect pós-cadastro hardcoded para caminhos relativos no mesmo origin:

```ts
const redirectPath = invitation.role === "company" ? "/business" : "/";
setTimeout(() => {
  window.location.href = redirectPath;
}, 3000);
```

Mantém o usuário no mesmo host do convite (que é o painel) e leva para a área correspondente já roteada no `App.tsx`.

## Fora de escopo

- Não vou mexer em CORS, edge functions, DriversPage.tsx ou ChatPage.tsx — são correções anteriores não relacionadas a este bug.
- Não vou registrar domínios novos. Se no futuro você quiser portais separados (`entregador.*`, `lojista.*`), basta conectá-los em Project Settings → Domains; o código com `window.location.origin` continuará correto em qualquer host.

## Validação

Após a mudança, gerar um novo link de convite no painel deve produzir uma URL como `https://painel.eprajadelivery.com/invite/<uuid>`, que abre a `InvitePage` corretamente.
