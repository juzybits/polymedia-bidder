import { SuiClient, SuiObjectResponse, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { SignatureWithBytes } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { getCoinOfValue, getSuiObjectResponseFields, ObjectArg, SignTransaction } from "@polymedia/suitcase-core";
import { AuctionModule } from "./AuctionModule.js";
import { AuctionObject } from "./types.js";

/**
 * Execute transactions on the auction::auction Sui module.
 */
export class AuctionClient
{
    public readonly suiClient: SuiClient;
    public readonly packageId: string;
    public readonly coinType: string;
    public adminId: string | null;
    public readonly signTransaction: SignTransaction;

    constructor(
        suiClient: SuiClient,
        packageId: string,
        coinType: string,
        adminId: string | null,
        signTransaction: SignTransaction,
    ) {
        this.suiClient = suiClient;
        this.packageId = packageId;
        this.coinType = coinType;
        this.adminId = adminId;
        this.signTransaction = signTransaction;
    }

    // === setters ===

    public setAdminId(adminId: string|null): void {
        this.adminId = adminId;
    }

    // === data fetching ===

    public async getAuctions(
        auctionIds: string[],
    ): Promise<AuctionObject[]>
    {
        const pagObjRes = await this.suiClient.multiGetObjects({
            ids: auctionIds,
            options: { showContent: true }
        });
        const auctions = pagObjRes.map(objRes => this.parseAuction(objRes));
        return auctions;
    }

    /* eslint-disable */
    protected parseAuction( // TODO
        objRes: SuiObjectResponse,
    ): AuctionObject {
        const fields = getSuiObjectResponseFields(objRes);
        return {
            id: fields.id.id,
            item_id: fields.item.fields.id.id,
            begin_time_ms: Number(fields.begin_time_ms),
            end_time_ms: Number(fields.end_time_ms),
            admin_addr: fields.admin_addr,
            pay_addr: fields.pay_addr,
            lead_addr: fields.lead_addr,
            lead_value: BigInt(fields.lead_bal),
            minimum_bid: BigInt(fields.minimum_bid),
            minimum_increase_bps: Number(fields.minimum_increase_bps),
            extension_period_ms: Number(fields.extension_period_ms),
        };
    }
    /* eslint-enable */

    // === auction module calls ===

    public async new_admin(
        recipientAddr: string,
    ): Promise<SuiTransactionBlockResponse>
    {
        const tx = new Transaction();
        const [auctionAdmin] = AuctionModule.new_admin(tx, this.packageId);
        tx.transferObjects([auctionAdmin], recipientAddr);

        const signedTx = await this.signTransaction(tx);

        return this.executeTransaction(signedTx);
    }

    public async new_auction(
        recipientAddr: string,
        pay_addr: string,
        begin_time_ms: number,
        duration: number,
        minimum_bid: number,
        minimum_increase_bps: number,
        extension_period_ms: number,
    ): Promise<SuiTransactionBlockResponse>
    {
        if (this.adminId === null) {
            throw new Error("[AuctionClient.new_auction] this.adminId is null");
        }
        const tx = new Transaction();
        const [auctionObj] = AuctionModule.new_auction(
            tx,
            this.packageId,
            this.coinType,
            this.adminId,
            pay_addr,
            begin_time_ms,
            duration,
            minimum_bid,
            minimum_increase_bps,
            extension_period_ms,
        );

        tx.transferObjects([auctionObj], recipientAddr);

        const signedTx = await this.signTransaction(tx);

        return this.executeTransaction(signedTx);
    }

    public async bid(
        auction: ObjectArg,
        bid_amount: bigint,
        recipientAddr: string,
    ): Promise<SuiTransactionBlockResponse>
    {
        const tx = new Transaction();

        const [pay_coin] = await getCoinOfValue(
            this.suiClient, tx, recipientAddr, this.coinType, bid_amount
        );

        AuctionModule.bid(
            tx,
            this.packageId,
            this.coinType,
            auction,
            pay_coin,
        );

        const signedTx = await this.signTransaction(tx);

        return this.executeTransaction(signedTx);
    }

    public async claim(
        auction: ObjectArg,
        recipientAddr: string,
    ): Promise<SuiTransactionBlockResponse>
    {
        const tx = new Transaction();
        const [item] = AuctionModule.claim(
            tx,
            this.packageId,
            this.coinType,
            auction,
        );
        tx.transferObjects([item], recipientAddr);

        const signedTx = await this.signTransaction(tx);

        return this.executeTransaction(signedTx);
    }

    public async admin_claim(
        auction: ObjectArg,
    ): Promise<SuiTransactionBlockResponse>
    {
        if (this.adminId === null) {
            throw new Error("[AuctionClient.new_auction] this.adminId is null");
        }
        const tx = new Transaction();
        AuctionModule.admin_claim(
            tx,
            this.packageId,
            this.coinType,
            this.adminId,
            auction,
        );

        const signedTx = await this.signTransaction(tx);

        return this.executeTransaction(signedTx);
    }

    public async admin_cancel(
        auction: ObjectArg,
    ): Promise<SuiTransactionBlockResponse>
    {
        if (this.adminId === null) {
            throw new Error("[AuctionClient.new_auction] this.adminId is null");
        }
        const tx = new Transaction();
        AuctionModule.admin_cancel(
            tx,
            this.packageId,
            this.coinType,
            this.adminId,
            auction,
        );

        const signedTx = await this.signTransaction(tx);

        return this.executeTransaction(signedTx);
    }

    public async admin_set_pay_addr(
        auction: ObjectArg,
        pay_addr: string,
    ): Promise<SuiTransactionBlockResponse>
    {
        if (this.adminId === null) {
            throw new Error("[AuctionClient.new_auction] this.adminId is null");
        }
        const tx = new Transaction();
        AuctionModule.admin_set_pay_addr(
            tx,
            this.packageId,
            this.coinType,
            this.adminId,
            auction,
            pay_addr,
        );

        const signedTx = await this.signTransaction(tx);

        return this.executeTransaction(signedTx);
    }

    public async admin_destroy(
    ): Promise<SuiTransactionBlockResponse>
    {
        if (this.adminId === null) {
            throw new Error("[AuctionClient.new_auction] this.adminId is null");
        }
        const tx = new Transaction();
        AuctionModule.admin_destroy(
            tx,
            this.packageId,
            this.adminId,
        );

        const signedTx = await this.signTransaction(tx);

        return this.executeTransaction(signedTx);
    }

    // === helpers ===

    protected async executeTransaction(
        signedTx: SignatureWithBytes,
    ): Promise<SuiTransactionBlockResponse>
    {
        // console.debug("[AuctionClient] executing transaction");
        return await this.suiClient.executeTransactionBlock({
            transactionBlock: signedTx.bytes,
            signature: signedTx.signature,
            options: { showEffects: true },
        });
    }
}
