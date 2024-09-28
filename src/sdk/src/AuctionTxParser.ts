import { MoveCallSuiTransaction, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { getArgVal, isArgInput, isTxMoveCall, isTxSplitCoins, SuiObjectChangeCreated, SuiObjectChangeMutated, txResToData } from "@polymedia/suitcase-core";
import { AnyAuctionTx, TxAdminCancelsAuction, TxAdminCreatesAuction, TxAdminSetsPayAddr, TxAnyoneBids, TxAnyonePaysFunds, TxAnyoneSendsItemToWinner } from "./AuctionTxTypes";

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

        for (const tx of txData.txs)
        {
            const isAuctionTx =
                isTxMoveCall(tx) &&
                tx.MoveCall.package === this.packageId &&
                tx.MoveCall.module === "auction" &&
                tx.MoveCall.arguments &&
                tx.MoveCall.type_arguments;

            if (!isAuctionTx) {
                continue;
            }
            if (tx.MoveCall.function === "admin_creates_auction") {
                return this.admin_creates_auction(resp, txData, tx.MoveCall);
            }
            if (tx.MoveCall.function === "anyone_bids") {
                return this.anyone_bids(resp, txData);
            }
            // if (tx.MoveCall.function === "admin_accepts_bid") {
            //     return this.admin_accepts_bid(resp, txData);
            // }
            if (tx.MoveCall.function === "admin_cancels_auction") {
                return this.admin_cancels_auction(resp, txData, tx.MoveCall);
            }
            if (tx.MoveCall.function === "admin_sets_pay_addr") {
                return this.admin_sets_pay_addr(resp, txData, tx.MoveCall);
            }
            // typically these two calls are executed in the same tx, so only one of them will be returned
            if (tx.MoveCall.function === "anyone_pays_funds") {
                return this.anyone_pays_funds(resp, txData, tx.MoveCall);
            }
            if (tx.MoveCall.function === "anyone_sends_item_to_winner") {
                return this.anyone_sends_item_to_winner(resp, txData, tx.MoveCall);
            }
        }

        return null;
    }

    /**
     * Parse an `auction::admin_creates_auction` transaction.
     */
    protected admin_creates_auction(
        resp: SuiTransactionBlockResponse,
        txData: TxData,
        moveCall: MoveCallSuiTransaction,
    ): TxAdminCreatesAuction | null
    {
        const auctionObjChange = this.extractAuctionObjCreated(resp);
        if (!auctionObjChange) { return null; }

        const txInputs = moveCall.arguments!
            .filter(arg => isArgInput(arg))
            .map(arg => txData.inputs[arg.Input]);

        if (txInputs.length !== 10) { return null; }

        return {
            kind: "admin_creates_auction",
            digest: resp.digest,
            timestamp: resp.timestampMs ? parseInt(resp.timestampMs) : 0,
            sender: txData.sender,
            auctionId: auctionObjChange.objectId,
            inputs: {
                type_coin: moveCall.type_arguments![0],
                name: getArgVal(txInputs[0]),
                description: getArgVal(txInputs[1]),
                item_addrs: getArgVal(txInputs[2]),
                pay_addr: getArgVal(txInputs[3]),
                begin_delay_ms: getArgVal(txInputs[4]),
                duration_ms: getArgVal(txInputs[5]),
                minimum_bid: getArgVal(txInputs[6]),
                minimum_increase_bps: getArgVal<number>(txInputs[7]),
                extension_period_ms: getArgVal(txInputs[8]),
            },
        };
    }

    /**
     * Parse an `auction::anyone_bids` transaction.
     * Assumes the tx block contains only one `anyone_bids` call.
     */
    protected anyone_bids(
        resp: SuiTransactionBlockResponse,
        txData: TxData,
    ): TxAnyoneBids | null
    {
        let amount: bigint | undefined;
        let type_coin: string | undefined;
        let auction_addr: string | undefined;

        for (const tx of txData.txs)
        {
            // find the SplitCoins tx and parse the bid amount
            if (isTxSplitCoins(tx))
            {
                const splitTxInputs = tx.SplitCoins[1]
                    .filter(arg => isArgInput(arg))
                    .map(arg => txData.inputs[arg.Input]);

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
                    .map(arg => txData.inputs[arg.Input]);

                if (bidTxInputs.length !== 2) { return null; }

                type_coin = tx.MoveCall.type_arguments[0];
                auction_addr = getArgVal(bidTxInputs[0]);
            }
        }

        if (!amount || !type_coin || !auction_addr) { return null; }

        return {
            kind: "anyone_bids",
            digest: resp.digest,
            timestamp: resp.timestampMs ? parseInt(resp.timestampMs) : 0,
            sender: txData.sender,
            inputs: {
                type_coin,
                auction_addr,
                amount,
            },
        };
    }

    /**
     * Parse an `auction::anyone_pays_funds` transaction.
     */
    protected anyone_pays_funds(
        resp: SuiTransactionBlockResponse,
        txData: TxData,
        moveCall: MoveCallSuiTransaction,
    ): TxAnyonePaysFunds | null
    {
        const txInputs = moveCall.arguments!
            .filter(arg => isArgInput(arg))
            .map(arg => txData.inputs[arg.Input]);

        if (txInputs.length !== 2) { return null; }

        return {
            kind: "anyone_pays_funds",
            digest: resp.digest,
            timestamp: resp.timestampMs ? parseInt(resp.timestampMs) : 0,
            sender: txData.sender,
            inputs: {
                type_coin: moveCall.type_arguments![0],
                auction_addr: getArgVal(txInputs[0]),
            },
        };
    }

    /**
     * Parse an `auction::anyone_sends_item_to_winner` transaction.
     */
    protected anyone_sends_item_to_winner(
        resp: SuiTransactionBlockResponse,
        txData: TxData,
        moveCall: MoveCallSuiTransaction,
    ): TxAnyoneSendsItemToWinner | null
    {
        const txInputs = moveCall.arguments!
            .filter(arg => isArgInput(arg))
            .map(arg => txData.inputs[arg.Input]);

        if (txInputs.length !== 3) { return null; }

        return {
            kind: "anyone_sends_item_to_winner",
            digest: resp.digest,
            timestamp: resp.timestampMs ? parseInt(resp.timestampMs) : 0,
            sender: txData.sender,
            inputs: {
                type_coin: moveCall.type_arguments![0],
                type_item: moveCall.type_arguments![1],
                auction_addr: getArgVal(txInputs[0]),
                item_addr: getArgVal(txInputs[1]),
            },
        };
    }

    /**
     * Parse an `auction::admin_cancels_auction` transaction.
     * Assumes the tx block contains only one `admin_cancels_auction` call.
     */
    protected admin_cancels_auction(
        resp: SuiTransactionBlockResponse,
        txData: TxData,
        moveCall: MoveCallSuiTransaction,
    ): TxAdminCancelsAuction | null
    {
        const txInputs = moveCall.arguments!
            .filter(arg => isArgInput(arg))
            .map(arg => txData.inputs[arg.Input]);

        if (txInputs.length !== 2) { return null; }

        return {
            kind: "admin_cancels_auction",
            digest: resp.digest,
            timestamp: resp.timestampMs ? parseInt(resp.timestampMs) : 0,
            sender: txData.sender,
            inputs: {
                type_coin: moveCall.type_arguments![0],
                auction_addr: getArgVal(txInputs[0]),
            },
        };
    }

    protected admin_sets_pay_addr(
        resp: SuiTransactionBlockResponse,
        txData: TxData,
        moveCall: MoveCallSuiTransaction,
    ): TxAdminSetsPayAddr | null
    {
        const txInputs = moveCall.arguments!
            .filter(arg => isArgInput(arg))
            .map(arg => txData.inputs[arg.Input]);

        if (txInputs.length !== 3) { return null; }

        return {
            kind: "admin_sets_pay_addr",
            digest: resp.digest,
            timestamp: resp.timestampMs ? parseInt(resp.timestampMs) : 0,
            sender: txData.sender,
            inputs: {
                type_coin: moveCall.type_arguments![0],
                auction_addr: getArgVal(txInputs[0]),
                pay_addr: getArgVal(txInputs[1]),
            },
        };
    }

    // === object extractors ===

    /**
     * Extract the created Auction object (if any) from `SuiTransactionBlockResponse.objectChanges`.
     */
    public extractAuctionObjCreated(
        resp: SuiTransactionBlockResponse,
    ): SuiObjectChangeCreated | undefined
    {
        return resp.objectChanges?.find(o =>
            o.type === "created" && o.objectType.startsWith(`${this.packageId}::auction::Auction<`)
        ) as SuiObjectChangeCreated | undefined;
    }

    /**
     * Extract the mutated Auction object (if any) from `SuiTransactionBlockResponse.objectChanges`.
     */
    public extractAuctionObjMutated(
        resp: SuiTransactionBlockResponse,
    ): SuiObjectChangeMutated | undefined
    {
        return resp.objectChanges?.find(o =>
            o.type === "mutated" && o.objectType.startsWith(`${this.packageId}::auction::Auction<`)
        ) as SuiObjectChangeMutated | undefined;
    }

    /**
     * Extract the created or mutated User object (if any) from `SuiTransactionBlockResponse.objectChanges`.
     */
    public extractUserObjChange(
        resp: SuiTransactionBlockResponse,
    ): SuiObjectChangeCreated | SuiObjectChangeMutated | undefined
    {
        return resp.objectChanges?.find(o =>
            (o.type === "created" || o.type === "mutated") && o.objectType === `${this.packageId}::user::User`
        ) as SuiObjectChangeCreated | SuiObjectChangeMutated | undefined;
    }
}