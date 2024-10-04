import { KioskClient, KioskOwnerCap, KioskTransaction } from "@mysten/kiosk";
import { Transaction } from "@mysten/sui/transactions";

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
