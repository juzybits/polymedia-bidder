import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { ObjectInput, objectArg } from "@polymedia/suitcase-core";

/**
 * Build transactions for the bidder::auction Sui module.
 */
export const AuctionModule =
{
    admin_creates_auction: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        request: ObjectInput,
        name: string,
        description: string,
        item_addrs: string[],
        item_bag: ObjectInput,
        pay_addr: string,
        begin_delay_ms: number,
        duration_ms: number,
        minimum_bid: bigint,
        minimum_increase_bps: number,
        extension_period_ms: number,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_creates_auction`,
            typeArguments: [ type_coin ],
            arguments: [
                objectArg(tx, request),
                tx.pure.string(name),
                tx.pure.string(description),
                tx.pure.vector("address", item_addrs),
                objectArg(tx, item_bag),
                tx.pure.address(pay_addr),
                tx.pure.u64(begin_delay_ms),
                tx.pure.u64(duration_ms),
                tx.pure.u64(minimum_bid),
                tx.pure.u64(minimum_increase_bps),
                tx.pure.u64(extension_period_ms),
                tx.object.clock(),
            ],
        });
    },

    anyone_bids: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        request: ObjectInput,
        auction: ObjectInput,
        pay_coin: ObjectInput,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::anyone_bids`,
            typeArguments: [ type_coin ],
            arguments: [
                objectArg(tx, auction),
                objectArg(tx, request),
                objectArg(tx, pay_coin),
                tx.object.clock(),
            ],
        });
    },

    anyone_pays_funds: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        auction: ObjectInput,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::anyone_pays_funds`,
            typeArguments: [ type_coin ],
            arguments: [
                objectArg(tx, auction),
                tx.object.clock(),
            ],
        });
    },

    anyone_sends_item_to_winner: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        type_item: string,
        auction: ObjectInput,
        item_addr: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::anyone_sends_item_to_winner`,
            typeArguments: [ type_coin, type_item ],
            arguments: [
                objectArg(tx, auction),
                tx.pure.address(item_addr),
                tx.object.clock(),
            ],
        });
    },

    admin_accepts_bid: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        auction: ObjectInput,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_accepts_bid`,
            typeArguments: [ type_coin ],
            arguments: [
                objectArg(tx, auction),
                tx.object.clock(),
            ],
        });
    },

    admin_cancels_auction: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        auction: ObjectInput,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_cancels_auction`,
            typeArguments: [ type_coin ],
            arguments: [
                objectArg(tx, auction),
                tx.object.clock(),
            ],
        });
    },

    admin_reclaims_item: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        type_item: string,
        auction: ObjectInput,
        item_addr: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_reclaims_item`,
            typeArguments: [ type_coin, type_item ],
            arguments: [
                objectArg(tx, auction),
                tx.pure.address(item_addr),
                tx.object.clock(),
            ],
        });
    },

    admin_sets_pay_addr: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        auction: ObjectInput,
        pay_addr: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_sets_pay_addr`,
            typeArguments: [ type_coin ],
            arguments: [
                objectArg(tx, auction),
                tx.pure.address(pay_addr),
                tx.object.clock(),
            ],
        });
    },

};
