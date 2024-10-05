import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { getArgVal, isArgKind, isTxKind, ObjChangeKind, TxKind, txResToData } from "@polymedia/suitcase-core";
import { AnyAuctionTx } from "./AuctionTxTypes.js";

type TxData = ReturnType<typeof txResToData>;

/**
 * Parse transactions for the `bidder::auction` Sui module.
 */
export class AuctionTxParser
{
    constructor(protected readonly packageId: string) {}

    /**
     * Parse various transactions on the `bidder::auction` module.
     */
    public parseAuctionTx(
        resp: SuiTransactionBlockResponse,
    ): AnyAuctionTx | null
    {
        let txData: TxData;
        try { txData = txResToData(resp); }
        catch (_err) { return null; }
        if (resp.effects?.status.status !== "success") { return null; }

        let splitCoinsTx: TxKind<"SplitCoins"> | undefined;

        for (const tx of txData.txs)
        {
            if (isTxKind(tx, "SplitCoins")) {
                splitCoinsTx = tx;
                continue;
            }

            if (!isTxKind(tx, "MoveCall") ||
                tx.MoveCall.package !== this.packageId ||
                tx.MoveCall.module !== "auction" ||
                !tx.MoveCall.arguments ||
                !tx.MoveCall.type_arguments
            ) continue;

            const txInputs = tx.MoveCall.arguments
                .filter(arg => isArgKind(arg, "Input"))
                .map(arg => txData.inputs[arg.Input]);

            if (tx.MoveCall.function === "admin_creates_auction") {
                if (txInputs.length !== 10 && txInputs.length !== 9) return null;
                const offset = 10 - txInputs.length;

                const auctionObjChange = this.extractAuctionObjCreated(resp);
                if (!auctionObjChange) { return null; }

                return {
                    kind: "admin_creates_auction",
                    auctionId: auctionObjChange.objectId,
                    inputs: {
                        type_coin: tx.MoveCall.type_arguments[0],
                        name: getArgVal(txInputs[0]),
                        description: getArgVal(txInputs[1]),
                        item_addrs: txInputs.length === 10 ? getArgVal(txInputs[2]) : [],
                        pay_addr: getArgVal(txInputs[3-offset]),
                        begin_delay_ms: getArgVal(txInputs[4-offset]),
                        duration_ms: getArgVal(txInputs[5-offset]),
                        minimum_bid: getArgVal(txInputs[6-offset]),
                        minimum_increase_bps: getArgVal<number>(txInputs[7-offset]),
                        extension_period_ms: getArgVal(txInputs[8-offset]),
                    },
                    ...this.getCommonTxProps(resp, txData),
                };
            }

            if (tx.MoveCall.function === "anyone_bids")
            {
                if (txInputs.length !== 2) { return null; }

                if (!splitCoinsTx) {
                    console.warn("[AuctionTxParser] unexpected call to `anyone_bids` with no preceding `SplitCoins` tx");
                    return null;
                }
                const splitTxInputs = splitCoinsTx.SplitCoins[1]
                    .filter(arg => isArgKind(arg, "Input"))
                    .map(arg => txData.inputs[arg.Input]);

                if (splitTxInputs.length !== 1) { return null; }

                return {
                    kind: "anyone_bids",
                    inputs: {
                        type_coin: tx.MoveCall.type_arguments[0],
                        auction_addr: getArgVal(txInputs[0]),
                        amount: getArgVal(splitTxInputs[0]),
                    },
                    ...this.getCommonTxProps(resp, txData),
                };
            }

            // typically followed by anyone_pays_funds and anyone_sends_item_to_winner
            if (tx.MoveCall.function === "admin_accepts_bid")
            {
                if (txInputs.length !== 2) return null;
                return {
                    kind: "admin_accepts_bid",
                    inputs: {
                        type_coin: tx.MoveCall.type_arguments[0],
                        auction_addr: getArgVal(txInputs[0]),
                    },
                    ...this.getCommonTxProps(resp, txData),
                };
            }

            if (tx.MoveCall.function === "admin_cancels_auction")
            {
                if (txInputs.length !== 2) return null;
                return {
                    kind: "admin_cancels_auction",
                    inputs: {
                        type_coin: tx.MoveCall.type_arguments[0],
                        auction_addr: getArgVal(txInputs[0]),
                    },
                    ...this.getCommonTxProps(resp, txData),
                };
            }

            if (tx.MoveCall.function === "admin_sets_pay_addr")
            {
                if (txInputs.length !== 3) return null;
                return {
                    kind: "admin_sets_pay_addr",
                    inputs: {
                        type_coin: tx.MoveCall.type_arguments[0],
                        auction_addr: getArgVal(txInputs[0]),
                        pay_addr: getArgVal(txInputs[1]),
                    },
                    ...this.getCommonTxProps(resp, txData),
                };
            }

            // typically these two calls are executed in the same tx, so only one of them will be returned

            if (tx.MoveCall.function === "anyone_pays_funds")
            {
                if (txInputs.length !== 2) return null;
                return {
                    kind: "anyone_pays_funds",
                    inputs: {
                        type_coin: tx.MoveCall.type_arguments[0],
                        auction_addr: getArgVal(txInputs[0]),
                    },
                    ...this.getCommonTxProps(resp, txData),
                };
            }

            if (tx.MoveCall.function === "anyone_sends_item_to_winner")
            {
                if (txInputs.length !== 3) return null;
                return {
                    kind: "anyone_sends_item_to_winner",
                    inputs: {
                        type_coin: tx.MoveCall.type_arguments[0],
                        type_item: tx.MoveCall.type_arguments[1],
                        auction_addr: getArgVal(txInputs[0]),
                        item_addr: getArgVal(txInputs[1]),
                    },
                    ...this.getCommonTxProps(resp, txData),
                };
            }
        }

        return null;
    }

    // === object extractors ===

    /**
     * Extract the created Auction object (if any) from `SuiTransactionBlockResponse.objectChanges`.
     */
    public extractAuctionObjCreated(
        resp: SuiTransactionBlockResponse,
    ): ObjChangeKind<"created"> | undefined
    {
        return resp.objectChanges?.find(o =>
            o.type === "created" && o.objectType.startsWith(`${this.packageId}::auction::Auction<`)
        ) as ObjChangeKind<"created"> | undefined;
    }

    /**
     * Extract the mutated Auction object (if any) from `SuiTransactionBlockResponse.objectChanges`.
     */
    public extractAuctionObjMutated(
        resp: SuiTransactionBlockResponse,
    ): ObjChangeKind<"mutated"> | undefined
    {
        return resp.objectChanges?.find(o =>
            o.type === "mutated" && o.objectType.startsWith(`${this.packageId}::auction::Auction<`)
        ) as ObjChangeKind<"mutated"> | undefined;
    }

    /**
     * Extract the created or mutated User object (if any) from `SuiTransactionBlockResponse.objectChanges`.
     */
    public extractUserObjChange(
        resp: SuiTransactionBlockResponse,
    ): ObjChangeKind<"created" | "mutated"> | undefined
    {
        return resp.objectChanges?.find(o =>
            (o.type === "created" || o.type === "mutated") && o.objectType === `${this.packageId}::user::User`
        ) as ObjChangeKind<"created" | "mutated"> | undefined;
    }

    // === helpers ===

    /**
     * Get common properties for all auction transaction types.
     */
    protected getCommonTxProps(resp: SuiTransactionBlockResponse, txData: TxData) {
        return {
            digest: resp.digest,
            timestamp: resp.timestampMs ? parseInt(resp.timestampMs) : 0,
            sender: txData.sender,
        };
    }
}
