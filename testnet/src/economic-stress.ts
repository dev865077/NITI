import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SATOSHIS_PER_BTC = 100_000_000n;

export interface BtcUsdPricePoint {
  date: string;
  sourceUnixMs: number;
  sourceTime: string;
  symbol: string;
  openCents: number;
  highCents: number;
  lowCents: number;
  closeCents: number;
  volumeBtc: number;
  volumeUsd: number;
}

export interface BtcUsdDataset {
  kind: 'niti.economic_stress.btc_usd_2022_daily.v1';
  source: {
    provider: string;
    url: string;
    symbol: string;
    selectedYear: number;
    selectionPolicy: string;
    normalization: string;
    fieldUsedForReplay: string;
    rawSourceSha256AtCuration: string;
    curatedDataSha256: string;
  };
  rowCount: number;
  firstDate: string;
  lastDate: string;
  minCloseCents: number;
  maxCloseCents: number;
  prices: BtcUsdPricePoint[];
}

export interface StressConfig {
  name: string;
  initialCollateralSat: bigint;
  targetValueCents: bigint;
  liquidationThresholdBps: bigint;
  oracleCadenceDays: number;
  oracleDelayDays: number;
  confirmationDelayBlocks: number;
  liquidationClaimBlocks: number;
  bridgeTimeoutBlocks: number;
  childRefundTimeoutBlocks: number;
  blocksPerDay: number;
  feeReserveSat: bigint;
  requiredRelayFeeSat: bigint;
  acceptableShortfallCents: bigint;
}

export interface PricePath {
  name: string;
  source: string;
  points: Array<{
    date: string;
    closeCents: number;
  }>;
}

export interface StressScenario {
  name: string;
  description: string;
  path: PricePath;
  config: StressConfig;
  expectedClass: 'solvent' | 'insolvent' | 'operational_failure';
}

export interface StressResult {
  scenario: string;
  description: string;
  expectedClass: StressScenario['expectedClass'];
  pass: boolean;
  failureCauses: string[];
  parameterSet: JsonStressConfig;
  path: {
    name: string;
    source: string;
    observationCount: number;
    firstDate: string;
    lastDate: string;
    startPriceCents: string;
    minPriceCents: string;
    maxDrawdownBps: string;
  };
  liquidation: {
    triggered: boolean;
    triggerDate: string | null;
    triggerPriceCents: string | null;
    triggerCollateralRatioBps: string | null;
    settlementDate: string;
    settlementPriceCents: string;
    settlementIndex: number;
  };
  timing: {
    actionDelayBlocks: number;
    bridgeTimeoutBlocks: number;
    childRefundTimeoutBlocks: number;
    timeoutOrderingValid: boolean;
    actionBeforeBridgeTimeout: boolean;
    childAfterBridgeTimeout: boolean;
  };
  fees: {
    feeReserveSat: string;
    requiredRelayFeeSat: string;
    feeReserveSufficient: boolean;
    effectiveCollateralSat: string;
  };
  waterfall: {
    targetValueCents: string;
    stableClaimSat: string;
    paidValueCents: string;
    residualCollateralSat: string;
    shortfallCents: string;
    holderRecoveryBps: string;
    btcConserved: boolean;
  };
}

export interface EconomicStressReport {
  kind: 'niti.layer5_economic_stress_report.v1';
  boundary: string;
  dataset: {
    provider: string;
    sourceUrl: string;
    rowCount: number;
    firstDate: string;
    lastDate: string;
    curatedDataSha256: string;
  };
  scenarios: StressResult[];
  aggregate: {
    scenarioCount: number;
    passingScenarios: number;
    failingScenarios: number;
    worstShortfallCents: string;
    worstShortfallScenario: string;
    allWaterfallsConserveBtc: boolean;
    noFalseSolvency: boolean;
  };
  goNoGo: {
    longRunningPilot: 'GO' | 'NO_GO';
    criteria: Array<{
      name: string;
      passed: boolean;
      threshold: string;
      observed: string;
    }>;
  };
}

interface JsonStressConfig {
  name: string;
  initialCollateralSat: string;
  targetValueCents: string;
  liquidationThresholdBps: string;
  oracleCadenceDays: number;
  oracleDelayDays: number;
  confirmationDelayBlocks: number;
  liquidationClaimBlocks: number;
  bridgeTimeoutBlocks: number;
  childRefundTimeoutBlocks: number;
  blocksPerDay: number;
  feeReserveSat: string;
  requiredRelayFeeSat: string;
  acceptableShortfallCents: string;
}

function repoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
}

export function defaultDatasetPath(): string {
  return path.join(repoRoot(), 'testnet/fixtures/economic-stress/btc-usd-gemini-2022-daily.json');
}

export function defaultEvidencePath(): string {
  return path.join(repoRoot(), 'docs/evidence/economic-stress/economic-stress-results.json');
}

export function loadBtcUsd2022Dataset(datasetPath = defaultDatasetPath()): BtcUsdDataset {
  const parsed = JSON.parse(fs.readFileSync(datasetPath, 'utf8')) as BtcUsdDataset;
  assertDataset(parsed);
  return parsed;
}

export function runDefaultEconomicStressSuite(): EconomicStressReport {
  const dataset = loadBtcUsd2022Dataset();
  const scenarios = buildDefaultScenarios(dataset);
  return buildEconomicStressReport(dataset, scenarios.map(runStressScenario));
}

export function writeDefaultEconomicStressEvidence(outputPath = defaultEvidencePath()): EconomicStressReport {
  const report = runDefaultEconomicStressSuite();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

export function buildDefaultScenarios(dataset: BtcUsdDataset): StressScenario[] {
  const historicalPath = {
    name: 'gemini_btc_usd_2022_daily_close',
    source: dataset.source.provider,
    points: dataset.prices.map((point) => ({
      date: point.date,
      closeCents: point.closeCents,
    })),
  };
  const baseConfig = defaultStressConfig('baseline_1btc_20k_stable_claim');

  return [
    {
      name: 'historical_2022_drawdown',
      description: 'Daily Gemini BTC/USD closes through the 2022 drawdown.',
      path: historicalPath,
      config: baseConfig,
      expectedClass: 'solvent',
    },
    {
      name: 'overnight_20_percent_gap',
      description: 'Single-step 20 percent BTC/USD gap from the first 2022 close.',
      path: buildGapPath(dataset, 2_000n),
      config: baseConfig,
      expectedClass: 'solvent',
    },
    {
      name: 'overnight_40_percent_gap',
      description: 'Single-step 40 percent BTC/USD gap from the first 2022 close.',
      path: buildGapPath(dataset, 4_000n),
      config: baseConfig,
      expectedClass: 'solvent',
    },
    {
      name: 'overnight_70_percent_gap',
      description: 'Single-step 70 percent BTC/USD gap from the first 2022 close.',
      path: buildGapPath(dataset, 7_000n),
      config: baseConfig,
      expectedClass: 'insolvent',
    },
    {
      name: 'oracle_delay_fee_spike',
      description: 'Historical path with delayed oracle publication and relay fee demand above reserve.',
      path: historicalPath,
      config: {
        ...baseConfig,
        name: 'delayed_oracle_fee_spike',
        oracleDelayDays: 10,
        confirmationDelayBlocks: 18,
        liquidationClaimBlocks: 36,
        bridgeTimeoutBlocks: 144,
        childRefundTimeoutBlocks: 180,
        feeReserveSat: 25_000n,
        requiredRelayFeeSat: 140_000n,
      },
      expectedClass: 'operational_failure',
    },
    {
      name: 'thin_collateral_70_percent_gap',
      description: 'A thinly collateralized 0.6 BTC position under a 70 percent overnight gap.',
      path: buildGapPath(dataset, 7_000n),
      config: {
        ...baseConfig,
        name: 'thin_collateral_0_6btc_20k_claim',
        initialCollateralSat: 60_000_000n,
      },
      expectedClass: 'insolvent',
    },
  ];
}

export function runStressScenario(scenario: StressScenario): StressResult {
  if (scenario.path.points.length === 0) {
    throw new Error(`empty price path: ${scenario.name}`);
  }
  const prices = scenario.path.points;
  const config = scenario.config;
  const triggerIndex = prices.findIndex((point) => (
    collateralRatioBps(config.initialCollateralSat, BigInt(point.closeCents), config.targetValueCents)
      <= config.liquidationThresholdBps
  ));
  const triggered = triggerIndex >= 0;
  const actionDelayBlocks =
    (config.oracleDelayDays * config.blocksPerDay)
    + config.confirmationDelayBlocks
    + config.liquidationClaimBlocks;
  const settlementIndex = triggered
    ? Math.min(
      prices.length - 1,
      triggerIndex + Math.ceil(config.oracleDelayDays / config.oracleCadenceDays),
    )
    : prices.length - 1;
  const settlementPoint = prices[settlementIndex]!;
  const settlementPrice = BigInt(settlementPoint.closeCents);
  const feeReserveSufficient = config.feeReserveSat >= config.requiredRelayFeeSat;
  const effectiveCollateralSat = nonNegative(config.initialCollateralSat - config.requiredRelayFeeSat);
  const stableClaimSat = stableClaimSatFor({
    collateralSat: effectiveCollateralSat,
    targetValueCents: config.targetValueCents,
    priceCents: settlementPrice,
  });
  const residualCollateralSat = effectiveCollateralSat - stableClaimSat;
  const paidValueCents = (stableClaimSat * settlementPrice) / SATOSHIS_PER_BTC;
  const shortfallCents = nonNegative(config.targetValueCents - paidValueCents);
  const holderRecoveryBps = config.targetValueCents === 0n
    ? 10_000n
    : (paidValueCents * 10_000n) / config.targetValueCents;
  const timeoutOrderingValid = actionDelayBlocks < config.bridgeTimeoutBlocks
    && config.bridgeTimeoutBlocks < config.childRefundTimeoutBlocks;
  const causes = failureCauses({
    triggered,
    feeReserveSufficient,
    shortfallCents,
    timeoutOrderingValid,
    expectedClass: scenario.expectedClass,
  });
  const pass = causes.length === 0;
  const triggerPoint = triggered ? prices[triggerIndex]! : null;

  return {
    scenario: scenario.name,
    description: scenario.description,
    expectedClass: scenario.expectedClass,
    pass,
    failureCauses: causes,
    parameterSet: toJsonConfig(config),
    path: {
      name: scenario.path.name,
      source: scenario.path.source,
      observationCount: prices.length,
      firstDate: prices[0]!.date,
      lastDate: prices[prices.length - 1]!.date,
      startPriceCents: String(prices[0]!.closeCents),
      minPriceCents: String(Math.min(...prices.map((point) => point.closeCents))),
      maxDrawdownBps: String(maxDrawdownBps(prices.map((point) => BigInt(point.closeCents)))),
    },
    liquidation: {
      triggered,
      triggerDate: triggerPoint?.date ?? null,
      triggerPriceCents: triggerPoint ? String(triggerPoint.closeCents) : null,
      triggerCollateralRatioBps: triggerPoint
        ? String(collateralRatioBps(
          config.initialCollateralSat,
          BigInt(triggerPoint.closeCents),
          config.targetValueCents,
        ))
        : null,
      settlementDate: settlementPoint.date,
      settlementPriceCents: String(settlementPoint.closeCents),
      settlementIndex,
    },
    timing: {
      actionDelayBlocks,
      bridgeTimeoutBlocks: config.bridgeTimeoutBlocks,
      childRefundTimeoutBlocks: config.childRefundTimeoutBlocks,
      timeoutOrderingValid,
      actionBeforeBridgeTimeout: actionDelayBlocks < config.bridgeTimeoutBlocks,
      childAfterBridgeTimeout: config.bridgeTimeoutBlocks < config.childRefundTimeoutBlocks,
    },
    fees: {
      feeReserveSat: String(config.feeReserveSat),
      requiredRelayFeeSat: String(config.requiredRelayFeeSat),
      feeReserveSufficient,
      effectiveCollateralSat: String(effectiveCollateralSat),
    },
    waterfall: {
      targetValueCents: String(config.targetValueCents),
      stableClaimSat: String(stableClaimSat),
      paidValueCents: String(paidValueCents),
      residualCollateralSat: String(residualCollateralSat),
      shortfallCents: String(shortfallCents),
      holderRecoveryBps: String(holderRecoveryBps),
      btcConserved: stableClaimSat + residualCollateralSat === effectiveCollateralSat,
    },
  };
}

export function buildEconomicStressReport(
  dataset: BtcUsdDataset,
  scenarios: StressResult[],
): EconomicStressReport {
  const worst = scenarios.reduce((current, candidate) => (
    BigInt(candidate.waterfall.shortfallCents) > BigInt(current.waterfall.shortfallCents)
      ? candidate
      : current
  ), scenarios[0]!);
  const severeGap = scenarios.find((entry) => entry.scenario === 'overnight_70_percent_gap');
  const oracleFee = scenarios.find((entry) => entry.scenario === 'oracle_delay_fee_spike');
  const historical = scenarios.find((entry) => entry.scenario === 'historical_2022_drawdown');
  const criteria = [
    {
      name: 'historical path has no holder shortfall',
      passed: BigInt(historical?.waterfall.shortfallCents ?? '-1') === 0n,
      threshold: '0 cents shortfall',
      observed: `${historical?.waterfall.shortfallCents ?? 'missing'} cents`,
    },
    {
      name: '70 percent gap has no holder shortfall',
      passed: BigInt(severeGap?.waterfall.shortfallCents ?? '1') === 0n,
      threshold: '0 cents shortfall',
      observed: `${severeGap?.waterfall.shortfallCents ?? 'missing'} cents`,
    },
    {
      name: 'fee reserve covers required relay fee',
      passed: oracleFee?.fees.feeReserveSufficient === true,
      threshold: 'feeReserveSat >= requiredRelayFeeSat',
      observed: `${oracleFee?.fees.feeReserveSat ?? 'missing'} / ${oracleFee?.fees.requiredRelayFeeSat ?? 'missing'} sat`,
    },
    {
      name: 'oracle and confirmation delay fit bridge timeout',
      passed: oracleFee?.timing.timeoutOrderingValid === true,
      threshold: 'actionDelayBlocks < bridgeTimeoutBlocks < childRefundTimeoutBlocks',
      observed: `${oracleFee?.timing.actionDelayBlocks ?? 'missing'} < ${oracleFee?.timing.bridgeTimeoutBlocks ?? 'missing'} < ${oracleFee?.timing.childRefundTimeoutBlocks ?? 'missing'}`,
    },
  ];

  return {
    kind: 'niti.layer5_economic_stress_report.v1',
    boundary:
      'Deterministic economic stress simulation. This is product diligence, not a proof of future solvency, market liquidity, oracle correctness, or production wallet safety.',
    dataset: {
      provider: dataset.source.provider,
      sourceUrl: dataset.source.url,
      rowCount: dataset.rowCount,
      firstDate: dataset.firstDate,
      lastDate: dataset.lastDate,
      curatedDataSha256: dataset.source.curatedDataSha256,
    },
    scenarios,
    aggregate: {
      scenarioCount: scenarios.length,
      passingScenarios: scenarios.filter((entry) => entry.pass).length,
      failingScenarios: scenarios.filter((entry) => !entry.pass).length,
      worstShortfallCents: worst.waterfall.shortfallCents,
      worstShortfallScenario: worst.scenario,
      allWaterfallsConserveBtc: scenarios.every((entry) => entry.waterfall.btcConserved),
      noFalseSolvency: scenarios.every((entry) => (
        BigInt(entry.waterfall.shortfallCents) === 0n
        || entry.failureCauses.includes('holder_shortfall')
      )),
    },
    goNoGo: {
      longRunningPilot: criteria.every((entry) => entry.passed) ? 'GO' : 'NO_GO',
      criteria,
    },
  };
}

export function stableClaimSatFor(input: {
  collateralSat: bigint;
  targetValueCents: bigint;
  priceCents: bigint;
}): bigint {
  if (input.priceCents <= 0n) {
    throw new Error('priceCents must be positive');
  }
  if (input.collateralSat < 0n || input.targetValueCents < 0n) {
    throw new Error('collateral and target must be non-negative');
  }
  const needed = ceilDiv(input.targetValueCents * SATOSHIS_PER_BTC, input.priceCents);
  return needed < input.collateralSat ? needed : input.collateralSat;
}

export function economicStressCanonicalJson(report: EconomicStressReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function assertDataset(dataset: BtcUsdDataset): void {
  if (dataset.kind !== 'niti.economic_stress.btc_usd_2022_daily.v1') {
    throw new Error('unexpected BTC/USD dataset kind');
  }
  if (dataset.rowCount !== 365 || dataset.prices.length !== 365) {
    throw new Error('BTC/USD 2022 fixture must contain 365 daily rows');
  }
  if (dataset.firstDate !== '2022-01-01' || dataset.lastDate !== '2022-12-31') {
    throw new Error('BTC/USD fixture must cover the 2022 calendar year');
  }
  const dataOnly = JSON.stringify({ prices: dataset.prices });
  if (sha256Hex(dataOnly) !== dataset.source.curatedDataSha256) {
    throw new Error('BTC/USD fixture checksum mismatch');
  }
  for (let i = 0; i < dataset.prices.length; i += 1) {
    const point = dataset.prices[i]!;
    if (!/^2022-\d\d-\d\d$/.test(point.date)) {
      throw new Error(`invalid date in BTC/USD fixture: ${point.date}`);
    }
    if (point.closeCents <= 0) {
      throw new Error(`non-positive closeCents for ${point.date}`);
    }
    if (i > 0 && dataset.prices[i - 1]!.date >= point.date) {
      throw new Error('BTC/USD fixture dates must be strictly increasing');
    }
  }
}

function defaultStressConfig(name: string): StressConfig {
  return {
    name,
    initialCollateralSat: SATOSHIS_PER_BTC,
    targetValueCents: 2_000_000n,
    liquidationThresholdBps: 15_000n,
    oracleCadenceDays: 1,
    oracleDelayDays: 2,
    confirmationDelayBlocks: 6,
    liquidationClaimBlocks: 12,
    bridgeTimeoutBlocks: 432,
    childRefundTimeoutBlocks: 720,
    blocksPerDay: 144,
    feeReserveSat: 50_000n,
    requiredRelayFeeSat: 25_000n,
    acceptableShortfallCents: 0n,
  };
}

function buildGapPath(dataset: BtcUsdDataset, gapBps: bigint): PricePath {
  const start = dataset.prices[0]!;
  const startPrice = BigInt(start.closeCents);
  const gapPrice = (startPrice * (10_000n - gapBps)) / 10_000n;
  return {
    name: `overnight_${gapBps / 100n}_percent_gap_from_2022_open`,
    source: `${dataset.source.provider}; adversarial deterministic gap transform`,
    points: [
      {
        date: start.date,
        closeCents: Number(startPrice),
      },
      {
        date: '2022-01-02',
        closeCents: Number(gapPrice),
      },
      {
        date: '2022-01-03',
        closeCents: Number(gapPrice),
      },
    ],
  };
}

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new Error('ceilDiv denominator must be positive');
  }
  return numerator === 0n ? 0n : ((numerator - 1n) / denominator) + 1n;
}

function collateralRatioBps(
  collateralSat: bigint,
  priceCents: bigint,
  targetValueCents: bigint,
): bigint {
  if (targetValueCents <= 0n) {
    return 0n;
  }
  return (collateralSat * priceCents * 10_000n) / (targetValueCents * SATOSHIS_PER_BTC);
}

function nonNegative(value: bigint): bigint {
  return value < 0n ? 0n : value;
}

function maxDrawdownBps(prices: bigint[]): bigint {
  let peak = prices[0] ?? 0n;
  let maxDrawdown = 0n;
  for (const price of prices) {
    if (price > peak) {
      peak = price;
    }
    if (peak > 0n) {
      const drawdown = ((peak - price) * 10_000n) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }
  return maxDrawdown;
}

function failureCauses(input: {
  triggered: boolean;
  feeReserveSufficient: boolean;
  shortfallCents: bigint;
  timeoutOrderingValid: boolean;
  expectedClass: StressScenario['expectedClass'];
}): string[] {
  const causes: string[] = [];
  if (!input.triggered && input.expectedClass !== 'solvent') {
    causes.push('liquidation_not_triggered');
  }
  if (!input.feeReserveSufficient) {
    causes.push('fee_reserve_shortfall');
  }
  if (!input.timeoutOrderingValid) {
    causes.push('timeout_race');
  }
  if (input.shortfallCents > 0n) {
    causes.push('holder_shortfall');
  }
  return causes;
}

function toJsonConfig(config: StressConfig): JsonStressConfig {
  return {
    name: config.name,
    initialCollateralSat: String(config.initialCollateralSat),
    targetValueCents: String(config.targetValueCents),
    liquidationThresholdBps: String(config.liquidationThresholdBps),
    oracleCadenceDays: config.oracleCadenceDays,
    oracleDelayDays: config.oracleDelayDays,
    confirmationDelayBlocks: config.confirmationDelayBlocks,
    liquidationClaimBlocks: config.liquidationClaimBlocks,
    bridgeTimeoutBlocks: config.bridgeTimeoutBlocks,
    childRefundTimeoutBlocks: config.childRefundTimeoutBlocks,
    blocksPerDay: config.blocksPerDay,
    feeReserveSat: String(config.feeReserveSat),
    requiredRelayFeeSat: String(config.requiredRelayFeeSat),
    acceptableShortfallCents: String(config.acceptableShortfallCents),
  };
}
