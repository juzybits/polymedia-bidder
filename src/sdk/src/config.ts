// === network ===

export type NetworkName =  "mainnet" | "testnet" | "devnet" | "localnet";

export type NetworkConfig = {
    packageId: string;
};

// === auction package ===

export const AUCTION_IDS: Record<NetworkName, NetworkConfig> = {
    mainnet: {
        packageId: "",
    },
    testnet: {
        packageId: "",
    },
    devnet: {
        packageId: "0xe5c53617f9e2e64b665c936ab54d2534a48289dd73bdecc9d11e04343cd7bf2b",
    },
    localnet: {
        packageId: "",
    },
};

// Copied from sui/sources/auction.move to avoid RPC calls

export const MAX_ITEMS = 50;

export const MAX_BEGIN_TIME_MS = 100 * 24 * 60 * 60 * 1000;

export const MIN_DURATION_MS = 10 * 1000;
export const MAX_DURATION_MS = 100 * 24 * 60 * 60 * 1000;

export const MIN_MINIMUM_INCREASE_BPS = 10;
export const MAX_MINIMUM_INCREASE_BPS = 1000 * 100;

export const MIN_EXTENSION_PERIOD_MS = 1000;
export const MAX_EXTENSION_PERIOD_MS = 10 * 24 * 60 * 60 * 1000;

export const MIN_NAME_LENGTH = 3;
export const MAX_NAME_LENGTH = 100;

export const MIN_DESCRIPTION_LENGTH = 0;
export const MAX_DESCRIPTION_LENGTH = 2000;
