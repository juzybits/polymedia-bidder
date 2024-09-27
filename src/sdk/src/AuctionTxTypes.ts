/**
 * Any `bidder::auction` transaction.
 */
export type AnyAuctionTx =
    | TxAdminCreatesAuction
    | TxAnyoneBids
    | TxAnyonePaysFunds
    | TxAnyoneSendsItemToWinner
    // | TxAdminAcceptsBid
    | TxAdminCancelsAuction
    | TxAdminSetsPayAddr;

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

/**
 * A `bidder::auction::admin_accepts_bid` transaction
 */
export type TxAdminAcceptsBid = TxBase & {
    kind: "admin_accepts_bid";
    inputs: {
        type_coin: string;
        auction_addr: string;
    };
};

/**
 * A `bidder::auction::admin_cancels_auction` transaction
 */
export type TxAdminCancelsAuction = TxBase & {
    kind: "admin_cancels_auction";
    inputs: {
        type_coin: string;
        auction_addr: string;
    };
};

/**
 * A `bidder::auction::admin_sets_pay_addr` transaction
 */
export type TxAdminSetsPayAddr = TxBase & {
    kind: "admin_sets_pay_addr";
    inputs: {
        type_coin: string;
        auction_addr: string;
        pay_addr: string;
    };
};
