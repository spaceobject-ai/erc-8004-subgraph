export const chains = {
  "arc-testnet": {
    network: "arc-testnet",
    chainId: 5_042_002,
    contracts: {
      identity: {
        address: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
        startBlock: 29_241_340,
      },
      reputation: {
        address: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
        startBlock: 29_241_344,
      },
      validation: {
        address: "0x8004Cb1BF31DAf7788923b405b754f57acEB4272",
        startBlock: 29_241_349,
      },
    },
  },
  "base-sepolia": {
    network: "base-sepolia",
    chainId: 84_532,
    contracts: {
      identity: {
        address: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
        startBlock: 36_304_145,
      },
      reputation: {
        address: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
        startBlock: 36_304_146,
      },
      validation: {
        address: "0x8004Cb1BF31DAf7788923b405b754f57acEB4272",
        startBlock: 36_304_147,
      },
    },
  },
} as const
