import { bytesToHex, bytesToNumber } from './bytes.js';
import {
  modN,
  normalizeBip340Secret,
  pointToCompressed,
  scalarFromHex,
  scalarToHex,
  sha256Text,
} from './secp.js';
import {
  deriveTaprootWallet,
  type BitcoinNetworkName,
  type TaprootWallet,
} from './taproot.js';
import { canonicalNetwork, canonicalSecrets } from './cdlc-scenario.js';

export type BilateralRoleName = 'alice' | 'bob';

export type BilateralAdaptorNoncePurpose =
  | 'parent_cet'
  | 'bridge'
  | 'child_cet';

export const bilateralAdaptorNoncePurposes: readonly BilateralAdaptorNoncePurpose[] = [
  'parent_cet',
  'bridge',
  'child_cet',
] as const;

export interface BilateralRoleFixture {
  role: BilateralRoleName;
  fundingInternalSecretHex: string;
  cetSigningInternalSecretHex: string;
  refundInternalSecretHex: string;
  adaptorNonceRootSecretHex: string;
  storageIdentitySecretHex: string;
}

export interface PublicTaprootKeyScope {
  internalPublicXOnlyHex: string;
  outputPublicXOnlyHex: string;
  outputPublicCompressedHex: string;
  address: string;
  scriptPubKeyHex: string;
}

export interface PublicAdaptorNonceCommitment {
  purpose: BilateralAdaptorNoncePurpose;
  commitmentCompressedHex: string;
}

export interface BilateralSetupMessage {
  kind: 'niti.l3.bilateral_setup_message.v1';
  role: BilateralRoleName;
  network: BitcoinNetworkName;
  funding: PublicTaprootKeyScope;
  cetSigning: PublicTaprootKeyScope;
  refund: PublicTaprootKeyScope;
  adaptorNonceCommitments: PublicAdaptorNonceCommitment[];
  storageIdentityPublicCompressedHex: string;
  storageNamespaceHex: string;
}

export interface BilateralRoleMaterial {
  role: BilateralRoleName;
  network: BitcoinNetworkName;
  fixture: BilateralRoleFixture;
  funding: TaprootWallet;
  cetSigning: TaprootWallet;
  refund: TaprootWallet;
  adaptorNonceCommitments: PublicAdaptorNonceCommitment[];
  derivedAdaptorNonceSecretHex: Record<BilateralAdaptorNoncePurpose, string>;
  storageIdentityPublicCompressedHex: string;
  storageNamespaceHex: string;
  setupMessage: BilateralSetupMessage;
}

export interface BilateralRoleSeparationChecks {
  roleCountIsTwo: boolean;
  eachRoleHasFivePrivateScopes: boolean;
  allPrivateScalarsAreUnique: boolean;
  allPublicKeyScopesAreUnique: boolean;
  storageIdentitiesAreUnique: boolean;
  publicMessagesContainNoPrivateScalars: boolean;
  publicMessagesExposeOnlyNonceCommitments: boolean;
  doesNotReuseCanonicalSmokeScalars: boolean;
}

function repeatHexByte(byteHex: string): string {
  if (!/^[0-9a-f]{2}$/u.test(byteHex)) {
    throw new Error(`invalid fixture byte: ${byteHex}`);
  }
  return byteHex.repeat(32);
}

export const bilateralRoleFixtures: readonly BilateralRoleFixture[] = [
  {
    role: 'alice',
    fundingInternalSecretHex: repeatHexByte('2a'),
    cetSigningInternalSecretHex: repeatHexByte('2b'),
    refundInternalSecretHex: repeatHexByte('2c'),
    adaptorNonceRootSecretHex: repeatHexByte('2d'),
    storageIdentitySecretHex: repeatHexByte('2e'),
  },
  {
    role: 'bob',
    fundingInternalSecretHex: repeatHexByte('3a'),
    cetSigningInternalSecretHex: repeatHexByte('3b'),
    refundInternalSecretHex: repeatHexByte('3c'),
    adaptorNonceRootSecretHex: repeatHexByte('3d'),
    storageIdentitySecretHex: repeatHexByte('3e'),
  },
] as const;

function publicTaprootKeyScope(wallet: TaprootWallet): PublicTaprootKeyScope {
  return {
    internalPublicXOnlyHex: wallet.internalPublicXOnlyHex,
    outputPublicXOnlyHex: wallet.outputPublicXOnlyHex,
    outputPublicCompressedHex: wallet.outputPublicCompressedHex,
    address: wallet.address,
    scriptPubKeyHex: wallet.scriptPubKeyHex,
  };
}

function derivePurposeScalarHex(input: {
  role: BilateralRoleName;
  rootSecretHex: string;
  purpose: BilateralAdaptorNoncePurpose;
}): string {
  const rootSecret = scalarFromHex(input.rootSecretHex, `${input.role} adaptor nonce root`);
  const digest = bytesToNumber(sha256Text(
    `niti:l3:adaptor-nonce:${input.role}:${input.purpose}:${scalarToHex(rootSecret)}`,
  ));
  const scalar = modN(digest);
  return scalarToHex(scalar === 0n ? 1n : scalar);
}

function publicPointFromSecretHex(secretHex: string, name: string): string {
  const normalized = normalizeBip340Secret(scalarFromHex(secretHex, name));
  return pointToCompressed(normalized.point);
}

function storageNamespaceHex(input: {
  role: BilateralRoleName;
  storageIdentityPublicCompressedHex: string;
}): string {
  return bytesToHex(sha256Text(
    `niti:l3:storage:${input.role}:${input.storageIdentityPublicCompressedHex}`,
  ));
}

export function buildBilateralRoleMaterial(
  network: BitcoinNetworkName = canonicalNetwork,
): BilateralRoleMaterial[] {
  return bilateralRoleFixtures.map((fixture) => {
    const funding = deriveTaprootWallet({
      network,
      internalSecret: scalarFromHex(
        fixture.fundingInternalSecretHex,
        `${fixture.role} funding secret`,
      ),
    });
    const cetSigning = deriveTaprootWallet({
      network,
      internalSecret: scalarFromHex(
        fixture.cetSigningInternalSecretHex,
        `${fixture.role} CET signing secret`,
      ),
    });
    const refund = deriveTaprootWallet({
      network,
      internalSecret: scalarFromHex(
        fixture.refundInternalSecretHex,
        `${fixture.role} refund secret`,
      ),
    });
    const storageIdentityPublicCompressedHex = publicPointFromSecretHex(
      fixture.storageIdentitySecretHex,
      `${fixture.role} storage identity secret`,
    );
    const namespaceHex = storageNamespaceHex({
      role: fixture.role,
      storageIdentityPublicCompressedHex,
    });

    const derivedAdaptorNonceSecretHex = Object.fromEntries(
      bilateralAdaptorNoncePurposes.map((purpose) => [
        purpose,
        derivePurposeScalarHex({
          role: fixture.role,
          rootSecretHex: fixture.adaptorNonceRootSecretHex,
          purpose,
        }),
      ]),
    ) as Record<BilateralAdaptorNoncePurpose, string>;

    const adaptorNonceCommitments = bilateralAdaptorNoncePurposes.map((purpose) => ({
      purpose,
      commitmentCompressedHex: publicPointFromSecretHex(
        derivedAdaptorNonceSecretHex[purpose],
        `${fixture.role} ${purpose} adaptor nonce`,
      ),
    }));

    const setupMessage: BilateralSetupMessage = {
      kind: 'niti.l3.bilateral_setup_message.v1',
      role: fixture.role,
      network,
      funding: publicTaprootKeyScope(funding),
      cetSigning: publicTaprootKeyScope(cetSigning),
      refund: publicTaprootKeyScope(refund),
      adaptorNonceCommitments,
      storageIdentityPublicCompressedHex,
      storageNamespaceHex: namespaceHex,
    };

    return {
      role: fixture.role,
      network,
      fixture,
      funding,
      cetSigning,
      refund,
      adaptorNonceCommitments,
      derivedAdaptorNonceSecretHex,
      storageIdentityPublicCompressedHex,
      storageNamespaceHex: namespaceHex,
      setupMessage,
    };
  });
}

function rolePrivateScalars(material: BilateralRoleMaterial): string[] {
  return [
    material.fixture.fundingInternalSecretHex,
    material.fixture.cetSigningInternalSecretHex,
    material.fixture.refundInternalSecretHex,
    material.fixture.adaptorNonceRootSecretHex,
    material.fixture.storageIdentitySecretHex,
    ...bilateralAdaptorNoncePurposes.map((purpose) => (
      material.derivedAdaptorNonceSecretHex[purpose]
    )),
  ];
}

function rolePublicKeys(material: BilateralRoleMaterial): string[] {
  return [
    material.funding.internalPublicXOnlyHex,
    material.funding.outputPublicXOnlyHex,
    material.cetSigning.internalPublicXOnlyHex,
    material.cetSigning.outputPublicXOnlyHex,
    material.refund.internalPublicXOnlyHex,
    material.refund.outputPublicXOnlyHex,
    material.storageIdentityPublicCompressedHex,
    ...material.adaptorNonceCommitments.map((commitment) => (
      commitment.commitmentCompressedHex
    )),
  ];
}

function jsonContainsAnyNeedle(value: unknown, needles: readonly string[]): boolean {
  const encoded = JSON.stringify(value);
  return needles.some((needle) => encoded.includes(needle));
}

export function validateBilateralRoleSeparation(
  materials: readonly BilateralRoleMaterial[],
): BilateralRoleSeparationChecks {
  const privateScalars = materials.flatMap(rolePrivateScalars);
  const publicKeys = materials.flatMap(rolePublicKeys);
  const setupMessages = materials.map((material) => material.setupMessage);
  const storageIdentities = materials.map((material) => material.storageIdentityPublicCompressedHex);
  const canonicalSmokeScalars = new Set<string>(Object.values(canonicalSecrets));
  const commitmentCount = materials.reduce(
    (sum, material) => sum + material.setupMessage.adaptorNonceCommitments.length,
    0,
  );

  return {
    roleCountIsTwo: materials.length === 2
      && materials.some((material) => material.role === 'alice')
      && materials.some((material) => material.role === 'bob'),
    eachRoleHasFivePrivateScopes: materials.every((material) => (
      [
        material.fixture.fundingInternalSecretHex,
        material.fixture.cetSigningInternalSecretHex,
        material.fixture.refundInternalSecretHex,
        material.fixture.adaptorNonceRootSecretHex,
        material.fixture.storageIdentitySecretHex,
      ].length === 5
    )),
    allPrivateScalarsAreUnique: new Set(privateScalars).size === privateScalars.length,
    allPublicKeyScopesAreUnique: new Set(publicKeys).size === publicKeys.length,
    storageIdentitiesAreUnique: new Set(storageIdentities).size === storageIdentities.length,
    publicMessagesContainNoPrivateScalars: !jsonContainsAnyNeedle(setupMessages, privateScalars),
    publicMessagesExposeOnlyNonceCommitments:
      commitmentCount === materials.length * bilateralAdaptorNoncePurposes.length
      && setupMessages.every((message) => (
        message.adaptorNonceCommitments.every((commitment) => (
          commitment.commitmentCompressedHex.length === 66
        ))
      )),
    doesNotReuseCanonicalSmokeScalars: privateScalars.every((scalar) => (
      !canonicalSmokeScalars.has(scalar)
    )),
  };
}
