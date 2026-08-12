# Corrigir o aviso "WebSocket is closed before the connection is established"

## O que está acontecendo

Esse aviso aparece quando um canal Realtime é criado e removido antes do handshake do WebSocket terminar. No projeto isso acontece porque vários hooks abrem canais próprios e os fecham logo em seguida quando o estado de autenticação muda (por exemplo na tela de login, onde `user`/`profile` mudam de `undefined` para o valor real e os efeitos re-executam).

Pontos verificados no código:

- `src/services/realtime.ts` cria 3 canais com um sufixo aleatório a cada montagem (`admin-deliveries-<random>`, etc.), então qualquer remontagem gera canais novos em vez de reaproveitar.
- `src/services/realtime.ts` (`useDriverRealtime`) usa `channel(\`driver-deliveries-${Math.random()}\`)` — mesmo problema.
- `src/hooks/useRealtimeDeliveries.ts` e `src/services/realtime.ts` assinam a mesma tabela `deliveries` em canais separados.
- `src/components/admin/MarketingReceiptListener.tsx` reassina no efeito com dependência de `user?.id` e `profile.role`, ou seja, abre/fecha canal durante o carregamento do perfil.
- `src/components/shared/GlobalMarketingListener.tsx` chama `supabase.channel('marketing-receipts').send(...)` dentro do callback: cria um canal novo a cada evento, nunca inscrito nem removido (vazamento e conexões abortadas).

## Correções propostas

1. Estabilizar nomes de canais: remover os sufixos aleatórios de `useAdminRealtime` e `useDriverRealtime`, usando nomes fixos por escopo.
2. Só assinar quando a sessão estiver resolvida: nos listeners dependentes de auth (`MarketingReceiptListener`, notificações de chat), sair cedo enquanto o auth ainda está carregando, evitando o par subscribe/remove imediato.
3. Fechar canal de forma segura: no cleanup, remover o canal apenas se ele já estiver inscrito; caso contrário, aguardar o callback de `subscribe` antes de remover — elimina o fechamento durante o handshake.
4. Reutilizar um único canal de broadcast `marketing-receipts` no `GlobalMarketingListener` (criado e inscrito uma vez no efeito) em vez de criar um canal novo a cada notificação recebida.
5. Evitar duplicidade em `deliveries`: manter a assinatura central em `useAdminRealtime` e fazer `useRealtimeDeliveries` reaproveitá-la (ou restringir seu uso a telas que não usam o layout admin).

## Detalhes técnicos

- Adicionar em `src/services/realtime.ts` um helper `safeRemoveChannel(channel)` que checa `channel.state` e só chama `supabase.removeChannel` quando o canal está `joined`/`errored`/`closed`, ou registra a remoção para o próximo tick.
- Nenhuma mudança de banco de dados, RLS ou lógica de negócio; apenas o ciclo de vida das assinaturas no frontend.

## Observação

Esse aviso do console é inofensivo (não quebra funcionalidade), mas as correções acima removem o ruído e evitam conexões Realtime desperdiçadas.
