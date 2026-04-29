import assert from 'node:assert/strict';
import {
  bilateralAdaptorNoncePurposes,
  buildBilateralRoleMaterial,
  validateBilateralRoleSeparation,
} from './bilateral-roles.js';
import { canonicalNetwork } from './cdlc-scenario.js';

function collectObjectKeys(value: unknown, keys: string[] = []): string[] {
  if (!value || typeof value !== 'object') {
    return keys;
  }
  for (const [key, nested] of Object.entries(value)) {
    keys.push(key);
    collectObjectKeys(nested, keys);
  }
  return keys;
}

const materials = buildBilateralRoleMaterial(canonicalNetwork);
const checks = validateBilateralRoleSeparation(materials);

assert.equal(checks.roleCountIsTwo, true);
assert.equal(checks.eachRoleHasFivePrivateScopes, true);
assert.equal(checks.allPrivateScalarsAreUnique, true);
assert.equal(checks.allPublicKeyScopesAreUnique, true);
assert.equal(checks.storageIdentitiesAreUnique, true);
assert.equal(checks.publicMessagesContainNoPrivateScalars, true);
assert.equal(checks.publicMessagesExposeOnlyNonceCommitments, true);
assert.equal(checks.doesNotReuseCanonicalSmokeScalars, true);

for (const material of materials) {
  assert.equal(material.setupMessage.role, material.role);
  assert.equal(material.setupMessage.network, canonicalNetwork);
  assert.equal(material.setupMessage.funding.address, material.funding.address);
  assert.equal(material.setupMessage.cetSigning.address, material.cetSigning.address);
  assert.equal(material.setupMessage.refund.address, material.refund.address);
  assert.equal(material.setupMessage.storageNamespaceHex, material.storageNamespaceHex);
  assert.deepEqual(
    material.setupMessage.adaptorNonceCommitments.map((commitment) => commitment.purpose),
    bilateralAdaptorNoncePurposes,
  );
}

const publicMessageKeys = materials.flatMap((material) => (
  collectObjectKeys(material.setupMessage)
));
assert.equal(
  publicMessageKeys.some((key) => /secret|root/i.test(key)),
  false,
);

console.log(JSON.stringify({
  kind: 'niti.l3_bilateral_role_fixture.v1',
  boundary: 'deterministic local role fixture; no production wallet integration',
  network: canonicalNetwork,
  roles: materials.map((material) => ({
    role: material.role,
    storageNamespaceHex: material.storageNamespaceHex,
    setupMessage: material.setupMessage,
    privateScopeNames: [
      'fundingInternalSecretHex',
      'cetSigningInternalSecretHex',
      'refundInternalSecretHex',
      'adaptorNonceRootSecretHex',
      'storageIdentitySecretHex',
    ],
    derivedAdaptorNoncePurposes: bilateralAdaptorNoncePurposes,
  })),
  checks,
}, null, 2));
