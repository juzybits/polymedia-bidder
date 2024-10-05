import { SuiObjectResponse } from "@mysten/sui/client";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { objResToFields, objResToType, ZERO_ADDRESS } from "@polymedia/suitcase-core";
import { SuiItem } from "./items.js";

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
    is_canceled: boolean;
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

/* eslint-disable */
export function parseAuctionObj(
    resp: SuiObjectResponse,
): AuctionObj | null
{
    let fields: Record<string, any>;
    let objType: string;
    try {
        fields = objResToFields(resp);
        objType = objResToType(resp);
    } catch (_err) {
        return null;
    }

    const currentTimeMs = Date.now();
    const beginTimeMs = Number(fields.begin_time_ms);
    const endTimeMs = Number(fields.end_time_ms);

    // example objType: "0x12345::auction::Auction<0x2::sui::SUI>"
    const type_coin = objType.split("<")[1].split(">")[0];

    const lead_addr = normalizeSuiAddress(fields.lead_addr);
    const lead_value = BigInt(fields.lead_bal);
    const has_started = currentTimeMs >= beginTimeMs;
    const has_ended = currentTimeMs >= endTimeMs;
    const is_live = has_started && !has_ended;
    const has_leader = lead_addr !== ZERO_ADDRESS;
    const has_balance = lead_value > 0n;
    const is_canceled = has_ended && !has_leader;
    return {
        // struct types
        type_coin,
        // fields that map 1:1 to on-chain struct fields
        id: fields.id.id,
        name: fields.name,
        description: fields.description,
        item_addrs: fields.item_addrs,
        item_bag: {
            id: fields.item_bag.fields.id.id,
            size: fields.item_bag.fields.size,
        },
        admin_addr: fields.admin_addr,
        pay_addr: fields.pay_addr,
        lead_addr,
        lead_value,
        begin_time_ms: beginTimeMs,
        end_time_ms: endTimeMs,
        minimum_bid: BigInt(fields.minimum_bid),
        minimum_increase_bps: Number(fields.minimum_increase_bps),
        extension_period_ms: Number(fields.extension_period_ms),
        // derived fields
        has_started,
        has_ended,
        is_live,
        is_canceled,
        has_leader,
        has_balance,
        can_anyone_pay_funds: has_ended && has_balance,
        can_anyone_send_items_to_winner: has_ended && has_leader && Number(fields.item_bag.fields.size) > 0,
        can_admin_accept_bid: is_live && has_leader,
        can_admin_cancel_auction: !has_ended,
        can_admin_reclaim_items: has_ended && !has_leader && Number(fields.item_bag.fields.size) > 0,
        can_admin_set_pay_addr: !has_ended || (has_ended && has_balance),
    };
}
/* eslint-enable */

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
