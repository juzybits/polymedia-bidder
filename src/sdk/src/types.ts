import { bcs } from "@mysten/sui/bcs";

/**
 * A Sui auction::Auction object
 */
export type AuctionObj = {
    // === struct types ===
    type_coin: string;
    // === fields that map 1:1 to on-chain struct fields ===
    id: string;
    name: string;
    description: string;
    /** addresses of the auctioned items */
    item_addrs: string[];
    /** auctioned items are stored as dynamic fields in this bag */
    item_bag: { id: string; size: number };
    /** auction creator and manager */
    admin_addr: string;
    /** recipient of the winning bid funds */
    pay_addr: string;
    /** address that submitted the highest bid so far */
    lead_addr: string;
    /** value of the highest bid so far */
    lead_value: bigint;
    /** when the auction starts (timestamp in milliseconds) */
    begin_time_ms: number;
    /** when the auction ends (timestamp in milliseconds) */
    end_time_ms: number;
    /** minimum bid size; increases with every bid */
    minimum_bid: bigint;
    /** new bids must exceed the current highest bid by these many basis points */
    minimum_increase_bps: number;
    /** bids placed within this period before end_time_ms will extend end_time_ms by extension_period_ms */
    extension_period_ms: number;
    // === derived fields ===
    is_live: boolean;
};

/**
 * An `auction::admin_creates_auction` transaction
 */
export type TxAdminCreatesAuction = {
    digest: string;
    timestamp: string;
    sender: string;
    auctionId: string;
    inputs: {
        type_coin: string;
        name: string;
        description: string;
        pay_addr: string;
        begin_time_ms: number;
        duration_ms: number;
        minimum_bid: bigint;
        minimum_increase_bps: number;
        extension_period_ms: number;
        item_addrs: string[];
    };
};

export const UserBidBcs = bcs.struct("Bid", {
    auction_id: bcs.Address,
    time: bcs.U64,
    amount: bcs.U64,
});

export type UserBid = typeof UserBidBcs.$inferType;

/**
 * Check if an auction is live based on the current time.
 */
export function isAuctionLive(auction: AuctionObj): boolean {
    const currentTimeMs = Date.now();
    return currentTimeMs >= auction.begin_time_ms && currentTimeMs < auction.end_time_ms;
}
