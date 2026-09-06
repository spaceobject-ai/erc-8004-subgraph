# ERC-8004 subgraph

This repository is a starting point for indexing the stable ERC-8004 Identity
and Reputation registries. Arc Testnet is the default target. Base Sepolia is
included to show how the same manifest can be built and deployed for more than
one chain. The Validation Registry ABI, addresses, and commented mapping setup
remain in the repository, but builds do not index it while its interface is
unstable.

The event handlers are empty on purpose. Deployments made from this version
will listen for registry events but will not save data.

## What is here

```text
abis/                    Event-only contract ABIs
src/mapping.ts           Empty event handlers
scripts/deploy.ts        Manifest generation, build, and deployment
chain.config.json        Chain addresses and start blocks
schema.graphql           Identity and reputation query model
subgraph.template.yaml   Shared manifest template
```

There is no `utils` directory. Add one when the mappings need shared code.

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

The Graph does not support schema-less entity fields. Dynamic data sources can
discover files or contracts at runtime, but `schema.graphql` must declare every
stored field. The Graph generates filters for scalar fields and has no custom
database-index directive. The schema stores commonly filtered values in their
own fields and adds ranked text search for profiles, services, and feedback
documents.

Content-addressed IPFS and Arweave documents should use file data source
templates. Parse `data:` URIs in the chain event handler. Public Graph Network
indexers cannot deterministically fetch arbitrary HTTP or HTTPS documents, so
those records retain the URI but will not have parsed document entities.

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

Fill in the handlers in `src/mapping.ts`, including file data source templates
for content-addressed agent and feedback documents. Keep chain addresses in
`chain.config.json` so every deployment still uses the same template and
command.
