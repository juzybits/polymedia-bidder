import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { ObjectArg, objectArg } from "@polymedia/suitcase-core";

/**
 * Build transactions for the auction::auction Sui module.
 */
export const AuctionModule =
{
    new_admin: (
        tx: Transaction,
        packageId: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::new_admin`,
            arguments: [],
        });
    },

    new_auction: (
        tx: Transaction,
        packageId: string,
        coinType: string,
        itemType: string,
        admin: ObjectArg,
        item: ObjectArg,
        begin_time_ms: number,
        duration: number,
        pay_addr: string,
        minimum_bid: number,
        minimum_increase_bps: number,
        extension_period_ms: number,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::new_auction`,
            typeArguments: [ coinType, itemType ],
            arguments: [
                objectArg(tx, admin),
                objectArg(tx, item),
                tx.pure.u64(begin_time_ms),
                tx.pure.u64(duration),
                tx.pure.address(pay_addr),
                tx.pure.u64(minimum_bid),
                tx.pure.u64(minimum_increase_bps),
                tx.pure.u64(extension_period_ms),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    bid: (
        tx: Transaction,
        packageId: string,
        coinType: string,
        itemType: string,
        auction: ObjectArg,
        pay_coin: ObjectArg,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::bid`,
            typeArguments: [ coinType, itemType ],
            arguments: [
                objectArg(tx, auction),
                objectArg(tx, pay_coin),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    claim: (
        tx: Transaction,
        packageId: string,
        coinType: string,
        itemType: string,
        auction: ObjectArg,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::claim`,
            typeArguments: [ coinType, itemType ],
            arguments: [
                objectArg(tx, auction),
                tx.object(SUI_CLOCK_OBJECT_ID),
            ],
        });
    },

    admin_claim: (
        tx: Transaction,
        packageId: string,
        coinType: string,
        itemType: string,
        admin: ObjectArg,
        auction: ObjectArg,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_claim`,
            typeArguments: [ coinType, itemType ],
            arguments: [
                objectArg(tx, admin),
                objectArg(tx, auction),
            ],
        });
    },

    admin_cancel: (
        tx: Transaction,
        packageId: string,
        coinType: string,
        itemType: string,
        admin: ObjectArg,
        auction: ObjectArg,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_cancel`,
            typeArguments: [ coinType, itemType ],
            arguments: [
                objectArg(tx, admin),
                objectArg(tx, auction),
            ],
        });
    },

    admin_set_pay_addr: (
        tx: Transaction,
        packageId: string,
        coinType: string,
        itemType: string,
        admin: ObjectArg,
        auction: ObjectArg,
        pay_addr: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_set_pay_addr`,
            typeArguments: [ coinType, itemType ],
            arguments: [
                objectArg(tx, admin),
                objectArg(tx, auction),
                tx.pure.address(pay_addr),
            ],
        });
    },

    admin_destroy: (
        tx: Transaction,
        packageId: string,
        admin: ObjectArg,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::auction::admin_destroy`,
            typeArguments: [],
            arguments: [
                objectArg(tx, admin),
            ],
        });
    },
};
