import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { ObjectArg, objectArg } from "@polymedia/suitcase-core";

/**
 * Build transactions for the auction::auction Sui module.
 */
export const AuctionModule =
{
    anyone_creates_admin: (
        tx: Transaction,
        packageId: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::anyone_creates_admin`,
        });
    },

    admin_creates_auction: (
        tx: Transaction,
        packageId: string,
        coinType: string,
        pay_addr: string,
        begin_time_ms: number,
        duration: number,
        minimum_bid: number,
        minimum_increase_bps: number,
        extension_period_ms: number,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_creates_auction`,
            typeArguments: [ coinType ],
            arguments: [
                tx.pure.address(pay_addr),
                tx.pure.u64(begin_time_ms),
                tx.pure.u64(duration),
                tx.pure.u64(minimum_bid),
                tx.pure.u64(minimum_increase_bps),
                tx.pure.u64(extension_period_ms),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    admin_adds_item: (
        tx: Transaction,
        packageId: string,
        coinType: string,
        itemType: string,
        auction: ObjectArg,
        item: ObjectArg,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_adds_item`,
            typeArguments: [ coinType, itemType ],
            arguments: [
                objectArg(tx, auction),
                objectArg(tx, item),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    anyone_bids: (
        tx: Transaction,
        packageId: string,
        coinType: string,
        auction: ObjectArg,
        pay_coin: ObjectArg,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::anyone_bids`,
            typeArguments: [ coinType ],
            arguments: [
                objectArg(tx, auction),
                objectArg(tx, pay_coin),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    winner_takes_item: (
        tx: Transaction,
        packageId: string,
        coinType: string,
        auction: ObjectArg,
        item_addr: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::winner_takes_item`,
            typeArguments: [ coinType ],
            arguments: [
                objectArg(tx, auction),
                tx.pure.address(item_addr),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    anyone_sends_item_to_winner: (
        tx: Transaction,
        packageId: string,
        coinType: string,
        auction: ObjectArg,
        item_addr: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::anyone_sends_item_to_winner`,
            typeArguments: [ coinType ],
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
        coinType: string,
        auction: ObjectArg,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::anyone_pays_funds`,
            typeArguments: [ coinType ],
            arguments: [
                objectArg(tx, auction),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    admin_ends_auction_early: (
        tx: Transaction,
        packageId: string,
        coinType: string,
        auction: ObjectArg,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_ends_auction_early`,
            typeArguments: [ coinType ],
            arguments: [
                objectArg(tx, auction),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    admin_cancels_auction: (
        tx: Transaction,
        packageId: string,
        coinType: string,
        auction: ObjectArg,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_cancels_auction`,
            typeArguments: [ coinType ],
            arguments: [
                objectArg(tx, auction),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    admin_reclaims_item: (
        tx: Transaction,
        packageId: string,
        coinType: string,
        auction: ObjectArg,
        item_addr: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_reclaims_item`,
            typeArguments: [ coinType ],
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
        coinType: string,
        auction: ObjectArg,
        pay_addr: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_sets_pay_addr`,
            typeArguments: [ coinType ],
            arguments: [
                objectArg(tx, auction),
                tx.pure.address(pay_addr),
            ],
        });
    },

    admin_destroys_admin: (
        tx: Transaction,
        packageId: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_destroys_admin`,
            typeArguments: [],
            arguments: [
            ],
        });
    },
};
