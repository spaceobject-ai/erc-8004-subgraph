import chains from "../chain.config.json";

const DEFAULT_CHAIN = "sepolia";

const options = parseArgs(Bun.argv.slice(2));

for (const target of options.targets) {
  const chain = requireChain(target.chain);
  const manifest = await generateManifest(target.chain, chain);

  console.log(`\nBuilding ${target.chain} (${chain.chainId})`);
  await run(["bunx", "graph", "codegen", manifest]);
  await run(["bunx", "graph", "build", manifest]);

  if (options.buildOnly) continue;

  console.log(`Deploying ${target.chain} to ${target.slug}`);
  await run([
    "bunx",
    "graph",
    "deploy",
    target.slug,
    manifest,
    "--node",
    "https://api.studio.thegraph.com/deploy/",
    "--version-label",
    options.version,
  ]);
}

function parseArgs(args: string[]) {
  const versionIndex = args.indexOf("--version");
  const version = versionIndex === -1 ? "dev" : args[versionIndex + 1];
  const buildOnly = args.includes("--build-only");

  if (!version) fail("Pass a value after --version.");

  const targets = args
    .filter((argument, index) => {
      if (argument === "--build-only" || argument === "--version") return false;
      return versionIndex === -1 || index !== versionIndex + 1;
    })
    .map((argument) => {
      const [chain, slug, extra] = argument.split("=");

      if (!chain || extra !== undefined) {
        fail(`Invalid target "${argument}". Use chain=studio-slug.`);
      }

      if (!buildOnly && !slug) {
        fail(`Missing Studio slug for "${chain}". Use ${chain}=studio-slug.`);
      }

      return { chain, slug: slug ?? "" };
    });

  if (targets.length === 0 && !buildOnly) fail("Pass at least one chain=studio-slug target.");

  return {
    buildOnly,
    // A bare --build-only run builds the default chain so `bun run build` and
    // the matchstick manifest path stay in sync.
    targets: targets.length === 0 ? [{ chain: DEFAULT_CHAIN, slug: "" }] : targets,
    version,
  };
}

function requireChain(name: string) {
  if (!(name in chains)) {
    fail(`Unknown chain "${name}". Available chains: ${Object.keys(chains).join(", ")}.`);
  }

  return chains[name as keyof typeof chains];
}

async function generateManifest(name: string, chain: (typeof chains)[keyof typeof chains]) {
  const replacements = {
    network: chain.network,
    chainId: chain.chainId,
    identityAddress: chain.contracts.identity.address,
    identityStartBlock: chain.contracts.identity.startBlock,
    reputationAddress: chain.contracts.reputation.address,
    reputationStartBlock: chain.contracts.reputation.startBlock,
  };
  const template = await Bun.file("subgraph.template.yaml").text();
  const manifest = Object.entries(replacements).reduce(
    (contents, [key, value]) => contents.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
  const output = `.generated/${name}/subgraph.yaml`;

  if (manifest.split("\n").some((line) => !line.trimStart().startsWith("#") && line.includes("{{")))
    fail("The manifest has an unknown template value.");

  await Bun.write(output, manifest);
  return output;
}

async function run(command: string[]) {
  const subprocess = Bun.spawn(command, {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  if ((await subprocess.exited) !== 0) process.exit(1);
}

function fail(message: string): never {
  console.error(`
${message}

Build the default chain (${DEFAULT_CHAIN}):
  bun run deploy -- --build-only

Build another chain:
  bun run deploy -- base --build-only

Deploy one chain:
  bun run deploy -- sepolia=studio-slug --version v0.1.0

Deploy several chains:
  bun run deploy -- mainnet=mainnet-slug base=base-slug --version v0.1.0

Available chains: ${Object.keys(chains).join(", ")}.
`);
  process.exit(1);
}
