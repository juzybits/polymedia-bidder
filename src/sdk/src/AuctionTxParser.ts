import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { getArgVal, isArgInput, isTxMoveCall, isTxSplitCoins, SuiObjectChangeCreated, txResToData } from "@polymedia/suitcase-core";
import { TxAdminCreatesAuction, TxAnyoneBids, TxAnyonePaysFunds, TxAnyoneSendsItemToWinner } from "./types.js";

/**
 * Parse transactions for the `bidder::auction` Sui module.
 */
export const newAuctionTxParser = (packageId: string) =>
({
    packageId,
    /**
     * Parse an `auction::admin_creates_auction` transaction.
     * Assumes the tx block contains only one `admin_creates_auction` call.
     */
    admin_creates_auction: (
        resp: SuiTransactionBlockResponse,
    ): TxAdminCreatesAuction | null =>
    {
        let txData: ReturnType<typeof txResToData>;
        try { txData = txResToData(resp); }
        catch (_err) { return null; }
        const allInputs = txData.inputs;

        // find the created auction object
        const auctionObjChange = extractAuctionObjChange(packageId, resp);
        if (!auctionObjChange) { return null; }

        let createTxInputs: TxAdminCreatesAuction["inputs"] | undefined;

        for (const tx of txData.txs)
        {
            // find the `admin_creates_auction` tx
            if (
                !isTxMoveCall(tx) ||
                !tx.MoveCall.arguments ||
                !tx.MoveCall.type_arguments ||
                tx.MoveCall.package !== packageId ||
                tx.MoveCall.module !== "auction" ||
                tx.MoveCall.function !== "admin_creates_auction"
            ) {
                continue;
            }

            // parse the tx inputs
            const txInputs = tx.MoveCall.arguments
                .filter(arg => isArgInput(arg))
                .map(arg => allInputs[arg.Input]);

            if (txInputs.length !== 10) { return null; }

            createTxInputs = {
                type_coin: tx.MoveCall.type_arguments[0],
                name: getArgVal(txInputs[0]),
                description: getArgVal(txInputs[1]),
                item_addrs: getArgVal(txInputs[2]),
                pay_addr: getArgVal(txInputs[3]),
                begin_delay_ms: getArgVal(txInputs[4]),
                duration_ms: getArgVal(txInputs[5]),
                minimum_bid: getArgVal(txInputs[6]),
                minimum_increase_bps: getArgVal<number>(txInputs[7]),
                extension_period_ms: getArgVal(txInputs[8]),
            };
        }

        if (!createTxInputs) { return null; }

        return {
            kind: "admin_creates_auction",
            digest: resp.digest,
            timestamp: resp.timestampMs ? parseInt(resp.timestampMs) : 0,
            sender: txData.sender,
            auctionId: auctionObjChange.objectId,
            inputs: createTxInputs,
        };
    },

    /**
     * Parse an `auction::anyone_bids` transaction.
     * Assumes the tx block contains only one `anyone_bids` call.
     */
    anyone_bids: (
        resp: SuiTransactionBlockResponse,
    ): TxAnyoneBids | null =>
    {
        let txData: ReturnType<typeof txResToData>;
        try { txData = txResToData(resp); }
        catch (_err) { return null; }
        const allInputs = txData.inputs;

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
                    .map(arg => allInputs[arg.Input]);

                if (splitTxInputs.length !== 1) { return null; }

                amount = getArgVal(splitTxInputs[0]);
            }
            // find the `anyone_bids` tx and parse the userId and auctionId
            if (isTxMoveCall(tx) &&
                tx.MoveCall.package === packageId &&
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
    },

    /**
     * Parse an `auction::anyone_pays_funds` transaction.
     * Assumes the tx block contains only one `anyone_pays_funds` call.
     */
    anyone_pays_funds: (
        resp: SuiTransactionBlockResponse,
    ): TxAnyonePaysFunds | null =>
    {
        let txData: ReturnType<typeof txResToData>;
        try { txData = txResToData(resp); }
        catch (_err) { return null; }
        const allInputs = txData.inputs;

        let type_coin: string | undefined;
        let auction_addr: string | undefined;

        for (const tx of txData.txs)
        {
            // find the `anyone_pays_funds` tx
            if (isTxMoveCall(tx) &&
                tx.MoveCall.package === packageId &&
                tx.MoveCall.module === "auction" &&
                tx.MoveCall.function === "anyone_pays_funds" &&
                tx.MoveCall.arguments &&
                tx.MoveCall.type_arguments
            ) {
                const txInputs = tx.MoveCall.arguments
                    .filter(arg => isArgInput(arg))
                    .map(arg => allInputs[arg.Input]);

                if (txInputs.length !== 2) { return null; }

                type_coin = tx.MoveCall.type_arguments[0];
                auction_addr = getArgVal(txInputs[0]);
            }
        }

        if (!auction_addr || !type_coin) { return null; }

        return {
            kind: "anyone_pays_funds",
            digest: resp.digest,
            timestamp: resp.timestampMs ? parseInt(resp.timestampMs) : 0,
            sender: txData.sender,
            inputs: {
                type_coin,
                auction_addr,
            },
        };
    },

    /**
     * Parse an `auction::anyone_sends_item_to_winner` transaction.
     * Assumes the tx block contains only one `anyone_sends_item_to_winner` call.
     */
    anyone_sends_item_to_winner:(
        resp: SuiTransactionBlockResponse,
    ): TxAnyoneSendsItemToWinner | null =>
    {
        let txData: ReturnType<typeof txResToData>;
        try { txData = txResToData(resp); }
        catch (_err) { return null; }
        const allInputs = txData.inputs;

        let type_coin: string | undefined;
        let type_item: string | undefined;
        let auction_addr: string | undefined;
        let item_addr: string | undefined;

        for (const tx of txData.txs)
        {
            // find the `anyone_sends_item_to_winner` tx
            if (isTxMoveCall(tx) &&
                tx.MoveCall.package === packageId &&
                tx.MoveCall.module === "auction" &&
                tx.MoveCall.function === "anyone_sends_item_to_winner" &&
                tx.MoveCall.arguments &&
                tx.MoveCall.type_arguments
            ) {
                const txInputs = tx.MoveCall.arguments
                    .filter(arg => isArgInput(arg))
                    .map(arg => allInputs[arg.Input]);

                if (txInputs.length !== 3) { return null; }

                type_coin = tx.MoveCall.type_arguments[0];
                type_item = tx.MoveCall.type_arguments[1];
                auction_addr = getArgVal(txInputs[0]);
                item_addr = getArgVal(txInputs[1]);
            }
        }

        if (!auction_addr || !item_addr || !type_coin || !type_item) { return null; }

        return {
            kind: "anyone_sends_item_to_winner",
            digest: resp.digest,
            timestamp: resp.timestampMs ? parseInt(resp.timestampMs) : 0,
            sender: txData.sender,
            inputs: {
                type_coin,
                type_item,
                auction_addr,
                item_addr,
            },
        };
    }
});

/**
 * Extract the created Auction object (if any) from `SuiTransactionBlockResponse.objectChanges`.
 */
export const extractAuctionObjChange = (
    packageId: string,
    resp: SuiTransactionBlockResponse,
): SuiObjectChangeCreated | undefined =>
{
    return resp.objectChanges?.find(o =>
        o.type === "created" && o.objectType.startsWith(`${packageId}::auction::Auction<`)
    ) as SuiObjectChangeCreated | undefined;
}
