import { KioskClient, KioskOwnerCap, KioskTransaction } from "@mysten/kiosk";
import { Transaction } from "@mysten/sui/transactions";

// TODO add testnet types
export const SUI_KIOSK_CAP_TYPE = "0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::KioskOwnerCap";
export const OB_KIOSK_CAP_TYPE = "0x95a441d389b07437d00dd07e0b6f05f513d7659b13fd7c5d3923c7d9d847199b::ob_kiosk::OwnerToken";
export const PERSONAL_KIOSK_CAP_TYPE = "0x0cb4bcc0560340eb1a1b929cabe56b33fc6449820ec8c1980d69bb98b649b802::personal_kiosk::PersonalKioskCap";

export type OwnedKioskItem = {
    cap: KioskOwnerCap;
    kiosk: {
        id: string;
        itemCount: number;
        allowExtensions: boolean;
    },
    item: {
        isLocked: boolean;
    }
};

/**
 * List the item for 0 SUI in the original kiosk,
 * purchase the item and place it in a new kiosk,
 * and finally make the new kiosk a shared object.
 */
export async function transferItemToNewKiosk( // TODO move to @polymedia/suitcase-core
    tx: Transaction,
    kioskClient: KioskClient,
    cap: KioskOwnerCap,
    itemId: string,
    itemType: string,
): Promise<KioskTransaction>
{
    // List the NFT for 0 SUI in the seller's kiosk
    const sellerKioskTx = new KioskTransaction({ transaction: tx, kioskClient, cap });
    sellerKioskTx.list({ itemType, itemId, price: 0n });
    sellerKioskTx.finalize();

    // Create a new kiosk for the buyer
    const newKioskTx = new KioskTransaction({ transaction: tx, kioskClient });
    newKioskTx.create();

    // Purchase the item and resolve the TransferPolicy
    await newKioskTx.purchaseAndResolve({
        itemType,
        itemId,
        price: 0n,
        sellerKiosk: sellerKioskTx.getKiosk(),
    });

    newKioskTx.share();

    return newKioskTx;
}
