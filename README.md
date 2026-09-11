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

- Entity types that are mutable: `IdentityRegistry`, `ReputationRegistry`,
  `Account`, `Agent`, `AgentMetadata`, `OperatorApproval`, and `Feedback`.
  Everything else is immutable, including the revision and change logs,
  registrations, feedback documents, services, and responses. Reverse lookups
  use `@derivedFrom` instead of arrays, so no parent entity grows an unbounded
  list.
- `IdentityRegistry`, `ReputationRegistry`, `Agent`, and `Feedback` IDs are
  UTF-8 strings that start with the chain ID (`"<chainId>:<registry>"` for the
  registries, `"<chainId>:<registry>:<agentId>"` for `Agent`), because the
  registries are deployed at the same addresses on several chains.
  `AgentRegistration` and `FeedbackDocument` IDs are `keccak256` of the parent
  entity ID plus the source URI, so each URI revision keeps its own immutable
  document.
- `AgentService.kind` lowercases the service name and matches it against web,
  a2a, mcp, oasf, ens, did, email, and agentwallet. Anything else is `CUSTOM`.
  The `capabilities`, `mcpTools`, `mcpPrompts`, `mcpResources`, `a2aSkills`,
  `skills`, and `domains` arrays become `AgentServiceFeature` rows, so you can
  filter on one exact tool or skill. Every other key in the service object
  becomes an `AgentServiceAttribute` row.
- Chain handlers decode `data:` URIs into `AgentRegistration` (from
  `Registered` and `URIUpdated`) and `FeedbackDocument` (from `NewFeedback`).
  `responseURI` is stored and classified but never parsed. IPFS and Arweave
  links get the same treatment. The `*File` entity types in `schema.graphql`
  exist for file data source templates that the manifest doesn't declare yet,
  so nothing writes them.
- Plain HTTP and HTTPS URIs never get parsed. Public Graph Network indexers
  can't fetch arbitrary URLs in a deterministic way.
- Two more details, both from ambiguities in the community profiles:
  `AgentService.capabilitiesInferred` is always `false` because the parser
  never guesses, and `contentHash` is `keccak256` of the decoded `data:`
  payload text, not of the onchain URI.

If you're relying on any of this, check the code first. These notes drift.
