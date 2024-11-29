import { KioskClient, KioskClientOptions, Network } from "@mysten/kiosk";
import { bcs } from "@mysten/sui/bcs";
import { getFullnodeUrl, SuiClient, SuiObjectDataFilter, SuiObjectResponse, SuiTransactionBlockResponse, SuiTransactionBlockResponseOptions } from "@mysten/sui/client";
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions";
import { devInspectAndGetReturnValues, getCoinOfValue, NetworkName, ObjChangeKind, ObjectInput, objResToId, parseTxError, SignTransaction, SuiClientBase, TransferModule, WaitForTxOptions } from "@polymedia/suitcase-core";
import { AuctionModule } from "./AuctionFunctions.js";
import { AuctionObj, isAuctionObj, parseAuctionObj } from "./AuctionObjects.js";
import { AuctionTxParser } from "./AuctionTxParser.js";
import { TxAdminCreatesAuction, TxAnyoneBids } from "./AuctionTxTypes.js";
import { AUCTION_ERRORS } from "./config.js";
import { objDataToSuiItem, objResToSuiItem, SuiItem } from "./items.js";
import { hasAllRuleResolvers, isKnownUnresolvable, KIOSK_CAP_TYPES, sellForZeroIntoNewKiosk, takeItemFromKiosk } from "./kiosks.js";
import { UserModule } from "./UserFunctions.js";
import { UserAuction, UserAuctionBcs, UserBid, UserBidBcs } from "./UserObjects.js";

export type UserHistoryAuctions = Awaited<ReturnType<BidderClient["fetchUserAuctions"]>>;
export type UserHistoryBids = Awaited<ReturnType<BidderClient["fetchUserBids"]>>;
export type UserHistoryBoth = Awaited<ReturnType<BidderClient["fetchUserRecentAuctionsAndBids"]>>;

/**
 * Execute transactions on the bidder::auction Sui module.
 */
export class BidderClient extends SuiClientBase
{
    public readonly kioskClient: KioskClient;
    public readonly network: NetworkName;
    public readonly packageId: string;
    public readonly registryId: string;
    public txParser: AuctionTxParser;
    protected readonly cache: {
        auctions: Map<string, AuctionObj>;
        items: Map<string, SuiItem>;
        userIds: Map<string, string>;
    };

    constructor(args: {
        network: NetworkName;
        packageId: string;
        registryId: string;
        signTransaction: SignTransaction;
        suiClient?: SuiClient;
        kioskClientOptions?: KioskClientOptions;
        waitForTxOptions?: WaitForTxOptions;
        txResponseOptions?: SuiTransactionBlockResponseOptions;
    }) {
        const suiClient = args.suiClient ?? new SuiClient({ url: getFullnodeUrl(args.network) });
        super({
            suiClient,
            signTransaction: args.signTransaction,
            waitForTxOptions: args.waitForTxOptions,
            txResponseOptions: args.txResponseOptions,
        });
        this.kioskClient = new KioskClient(args.kioskClientOptions ?? {
            client: suiClient,
            network: args.network === "mainnet" ? Network.MAINNET : args.network === "testnet" ? Network.TESTNET : Network.CUSTOM,
        });
        this.network = args.network;
        this.packageId = args.packageId;
        this.registryId = args.registryId;
        this.txParser = new AuctionTxParser(args.packageId);
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
            (ids) => this.suiClient.multiGetObjects({
                ids,
                options: { showContent: true },
            }),
            (resp) => parseAuctionObj(resp),
            useCache ? this.cache.auctions : undefined,
        );
    }

    public async fetchAuctionsAndItems(
        auctionIds: string[],
        itemIds: string[],
    ): Promise<{
        auctions: Map<string, AuctionObj>;
        items: Map<string, SuiItem>;
    }>
    {
        const allObjs = await this.fetchAndParseObjects<AuctionObj | SuiItem>(
            [...auctionIds, ...itemIds],
            (ids) => this.suiClient.multiGetObjects({
                ids,
                options: { showContent: true, showDisplay: true, showType: true },
            }),
            (resp) => this.parseAuctionOrItemObj(resp),
        );
        const auctions = new Map<string, AuctionObj>();
        const items = new Map<string, SuiItem>();
        for (const obj of allObjs) {
            if (isAuctionObj(obj)) {
                auctions.set(obj.id, obj);
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
        const items = await this.fetchAndParseObjects<SuiItem>(
            itemIds,
            (ids) => this.suiClient.multiGetObjects({
                ids,
                options: { showContent: true, showDisplay: true, showType: true },
            }),
            objResToSuiItem,
            useCache ? this.cache.items : undefined,
        );

        const capItems = items.filter(item => item.type === KIOSK_CAP_TYPES[this.network].regular);
        const underlyingItems = new Map<string, SuiItem>(); // the item inside the kiosk controlled by the cap

        await Promise.all(capItems.map(async (capItem) =>
        {
            const capId: string = capItem.id;
            const kioskId: string = capItem.fields.for; // eslint-disable-line

            const cachedCapItem = this.cache.items.get(capId);
            if (
                // the cap may be cached, but not resolved
                cachedCapItem
                // if we've already resolved this cap, use the cached underlying item
                && cachedCapItem.type !== KIOSK_CAP_TYPES[this.network].regular
            ) {
                underlyingItems.set(capId, cachedCapItem);
                return;
            }

            const kioskData = await this.kioskClient.getKiosk({
                id: kioskId,
                options: {
                    withKioskFields: true,
                    withObjects: true,
                    objectOptions: { showContent: true, showDisplay: true, showType: true },
                },
            });

            if (kioskData.items.length !== 1) {
                console.warn(`Unexpected number of kiosk items: ${kioskData.items.length}`, kioskData.items);
            }

            if (kioskData.items.length > 0) {
                const underlyingItem = objDataToSuiItem(kioskData.items[0].data!);
                const kiosk = kioskData.kiosk!;
                underlyingItem.kiosk = {
                    cap: {
                        isPersonal: false,
                        objectId: capItem.id,
                        kioskId,
                        digest: "",
                        version: "",
                    },
                    kiosk: {
                        id: kiosk.id,
                        itemCount: kiosk.itemCount,
                        allowExtensions: kiosk.allowExtensions,
                    },
                    item: {
                        isLocked: kioskData.items[0].isLocked,
                        isListed: !!kioskData.items[0].listing,
                    }
                };
                underlyingItems.set(capItem.id, underlyingItem);
                // overwrite the cached item (cap) with the underlying item
                this.cache.items.set(capItem.id, underlyingItem);
            }
        }));

        return items.map(item => underlyingItems.get(item.id) || item);
    }

    public async fetchOwnedItems(
        owner: string,
        cursor: string | null | undefined,
        limit?: number,
    ) {
        const filter: SuiObjectDataFilter = {
            MatchNone: [
                { StructType: "0x2::coin::Coin" },
            ]
        };
        if (KIOSK_CAP_TYPES[this.network].regular) {
            filter.MatchNone.push({ StructType: KIOSK_CAP_TYPES[this.network].regular });
        }
        if (KIOSK_CAP_TYPES[this.network].origin_byte) {
            filter.MatchNone.push({ StructType: KIOSK_CAP_TYPES[this.network].origin_byte });
        }
        if (KIOSK_CAP_TYPES[this.network].personal) {
            filter.MatchNone.push({ StructType: KIOSK_CAP_TYPES[this.network].personal });
        }

        const pagObjRes = await this.suiClient.getOwnedObjects({
            owner: owner,
            filter,
            options: { showContent: true, showDisplay: true, showType: true },
            cursor,
            limit,
        });

        const items: SuiItem[] = [];
        for (const objRes of pagObjRes.data) {
            const item = objResToSuiItem(objRes);
            if (item?.hasPublicTransfer) {
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

    public async fetchOwnedKioskItems(
        owner: string,
        cursor: string | undefined,
        limit?: number,
        excludeListed = true,
        excludeUnresolvable = true,
    ) {
        const kiosks = await this.kioskClient.getOwnedKiosks({
            address: owner,
            pagination: { cursor, limit },
        });

        let allItems = (await Promise.all(
            kiosks.kioskOwnerCaps.map(async (cap) =>
            {
                const kioskData = await this.kioskClient.getKiosk({
                    id: cap.kioskId,
                    options: {
                        withKioskFields: true,
                        withObjects: true,
                        objectOptions: { showContent: true, showDisplay: true, showType: true },
                    },
                });

                return kioskData.items
                    .filter(kioskItem =>
                        !(excludeListed && kioskItem.listing) &&
                        !(excludeUnresolvable && isKnownUnresolvable(kioskItem.type))
                    )
                    .map(kioskItem => {
                        const item = objDataToSuiItem(kioskItem.data!);
                        const kiosk = kioskData.kiosk!;
                        item.kiosk = {
                            cap,
                            kiosk: {
                                id: kiosk.id,
                                itemCount: kiosk.itemCount,
                                allowExtensions: kiosk.allowExtensions,
                            },
                            item: {
                                isLocked: kioskItem.isLocked,
                                isListed: !!kioskItem.listing,
                            }
                        };
                        return item;
                    });
            })
        )).flat();

        if (excludeUnresolvable)
        {
            const typesThatNeedResolution = new Set<string>();
            for (const item of allItems) {
                const k = item.kiosk!;
                if (k.item.isLocked && (k.kiosk.itemCount > 1 || k.cap.isPersonal)) { // see createAndShareAuction()
                    typesThatNeedResolution.add(item.type);
                }
            }

            const unresolvableTypes = (await Promise.all(
                Array.from(typesThatNeedResolution).map(async (type) =>
                {
                    const { canResolve, missingRules } = await hasAllRuleResolvers(this.kioskClient, type);
                    if (!canResolve) {
                        console.debug(`non-resolvable type: ${type}\nnon-resolvable rules: ${JSON.stringify(missingRules, null, 2)}`);
                    }
                    return canResolve ? null : type;
                })
            )).filter((type): type is string => type !== null);

            allItems = allItems.filter(item => !unresolvableTypes.includes(item.type));
        }

        return {
            data: allItems,
            hasNextPage: kiosks.hasNextPage,
            nextCursor: kiosks.nextCursor ?? undefined,
        };
    }

    public async fetchTxsAdminCreatesAuction(
        cursor: string | null | undefined,
        limit?: number,
        order: "ascending" | "descending" = "descending",
    ) {
        return this.fetchAndParseTxs(
            (resp) => this.txParser.parseAuctionTx(resp) as TxAdminCreatesAuction | null,
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
            (resp) => this.txParser.parseAuctionTx(resp) as TxAnyoneBids | null,
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
            (resp) => this.txParser.parseAuctionTx(resp),
            {
                filter: { ChangedObject: auctionId },
                options: { showEffects: true, showObjectChanges: true, showInput: true },
                cursor,
                limit,
                order,
            },
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

    public parseAuctionOrItemObj(
        objRes: SuiObjectResponse,
    ): AuctionObj | SuiItem | null
    {
        if (objRes.data?.type?.startsWith(`${this.packageId}::auction::Auction<`)) {
            return parseAuctionObj(objRes);
        }
        return objResToSuiItem(objRes);
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
        itemsToAuction: SuiItem[],
        dryRun?: boolean,
        sender?: string,
    ): Promise<{
        resp: SuiTransactionBlockResponse;
        auctionObjChange: ObjChangeKind<"created"> | undefined;
        userObjChange: ObjChangeKind<"created" | "mutated"> | undefined;
    }> {
        const tx = new Transaction();

        // we only call this so we can get all item IDs with queryTransactionBlocks() + showInput
        tx.moveCall({
            target: "0x1::vector::length",
            typeArguments: [ "address" ],
            arguments: [ tx.pure.vector(
                "address",
                // for kiosk'd items, this is the ID of the underlying item, not the kiosk cap
                itemsToAuction.map(item => item.id),
            )],
        });

        const [ item_addrs_arg ] = tx.moveCall({
            target: "0x1::vector::empty",
            typeArguments: [ "address" ],
            arguments: [],
        });

        const [ item_bag_arg ] = tx.moveCall({
            target: "0x2::object_bag::new",
        });

        for (const item of itemsToAuction)
        {
            let item_type: string;
            let item_arg: TransactionObjectArgument;
            let item_id_arg: TransactionObjectArgument;

            // regular object
            if (!item.kiosk)
            {
                item_type = item.type;
                item_arg = tx.object(item.id);
                item_id_arg = tx.pure.address(item.id);
            }
            // kiosk'd objects
            else
            {
                // unlocked kiosk: take the item out of the kiosk and auction it directly
                if (!item.kiosk.item.isLocked)
                {
                    item_type = item.type;
                    item_id_arg = tx.pure.address(item.id);
                    item_arg = takeItemFromKiosk(tx, this.kioskClient, item.kiosk.cap, item.id, item.type);
                }
                // locked kiosk: auction a KioskOwnerCap that controls a single-item kiosk
                else
                {
                    item_type = "0x2::kiosk::KioskOwnerCap";

                    // auction the current KioskOwnerCap
                    if (item.kiosk.kiosk.itemCount === 1 && !item.kiosk.cap.isPersonal)
                    {
                        item_arg = tx.object(item.kiosk.cap.objectId);
                        item_id_arg = tx.pure.address(item.kiosk.cap.objectId);
                    }
                    // transfer the item to a new kiosk and auction the new KioskOwnerCap
                    else
                    {
                        const newKioskTx = await sellForZeroIntoNewKiosk(
                            tx,
                            this.kioskClient,
                            item.kiosk.cap,
                            item.id,
                            item.type,
                        );

                        item_arg = newKioskTx.getKioskCap();
                        item_id_arg = tx.moveCall({
                            target: "0x2::object::id_address",
                            typeArguments: [ item_type ],
                            arguments: [ item_arg ],
                        })[0];
                    }
                }
            }

            // add the item address (regular object or kiosk cap) to the item_addrs vector<address>
            tx.moveCall({
                target: "0x1::vector::push_back",
                typeArguments: [ "address" ],
                arguments: [
                    item_addrs_arg,
                    // for kiosk'd items, this is the ID of the kiosk cap, not the underlying item
                    item_id_arg,
                ],
            });

            // add the item (regular object or kiosk) to the item_bag ObjectBag
            tx.moveCall({
                target: "0x2::object_bag::add",
                typeArguments: [ "address", item_type ],
                arguments: [
                    item_bag_arg,
                    item_id_arg,
                    item_arg,
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
            item_addrs_arg,
            item_bag_arg,
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

        const resp = await this.dryRunOrSignAndExecute(tx, dryRun, sender);

        if (resp.effects?.status.status !== "success") {
            throw new Error(`Transaction failed: ${JSON.stringify(resp, null, 2)}`);
        }

        const auctionObjChange = this.txParser.extractAuctionObjCreated(resp);
        if (!dryRun && !auctionObjChange) { // should never happen
            throw new Error(`Transaction succeeded but no auction object was found: ${JSON.stringify(resp, null, 2)}`);
        }

        const userObjChange = this.txParser.extractUserObjChange(resp);
        if (!dryRun && !userObjChange) { // should never happen
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
        userObjChange: ObjChangeKind<"created" | "mutated"> | undefined;
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
        dryRun?: boolean,
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

    protected async dryRunOrSignAndExecute( // TODO move to @polymedia/suitcase-core
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

    // === errors === TODO move to @polymedia/suitcase-core

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

        const str = err instanceof Error ? err.message
            : typeof err === "string" ? err
            : JSON.stringify(err);
        if (str.includes("Rejected from user")) { return null; }
        if (str.includes("InsufficientCoinBalance")) { return "You don't have enough balance"; }

        const code = this.parseErrorCode(str);

        if (errorMessages && code in errorMessages) {
            return errorMessages[code];
        }

        return code || defaultMessage;
    }
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
