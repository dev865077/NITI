# Roteiro De Produção

## Versão PT

| Cena | Narração | Texto na tela | Visual | Evidência |
| --- | --- | --- | --- | --- |
| 1 | "Começa aqui. Isto não é uma ilustração: é a bridge no mempool.space." | Esta transação é a bridge. | Print real da bridge em signet, grande, com txid visível. | `b71a2b79...22e59c`. |
| 2 | "Leia como bitcoiner: entrada, saída, taxa, confirmações. A dúvida é: por que ela só ficou válida depois do oracle falar?" | A pergunta: por que agora? | Zoom visual na entrada de 7,000 sats, saída de 6,500 sats e taxa de 500 sats. | Bundle bilateral signet. |
| 3 | "A NITI transforma contrato em trilha de UTXOs: parent funding, parent CET, bridge, child funding." | O contrato vira trilha. | Quatro blocos pixelados conectados. | `lazyWindow.nodes` e `activationPath`. |
| 4 | "Primeiro entra o colateral no parent. É Bitcoin normal: funding aparece no explorer." | Cena 1: parent funding. | Print real do parent funding. | `c61fc4bc...3a6e5c6`, 8,000 sats. |
| 5 | "Depois o oracle não aprova nada; ele revela um número. Esse número é a senha do outcome." | Cena 2: o oracle revela `sₓ`. | Tela brutalista com `BTCUSD_ABOVE_STRIKE` e `sₓ`. | `activatingAttestationSecretHex`. |
| 6 | "Com essa senha, o parent fecha no CET do outcome certo." | Cena 3: parent CET. | Print real do parent CET. | `a8963ae9...774d769b`, 7,000 sats. |
| 7 | "A sacada é que a mesma senha completa a bridge. A bridge gasta o CET e cria o funding do child." | Cena 4: bridge ativa child. | Print real da bridge com entrada, saída e taxa. | `b71a2b79...22e59c`, child outpoint `:0`. |
| 8 | "Sem o segredo, a bridge é só um rascunho criptográfico. Com o segredo, vira witness Bitcoin." | Uma revelação. Dois efeitos. | Equação grande: `adaptor + sₓ = witness`. | `verifiesAdaptor`, completed bridge signature. |
| 9 | "Se a senha errada aparece, nada abre. O bundle mostra o caminho ruim falhando fechado." | Outcome errado rejeitado. | Pilha vermelha: wrong outcome, missing package, early refund. | `wrongOutcomeRejected`, `missingPackageRejected`, timelock checks. |
| 10 | "Alice, Bob e watchtower chegam ao mesmo txid porque todos tinham o pacote preparado." | Retainer: mesmo txid. | Três cards apontando para o mesmo bridge txid. | `bilateralLazyActivation.holders`. |
| 11 | "No produto-demo, troque outcome por preço BTC/USD: testnet sats, alvo didático, payout calculado." | Testnet Dollar Exposure Demo. | Cartão brutalista com colateral, preço, alvo e claim. | Fórmula educativa, sem valor real. |
| 12 | "A tela explica. A confiança vem do replay: txids públicos, bundles commitados e prova formal." | Rode você mesmo. | Terminal com comandos de replay, funding request e verificação. | `npm run test:evidence-bundle`. |

## EN Version

| Scene | Voiceover | On-screen copy | Visual | Evidence |
| --- | --- | --- | --- | --- |
| 1 | "Start here. This is not an illustration: it is the bridge on mempool.space." | This transaction is the bridge. | Real signet bridge screenshot, large, with txid visible. | `b71a2b79...22e59c`. |
| 2 | "Read it like a Bitcoiner: input, output, fee, confirmations. The question is: why did it only become valid after the oracle spoke?" | The question: why now? | Visual zoom on 7,000 sat input, 6,500 sat output, 500 sat fee. | Bilateral signet bundle. |
| 3 | "NITI turns a contract into a UTXO trail: parent funding, parent CET, bridge, child funding." | The contract becomes a trail. | Four connected pixel blocks. | `lazyWindow.nodes` and `activationPath`. |
| 4 | "First, collateral enters the parent. It is normal Bitcoin: funding appears in the explorer." | Scene 1: parent funding. | Real parent funding screenshot. | `c61fc4bc...3a6e5c6`, 8,000 sats. |
| 5 | "Then the oracle does not approve anything; it reveals a number. That number is the outcome password." | Scene 2: the oracle reveals `sₓ`. | Brutalist screen with `BTCUSD_ABOVE_STRIKE` and `sₓ`. | `activatingAttestationSecretHex`. |
| 6 | "With that password, the parent closes through the correct-outcome CET." | Scene 3: parent CET. | Real parent CET screenshot. | `a8963ae9...774d769b`, 7,000 sats. |
| 7 | "The trick is that the same password completes the bridge. The bridge spends the CET and creates the child funding." | Scene 4: bridge activates child. | Real bridge screenshot with input, output, and fee. | `b71a2b79...22e59c`, child outpoint `:0`. |
| 8 | "Without the secret, the bridge is a cryptographic draft. With the secret, it becomes a Bitcoin witness." | One revelation. Two effects. | Large equation: `adaptor + sₓ = witness`. | `verifiesAdaptor`, completed bridge signature. |
| 9 | "If the wrong password appears, nothing opens. The bundle shows the bad path failing closed." | Wrong outcome rejected. | Red stack: wrong outcome, missing package, early refund. | `wrongOutcomeRejected`, `missingPackageRejected`, timelock checks. |
| 10 | "Alice, Bob, and watchtower reach the same txid because each had the prepared package." | Retainer: same txid. | Three cards pointing to the same bridge txid. | `bilateralLazyActivation.holders`. |
| 11 | "In the product demo, replace outcome with BTC/USD price: testnet sats, educational target, calculated payout." | Testnet Dollar Exposure Demo. | Brutalist card with collateral, price, target, and claim. | Educational formula, no real value. |
| 12 | "The screen explains. Trust comes from replay: public txids, committed bundles, and formal proof." | Run it yourself. | Terminal with replay, funding request, and verification commands. | `npm run test:evidence-bundle`. |
