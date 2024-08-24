import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { ObjectArg, objectArg } from "@polymedia/suitcase-core";

/**
 * Build transactions for the auction::user Sui module.
 */
export const UserModule =
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

    get_created_page: (
        tx: Transaction,
        packageId: string,
        user: ObjectArg,
        ascending: boolean,
        cursor: number,
        limit: number,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::history::get_created_page`,
            arguments: [
                objectArg(tx, user),
                tx.pure.bool(ascending),
                tx.pure.u64(cursor),
                tx.pure.u64(limit),
            ],
        });
    },

    get_bids_page: (
        tx: Transaction,
        packageId: string,
        user: ObjectArg,
        ascending: boolean,
        cursor: number,
        limit: number,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::history::get_bids_page`,
            arguments: [
                objectArg(tx, user),
                tx.pure.bool(ascending),
                tx.pure.u64(cursor),
                tx.pure.u64(limit),
            ],
        });
    },

    created: (
        tx: Transaction,
        packageId: string,
        user: ObjectArg,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::history::created`,
            arguments: [
                objectArg(tx, user),
            ],
        });
    },

    bids: (
        tx: Transaction,
        packageId: string,
        user: ObjectArg,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::history::bids`,
            arguments: [
                objectArg(tx, user),
            ],
        });
    },

    new_user_request: (
        tx: Transaction,
        packageId: string,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::history::new_user_request`,
            arguments: [],
        });
    },

    borrow_mut_user: (
        tx: Transaction,
        packageId: string,
        request: ObjectArg,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::history::borrow_mut_user`,
            arguments: [
                objectArg(tx, request),
            ],
        });
    },

    destroy_user_request: (
        tx: Transaction,
        packageId: string,
        request: ObjectArg,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::history::destroy_user_request`,
            arguments: [
                objectArg(tx, request),
            ],
        });
    },

};
