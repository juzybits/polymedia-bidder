// === network ===

export type NetworkName =  "mainnet" | "testnet" | "devnet" | "localnet";

export type NetworkConfig = {
    packageId: string;
    registryId: string;
};

// === auction package ===

export const AUCTION_IDS: Record<NetworkName, NetworkConfig> = {
    mainnet: {
        packageId: "",
        registryId: "",
    },
    testnet: {
        packageId: "",
        registryId: "",
    },
    devnet: {
        packageId: "0x57013a9829a440e9db875e13d22cbf9f7fcebd7720fa47254b3d7395f3f8d04b",
        registryId: "",
    },
    localnet: {
        packageId: "0x7667b4d760af8904ea5471e49a4039f8866f5ca40d66df550f5890f65d7f2b74",
        registryId: "0xe9fcda614718a66d183d4e5c26c2b36ebd7bd9a3f0391e89b102f4435949d998",
    },
};

// Copied from sui/sources/auction.move to avoid RPC calls

export const AUCTION_CONFIG = {
    MAX_ITEMS: 50,

    MAX_BEGIN_TIME_MS: 100 * 24 * 60 * 60 * 1000,

    MIN_DURATION_MS: 10 * 1000,
    MAX_DURATION_MS: 100 * 24 * 60 * 60 * 1000,

    MIN_MINIMUM_INCREASE_BPS: 10,
    MAX_MINIMUM_INCREASE_BPS: 1000 * 100,

    MIN_EXTENSION_PERIOD_MS: 1000,
    MAX_EXTENSION_PERIOD_MS: 10 * 24 * 60 * 60 * 1000,

    MIN_NAME_LENGTH: 3,
    MAX_NAME_LENGTH: 100,

    MIN_DESCRIPTION_LENGTH: 0,
    MAX_DESCRIPTION_LENGTH: 2000,
};
