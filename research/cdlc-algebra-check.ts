import { createHash } from 'node:crypto';

const n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');

const mod = (x: bigint) => ((x % n) + n) % n;

const h = (...parts: Array<string | bigint>) => {
  const input = parts.map((part) => part.toString()).join('|');
  return mod(BigInt(`0x${createHash('sha256').update(input).digest('hex')}`));
};

type Point = bigint;

const add = (a: Point, b: Point): Point => mod(a + b);
const mul = (k: bigint, p: Point): Point => mod(k * p);
const G: Point = 1n;

const oracleSecret = 0x1001n;
const oracleNonce = 0x2002n;
const oraclePublic = mul(oracleSecret, G);
const oracleNoncePoint = mul(oracleNonce, G);
const outcome = 'BTCUSD=100000';

const oracleChallenge = h('oracle', oracleNoncePoint, oraclePublic, outcome);
const oracleAttestationSecret = mod(oracleNonce + oracleChallenge * oracleSecret);
const oracleAttestationPoint = add(
  oracleNoncePoint,
  mul(oracleChallenge, oraclePublic),
);

const signerSecret = 0x3003n;
const signerPublic = mul(signerSecret, G);
const signerNonce = 0x4004n;
const adaptorPoint = oracleAttestationPoint;
const preNoncePoint = mul(signerNonce, G);
const adaptedNoncePoint = add(preNoncePoint, adaptorPoint);
const message = 'bridge tx parent CET output -> child DLC funding output';

const signatureChallenge = h('bip340', adaptedNoncePoint, signerPublic, message);
const adaptorSignature = mod(signerNonce + signatureChallenge * signerSecret);
const completedSignature = mod(adaptorSignature + oracleAttestationSecret);

const oracleAttestationIsValid =
  mul(oracleAttestationSecret, G) === oracleAttestationPoint;

const adaptorVerifiesBeforeCompletion =
  mul(adaptorSignature, G) ===
  add(preNoncePoint, mul(signatureChallenge, signerPublic));

const completedSignatureVerifies =
  mul(completedSignature, G) ===
  add(adaptedNoncePoint, mul(signatureChallenge, signerPublic));

const extractedOracleSecret = mod(completedSignature - adaptorSignature);

console.log({
  oracleAttestationIsValid,
  adaptorVerifiesBeforeCompletion,
  completedSignatureVerifies,
  extractedSecretMatchesOracleAttestation:
    extractedOracleSecret === oracleAttestationSecret,
});
