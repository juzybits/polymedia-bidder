import { SuiClient, SuiObjectResponse, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { SignatureWithBytes } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { SignTransaction, suiObjResToFields, suiObjResToId } from "@polymedia/suitcase-core";
import { AuctionObject } from "./types.js";

/**
 * Execute transactions on the auction::auction Sui module.
 */
export class AuctionClient
{
    public readonly suiClient: SuiClient;
    public readonly packageId: string;
    public coinType: string;
    public adminId: string | null;
    public readonly signTransaction: SignTransaction;

    constructor(
        suiClient: SuiClient,
        packageId: string,
        coinType: string,
        adminId: string | null,
        signTransaction: SignTransaction,
    ) {
        this.suiClient = suiClient;
        this.packageId = packageId;
        this.coinType = coinType;
        this.adminId = adminId;
        this.signTransaction = signTransaction;
    }

    // === setters ===

    public setAdminId(adminId: string|null): void {
        this.adminId = adminId;
    }

    public setCoinType(coinType: string): void {
        this.coinType = coinType;
    }

    // === data fetching ===

    public async fetchAdminIds(
        ownerAddr: string,
    ): Promise<string[]>
    {
        const resp = await this.suiClient.getOwnedObjects({
            owner: ownerAddr,
            filter: { StructType: `${this.packageId}::auction::AuctionAdmin` },
        });
        return resp.data.map(suiObjRes => suiObjResToId(suiObjRes));
    }

    public async fetchAuctions(
        auctionIds: string[],
    ): Promise<AuctionObject[]>
    {
        const pagObjRes = await this.suiClient.multiGetObjects({
            ids: auctionIds,
            options: { showContent: true }
        });
        const auctions = pagObjRes.map(objRes => AuctionClient.parseAuction(objRes));
        return auctions;
    }

    /* eslint-disable */
    public static parseAuction(
        objRes: SuiObjectResponse,
    ): AuctionObject {
        const fields = suiObjResToFields(objRes);
        return {
            id: fields.id.id,
            item_id: fields.item.fields.id.id,
            begin_time_ms: Number(fields.begin_time_ms),
            end_time_ms: Number(fields.end_time_ms),
            admin_addr: fields.admin_addr,
            pay_addr: fields.pay_addr,
            lead_addr: fields.lead_addr,
            lead_value: BigInt(fields.lead_bal),
            minimum_bid: BigInt(fields.minimum_bid),
            minimum_increase_bps: Number(fields.minimum_increase_bps),
            extension_period_ms: Number(fields.extension_period_ms),
        };
    }
    /* eslint-enable */

    public async executeTransaction(
        signedTx: SignatureWithBytes,
    ): Promise<SuiTransactionBlockResponse>
    {
        // console.debug("[AuctionClient] executing transaction");
        return await this.suiClient.executeTransactionBlock({
            transactionBlock: signedTx.bytes,
            signature: signedTx.signature,
            options: { showEffects: true },
        });
    }

    public async signAndExecuteTransaction(
        tx: Transaction,
    ): Promise<SuiTransactionBlockResponse>
    {
        const signedTx = await this.signTransaction(tx);
        return this.executeTransaction(signedTx);
    }
}
