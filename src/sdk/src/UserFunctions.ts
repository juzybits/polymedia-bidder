import { Transaction, TransactionResult } from "@mysten/sui/transactions";

import { ObjectInput, objectArg } from "@polymedia/suitcase-core";

/**
 * Build transactions for the bidder::user Sui module.
 */
export const UserModule =
{
    get_user_address: (
        tx: Transaction,
        packageId: string,
        registry: ObjectInput,
        owner_addr: string,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::user::get_user_address`,
            arguments: [
                objectArg(tx, registry),
                tx.pure.address(owner_addr),
            ],
        });
    },

    get_user_addresses: (
        tx: Transaction,
        packageId: string,
        registry: ObjectInput,
        owner_addrs: string[],
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::user::get_user_addresses`,
            arguments: [
                objectArg(tx, registry),
                tx.pure.vector("address", owner_addrs),
            ],
        });
    },

    get_auctions_created: (
        tx: Transaction,
        packageId: string,
        user: ObjectInput,
        cursor: number,
        limit: number,
        ascending: boolean,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::user::get_auctions_created`,
            arguments: [
                objectArg(tx, user),
                tx.pure.u64(cursor),
                tx.pure.u64(limit),
                tx.pure.bool(ascending),
            ],
        });
    },

    get_bids_placed: (
        tx: Transaction,
        packageId: string,
        user: ObjectInput,
        cursor: number,
        limit: number,
        ascending: boolean,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::user::get_bids_placed`,
            arguments: [
                objectArg(tx, user),
                tx.pure.u64(cursor),
                tx.pure.u64(limit),
                tx.pure.bool(ascending),
            ],
        });
    },

    get_auctions_and_bids: (
        tx: Transaction,
        packageId: string,
        user: ObjectInput,
        cursor_created: number,
        cursor_bids: number,
        limit_created: number,
        limit_bids: number,
        ascending: boolean,
    ): TransactionResult => {
        return tx.moveCall({
            target: `${packageId}::user::get_auctions_and_bids`,
            arguments: [
                objectArg(tx, user),
                tx.pure.u64(cursor_created),
                tx.pure.u64(cursor_bids),
                tx.pure.u64(limit_created),
                tx.pure.u64(limit_bids),
                tx.pure.bool(ascending),
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
