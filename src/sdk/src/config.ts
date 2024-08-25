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
        packageId: "0xbe5c92621bcf8ec7b3519fc18dbdb01e9cc3f46d8bafe80b8b429168afde0289",
        registryId: "0x992cf652f6a972150eeb04de6e7528096c2f2dced484b22f251206af14b6e0cf",
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
