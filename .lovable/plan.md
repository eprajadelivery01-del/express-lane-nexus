# Plano para corrigir o painel admin

## Objetivo
Restaurar o painel para que perfis, entregas e entregadores carreguem sem erro 500, garantindo que as regras de acesso continuem seguras.

## O que vou fazer

1. **Corrigir a causa raiz no Supabase**
   - Ajustar as policies de `deliveries`, `delivery_drivers` e `profiles` para remover dependências circulares entre elas.
   - Restaurar `get_driver_id(uuid)` para um formato seguro que não quebre consultas RLS.
   - Revisar `is_driver(uuid)` pelo mesmo motivo, para evitar novos loops de permissão.

2. **Validar as consultas que o painel usa**
   - Testar diretamente as leituras equivalentes a:
     - `profiles` por `user_id`
     - `delivery_drivers` ordenado por `created_at`
     - `deliveries` com `companies(...)` e `delivery_drivers(...)`
   - Confirmar que voltaram a responder sem 500.

3. **Blindar o frontend contra regressões**
   - Revisar os pontos do app que ainda dependem de `profiles.role` como fonte de permissão, porque o projeto já usa `user_roles` como fronteira de confiança.
   - Manter o painel consultando apenas campos realmente suportados e compatíveis com as policies corrigidas.

4. **Verificar o fluxo do admin**
   - Confirmar que a autenticação carrega perfil e roles sem travar a tela.
   - Confirmar que listagens principais do painel voltam a aparecer.

## Causa provável encontrada
A migração de endurecimento de segurança criou uma combinação perigosa:
- `deliveries` depende de `get_driver_id(auth.uid())`
- `get_driver_id()` lê `delivery_drivers`
- `delivery_drivers` tem policy que consulta `deliveries`
- `profiles` também depende de `deliveries`

Isso pode gerar recursão/avaliação circular nas policies e responder com erro interno 500 no PostgREST.

Além disso, `get_driver_id()` foi alterada para `SECURITY INVOKER`, o que piora esse cenário porque ela passa a obedecer as mesmas policies circulares ao tentar resolver o motorista do usuário atual.

## Resultado esperado
- O login/admin deixa de gerar erro 500
- Entregas e entregadores voltam a carregar
- O painel continua com acesso restrito por papel e vínculo real

## Detalhes técnicos
- Vou aplicar uma nova migration para quebrar a circularidade de RLS.
- A abordagem mais segura é fazer as policies de leitura usarem subconsultas diretas por `user_id` onde necessário, ou helper functions com privilégio controlado e `search_path` fixo.
- Depois disso, valido as queries reais do painel no banco e reviso os pontos críticos do frontend que fazem essas leituras.