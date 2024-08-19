module auction::auction;

// === imports ===

use std::string::{String, utf8};
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::display;
use sui::object_bag::{Self, ObjectBag};
use sui::package;

use auction::history::{History};

// === errors ===

const E_WRONG_TIME: u64 = 5000;
const E_WRONG_ADMIN: u64 = 5001;
const E_WRONG_ADDRESS: u64 = 5002;
const E_WRONG_DURATION: u64 = 5003;
const E_TOO_MANY_ITEMS: u64 = 5004;
const E_WRONG_COIN_VALUE: u64 = 5005;
const E_WRONG_MINIMUM_BID: u64 = 5006;
const E_WRONG_MINIMUM_INCREASE: u64 = 5007;
const E_WRONG_EXTENSION_PERIOD: u64 = 5008;
const E_CANT_RECLAIM_WITH_BIDS: u64 = 5009;

// === constants ===

const ZERO_ADDRESS: address = @0x0;
const MAX_ITEMS: u64 = 50;
const MAX_BEGIN_TIME_MS: u64 = 100 * 24 * 60 * 60 * 1000; // 100 days in the future
const MIN_DURATION_MS: u64 = 10 * 1000; // 10 seconds
const MAX_DURATION_MS: u64 = 100 * 24 * 60 * 60 * 1000; // 100 days
const MIN_MINIMUM_INCREASE_BPS: u64 = 10; // 0.1%
const MAX_MINIMUM_INCREASE_BPS: u64 = 1000 * 100; // 1,000%
const MAX_EXTENSION_PERIOD_MS: u64 = 10 * 24 * 60 * 60 * 1000; // 10 days

// === structs ===

public struct AUCTION has drop {}

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
    history: &mut History,
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
    assert!( minimum_bid > 0, E_WRONG_MINIMUM_BID );

    assert!( adjusted_begin_time_ms >= current_time, E_WRONG_TIME );
    assert!( adjusted_begin_time_ms <= current_time + MAX_BEGIN_TIME_MS, E_WRONG_TIME );

    assert!( duration_ms >= MIN_DURATION_MS, E_WRONG_DURATION );
    assert!( duration_ms <= MAX_DURATION_MS, E_WRONG_DURATION );

    assert!( minimum_increase_bps >= MIN_MINIMUM_INCREASE_BPS, E_WRONG_MINIMUM_INCREASE );
    assert!( minimum_increase_bps <= MAX_MINIMUM_INCREASE_BPS, E_WRONG_MINIMUM_INCREASE );

    assert!( extension_period_ms > 0, E_WRONG_EXTENSION_PERIOD ); // TODO
    assert!( extension_period_ms <= MAX_EXTENSION_PERIOD_MS, E_WRONG_EXTENSION_PERIOD );

    let auction = Auction {
        id: object::new(ctx),
        name: name.to_string(),
        description: description.to_string(),
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

    history.add(auction.admin_addr, auction.id.to_address(), ctx);

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

// === Initialization ===

fun init(otw: AUCTION, ctx: &mut TxContext)
{
    // Publisher

    let publisher = package::claim(otw, ctx);

    // Display for Auction<SUI>

    let mut display = display::new<Auction<sui::sui::SUI>>(&publisher, ctx);
    display.add(utf8(b"name"), utf8(b"Auction: {name}"));
    display.add(utf8(b"description"), utf8(b"{description}"));
    display.add(utf8(b"link"), utf8(b"https://auction.polymedia.app/auction/{id}"));
    display.add(utf8(b"image_url"), utf8(b"data:image/svg+xml,%3Csvg%20width%3D%22100%25%22%20height%3D%22100%25%22%20viewBox%3D%220%200%201000%201000%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22black%22%2F%3E%3CforeignObject%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Cdiv%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxhtml%22%20style%3D%22%20height%3A100%25%3Bwidth%3A100%25%3Bdisplay%3Aflex%3Bflex-direction%3Acolumn%3Bjustify-content%3Acenter%3Balign-items%3Acenter%3Bgap%3A1em%3Bbox-sizing%3Aborder-box%3Bpadding%3A0.66em%3Bfont-size%3A75px%3Bfont-family%3Asystem-ui%3Bcolor%3Awhite%3Btext-align%3Acenter%3Boverflow-wrap%3Aanywhere%3B%22%3E%3Cdiv%20style%3D%22font-size%3A1.5em%22%3E%3Cb%3EAUCTION%3C%2Fb%3E%3C%2Fdiv%3E%3Cdiv%3E{name}%3C%2Fdiv%3E%3C%2Fdiv%3E%3C%2FforeignObject%3E%3C%2Fsvg%3E"));
    display.add(utf8(b"project_name"), utf8(b"Auction | Polymedia"));
    display.add(utf8(b"project_url"), utf8(b"https://auction.polymedia.app"));
    // display.add(utf8(b"thumbnail_url"), utf8(b""));
    // display.add(utf8(b"project_image_url"), utf8(b""));
    // display.add(utf8(b"creator"), utf8(b""));

    display::update_version(&mut display);

    // Transfer objects to the sender

    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(display, ctx.sender());
}

// === test functions ===
