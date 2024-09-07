module bidder::auction;

// === imports ===

use std::string::{String, utf8};
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::display;
use sui::object_bag::{ObjectBag};
use sui::package;

use bidder::user::{UserRequest};

// === errors ===

const E_WRONG_NAME: u64 = 5000;
const E_WRONG_TIME: u64 = 5001;
const E_WRONG_ADMIN: u64 = 5002;
const E_WRONG_ADDRESS: u64 = 5003;
const E_WRONG_DURATION: u64 = 5004;
const E_WRONG_COIN_VALUE: u64 = 5005;
const E_WRONG_DESCRIPTION: u64 = 5006;
const E_WRONG_MINIMUM_BID: u64 = 5007;
const E_WRONG_MINIMUM_INCREASE: u64 = 5008;
const E_WRONG_EXTENSION_PERIOD: u64 = 5009;
const E_CANT_RECLAIM_WITH_BIDS: u64 = 5010;
const E_ITEM_LENGTH_MISMATCH: u64 = 5011;
const E_NOT_ENOUGH_ITEMS: u64 = 5012;
const E_TOO_MANY_ITEMS: u64 = 5013;
const E_MISSING_ITEM: u64 = 5014;
const E_DUPLICATE_ITEM_ADDRESSES: u64 = 5015;

// === constants ===

const ZERO_ADDRESS: address = @0x0;

// === auction configuration ===

const MAX_ITEMS: u64 = 50;

const MAX_BEGIN_DELAY_MS: u64 = 100 * 24 * 60 * 60 * 1000; // 100 days in the future

const MIN_DURATION_MS: u64 = 10 * 1000; // 10 seconds
const MAX_DURATION_MS: u64 = 100 * 24 * 60 * 60 * 1000; // 100 days

const MIN_MINIMUM_INCREASE_BPS: u64 = 10; // 0.1%
const MAX_MINIMUM_INCREASE_BPS: u64 = 1000 * 100; // 1,000%

const MIN_EXTENSION_PERIOD_MS: u64 = 1000; // 1 second
const MAX_EXTENSION_PERIOD_MS: u64 = 10 * 24 * 60 * 60 * 1000; // 10 days

const MIN_NAME_LENGTH: u64 = 3;
const MAX_NAME_LENGTH: u64 = 100;

const MIN_DESCRIPTION_LENGTH: u64 = 0;
const MAX_DESCRIPTION_LENGTH: u64 = 2000;

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

// === public-mutative functions ===

public fun admin_creates_auction<CoinType>(
    mut request: UserRequest,
    name: vector<u8>,
    description: vector<u8>,
    item_addrs: vector<address>,
    item_bag: ObjectBag,
    pay_addr: address,
    begin_delay_ms: u64,
    duration_ms: u64,
    minimum_bid: u64,
    minimum_increase_bps: u64,
    extension_period_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): (UserRequest, Auction<CoinType>)
{
    assert!( name.length() >= MIN_NAME_LENGTH, E_WRONG_NAME );
    assert!( name.length() <= MAX_NAME_LENGTH, E_WRONG_NAME );

    assert!( description.length() >= MIN_DESCRIPTION_LENGTH, E_WRONG_DESCRIPTION );
    assert!( description.length() <= MAX_DESCRIPTION_LENGTH, E_WRONG_DESCRIPTION );

    assert!( pay_addr != ZERO_ADDRESS, E_WRONG_ADDRESS );

    let current_time_ms = clock.timestamp_ms();
    let begin_time_ms = current_time_ms + begin_delay_ms;
    assert!( begin_time_ms <= current_time_ms + MAX_BEGIN_DELAY_MS, E_WRONG_TIME );

    assert!( duration_ms >= MIN_DURATION_MS, E_WRONG_DURATION );
    assert!( duration_ms <= MAX_DURATION_MS, E_WRONG_DURATION );

    assert!( minimum_bid > 0, E_WRONG_MINIMUM_BID );

    assert!( minimum_increase_bps >= MIN_MINIMUM_INCREASE_BPS, E_WRONG_MINIMUM_INCREASE );
    assert!( minimum_increase_bps <= MAX_MINIMUM_INCREASE_BPS, E_WRONG_MINIMUM_INCREASE );

    assert!( extension_period_ms >= MIN_EXTENSION_PERIOD_MS, E_WRONG_EXTENSION_PERIOD );
    assert!( extension_period_ms <= MAX_EXTENSION_PERIOD_MS, E_WRONG_EXTENSION_PERIOD );

    assert!( item_addrs.length() > 0, E_NOT_ENOUGH_ITEMS );
    assert!( item_addrs.length() <= MAX_ITEMS, E_TOO_MANY_ITEMS );
    assert!( item_addrs.length() == item_bag.length(), E_ITEM_LENGTH_MISMATCH );
    item_addrs.length().do!(|i| {
        // check that the item address is in item_bag
        assert!( item_bag.contains(item_addrs[i]), E_MISSING_ITEM );
        // check that there are no duplicates in item_addrs
        let item_addr = item_addrs[i];
        let mut j = i + 1;
        while (j < item_addrs.length()) {
            assert!( item_addrs[j] != item_addr, E_DUPLICATE_ITEM_ADDRESSES );
            j = j + 1;
        };
    });

    let auction = Auction {
        id: object::new(ctx),
        name: name.to_string(),
        description: description.to_string(),
        item_addrs,
        item_bag,
        admin_addr: ctx.sender(),
        pay_addr,
        lead_addr: ZERO_ADDRESS,
        lead_bal: balance::zero(),
        begin_time_ms,
        end_time_ms: begin_time_ms + duration_ms,
        minimum_bid,
        minimum_increase_bps,
        extension_period_ms,
    };

    // update user history
    request.borrow_mut_user().add_created(
        auction.id.to_address(),
        clock.timestamp_ms(),
    );

    return (request, auction)
}

/// Anyone can bid for an item, as long as the auction hasn't ended.
public fun anyone_bids<CoinType>(
    auction: &mut Auction<CoinType>,
    mut request: UserRequest,
    pay_coin: Coin<CoinType>,
    clock: &Clock,
    ctx: &mut TxContext,
): UserRequest {
    assert!( auction.is_live(clock), E_WRONG_TIME );
    assert!( pay_coin.value() >= auction.minimum_bid, E_WRONG_COIN_VALUE );

    // send the auction balance to the previous leader, who has just been outbid
    if (auction.lead_value() > 0) {
        let lead_addr = auction.lead_addr;
        auction.withdraw_balance(lead_addr, ctx);
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
    let current_time_ms = clock.timestamp_ms();
    if (current_time_ms >= auction.end_time_ms - auction.extension_period_ms) {
        auction.end_time_ms = auction.end_time_ms + auction.extension_period_ms;
    };

    // update user history
    request.borrow_mut_user().add_bid(
        auction.id.to_address(),
        current_time_ms,
        auction.lead_value(),);

    return request
}

/// Anyone can transfer the items to the winner of the auction after it ends.
public fun anyone_sends_item_to_winner<CoinType, ItemType: key+store>(
    auction: &mut Auction<CoinType>,
    item_addr: address,
    clock: &Clock,
) {
    assert!( auction.has_ended(clock), E_WRONG_TIME );
    assert!( auction.has_leader(), E_WRONG_ADDRESS );

    // send the item to the winner (but keep the item address in auction.item_addrs)
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
        let pay_addr = auction.pay_addr;
        auction.withdraw_balance(pay_addr, ctx);
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

    auction.end_time_ms = clock.timestamp_ms();
}

/// Admin can cancel the auction at any time and return the funds to the leader (if any).
public fun admin_cancels_auction<CoinType>(
    auction: &mut Auction<CoinType>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!( !auction.has_ended(clock), E_WRONG_TIME );
    assert!( auction.admin_addr == ctx.sender(), E_WRONG_ADMIN );

    auction.admin_ends_auction_early(clock, ctx);

    if (auction.lead_value() > 0) {
        // return funds to leader
        let lead_addr = auction.lead_addr;
        auction.withdraw_balance(lead_addr, ctx);
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

    let (_item_exists, item_idx) = auction.item_addrs.index_of(&item_addr);
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

// === private functions ===

fun withdraw_balance<CoinType>(
    auction: &mut Auction<CoinType>,
    recipient: address,
    ctx: &mut TxContext,
) {
    let lead_bal = balance::withdraw_all(&mut auction.lead_bal);
    let lead_coin = coin::from_balance(lead_bal, ctx);
    transfer::public_transfer(lead_coin, recipient);
}

// === public-view status helpers ===

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

// === public-view accessors: auction ===

public fun name<T>(a: &Auction<T>): String                  { a.name }
public fun description<T>(a: &Auction<T>): String           { a.description }
public fun item_addrs<T>(a: &Auction<T>): &vector<address>  { &a.item_addrs }
public fun item_bag<T>(a: &Auction<T>): &ObjectBag          { &a.item_bag }
public fun admin_addr<T>(a: &Auction<T>): address           { a.admin_addr }
public fun pay_addr<T>(a: &Auction<T>): address             { a.pay_addr }
public fun lead_addr<T>(a: &Auction<T>): address            { a.lead_addr }
public fun lead_value<T>(a: &Auction<T>): u64               { a.lead_bal.value() }
public fun begin_time_ms<T>(a: &Auction<T>): u64            { a.begin_time_ms }
public fun end_time_ms<T>(a: &Auction<T>): u64              { a.end_time_ms }
public fun minimum_bid<T>(a: &Auction<T>): u64              { a.minimum_bid }
public fun minimum_increase_bps<T>(a: &Auction<T>): u64     { a.minimum_increase_bps }
public fun extension_period_ms<T>(a: &Auction<T>): u64      { a.extension_period_ms }

// === public-view accessors: config ===

public fun max_items(): u64 { MAX_ITEMS }
public fun max_begin_delay_ms(): u64 { MAX_BEGIN_DELAY_MS }
public fun min_duration_ms(): u64 { MIN_DURATION_MS }
public fun max_duration_ms(): u64 { MAX_DURATION_MS }
public fun min_minimum_increase_bps(): u64 { MIN_MINIMUM_INCREASE_BPS }
public fun max_minimum_increase_bps(): u64 { MAX_MINIMUM_INCREASE_BPS }
public fun min_extension_period_ms(): u64 { MIN_EXTENSION_PERIOD_MS }
public fun max_extension_period_ms(): u64 { MAX_EXTENSION_PERIOD_MS }
public fun min_name_length(): u64 { MIN_NAME_LENGTH }
public fun max_name_length(): u64 { MAX_NAME_LENGTH }
public fun min_description_length(): u64 { MIN_DESCRIPTION_LENGTH }
public fun max_description_length(): u64 { MAX_DESCRIPTION_LENGTH }

// === initialization ===

fun init(otw: AUCTION, ctx: &mut TxContext)
{
    // Publisher

    let publisher = package::claim(otw, ctx);

    // Display for Auction<SUI>

    let mut display = display::new<Auction<sui::sui::SUI>>(&publisher, ctx);
    display.add(utf8(b"name"), utf8(b"Auction: {name}"));
    display.add(utf8(b"description"), utf8(b"{description}"));
    display.add(utf8(b"link"), utf8(b"https://bidder.polymedia.app/auction/{id}"));
    display.add(utf8(b"image_url"), utf8(b"data:image/svg+xml,%3Csvg%20width%3D%22100%25%22%20height%3D%22100%25%22%20viewBox%3D%220%200%201000%201000%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%230F4C75%22%2F%3E%3CforeignObject%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Cdiv%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxhtml%22%20style%3D%22%20height%3A100%25%3Bwidth%3A100%25%3Bdisplay%3Aflex%3Bflex-direction%3Acolumn%3Bjustify-content%3Acenter%3Balign-items%3Acenter%3Bgap%3A40px%3Bposition%3Arelative%3Bbox-sizing%3Aborder-box%3Bpadding%3A40px%3Bfont-family%3Asystem-ui%3Bcolor%3Awhite%3Btext-align%3Acenter%3Boverflow-wrap%3Aanywhere%3B%22%3E%3Cdiv%20style%3D%22font-size%3A150px%22%3E%3Cb%3EAUCTION%3C%2Fb%3E%3C%2Fdiv%3E%3Cdiv%20style%3D%22font-size%3A70px%22%3E{name}%3C%2Fdiv%3E%3Cdiv%20style%3D%22%20position%3Aabsolute%3Bbottom%3A40px%3Bright%3A40px%3Bfont-size%3A75px%3Btext-align%3Aright%3Bfont-weight%3Abold%3Bcolor%3Ayellow%3Bbackground-color%3Ablack%3Bborder%3A9px%20solid%20yellow%3Bpadding%3A0%2015px%3B%22%3EBIDDER%3C%2Fdiv%3E%3C%2Fdiv%3E%3C%2FforeignObject%3E%3C%2Fsvg%3E"));
    display.add(utf8(b"project_name"), utf8(b"Bidder | Polymedia"));
    display.add(utf8(b"project_url"), utf8(b"https://bidder.polymedia.app"));
    // display.add(utf8(b"thumbnail_url"), utf8(b""));
    // display.add(utf8(b"project_image_url"), utf8(b""));
    // display.add(utf8(b"creator"), utf8(b""));

    display::update_version(&mut display);

    // Transfer objects to the sender

    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(display, ctx.sender());
}

// === test functions ===

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(AUCTION {}, ctx)
}
