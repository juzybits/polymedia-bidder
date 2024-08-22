import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { ObjectArg, objectArg } from "@polymedia/suitcase-core";

/**
 * Build transactions for the auction::history Sui module.
 */
export const HistoryModule =
{
    get_auctions: (
        tx: Transaction,
        packageId: string,
        history: ObjectArg,
        creator_addr: string,
        ascending: boolean,
        cursor: number,
        limit: number,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::history::get_auctions`,
            arguments: [
                objectArg(tx, history),
                tx.pure.address(creator_addr),
                tx.pure.bool(ascending),
                tx.pure.u64(cursor),
                tx.pure.u64(limit),
            ],
        });
    },

};
