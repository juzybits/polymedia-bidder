import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { ObjectInput, objectArg } from "@polymedia/suitcase-core";

/**
 * Build transactions for the bidder::user Sui module.
 */
export const UserModule =
{
    get_auctions: (
        tx: Transaction,
        packageId: string,
        history: ObjectInput,
        creator_addr: string,
        ascending: boolean,
        cursor: number,
        limit: number,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::user::get_auctions`,
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
        user: ObjectInput,
        ascending: boolean,
        cursor: number,
        limit: number,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::user::get_created_page`,
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
        user: ObjectInput,
        ascending: boolean,
        cursor: number,
        limit: number,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::user::get_bids_page`,
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
        user: ObjectInput,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::user::created`,
            arguments: [
                objectArg(tx, user),
            ],
        });
    },

    bids: (
        tx: Transaction,
        packageId: string,
        user: ObjectInput,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::user::bids`,
            arguments: [
                objectArg(tx, user),
            ],
        });
    },

    new_user_request: (
        tx: Transaction,
        packageId: string,
        registryId: string,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::user::new_user_request`,
            arguments: [
                objectArg(tx, registryId),
            ],
        });
    },

    existing_user_request: (
        tx: Transaction,
        packageId: string,
        user: ObjectInput,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::user::existing_user_request`,
            arguments: [
                objectArg(tx, user),
            ],
        });
    },

    destroy_user_request: (
        tx: Transaction,
        packageId: string,
        request: ObjectInput,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::user::destroy_user_request`,
            arguments: [
                objectArg(tx, request),
            ],
        });
    },

};
