import { KioskClient, KioskData, KioskOwnerCap, KioskTransaction } from "@mysten/kiosk";
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions";

export async function listAndPurchaseNFT(
    tx: Transaction,
    kioskClient: KioskClient,
    kioskOwnerCaps: KioskOwnerCap[],
    nftId: string,
    nftType: string,
    kioskData: KioskData
): Promise<TransactionObjectArgument>
{
    if (!kioskData.kiosk) {
        throw new Error("Kiosk data is missing the kiosk information");
    }

    const kioskId = kioskData.kiosk.id;
    const cap = kioskOwnerCaps.find(cap => cap.kioskId === kioskId);
    if (!cap) {
        throw new Error("Kiosk cap not found for the given kiosk ID");
    }

    const kioskTx = new KioskTransaction({ transaction: tx, kioskClient, cap });

    // List the NFT for 0 SUI
    kioskTx.list({
        itemType: nftType,
        itemId: nftId,
        price: 0n
    });

    // Purchase the NFT
    kioskTx.purchaseAndResolve({
        itemType: nftType,
        itemId: nftId,
        price: 0n,
        sellerKiosk: kioskTx.getKiosk()
    });

    // Create a new kiosk
    const newKioskTx = new KioskTransaction({ transaction: tx, kioskClient });
    newKioskTx.create();

    // Place the item in the new kiosk
    newKioskTx.place({ itemType: nftType, item: tx.object(nftId) });

    // Share the new kiosk
    newKioskTx.share();

    // Get the new kiosk cap
    const newKioskCap = newKioskTx.getKioskCap();

    kioskTx.finalize();
    newKioskTx.finalize();

    return newKioskCap;
}
