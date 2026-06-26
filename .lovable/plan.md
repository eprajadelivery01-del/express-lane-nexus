## Problema

Na tabela de Corridas (OS), a coluna **Valor** mostra R$ 0,00 em várias entregas.

Investiguei o banco: a tabela `deliveries` tem **duas colunas** de valor — `value` e `price`. Em muitas linhas o valor real da corrida está em `price` (ex.: R$ 6,00) e `value` está 0,00 (ou vice-versa). A listagem está lendo só `delivery.value`, então quando o valor vive em `price`, aparece R$ 0,00.

O código de impressão (linha 190) já usa o fallback correto: `delivery.value ?? delivery.price ?? 0`. A listagem e o painel de detalhes não.

## Correção (somente front-end)

Em `src/pages/DeliveriesPage.tsx`, aplicar o mesmo fallback usado na impressão:

- **Linha 335** (célula "Valor" da tabela): trocar  
  `Number(delivery.value ?? 0)` → `Number(delivery.value || (delivery as any).price || 0)`
- **Linha 506** (campo "Valor da Corrida" no drawer de detalhes): mesma troca.

Uso `||` em vez de `??` porque `value` está armazenado como `0.00` (não `null`) nas linhas problemáticas, então `??` não dispararia o fallback.

## Fora do escopo

- Não vou unificar as colunas `value`/`price` no banco nem mexer em outras telas, services ou lógica de cálculo — você pediu para corrigir a exibição agora. Se quiser, num próximo passo posso consolidar para uma única fonte de valor.