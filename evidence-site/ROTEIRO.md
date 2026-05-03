# Roteiro De Produção

## Versão PT

| Cena | Narração | Texto na tela | Visual | Evidência |
| --- | --- | --- | --- | --- |
| 1 | "Bitcoin consegue guardar valor. Mas contratos financeiros ainda parecem invisíveis." | O problema: ninguém vê o contrato acontecendo. | Fundo escuro com blocos passando e uma linha de transações apagada. | Nenhuma; abertura conceitual. |
| 2 | "A NITI transforma o contrato em uma sequência visível de transações preparadas." | Parent, bridge, child. | Três blocos conectados por uma linha animada. | Bundle Lazy signet/testnet. |
| 3 | "Antes do evento, a bridge está trancada. Ela existe, mas ainda não é uma assinatura Bitcoin válida." | Preparado, mas não ativado. | Cadeado sobre a bridge; assinatura em estado incompleto. | `preResolutionSignatureVerifies = false`. |
| 4 | "Quando o oracle publica o resultado, ele revela um segredo." | O segredo do oracle é a chave. | Ponto do oracle acende e envia um pulso para parent e bridge. | `activatingAttestationSecretHex`. |
| 5 | "O mesmo segredo fecha o parent e completa a bridge." | Uma revelação, duas ativações. | Parent CET confirma; bridge assina e confirma. | Parent CET e bridge txids. |
| 6 | "A bridge cria o funding do child. Agora o próximo contrato já está vivo." | O child nasce na blockchain. | Output do bridge vira entrada do child. | Child funding outpoint. |
| 7 | "No produto-demo, isso pode representar exposição educativa ao dólar usando sats de testnet." | Testnet Dollar Exposure Demo. | Cartão com alvo em dólar, preço BTC/USD e payout em sats. | Fórmula `min(Q, ceil(D * 100_000_000 / P))`. |
| 8 | "Se o resultado errado aparece, o caminho errado não abre." | Falha fechada. | Linha vermelha para o outcome errado se apaga. | `wrongOutcomeRejected = true`. |
| 9 | "Alice, Bob ou uma watchtower podem completar a mesma bridge se tiverem o pacote preparado." | Retainer: qualquer holder autorizado consegue agir. | Três holders apontam para o mesmo bridge txid. | `bilateralLazyActivation.holders`. |
| 10 | "No final, você pode rodar o teste em signet/testnet e verificar o bundle." | Teste você mesmo. | Terminal com comandos, campo de txid e links para explorer. | Comandos `public:lazy-cdlc-*` e verifier. |

## EN Version

| Scene | Voiceover | On-screen copy | Visual | Evidence |
| --- | --- | --- | --- | --- |
| 1 | "Bitcoin can store value. Financial contracts still look invisible." | The problem: nobody sees the contract happening. | Dark block stream with a dormant transaction line. | Conceptual opening. |
| 2 | "NITI turns the contract into a visible sequence of prepared transactions." | Parent, bridge, child. | Three blocks connected by an animated line. | Lazy signet/testnet bundle. |
| 3 | "Before the event, the bridge is locked. It exists, but it is not yet a valid Bitcoin signature." | Prepared, not activated. | Lock over the bridge; incomplete signature state. | `preResolutionSignatureVerifies = false`. |
| 4 | "When the oracle publishes the outcome, it reveals a secret." | The oracle secret is the key. | Oracle point lights up and sends a pulse to parent and bridge. | `activatingAttestationSecretHex`. |
| 5 | "The same secret resolves the parent and completes the bridge." | One revelation, two activations. | Parent CET confirms; bridge signs and confirms. | Parent CET and bridge txids. |
| 6 | "The bridge creates the child funding output. The next contract is now live." | The child appears on-chain. | Bridge output becomes child input. | Child funding outpoint. |
| 7 | "In the product demo, this can represent educational dollar exposure with testnet sats." | Testnet Dollar Exposure Demo. | Card with target value, BTC/USD price, and sats payout. | Formula `min(Q, ceil(D * 100_000_000 / P))`. |
| 8 | "If the wrong outcome appears, the wrong path stays closed." | Fail closed. | Red wrong-outcome line fades out. | `wrongOutcomeRejected = true`. |
| 9 | "Alice, Bob, or a watchtower can complete the same bridge if they hold the prepared package." | Retainer: any authorized holder can act. | Three holders point to the same bridge txid. | `bilateralLazyActivation.holders`. |
| 10 | "At the end, run the signet/testnet flow and verify the bundle." | Try it yourself. | Terminal commands, txid field, explorer links. | `public:lazy-cdlc-*` commands and verifier. |
