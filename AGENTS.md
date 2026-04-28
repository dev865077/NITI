# Agent Instructions For NITI

These instructions apply to every automated coding or documentation agent
working in this repository.

## Public Documents Must Not Contain Agent Scaffolding

Public repository documents must read as finished technical materials. They are
not task logs, agent work products, GitHub issue responses, or implementation
diaries.

Before editing any document, classify it:

- **Public**: README, whitepaper, protocol, architecture, security, roadmap,
  release notes, auditor/investor materials, research notes, demo scripts, and
  testnet guides.
- **Internal**: commit messages, PR bodies, issue comments, local scratch
  notes, generated build metadata, and source-code fields that intentionally
  preserve machine-readable provenance.

Public documents must never contain the agent's organizational scaffolding.
That includes:

- why the agent created the document;
- what issue, PR, branch, task, checklist item, or prompt caused the document;
- "this document is for...", "this artifact closes...", "as requested...",
  "parent epic", "child issue", "blocking issue", "work item", "task list",
  "agent plan", "future issue", "this PR", or similar provenance language;
- placeholders that exist only because a task asked for them;
- project-management framing that is not meaningful to an external reader;
- artificial checklists unless the checklist is a real reviewer procedure;
- phrasing that exposes the agent's process instead of the project's technical
  substance.

A public document should not explain its own origin. It should simply be the
document: a protocol note, a limitation note, a release note, a proof note, a
testnet guide, or an evidence guide.

When public prose needs to describe unfinished work, describe the actual
technical gap, not the tracking mechanism. Use "bilateral negotiation remains
unimplemented" instead of "issue X remains open". Use "historical stress replay
is not yet complete" instead of "Layer 5 issues remain open".

Internal references are allowed only in internal surfaces: PR descriptions,
issue comments, commit messages, or generated machine-readable metadata where
the reference is deliberately part of the schema. They are not allowed in
investor-facing, auditor-facing, release-facing, README, roadmap, protocol,
security, testnet guide, whitepaper, or research prose.

## Required Public-Doc Review

For any change touching `README.md`, `WHITEPAPER.md`, `docs/**/*.md`,
`research/**/*.md`, or `testnet/**/*.md`, run a public-doc contamination scan
before opening a PR:

```sh
rg -n "issue #[0-9]+|Issue #[0-9]+|issue-[0-9]+|GitHub issue|\\|[[:space:]]*#[0-9]+[[:space:]]*\\||EPIC|epic|child issue|blocking issue|this PR|pull request|branch name|agent plan|future .* issue|this document is for|artifact for|as requested|work item|task list|closes #" \
  README.md WHITEPAPER.md docs research testnet \
  --glob "*.md" --glob "*.ts" --glob "!testnet/artifacts/**"
```

Every match in public prose must be removed or rewritten. A match may remain
only if it is in generated machine-readable metadata or a path that cannot be
changed without breaking existing committed evidence; when keeping a match,
explain why in the PR body.

Also run the usual documentation checks:

```sh
npx --yes markdown-link-check README.md docs/*.md
git diff --check
```

## Tone For Investor And Auditor Materials

Investor-facing and auditor-facing documents must be precise, conservative,
and self-contained. They should state:

- what is proven;
- what is demonstrated;
- what remains assumed;
- what is explicitly not claimed;
- how to reproduce or audit the evidence.

They must not contain implementation diary language, internal task routing,
agent coordination artifacts, or the reason an agent created the document.
