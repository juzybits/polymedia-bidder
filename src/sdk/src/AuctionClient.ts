import { SuiClient, SuiObjectResponse } from "@mysten/sui/client";
import { SignTransaction, SuiClientBase, objResToFields, objResToId } from "@polymedia/suitcase-core";
import { AuctionObject } from "./types.js";

/**
 * Execute transactions on the auction::auction Sui module.
 */
export class AuctionClient extends SuiClientBase
{
    public readonly packageId: string;

    constructor(
        suiClient: SuiClient,
        signTransaction: SignTransaction,
        packageId: string,
    ) {
        super(suiClient, signTransaction);
        this.packageId = packageId;
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
        return resp.data.map(objRes => objResToId(objRes));
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
        const fields = objResToFields(objRes);
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
}
