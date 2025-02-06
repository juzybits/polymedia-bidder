import { getNormalizedRuleType, KioskClient, KioskOwnerCap, KioskTransaction } from "@mysten/kiosk";
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions";

import { NetworkName } from "@polymedia/suitcase-core";

// === types ===

export type KioskKind = "regular" | "personal" | "origin_byte";

export type OwnedKioskItem = {
    cap: KioskOwnerCap;
    kiosk: {
        id: string;
        itemCount: number;
        allowExtensions: boolean;
    };
    item: {
        isLocked: boolean;
        isListed: boolean;
    };
};

export type { KioskClientOptions } from "@mysten/kiosk";
export { Network as KioskNetwork } from "@mysten/kiosk";

// === functions ===

/**
 * Simulate the behavior of `KioskTransaction.purchaseAndResolve()` to check
 * if all TransferPolicy rules can be resolved.
 */
export async function hasAllRuleResolvers(
    kioskClient: KioskClient,
    itemType: string,
): Promise<{ canResolve: boolean; missingRules: string[] }>
{
    const policies = await kioskClient.getTransferPolicies({ type: itemType });

    if (policies.length === 0) {
        return { canResolve: false, missingRules: [] };
    }

    const policy = policies[0]; // only check the first policy, like purchaseAndResolve()
    const missingRules: string[] = [];

    for (const rule of policy.rules) {
        const ruleDefinition = kioskClient.rules.find(
            (x) => getNormalizedRuleType(x.rule) === getNormalizedRuleType(rule)
        );

        if (!ruleDefinition) {
            missingRules.push(rule);
        }
    }

    return {
        canResolve: missingRules.length === 0,
        missingRules,
    };
}

/**
 * Check if a type's TransferPolicy rules are known to be unresolvable by the default `KioskClient`.
 */
export function isKnownUnresolvable(
    itemType: string,
): boolean {
    return KNOWN_UNRESOLVABLE_TYPES.includes(itemType);
}

/**
 * Extract an unlocked item from a kiosk and return it.
 */
export function takeItemFromKiosk(
    tx: Transaction,
    kioskClient: KioskClient,
    cap: KioskOwnerCap,
    itemId: string,
    itemType: string,
): TransactionObjectArgument
{
    const kioskTx = new KioskTransaction({ transaction: tx, kioskClient, cap });
    const item = kioskTx.take({ itemId, itemType });
    kioskTx.finalize();
    return item;
}

/**
 * List the item for 0 SUI in the seller's kiosk, purchase the item, and place it into a new kiosk.
 */
export async function sellForZeroIntoNewKiosk(
    tx: Transaction,
    kioskClient: KioskClient,
    sellerCap: KioskOwnerCap,
    itemId: string,
    itemType: string,
): Promise<KioskTransaction>
{
    // list the NFT for 0 SUI in the seller's kiosk
    const sellerKioskTx = new KioskTransaction({ transaction: tx, kioskClient, cap: sellerCap });
    sellerKioskTx.list({ itemType, itemId, price: 0n });

    // create a new kiosk for the buyer
    const newKioskTx = new KioskTransaction({ transaction: tx, kioskClient });
    newKioskTx.create();

    // purchase the item and resolve the TransferPolicy
    await newKioskTx.purchaseAndResolve({
        itemType,
        itemId,
        price: 0n,
        sellerKiosk: sellerKioskTx.getKiosk(),
    });

    newKioskTx.share();

    sellerKioskTx.finalize();

    return newKioskTx;
}

// === config ===

export const KIOSK_CAP_TYPES: Record<NetworkName, Record<KioskKind, string>> = {
    mainnet: {
        regular: "0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::KioskOwnerCap",
        personal: "0x0cb4bcc0560340eb1a1b929cabe56b33fc6449820ec8c1980d69bb98b649b802::personal_kiosk::PersonalKioskCap",
        origin_byte: "0x95a441d389b07437d00dd07e0b6f05f513d7659b13fd7c5d3923c7d9d847199b::ob_kiosk::OwnerToken",
    },
    testnet: {
        regular: "0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::KioskOwnerCap",
        personal: "0x06f6bdd3f2e2e759d8a4b9c252f379f7a05e72dfe4c0b9311cdac27b8eb791b1::personal_kiosk::PersonalKioskCap",
        origin_byte: "",
    },
    devnet: {
        regular: "0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::KioskOwnerCap",
        personal: "",
        origin_byte: "",
    },
    localnet: {
        regular: "0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::KioskOwnerCap",
        personal: "",
        origin_byte: "",
    },
};

export const KNOWN_UNRESOLVABLE_TYPES = [
    "0x75cab45b9cba2d0b06a91d1f5fa51a4569da07374cf42c1bd2802846a61efe33::cosmetic::Cosmetic", // "434b5bd8f6a7b05fede0ff46c6e511d71ea326ed38056e3bcd681d2d7c2a7879::witness_rule::Rule<75cab45b9cba2d0b06a91d1f5fa51a4569da07374cf42c1bd2802846a61efe33::cosmetic::Equip>"
    "0x00a1d5e3f98eb588b245a87c02363652436450aedb62ef1a7b018f16e6423059::delorean::DeloreanNFT", // "0cb4bcc0560340eb1a1b929cabe56b33fc6449820ec8c1980d69bb98b649b802::personal_kiosk_rule::Rule"
    "0x75cab45b9cba2d0b06a91d1f5fa51a4569da07374cf42c1bd2802846a61efe33::weapon::Weapon", // "434b5bd8f6a7b05fede0ff46c6e511d71ea326ed38056e3bcd681d2d7c2a7879::witness_rule::Rule<75cab45b9cba2d0b06a91d1f5fa51a4569da07374cf42c1bd2802846a61efe33::weapon::Equip>"
    "0x1f015c1a000631f2c0afd0258b299c63ffb8e5452e0c0f9be8fc28d2e20ad9b4::collection::HouseCollectionNFT", // "1f015c1a000631f2c0afd0258b299c63ffb8e5452e0c0f9be8fc28d2e20ad9b4::royalty_rule::Rule", "1f015c1a000631f2c0afd0258b299c63ffb8e5452e0c0f9be8fc28d2e20ad9b4::kiosk_lock_rule::Rule"
    "0x8f74a7d632191e29956df3843404f22d27bd84d92cca1b1abde621d033098769::rootlet::Rootlet", // "0cb4bcc0560340eb1a1b929cabe56b33fc6449820ec8c1980d69bb98b649b802::personal_kiosk_rule::Rule"
    "0x93195daadbc4f26c0c498f4ceac92593682d2325ce3a0f5ba9f2db3b6a9733dd::collection::DegenRabbit", // "93195daadbc4f26c0c498f4ceac92593682d2325ce3a0f5ba9f2db3b6a9733dd::kiosk_lock_rule::Rule", "93195daadbc4f26c0c498f4ceac92593682d2325ce3a0f5ba9f2db3b6a9733dd::royalty_rule::Rule"
    "0x34db0e1c931a35abf2cf30d28b4dbf97ea4a98e199a8bc228d1e095bfdc688da::dare_dragon_eggs::DareDragonEgg", // "801d62e2937916fca8cdb25e9248fa958c9094c529943528cb602f4f1a114129::warehouse_pseudorandom_rule::WithdrawRule", "d8036c369aac5f19303f8d87a18a6933974be30a5c962c6f42c396ad47ae8889::airdrop_lock_rule::Rule"
    "0xe7e651e4974fe367aa2837712d68081efb299c470242a15e2b9c26ea326159ec::card::SudoCard", // "e7e651e4974fe367aa2837712d68081efb299c470242a15e2b9c26ea326159ec::kiosk_lock_rule::Rule", "e7e651e4974fe367aa2837712d68081efb299c470242a15e2b9c26ea326159ec::kiosk_royalty_rule::Rule"
    "0x34f9e32641795c57d936b3e387b9c7c941fd99b5a8a90e86b61e966e9da1d1f0::unbound_nft::UnboundNFT", // "34f9e32641795c57d936b3e387b9c7c941fd99b5a8a90e86b61e966e9da1d1f0::royalty_rule::Rule"
];
