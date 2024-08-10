module auction::auction;

// === Imports ===

use sui::bag::{Self, Bag};
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};

// === Errors ===

const E_WRONG_TIME: u64 = 5000;
const E_WRONG_ADMIN: u64 = 5001;
const E_WRONG_ADDRESS: u64 = 5002;
const E_WRONG_DURATION: u64 = 5003;
const E_TOO_MANY_ITEMS: u64 = 5004;
const E_WRONG_COIN_VALUE: u64 = 5005;
const E_WRONG_MINIMUM_BID: u64 = 5006;
const E_WRONG_MINIMUM_INCREASE: u64 = 5007;
const E_WRONG_EXTENSION_PERIOD: u64 = 5008;

// === Constants ===

const ZERO_ADDRESS: address = @0x0;
const MAX_ITEMS: u64 = 250;
// const MAX_DURATION: u64 = 100 * 24 * 60 * 60 * 1000; // 100 days // TODO

// === Structs ===

public struct AuctionAdmin has store, key {
    id: UID,
}

public struct Auction<phantom CoinType> has store, key {
    id: UID,
    // addresses of the auctioned items
    item_addrs: vector<address>,
    // auctioned items are stored as dynamic fields in this bag
    item_bag: Bag,
    // address of the AuctionAdmin object that controls this auction
    admin_addr: address,
    // address that will receive the funds of the winning bid
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

// === Public-Mutative Functions ===

public fun new_admin(
    ctx: &mut TxContext,
): AuctionAdmin {
    return AuctionAdmin { id: object::new(ctx) }
}

public fun new_auction<CoinType>(
    admin: &AuctionAdmin,
    pay_addr: address,
    begin_time_ms: u64,
    duration: u64,
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

    assert!(adjusted_begin_time_ms >= current_time, E_WRONG_TIME);
    assert!(duration > 0, E_WRONG_DURATION);
    assert!(minimum_bid > 0, E_WRONG_MINIMUM_BID);
    assert!(minimum_increase_bps > 0, E_WRONG_MINIMUM_INCREASE);
    assert!(extension_period_ms > 0, E_WRONG_EXTENSION_PERIOD);

    let auction = Auction {
        id: object::new(ctx),
        item_addrs: vector::empty(),
        item_bag: bag::new(ctx),
        admin_addr: object::id_address(admin),
        pay_addr,
        lead_addr: ZERO_ADDRESS,
        lead_bal: balance::zero(),
        begin_time_ms: adjusted_begin_time_ms,
        end_time_ms: adjusted_begin_time_ms + duration,
        minimum_bid,
        minimum_increase_bps,
        extension_period_ms,
    };
    return auction
}

/// Anyone can bid for an item, as long as the auction hasn't ended.
public fun bid<CoinType>(
    auction: &mut Auction<CoinType>,
    pay_coin: Coin<CoinType>,
    clock: &Clock,
    ctx: &mut TxContext,
)
{
    let current_time = clock.timestamp_ms();
    assert!(current_time >= auction.begin_time_ms, E_WRONG_TIME);
    assert!(current_time < auction.end_time_ms, E_WRONG_TIME);
    assert!(pay_coin.value() >= auction.minimum_bid, E_WRONG_COIN_VALUE);

    // send the auction balance to the previous leader, who has just been outbid
    if (auction.lead_bal.value() > 0) {
        let prev_lead_bal = balance::withdraw_all(&mut auction.lead_bal);
        let prev_lead_coin = coin::from_balance(prev_lead_bal, ctx);
        transfer::public_transfer(prev_lead_coin, auction.lead_addr);
    };

    // update the leader and keep their coin balance
    auction.lead_addr = ctx.sender();
    auction.lead_bal.join(pay_coin.into_balance());

    // update minimum_bid
    let lead_value_u256 = auction.lead_bal.value() as u256;
    let min_increase_u256 = auction.minimum_increase_bps as u256;
    let mut new_minimum_bid = ((lead_value_u256 * (10000 + min_increase_u256)) / 10000) as u64;
    if (new_minimum_bid == auction.minimum_bid) { // can happen for tiny values due to truncation
        new_minimum_bid = new_minimum_bid + 1;
    };
    auction.minimum_bid = new_minimum_bid;

    // extend auction end time if within the extension period
    if (current_time >= auction.end_time_ms - auction.extension_period_ms) {
        auction.end_time_ms = auction.end_time_ms + auction.extension_period_ms;
    };
}

/// The winner of the auction can call this function, after the auction ends.
/// - auction is destroyed
/// - balance is sent to pay_addr
/// - item is given to the winner (tx sender)
public fun claim<CoinType>(
    auction: Auction<CoinType>,
    clock: &Clock,
    ctx: &mut TxContext,
): ItemType
{
    assert!(ctx.sender() == auction.lead_addr, E_WRONG_ADDRESS);
    assert!(clock.timestamp_ms() >= auction.end_time_ms, E_WRONG_TIME);

    // destroy the auction object
    let Auction {
        id,
        item,
        pay_addr,
        lead_bal,
        ..
    } = auction;
    id.delete();

    // transfer balance to pay_addr
    let lead_coin = coin::from_balance(lead_bal, ctx);
    transfer::public_transfer(lead_coin, pay_addr);

    // give the item to the winner of the auction
    return item
}

// === Admin Functions ===

/// Admin can add items to the auction any time before the auction ends
public fun add_item<CoinType, ItemType: key+store>(
    admin: &AuctionAdmin,
    auction: &mut Auction<CoinType>,
    item: ItemType,
    clock: &Clock,
)
{
    assert!(object::id_address(admin) == auction.admin_addr, E_WRONG_ADMIN);
    assert!(auction.item_bag.length() < MAX_ITEMS, E_TOO_MANY_ITEMS);
    assert!(clock.timestamp_ms() < auction.end_time_ms, E_WRONG_TIME);
    auction.item_bag.add(object::id_address(&item), item);
}

/// Admin can end the auction ahead of time:
/// - auction is destroyed
/// - balance is sent to pay_addr (if any)
/// - item is sent to the winner (if any), otherwise sent to the admin (tx sender)
public fun admin_claim<CoinType>(
    admin: &AuctionAdmin,
    auction: Auction<CoinType>,
    ctx: &mut TxContext,
)
{
    assert!(object::id_address(admin) == auction.admin_addr, E_WRONG_ADMIN);

    // destroy the auction object
    let Auction {
        id,
        item,
        lead_addr,
        pay_addr,
        lead_bal,
        ..
    } = auction;
    id.delete();

    if (lead_bal.value() > 0) {
        // send balance to pay_addr
        let lead_coin = coin::from_balance(lead_bal, ctx);
        transfer::public_transfer(lead_coin, pay_addr);
        // send item to the winner
        transfer::public_transfer(item, lead_addr);
    } else {
        lead_bal.destroy_zero();
        // send item to the admin
        transfer::public_transfer(item, ctx.sender())
    };
}

/// Admin can cancel the auction at any time:
/// - auction is destroyed
/// - balance is sent back to the leader
/// - item is given to the admin (tx sender)
public fun admin_cancel<CoinType>(
    admin: &AuctionAdmin,
    auction: Auction<CoinType>,
    ctx: &mut TxContext,
): ItemType
{
    assert!(object::id_address(admin) == auction.admin_addr, E_WRONG_ADMIN);

    // destroy the auction object
    let Auction {
        id,
        item,
        lead_bal,
        lead_addr,
        ..
    } = auction;
    id.delete();

    // transfer balance back to the leader
    if (lead_bal.value() > 0) {
        let lead_coin = coin::from_balance(lead_bal, ctx);
        transfer::public_transfer(lead_coin, lead_addr);
    } else {
        balance::destroy_zero(lead_bal);
    };

    // give the item to the admin
    return item
}

public fun admin_set_pay_addr<CoinType>(
    admin: &AuctionAdmin,
    auction: &mut Auction<CoinType>,
    pay_addr: address,
)
{
    assert!(object::id_address(admin) == auction.admin_addr, E_WRONG_ADMIN);
    auction.pay_addr = pay_addr;
}

public fun admin_destroy(
    admin: AuctionAdmin,
)
{
    let AuctionAdmin { id } = admin;
    id.delete();
}

// === Public-View Functions ===

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

// === Public-Package Functions ===

// === Private Functions ===

// === Test Functions ===
