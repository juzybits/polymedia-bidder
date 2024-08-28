import { bcs } from "@mysten/sui/bcs";
import { SuiCallArg, SuiClient, SuiObjectResponse, SuiTransactionBlockResponse, TransactionFilter } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
    ObjectArg,
    SignTransaction,
    SuiClientBase,
    TransferModule,
    devInspectAndGetReturnValues,
    getCoinOfValue,
    isOwnerShared,
    isTxMoveCall,
    objResToFields,
    objResToId,
    objResToType,
    txResToData,
} from "@polymedia/suitcase-core";
import { AuctionModule } from "./AuctionModule.js";
import { AUCTION_CONFIG } from "./config.js";
import { AuctionObj, TxAdminCreatesAuction, TxAnyoneBids, UserBid, UserBidBcs } from "./types.js";
import { UserModule } from "./UserModule.js";

/**
 * Execute transactions on the bidder::auction Sui module.
 */
export class AuctionClient extends SuiClientBase
{
    public readonly packageId: string;
    public readonly registryId: string;

    constructor(
        suiClient: SuiClient,
        signTransaction: SignTransaction,
        packageId: string,
        registryId: string,
    ) {
        super(suiClient, signTransaction);
        this.packageId = packageId;
        this.registryId = registryId;
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
            objRes => this.parseAuctionObj(objRes)
        );
        return auctions;
    }

    public async fetchTxsAdminCreatesAuction(
        cursor: string | null | undefined,
    ) {
        const filter = { MoveFunction: {
            package: this.packageId, module: "auction", function: "admin_creates_auction"
        }};
        return this.fetchAndParseTxs(filter, this.parseTxAdminCreatesAuction.bind(this), cursor);
    }

    public async fetchTxsAnyoneBids(
        cursor: string | null | undefined,
    ) {
        const filter = { MoveFunction: {
            package: this.packageId, module: "auction", function: "anyone_bids"
        }};
        return this.fetchAndParseTxs(filter, this.parseTxAnyoneBids.bind(this), cursor);
    }

    public async fetchTxsByAuctionId(
        auctionId: string,
        cursor: string | null | undefined,
    ) {
        const filter = { ChangedObject: auctionId };
        return this.fetchAndParseTxs(filter, this.parseAuctionTx.bind(this), cursor);
    }

    protected async fetchAndParseTxs<T>(
        filter: TransactionFilter,
        txResParser: (txRes: SuiTransactionBlockResponse) => T | null,
        cursor: string | null | undefined,
    ) {
        const pagTxRes = await this.suiClient.queryTransactionBlocks({
            filter,
            options: { showEffects: true, showInput: true, },
            cursor,
            order: "descending",
        });

        const results = {
            cursor: pagTxRes.nextCursor,
            hasNextPage: pagTxRes.hasNextPage,
            data: pagTxRes.data
                .map(txRes => txResParser(txRes))
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
        const values = blockReturns.map(val => val[0]); // eslint-disable-line @typescript-eslint/no-unsafe-return

        return Object.fromEntries(
            fun_names.map( (key, idx) => [key, Number(values[idx])] )
        );
    }

    public async fetchUserObjectId( // TODO: cache
        owner: string,
    ): Promise<string | null>
    {
        const objRes = await this.suiClient.getOwnedObjects({
            owner,
            filter: { StructType: `${this.packageId}::user::User` },
        });
        return objRes.data.length > 0 ? objResToId(objRes.data[0]) : null;
    }

    public async fetchUserAuctionIds(
        user_id: string,
        order: "ascending" | "descending" = "descending",
        cursor?: number,
        limit = 50,
    ): Promise<string[]>
    {
        const tx = new Transaction();

        if (cursor === undefined) {
            cursor = order === "ascending" ? 0 : Number.MAX_SAFE_INTEGER;
        }

        UserModule.get_created_page(
            tx,
            this.packageId,
            user_id,
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

    public async fetchUserAuctions(
        user_id: string,
        order: "ascending" | "descending" = "descending",
        cursor?: number,
        limit = 50,
    ): Promise<AuctionObj[]>
    {
        const auctionIds = await this.fetchUserAuctionIds(user_id, order, cursor, limit);
        return await this.fetchAuctions(auctionIds) as AuctionObj[];
    }

    public async fetchUserBids(
        user_id: string,
        order: "ascending" | "descending" = "descending",
        cursor?: number,
        limit = 50,
    ): Promise<UserBid[]>
    {
        const tx = new Transaction();

        if (cursor === undefined) {
            cursor = order === "ascending" ? 0 : Number.MAX_SAFE_INTEGER;
        }

        UserModule.get_bids_page(
            tx,
            this.packageId,
            user_id,
            order === "ascending",
            cursor,
            limit,
        );

        const blockReturns = await devInspectAndGetReturnValues(this.suiClient, tx, [
            [
                bcs.vector(UserBidBcs),
                bcs.Bool,
                bcs.U64,
            ],
        ]);
        const bidsRaw = blockReturns[0][0] as (typeof UserBidBcs.$inferType)[];
        const bidsTyped: UserBid[] = bidsRaw.map(bid => ({
            auction_id: bid.auction_id,
            time: Number(bid.time),
            amount: BigInt(bid.amount),
        }));
        return bidsTyped;
    }

    // === data parsing ===

    /* eslint-disable */
    public parseAuctionObj(
        objRes: SuiObjectResponse,
    ): AuctionObj | null
    {
        let fields: Record<string, any>;
        let objType: string;
        try {
            fields = objResToFields(objRes);
            objType = objResToType(objRes);
        } catch (_err) {
            return null;
        }

        const currentTimeMs = Date.now();
        const beginTimeMs = Number(fields.begin_time_ms);
        const endTimeMs = Number(fields.end_time_ms);

        // example objType: "0x12345::auction::Auction<0x2::sui::SUI>"
        const type_coin = objType.split("<")[1].split(">")[0];

        return {
            // === struct types ===
            type_coin,
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

    public parseTxAdminCreatesAuction(
        txRes: SuiTransactionBlockResponse,
    ): TxAdminCreatesAuction | null
    {
        const createdObjRef = txRes.effects?.created?.find(o => isOwnerShared(o.owner));
        if (!createdObjRef) { return null; }

        let txData: ReturnType<typeof txResToData>;
        try { txData = txResToData(txRes); }
        catch (_err) { return null; }
        const inputs = txData.inputs;

        const tx = txData.txs[1]; // see AuctionClient.createAndShareAuction()
        if (!isTxMoveCall(tx) || !tx.MoveCall.type_arguments) { return null; }
        const type_coin = tx.MoveCall.type_arguments[0];

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
                begin_delay_ms: getArgVal(inputs[4]) as number,
                duration_ms: getArgVal(inputs[5]) as number,
                minimum_bid: getArgVal(inputs[6]) as bigint,
                minimum_increase_bps: getArgVal(inputs[7]) as number,
                extension_period_ms: getArgVal(inputs[8]) as number,
                // clock: getArgVal(inputs[9]) as string,
                item_addrs: inputs.slice(10).map(input => getArgVal(input) as string),
            },
        };
    }

    public parseTxAnyoneBids(
        txRes: SuiTransactionBlockResponse,
    ): TxAnyoneBids | null
    {
        let txData: ReturnType<typeof txResToData>;
        try { txData = txResToData(txRes); }
        catch (_err) { return null; }
        const inputs = txData.inputs;

        return {
            digest: txRes.digest,
            timestamp: txRes.timestampMs ?? "0",
            sender: txData.sender,
            userId: getArgVal(inputs[1]) as string,
            auctionId: getArgVal(inputs[2]) as string,
            amount: BigInt(getArgVal(inputs[0]) as string),
        };
    }

    /**
     * Parse various transactions on the `auction` module.
     */
    public parseAuctionTx(
        txRes: SuiTransactionBlockResponse,
    ) {
        let txData: ReturnType<typeof txResToData>;
        try { txData = txResToData(txRes); }
        catch (_err) { return null; }

        for (const tx of txData.txs) {
            if (!isTxMoveCall(tx) || tx.MoveCall.package !== this.packageId || tx.MoveCall.module !== "auction") {
                continue;
            }
            if (tx.MoveCall.function === "admin_creates_auction") {
                return this.parseTxAdminCreatesAuction(txRes);
            }
            if (tx.MoveCall.function === "anyone_bids") {
                return this.parseTxAnyoneBids(txRes);
            }
        }

        return null;
    }

    // === module interactions ===

    public async createAndShareAuction(
        type_coin: string,
        userObj: ObjectArg | null,
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

        const [reqArg1] = !userObj
            ? UserModule.new_user_request(tx, this.packageId, this.registryId)
            : UserModule.existing_user_request(tx, this.packageId, userObj);

        const [reqArg2, auctionObj] = AuctionModule.admin_creates_auction(
            tx,
            this.packageId,
            type_coin,
            reqArg1,
            name,
            description,
            pay_addr,
            begin_time_ms,
            duration_ms,
            minimum_bid,
            minimum_increase_bps,
            extension_period_ms,
        );

        UserModule.destroy_user_request(tx, this.packageId, reqArg2);

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

    public async bid(
        owner: string,
        userObj: ObjectArg | null,
        auctionId: string,
        type_coin: string,
        amount: bigint,
    ): Promise<SuiTransactionBlockResponse>
    {
        const tx = new Transaction();

        const [pay_coin] = await getCoinOfValue(this.suiClient, tx, owner, type_coin, amount);

        const [reqArg1] = !userObj
            ? UserModule.new_user_request(tx, this.packageId, this.registryId)
            : UserModule.existing_user_request(tx, this.packageId, userObj);

        const [reqArg2] = AuctionModule.anyone_bids(
            tx,
            this.packageId,
            type_coin,
            reqArg1,
            auctionId,
            pay_coin,
        );

        UserModule.destroy_user_request(tx, this.packageId, reqArg2);

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
