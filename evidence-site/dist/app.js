"use strict";
const copy = {
    pt: {
        play: 'Play',
        pause: 'Pause',
        heroEyebrow: 'EVIDÊNCIA, NÃO PROMESSA',
        heroTitle: 'Começa aqui: esta transação é a bridge.',
        heroLine: 'Olhe para o print como um bitcoiner: uma entrada, uma saída, uma taxa, confirmações. A pergunta é simples: por que essa transação só ficou válida depois do oracle falar?',
        bridgeAmountLabel: 'saída',
        bridgeRoleLabel: 'papel',
        bridgeRole: 'ativa o child',
        heroCaption: 'Print real de mempool.space/signet: a bridge broadcastada.',
        pointTitle: 'A NITI não pede que você imagine o contrato. Ela mostra a trilha.',
        pointCopy: 'Parent funding. Parent CET. Bridge. Child funding. A história inteira vira uma sequência de UTXOs. O contrato não é uma promessa fora da cadeia; é uma coreografia de transações preparadas antes e ativadas pelo resultado certo.',
        mapEyebrow: 'O mapa mental',
        mapTitle: 'Pense em três portas em fila.',
        mapCopy: 'A primeira porta guarda o parent. A segunda é a bridge. A terceira é o child. Antes do evento, as fechaduras já estão instaladas. O oracle não move sats; ele revela a senha que faz a assinatura certa fechar.',
        fundingEyebrow: 'Cena 1',
        fundingTitle: 'Primeiro entra o colateral no parent.',
        fundingCopy: 'Isto é só Bitcoin normal: um UTXO em signet aparece no explorer. A NITI chama isso de parent funding porque é daqui que o primeiro contrato pode ser resolvido.',
        fundingCaption: 'Funding real do parent: 8,000 sats no bundle bilateral signet.',
        oracleEyebrow: 'Cena 2',
        oracleTitle: 'O oracle não “aprova” nada. Ele revela um número.',
        oracleCopy: 'Esse número é o segredo do outcome. Quem já tinha o pacote preparado consegue somar esse segredo ao adaptor e transformar uma quase-assinatura em uma assinatura Bitcoin válida.',
        cetEyebrow: 'Cena 3',
        cetTitle: 'O parent fecha no CET do outcome certo.',
        cetCopy: 'Depois da attestation, o parent CET gasta o funding. Esse passo é o contrato dizendo: “o resultado chegou; este caminho venceu”.',
        cetCaption: 'Parent CET real: 7,000 sats, confirmado em signet.',
        bridgeEyebrow: 'Cena 4',
        bridgeTitle: 'A mesma senha destrava a bridge.',
        bridgeCopy: 'Aqui está a sacada do cDLC: o segredo que fecha o parent também completa a bridge. A bridge gasta a saída do CET e cria o funding do child. Não tem mágica, tem assinatura que só fecha com o outcome certo.',
        bridgeCaption: 'Bridge real: uma entrada de 7,000 sats, saída child de 6,500 sats, taxa de 500 sats.',
        ahaTitle: 'Uma revelação. Dois efeitos.',
        ahaCopy: 'Sem o segredo, a bridge é um rascunho criptográfico. Com o segredo, ela vira uma transação Bitcoin normal. Por isso o cDLC consegue encadear contratos sem deixar o próximo passo depender de um signer online na hora do evento.',
        failEyebrow: 'Falha fechada',
        failTitle: 'Se a senha errada aparece, nada abre.',
        failCopy: 'O bundle não mostra só o caminho feliz. Ele registra que outcome errado não ativa a edge, pacote ausente não basta e refund antecipado respeita timelock.',
        holderEyebrow: 'Retainer',
        holderTitle: 'Alice, Bob e watchtower chegam ao mesmo txid.',
        holderCopy: 'Cada holder autorizado carrega o pacote preparado. Quando o oracle publica o segredo, qualquer um deles consegue completar a mesma bridge. Eles não recebem signer secret; recebem só o material necessário para agir depois do outcome.',
        productEyebrow: 'Produto-demo',
        productTitle: 'Agora troque “outcome” por preço BTC/USD.',
        productCopy: 'Em testnet, a mesma mecânica pode ensinar exposição educativa ao dólar: o oracle informa preço, o contrato calcula quantos sats cabem no alvo, e o payout nunca promete dinheiro real.',
        collateral: 'colateral',
        price: 'preço oracle',
        target: 'alvo didático',
        claim: 'claim calculado',
        productBoundary: 'Simulação em signet/testnet. Sem peg, sem resgate, sem mainnet, sem custódia de valor real.',
        proofEyebrow: 'Prova e replay',
        proofTitle: 'A tela é simples. A evidência é auditável.',
        proofCopy: 'O site aponta para txids públicos, bundles commitados e inventário de prova. A parte visual serve para explicar; a confiança vem do replay.',
        testEyebrow: 'Teste você mesmo',
        testTitle: 'Não assine no browser. Rode o teste no terminal.',
        testCopy: 'A página só mostra evidência e comandos. Execução ao vivo continua explícita, local e testnet/signet.',
        cmdReplay: 'Ver replay',
        cmdFunding: 'Gerar funding request',
        cmdVerify: 'Verificar bundle',
        copy: 'Copiar',
        copied: 'Copiado',
        txidLabel: 'Cole um txid signet/testnet',
        openExplorer: 'Abrir no explorer',
        footer: 'Demo educativa em signet/testnet. Nada aqui é oferta financeira, garantia de dólar, stablecoin, custódia real ou fluxo mainnet.',
    },
    en: {
        play: 'Play',
        pause: 'Pause',
        heroEyebrow: 'EVIDENCE, NOT A PROMISE',
        heroTitle: 'Start here: this transaction is the bridge.',
        heroLine: 'Read the screenshot like a Bitcoiner: one input, one output, one fee, confirmations. The question is simple: why did this transaction only become valid after the oracle spoke?',
        bridgeAmountLabel: 'output',
        bridgeRoleLabel: 'role',
        bridgeRole: 'activates the child',
        heroCaption: 'Real mempool.space/signet screenshot: the broadcast bridge.',
        pointTitle: 'NITI does not ask you to imagine the contract. It shows the trail.',
        pointCopy: 'Parent funding. Parent CET. Bridge. Child funding. The whole story becomes a UTXO sequence. The contract is not an off-chain promise; it is a choreography of transactions prepared before the event and activated by the correct outcome.',
        mapEyebrow: 'Mental model',
        mapTitle: 'Think of three doors in a row.',
        mapCopy: 'The first door holds the parent. The second is the bridge. The third is the child. Before the event, the locks are already installed. The oracle does not move sats; it reveals the password that makes the right signature close.',
        fundingEyebrow: 'Scene 1',
        fundingTitle: 'First, collateral enters the parent.',
        fundingCopy: 'This is plain Bitcoin: a signet UTXO appears in the explorer. NITI calls it parent funding because this is where the first contract can resolve from.',
        fundingCaption: 'Real parent funding: 8,000 sats in the bilateral signet bundle.',
        oracleEyebrow: 'Scene 2',
        oracleTitle: 'The oracle does not “approve” anything. It reveals a number.',
        oracleCopy: 'That number is the outcome secret. Anyone who already holds the prepared package can add that secret to the adaptor and turn an almost-signature into a valid Bitcoin signature.',
        cetEyebrow: 'Scene 3',
        cetTitle: 'The parent closes through the correct-outcome CET.',
        cetCopy: 'After attestation, the parent CET spends the funding. This step says: “the result arrived; this path won”.',
        cetCaption: 'Real parent CET: 7,000 sats, confirmed on signet.',
        bridgeEyebrow: 'Scene 4',
        bridgeTitle: 'The same password unlocks the bridge.',
        bridgeCopy: 'This is the cDLC trick: the secret that resolves the parent also completes the bridge. The bridge spends the CET output and creates the child funding. No magic, just a signature that only closes with the correct outcome.',
        bridgeCaption: 'Real bridge: one 7,000 sat input, one 6,500 sat child output, 500 sat fee.',
        ahaTitle: 'One revelation. Two effects.',
        ahaCopy: 'Without the secret, the bridge is a cryptographic draft. With the secret, it becomes a normal Bitcoin transaction. That is why a cDLC can cascade contracts without the next step waiting for a signer to be online at event time.',
        failEyebrow: 'Fail closed',
        failTitle: 'If the wrong password appears, nothing opens.',
        failCopy: 'The bundle does not only show the happy path. It records that a wrong outcome does not activate the edge, a missing package is not enough, and early refund respects the timelock.',
        holderEyebrow: 'Retainer',
        holderTitle: 'Alice, Bob, and watchtower reach the same txid.',
        holderCopy: 'Each authorized holder carries the prepared package. When the oracle publishes the secret, any of them can complete the same bridge. They do not receive signer secrets; only the material needed to act after the outcome.',
        productEyebrow: 'Product demo',
        productTitle: 'Now replace “outcome” with BTC/USD price.',
        productCopy: 'On testnet, the same mechanics can teach educational dollar exposure: the oracle reports price, the contract computes how many sats fit the target, and the payout never promises real money.',
        collateral: 'collateral',
        price: 'oracle price',
        target: 'educational target',
        claim: 'calculated claim',
        productBoundary: 'Signet/testnet simulation. No peg, no redemption, no mainnet, no real-value custody.',
        proofEyebrow: 'Proof and replay',
        proofTitle: 'The screen is simple. The evidence is auditable.',
        proofCopy: 'The site points to public txids, committed bundles, and the proof inventory. The visual layer explains; trust comes from replay.',
        testEyebrow: 'Try it yourself',
        testTitle: 'Do not sign in the browser. Run the test in the terminal.',
        testCopy: 'The page only shows evidence and commands. Live execution remains explicit, local, and testnet/signet.',
        cmdReplay: 'See replay',
        cmdFunding: 'Generate funding request',
        cmdVerify: 'Verify bundle',
        copy: 'Copy',
        copied: 'Copied',
        txidLabel: 'Paste a signet/testnet txid',
        openExplorer: 'Open explorer',
        footer: 'Educational signet/testnet demo. Nothing here is a financial offer, dollar guarantee, stablecoin, real custody, or mainnet flow.',
    },
};
const commands = {
    replay: 'npm run test:evidence-bundle -- \\\n+  --bundle docs/evidence/lazy-bilateral-public-signet/lazy-activation-evidence-bundle.json',
    funding: 'npm run public:lazy-cdlc-funding-request -- \\\n+  --network signet \\\n+  --out testnet/artifacts/lazy-public-signet-funding-request.json',
    verify: 'npm run test:evidence-bundle -- \\\n+  --bundle docs/evidence/lazy-public-signet/lazy-activation-evidence-bundle.json',
};
const holders = [
    { name: 'Alice', txid: 'b71a2b79fab0cc8f20ead09e539aa122878f44d44cb562b70de0e0016c22e59c' },
    { name: 'Bob', txid: 'b71a2b79fab0cc8f20ead09e539aa122878f44d44cb562b70de0e0016c22e59c' },
    { name: 'Watchtower', txid: 'b71a2b79fab0cc8f20ead09e539aa122878f44d44cb562b70de0e0016c22e59c' },
];
let language = 'pt';
let autoPlay = false;
let timer;
function select(selector) {
    const node = document.querySelector(selector);
    if (!node) {
        throw new Error(`Missing ${selector}`);
    }
    return node;
}
function all(selector) {
    return Array.from(document.querySelectorAll(selector));
}
function t(key) {
    return copy[language][key] ?? copy.pt[key] ?? key;
}
function short(txid) {
    return `${txid.slice(0, 8)}...${txid.slice(-8)}`;
}
function setLanguage(next) {
    language = next;
    document.documentElement.lang = next === 'pt' ? 'pt-BR' : 'en';
    for (const element of all('[data-i18n]')) {
        const key = element.dataset.i18n;
        if (key) {
            element.textContent = copy[next][key] ?? key;
        }
    }
    select('[data-lang-toggle]').textContent = next === 'pt' ? 'EN' : 'PT';
    if (autoPlay) {
        select('[data-play]').textContent = t('pause');
    }
}
function initProgress() {
    const bar = select('[data-progress]');
    const update = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pct = max <= 0 ? 0 : window.scrollY / max;
        bar.style.transform = `scaleX(${Math.max(0, Math.min(1, pct))})`;
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
}
function initScenes() {
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            entry.target.classList.toggle('visible', entry.isIntersecting);
        }
    }, { threshold: 0.28 });
    for (const scene of all('[data-scene]')) {
        observer.observe(scene);
    }
}
function initAutoplay() {
    const button = select('[data-play]');
    const scenes = all('[data-scene]');
    const stop = () => {
        autoPlay = false;
        button.textContent = t('play');
        if (timer !== undefined) {
            window.clearInterval(timer);
            timer = undefined;
        }
    };
    const start = () => {
        autoPlay = true;
        button.textContent = t('pause');
        let index = Math.max(0, scenes.findIndex((scene) => scene.getBoundingClientRect().top > 80));
        timer = window.setInterval(() => {
            const scene = scenes[index];
            if (!scene) {
                stop();
                return;
            }
            scene.scrollIntoView({ behavior: 'smooth', block: 'start' });
            index += 1;
        }, 4300);
    };
    button.addEventListener('click', () => {
        if (autoPlay) {
            stop();
        }
        else {
            start();
        }
    });
    window.addEventListener('wheel', () => autoPlay && stop(), { passive: true });
}
function initCommands() {
    for (const [key, command] of Object.entries(commands)) {
        const target = document.querySelector(`[data-command="${key}"]`);
        if (target) {
            target.textContent = command;
        }
    }
    for (const button of all('[data-copy-command]')) {
        button.addEventListener('click', async () => {
            const key = button.dataset.copyCommand;
            await navigator.clipboard.writeText(commands[key]);
            button.textContent = t('copied');
            window.setTimeout(() => {
                button.textContent = t('copy');
            }, 900);
        });
    }
}
function initTxidTool() {
    const input = select('[data-txid-input]');
    const link = select('[data-txid-link]');
    const update = () => {
        const clean = input.value.trim().split(':')[0]?.replace(/[^a-fA-F0-9]/g, '') ?? '';
        if (clean.length === 64) {
            link.href = `https://mempool.space/signet/tx/${clean}`;
        }
    };
    input.addEventListener('input', update);
    update();
}
function renderHolders() {
    const grid = select('[data-holder-grid]');
    grid.replaceChildren(...holders.map((holder, index) => {
        const card = document.createElement('article');
        card.innerHTML = `
        <span>0${index + 1}</span>
        <strong>${holder.name}</strong>
        <em>${short(holder.txid)}</em>
        <p>same bridge txid</p>
      `;
        return card;
    }));
}
setLanguage('pt');
initProgress();
initScenes();
initAutoplay();
initCommands();
initTxidTool();
renderHolders();
