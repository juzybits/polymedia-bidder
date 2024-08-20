#[test_only]
module auction::auction_tests;

use std::string::{String};
use std::u64::{Self};
use sui::clock::{Self, Clock};
use sui::coin::{Coin};
use sui::coin::{Self};
use sui::sui::{SUI};
use sui::test_scenario::{Self, Scenario};
use sui::test_utils::{Self, assert_eq};

use auction::auction::{Self, Auction};
use auction::history::{Self, History};

// === dummy object to be auctioned ===

public struct Item has key, store {
    id: UID,
    name: String,
}

public fun new_item(runner: &mut TestRunner): Item {
    return Item {
        id: object::new(runner.scen.ctx()),
        name: b"foo".to_string(),
    }
}

// === addresses ===

const ADMIN: address = @0x777;
const PAYEE: address = @0x888;
const BIDDER_1: address = @0xb1;
const BIDDER_2: address = @0xb2;
const RANDO: address = @0xbabe;

// === default auction args ===

public struct AuctionArgs has drop {
    name: vector<u8>,
    description: vector<u8>,
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
    history: History,
}

public fun begin(): TestRunner
{
    let mut scen = test_scenario::begin(ADMIN);
    let mut clock = clock::create_for_testing(scen.ctx());
    let history = history::new_history_for_testing(scen.ctx());

    clock.set_for_testing(24*3600*1000);

    return TestRunner {
        scen,
        clock,
        history,
    }
}

public fun begin_with_auction(
    args: AuctionArgs,
): (TestRunner, Auction<SUI>)
{
    let mut runner = begin();
    let auction = runner.admin_creates_auction(ADMIN, args);

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

public fun mint_sui(runner: &mut TestRunner, value: u64): Coin<SUI> {
    coin::mint_for_testing<SUI>(value, runner.scen.ctx())
}

public fun take_auction(runner: &mut TestRunner): Auction<SUI> {
    runner.scen.next_tx(ADMIN);
    runner.scen.take_shared<Auction<SUI>>()
}

// === helpers for our modules ===

public fun admin_creates_auction(
    runner: &mut TestRunner,
    sender: address,
    args: AuctionArgs,
): Auction<SUI>
{
    runner.scen.next_tx(sender);
    let mut auction = auction::admin_creates_auction<SUI>(
        &mut runner.history,
        args.name,
        args.description,
        args.pay_addr,
        args.begin_time_ms,
        args.duration_ms,
        args.minimum_bid,
        args.minimum_increase_bps,
        args.extension_period_ms,
        &runner.clock,
        runner.scen.ctx(),
    );

    runner.admin_adds_item(sender, &mut auction);

    return auction
}

public fun admin_adds_item(
    runner: &mut TestRunner,
    sender: address,
    auction: &mut Auction<SUI>,
) {
    runner.scen.next_tx(sender);
    let item = runner.new_item();
    auction.admin_adds_item(
        item,
        &runner.clock,
        runner.scen.ctx(),
    );
}

public fun anyone_bids(
    runner: &mut TestRunner,
    sender: address,
    auction: &mut Auction<SUI>,
    bid_value: u64,
) {
    runner.scen.next_tx(sender);
    let bid_coin = runner.mint_sui(bid_value);
    auction::anyone_bids(
        auction,
        bid_coin,
        &runner.clock,
        runner.scen.ctx(),
    );
}

public fun anyone_sends_item_to_winner(
    runner: &mut TestRunner,
    sender: address,
    auction: &mut Auction<SUI>,
    item_addr: address,
) {
    runner.scen.next_tx(sender);
    auction::anyone_sends_item_to_winner<SUI, Item>(
        auction,
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
    auction::anyone_pays_funds<SUI>(
        auction,
        &runner.clock,
        runner.scen.ctx(),
    );
}

public fun admin_ends_auction_early(
    runner: &mut TestRunner,
    sender: address,
    auction: &mut Auction<SUI>,
) {
    runner.scen.next_tx(sender);
    auction::admin_ends_auction_early<SUI>(
        auction,
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
    auction::admin_cancels_auction(
        auction,
        &runner.clock,
        runner.scen.ctx(),
    );
}

public fun admin_reclaims_item(
    runner: &mut TestRunner,
    sender: address,
    auction: &mut Auction<SUI>,
    item_addr: address,
): Item {
    runner.scen.next_tx(sender);
    return auction::admin_reclaims_item(
        auction,
        item_addr,
        &runner.clock,
        runner.scen.ctx(),
    )
}

public fun admin_sets_pay_addr(
    runner: &mut TestRunner,
    sender: address,
    auction: &mut Auction<SUI>,
    new_pay_addr: address,
) {
    runner.scen.next_tx(sender);
    auction::admin_sets_pay_addr(
        auction,
        new_pay_addr,
        runner.scen.ctx(),
    );
}

// public fun has_ended // TODO

// public fun is_live // TODO

// public fun has_leader // TODO

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

    assert_eq( auction.item_addrs().length(), 1 );
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
fun test_admin_creates_auction_e_wrong_time_past()
{
    // ADMIN tries to create an auction that starts 1 millisecond ago
    let mut runner = begin();
    let mut args = auction_args();
    args.begin_time_ms = runner.clock.timestamp_ms() - 1;
    let auction = runner.admin_creates_auction(ADMIN, args);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_admin_creates_auction_e_wrong_time_future()
{
    // ADMIN tries to create an auction that starts too far in the future
    let mut runner = begin();
    let mut args = auction_args();
    let three_years = 3 * 365 * 24 * 60 * 60 * 1000;
    args.begin_time_ms = runner.clock.timestamp_ms() + three_years;
    let auction = runner.admin_creates_auction(ADMIN, args);

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

// === tests: admin_adds_item ===

#[test]
fun test_admin_adds_item_ok()
{
    // ADMIN creates auction with 1 item
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    assert_eq( auction.item_addrs().length(), 1 );

    // ADMIN adds 3 more items
    runner.admin_adds_item(ADMIN, &mut auction);
    runner.admin_adds_item(ADMIN, &mut auction);
    runner.admin_adds_item(ADMIN, &mut auction);
    assert_eq( auction.item_addrs().length(), 4 );

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_admin_adds_item_e_wrong_time()
{
    // ADMIN tries to add an item after the auction has ended
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    runner.set_clock_to_auction_end_time(&mut auction);
    runner.admin_adds_item(ADMIN, &mut auction);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_ADMIN)]
fun test_admin_adds_item_e_wrong_admin()
{
    // RANDO tries to add an item to someone else's auction
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    runner.admin_adds_item(RANDO, &mut auction);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_TOO_MANY_ITEMS)]
fun test_admin_adds_item_e_too_many_items()
{
    // ADMIN tries to add 100 items to the auction (limit is 50)
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    u64::do!(100, |_i| runner.admin_adds_item(ADMIN, &mut auction));

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
    // bid
    runner.anyone_bids(BIDDER_1, &mut auction, minimum_bid_1);
    // check outcome
    assert_eq( auction.lead_addr(), BIDDER_1 );
    assert_eq( auction.lead_value(), minimum_bid_1 );
    let minimum_bid_2 = auction.minimum_bid();
    assert_eq( minimum_bid_2, 1010 ); // 1% higher

    // BIDDER_2 bids a millisecond before the auction ends
    runner.clock.set_for_testing(auction.end_time_ms() - 1);
    // bid
    runner.anyone_bids(BIDDER_2, &mut auction, minimum_bid_2);
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
    let mut auction = runner.admin_creates_auction(ADMIN, args);

    // BIDDER_1 tries to bid 1 millisecond before the auction starts
    runner.clock.set_for_testing(begin_time_ms - 1);
    runner.anyone_bids(BIDDER_1, &mut auction, 1000);

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
    runner.anyone_bids(BIDDER_1, &mut auction, 1000);

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
    runner.anyone_bids(BIDDER_1, &mut auction, minimum_bid - 1);

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
    runner.anyone_bids(BIDDER_1, &mut auction, initial_bid);

    // BIDDER_2 bids
    let min_second_bid = 1010; // 1% higher than the initial bid of 1000
    runner.anyone_bids(BIDDER_2, &mut auction, min_second_bid - 1);

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
    runner.anyone_bids(BIDDER_1, &mut auction, 1);

    assert_eq( auction.minimum_bid(), 2 );

    // BIDDER_2 bids
    runner.anyone_bids(BIDDER_2, &mut auction, 1);

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
    runner.anyone_bids(BIDDER_1, &mut auction, bid_value);

    // RANDO sends item to BIDDER_1 the moment the auction ends
    runner.set_clock_to_auction_end_time(&mut auction);
    runner.anyone_sends_item_to_winner(RANDO, &mut auction, item_addr);

    // BIDDER_1 gets the item
    runner.assert_owns_item(BIDDER_1);

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
    runner.anyone_bids(BIDDER_1, &mut auction, bid_value);

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
    runner.anyone_bids(BIDDER_1, &mut auction, bid_value);

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

// === tests: admin_ends_auction_early ===

#[test]
fun test_admin_ends_auction_early_ok_with_bids()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.anyone_bids(BIDDER_1, &mut auction, bid_value);

    // ADMIN ends the auction early
    runner.set_clock_1ms_before_auction_ends(&mut auction);
    runner.admin_ends_auction_early(ADMIN, &mut auction);

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
fun test_admin_ends_auction_early_ok_without_bids()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // ADMIN ends the auction early
    runner.set_clock_1ms_before_auction_ends(&mut auction);
    runner.admin_ends_auction_early(ADMIN, &mut auction);

    // auction has ended
    assert_eq( auction.has_ended(&runner.clock), true );

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_admin_ends_auction_early_e_wrong_time()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // ADMIN tries to the auction early
    runner.set_clock_to_auction_end_time(&mut auction);
    runner.admin_ends_auction_early(ADMIN, &mut auction);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_ADMIN)]
fun test_admin_ends_auction_early_e_wrong_admin()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // RANDO tries to the auction early
    runner.admin_ends_auction_early(RANDO, &mut auction);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

// === tests: admin_cancels_auction ===

#[test]
fun test_admin_cancels_auction_ok_with_bids()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.anyone_bids(BIDDER_1, &mut auction, bid_value);

    // ADMIN cancels the auction
    runner.set_clock_1ms_before_auction_ends(&mut auction);
    runner.admin_cancels_auction(ADMIN, &mut auction);

    // BIDDER_1 gets their money back
    runner.assert_owns_sui(BIDDER_1, bid_value);

    // auction has ended
    assert_eq( auction.has_ended(&runner.clock), true );

    // auction has no leader/winner
    assert_eq( auction.has_leader(), false );

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

// === tests: admin_reclaims_item === TODO

#[test]
fun test_admin_reclaims_item_ok_without_bids()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // auction ends without bids
    runner.set_clock_to_auction_end_time(&mut auction);

    // ADMIN recovers the item
    let item = runner.admin_reclaims_item(ADMIN, &mut auction, item_addr);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
    test_utils::destroy(item);
}

#[test]
fun test_admin_reclaims_item_ok_with_bids_and_cancel()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.anyone_bids(BIDDER_1, &mut auction, bid_value);

    // ADMIN cancels the auction
    runner.admin_cancels_auction(ADMIN, &mut auction);

    // BIDDER_1 gets his money back
    runner.assert_owns_sui(BIDDER_1, bid_value);

    // ADMIN recovers the item
    let item = runner.admin_reclaims_item(ADMIN, &mut auction, item_addr);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
    test_utils::destroy(item);
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
    let item = runner.admin_reclaims_item(RANDO, &mut auction, item_addr);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
    test_utils::destroy(item);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_admin_reclaims_item_e_wrong_time()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // ADMIN tries to recover the item before the auction ends
    let item = runner.admin_reclaims_item(RANDO, &mut auction, item_addr);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
    test_utils::destroy(item);
}

#[test]
#[expected_failure(abort_code = auction::E_CANT_RECLAIM_WITH_BIDS)]
fun test_admin_reclaims_item_e_cant_reclaim_with_bids()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());
    let item_addr = auction.item_addrs()[0];

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.anyone_bids(BIDDER_1, &mut auction, bid_value);

    // auction ends with bids
    runner.set_clock_to_auction_end_time(&mut auction);

    // ADMIN tries to recover the item
    let item = runner.admin_reclaims_item(ADMIN, &mut auction, item_addr);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
    test_utils::destroy(item);
}

// === tests: admin_sets_pay_addr ===

#[test]
fun test_admin_set_pay_addr_ok()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // ADMIN changes pay_addr
    let new_pay_addr = @0x123;
    runner.admin_sets_pay_addr(ADMIN, &mut auction, new_pay_addr);

    // new_pay_addr will get the money when the auction is over
    assert_eq( auction.pay_addr(), new_pay_addr );

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_ADMIN)]
fun test_admin_set_pay_addr_e_wrong_admin()
{
    let (mut runner, mut auction) = begin_with_auction(auction_args());

    // RANDO tries to change pay_addr
    let new_pay_addr = @0x123;
    runner.admin_sets_pay_addr(RANDO, &mut auction, new_pay_addr);

    test_utils::destroy(runner);
    test_utils::destroy(auction);
}
