# ERC-8004 subgraph

This repository indexes the stable ERC-8004 Identity and Reputation
registries. Arc Testnet is the default target. Base Sepolia is included to
show how the same manifest can be built and deployed for more than one chain.
The Validation Registry ABI, addresses, and commented mapping setup remain in
the repository, but builds do not index it while its interface is unstable.

## What is here

```text
abis/                       Event-only contract ABIs
src/mapping.ts              Re-exports the handlers below for subgraph.yaml
src/handlers/               One file per data source, plus its tests
src/utils/                  Shared parsing and lookup helpers, plus their tests
scripts/deploy.ts           Manifest generation, build, and deployment
chain.config.json           Chain addresses and start blocks
schema.graphql              Identity and reputation query model
subgraph.template.yaml      Shared manifest template
matchstick.yaml             Matchstick test configuration
```

## Schema design

`Agent` and `Feedback` hold mutable current state. Event audit records, parsed
registration and feedback documents, services, service features, attachments,
and responses are immutable. Reverse collections use `@derivedFrom` so parent
entities do not accumulate unbounded arrays.

Each `AgentService` keeps the name supplied by the agent card. The mapping
assigns a known service to `AgentService.kind` and assigns unknown names to
`CUSTOM`. One `AgentServiceFeature` row stores one capability, tool, resource,
prompt, skill, or domain. Queries can filter those values directly.
`AgentServiceAttribute` stores custom service fields that do not have a named
field in the schema.

`FeedbackDocumentFeature` and `FeedbackDocumentFeatureFile` store every A2A
skill, OASF skill, OASF domain, and MCP value as its own row. They accept both
the nested fields in ERC-8004 and the flat `skill`, `domain`, `capability`, and
`name` fields in the 8004scan v2 profile. The parser uses these mappings:

- `a2a.skills` becomes `A2A_SKILL`
- `oasf.skills` becomes `OASF_SKILL`
- `oasf.domains` and flat `domain` become `OASF_DOMAIN`
- Flat `skill` becomes `SKILL`
- Flat `capability` becomes `MCP_CAPABILITY`
- MCP tool, prompt, resource, and completion names use their matching MCP kind

The Graph does not support schema-less entity fields. Dynamic data sources can
discover files or contracts at runtime, but `schema.graphql` must declare every
stored field. The Graph generates filters for scalar fields and has no custom
database-index directive. The schema stores commonly filtered values in their
own fields and adds ranked text search for profiles, services, and feedback
documents.

Chain handlers parse `data:` URIs into `AgentRegistration` and
`FeedbackDocument`. These are the primary document types. IPFS and Arweave file
handlers use the parallel `AgentRegistrationFile` and `FeedbackDocumentFile`
trees because The Graph does not let chain and file handlers write the same
entity types. `Agent.registration` and `Feedback.document` accept either type
through the `AgentRegistrationData` and `FeedbackDocumentData` interfaces.
Every entity in a file-handler tree uses the corresponding primary entity name
with a `File` suffix.

Public Graph Network indexers cannot fetch arbitrary HTTP or HTTPS documents in
a deterministic way. Those records retain the URI but do not get parsed
document entities. IPFS and Arweave documents are in the same position today:
parsing them needs file data source templates, which are not set up yet (see
"Add indexing later" below). Until then, an IPFS or Arweave `agentURI` or
`feedbackURI` is stored and classified, but `Agent.registration` and
`Feedback.document` stay null for it.

## Handlers

`src/handlers/identity-registry.ts` and `src/handlers/reputation-registry.ts`
implement every event in their manifests. `src/mapping.ts` only re-exports
them, because `subgraph.yaml` handlers must live in the file it points at.

Both handlers share lookup and parsing code from `src/utils/`:

- `uri.ts` classifies a URI's scheme and decodes a `data:` payload.
- `base64.ts` backs the `data:...;base64,` case (graph-ts has no built-in decoder).
- `json.ts` reads untrusted `JSONValue` trees without ever letting a
  malformed or adversarial document abort a handler.
- `caip.ts` reads and writes CAIP-10 identifiers (`eip155:<chainId>:<address>`).
- `account.ts` and `ids.ts` hold the `Account` lookup and the `Agent` entity
  ID, the two things both data sources need to agree on.
- `registration.ts` and `feedback-document.ts` parse a `data:` URI's JSON into
  the entity trees described above, following the 8004scan community
  profiles for agent metadata and feedback data.

A few mapping choices from those community profiles were not fully specified
and were resolved as follows; revisit them if real-world documents disagree:

- `AgentService.capabilitiesInferred` is always `false`. This parser only
  ever reads an explicit protocol field (`mcpTools`, `a2aSkills`, `skills`,
  ...) into a feature row; it never guesses at a service's capabilities.
- `AgentRegistration.contentHash` and `FeedbackDocument.contentHash` are
  `keccak256` of the decoded JSON text, so a consumer can verify a cached copy
  against the on-chain URI without re-decoding the `data:` URI.
- A service or feedback object's keys that are not part of the documented
  profile become `AgentServiceAttribute` rows (there is no feedback-side
  equivalent in the schema) rather than being dropped.

## Testing

```sh
vp run test
```

`src/utils/*.test.ts` cover the parsing and lookup helpers with Matchstick,
including the full `AgentRegistration`/`FeedbackDocument` entity trees.

`src/handlers/*.test.ts` currently only cover the guard clauses that return
before saving anything (an event for an agent or feedback record that was
never indexed). Matchstick's store cannot persist the GraphQL `Timestamp`
scalar that `createdAt`/`updatedAt`/`timestamp` use on almost every other
entity here — saving one aborts the whole test binary instead of failing one
assertion ([LimeChain/matchstick#433](https://github.com/LimeChain/matchstick/issues/433),
still open). The happy paths those handlers drive — counters, revisions,
document parsing — are covered instead by `graph build`'s type checking, the
utils tests they delegate to, and manual review.

If this gap matters more than the `Timestamp` scalar's typing (a plain
GraphQL string/number, rather than the ISO-8601 timestamp most GraphQL
clients render), switching those fields to `BigInt` (Unix seconds) would
unblock full handler coverage today. That is a schema-wide change outside
this change's scope, so it has been left for a deliberate decision rather than
made silently.

## Install

Install the [Vite+ CLI](https://viteplus.dev/guide/). Vite+ installs the pinned
Bun version and uses it as this project's package manager.

```sh
curl -fsSL https://vite.plus | bash
vp install
```

Installing dependencies also configures the pre-commit hook. It formats and
lints staged files with Oxfmt and Oxlint. Run `vp hooks status` if the hook does
not run in your clone.

## Quality checks

Run formatting and non-type-aware linting:

```sh
vp check
```

The subgraph mappings are AssemblyScript, so `graph build` remains their
authoritative compiler check. Run all quality checks and build the default Arc
Testnet subgraph before opening a pull request:

```sh
vp run ready
```

## Configure a chain

Chain settings live in `chain.config.json`. Each entry needs:

- The Graph network identifier
- The numeric chain ID
- The Identity Registry address and start block
- The Reputation Registry address and start block

The Validation Registry address and start block are optional. The deploy script
does not read them while that data source is disabled. Existing entries remain
in the config for later use.

Arc Testnet is already configured with The Graph identifier `arc-testnet` and
chain ID `5042002`.

To add a chain, copy an existing entry and change its key and values.

```json
{
  "another-testnet": {
    "network": "the-graph-network-id",
    "chainId": 123,
    "contracts": {
      "identity": {
        "address": "0x...",
        "startBlock": 100
      },
      "reputation": {
        "address": "0x...",
        "startBlock": 100
      },
      "validation": {
        "address": "0x...",
        "startBlock": 100
      }
    }
  }
}
```

Use the identifier listed on The Graph's
[supported networks page](https://thegraph.com/docs/en/supported-networks/).
Set each start block to the contract's deployment block. Starting at block zero
works, but wastes indexing time.

## Build Arc Testnet

This command generates `.generated/arc-testnet/subgraph.yaml`, runs codegen,
and builds the mapping. It does not deploy anything.

```sh
vp run build
```

The same check can target another configured chain.

```sh
bun run deploy -- base-sepolia --build-only
```

## Deploy

Create one Subgraph Studio project per chain. Copy each project's slug from its
Studio page.

Authenticate once with the deploy key shown in Subgraph Studio.

```sh
bunx graph auth YOUR_DEPLOY_KEY
```

Keep the deploy key in your password manager or shell environment. Do not add
it to this repository.

Pass a target as `chain=studio-slug`. The version defaults to `dev`.

```sh
bun run deploy -- arc-testnet=your-arc-studio-slug --version v0.1.0
```

The script generates the chain's manifest, runs codegen, builds it, and sends
it to Subgraph Studio.

Pass several targets to deploy the same code to several chains in sequence.
Each chain still needs its own Studio project.

```sh
bun run deploy -- \
  arc-testnet=your-arc-studio-slug \
  base-sepolia=your-base-studio-slug \
  --version v0.1.0
```

If one build or deployment fails, the script stops. Fix that target, then run
the command again.

## Add indexing later

Two things remain outside this repository's current scope:

- File data source templates for IPFS and Arweave `agentURI`/`feedbackURI`
  values, populating `AgentRegistrationFile` and `FeedbackDocumentFile`. Chain
  handlers already classify and store these URIs; only the parsed document
  trees are missing.
- The Validation Registry, once its interface settles (see the commented
  block in `subgraph.template.yaml` and the commented imports in
  `src/mapping.ts`).

Keep chain addresses in `chain.config.json` so every deployment still uses the
same template and command.
