"use strict";
const copy = {
    pt: {
        play: 'Play',
        pause: 'Pause',
        heroKicker: 'NITI Evidence Infomercial',
        heroTitle: 'Veja um contrato Bitcoin acontecer.',
        heroLede: 'Um oracle revela um segredo. Esse mesmo segredo fecha o parent, ativa a bridge e cria o child. Tudo aparece como transação pública.',
        statusOne: 'Demo signet/testnet',
        statusTwo: 'Sem valor real',
        statusThree: 'Bundle verificado',
        problemKicker: 'O problema',
        problemTitle: 'As pessoas não confiam no que não conseguem ver.',
        problemCopy: 'Whitepapers e logs de prova importam, mas a maioria das pessoas precisa de um caminho visível: o dinheiro entra, o oracle fala, a próxima transação fica válida.',
        ideaKicker: 'A ideia',
        ideaTitle: 'Prepare o caminho antes do resultado existir.',
        ideaCopy: 'O parent, a bridge e o child são preparados antes. A bridge existe, mas fica travada pelo outcome do oracle.',
        trickKicker: 'O truque',
        trickTitle: 'Um segredo completa dois passos.',
        trickCopy: 'Antes da attestation, a assinatura da bridge não é uma witness Bitcoin válida. Depois que o oracle revela o scalar correto, a bridge completa.',
        equationCaption: 'adaptor oculto + segredo do oracle = assinatura válida',
        chainKicker: 'Evidência na blockchain',
        chainTitle: 'O caminho público fica visível.',
        chainCopy: 'Estes são objetos de evidência signet/testnet commitados. Cada txid aponta para um explorer público e o bundle pode ser verificado localmente.',
        productKicker: 'Produto-demo',
        productTitle: 'Exposição educativa ao dólar, sem dinheiro real.',
        productCopy: 'O cartão demo mapeia um alvo em dólar para sats usando o preço BTC/USD do oracle. É só educativo: sem peg, sem promessa de resgate, sem mainnet.',
        testnetOnly: 'TESTNET ONLY',
        collateralLabel: 'Colateral',
        priceLabel: 'Oracle BTC/USD',
        targetLabel: 'Alvo educativo',
        payoutLabel: 'Claim calculado',
        formulaNote: 'Fórmula: min(colateral, ceil(alvo * 100.000.000 / preço)).',
        failKicker: 'Caminhos de falha',
        failTitle: 'O caminho errado falha fechado.',
        failCopy: 'O bundle registra os casos negativos em vez de escondê-los: outcome errado rejeitado, pacote ausente rejeitado, refund antecipado bloqueado.',
        failWrong: 'Outcome errado rejeitado',
        failMissing: 'Pacote ausente rejeitado',
        failTimeout: 'Timelock respeitado',
        holderKicker: 'Evidência de retainer',
        holderTitle: 'Alice, Bob e uma watchtower completam a mesma bridge.',
        holderCopy: 'Um prepared edge package permite que qualquer holder autorizado complete a mesma bridge após o oracle atestar. Nenhum holder recebe signer secrets.',
        proofKicker: 'Fronteira formal',
        proofTitle: 'A história é apoiada por provas, não só animação.',
        proofCopy: 'Lean prova a camada protocolar da NITI. SPARK verifica a álgebra finita. O site separa claims de produto da evidência técnica.',
        sourceSignet: 'Demo pública signet/testnet',
        sourceBilateral: 'Retainer bilateral',
        sourceMainnet: 'Mainnet histórica, somente visual',
        sourceStress: 'Economic stress como limite',
        sourceWindow: 'Janela lazy K=2 materializada',
        testKicker: 'Teste você mesmo',
        testTitle: 'Rode o caminho testnet pelo terminal.',
        testCopy: 'O browser não assina nem faz broadcast. Ele mostra comandos e verifica evidência commitada. A execução signet ao vivo continua explícita.',
        recordedDemo: 'Demo gravada',
        fundingRequest: 'Gerar funding request',
        verifyResult: 'Verificar bundle',
        copy: 'Copiar',
        copied: 'Copiado',
        txidLabel: 'Cole um txid signet/testnet',
        openExplorer: 'Abrir explorer',
        boundary: 'Fronteira: demo educativa em testnet. Sem depósito mainnet, sem stablecoin, sem garantia de resgate, sem recomendação de investimento.',
    },
    en: {
        play: 'Play',
        pause: 'Pause',
        heroKicker: 'NITI Evidence Infomercial',
        heroTitle: 'Watch a Bitcoin contract happen.',
        heroLede: 'An oracle reveals a secret. The same secret resolves the parent, activates the bridge, and creates the child. The path appears as public transactions.',
        statusOne: 'Signet/testnet demo',
        statusTwo: 'No real value',
        statusThree: 'Bundle verified',
        problemKicker: 'The problem',
        problemTitle: 'People cannot trust what they cannot see.',
        problemCopy: 'Whitepapers and proof logs matter, but most people need a visible path: money enters, the oracle speaks, the next transaction becomes valid.',
        ideaKicker: 'The idea',
        ideaTitle: 'Prepare the path before the result exists.',
        ideaCopy: 'The parent, bridge, and child are prepared in advance. The bridge is present, but locked behind the oracle outcome.',
        trickKicker: 'The trick',
        trickTitle: 'One secret completes two steps.',
        trickCopy: 'Before attestation, the bridge signature is not a valid Bitcoin witness. After the oracle reveals the matching scalar, the bridge completes.',
        equationCaption: 'hidden adaptor + oracle secret = valid signature',
        chainKicker: 'Blockchain evidence',
        chainTitle: 'The public path is visible.',
        chainCopy: 'These are committed signet/testnet evidence objects. Every txid links to a public explorer and the bundle can be verified locally.',
        productKicker: 'Product demo',
        productTitle: 'Educational dollar exposure, without real money.',
        productCopy: 'The demo card maps a dollar target to sats using the oracle BTC/USD price. It is educational only: no peg, no redemption promise, no mainnet funds.',
        testnetOnly: 'TESTNET ONLY',
        collateralLabel: 'Collateral',
        priceLabel: 'Oracle BTC/USD',
        targetLabel: 'Educational target',
        payoutLabel: 'Calculated claim',
        formulaNote: 'Formula: min(collateral, ceil(target * 100,000,000 / price)).',
        failKicker: 'Failure paths',
        failTitle: 'The wrong path fails closed.',
        failCopy: 'The evidence bundle records negative cases instead of hiding them: wrong outcome rejected, missing package rejected, early refund blocked.',
        failWrong: 'Wrong outcome rejected',
        failMissing: 'Missing package rejected',
        failTimeout: 'Timelock respected',
        holderKicker: 'Retainer evidence',
        holderTitle: 'Alice, Bob, and a watchtower complete the same bridge.',
        holderCopy: 'A prepared edge package lets any authorized holder complete the same bridge after the oracle attests. No holder receives signer secrets.',
        proofKicker: 'Formal boundary',
        proofTitle: 'The story is backed by proofs, not just animation.',
        proofCopy: 'Lean proves the NITI protocol layer. SPARK checks the finite algebra. The site separates product claims from technical evidence.',
        sourceSignet: 'Public signet/testnet demo',
        sourceBilateral: 'Bilateral retainer',
        sourceMainnet: 'Historical mainnet, visual only',
        sourceStress: 'Economic stress as a limit',
        sourceWindow: 'Lazy K=2 window materialized',
        testKicker: 'Try it yourself',
        testTitle: 'Run the testnet path from your terminal.',
        testCopy: 'The browser does not sign or broadcast. It shows commands and verifies committed evidence. Live signet execution remains explicit.',
        recordedDemo: 'Recorded demo',
        fundingRequest: 'Generate funding request',
        verifyResult: 'Verify bundle',
        copy: 'Copy',
        copied: 'Copied',
        txidLabel: 'Paste a signet/testnet txid',
        openExplorer: 'Open explorer',
        boundary: 'Boundary: testnet educational demo only. No mainnet deposit flow, no stablecoin claim, no redemption guarantee, no investment advice.',
    },
};
const txEvidence = [
    {
        label: 'Parent funding',
        txid: 'c61fc4bc0a8050ae423ebfb31be94f3f376a611c61f512334320452f13a6e5c6',
        value: '8,000 sats',
        url: 'https://mempool.space/signet/tx/c61fc4bc0a8050ae423ebfb31be94f3f376a611c61f512334320452f13a6e5c6',
        note: 'C_0 active parent',
    },
    {
        label: 'Parent CET',
        txid: 'a8963ae92df055c6f5cd7e3fe26238780929c2af6e78cab705dea460774d769b',
        value: '7,000 sats',
        url: 'https://mempool.space/signet/tx/a8963ae92df055c6f5cd7e3fe26238780929c2af6e78cab705dea460774d769b',
        note: 'oracle scalar completes CET',
    },
    {
        label: 'Bridge',
        txid: 'b71a2b79fab0cc8f20ead09e539aa122878f44d44cb562b70de0e0016c22e59c',
        value: '6,500 sats',
        url: 'https://mempool.space/signet/tx/b71a2b79fab0cc8f20ead09e539aa122878f44d44cb562b70de0e0016c22e59c',
        note: 'same scalar completes bridge',
    },
    {
        label: 'Child funding',
        txid: 'b71a2b79fab0cc8f20ead09e539aa122878f44d44cb562b70de0e0016c22e59c:0',
        value: '6,500 sats',
        url: 'https://mempool.space/signet/tx/b71a2b79fab0cc8f20ead09e539aa122878f44d44cb562b70de0e0016c22e59c',
        note: 'C_1 prepared child',
    },
];
const holders = [
    { name: 'Alice', txid: txEvidence[2]?.txid ?? '', verifies: true },
    { name: 'Bob', txid: txEvidence[2]?.txid ?? '', verifies: true },
    { name: 'Watchtower', txid: txEvidence[2]?.txid ?? '', verifies: true },
];
const commands = {
    recorded: 'npm run test:evidence-bundle -- \\\n  --bundle docs/evidence/lazy-bilateral-public-signet/lazy-activation-evidence-bundle.json',
    funding: 'npm run public:lazy-cdlc-funding-request -- \\\n  --network signet \\\n  --out testnet/artifacts/lazy-public-signet-funding-request.json',
    verify: 'npm run test:evidence-bundle -- \\\n  --bundle docs/evidence/lazy-public-signet/lazy-activation-evidence-bundle.json',
};
let language = 'pt';
let autoPlay = false;
let autoPlayTimer;
function t(key) {
    return copy[language][key] ?? copy.pt[key] ?? key;
}
function select(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`Missing element: ${selector}`);
    }
    return element;
}
function selectAll(selector) {
    return Array.from(document.querySelectorAll(selector));
}
function shortTxid(txid) {
    if (txid.includes(':')) {
        const [id, vout] = txid.split(':');
        return `${id?.slice(0, 8)}...${id?.slice(-8)}:${vout}`;
    }
    return `${txid.slice(0, 8)}...${txid.slice(-8)}`;
}
function setLanguage(next) {
    language = next;
    document.documentElement.lang = next === 'pt' ? 'pt-BR' : 'en';
    for (const element of selectAll('[data-i18n]')) {
        const key = element.dataset.i18n;
        if (key && copy[next][key]) {
            element.textContent = copy[next][key] ?? key;
        }
    }
    select('[data-lang-toggle]').textContent = next === 'pt' ? 'EN' : 'PT';
    if (autoPlay) {
        select('[data-play]').textContent = copy[next].pause ?? 'Pause';
    }
}
function renderEvidence() {
    const rail = select('[data-tx-rail]');
    rail.replaceChildren(...txEvidence.map((tx, index) => {
        const item = document.createElement('article');
        item.className = 'tx-card';
        item.innerHTML = `
        <span class="tx-index">${String(index + 1).padStart(2, '0')}</span>
        <h3>${tx.label}</h3>
        <a href="${tx.url}" target="_blank" rel="noreferrer">${shortTxid(tx.txid)}</a>
        <p>${tx.note}</p>
        <strong>${tx.value}</strong>
      `;
        return item;
    }));
    const holderStrip = select('[data-holder-strip]');
    holderStrip.replaceChildren(...holders.map((holder) => {
        const item = document.createElement('article');
        item.className = 'holder';
        item.innerHTML = `
        <span>${holder.name}</span>
        <strong>${holder.verifies ? 'verifies' : 'fails'}</strong>
        <p>${shortTxid(holder.txid)}</p>
      `;
        return item;
    }));
    for (const key of Object.keys(commands)) {
        const target = document.querySelector(`[data-command="${key}"]`);
        if (target) {
            target.textContent = commands[key];
        }
    }
}
function initCopyButtons() {
    for (const button of selectAll('[data-copy-command]')) {
        button.addEventListener('click', async () => {
            const key = button.dataset.copyCommand;
            await navigator.clipboard.writeText(commands[key]);
            const original = t('copy');
            button.textContent = t('copied');
            window.setTimeout(() => {
                button.textContent = original;
            }, 1100);
        });
    }
}
function initTxidTool() {
    const input = select('[data-txid-input]');
    const link = select('[data-txid-link]');
    const update = () => {
        const txid = input.value.trim().split(':')[0] ?? '';
        const clean = txid.replace(/[^a-fA-F0-9]/g, '');
        if (clean.length === 64) {
            link.href = `https://mempool.space/signet/tx/${clean}`;
        }
    };
    input.addEventListener('input', update);
    update();
}
function initProgress() {
    const progress = select('[data-progress]');
    const update = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pct = max <= 0 ? 0 : window.scrollY / max;
        progress.style.transform = `scaleX(${Math.min(1, Math.max(0, pct))})`;
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
}
function initSceneObserver() {
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            entry.target.classList.toggle('in-view', entry.isIntersecting);
        }
    }, { threshold: 0.34 });
    for (const scene of selectAll('[data-scene]')) {
        observer.observe(scene);
    }
}
function initAutoPlay() {
    const button = select('[data-play]');
    const scenes = selectAll('[data-scene]');
    const stop = () => {
        autoPlay = false;
        button.textContent = t('play');
        if (autoPlayTimer !== undefined) {
            window.clearInterval(autoPlayTimer);
            autoPlayTimer = undefined;
        }
    };
    const start = () => {
        autoPlay = true;
        button.textContent = t('pause');
        let index = Math.max(0, scenes.findIndex((scene) => scene.getBoundingClientRect().top > 40));
        autoPlayTimer = window.setInterval(() => {
            const scene = scenes[index];
            if (!scene) {
                stop();
                return;
            }
            scene.scrollIntoView({ behavior: 'smooth', block: 'start' });
            index += 1;
        }, 2600);
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
function initLanguageToggle() {
    select('[data-lang-toggle]').addEventListener('click', () => {
        setLanguage(language === 'pt' ? 'en' : 'pt');
    });
    setLanguage('pt');
}
function initCanvas() {
    const canvas = select('#hero-canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        return;
    }
    let frame = 0;
    const nodes = [
        { x: 0.16, y: 0.58, label: 'funding' },
        { x: 0.38, y: 0.42, label: 'parent' },
        { x: 0.62, y: 0.58, label: 'bridge' },
        { x: 0.84, y: 0.42, label: 'child' },
    ];
    const draw = () => {
        const width = canvas.width;
        const height = canvas.height;
        context.clearRect(0, 0, width, height);
        context.fillStyle = '#101315';
        context.fillRect(0, 0, width, height);
        context.strokeStyle = 'rgba(243, 238, 225, 0.08)';
        context.lineWidth = 1;
        for (let x = 0; x < width; x += 64) {
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, height);
            context.stroke();
        }
        for (let y = 0; y < height; y += 64) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(width, y);
            context.stroke();
        }
        context.lineWidth = 4;
        context.strokeStyle = '#e5b866';
        context.beginPath();
        nodes.forEach((node, index) => {
            const x = node.x * width;
            const y = node.y * height;
            if (index === 0) {
                context.moveTo(x, y);
            }
            else {
                const prev = nodes[index - 1];
                if (prev) {
                    context.bezierCurveTo(prev.x * width + 110, prev.y * height, x - 110, y, x, y);
                }
            }
        });
        context.stroke();
        const pulseIndex = (frame / 160) % 1;
        const pulseX = (0.16 + pulseIndex * 0.68) * width;
        const pulseY = (0.50 + Math.sin(frame / 30) * 0.09) * height;
        context.fillStyle = '#88d8bf';
        context.beginPath();
        context.arc(pulseX, pulseY, 12 + Math.sin(frame / 8) * 3, 0, Math.PI * 2);
        context.fill();
        for (const [index, node] of nodes.entries()) {
            const x = node.x * width;
            const y = node.y * height;
            const active = frame / 80 > index;
            context.fillStyle = active ? '#f8f1df' : '#22282a';
            context.strokeStyle = active ? '#88d8bf' : 'rgba(248, 241, 223, 0.28)';
            context.lineWidth = 2;
            context.beginPath();
            context.roundRect(x - 86, y - 44, 172, 88, 8);
            context.fill();
            context.stroke();
            context.fillStyle = active ? '#111315' : '#f8f1df';
            context.font = '700 24px ui-monospace, SFMono-Regular, Menlo, monospace';
            context.textAlign = 'center';
            context.fillText(node.label, x, y + 8);
        }
        frame += 1;
        requestAnimationFrame(draw);
    };
    draw();
}
function initProductMath() {
    const collateral = 8000;
    const priceCents = 6_000_000;
    const targetCents = 390;
    const need = Math.ceil((targetCents * 100_000_000) / priceCents);
    const claim = Math.min(collateral, need);
    select('[data-collateral]').textContent = `${collateral.toLocaleString()} sats`;
    select('[data-price]').textContent = '$60,000';
    select('[data-target]').textContent = '$3.90';
    select('[data-payout]').textContent = `${claim.toLocaleString()} sats`;
}
renderEvidence();
initCopyButtons();
initTxidTool();
initProgress();
initSceneObserver();
initAutoPlay();
initLanguageToggle();
initCanvas();
initProductMath();
