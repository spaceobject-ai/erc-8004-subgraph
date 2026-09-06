import { defineConfig } from "vite-plus"

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
    printWidth: 80,
    semi: false,
  },
  lint: {
    options: {
      typeAware: false,
      typeCheck: false,
    },
  },
})
