import { bcs } from "@mysten/sui/bcs";
import { SuiItem } from "./items";

// === auction module objects ===

/**
 * A Sui bidder::auction::Auction object
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
    has_started: boolean;
    has_ended: boolean;
    is_live: boolean;
    is_cancelled: boolean;
    has_leader: boolean;
    has_balance: boolean;
    can_anyone_pay_funds: boolean;
    can_anyone_send_items_to_winner: boolean;
    can_admin_accept_bid: boolean;
    can_admin_cancel_auction: boolean;
    can_admin_reclaim_items: boolean;
    can_admin_set_pay_addr: boolean;
};

export type AuctionWithItems = AuctionObj & {
    items: SuiItem[];
};

export function isAuctionObj(obj: unknown): obj is AuctionObj {
    return typeof obj === "object" && obj !== null && "can_admin_cancel_auction" in obj;
}

/**
 * Check if an auction is live based on the current time.
 */
export function isAuctionLive(auction: AuctionObj): boolean {
    const currentTimeMs = Date.now();
    return currentTimeMs >= auction.begin_time_ms && currentTimeMs < auction.end_time_ms;
}

// === user module objects ===

export const UserAuctionBcs = bcs.struct("UserAuction", {
    auction_addr: bcs.Address,
    time: bcs.U64,
});

export type UserAuction = {
    auction_addr: string;
    time: number;
};

export const UserBidBcs = bcs.struct("UserBid", {
    auction_addr: bcs.Address,
    time: bcs.U64,
    amount: bcs.U64,
});

export type UserBid = {
    auction_addr: string;
    time: number;
    amount: bigint;
};

// === transactions ===

export type AnyAuctionTx = TxAdminCreatesAuction | TxAnyoneBids | TxAnyonePaysFunds | TxAnyoneSendsItemToWinner;

type TxBase = {
    digest: string;
    timestamp: number;
    sender: string;
};

/**
 * A `bidder::auction::admin_creates_auction` transaction
 */
export type TxAdminCreatesAuction = TxBase & {
    kind: "admin_creates_auction";
    auctionId: string;
    inputs: {
        type_coin: string;
        name: string;
        description: string;
        item_addrs: string[];
        pay_addr: string;
        begin_delay_ms: number;
        duration_ms: number;
        minimum_bid: bigint;
        minimum_increase_bps: number;
        extension_period_ms: number;
    };
};

/**
 * A `bidder::auction::anyone_bids` transaction
 */
export type TxAnyoneBids = TxBase & {
    kind: "anyone_bids";
    inputs: {
        type_coin: string;
        auction_addr: string;
        amount: bigint;
    };
};

/**
 * A `bidder::auction::anyone_pays_funds`
 */
export type TxAnyonePaysFunds = TxBase & {
    kind: "anyone_pays_funds";
    inputs: {
        type_coin: string;
        auction_addr: string;
    };
};

/**
 * A `bidder::auction::anyone_sends_item_to_winner` transaction
 */
export type TxAnyoneSendsItemToWinner = TxBase & {
    kind: "anyone_sends_item_to_winner";
    inputs: {
        type_coin: string;
        type_item: string;
        auction_addr: string;
        item_addr: string;
    };
};
