import assert from 'node:assert/strict';
import {
  buildCanonicalBilateralSetupTranscript,
} from './bilateral-setup-schema.js';
import {
  cloneTemplate,
  compareBilateralTemplateViews,
  deriveBilateralTemplateParticipantView,
  participantViewFromTemplate,
  rejectIfTemplateDigestChanged,
  type BilateralTransactionTemplateAgreement,
} from './bilateral-template-agreement.js';

type TemplateMutation = {
  name: string;
  mutate: (template: BilateralTransactionTemplateAgreement) => void;
};

const transcript = buildCanonicalBilateralSetupTranscript();
const aliceView = deriveBilateralTemplateParticipantView({
  participant: 'alice',
  transcript,
});
const bobView = deriveBilateralTemplateParticipantView({
  participant: 'bob',
  transcript,
});
const comparison = compareBilateralTemplateViews([aliceView, bobView]);

assert.equal(comparison.accepted, true);
assert.equal(aliceView.canonicalTemplateDigestHex, bobView.canonicalTemplateDigestHex);
assert.equal(aliceView.template.parentCet.input.txid, aliceView.template.parentFundingOutpoint.txid);
assert.equal(aliceView.template.bridge.input.txid, aliceView.template.parentCet.unsignedTxid);
assert.equal(aliceView.template.childCet.input.txid, aliceView.template.bridge.unsignedTxid);
assert.equal(aliceView.template.edgeTimeoutRefund.input.txid, aliceView.template.parentCet.unsignedTxid);
assert.equal(aliceView.template.childTimeoutRefund.input.txid, aliceView.template.bridge.unsignedTxid);
assert.equal(aliceView.template.timelocks.ordered, true);
assert.equal(aliceView.template.parentCet.dustCheckPasses, true);
assert.equal(aliceView.template.bridge.dustCheckPasses, true);
assert.equal(aliceView.template.childCet.dustCheckPasses, true);
assert.equal(aliceView.template.edgeTimeoutRefund.dustCheckPasses, true);
assert.equal(aliceView.template.childTimeoutRefund.dustCheckPasses, true);

const mutations: TemplateMutation[] = [
  {
    name: 'wrong parent txid',
    mutate: (template) => {
      template.parentFundingOutpoint.txid = '11'.repeat(32);
      template.parentCet.input.txid = '11'.repeat(32);
    },
  },
  {
    name: 'wrong parent vout',
    mutate: (template) => {
      template.parentFundingOutpoint.vout = 1;
      template.parentCet.input.vout = 1;
    },
  },
  {
    name: 'wrong amount',
    mutate: (template) => {
      template.parentFundingOutpoint.valueSat = '99999';
      template.parentCet.input.valueSat = '99999';
    },
  },
  {
    name: 'wrong script',
    mutate: (template) => {
      template.parentFundingOutpoint.scriptPubKeyHex = `5120${'22'.repeat(32)}`;
      template.parentCet.input.scriptPubKeyHex = `5120${'22'.repeat(32)}`;
    },
  },
  {
    name: 'wrong fee',
    mutate: (template) => {
      template.bridge.feeSat = '501';
    },
  },
  {
    name: 'wrong locktime',
    mutate: (template) => {
      template.edgeTimeoutRefund.locktime += 1;
      template.timelocks.bridgeTimeoutHeight += 1;
    },
  },
  {
    name: 'wrong adaptor sighash',
    mutate: (template) => {
      template.bridge.sighashHex = '33'.repeat(32);
    },
  },
  {
    name: 'swapped output role',
    mutate: (template) => {
      template.bridge.outputRole = 'parent_edge';
      template.bridge.output.role = 'parent_edge';
    },
  },
];

const mutationResults = mutations.map((mutation) => {
  const mutatedTemplate = cloneTemplate(aliceView.template);
  mutation.mutate(mutatedTemplate);
  const mutatedView = participantViewFromTemplate({
    participant: 'bob',
    template: mutatedTemplate,
  });
  const result = rejectIfTemplateDigestChanged({
    name: mutation.name,
    expected: aliceView,
    candidate: mutatedView,
  });
  assert.equal(result.accepted, false, mutation.name);
  assert.match(result.rejectionReason, /template digest mismatch/u);
  return result;
});

console.log(JSON.stringify({
  kind: 'niti.l3_bilateral_template_agreement_test.v1',
  comparison,
  canonical: {
    sessionIdHex: aliceView.sessionIdHex,
    digestHex: aliceView.canonicalTemplateDigestHex,
    parentFundingOutpoint: aliceView.template.parentFundingOutpoint,
    parentCetTxid: aliceView.template.parentCet.unsignedTxid,
    parentCetSighashHex: aliceView.template.parentCet.sighashHex,
    bridgeTxid: aliceView.template.bridge.unsignedTxid,
    bridgeSighashHex: aliceView.template.bridge.sighashHex,
    childFundingOutput: aliceView.template.childFundingOutput,
    edgeTimeoutRefundTxid: aliceView.template.edgeTimeoutRefund.unsignedTxid,
    childTimeoutRefundTxid: aliceView.template.childTimeoutRefund.unsignedTxid,
    timelocks: aliceView.template.timelocks,
  },
  mutationResults,
}, null, 2));
