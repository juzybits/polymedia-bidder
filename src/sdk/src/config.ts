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
