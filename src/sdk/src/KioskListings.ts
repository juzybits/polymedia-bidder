import { KioskClient, KioskData, KioskOwnerCap, KioskTransaction } from "@mysten/kiosk";
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions";

export async function listAndPurchaseNFT(
    tx: Transaction,
    kioskClient: KioskClient,
    kioskOwnerCaps: KioskOwnerCap[],
    nftId: string,
    nftType: string,
    kioskData: KioskData
): Promise<{ newKioskTx: KioskTransaction, newKioskCap: TransactionObjectArgument }>
{
    if (!kioskData.kiosk) {
        throw new Error("Kiosk data is missing the kiosk information");
    }

    const kioskId = kioskData.kiosk.id;
    const cap = kioskOwnerCaps.find(cap => cap.kioskId === kioskId);
    if (!cap) {
        throw new Error("Kiosk cap not found for the given kiosk ID");
    }

    // List the NFT for 0 SUI in the seller's kiosk

    const sellerKioskTx = new KioskTransaction({ transaction: tx, kioskClient, cap });

    sellerKioskTx.list({
        itemType: nftType,
        itemId: nftId,
        price: 0n,
    });

    sellerKioskTx.finalize();

    // Create a new kiosk for the buyer
    const newKioskTx = new KioskTransaction({ transaction: tx, kioskClient });
    newKioskTx.create();

    // Use purchaseAndResolve on the new kiosk to handle the transfer policy
    newKioskTx.purchaseAndResolve({
        itemType: nftType,
        itemId: nftId,
        price: 0n,
        sellerKiosk: sellerKioskTx.getKiosk(),
    });

    // Share the new kiosk
    newKioskTx.share();

    // Get the new kiosk cap
    const newKioskCap = newKioskTx.getKioskCap();

    // We don't finalize newKioskTx here as it needs to be done in the main transaction

    return { newKioskTx, newKioskCap };
}
