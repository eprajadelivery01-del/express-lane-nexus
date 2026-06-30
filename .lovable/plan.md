## Problemas identificados na aba Financeiro / Relatórios

Comparando a tela enviada com o código atual de `src/pages/ReportsPage.tsx` e `src/services/deliveries.ts`:

1. **Comissões Estimadas sempre R$ 0,00 com badge "8.5% do faturamento"**
   - O card lê `(d as any).commission`, mas o `useDeliveries` **não seleciona** a coluna `commission` do Supabase. Resultado: sempre 0.
   - O texto "8.5% do faturamento" está hard-coded e não reflete nada real.

2. **Status Operacional mostra "Finalizada" duplicado (ex.: 5 + 28)**
   - O dataset agrupa por `status` cru, então `delivered` e `completed` viram entradas separadas com o mesmo rótulo "Finalizada". O mesmo afeta o gráfico de pizza e o filtro de status (escolher "Finalizadas" só pega `delivered`, esconde `completed`).

3. **Filtro de status "Finalizadas" perde corridas com status `completed`**
   - Filtro envia apenas `delivered` para o Supabase. Precisa enviar ambos.

4. **CSV e PDF saem com valores errados**
   - CSV exporta coluna "Comissão" sempre zerada (mesma causa do item 1).
   - PDF usa `totalCompanyDue + totalDriverDue` no card "Comissões Plataforma", mas o card da tela mostra `totalCommission` (sempre 0) — números divergentes entre tela e PDF.
   - Rodapé "TOTAIS" da tabela do PDF soma `commission` zerado.

5. **Subtítulo confuso "33 finalizadas na pág."**
   - Texto técnico vazado para o usuário. Voltar ao formato anterior ("X finalizadas").

6. **Detalhamento limitado a 50 na tela mas título diz "36 registros encontrados"**
   - Sem impacto agora (36 < 50), mas o `slice(0, 50)` esconde linhas quando o período tiver mais. Manter slice mas com aviso, ou remover.

## Correções (somente front-end + um campo no select)

### `src/services/deliveries.ts`
- Adicionar `commission` ao `select` de `useDeliveries` (e manter o resto inalterado) para que o valor real venha do banco.

### `src/pages/ReportsPage.tsx`
- **Unificar `delivered` + `completed`** num único status lógico `delivered` em três pontos:
  - `validDeliveries` (já cobre, manter).
  - `statusData` (agregar `completed` dentro de `delivered` antes de gerar a entrada do gráfico).
  - Filtro "Finalizadas": ao enviar para o backend, usar `.in('status', ['delivered','completed'])` via um pequeno ajuste no hook (passar array) **ou** simplesmente filtrar localmente quando `statusFilter === 'delivered'`. Vou pelo filtro local para não mexer na assinatura do hook.
- **Card Comissões Estimadas**:
  - Valor = `totalCommission` real (agora populado).
  - Remover o `trend="8.5% do faturamento"` hard-coded. Trocar por percentual real: `(totalCommission / totalValue * 100).toFixed(1)+"% do faturamento"` (oculto quando `totalValue === 0`).
  - Subtítulo: "Comissões pagas aos entregadores" (mais honesto, já que a coluna `commission` em `deliveries` é o ganho do entregador).
- **Subtítulo do card "Total de Corridas"**: trocar `${completedCount} finalizadas na pág.` por `${completedCount} finalizadas`.
- **PDF (`handlePrint`)**:
  - Card "Comissões Plataforma" do PDF: continuar somando `totalCompanyDue + totalDriverDue` (esse é o devido à plataforma — semântica diferente da tela), mas **renomear** o rótulo para "Devido à Plataforma" para evitar choque com a tela. O card da tela continua sendo "Comissões Estimadas".
  - Coluna "Comissão" na tabela detalhada agora exibe o valor real (vem do `commission` selecionado).
  - Rodapé "TOTAIS" passa a fechar com `totalCommission` correto.
- **Tabela detalhamento (tela)**: remover o `slice(0, 50)` — já temos paginação por `pageSize: 1000` no fetch, então mostrar tudo que está no array (`deliveries.map`) para bater com o contador "X registros encontrados".

### Fora do escopo
- Não vou unificar as colunas `value` / `price` / `delivery_fee` no banco — o helper `getDeliveryValue` já cobre.
- Não vou reorganizar a UI nem trocar paleta — só corrigir cálculos, rótulos enganosos e exportações.
- Não vou mexer em Dashboard, faturas, financeiro do lojista nem nas tabelas Supabase.

## Verificação após implementar
1. Abrir `/financeiro` (Relatórios) e conferir:
   - Card "Comissões Estimadas" mostra valor > 0 (se houver `commission` no banco) e percentual real.
   - Lista "Status Operacional" não duplica "Finalizada".
   - Filtro "Finalizadas" lista tanto `delivered` quanto `completed`.
2. Clicar **Exportar CSV** e abrir o arquivo: coluna Comissão com valores reais; total de linhas = contagem da tela.
3. Clicar **Imprimir Relatório**: KPIs e tabela batem com a tela; rodapé "TOTAIS" fecha; rótulo "Devido à Plataforma" claro.
