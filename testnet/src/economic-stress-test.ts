import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  defaultEvidencePath,
  economicStressCanonicalJson,
  loadBtcUsd2022Dataset,
  runDefaultEconomicStressSuite,
  sha256Hex,
  stableClaimSatFor,
  writeDefaultEconomicStressEvidence,
} from './economic-stress.js';

const writeEvidence = process.argv.includes('--write-evidence');
const report = writeEvidence
  ? writeDefaultEconomicStressEvidence()
  : runDefaultEconomicStressSuite();
const canonical = economicStressCanonicalJson(report);

const dataset = loadBtcUsd2022Dataset();
assert.equal(dataset.rowCount, 365);
assert.equal(dataset.firstDate, '2022-01-01');
assert.equal(dataset.lastDate, '2022-12-31');
assert.equal(dataset.source.curatedDataSha256, '31c22c188edbd5e74551ac7fb7547c064309d8762ca0c13a0dd35a10797e7d81');

assert.equal(report.kind, 'niti.layer5_economic_stress_report.v1');
assert.equal(report.scenarios.length, 6);
assert.equal(report.aggregate.allWaterfallsConserveBtc, true);
assert.equal(report.aggregate.noFalseSolvency, true);
assert.equal(report.goNoGo.longRunningPilot, 'NO_GO');

const byScenario = new Map(report.scenarios.map((scenario) => [scenario.scenario, scenario]));
const historical = byScenario.get('historical_2022_drawdown');
const gap20 = byScenario.get('overnight_20_percent_gap');
const gap40 = byScenario.get('overnight_40_percent_gap');
const gap70 = byScenario.get('overnight_70_percent_gap');
const oracleFee = byScenario.get('oracle_delay_fee_spike');
const thin = byScenario.get('thin_collateral_70_percent_gap');

assert.ok(historical);
assert.ok(gap20);
assert.ok(gap40);
assert.ok(gap70);
assert.ok(oracleFee);
assert.ok(thin);

assert.equal(historical.pass, true);
assert.equal(historical.waterfall.shortfallCents, '0');
assert.equal(historical.liquidation.triggered, true);

assert.equal(gap20.pass, true);
assert.equal(gap20.liquidation.triggered, false);
assert.equal(gap20.waterfall.shortfallCents, '0');

assert.equal(gap40.pass, true);
assert.equal(gap40.liquidation.triggered, true);
assert.equal(gap40.waterfall.shortfallCents, '0');

assert.equal(gap70.pass, false);
assert.equal(gap70.failureCauses.includes('holder_shortfall'), true);
assert.ok(BigInt(gap70.waterfall.shortfallCents) > 0n);

assert.equal(oracleFee.pass, false);
assert.equal(oracleFee.failureCauses.includes('fee_reserve_shortfall'), true);
assert.equal(oracleFee.failureCauses.includes('timeout_race'), true);

assert.equal(thin.pass, false);
assert.equal(thin.failureCauses.includes('holder_shortfall'), true);

const exactClaim = stableClaimSatFor({
  collateralSat: 100_000_000n,
  targetValueCents: 2_000_000n,
  priceCents: 2_500_000n,
});
assert.equal(exactClaim, 80_000_000n);

const cappedClaim = stableClaimSatFor({
  collateralSat: 50_000_000n,
  targetValueCents: 2_000_000n,
  priceCents: 2_500_000n,
});
assert.equal(cappedClaim, 50_000_000n);

const evidencePath = defaultEvidencePath();
if (!writeEvidence) {
  const expected = fs.readFileSync(evidencePath, 'utf8');
  assert.equal(canonical, expected);
}

console.log(JSON.stringify({
  kind: 'niti.layer5_economic_stress_test.v1',
  evidencePath,
  reportSha256: sha256Hex(canonical),
  scenarioCount: report.aggregate.scenarioCount,
  passingScenarios: report.aggregate.passingScenarios,
  failingScenarios: report.aggregate.failingScenarios,
  worstShortfallScenario: report.aggregate.worstShortfallScenario,
  worstShortfallCents: report.aggregate.worstShortfallCents,
  longRunningPilot: report.goNoGo.longRunningPilot,
  checks: {
    datasetLoaded: true,
    datasetChecksumPinned: true,
    snapshotMatches: true,
    historicalPathSolvent: historical.pass,
    gap70ReportsShortfall: gap70.failureCauses.includes('holder_shortfall'),
    oracleDelayFeeSpikeFailsClosed:
      oracleFee.failureCauses.includes('fee_reserve_shortfall')
      && oracleFee.failureCauses.includes('timeout_race'),
    noFalseSolvency: report.aggregate.noFalseSolvency,
  },
}, null, 2));
