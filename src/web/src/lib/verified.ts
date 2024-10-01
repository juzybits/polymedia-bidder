import { NetworkName } from "@polymedia/suitcase-core";

export const VERIFIED_IDS: Record<NetworkName, string[]> = {
    mainnet: [
        /* blubbers */ "0xefff615b773cb4b61ae40c87ed947e646c12fa8d9401c5de88ed9fdca58ea86d",
        /* cosmocadia */ "0x4125c462e4dc35631e7b31dc0c443930bd96fbd24858d8e772ff5b225c55a792",
        /* desuilabs */ "0x4edaf43ada89b42ba4dee9fbf74a4dee3eb01f3cfd311d4fb2c6946f87952e51",
        /* desuilabs-legacy */ "0xff3923e6261d2f979bd5db60929ede5680b41b98d58a419281f1302058e38845",
        /* dungeon-move */ "0x625d518a3cc78899742d76cf785609cd707e15228d4284aa4fee5ca53caa9849",
        /* egg */ "0x484932c474bf09f002b82e4a57206a6658a0ca6dbdb15896808dcd1929c77820",
        /* enforcer-machin */ "0x71ef69d02e77dff830c7de41db1452928c8ecd9040a541eef6729f139df83ffd",
        /* fuddies */ "0xac176715abe5bcdaae627c5048958bbe320a8474f524674f3278e31af3c8b86b",
        /* gommies */ "0x1c3de8ab70e98fadd2c46b98bd617908c41ae0d13f11d6fec158153d0e127279",
        /* karrier-one-early-adopter */ "0x12673174d35bae6675dfa29d1c7ccdecfd8b3e0b44fcfd3156d3a67b46cf3638",
        /* karrier-pigeons */ "0x6f254f230a24cb74433f0bd0a2da53e2e3fe4ef85a6f89095d987ce7da257e25",
        /* kumo */ "0x57191e5e5c41166b90a4b7811ad3ec7963708aa537a8438c1761a5d33e2155fd",
        /* panzerdogs */ "0x41c06da395bc3f0ee621a66082f8f30f376da41a2db7bcce7c087444de200e41",
        /* prime-machin */ "0x034c162f6b594cb5a1805264dd01ca5d80ce3eca6522e6ee37fd9ebfb9d3ddca",
        /* rootlets */ "0x8f74a7d632191e29956df3843404f22d27bd84d92cca1b1abde621d033098769",
        /* suifrens-capys */ "0xee496a0cc04d06a345982ba6697c90c619020de9e274408c7819f787ff66e1a1",
        /* suilend-capsule */ "0x8a7e85138643db888096f2db04766d549ca496583e41c3a683c6e1539a64ac",
        /* suins */ "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0",
        /* tails-by-typus */ "0xbd147bc7f12f38f175d78947a61364e8e077b9b188b00e7094bc0c3623162196",
        /* uc-esports */ "0x51e1abc7dfe02e348a3778a642ef658dd5c016116ee2e8813c4e3a12f975d88e",

    ],
    testnet: [
        "0x22fa05f21b1ad71442491220bb9338f7b7095fe35000ef88d5400d28523bdd93", // SuiNS
        "0x1ec6d044034c319b295fb058d0ba7d949916330f0405c09a10bfabe2b52603e8", // Fractal
    ],
    devnet: [],
    localnet: [],
};
