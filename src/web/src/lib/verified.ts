import { NetworkName } from "@polymedia/suitcase-core";

/**
 * @property name - The collection name.
 * @property id - The ID of the package, or the struct type.
 */
type VerifiedId = {
    name: string;
    id: string;
}

export const isVerifiedItem = (network: NetworkName, itemType: string): VerifiedId | null => {
    const packageId = itemType.split("::")[0];
    return VERIFIED_IDS[network].find(v => v.id === packageId || v.id === itemType) || null;
}

export const VERIFIED_IDS: Record<NetworkName, VerifiedId[]> = {
    mainnet: [
        // manually added:
        {"name": "SuiNS subdomain", "id": "0x00c2f85e07181b90c140b15c5ce27d863f93c4d9159d2a4e7bdaeb40e286d6f5"},
        // from TradePort:
        {"name": "Fuddies", "id": "0xac176715abe5bcdaae627c5048958bbe320a8474f524674f3278e31af3c8b86b"},
        {"name": "Prime Machin", "id": "0x034c162f6b594cb5a1805264dd01ca5d80ce3eca6522e6ee37fd9ebfb9d3ddca::factory::PrimeMachin"},
        {"name": "SuiFrens: Bullsharks", "id": "0x8894fa02fc6f36cbc485ae9145d05f247a78e220814fb8419ab261bd81f08f32"},
        {"name": "SuiFrens: Capys", "id": "0xee496a0cc04d06a345982ba6697c90c619020de9e274408c7819f787ff66e1a1"},
        {"name": "Egg", "id": "0x484932c474bf09f002b82e4a57206a6658a0ca6dbdb15896808dcd1929c77820"},
        {"name": "DeSuiLabs", "id": "0x4edaf43ada89b42ba4dee9fbf74a4dee3eb01f3cfd311d4fb2c6946f87952e51"},
        {"name": "Gommies", "id": "0x1c3de8ab70e98fadd2c46b98bd617908c41ae0d13f11d6fec158153d0e127279"},
        {"name": "Kumo", "id": "0x57191e5e5c41166b90a4b7811ad3ec7963708aa537a8438c1761a5d33e2155fd::kumo::Kumo"},
        {"name": "DSL Legacy", "id": "0xff3923e6261d2f979bd5db60929ede5680b41b98d58a419281f1302058e38845"},
        {"name": "SuiNS", "id": "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0"},
        {"name": "Cosmocadia", "id": "0x4125c462e4dc35631e7b31dc0c443930bd96fbd24858d8e772ff5b225c55a792"},
        {"name": "Enforcer Machin", "id": "0x71ef69d02e77dff830c7de41db1452928c8ecd9040a541eef6729f139df83ffd"},
        {"name": "suis", "id": "0x2dcd525267727e9c583a847f0065ab6387d6b8d31b52a1f93f56b713b4ce15eb"},
        {"name": "Rootlet", "id": "0x8f74a7d632191e29956df3843404f22d27bd84d92cca1b1abde621d033098769::rootlet::Rootlet"},
        {"name": "Blubbers", "id": "0xefff615b773cb4b61ae40c87ed947e646c12fa8d9401c5de88ed9fdca58ea86d::collection::Blubber"},
        {"name": "Tails By Typus", "id": "0xbd147bc7f12f38f175d78947a61364e8e077b9b188b00e7094bc0c3623162196"},
        {"name": "Karrier One Early Adopter", "id": "0x12673174d35bae6675dfa29d1c7ccdecfd8b3e0b44fcfd3156d3a67b46cf3638"},
        {"name": "Skyward Soarer", "id": "0x9185af704124515bc588e71af96537a0e3a6d18aad56d7e0c2668cb1ddd5ca0d"},
        {"name": "Dungeon Move", "id": "0x625d518a3cc78899742d76cf785609cd707e15228d4284aa4fee5ca53caa9849"},
        {"name": "OWLS", "id": "0x12f9712cc5e63b74b400d93e0551c157290e96cd45744f9e7c50d3e3a159ca42"},
        {"name": "Unchained", "id": "0x51e1abc7dfe02e348a3778a642ef658dd5c016116ee2e8813c4e3a12f975d88e"},
        {"name": "Sui Punks", "id": "0x9414ec1700b5c391122cab0bb11781394098ec64403b6aa8b2e64bbef7e9e37b"},
        {"name": "Sacabam", "id": "0x7f481ffff2b72f3f1d9b70d5ad999d8b514a6281aa29aedbb6c537bd4b0d04ad"},
        {"name": "Pirate", "id": "0x6b5322e6f7f09e2469390b999ee8474e7440e4bd738f8917357842fca5cdb61b"},
        {"name": "Wizard Land", "id": "0x81163458f159e8d0061463d4a0690eeaeb58c2cd411d9e2f21d049af84a39cfe"},
        {"name": "Cosmocadia Desert Island", "id": "0x81d7c71f84b6bcf810b67cea876b3af2952455ab9fb562a1e501353da77b0cfa"},
        {"name": "Panzerdog", "id": "0x41c06da395bc3f0ee621a66082f8f30f376da41a2db7bcce7c087444de200e41::panzerdog"},
        {"name": "Karrier Pigeons", "id": "0x6f254f230a24cb74433f0bd0a2da53e2e3fe4ef85a6f89095d987ce7da257e25"},
        {"name": "Wave Original Gangster", "id": "0xbe9d578ed9e0b7dbd79555fe02b8058be262f4c534adbf816cd6c4606df9ead9"},
        {"name": "Sips", "id": "0x975d2f98f59df9825b98a8c819df4c46a8a0ae7cf44424111bf59494ea6e7d7d"},
        {"name": "Misfit", "id": "0x4560201f5ecd809e10466b4b45dd76c577c19f3d9ffae63f64eb8cdc93a501f"},
        {"name": "GOATs Of Sui", "id": "0xc4fc5b341858ac6fff4859d8105e345b195847cd230e8538d61a2f319ae8093c"},
        {"name": "Suishi", "id": "0xf1681f601a1c021a0b4c8c8859d50917308fcbebfd19364c4e856ac670bb8496"},
        {"name": "SuiNS Day", "id": "0xbf1431324a4a6eadd70e0ac6c5a16f36492f255ed4d011978b2cf34ad738efe6"},
        {"name": "Stork", "id": "0x5f1fa51a6d5c52df7dfe0ff7efaab7cc769d81e51cf208a424e455575aa1ed7a"},
        {"name": "Suilend Capsule", "id": "0x8a7e85138643db888096f2db04766d549ca496583e41c3a683c6e1539a64ac"},
        {"name": "Degen Rabbit", "id": "0x93195daadbc4f26c0c498f4ceac92593682d2325ce3a0f5ba9f2db3b6a9733dd"},
        {"name": "Unbound", "id": "0x34f9e32641795c57d936b3e387b9c7c941fd99b5a8a90e86b61e966e9da1d1f0"},
        {"name": "SuiDuckz", "id": "0xbb35722bdffea8d6b19cbb329673d1ae77f17ee83e1cab23615e9c0c55dc4dfa"},
        {"name": "Puke", "id": "0xd165ad22632810162677734f8d09f48194098dbbcdcfc1435bbfeefa5af77166"},
        {"name": "Present", "id": "0x58f6df360e1d410fc23a66313bd460171011c093d4b1c907c74fd329ed4ce28c"},
        {"name": "Neon Nibblers Nexus", "id": "0x95bde20afc7cc60458d8360c87d4ed1f136dd0fee64828bb7b613aea2d98e9ff"},
        {"name": "Embryo", "id": "0xe27dcd994b530bd6a44f72bccdf287904247de243b56c0e2f71c768da56deb3c"},
        {"name": "Anima Genesis Avatars", "id": "0x75cab45b9cba2d0b06a91d1f5fa51a4569da07374cf42c1bd2802846a61efe33::avatar::Avatar"},
        {"name": "Pugwif SUINS pfp", "id": "0x7f069a21ea16d256c7a4adc22e61e26e86c25554bbd7dd96ae96c22e9eb8fc85"},
        {"name": "Project Eluüne: Aurahma", "id": "0x3f16de9a93d10da2bfc879b042d0cac6747fec7de0acdf86daf6298512ce50b9"},
        {"name": "Sui Generis S1", "id": "0x5cf6401224b471a2489e0b13a0a23363378e89a0f14b6c58ffe9f71d1e36bc8"},
        {"name": "Galaxy 25", "id": "0x9432fae3ac1a6ee363f50e9aa3bdf335d1d4e771186fc8ddb8955c85439c1382"},
        {"name": "Ape Sui Society", "id": "0x9856a56bdb1071c3f8f8c19c5108b73ac90c9802a317254a16ff07c02777d6e"},
        {"name": "S Card", "id": "0xe7e651e4974fe367aa2837712d68081efb299c470242a15e2b9c26ea326159ec::card::SudoCard"},
        {"name": "Evos", "id": "0x169664f0f62bec3d59bb621d84df69927b3377a1f32ff16c862d28c158480065"},
        {"name": "NOVAGEN", "id": "0xf417417b1914266b634b3dc90050be9f28fb755e9d29f36d1892012e0ad6f816"},
        {"name": "BuckYou Fortune Bag", "id": "0xd441d82fa791d7e7fc89eb2a40b0714bd9a6a1aaf0c897d702802d30109c1f7b::fortune_bag"},
        {"name": "Bruce Lee", "id": "0xdcd468eeb80f8e69101621fa66e1aebc36c45235462a7b22d4ba6746606c7bb4"},
        {"name": "Anima Genesis Cosmetics", "id": "0x75cab45b9cba2d0b06a91d1f5fa51a4569da07374cf42c1bd2802846a61efe33::cosmetic::Cosmetic"},
        {"name": "Sub50K", "id": "0x9041aa11cd874ee87fa6f1c89ed9571c17c587cc64aafed0ddc12e2d2cd6a8c2::collection::Sub50K"},
        {"name": "Paws NFT", "id": "0xcd714a5ffde199ef5b3bf7e7db3bfe4b9e7bdbb5039d65b515823f965e3596bf"},
        {"name": "Otter Labs", "id": "0x5f76f3c1cd9b469a16055202b6f15dc71e7ac55fbb209bca8782c6ae375ed62b"},
        {"name": "Pandorian", "id": "0x1887ccc981a41566178286303f52a423a4e72da0d04386a922e26e20880e1641"},
        {"name": "Suirfboard", "id": "0xf850e035318c6eff44e43cd9978b4b15e5156d746d25b648f63ebbc44ef0d461"},
        {"name": "puppybears", "id": "0x7d44ddf461ff0ddac303e66c3d9730b065d917c457301efcfb8fe0d29a514cd6"},
        {"name": "AIFRENS Footie Legends", "id": "0x17c1d7520b731e59c665962aba86f84827f8d6812f839d126d3426caa29777cc"},
        {"name": "Tropolis Club", "id": "0xa610e75f1f514a4d0c9d4034749576f1f84799e22e85e7326a7cbe175e81b428"},
        {"name": "Pebble City Luck Accessory", "id": "0x8a711e344fdfcfacd9d4f34683e75dd653d44dab9f2a4744196e6df3291141a"},
        {"name": "Anima Labs Whitelist Ticket", "id": "0x75cab45b9cba2d0b06a91d1f5fa51a4569da07374cf42c1bd2802846a61efe33::genesis_drop::GenesisPass"},
        {"name": "Occult Multi", "id": "0x727d9fe5194261aa6429f577d0df3f12cfdb3bb0512bf9500a197d7b2d40e29e"},
        {"name": "Sub1K", "id": "0x9041aa11cd874ee87fa6f1c89ed9571c17c587cc64aafed0ddc12e2d2cd6a8c2::collection::Sub1K"},
        {"name": "Boho", "id": "0x31363086e130d0495bd41284c04d1b4700c08b67e448f068b9cab483a2f682f3"},
        {"name": "Naga Basuki", "id": "0xd36b6a8a5594028b0ec705e44e9d092fdad3c8fd532152b26708cebb95661307"},
        {"name": "Sea Umans", "id": "0x4dea41637502f0668e651e676307fae5b0a0affdd95c56cc6e8dfce123db8d12"},
        {"name": "AIFRENS Footie SuperStar", "id": "0x414abb429e44ddff03fe84d407ea3985c93fe55bd3ed79a8e2e57f50daf2e21c"},
        {"name": "Tank", "id": "0x41c06da395bc3f0ee621a66082f8f30f376da41a2db7bcce7c087444de200e41::panzertanks"},
        {"name": "Simba The Lonely Lion", "id": "0xd8c7cd7446834564fc981b9e15a810326d3a6dd7fefe888e19d25591813400ae"},
        {"name": "Anima Genesis Weapons", "id": "0x75cab45b9cba2d0b06a91d1f5fa51a4569da07374cf42c1bd2802846a61efe33::weapon::Weapon"},
        {"name": "SuiDuckz Eggs NFT", "id": "0xd08551279cae4921644eaea04f21e7bd06b0a35752ebce99caced6b4e95c9693"},
        {"name": "Tusktardio", "id": "0x619587f0950015e4de2a0795fd86e323504e514b674f3b167c9ffc4133a0d770"},
        {"name": "Fusion Of The Gods", "id": "0xf74aa26054e5db492f93d88bce836466a799b70eae200bc254b5e3c9ed0cea8b"},
        {"name": "Sub10K", "id": "0x9041aa11cd874ee87fa6f1c89ed9571c17c587cc64aafed0ddc12e2d2cd6a8c2::collection::Sub10K"},
        {"name": "Suiark", "id": "0xda9cfdf2a4a1217b000434125cc692900c35a38aae2dac4a69318fd55880a234"},
        {"name": "SLP Lootbox", "id": "0xd2e44dc1311833ddb0427f2141e2935720cf5454cf0ef39141fc80c19e1e6caa"},
        {"name": "Sub100K", "id": "0x9041aa11cd874ee87fa6f1c89ed9571c17c587cc64aafed0ddc12e2d2cd6a8c2::collection::Sub100K"},
        {"name": "Blubbers Whitelist Ticket", "id": "0xefff615b773cb4b61ae40c87ed947e646c12fa8d9401c5de88ed9fdca58ea86d::mint::BlubWhitelistTicket"},
        {"name": "Tracks>", "id": "0x41c06da395bc3f0ee621a66082f8f30f376da41a2db7bcce7c087444de200e41::panzertanks_parts"},
        {"name": "BuckYou Red Envelope", "id": "0xd441d82fa791d7e7fc89eb2a40b0714bd9a6a1aaf0c897d702802d30109c1f7b::red_envelope"},
        {"name": "Dog Sui Meme OG", "id": "0xfa91dbd069c9077bad1a4fe2c2468ff4fd614fd30f8c984b9ecf100c971254e9"},
        {"name": "Suiversary", "id": "0xdb9f34b220e76e333553dc4c4bc6f3110d5c103b60316562eeab34b1fa902349"},
        {"name": "Plum room", "id": "0xb62a97ba44711af24f9d3e629c5c71888d93be325e74916815767712ab03c177"},
        {"name": "Cyberpill", "id": "0x41c06da395bc3f0ee621a66082f8f30f376da41a2db7bcce7c087444de200e41::cyberpills"},
        {"name": "PanzerMerch", "id": "0x41c06da395bc3f0ee621a66082f8f30f376da41a2db7bcce7c087444de200e41::panzermerch"},
        {"name": "Rootlets Mint Ticket", "id": "0x8f74a7d632191e29956df3843404f22d27bd84d92cca1b1abde621d033098769::rootlet::Pass"},
        {"name": "Sui Generis HC", "id": "0x1f015c1a000631f2c0afd0258b299c63ffb8e5452e0c0f9be8fc28d2e20ad9b4"},
        {"name": "Colour>", "id": "0x41c06da395bc3f0ee621a66082f8f30f376da41a2db7bcce7c087444de200e41::panzerdog_equipment"},
        {"name": "Dare Dragon Egg", "id": "0x34db0e1c931a35abf2cf30d28b4dbf97ea4a98e199a8bc228d1e095bfdc688da"},
        {"name": "COV.ENT", "id": "0xa03833811a308d67194ad4ff7e6234437473a90a26aa440181611da28345cfc5"},
    ],
    testnet: [
        {"name": "SuiNS", "id": "0x22fa05f21b1ad71442491220bb9338f7b7095fe35000ef88d5400d28523bdd93"},
        {"name": "FRACTAL", "id": "0x1ec6d044034c319b295fb058d0ba7d949916330f0405c09a10bfabe2b52603e8"},
    ],
    devnet: [],
    localnet: [],
};
