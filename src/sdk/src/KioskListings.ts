import { KioskClient, KioskOwnerCap, KioskTransaction } from "@mysten/kiosk";
import { Transaction } from "@mysten/sui/transactions";

export async function listAndPurchaseNFT(
    tx: Transaction,
    kioskClient: KioskClient,
    cap: KioskOwnerCap,
    itemId: string,
    itemType: string,
    recipient: string,
)
{
    // List the NFT for 0 SUI in the seller's kiosk
    const sellerKioskTx = new KioskTransaction({ transaction: tx, kioskClient, cap });
    sellerKioskTx.list({ itemType, itemId, price: 0n });
    sellerKioskTx.finalize();

    // Create a new kiosk for the buyer
    const newKioskTx = new KioskTransaction({ transaction: tx, kioskClient });
    newKioskTx.create();

    // Use purchaseAndResolve on the new kiosk to handle the transfer policy
    await newKioskTx.purchaseAndResolve({
        itemType,
        itemId,
        price: 0n,
        sellerKiosk: sellerKioskTx.getKiosk(),
    });

    newKioskTx.shareAndTransferCap(recipient);
    newKioskTx.finalize();

    return newKioskTx;
}
