# ERC-8004 subgraph

Indexes the ERC-8004 Identity and Reputation registries. Ethereum Sepolia is
the default chain. `chain.config.json` also ships Ethereum, Base, Base
Sepolia, Arc, and Arc Testnet as examples you can copy.

The Validation Registry ABI and addresses are in the repo but not wired into
the manifest. Its interface is still changing.

## Install

Install the [Vite+ CLI](https://viteplus.dev/guide/). It installs the pinned
Bun version and uses it as this project's package manager.

```sh
curl -fsSL https://vite.plus | bash
vp install
```

This also sets up a pre-commit hook that formats and lints staged files with
Oxfmt and Oxlint. If it does not run in your clone, run `vp hooks status`.

## Deploy to a chain

1. Create a Subgraph Studio project for the chain you want. Copy its slug
   from the Studio page.
2. Authenticate once with your deploy key.

   ```sh
   bunx graph auth YOUR_DEPLOY_KEY
   ```

   Keep the key in your password manager or shell environment. Do not commit
   it.
3. Run the deploy script with `chain=slug`.

   ```sh
   bun run deploy -- sepolia=your-studio-slug --version v0.1.0
   ```

   This generates the chain's manifest, runs codegen, builds it, and pushes
   it to Studio. Version defaults to `dev` if you skip `--version`.

Deploy to several chains at once. Each still needs its own Studio project.

```sh
bun run deploy -- \
  mainnet=your-mainnet-slug \
  base=your-base-slug \
  --version v0.1.0
```

If one build or deploy fails, the script stops there. Fix that target and
run the command again.

To just build a manifest without deploying, drop the slug and add
`--build-only`.

```sh
bun run deploy -- base --build-only
```

Running `vp run build` does the same thing for Sepolia, the default chain.

## Add a new chain

Open `chain.config.json` and add an entry. Copy an existing one and change
the values.

```json
{
  "your-chain": {
    "network": "the-graph-network-id",
    "chainId": 123,
    "contracts": {
      "identity": { "address": "0x...", "startBlock": 100 },
      "reputation": { "address": "0x...", "startBlock": 100 },
      "validation": { "address": "0x...", "startBlock": 100 }
    }
  }
}
```

- `network` is the id from The Graph's
  [supported networks page](https://thegraph.com/docs/en/supported-networks/).
- `startBlock` should be the block where the contract was deployed. Zero
  works, but wastes time indexing history you don't need.
- `validation` is optional. The deploy script ignores it while that data
  source stays disabled.

Build it to check the manifest before deploying anything.

```sh
bun run deploy -- your-chain --build-only
```

## Testing

```sh
vp run test
```

Utils and entity helpers have full Matchstick coverage. Handler tests only
cover the early-return guard clauses, an event for an agent that was never
registered, because saving certain entities crashes Matchstick's test runner
([LimeChain/matchstick#433](https://github.com/LimeChain/matchstick/issues/433)).
The rest of the handler logic gets checked by `graph build` and by the utils
tests it depends on.

## Quality checks

```sh
vp check
```

Formats and lints staged files. Before opening a pull request, run
everything:

```sh
vp run ready
```

This checks, typechecks `scripts/`, and builds the default Sepolia subgraph.
`graph build` is the real compiler check for the AssemblyScript mappings in
`src/`.

## Notes on the schema and handler logic

These are working notes, not a spec. Read `schema.graphql` and `src/` for
what the code actually does.

- `Agent` and `Feedback` hold current state and get updated in place.
  Everything else, registrations, feedback documents, services, responses,
  gets written once and stays that way. Reverse lookups use `@derivedFrom`
  instead of arrays, so parent entities don't grow unbounded lists.
- `AgentService.kind` matches a known service name or falls back to
  `CUSTOM`. Each capability, tool, resource, prompt, skill, or domain gets
  its own `AgentServiceFeature` row so it can be filtered directly. Fields
  with no matching schema column land in `AgentServiceAttribute`.
- `FeedbackDocumentFeature` covers A2A skills, OASF skills, OASF domains,
  and MCP values. It reads both the nested ERC-8004 shape and the flat
  fields from the 8004scan v2 profile.
- Chain handlers decode `data:` URIs straight into `AgentRegistration` and
  `FeedbackDocument`. IPFS and Arweave links get stored and classified, but
  nothing parses their content yet. That needs file data source templates,
  which aren't set up.
- Plain HTTP and HTTPS URIs never get parsed. Public Graph Network indexers
  can't fetch arbitrary URLs in a deterministic way.
- A few details in the community profiles were ambiguous, so here is the
  current behavior: `AgentService.capabilitiesInferred` is always `false`
  (nothing gets guessed), `contentHash` fields are `keccak256` of the
  decoded JSON text, and unknown keys become `AgentServiceAttribute` rows
  instead of getting dropped.

If you're relying on any of this, check the code first. These notes drift.
