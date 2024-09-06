// === network ===

export type NetworkName =  "mainnet" | "testnet" | "devnet" | "localnet";

export type NetworkConfig = {
    packageId: string;
    registryId: string;
};

// === auction package ===

// Copied from sui/sources/auction.move to avoid RPC calls
export const AUCTION_CONFIG = {
    MAX_ITEMS: 50,

    MAX_BEGIN_DELAY_MS: 100 * 24 * 60 * 60 * 1000,

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

export const AUCTION_ERRORS = {
    E_WRONG_NAME: 5000,
    E_WRONG_TIME: 5001,
    E_WRONG_ADMIN: 5002,
    E_WRONG_ADDRESS: 5003,
    E_WRONG_DURATION: 5004,
    E_WRONG_COIN_VALUE: 5005,
    E_WRONG_DESCRIPTION: 5006,
    E_WRONG_MINIMUM_BID: 5007,
    E_WRONG_MINIMUM_INCREASE: 5008,
    E_WRONG_EXTENSION_PERIOD: 5009,
    E_CANT_RECLAIM_WITH_BIDS: 5010,
    E_ITEM_LENGTH_MISMATCH: 5011,
    E_NOT_ENOUGH_ITEMS: 5012,
    E_TOO_MANY_ITEMS: 5013,
    E_MISSING_ITEM: 5014,
    E_DUPLICATE_ITEM_ADDRESSES: 5015,
    E_USER_ALREADY_EXISTS: 6000,
};

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
        packageId: "0x7ef56803d241c9fca8e23e1aed230f2ef42de5b22387cc21bf53d7bd2824c370",
        registryId: "0x7edea650b61a21c4bf4be3671321cf6af709ff84980b075702103622341cfac8",
    },
    localnet: {
        packageId: "0x7667b4d760af8904ea5471e49a4039f8866f5ca40d66df550f5890f65d7f2b74",
        registryId: "0xe9fcda614718a66d183d4e5c26c2b36ebd7bd9a3f0391e89b102f4435949d998",
    },
};
