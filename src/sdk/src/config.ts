// === network ===

import { NetworkName } from "@polymedia/suitcase-core";

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

export const AUCTION_ERRORS: Record<number, string> = {
    5000: "E_WRONG_NAME",
    5001: "E_WRONG_TIME",
    5002: "E_WRONG_ADMIN",
    5003: "E_WRONG_ADDRESS",
    5004: "E_WRONG_DURATION",
    5005: "E_WRONG_COIN_VALUE",
    5006: "E_WRONG_DESCRIPTION",
    5007: "E_WRONG_MINIMUM_BID",
    5008: "E_WRONG_MINIMUM_INCREASE",
    5009: "E_WRONG_EXTENSION_PERIOD",
    5010: "E_CANT_RECLAIM_WITH_BIDS",
    5011: "E_POINTLESS_PAY_ADDR_CHANGE",
    5012: "E_DUPLICATE_ITEM_ADDRESSES",
    5013: "E_ITEM_LENGTH_MISMATCH",
    5014: "E_NOT_ENOUGH_ITEMS",
    5015: "E_TOO_MANY_ITEMS",
    5016: "E_MISSING_ITEM",
    5017: "E_NO_BIDS",
    6000: "E_USER_ALREADY_EXISTS",
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
        packageId: "0xa01385b2fb623ffaf416dad3f1f59f5c470adb553d57fcba189dc71ccaa713b3",
        registryId: "0xe7a87d7f4a3325029ce06647915201e3af666e67ad7c44517f64d89b902526f2",
    },
    localnet: {
        packageId: "0x7667b4d760af8904ea5471e49a4039f8866f5ca40d66df550f5890f65d7f2b74",
        registryId: "0xe9fcda614718a66d183d4e5c26c2b36ebd7bd9a3f0391e89b102f4435949d998",
    },
};
