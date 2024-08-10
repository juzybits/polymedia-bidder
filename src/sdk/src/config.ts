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
        packageId: "",
    },
    localnet: {
        packageId: "",
    },
};
