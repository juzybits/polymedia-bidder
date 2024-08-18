module auction::auction;

// === imports ===

use std::string::{String};
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::object_bag::{Self, ObjectBag};

// === errors ===

#[error] const E_WRONG_TIME: vector<u8> = b"E_WRONG_TIME";
#[error] const E_WRONG_ADMIN: vector<u8> = b"E_WRONG_ADMIN";
#[error] const E_WRONG_ADDRESS: vector<u8> = b"E_WRONG_ADDRESS";
#[error] const E_WRONG_DURATION: vector<u8> = b"E_WRONG_DURATION";
#[error] const E_TOO_MANY_ITEMS: vector<u8> = b"E_TOO_MANY_ITEMS";
#[error] const E_WRONG_COIN_VALUE: vector<u8> = b"E_WRONG_COIN_VALUE";
#[error] const E_WRONG_MINIMUM_BID: vector<u8> = b"E_WRONG_MINIMUM_BID";
#[error] const E_WRONG_MINIMUM_INCREASE: vector<u8> = b"E_WRONG_MINIMUM_INCREASE";
#[error] const E_WRONG_EXTENSION_PERIOD: vector<u8> = b"E_WRONG_EXTENSION_PERIOD";
#[error] const E_CANT_RECLAIM_WITH_BIDS: vector<u8> = b"E_CANT_RECLAIM_WITH_BIDS";

// === constants ===

const ZERO_ADDRESS: address = @0x0;
const MAX_ITEMS: u64 = 50;
const MAX_DURATION_MS: u64 = 100 * 24 * 60 * 60 * 1000; // 100 days
const MAX_INCREASE_BPS: u64 = 1000_00; // 1000% (10x)
const MAX_EXTENSION_PERIOD_MS: u64 = 10 * 24 * 60 * 60 * 1000; // 10 days

// === structs ===

public struct Auction<phantom CoinType> has store, key {
    id: UID,
    name: String,
    description: String,
    // addresses of the auctioned items
    item_addrs: vector<address>,
    // auctioned items are stored as dynamic fields in this bag
    item_bag: ObjectBag,
    // auction creator and manager
    admin_addr: address,
    // recipient of the winning bid funds
    pay_addr: address,
    // address that submitted the highest bid so far
    lead_addr: address,
    // value of the highest bid so far
    lead_bal: Balance<CoinType>,
    // when the auction starts (timestamp in milliseconds)
    begin_time_ms: u64,
    // when the auction ends (timestamp in milliseconds)
    end_time_ms: u64,
    // minimum bid size; increases with every bid
    minimum_bid: u64,
    // new bids must exceed the current highest bid by these many basis points
    minimum_increase_bps: u64,
    // bids placed within this period before end_time_ms will extend end_time_ms by extension_period_ms
    extension_period_ms: u64,
}

// === mutative functions ===

public fun admin_creates_auction<CoinType>(
    name: vector<u8>,
    description: vector<u8>,
    pay_addr: address,
    begin_time_ms: u64,
    duration_ms: u64,
    minimum_bid: u64,
    minimum_increase_bps: u64,
    extension_period_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): Auction<CoinType>
{
    let current_time = clock.timestamp_ms();
    let adjusted_begin_time_ms =
        if (begin_time_ms == 0) { current_time }
        else { begin_time_ms };

    assert!( pay_addr != ZERO_ADDRESS, E_WRONG_ADDRESS );
    assert!( adjusted_begin_time_ms >= current_time, E_WRONG_TIME );
    assert!( duration_ms > 0 && duration_ms <= MAX_DURATION_MS, E_WRONG_DURATION );
    assert!( minimum_bid > 0, E_WRONG_MINIMUM_BID );
    assert!( minimum_increase_bps > 0 && minimum_increase_bps <= MAX_INCREASE_BPS, E_WRONG_MINIMUM_INCREASE );
    assert!( extension_period_ms > 0 && extension_period_ms <= MAX_EXTENSION_PERIOD_MS, E_WRONG_EXTENSION_PERIOD );

    let auction = Auction {
        name: name.to_string(),
        description: description.to_string(),
        id: object::new(ctx),
        item_addrs: vector::empty(),
        item_bag: object_bag::new(ctx),
        admin_addr: ctx.sender(),
        pay_addr,
        lead_addr: ZERO_ADDRESS,
        lead_bal: balance::zero(),
        begin_time_ms: adjusted_begin_time_ms,
        end_time_ms: adjusted_begin_time_ms + duration_ms,
        minimum_bid,
        minimum_increase_bps,
        extension_period_ms,
    };
    return auction
}

/// Admin can add items to the auction any time before the auction ends
public fun admin_adds_item<CoinType, ItemType: key+store>(
    auction: &mut Auction<CoinType>,
    item: ItemType,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!( !auction.has_ended(clock), E_WRONG_TIME );
    assert!( auction.admin_addr == ctx.sender(), E_WRONG_ADMIN );
    assert!( auction.item_bag.length() < MAX_ITEMS, E_TOO_MANY_ITEMS );

    let item_addr = object::id_address(&item);
    auction.item_addrs.push_back(item_addr);
    auction.item_bag.add(item_addr, item);
}

/// Anyone can bid for an item, as long as the auction hasn't ended.
public fun anyone_bids<CoinType>(
    auction: &mut Auction<CoinType>,
    pay_coin: Coin<CoinType>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!( auction.is_live(clock), E_WRONG_TIME );
    assert!( auction.minimum_bid <= pay_coin.value(), E_WRONG_COIN_VALUE );

    // send the auction balance to the previous leader, who has just been outbid
    if (auction.lead_value() > 0) {
        let prev_lead_bal = balance::withdraw_all(&mut auction.lead_bal);
        let prev_lead_coin = coin::from_balance(prev_lead_bal, ctx);
        transfer::public_transfer(prev_lead_coin, auction.lead_addr);
    };

    // update the leader and keep their coin balance
    auction.lead_addr = ctx.sender();
    auction.lead_bal.join(pay_coin.into_balance());

    // update minimum_bid
    let lead_value_u256 = auction.lead_value() as u256;
    let min_increase_u256 = auction.minimum_increase_bps as u256;
    let mut new_minimum_bid = ((lead_value_u256 * (10000 + min_increase_u256)) / 10000) as u64;
    if (new_minimum_bid == auction.minimum_bid) { // can happen for tiny values due to truncation
        new_minimum_bid = new_minimum_bid + 1;
    };
    auction.minimum_bid = new_minimum_bid;

    // extend auction end time if within the extension period
    if (clock.timestamp_ms() >= auction.end_time_ms - auction.extension_period_ms) {
        auction.end_time_ms = auction.end_time_ms + auction.extension_period_ms;
    };
}

/// The winner of the auction can take the items after the auction ends.
public fun winner_takes_item<CoinType, ItemType: key+store>(
    auction: &mut Auction<CoinType>,
    item_addr: address,
    clock: &Clock,
    ctx: &mut TxContext,
): Option<ItemType>
{
    assert!( auction.has_ended(clock), E_WRONG_TIME );
    assert!( auction.lead_addr == ctx.sender(), E_WRONG_ADDRESS );

    // send funds to pay_addr (if any)
    auction.anyone_pays_funds(clock, ctx);

    // give the item to the sender
    // (but keep the item address in auction.item_addrs)
    if (auction.item_bag.contains(item_addr)) {
        let item = auction.item_bag.remove<address, ItemType>(item_addr);
        return option::some(item)
    } else {
        return option::none()
    }
}

/// Anyone can transfer the items to the winner of the auction after it ends.
public fun anyone_sends_item_to_winner<CoinType, ItemType: key+store>(
    auction: &mut Auction<CoinType>,
    item_addr: address,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!( auction.has_ended(clock), E_WRONG_TIME );
    assert!( auction.has_leader(), E_WRONG_ADDRESS );

    // send funds to pay_addr (if any)
    auction.anyone_pays_funds(clock, ctx);

    // send the item to the winner
    // (but keep the item address in auction.item_addrs)
    if (auction.item_bag.contains(item_addr)) {
        let item = auction.item_bag.remove<address, ItemType>(item_addr);
        transfer::public_transfer(item, auction.lead_addr);
    };
}

/// Transfer the funds to auction.pay_addr after the auction ends.
public fun anyone_pays_funds<CoinType>(
    auction: &mut Auction<CoinType>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!( auction.has_ended(clock), E_WRONG_TIME );

    if (auction.lead_value() > 0) {
        let lead_coin = auction.lead_bal.withdraw_all().into_coin(ctx);
        transfer::public_transfer(lead_coin, auction.pay_addr);
    }
}

/// Admin can end the auction ahead of time and send the funds to the winner (if any).
public fun admin_ends_auction_early<CoinType>(
    auction: &mut Auction<CoinType>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!( !auction.has_ended(clock), E_WRONG_TIME );
    assert!( auction.admin_addr == ctx.sender(), E_WRONG_ADMIN );

    // end auction immediately
    auction.end_time_ms = clock.timestamp_ms();

    // send funds to winner (if any)
    auction.anyone_pays_funds(clock, ctx);
}

/// Admin can cancel the auction at any time and return the funds to the leader (if any).
public fun admin_cancels_auction<CoinType>(
    auction: &mut Auction<CoinType>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!( !auction.has_ended(clock), E_WRONG_TIME );
    assert!( auction.admin_addr == ctx.sender(), E_WRONG_ADMIN );

    // end auction immediately
    auction.end_time_ms = clock.timestamp_ms();

    if (auction.lead_value() > 0) {
        // return funds to leader
        let lead_coin = auction.lead_bal.withdraw_all().into_coin(ctx);
        transfer::public_transfer(lead_coin, auction.lead_addr);
        // nobody wins the auction
        auction.lead_addr = ZERO_ADDRESS;
    };
}

/// Admin can reclaim the items if the auction ended without a leader,
/// either because it was cancelled or because nobody bid.
public fun admin_reclaims_item<CoinType, ItemType: key+store>(
    auction: &mut Auction<CoinType>,
    item_addr: address,
    clock: &Clock,
    ctx: &mut TxContext,
): ItemType
{
    assert!( auction.has_ended(clock), E_WRONG_TIME );
    assert!( auction.admin_addr == ctx.sender(), E_WRONG_ADMIN );
    assert!( !auction.has_leader(), E_CANT_RECLAIM_WITH_BIDS );

    let (item_exists, item_idx) = auction.item_addrs.index_of(&item_addr);
    assert!( item_exists, E_WRONG_ADDRESS ); // should never happen

    auction.item_addrs.remove(item_idx);
    let item = auction.item_bag.remove<address, ItemType>(item_addr);
    return item
}

public fun admin_sets_pay_addr<CoinType>(
    auction: &mut Auction<CoinType>,
    pay_addr: address,
    ctx: &mut TxContext,
) {
    assert!( auction.admin_addr == ctx.sender(), E_WRONG_ADMIN );
    auction.pay_addr = pay_addr;
}

// === public status helpers ===

public fun has_ended<CoinType>(
    auction: &Auction<CoinType>,
    clock: &Clock,
): bool {
    return clock.timestamp_ms() >= auction.end_time_ms
}

public fun is_live<CoinType>(
    auction: &Auction<CoinType>,
    clock: &Clock,
): bool {
    return clock.timestamp_ms() >= auction.begin_time_ms && !auction.has_ended(clock)
}

public fun has_leader<CoinType>(
    auction: &Auction<CoinType>,
): bool {
    return auction.lead_addr != ZERO_ADDRESS
}

// === public accessors ===

public fun item_addrs<CoinType>(
    auction: &Auction<CoinType>,
): &vector<address> {
    &auction.item_addrs
}
public fun admin_addr<CoinType>(
    auction: &Auction<CoinType>,
): address {
    auction.admin_addr
}
public fun pay_addr<CoinType>(
    auction: &Auction<CoinType>,
): address {
    auction.pay_addr
}
public fun lead_addr<CoinType>(
    auction: &Auction<CoinType>,
): address {
    auction.lead_addr
}
public fun lead_value<CoinType>(
    auction: &Auction<CoinType>,
): u64 {
    auction.lead_bal.value()
}
public fun begin_time_ms<CoinType>(
    auction: &Auction<CoinType>,
): u64 {
    auction.begin_time_ms
}
public fun end_time_ms<CoinType>(
    auction: &Auction<CoinType>,
): u64 {
    auction.end_time_ms
}
public fun minimum_bid<CoinType>(
    auction: &Auction<CoinType>,
): u64 {
    auction.minimum_bid
}
public fun minimum_increase_bps<CoinType>(
    auction: &Auction<CoinType>,
): u64 {
    auction.minimum_increase_bps
}
public fun extension_period_ms<CoinType>(
    auction: &Auction<CoinType>,
): u64 {
    auction.extension_period_ms
}

// === public-package functions ===

// === private functions ===

// === test functions ===
