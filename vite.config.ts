import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: [
      ".agents/skills/**",
      ".claude/skills/**",
      "AGENTS.md",
      "build/**",
      "generated/**",
      ".generated/**",
      "subgraph.template.yaml",
    ],
  },
  lint: {
    options: {
      typeAware: false,
      typeCheck: false,
    },
  },
});
