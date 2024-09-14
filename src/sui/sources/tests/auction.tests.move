#[test_only]
module bidder::auction_tests;

use std::string::{String};
use sui::clock::{Self, Clock};
use sui::coin::{Coin};
use sui::coin::{Self};
use sui::object_bag::{Self, ObjectBag};
use sui::sui::{SUI};
use sui::test_scenario::{Self, Scenario};
use sui::test_utils::{Self, assert_eq};

use bidder::auction::{Self, Auction};
use bidder::user::{Self, UserRegistry, User, UserRequest};

// === dummy object to be auctioned ===

public struct Item has key, store {
    id: UID,
    name: String,
}

public fun new_item(
    ctx: &mut TxContext,
): Item {
    return Item {
        id: object::new(ctx),
        name: b"foo".to_string(),
    }
}

public fun new_items(
    item_count: u64,
    ctx: &mut TxContext,
): (vector<address>, ObjectBag)
{
    let mut item_addrs = vector::empty();
    let mut item_bag = object_bag::new(ctx);
    item_count.do!(|_i| {
        let item = new_item(ctx);
        item_addrs.push_back(object::id_address(&item));
        item_bag.add(object::id_address(&item), item);
    });
    return (item_addrs, item_bag)
}

// === addresses ===

const ADMIN: address = @0x777;
const ADMIN_2: address = @0x888;
const PAYEE: address = @0x999;
const BIDDER_1: address = @0xb1;
const BIDDER_2: address = @0xb2;
const RANDO: address = @0xbabe;

// === default auction args ===

public struct AuctionArgs has drop {
    name: vector<u8>,
    description: vector<u8>,
    item_count: u64,
    pay_addr: address,
    begin_time_ms: u64,
    duration_ms: u64,
    minimum_bid: u64,
    minimum_increase_bps: u64,
    extension_period_ms: u64,
}

public fun auction_args(): AuctionArgs {
    AuctionArgs {
        name: b"the auction",
        description: b"the description",
        item_count: 3,
        pay_addr: PAYEE,
        begin_time_ms: 0,
        duration_ms: 1 * 3600 * 1000, // 1 hour
        minimum_bid: 1000,
        minimum_increase_bps: 100, // 1%
        extension_period_ms: 10 * 60 * 1000, // 10 minutes
    }
}

// === test runner ===

public struct TestRunner {
    scen: Scenario,
    clock: Clock,
    registry: UserRegistry,
}

public fun begin(): TestRunner
{
    let mut scen = test_scenario::begin(ADMIN);
    let mut clock = clock::create_for_testing(scen.ctx());
    let registry = user::new_registry_for_testing(scen.ctx());

    clock.set_for_testing(24*3600*1000);

    return TestRunner {
        scen,
        clock,
        registry,
    }
}

public fun begin_with_auction(
    args: AuctionArgs,
): (TestRunner, Auction<SUI>)
{
    let mut runner = begin();
    let request = runner.new_user_request(ADMIN);
    let auction = runner.admin_creates_auction(ADMIN, request, args);

    return (runner, auction)
}

public fun set_clock_to_auction_end_time(
    runner: &mut TestRunner,
    auction: &mut Auction<SUI>,
) {
    runner.clock.set_for_testing(auction.end_time_ms());
}

public fun set_clock_1ms_before_auction_ends(
    runner: &mut TestRunner,
    auction: &mut Auction<SUI>,
) {
    let current_time = auction.end_time_ms() - 1;
    runner.clock.set_for_testing(current_time);
}

// === helpers for sui modules ===

public fun mint_sui(
    runner: &mut TestRunner,
    sender: address,
    value: u64,
): Coin<SUI> {
    runner.scen.next_tx(sender);
    return coin::mint_for_testing<SUI>(value, runner.scen.ctx())
}

// === helpers for user module ===

public fun new_user_request(
    runner: &mut TestRunner,
    sender: address,
): UserRequest {
    runner.scen.next_tx(sender);
    let request = user::new_user_request(&mut runner.registry, runner.scen.ctx());
    return request
}

public fun existing_user_request(
    runner: &mut TestRunner,
    sender: address,
): UserRequest {
    runner.scen.next_tx(sender);
    let user = runner.take_user(sender);
    let request = user::existing_user_request(user);
    return request
}

public fun destroy_user_request(
    runner: &mut TestRunner,
    request: UserRequest,
) {
    user::destroy_user_request(request, runner.scen.ctx());
}

public fun take_user(
    runner: &mut TestRunner,
    sender: address,
): User {
    runner.scen.next_tx(sender);
    return runner.scen.take_from_sender()
}

// === helpers for auction module ===

public fun admin_creates_auction(
    runner: &mut TestRunner,
    sender: address,
    request: UserRequest,
    args: AuctionArgs,
): Auction<SUI>
{
    runner.scen.next_tx(sender);

    let (item_addrs, item_bag) = new_items(args.item_count, runner.scen.ctx());

    let (request, auction) = auction::admin_creates_auction<SUI>(
        request,
        args.name,
        args.description,
        item_addrs,
        item_bag,
        args.pay_addr,
        args.begin_time_ms,
        args.duration_ms,
        args.minimum_bid,
        args.minimum_increase_bps,
        args.extension_period_ms,
        &runner.clock,
        runner.scen.ctx(),
    );

    runner.destroy_user_request(request);

    return auction
}

public fun admin_creates_auction_with_items(
    runner: &mut TestRunner,
    sender: address,
    request: UserRequest,
    args: AuctionArgs,
    item_addrs: vector<address>,
    item_bag: ObjectBag,
): Auction<SUI>
{
    runner.scen.next_tx(sender);

    let (request, auction) = auction::admin_creates_auction<SUI>(
        request,
        args.name,
        args.description,
        item_addrs,
        item_bag,
        args.pay_addr,
        args.begin_time_ms,
        args.duration_ms,
        args.minimum_bid,
        args.minimum_increase_bps,
        args.extension_period_ms,
        &runner.clock,
        runner.scen.ctx(),
    );

    runner.destroy_user_request(request);

    return auction
}

public fun anyone_bids(
    runner: &mut TestRunner,
    sender: address,
    first_bid: bool,
    auction: &mut Auction<SUI>,
    bid_value: u64,
) {
    runner.scen.next_tx(sender);

    let bid_coin = runner.mint_sui(sender, bid_value);
    let request1 =
        if (first_bid) { runner.new_user_request(sender) }
        else { runner.existing_user_request(sender) };
    let request2 = auction.anyone_bids(
        request1,
        bid_coin,
        &runner.clock,
        runner.scen.ctx(),
    );
    runner.destroy_user_request(request2);
}

public fun anyone_sends_item_to_winner(
    runner: &mut TestRunner,
    sender: address,
    auction: &mut Auction<SUI>,
    item_addr: address,
) {
    runner.scen.next_tx(sender);
    auction.anyone_sends_item_to_winner<SUI, Item>(
        item_addr,
        &runner.clock,
    );
}

public fun anyone_pays_funds(
    runner: &mut TestRunner,
    sender: address,
    auction: &mut Auction<SUI>,
) {
    runner.scen.next_tx(sender);
    auction.anyone_pays_funds<SUI>(
        &runner.clock,
        runner.scen.ctx(),
    );
}

public fun admin_accepts_bid(
    runner: &mut TestRunner,
    sender: address,
    auction: &mut Auction<SUI>,
) {
    runner.scen.next_tx(sender);
    auction.admin_accepts_bid<SUI>(
        &runner.clock,
        runner.scen.ctx(),
    );
}

public fun admin_cancels_auction(
    runner: &mut TestRunner,
    sender: address,
    auction: &mut Auction<SUI>,
) {
    runner.scen.next_tx(sender);
    auction.admin_cancels_auction(
        &runner.clock,
        runner.scen.ctx(),
    );
}

public fun admin_reclaims_item(
    runner: &mut TestRunner,
    sender: address,
    auction: &mut Auction<SUI>,
    item_addr: address,
 ) {
    runner.scen.next_tx(sender);
    auction.admin_reclaims_item<_, Item>(
        item_addr,
        &runner.clock,
        runner.scen.ctx(),
    );
}

public fun admin_sets_pay_addr(
    runner: &mut TestRunner,
    sender: address,
    auction: &mut Auction<SUI>,
    new_pay_addr: address,
) {
    runner.scen.next_tx(sender);
    auction.admin_sets_pay_addr(
        new_pay_addr,
        &runner.clock,
        runner.scen.ctx(),
    );
}

// === asserts ===

public fun assert_owns_item(
    runner: &mut TestRunner,
    owner: address,
) {
    runner.scen.next_tx(owner);
    assert!(runner.scen.has_most_recent_for_sender<Item>());
}

public fun assert_owns_sui(
    runner: &mut TestRunner,
    owner: address,
    sui_value: u64,
) {
    runner.scen.next_tx(owner);
    let paid_coin = runner.scen.take_from_sender<Coin<SUI>>();
    assert_eq( paid_coin.value(), sui_value );
    transfer::public_transfer(paid_coin, owner);
}

// === tests: admin_creates_auction ===

#[test]
fun test_admin_creates_auction_ok()
{
    let (runner, auction) = begin_with_auction(auction_args());
    let args = auction_args();

    assert_eq( auction.name(), args.name.to_string() );
    assert_eq( auction.description(), args.description.to_string() );
    assert_eq( auction.item_addrs().length(), 3 );
    assert_eq( auction.item_bag().length(), 3 );
    assert_eq( auction.admin_addr(), ADMIN );
    assert_eq( auction.pay_addr(), args.pay_addr );
    assert_eq( auction.lead_addr(), @0x0 );
    assert_eq( auction.lead_value(), 0 );
    assert_eq( auction.begin_time_ms(), runner.clock.timestamp_ms() );
    assert_eq( auction.end_time_ms(), runner.clock.timestamp_ms() + args.duration_ms );
    assert_eq( auction.minimum_bid(), args.minimum_bid );
    assert_eq( auction.minimum_increase_bps(), args.minimum_increase_bps );
    assert_eq( auction.extension_period_ms(), args.extension_period_ms );

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
fun test_user_history()
{
    let mut runner = begin();

    let mut args = auction_args();
    args.name = b"auction 1";
    let request = runner.new_user_request(ADMIN);
    let mut auction1 = runner.admin_creates_auction(ADMIN, request, args);

    let user_admin1 = runner.take_user(ADMIN);
    assert_eq( user_admin1.created().length(), 1 );

    let mut args = auction_args();
    args.name = b"auction 2";
    let request = runner.new_user_request(ADMIN_2);
    let auction2 = runner.admin_creates_auction(ADMIN_2, request, args);

    let mut args = auction_args();
    args.name = b"auction 3";
    let request = runner.existing_user_request(ADMIN_2);
    let auction3 = runner.admin_creates_auction(ADMIN_2, request, args);

    let user_admin2 = runner.take_user(ADMIN_2);
    assert_eq( user_admin2.created().length(), 2 );

    runner.anyone_bids(BIDDER_1, true, &mut auction1, 1000);
    runner.anyone_bids(BIDDER_2, true, &mut auction1, 1100);
    runner.anyone_bids(BIDDER_1, false, &mut auction1, 1200);
    runner.anyone_bids(BIDDER_2, false, &mut auction1, 1300);

    let user_bidder1 = runner.take_user(BIDDER_1);
    assert_eq( user_bidder1.bids().length(), 2 );

    let user_bidder2 = runner.take_user(BIDDER_2);
    assert_eq( user_bidder2.bids().length(), 2 );

    assert_eq( runner.registry.users().length(), 4 );

    test_utils::destroy(runner);

    test_utils::destroy(user_admin1);
    test_utils::destroy(auction1);

    test_utils::destroy(user_admin2);
    test_utils::destroy(auction2);
    test_utils::destroy(auction3);

    test_utils::destroy(user_bidder1);
    test_utils::destroy(user_bidder2);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_ADDRESS)]
fun test_admin_creates_auction_e_wrong_address()
{
    // ADMIN tries to create an auction with pay_add = 0x0
    let mut args = auction_args();
    args.pay_addr = @0x0;
    let (runner, auction) = begin_with_auction(args);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_MINIMUM_BID)]
fun test_admin_creates_auction_e_wrong_minimum_bid()
{
    // ADMIN tries to create an auction with 0 minimum bid
    let mut args = auction_args();
    args.minimum_bid = 0;
    let (runner, auction) = begin_with_auction(args);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_admin_creates_auction_e_wrong_begin_time()
{
    // ADMIN tries to create an auction that starts too far in the future
    let mut runner = begin();
    let mut args = auction_args();
    let three_years = 3 * 365 * 24 * 60 * 60 * 1000;
    args.begin_time_ms = runner.clock.timestamp_ms() + three_years;

    let request = runner.new_user_request(ADMIN);
    let auction = runner.admin_creates_auction(ADMIN, request, args);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_DURATION)]
fun test_admin_creates_auction_e_wrong_duration_too_short()
{
    // ADMIN tries to create an auction that is too short
    let mut args = auction_args();
    args.duration_ms = 500; // half a second
    let (runner, auction) = begin_with_auction(args);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_DURATION)]
fun test_admin_creates_auction_e_wrong_duration_too_long()
{
    // ADMIN tries to create an auction that lasts too long
    let mut args = auction_args();
    args.duration_ms = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years
    let (runner, auction) = begin_with_auction(args);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_MINIMUM_INCREASE)]
fun test_admin_creates_auction_e_wrong_minimum_increase_too_small()
{
    // ADMIN tries to create an auction a very small minimum bid increase
    let mut args = auction_args();
    args.minimum_increase_bps = 5; // 0.05%
    let (runner, auction) = begin_with_auction(args);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_MINIMUM_INCREASE)]
fun test_admin_creates_auction_e_wrong_minimum_increase_too_large()
{
    // ADMIN tries to create an auction with a very large minimum bid increase
    let mut args = auction_args();
    args.minimum_increase_bps = 1_000_000 * 100; // 1 million %
    let (runner, auction) = begin_with_auction(args);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_EXTENSION_PERIOD)]
fun test_admin_creates_auction_e_wrong_extension_period_too_short()
{
    // ADMIN tries to create an auction with a very short extension period
    let mut args = auction_args();
    args.extension_period_ms = 500; // 0.5 seconds
    let (runner, auction) = begin_with_auction(args);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_EXTENSION_PERIOD)]
fun test_admin_creates_auction_e_wrong_extension_period_too_long()
{
    // ADMIN tries to create an auction with a very long extension period
    let mut args = auction_args();
    args.extension_period_ms = 1 * 365 * 24 * 60 * 60 * 1000; // 1 year
    let (runner, auction) = begin_with_auction(args);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_EXTENSION_PERIOD)]
fun test_admin_creates_auction_e_wrong_extension_period_is_longer_than_duration()
{
    // ADMIN tries to create an auction with an extension period that is longer than the duration
    let mut args = auction_args();
    args.duration_ms = 24 * 60 * 60 * 1000; // 1 day
    args.extension_period_ms = 2 * 24 * 60 * 60 * 1000; // 2 days
    let (runner, auction) = begin_with_auction(args);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_NAME)]
fun test_admin_creates_auction_e_wrong_name_too_short()
{
    // ADMIN tries to create an auction with a very short name
    let mut args = auction_args();
    args.name = b"a";
    let (runner, auction) = begin_with_auction(args);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_NAME)]
fun test_admin_creates_auction_e_wrong_name_too_long()
{
    // ADMIN tries to create an auction with a very long name
    let mut args = auction_args();
    args.name = b"Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
    let (runner, auction) = begin_with_auction(args);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_NOT_ENOUGH_ITEMS)]
fun test_admin_creates_auction_e_not_enough_items()
{
    // ADMIN tries to create an auction without any items
    let mut args = auction_args();
    args.item_count = 0;
    let (runner, auction) = begin_with_auction(args);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_TOO_MANY_ITEMS)]
fun test_admin_creates_auction_e_too_many_items()
{
    // ADMIN tries to create an auction with too many items
    let mut args = auction_args();
    args.item_count = 200;
    let (runner, auction) = begin_with_auction(args);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_ITEM_LENGTH_MISMATCH)]
fun test_admin_creates_auction_e_item_length_mismatch()
{
    // ADMIN tries to create an auction with a different number of items than the number of item_addrs
    let mut runner = begin();
    let (mut item_addrs, item_bag) = new_items(5, runner.scen.ctx());
    item_addrs.push_back(@0x123);

    let request = runner.new_user_request(ADMIN);
    let args = auction_args();
    let auction = runner.admin_creates_auction_with_items(ADMIN, request, args, item_addrs, item_bag);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_MISSING_ITEM)]
fun test_admin_creates_auction_e_missing_item()
{
    // ADMIN tries to create an auction where:
    // - item_addrs.length() == item_bag.length(),
    // - BUT not all item_addrs are in item_bag
    let mut runner = begin();
    let (mut item_addrs, item_bag) = new_items(5, runner.scen.ctx());
    // replace the last address with a random one
    item_addrs.pop_back();
    item_addrs.push_back(@0x123);

    let request = runner.new_user_request(ADMIN);
    let args = auction_args();
    let auction = runner.admin_creates_auction_with_items(ADMIN, request, args, item_addrs, item_bag);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_DUPLICATE_ITEM_ADDRESSES)]
fun test_admin_creates_auction_e_duplicate_item_addresses()
{
    // ADMIN tries to create an auction where:
    // - item_addrs.length() == item_bag.length(),
    // - and all item_addrs are in item_bag,
    // - BUT item_addrs contains duplicates
    let mut runner = begin();
    let (mut item_addrs, item_bag) = new_items(5, runner.scen.ctx());
    // replace the last address with the first one
    let first_addr = item_addrs[0];
    item_addrs.pop_back();
    item_addrs.push_back(first_addr);

    let request = runner.new_user_request(ADMIN);
    let args = auction_args();
    let auction = runner.admin_creates_auction_with_items(ADMIN, request, args, item_addrs, item_bag);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

// === tests: anyone_bids ===

#[test]
fun test_anyone_bids_ok()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // BIDDER_1 bids the moment the auction starts
    // check assumptions
    let end_time_1 = auction.end_time_ms();
    let minimum_bid_1 = auction.minimum_bid();
    assert_eq( minimum_bid_1, 1000 );
    assert_eq( auction.begin_time_ms(), runner.clock.timestamp_ms() );
    assert_eq( auction.has_leader(), false );
    assert_eq( auction.has_balance(), false );
    // bid
    runner.anyone_bids(BIDDER_1, true, &mut auction, minimum_bid_1);
    // check outcome
    assert_eq( auction.lead_addr(), BIDDER_1 );
    assert_eq( auction.lead_value(), minimum_bid_1 );
    let minimum_bid_2 = auction.minimum_bid();
    assert_eq( minimum_bid_2, 1010 ); // 1% higher
    assert_eq( auction.has_leader(), true );
    assert_eq( auction.has_balance(), true );

    // BIDDER_2 bids a millisecond before the auction ends
    runner.clock.set_for_testing(auction.end_time_ms() - 1);
    // bid
    runner.anyone_bids(BIDDER_2, true, &mut auction, minimum_bid_2);
    // check outcome
    assert_eq( auction.lead_addr(), BIDDER_2 );
    assert_eq( auction.lead_value(), minimum_bid_2 );
    runner.assert_owns_sui(BIDDER_1, minimum_bid_1); // got their money back
    assert_eq( auction.end_time_ms(), end_time_1 + auction.extension_period_ms() ); // extended end time

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_anyone_bids_e_wrong_time_too_early()
{
    // ADMIN creates auction that starts 1 second from now
    let mut runner = begin();
    let mut args = auction_args();
    let begin_time_ms = runner.clock.timestamp_ms() + 1000;
    args.begin_time_ms = begin_time_ms;
    let request = runner.new_user_request(ADMIN);
    let mut auction = runner.admin_creates_auction(ADMIN, request, args);

    // BIDDER_1 tries to bid 1 millisecond before the auction starts
    runner.clock.set_for_testing(begin_time_ms - 1);
    runner.anyone_bids(BIDDER_1, true, &mut auction, 1000);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_anyone_bids_e_wrong_time_too_late()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // BIDDER_1 tries to bid the moment the auction ends
    runner.set_clock_to_auction_end_time(&mut auction);
    runner.anyone_bids(BIDDER_1, true, &mut auction, 1000);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_COIN_VALUE)]
fun test_anyone_bids_e_wrong_coin_value_1st_bid()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // BIDDER_1 bids
    let minimum_bid = auction.minimum_bid();
    runner.anyone_bids(BIDDER_1, true, &mut auction, minimum_bid - 1);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_COIN_VALUE)]
fun test_anyone_bids_e_wrong_coin_value_2nd_bid()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // BIDDER_1 bids
    let initial_bid = auction.minimum_bid();
    runner.anyone_bids(BIDDER_1, true, &mut auction, initial_bid);

    // BIDDER_2 bids
    let min_second_bid = 1010; // 1% higher than the initial bid of 1000
    runner.anyone_bids(BIDDER_2, true, &mut auction, min_second_bid - 1);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_COIN_VALUE)]
fun test_anyone_bids_e_wrong_coin_value_tiny_amounts()
{
    // ADMIN creates auction
    let mut args = auction_args();
    args.minimum_bid = 1;
    args.minimum_increase_bps = 10;
    let (mut runner, mut auction) = begin_with_auction(args);

    // BIDDER_1 bids
    runner.anyone_bids(BIDDER_1, true, &mut auction, 1);

    assert_eq( auction.minimum_bid(), 2 );

    // BIDDER_2 bids
    runner.anyone_bids(BIDDER_2, true, &mut auction, 1);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

// === tests: anyone_sends_item_to_winner ===

#[test]
fun test_anyone_sends_item_to_winner_ok()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.anyone_bids(BIDDER_1, true, &mut auction, bid_value);
    assert_eq( auction.is_live(&runner.clock), true );

    // RANDO sends item to BIDDER_1 the moment the auction ends
    runner.set_clock_to_auction_end_time(&mut auction);
    runner.anyone_sends_item_to_winner(RANDO, &mut auction, item_addr);
    assert_eq( auction.is_live(&runner.clock), false );

    // BIDDER_1 gets the item
    runner.assert_owns_item(BIDDER_1);

    // RANDO tries to send the item to BIDDER_1 again (nothing happens and no error is raised)
    runner.anyone_sends_item_to_winner(RANDO, &mut auction, item_addr);

    // RANDO tries to send a made up item to BIDDER_1 (nothing happens and no error is raised)
    runner.anyone_sends_item_to_winner(RANDO, &mut auction, @0xaaa111);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_anyone_sends_item_to_winner_e_wrong_time()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.anyone_bids(BIDDER_1, true, &mut auction, bid_value);

    // RANDO tries to send item to BIDDER_1, 1 millisecond before the auction ends
    runner.clock.set_for_testing(auction.end_time_ms() - 1);
    runner.anyone_sends_item_to_winner(RANDO, &mut auction, item_addr);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_ADDRESS)]
fun test_anyone_sends_item_to_winner_e_wrong_address()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // RANDO tries to send item to the winner, but nobody placed a bid so there's no winner
    runner.set_clock_to_auction_end_time(&mut auction);
    runner.anyone_sends_item_to_winner(RANDO, &mut auction, item_addr);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

// === tests: anyone_pays_funds ===

#[test]
fun test_anyone_pays_funds_ok_with_bids()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.anyone_bids(BIDDER_1, true, &mut auction, bid_value);

    // RANDO sends the funds to pay_addr
    runner.set_clock_to_auction_end_time(&mut auction);
    runner.anyone_pays_funds(RANDO, &mut auction);

    // PAYEE gets the money
    runner.assert_owns_sui(PAYEE, bid_value);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
fun test_anyone_pays_funds_ok_without_bids()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // RANDO tries to send the funds to pay_addr, but nobody placed a bid so there's no funds
    runner.set_clock_to_auction_end_time(&mut auction);
    runner.anyone_pays_funds(RANDO, &mut auction);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_anyone_pays_funds_e_wrong_time()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // RANDO tries to send the funds before the auction ends
    runner.anyone_pays_funds(RANDO, &mut auction);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

// === tests: admin_accepts_bid ===

#[test]
fun test_admin_accepts_bid_ok()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.anyone_bids(BIDDER_1, true, &mut auction, bid_value);

    // ADMIN ends the auction early
    runner.set_clock_1ms_before_auction_ends(&mut auction);
    runner.admin_accepts_bid(ADMIN, &mut auction);

    // auction has ended
    assert_eq( auction.has_ended(&runner.clock), true );

    // RANDO sends item to BIDDER_1
    runner.anyone_sends_item_to_winner(RANDO, &mut auction, item_addr);

    // BIDDER_1 gets the item
    runner.assert_owns_item(BIDDER_1);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_admin_accepts_bid_e_wrong_time()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // ADMIN tries to the auction early
    runner.set_clock_to_auction_end_time(&mut auction);
    runner.admin_accepts_bid(ADMIN, &mut auction);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_ADMIN)]
fun test_admin_accepts_bid_e_wrong_admin()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // RANDO tries to the auction early
    runner.admin_accepts_bid(RANDO, &mut auction);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_NO_BIDS)]
fun test_admin_accepts_bid_e_no_bids()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // ADMIN tries to end the auction early, but there are no bids
    runner.set_clock_1ms_before_auction_ends(&mut auction);
    runner.admin_accepts_bid(ADMIN, &mut auction);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

// === tests: admin_cancels_auction ===

#[test]
fun test_admin_cancels_auction_ok_with_bids()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.anyone_bids(BIDDER_1, true, &mut auction, bid_value);

    // ADMIN cancels the auction
    runner.set_clock_1ms_before_auction_ends(&mut auction);
    runner.admin_cancels_auction(ADMIN, &mut auction);

    // BIDDER_1 gets their money back
    runner.assert_owns_sui(BIDDER_1, bid_value);

    // auction has ended
    assert_eq( auction.has_ended(&runner.clock), true );

    // auction has no leader/winner
    assert_eq( auction.has_leader(), false );

    // auction has no balance
    assert_eq( auction.has_balance(), false );

    // ADMIN can recover the item
    runner.admin_reclaims_item(ADMIN, &mut auction, item_addr);
    runner.assert_owns_item(ADMIN);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
fun test_admin_cancels_auction_ok_without_bids()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // ADMIN cancels the auction
    runner.admin_cancels_auction(ADMIN, &mut auction);

    // auction has ended
    assert_eq( auction.has_ended(&runner.clock), true );

    // ADMIN can recover the item
    runner.admin_reclaims_item(ADMIN, &mut auction, item_addr);
    runner.assert_owns_item(ADMIN);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_ADMIN)]
fun test_admin_cancels_auction_e_wrong_admin()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // RANDO tries to cancel the auction
    runner.admin_cancels_auction(RANDO, &mut auction);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_admin_cancels_auction_e_wrong_time()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // ADMIN tries to cancel the auction
    runner.set_clock_to_auction_end_time(&mut auction);
    runner.admin_cancels_auction(ADMIN, &mut auction);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

// === tests: admin_reclaims_item ===

#[test]
fun test_admin_reclaims_item_ok_without_bids()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // auction ends without bids
    runner.set_clock_to_auction_end_time(&mut auction);

    // ADMIN recovers the item
    runner.admin_reclaims_item(ADMIN, &mut auction, item_addr);
    runner.assert_owns_item(ADMIN);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
fun test_admin_reclaims_item_ok_with_bids_and_cancel()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.anyone_bids(BIDDER_1, true, &mut auction, bid_value);

    // ADMIN cancels the auction
    runner.admin_cancels_auction(ADMIN, &mut auction);

    // BIDDER_1 gets his money back
    runner.assert_owns_sui(BIDDER_1, bid_value);

    // ADMIN recovers the item
    runner.admin_reclaims_item(ADMIN, &mut auction, item_addr);
    runner.assert_owns_item(ADMIN);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_ADMIN)]
fun test_admin_reclaims_item_e_wrong_admin()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // auction ends without bids
    runner.set_clock_to_auction_end_time(&mut auction);

    // RANDO tries to steal the item
    runner.admin_reclaims_item(RANDO, &mut auction, item_addr);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_admin_reclaims_item_e_wrong_time()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // ADMIN tries to recover the item before the auction ends
    runner.admin_reclaims_item(ADMIN, &mut auction, item_addr);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_CANT_RECLAIM_WITH_BIDS)]
fun test_admin_reclaims_item_e_cant_reclaim_with_bids()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.anyone_bids(BIDDER_1, true, &mut auction, bid_value);

    // auction ends with bids
    runner.set_clock_to_auction_end_time(&mut auction);

    // ADMIN tries to recover the item
    runner.admin_reclaims_item(ADMIN, &mut auction, item_addr);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

// === tests: admin_sets_pay_addr ===

#[test]
fun test_admin_sets_pay_addr_ok_before_end_time()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // ADMIN can change pay_addr because the auction hasn't ended
    let new_pay_addr = @0x123;
    runner.admin_sets_pay_addr(ADMIN, &mut auction, new_pay_addr);

    // new_pay_addr will get the money when the auction is over
    assert_eq( auction.pay_addr(), new_pay_addr );

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
fun test_admin_sets_pay_addr_ok_after_end_time()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.anyone_bids(BIDDER_1, true, &mut auction, bid_value);

    // auction ends with bids
    runner.set_clock_to_auction_end_time(&mut auction);

    // ADMIN can change pay_addr after the auction has ended, because there are bids
    let new_pay_addr = @0x123;
    runner.admin_sets_pay_addr(ADMIN, &mut auction, new_pay_addr);

    // new_pay_addr will get the money when the auction is over
    assert_eq( auction.pay_addr(), new_pay_addr );

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_ADMIN)]
fun test_admin_sets_pay_addr_e_wrong_admin()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // RANDO tries to change pay_addr
    let new_pay_addr = @0x123;
    runner.admin_sets_pay_addr(RANDO, &mut auction, new_pay_addr);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_POINTLESS_PAY_ADDR_CHANGE)]
fun test_admin_sets_pay_addr_e_pointless_pay_addr_change()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // ADMIN ends without bids
    runner.set_clock_to_auction_end_time(&mut auction);

    // ADMIN tries to change pay_addr, which is pointless because the auction ended without bids,
    // so no funds will ever be sent to the pay_addr
    let new_pay_addr = @0x123;
    runner.admin_sets_pay_addr(ADMIN, &mut auction, new_pay_addr);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
fun test_init_auction()
{
    let mut runner = begin();
    auction::init_for_testing(runner.scen.ctx());
    test_utils::destroy(runner);
}

#[test]
fun test_init_user_registry()
{
    let mut runner = begin();
    user::init_for_testing(runner.scen.ctx());
    test_utils::destroy(runner);
}
