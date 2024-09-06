import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { ObjectArg, objectArg } from "@polymedia/suitcase-core";

/**
 * Build transactions for the bidder::auction Sui module.
 */
export const AuctionModule =
{
    admin_creates_auction: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        request: ObjectArg,
        name: string,
        description: string,
        item_addrs: string[],
        item_bag: ObjectArg,
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
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    anyone_bids: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        request: ObjectArg,
        auction: ObjectArg,
        pay_coin: ObjectArg,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::anyone_bids`,
            typeArguments: [ type_coin ],
            arguments: [
                objectArg(tx, auction),
                objectArg(tx, request),
                objectArg(tx, pay_coin),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    anyone_sends_item_to_winner: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        auction: ObjectArg,
        item_addr: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::anyone_sends_item_to_winner`,
            typeArguments: [ type_coin ],
            arguments: [
                objectArg(tx, auction),
                tx.pure.address(item_addr),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    anyone_pays_funds: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        auction: ObjectArg,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::anyone_pays_funds`,
            typeArguments: [ type_coin ],
            arguments: [
                objectArg(tx, auction),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    admin_ends_auction_early: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        auction: ObjectArg,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_ends_auction_early`,
            typeArguments: [ type_coin ],
            arguments: [
                objectArg(tx, auction),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    admin_cancels_auction: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        auction: ObjectArg,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_cancels_auction`,
            typeArguments: [ type_coin ],
            arguments: [
                objectArg(tx, auction),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    admin_reclaims_item: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        auction: ObjectArg,
        item_addr: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_reclaims_item`,
            typeArguments: [ type_coin ],
            arguments: [
                objectArg(tx, auction),
                tx.pure.address(item_addr),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    admin_sets_pay_addr: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        auction: ObjectArg,
        pay_addr: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_sets_pay_addr`,
            typeArguments: [ type_coin ],
            arguments: [
                objectArg(tx, auction),
                tx.pure.address(pay_addr),
            ],
        });
    },

};
