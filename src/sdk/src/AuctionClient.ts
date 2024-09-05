import { bcs } from "@mysten/sui/bcs";
import {
    OwnedObjectRef,
    SuiClient,
    SuiObjectChange,
    SuiObjectResponse,
    SuiTransactionBlockResponse,
    SuiTransactionBlockResponseOptions,
    TransactionFilter
} from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
    chunkArray,
    devInspectAndGetReturnValues,
    getArgVal,
    getCoinOfValue,
    isArgInput,
    isOwnerShared,
    isTxMoveCall,
    isTxSplitCoins,
    ObjectArg,
    objResToFields,
    objResToId,
    objResToType,
    SignTransaction,
    SuiClientBase,
    SuiObjectChangeCreated,
    TransferModule,
    txResToData,
    WaitForTxOptions,
} from "@polymedia/suitcase-core";
import { AuctionModule } from "./AuctionModule.js";
import { AUCTION_CONFIG } from "./config.js";
import { objResToSuiItem, PaginatedItemsResponse, SuiItem } from "./items.js";
import { AuctionObj, TxAdminCreatesAuction, TxAnyoneBids, UserBid, UserBidBcs } from "./types.js";
import { UserModule } from "./UserModule.js";

/**
 * The maximum number of objects that can be fetched from the RPC in a single request.
 */
const MAX_OBJECTS_PER_REQUEST = 50;

/**
 * Execute transactions on the bidder::auction Sui module.
 */
export class AuctionClient extends SuiClientBase
{
    public readonly packageId: string;
    public readonly registryId: string;
    protected readonly cache: {
        auctions: Map<string, AuctionObj>;
        items: Map<string, SuiItem>;
        userIds: Map<string, string>;
    };

    constructor(
        suiClient: SuiClient,
        signTransaction: SignTransaction,
        packageId: string,
        registryId: string,
        txResponseOptions?: SuiTransactionBlockResponseOptions,
        waitForTxOptions?: WaitForTxOptions,
    ) {
        super(suiClient, signTransaction, txResponseOptions, waitForTxOptions);
        this.packageId = packageId;
        this.registryId = registryId;
        this.cache = {
            auctions: new Map(),
            items: new Map(),
            userIds: new Map(),
        };
    }

    // === data fetching ===

    public async fetchAuction(
        auctionId: string,
        useCache = true,
    ): Promise<AuctionObj | null>
    {
        const auctions = await this.fetchAuctions([auctionId], useCache);
        return auctions.length > 0 ? auctions[0] : null;
    }

    public async fetchAuctions( // MAYBE add pagination
        auctionIds: string[],
        useCache = true,
    ): Promise<AuctionObj[]>
    {
        const auctions: AuctionObj[] = [];
        const uncachedAuctionIds: string[] = [];

        for (const id of auctionIds) {
            const cachedAuction = useCache ? this.cache.auctions.get(id) : undefined;
            if (cachedAuction) {
                auctions.push(cachedAuction);
            } else {
                uncachedAuctionIds.push(id);
            }
        }
        if (uncachedAuctionIds.length > 0) {
            const pagObjRes = await this.suiClient.multiGetObjects({
                ids: uncachedAuctionIds,
                options: { showContent: true },
            });
            for (const objRes of pagObjRes) {
                const auction = this.parseAuctionObj(objRes);
                if (auction) {
                    auctions.push(auction);
                    this.cache.auctions.set(auction.id, auction);
                }
            }
        }
        return auctions;
    }

    public async fetchItem(
        itemId: string,
        useCache = true,
    ): Promise<SuiItem | null>
    {
        const items = await this.fetchItems([itemId], useCache);
        return items.length > 0 ? items[0] : null;
    }

    public async fetchItems(
        itemIds: string[],
        useCache = true,
    ): Promise<SuiItem[]>
    {
        const items: SuiItem[] = [];
        const uncachedItemIds: string[] = [];

        for (const id of itemIds) {
            const cachedItem = useCache ? this.cache.items.get(id) : undefined;
            if (cachedItem) {
                items.push(cachedItem);
            } else {
                uncachedItemIds.push(id);
            }
        }

        if (uncachedItemIds.length === 0) {
            return items;
        }

        const idChunks = chunkArray(uncachedItemIds, MAX_OBJECTS_PER_REQUEST);
        const allResults = await Promise.allSettled(
            idChunks.map(ids => this.suiClient.multiGetObjects({
                ids,
                options: { showContent: true, showDisplay: true, showType: true },
            }))
        );
        for (const result of allResults)
        {
            if (result.status === "fulfilled")
            {
                const pagObjRes = result.value;
                for (const objRes of pagObjRes)
                {
                    const item = objResToSuiItem(objRes);
                    items.push(item);
                    this.cache.items.set(item.id, item);
                }
            } else {
                console.warn(`[fetchItems] multiGetObjects() failed: ${result.reason}`);
            }
        }
        return items;
    }

    public async fetchOwnedItems(
        owner: string,
        cursor: string | null | undefined,
    ): Promise<PaginatedItemsResponse>
    {
        const pagObjRes = await this.suiClient.getOwnedObjects({
            owner: owner,
            filter: { MatchNone: [{ StructType: "0x2::coin::Coin" }], },
            options: { showContent: true, showDisplay: true, showType: true },
            cursor,
        });

        const items: SuiItem[] = [];
        for (const objRes of pagObjRes.data) {
            const item = objResToSuiItem(objRes);
            if (item.hasPublicTransfer) {
                items.push(item);
            }
        }
        return {
            data: items,
            hasNextPage: pagObjRes.hasNextPage,
            nextCursor: pagObjRes.nextCursor,
        };
    }

    public async fetchTxsAdminCreatesAuction(
        cursor: string | null | undefined,
    ) {
        const filter: TransactionFilter = {
            MoveFunction: {
                package: this.packageId, module: "auction", function: "admin_creates_auction"
            }
        };
        return this.fetchAndParseTxs(filter, this.parseTxAdminCreatesAuction.bind(this), cursor);
    }

    public async fetchTxsAnyoneBids(
        cursor: string | null | undefined,
    ) {
        const filter: TransactionFilter = {
            MoveFunction: {
                package: this.packageId, module: "auction", function: "anyone_bids"
            }
        };
        return this.fetchAndParseTxs(filter, this.parseTxAnyoneBids.bind(this), cursor);
    }

    public async fetchTxsByAuctionId(
        auctionId: string,
        cursor: string | null | undefined,
    ) {
        const filter: TransactionFilter = { ChangedObject: auctionId };
        return this.fetchAndParseTxs(filter, this.parseAuctionTx.bind(this), cursor);
    }

    protected async fetchAndParseTxs<T>(
        filter: TransactionFilter,
        txResParser: (txRes: SuiTransactionBlockResponse) => T | null,
        cursor: string | null | undefined,
    ) {
        const pagTxRes = await this.suiClient.queryTransactionBlocks({
            filter,
            options: { showEffects: true, showObjectChanges: true, showInput: true, },
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

    public async fetchUserId(
        owner: string,
    ): Promise<string | null>
    {
        const cachedUserId = this.cache.userIds.get(owner);
        if (cachedUserId) {
            return cachedUserId;
        }

        const objRes = await this.suiClient.getOwnedObjects({
            owner,
            filter: { StructType: `${this.packageId}::user::User` },
        });

        if (objRes.data.length > 0) {
            const userId = objResToId(objRes.data[0]);
            this.cache.userIds.set(owner, userId);
            return userId;
        }

        return null;
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
        return await this.fetchAuctions(auctionIds);
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
            // struct types
            type_coin,
            // fields that map 1:1 to on-chain struct fields
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
            // derived fields
            is_live: currentTimeMs >= beginTimeMs && currentTimeMs < endTimeMs,
            has_ended: currentTimeMs >= endTimeMs,
        };
    }
    /* eslint-enable */

    /**
     * Parse an `auction::admin_creates_auction` transaction.
     * Assumes the tx block contains only one `admin_creates_auction` call,
     * and possibly one or more `admin_adds_item` calls.
     */
    public parseTxAdminCreatesAuction(
        txRes: SuiTransactionBlockResponse,
    ): TxAdminCreatesAuction | null
    {
        let txData: ReturnType<typeof txResToData>;
        try { txData = txResToData(txRes); }
        catch (_err) { return null; }
        const allInputs = txData.inputs;

        // find the created auction object
        const auctionObjChange = this.extractAuctionObjChange(txRes);
        if (!auctionObjChange) { return null; }

        let createTxInputs: Omit<TxAdminCreatesAuction["inputs"], "item_addrs"> | undefined;
        const item_addrs: string[] = []; // these come from `admin_adds_item` calls

        for (const tx of txData.txs)
        {
            if (!isTxMoveCall(tx) ||
                tx.MoveCall.package !== this.packageId ||
                tx.MoveCall.module !== "auction" ||
                !tx.MoveCall.arguments ||
                !tx.MoveCall.type_arguments
            ) {
                continue;
            }

            // find the `admin_creates_auction` tx and parse the inputs
            if (tx.MoveCall.function === "admin_creates_auction")
            {
                const txInputs = tx.MoveCall.arguments
                    .filter(arg => isArgInput(arg))
                    .map(arg => allInputs[arg.Input]);

                if (txInputs.length !== 9) { return null; }

                createTxInputs = {
                    type_coin: tx.MoveCall.type_arguments[0],
                    name: getArgVal(txInputs[0]),
                    description: getArgVal(txInputs[1]),
                    pay_addr: getArgVal(txInputs[2]),
                    begin_delay_ms: getArgVal(txInputs[3]),
                    duration_ms: getArgVal(txInputs[4]),
                    minimum_bid: getArgVal(txInputs[5]),
                    minimum_increase_bps: getArgVal<number>(txInputs[6]),
                    extension_period_ms: getArgVal(txInputs[7]),
                };
            }
            // find the `admin_adds_item` txs and parse the inputs
            if (tx.MoveCall.function === "admin_adds_item")
            {
                const txInputs = tx.MoveCall.arguments
                    .filter(arg => isArgInput(arg))
                    .map(arg => allInputs[arg.Input]);

                if (txInputs.length !== 2) { return null; }

                item_addrs.push(getArgVal(txInputs[0]));
            }
        }

        if (!createTxInputs) { return null; }

        return {
            kind: "admin_creates_auction",
            digest: txRes.digest,
            timestamp: txRes.timestampMs ? parseInt(txRes.timestampMs) : 0,
            sender: txData.sender,
            auctionId: auctionObjChange.objectId,
            inputs: {
                ...createTxInputs,
                item_addrs,
            },
        };
    }

    /**
     * A simpler but less correct approach as it makes more assumptions about the tx block.
     */
    public parseTxAdminCreatesAuctionSimpler(
        txRes: SuiTransactionBlockResponse,
    ): TxAdminCreatesAuction | null
    {
        const auctionObjChange = this.extractAuctionObjChange(txRes);
        if (!auctionObjChange) { return null; }

        let txData: ReturnType<typeof txResToData>;
        try { txData = txResToData(txRes); }
        catch (_err) { return null; }
        const inputs = txData.inputs;

        const tx = txData.txs[1]; // see AuctionClient.createAndShareAuction()
        if (!isTxMoveCall(tx) || !tx.MoveCall.type_arguments) { return null; }
        const type_coin = tx.MoveCall.type_arguments[0];

        return {
            kind: "admin_creates_auction",
            digest: txRes.digest,
            timestamp: txRes.timestampMs ? parseInt(txRes.timestampMs) : 0,
            sender: txData.sender,
            auctionId: auctionObjChange.objectId,
            inputs: {
                type_coin,
                name: getArgVal(inputs[1]),
                description: getArgVal(inputs[2]),
                pay_addr: getArgVal(inputs[3]),
                begin_delay_ms: getArgVal(inputs[4]),
                duration_ms: getArgVal(inputs[5]),
                minimum_bid: getArgVal(inputs[6]),
                minimum_increase_bps: getArgVal(inputs[7]),
                extension_period_ms: getArgVal(inputs[8]),
                // clock: getArgVal(inputs[9]),
                item_addrs: inputs.slice(10).map(input => getArgVal(input)),
            },
        };
    }

    /**
     * Parse an `auction::anyone_bids` transaction.
     * Assumes the tx block contains only one `anyone_bids` call.
     */
    public parseTxAnyoneBids(
        txRes: SuiTransactionBlockResponse,
    ): TxAnyoneBids | null
    {
        let txData: ReturnType<typeof txResToData>;
        try { txData = txResToData(txRes); }
        catch (_err) { return null; }
        const allInputs = txData.inputs;

        let amount: bigint | undefined;
        let type_coin: string | undefined;
        let auction_id: string | undefined;

        for (const tx of txData.txs)
        {
            // find the SplitCoins tx and parse the bid amount
            if (isTxSplitCoins(tx))
            {
                const splitTxInputs = tx.SplitCoins[1]
                    .filter(arg => isArgInput(arg))
                    .map(arg => allInputs[arg.Input]);

                if (splitTxInputs.length !== 1) { return null; }

                amount = getArgVal(splitTxInputs[0]);
            }
            // find the `anyone_bids` tx and parse the userId and auctionId
            if (isTxMoveCall(tx) &&
                tx.MoveCall.package === this.packageId &&
                tx.MoveCall.module === "auction" &&
                tx.MoveCall.function === "anyone_bids" &&
                tx.MoveCall.arguments &&
                tx.MoveCall.type_arguments
            ) {
                const bidTxInputs = tx.MoveCall.arguments
                    .filter(arg => isArgInput(arg))
                    .map(arg => allInputs[arg.Input]);

                if (bidTxInputs.length !== 2) { return null; }

                type_coin = tx.MoveCall.type_arguments[0];
                auction_id = getArgVal(bidTxInputs[0]);
            }
        }

        if (!amount || !type_coin || !auction_id) { return null; }

        return {
            kind: "anyone_bids",
            digest: txRes.digest,
            timestamp: txRes.timestampMs ? parseInt(txRes.timestampMs) : 0,
            sender: txData.sender,
            inputs: {
                type_coin,
                auction_id,
                amount,
            },
        };
    }

    /**
     * A simpler but less correct approach as it makes more assumptions about the tx block.
     */
    public parseTxAnyoneBidsSimpler(
        txRes: SuiTransactionBlockResponse,
    ): TxAnyoneBids | null
    {
        let txData: ReturnType<typeof txResToData>;
        try { txData = txResToData(txRes); }
        catch (_err) { return null; }
        const inputs = txData.inputs;

        const tx = txData.txs[2]; // see AuctionClient.bid()
        if (!isTxMoveCall(tx) || !tx.MoveCall.type_arguments) { return null; }
        const type_coin = tx.MoveCall.type_arguments[0];

        return {
            kind: "anyone_bids",
            digest: txRes.digest,
            timestamp: txRes.timestampMs ? parseInt(txRes.timestampMs) : 0,
            sender: txData.sender,
            inputs: {
                type_coin,
                auction_id: getArgVal(inputs[2]),
                amount: getArgVal(inputs[0]),
            },
        };
    }

    /**
     * Parse various transactions on the `auction` module.
     */
    public parseAuctionTx(
        txRes: SuiTransactionBlockResponse,
    ): TxAdminCreatesAuction | TxAnyoneBids | null
    {
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

    /**
     * Extract the created Auction object (if any) from `SuiTransactionBlockResponse.objectChanges`.
     */
    public extractAuctionObjChange(
        txRes: SuiTransactionBlockResponse,
    ): SuiObjectChangeCreated | undefined
    {
        return txRes.objectChanges?.find(o =>
            o.type === "created" && o.objectType.startsWith(`${this.packageId}::auction::Auction<`)
        ) as SuiObjectChangeCreated | undefined;
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
    ): Promise<{ txRes: SuiTransactionBlockResponse, auctionObjChange: SuiObjectChangeCreated }>
    {
        const tx = new Transaction();

        const [reqArg0] = !userObj
            ? UserModule.new_user_request(tx, this.packageId, this.registryId)
            : UserModule.existing_user_request(tx, this.packageId, userObj);

        const [reqArg1, auctionArg] = AuctionModule.admin_creates_auction(
            tx,
            this.packageId,
            type_coin,
            reqArg0,
            name,
            description,
            pay_addr,
            begin_time_ms,
            duration_ms,
            minimum_bid,
            minimum_increase_bps,
            extension_period_ms,
        );

        UserModule.destroy_user_request(tx, this.packageId, reqArg1);

        for (const item of itemsToAuction) {
            AuctionModule.admin_adds_item(
                tx,
                this.packageId,
                type_coin,
                item.type,
                auctionArg,
                item.id,
            );
        }

        TransferModule.public_share_object(
            tx,
            `${this.packageId}::auction::Auction<${type_coin}>`,
            auctionArg,
        );

        const txRes = await this.signAndExecuteTransaction(tx);

        if (txRes.effects?.status.status !== "success") {
            throw new Error(`Transaction failed: ${JSON.stringify(txRes, null, 2)}`);
        }

        const auctionObjChange = this.extractAuctionObjChange(txRes);
        if (!auctionObjChange) {
            throw new Error(`Transaction succeeded but no auction object was found: ${JSON.stringify(txRes, null, 2)}`);
        }

        return { txRes, auctionObjChange };
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

        const [reqArg0] = !userObj
            ? UserModule.new_user_request(tx, this.packageId, this.registryId)
            : UserModule.existing_user_request(tx, this.packageId, userObj);

        const [reqArg1] = AuctionModule.anyone_bids(
            tx,
            this.packageId,
            type_coin,
            reqArg0,
            auctionId,
            pay_coin,
        );

        UserModule.destroy_user_request(tx, this.packageId, reqArg1);

        const txRes = await this.signAndExecuteTransaction(tx);
        return txRes;
    }
}
