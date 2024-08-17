import { SuiCallArg, SuiClient, SuiObjectResponse, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { SignTransaction, SuiClientBase, TransferModule, isOwnerShared, objResToFields } from "@polymedia/suitcase-core";
import { AuctionModule } from "./AuctionModule.js";
import { AuctionObject, TxAdminCreatesAuction } from "./types.js";

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

    public async fetchAuction(
        auctionId: string,
    ): Promise<AuctionObject | null>
    {
        const auctions = await this.fetchAuctions([auctionId]);
        return auctions[0];
    }

    public async fetchAuctions(
        auctionIds: string[],
    ): Promise<(AuctionObject | null)[]>
    {
        const pagObjRes = await this.suiClient.multiGetObjects({
            ids: auctionIds,
            options: { showContent: true }
        });
        const auctions = pagObjRes.map(objRes => {
            try {
                return AuctionClient.parseAuction(objRes);
            } catch (err) {
                return null;
            }
        });
        return auctions;
    }

    public async fetchTxsCreateAuction(
        cursor: string | null | undefined,
    ) {
        const pagTxRes = await this.suiClient.queryTransactionBlocks({
            filter: {
                MoveFunction: {
                    package: this.packageId,
                    module: "auction",
                    function: "admin_creates_auction",
                },
            },
            options: { showEffects: true, showInput: true, },
            cursor,
            order: "descending",
        });

        const results = {
            cursor: pagTxRes.nextCursor,
            hasNextPage: pagTxRes.hasNextPage,
            data: pagTxRes.data
                .map(txRes => AuctionClient.parseTxAdminCreatesAuction(txRes))
                .filter(result => result !== null),
        };

        return results;
    }

    // === data parsing ===

    /* eslint-disable */
    public static parseAuction(
        objRes: SuiObjectResponse,
    ): AuctionObject {
        const fields = objResToFields(objRes);
        return {
            id: fields.id.id,
            name: fields.name,
            description: fields.description,
            item_addrs: fields.item_addrs,
            item_bag: {
                id: fields.item_bag.fields.id.id,
                size: fields.item_bag.fields.size,
            },
            admin_addr: fields.admin_addr,
            pay_addr: fields.pay_addr,
            lead_addr: fields.lead_addr,
            lead_value: BigInt(fields.lead_bal),
            begin_time_ms: Number(fields.begin_time_ms),
            end_time_ms: Number(fields.end_time_ms),
            minimum_bid: BigInt(fields.minimum_bid),
            minimum_increase_bps: Number(fields.minimum_increase_bps),
            extension_period_ms: Number(fields.extension_period_ms),
        };
    }
    /* eslint-enable */

    public static parseTxAdminCreatesAuction(
        txRes: SuiTransactionBlockResponse,
    ): TxAdminCreatesAuction | null
    {
        if (txRes.effects?.status.status !== "success") {
            return null;
        }
        if (txRes.transaction?.data.transaction.kind !== "ProgrammableTransaction") {
            return null;
        }
        const createdObjRef = txRes.effects.created?.find(o => isOwnerShared(o.owner));
        if (!createdObjRef) {
            return null;
        }

        const inputs = txRes.transaction.data.transaction.inputs;

        return {
            digest: txRes.digest,
            timestamp: txRes.timestampMs!,
            sender: txRes.transaction.data.sender,
            auctionId: createdObjRef.reference.objectId,
            inputs: {
                name: getArgVal(inputs[0]) as string,
                description: getArgVal(inputs[1]) as string,
                pay_addr: getArgVal(inputs[2]) as string,
                begin_time_ms: getArgVal(inputs[3]) as number,
                duration_ms: getArgVal(inputs[4]) as number,
                minimum_bid: getArgVal(inputs[5]) as bigint,
                minimum_increase_bps: getArgVal(inputs[6]) as number,
                extension_period_ms: getArgVal(inputs[7]) as number,
                // clock: getArgVal(inputs[8]) as string,
                item_addrs: inputs.slice(9).map(input => getArgVal(input) as string),
            },
        };
    }

    // === module interactions ===

    public async createAndShareAuction(
        type_coin: string,
        name: string,
        description: string,
        pay_addr: string,
        begin_time_ms: number,
        duration_ms: number,
        minimum_bid: bigint,
        minimum_increase_bps: number,
        extension_period_ms: number,
        itemsToAuction: { id: string; type: string }[],
    ): Promise<SuiTransactionBlockResponse>
    {
        const tx = new Transaction();

        const [auctionObj] = AuctionModule.admin_creates_auction(
            tx,
            this.packageId,
            type_coin,
            name,
            description,
            pay_addr,
            begin_time_ms,
            duration_ms,
            minimum_bid,
            minimum_increase_bps,
            extension_period_ms,
        );

        for (const item of itemsToAuction) {
            AuctionModule.admin_adds_item(
                tx,
                this.packageId,
                type_coin,
                item.type,
                auctionObj,
                item.id,
            );
        }

        TransferModule.public_share_object(
            tx,
            `${this.packageId}::auction::Auction<${type_coin}>`,
            auctionObj,
        );

        const resp = await this.signAndExecuteTransaction(tx);
        return resp;
    }
}

function getArgVal(arg: SuiCallArg): unknown { // TODO move to @polymedia/suitcase-core
    if (arg.type === "pure") {
        return arg.value;
    }
    return arg.objectId;
}
