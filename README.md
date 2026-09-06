# ERC-8004 subgraph

This repository is a small starting point for an ERC-8004 subgraph. Arc Testnet
is the default target. Base Sepolia is included to show how the same manifest
can be built and deployed for more than one chain.

The event handlers are empty on purpose. Deployments made from this version
will listen for registry events but will not save data.

## What is here

```text
abis/                    Event-only contract ABIs
src/mapping.ts           Empty event handlers
scripts/deploy.ts        Manifest generation, build, and deployment
config.ts                Chain addresses and start blocks
schema.graphql            Placeholder schema
subgraph.template.yaml   Shared manifest template
```

There is no `utils` directory. Add one when the mappings need shared code.

## Install

Install [Bun](https://bun.sh/), then install the project packages.

```sh
bun install
```

## Configure a chain

Chain settings live in `config.ts`. Each entry needs:

* The Graph network identifier
* The numeric chain ID
* The address and start block for all three ERC-8004 registries

Arc Testnet is already configured with The Graph identifier `arc-testnet` and
chain ID `5042002`.

To add a chain, copy an existing entry and change its key and values.

```ts
"another-testnet": {
  network: "the-graph-network-id",
  chainId: 123,
  contracts: {
    identity: {
      address: "0x...",
      startBlock: 100,
    },
    reputation: {
      address: "0x...",
      startBlock: 100,
    },
    validation: {
      address: "0x...",
      startBlock: 100,
    },
  },
},
```

Use the identifier listed on The Graph's
[supported networks page](https://thegraph.com/docs/en/supported-networks/).
Set each start block to the contract's deployment block. Starting at block zero
works, but wastes indexing time.

## Build Arc Testnet

This command generates `.generated/arc-testnet/subgraph.yaml`, runs codegen,
and builds the mapping. It does not deploy anything.

```sh
bun run check
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

Replace `IndexingPlaceholder` in `schema.graphql` with the entities the
application will query. Then fill in the handlers in `src/mapping.ts`. Keep
chain addresses in `config.ts` so every deployment still uses the same
template and command.
