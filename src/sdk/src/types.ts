/**
 * A Sui auction::Auction object
 */
export type AuctionObject = {
    id: string;
    item_id: string;
    begin_time_ms: number;
    end_time_ms: number;
    admin_addr: string;
    pay_addr: string;
    lead_addr: string;
    lead_value: bigint;
    minimum_bid: bigint;
    minimum_increase_bps: number;
    extension_period_ms: number;
};

/**
 * Check if an auction is live based on the current time.
 */
export function isAuctionLive(auction: AuctionObject): boolean {
    const currentTimeMs = Date.now();
    return currentTimeMs >= auction.begin_time_ms && currentTimeMs < auction.end_time_ms;
}
