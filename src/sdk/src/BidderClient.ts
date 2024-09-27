import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiObjectResponse, SuiTransactionBlockResponse, SuiTransactionBlockResponseOptions } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { devInspectAndGetReturnValues, getCoinOfValue, isTxMoveCall, ObjectInput, objResToFields, objResToId, objResToType, parseTxError, SignTransaction, SuiClientBase, SuiObjectChangeCreated, SuiObjectChangeMutated, TransferModule, txResToData, WaitForTxOptions, ZERO_ADDRESS } from "@polymedia/suitcase-core";
import { AuctionModule } from "./AuctionFunctions.js";
import { AuctionTxParser } from "./AuctionTxParser.js";
import { AnyAuctionTx } from "./AuctionTxTypes.js";
import { AUCTION_ERRORS } from "./config.js";
import { objResToSuiItem, SuiItem } from "./items.js";
import { AuctionObj, isAuctionObj } from "./AuctionStructs.js";
import { UserModule } from "./UserFunctions.js";
import { UserAuction, UserAuctionBcs, UserBid, UserBidBcs } from "./UserStructs.js";

export type UserHistoryAuctions = Awaited<ReturnType<BidderClient["fetchUserAuctions"]>>;
export type UserHistoryBids = Awaited<ReturnType<BidderClient["fetchUserBids"]>>;
export type UserHistoryBoth = Awaited<ReturnType<BidderClient["fetchUserRecentAuctionsAndBids"]>>;

/**
 * Execute transactions on the bidder::auction Sui module.
 */
export class BidderClient extends SuiClientBase
{
    public readonly packageId: string;
    public readonly registryId: string;
    public txParser: AuctionTxParser;
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
        waitForTxOptions?: WaitForTxOptions,
        txResponseOptions?: SuiTransactionBlockResponseOptions,
    ) {
        super(suiClient, signTransaction, waitForTxOptions, txResponseOptions);
        this.packageId = packageId;
        this.registryId = registryId;
        this.txParser = new AuctionTxParser(packageId);
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

    public async fetchAuctions(
        auctionIds: string[],
        useCache = true,
    ): Promise<AuctionObj[]>
    {
        return this.fetchAndParseObjects<AuctionObj>(
            auctionIds,
            useCache ? this.cache.auctions : null,
            (ids) => this.suiClient.multiGetObjects({
                ids,
                options: { showContent: true },
            }),
            (resp) => this.parseAuctionObj(resp),
        );
    }

    public async fetchAuctionsAndItems(
        auctionIds: string[],
        itemIds: string[],
    ): Promise<{
        auctions: AuctionObj[];
        items: Map<string, SuiItem>;
    }>
    {
        const allObjs = await this.fetchAndParseObjects<AuctionObj | SuiItem>(
            [...auctionIds, ...itemIds],
            null,
            (ids) => this.suiClient.multiGetObjects({
                ids,
                options: { showContent: true, showDisplay: true, showType: true },
            }),
            (resp) => this.parseAuctionOrItemObj(resp),
        );
        const auctions: AuctionObj[] = [];
        const items = new Map<string, SuiItem>();
        for (const obj of allObjs) {
            if (isAuctionObj(obj)) {
                auctions.push(obj);
                this.cache.auctions.set(obj.id, obj);
            } else {
                items.set(obj.id, obj);
                this.cache.items.set(obj.id, obj);
            }
        }
        return { auctions, items };
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
        return this.fetchAndParseObjects<SuiItem>(
            itemIds,
            useCache ? this.cache.items : null,
            (ids) => this.suiClient.multiGetObjects({
                ids,
                options: { showContent: true, showDisplay: true, showType: true },
            }),
            objResToSuiItem,
        );
    }

    public async fetchOwnedItems(
        owner: string,
        cursor: string | null | undefined,
        limit?: number,
    ) {
        const pagObjRes = await this.suiClient.getOwnedObjects({
            owner: owner,
            filter: { MatchNone: [{ StructType: "0x2::coin::Coin" }], },
            options: { showContent: true, showDisplay: true, showType: true },
            cursor,
            limit,
        });

        const items: SuiItem[] = [];
        for (const objRes of pagObjRes.data) {
            const item = objResToSuiItem(objRes);
            if (item.hasPublicTransfer) {
                items.push(item);
                this.cache.items.set(item.id, item);
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
        limit?: number,
        order: "ascending" | "descending" = "descending",
    ) {
        return this.fetchAndParseTxs(
            (resp) => this.txParser.admin_creates_auction(resp),
            {
                filter: { MoveFunction: {
                    package: this.packageId, module: "auction", function: "admin_creates_auction" }
                },
                options: { showEffects: true, showObjectChanges: true, showInput: true },
                cursor,
                limit,
                order,
            }
        );
    }

    public async fetchTxsAnyoneBids(
        cursor: string | null | undefined,
        limit?: number,
        order: "ascending" | "descending" = "descending",
    ) {
        return this.fetchAndParseTxs(
            (resp) => this.txParser.anyone_bids(resp),
            {
                filter: { MoveFunction: {
                    package: this.packageId, module: "auction", function: "anyone_bids" }
                },
                options: { showEffects: true, showObjectChanges: true, showInput: true },
                cursor,
                limit,
                order,
            },
        );
    }

    public async fetchTxsByAuctionId(
        auctionId: string,
        cursor: string | null | undefined,
        limit?: number,
        order: "ascending" | "descending" = "descending",
    ) {
        return this.fetchAndParseTxs(
            (resp) => this.parseAuctionTx(resp),
            {
                filter: { ChangedObject: auctionId },
                options: { showEffects: true, showObjectChanges: true, showInput: true },
                cursor,
                limit,
                order,
            },
        );
    }

    // public async fetchConfig()
    // {
    //     const tx = new Transaction();

    //     const fun_names = Object.keys(AUCTION_CONFIG).map(key => key.toLowerCase());
    //     for (const fun_name of fun_names) {
    //         tx.moveCall({ target: `${this.packageId}::auction::${fun_name}` });
    //     }

    //     const blockReturns = await devInspectAndGetReturnValues(this.suiClient, tx,
    //         Object.keys(AUCTION_CONFIG).map(() => [bcs.U64])
    //     );
    //     const values = blockReturns.map(val => val[0]); // eslint-disable-line @typescript-eslint/no-unsafe-return

    //     return Object.fromEntries(
    //         fun_names.map( (key, idx) => [key, Number(values[idx])] )
    //     );
    // }

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

    public cacheUserId(
        owner: string,
        userId: string,
    ) {
        this.cache.userIds.set(owner, userId);
    }

    public async fetchUserAuctions(
        user_id: string,
        cursor?: number,
        limit = 50,
        order: "ascending" | "descending" = "descending",
    ) {
        const tx = new Transaction();

        if (cursor === undefined) {
            cursor = order === "ascending" ? 0 : Number.MAX_SAFE_INTEGER;
        }

        UserModule.get_auctions_created(
            tx,
            this.packageId,
            user_id,
            cursor,
            limit,
            order === "ascending",
        );

        const blockReturns = await devInspectAndGetReturnValues(this.suiClient, tx, [
            [
                bcs.vector(UserAuctionBcs),
                bcs.Bool,
                bcs.U64,
            ],
        ]);
        const auctionsRaw = blockReturns[0][0] as UserAuction[];
        return {
            auctions: auctionsRaw.map(auction => ({
                auction_addr: auction.auction_addr,
                time: Number(auction.time),
            })),
            hasNextPage: blockReturns[0][1] as boolean,
            nextCursor: blockReturns[0][2] as number,
        };
    }

    public async fetchUserBids(
        user_id: string,
        cursor?: number,
        limit = 50,
        order: "ascending" | "descending" = "descending",
    ) {
        const tx = new Transaction();

        if (cursor === undefined) {
            cursor = order === "ascending" ? 0 : Number.MAX_SAFE_INTEGER;
        }

        UserModule.get_bids_placed(
            tx,
            this.packageId,
            user_id,
            cursor,
            limit,
            order === "ascending",
        );

        const blockReturns = await devInspectAndGetReturnValues(this.suiClient, tx, [
            [
                bcs.vector(UserBidBcs),
                bcs.Bool,
                bcs.U64,
            ],
        ]);
        const bidsRaw = blockReturns[0][0] as UserBid[];
        return {
            bids: bidsRaw.map(bid => ({
                auction_addr: bid.auction_addr,
                time: Number(bid.time),
                amount: BigInt(bid.amount),
            })),
            hasNextPage: blockReturns[0][1] as boolean,
            nextCursor: blockReturns[0][2] as number,
        };
    }

    public async fetchUserRecentAuctionsAndBids(
        user_id: string,
        limitCreated: number,
        limitBids: number,
    ) {
        const tx = new Transaction();

        UserModule.get_auctions_and_bids(
            tx,
            this.packageId,
            user_id,
            Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER,
            limitCreated,
            limitBids,
            false, // descending
        );

        const blockReturns = await devInspectAndGetReturnValues(this.suiClient, tx, [
            [
                bcs.U64, // total auctions created
                bcs.U64, // total bids placed
                bcs.vector(UserAuctionBcs), // created page
                bcs.vector(UserBidBcs), // bids page
                bcs.Bool, // has more created
                bcs.Bool, // has more bids
                bcs.U64, // cursor of created
                bcs.U64, // cursor of bids
            ],
        ]);

        return {
            created: {
                total: blockReturns[0][0] as number,
                data: blockReturns[0][2] as UserAuction[],
                hasNextPage: blockReturns[0][4] as boolean,
                nextCursor: blockReturns[0][6] as number,
            },
            bids: {
                total: blockReturns[0][1] as number,
                data: blockReturns[0][3] as UserBid[],
                hasNextPage: blockReturns[0][5] as boolean,
                nextCursor: blockReturns[0][7] as number,
            }
        };
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

        const lead_addr = normalizeSuiAddress(fields.lead_addr);
        const lead_value = BigInt(fields.lead_bal);
        const has_started = currentTimeMs >= beginTimeMs;
        const has_ended = currentTimeMs >= endTimeMs;
        const is_live = has_started && !has_ended;
        const has_leader = lead_addr !== ZERO_ADDRESS;
        const has_balance = lead_value > 0n;
        const is_cancelled = has_ended && !has_leader;
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
            lead_addr,
            lead_value,
            begin_time_ms: beginTimeMs,
            end_time_ms: endTimeMs,
            minimum_bid: BigInt(fields.minimum_bid),
            minimum_increase_bps: Number(fields.minimum_increase_bps),
            extension_period_ms: Number(fields.extension_period_ms),
            // derived fields
            has_started,
            has_ended,
            is_live,
            is_cancelled,
            has_leader,
            has_balance,
            can_anyone_pay_funds: has_ended && has_balance,
            can_anyone_send_items_to_winner: has_ended && has_leader && Number(fields.item_bag.fields.size) > 0,
            can_admin_accept_bid: is_live && has_leader,
            can_admin_cancel_auction: !has_ended,
            can_admin_reclaim_items: has_ended && !has_leader && Number(fields.item_bag.fields.size) > 0,
            can_admin_set_pay_addr: !has_ended || (has_ended && has_balance),
        };
    }
    /* eslint-enable */

    public parseAuctionOrItemObj(
        objRes: SuiObjectResponse,
    ): AuctionObj | SuiItem | null
    {
        if (objRes.data?.type?.startsWith(`${this.packageId}::auction::Auction<`)) {
            return this.parseAuctionObj(objRes);
        }
        return objResToSuiItem(objRes);
    }

    /**
     * Parse various transactions on the `auction` module.
     */
    public parseAuctionTx(
        resp: SuiTransactionBlockResponse,
    ): AnyAuctionTx | null
    {
        let txData: ReturnType<typeof txResToData>;
        try { txData = txResToData(resp); }
        catch (_err) { return null; }

        for (const tx of txData.txs) {
            if (!isTxMoveCall(tx) || tx.MoveCall.package !== this.packageId || tx.MoveCall.module !== "auction") {
                continue;
            }
            if (tx.MoveCall.function === "admin_creates_auction") {
                return this.txParser.admin_creates_auction(resp);
            }
            if (tx.MoveCall.function === "anyone_bids") {
                return this.txParser.anyone_bids(resp);
            }
            // typically these two calls are executed in the same tx, so only one of them will be returned
            if (tx.MoveCall.function === "anyone_pays_funds") {
                return this.txParser.anyone_pays_funds(resp);
            }
            if (tx.MoveCall.function === "anyone_sends_item_to_winner") {
                return this.txParser.anyone_sends_item_to_winner(resp);
            }
        }

        return null;
    }

    // === module interactions ===

    public async createAndShareAuction(
        type_coin: string,
        userObj: ObjectInput | null,
        name: string,
        description: string,
        pay_addr: string,
        begin_time_ms: number,
        duration_ms: number,
        minimum_bid: bigint,
        minimum_increase_bps: number,
        extension_period_ms: number,
        itemsToAuction: { id: string; type: string }[],
    ): Promise<{
        resp: SuiTransactionBlockResponse;
        auctionObjChange: SuiObjectChangeCreated;
        userObjChange: SuiObjectChangeCreated | SuiObjectChangeMutated;
    }> {
        const tx = new Transaction();

        // create the item bag and fill it with the items to auction
        const [itemBagArg] = tx.moveCall({
            target: "0x2::object_bag::new",
        });
        for (const item of itemsToAuction) {
            tx.moveCall({
                target: "0x2::object_bag::add",
                typeArguments: [ "address", item.type ],
                arguments: [
                    itemBagArg,
                    tx.pure.address(item.id),
                    tx.object(item.id),
                ],
            });
        }

        // create the user request
        const [reqArg0] = !userObj
            ? UserModule.new_user_request(tx, this.packageId, this.registryId)
            : UserModule.existing_user_request(tx, this.packageId, userObj);

        // create the auction
        const [reqArg1, auctionArg] = AuctionModule.admin_creates_auction(
            tx,
            this.packageId,
            type_coin,
            reqArg0,
            name,
            description,
            itemsToAuction.map(item => item.id),
            itemBagArg,
            pay_addr,
            begin_time_ms,
            duration_ms,
            minimum_bid,
            minimum_increase_bps,
            extension_period_ms,
        );

        // destroy the user request
        UserModule.destroy_user_request(tx, this.packageId, reqArg1);

        // share the auction object
        TransferModule.public_share_object(
            tx,
            `${this.packageId}::auction::Auction<${type_coin}>`,
            auctionArg,
        );

        const resp = await this.signAndExecuteTransaction(tx);

        if (resp.effects?.status.status !== "success") {
            throw new Error(`Transaction failed: ${JSON.stringify(resp, null, 2)}`);
        }

        const auctionObjChange = this.txParser.extractAuctionObjChange(resp);
        if (!auctionObjChange) { // should never happen
            throw new Error(`Transaction succeeded but no auction object was found: ${JSON.stringify(resp, null, 2)}`);
        }

        const userObjChange = this.txParser.extractUserObjChange(resp);
        if (!userObjChange) { // should never happen
            throw new Error(`Transaction succeeded but no user object was found: ${JSON.stringify(resp, null, 2)}`);
        }

        return { resp, auctionObjChange, userObjChange };
    }

    public async placeBid(
        sender: string,
        userObj: ObjectInput | null,
        auctionId: string,
        type_coin: string,
        amount: bigint,
        dryRun?: boolean,
    ): Promise<{
        resp: SuiTransactionBlockResponse;
        userObjChange: SuiObjectChangeCreated | SuiObjectChangeMutated | undefined;
    }> {
        const tx = new Transaction();

        const [pay_coin] = await getCoinOfValue(this.suiClient, tx, sender, type_coin, amount);

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

        const resp = await this.dryRunOrSignAndExecute(tx, dryRun, sender);

        const userObjChange = this.txParser.extractUserObjChange(resp);
        if (!dryRun && !userObjChange) { // should never happen
            throw new Error(`Transaction succeeded but no user object was found: ${JSON.stringify(resp, null, 2)}`);
        }

        return { resp, userObjChange };
    }

    public async payFundsAndSendItemsToWinner(
        tx: Transaction,
        auctionId: string,
        type_coin: string,
        itemsAndTypes: { addr: string; type: string }[],
        dryRun = false,
    ): Promise<SuiTransactionBlockResponse>
    {
        AuctionModule.anyone_pays_funds(tx, this.packageId, type_coin, auctionId);

        for (const item of itemsAndTypes) {
            AuctionModule.anyone_sends_item_to_winner(
                tx, this.packageId, type_coin, item.type, auctionId, item.addr,
            );
        }

        return await this.dryRunOrSignAndExecute(tx, dryRun);
    }

    protected async dryRunOrSignAndExecute(
        tx: Transaction,
        dryRun?: boolean,
        sender: string = "0x7777777777777777777777777777777777777777777777777777777777777777",
    ): Promise<SuiTransactionBlockResponse>
    {
        if (dryRun) {
            const results = await this.suiClient.devInspectTransactionBlock({
                sender,
                transactionBlock: tx,
            });
            return { digest: "", ...results };
        } else {
            return await this.signAndExecuteTransaction(tx);
        }
    }

    // === errors ===

    protected parseErrorCode(
        err: string,
    ): string
    {
        const error = parseTxError(err);
        if (!error || error.packageId !== this.packageId || !(error.code in AUCTION_ERRORS)) {
            return err;
        }
        return AUCTION_ERRORS[error.code];
    }

    public errCodeToStr(
        err: unknown,
        defaultMessage: string,
        errorMessages?: Record<string, string>
    ): string | null
    {
        if (!err) { return defaultMessage; }

        const str = err instanceof Error ? err.message : String(err);
        if (str.includes("Rejected from user")) { return null; }
        if (str.includes("InsufficientCoinBalance")) { return "You don't have enough balance"; }

        const code = this.parseErrorCode(str);

        if (errorMessages && code in errorMessages) {
            return errorMessages[code];
        }

        return code || defaultMessage;
    }
}

    // /**
    //  * A simpler but less correct approach as it makes more assumptions about the tx block.
    //  */
    // public parseTxAdminCreatesAuctionSimpler(
    //     resp: SuiTransactionBlockResponse,
    // ): TxAdminCreatesAuction | null
    // {
    //     const auctionObjChange = this.extractAuctionObjChange(resp);
    //     if (!auctionObjChange) { return null; }

    //     let txData: ReturnType<typeof txResToData>;
    //     try { txData = txResToData(resp); }
    //     catch (_err) { return null; }
    //     const inputs = txData.inputs;

    //     const tx = txData.txs[1]; // see BidderClient.createAndShareAuction()
    //     if (!isTxMoveCall(tx) || !tx.MoveCall.type_arguments) { return null; }
    //     const type_coin = tx.MoveCall.type_arguments[0];

    //     return {
    //         kind: "admin_creates_auction",
    //         digest: resp.digest,
    //         timestamp: resp.timestampMs ? parseInt(resp.timestampMs) : 0,
    //         sender: txData.sender,
    //         auctionId: auctionObjChange.objectId,
    //         inputs: {
    //             type_coin,
    //             name: getArgVal(inputs[1]),
    //             description: getArgVal(inputs[2]),
    //             pay_addr: getArgVal(inputs[3]),
    //             begin_delay_ms: getArgVal(inputs[4]),
    //             duration_ms: getArgVal(inputs[5]),
    //             minimum_bid: getArgVal(inputs[6]),
    //             minimum_increase_bps: getArgVal(inputs[7]),
    //             extension_period_ms: getArgVal(inputs[8]),
    //             // clock: getArgVal(inputs[9]),
    //             item_addrs: inputs.slice(10).map(input => getArgVal(input)),
    //         },
    //     };
    // }

    // /**
    //  * A simpler but less correct approach as it makes more assumptions about the tx block.
    //  */
    // public parseTxAnyoneBidsSimpler(
    //     resp: SuiTransactionBlockResponse,
    // ): TxAnyoneBids | null
    // {
    //     let txData: ReturnType<typeof txResToData>;
    //     try { txData = txResToData(resp); }
    //     catch (_err) { return null; }
    //     const inputs = txData.inputs;

    //     const tx = txData.txs[2]; // see BidderClient.bid()
    //     if (!isTxMoveCall(tx) || !tx.MoveCall.type_arguments) { return null; }
    //     const type_coin = tx.MoveCall.type_arguments[0];

    //     return {
    //         kind: "anyone_bids",
    //         digest: resp.digest,
    //         timestamp: resp.timestampMs ? parseInt(resp.timestampMs) : 0,
    //         sender: txData.sender,
    //         inputs: {
    //             type_coin,
    //             auction_addr: getArgVal(inputs[2]),
    //             amount: getArgVal(inputs[0]),
    //         },
    //     };
    // }
