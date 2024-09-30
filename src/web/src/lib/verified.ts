import { NetworkName } from "@polymedia/suitcase-core";

export const VERIFIED_IDS: Record<NetworkName, string[]> = {
    mainnet: [
        "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0", // SuiNS
    ],
    testnet: [
        "0x22fa05f21b1ad71442491220bb9338f7b7095fe35000ef88d5400d28523bdd93", // SuiNS
        "0x1ec6d044034c319b295fb058d0ba7d949916330f0405c09a10bfabe2b52603e8", // Fractal
    ],
    devnet: [],
    localnet: [],
};
