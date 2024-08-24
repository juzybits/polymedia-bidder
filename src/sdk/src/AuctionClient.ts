import { bcs } from "@mysten/sui/bcs";
import { SuiCallArg, SuiClient, SuiObjectResponse, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
    SignTransaction,
    SuiClientBase,
    TransferModule,
    ZERO_ADDRESS,
    devInspectAndGetReturnValues,
    isOwnerShared,
    isTxMoveCall,
    objResToFields,
    txResToData,
} from "@polymedia/suitcase-core";
import { AuctionModule } from "./AuctionModule.js";
import { AUCTION_CONFIG } from "./config.js";
import { HistoryModule } from "./HistoryModule.js";
import { AuctionObj, TxAdminCreatesAuction } from "./types.js";

/**
 * Execute transactions on the auction::auction Sui module.
 */
export class AuctionClient extends SuiClientBase
{
    public readonly packageId: string;
    public readonly historyId: string;

    constructor(
        suiClient: SuiClient,
        signTransaction: SignTransaction,
        packageId: string,
        historyId: string,
    ) {
        super(suiClient, signTransaction);
        this.packageId = packageId;
        this.historyId = historyId;
    }

    // === data fetching ===

    public async fetchAuction(
        auctionId: string,
    ): Promise<AuctionObj | null>
    {
        const auctions = await this.fetchAuctions([auctionId]);
        return auctions[0];
    }

    public async fetchAuctions(
        auctionIds: string[],
    ): Promise<(AuctionObj | null)[]>
    {
        const pagObjRes = await this.suiClient.multiGetObjects({
            ids: auctionIds,
            options: { showContent: true }
        });
        const auctions = pagObjRes.map(
            objRes => AuctionClient.parseAuction(objRes)
        );
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

    public async fetchConfig()
    {
        const tx = new Transaction();

        const fun_names = Object.keys(AUCTION_CONFIG).map(key => key.toLowerCase());
        for (const fun_name of fun_names) {
            tx.moveCall({ target: `${this.packageId}::auction::${fun_name}` });
        }

        const blockReturns = await devInspectAndGetReturnValues(this.suiClient, tx,
            Object.keys(AUCTION_CONFIG).map(() => [bcs.U64])
        );
        const values = blockReturns.map((val: any) => val[0]);

        return Object.fromEntries(
            fun_names.map( (key, idx) => [key, Number(values[idx])] )
        );
    }

    public async fetchCreatorAuctionIds(
        creator_addr: string,
        order: "ascending" | "descending" = "descending",
        cursor?: number,
        limit = 50,
    ): Promise<string[]>
    {
        const tx = new Transaction();

        if (cursor === undefined) {
            cursor = order === "ascending" ? 0 : Number.MAX_SAFE_INTEGER;
        }

        HistoryModule.get_auctions(
            tx,
            this.packageId,
            this.historyId,
            creator_addr,
            order === "ascending",
            cursor,
            limit,
        );

        const blockReturns = await devInspectAndGetReturnValues(this.suiClient, tx, [
            [
                bcs.vector(bcs.Address),
                bcs.Bool,
                bcs.U64,
            ],
        ]);
        return blockReturns[0][0] as string[];
    }

    public async fetchCreatorAuctions(
        creator_addr: string,
        order: "ascending" | "descending" = "descending",
        cursor?: number,
        limit = 50,
    ): Promise<AuctionObj[]>
    {
        const auctionIds = await this.fetchCreatorAuctionIds(creator_addr, order, cursor, limit);
        return await this.fetchAuctions(auctionIds) as AuctionObj[];
    }

    // === data parsing ===

    /* eslint-disable */
    public static parseAuction(
        objRes: SuiObjectResponse,
    ): AuctionObj | null
    {
        let fields: Record<string, any>;
        try {
            fields = objResToFields(objRes);
        } catch (_err) {
            return null;
        }

        const currentTimeMs = Date.now();
        const beginTimeMs = Number(fields.begin_time_ms);
        const endTimeMs = Number(fields.end_time_ms);

        return {
            // === fields that map 1:1 to on-chain struct fields ===
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
            lead_addr: normalizeSuiAddress(fields.lead_addr),
            lead_value: BigInt(fields.lead_bal),
            begin_time_ms: beginTimeMs,
            end_time_ms: endTimeMs,
            minimum_bid: BigInt(fields.minimum_bid),
            minimum_increase_bps: Number(fields.minimum_increase_bps),
            extension_period_ms: Number(fields.extension_period_ms),
            // === derived fields ===
            is_live: currentTimeMs >= beginTimeMs && currentTimeMs < endTimeMs,
        };
    }
    /* eslint-enable */

    public static parseTxAdminCreatesAuction(
        txRes: SuiTransactionBlockResponse,
    ): TxAdminCreatesAuction | null
    {
        const createdObjRef = txRes.effects?.created?.find(o => isOwnerShared(o.owner));
        if (!createdObjRef) { return null; }

        let txData: ReturnType<typeof txResToData>;
        try { txData = txResToData(txRes); }
        catch (_err) { return null; }
        const inputs = txData.inputs;

        const tx0 = txData.txs[0];
        if (!isTxMoveCall(tx0) || !tx0.MoveCall.type_arguments) { return null; }
        const type_coin = tx0.MoveCall.type_arguments[0];

        return {
            digest: txRes.digest,
            timestamp: txRes.timestampMs ?? "0",
            sender: txData.sender,
            auctionId: createdObjRef.reference.objectId,
            inputs: {
                type_coin,
                name: getArgVal(inputs[1]) as string,
                description: getArgVal(inputs[2]) as string,
                pay_addr: getArgVal(inputs[3]) as string,
                begin_time_ms: getArgVal(inputs[4]) as number,
                duration_ms: getArgVal(inputs[5]) as number,
                minimum_bid: getArgVal(inputs[6]) as bigint,
                minimum_increase_bps: getArgVal(inputs[7]) as number,
                extension_period_ms: getArgVal(inputs[8]) as number,
                // clock: getArgVal(inputs[9]) as string,
                item_addrs: inputs.slice(10).map(input => getArgVal(input) as string),
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
            this.historyId,
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
