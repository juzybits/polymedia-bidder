#[test_only]
module auction::auction_tests;

use std::string::{String};
use sui::clock::{Self, Clock};
use sui::coin::{Coin};
use sui::coin::{Self};
use sui::sui::{SUI};
use sui::test_scenario::{Self, Scenario};
use sui::test_utils::{Self, assert_eq};

use auction::auction::{Self, Auction, AuctionAdmin};

/// Object to be auctioned
public struct Item has key, store {
    id: UID,
    name: String,
}

// === default args ===

const ADMIN: address = @0x777;
const PAYEE: address = @0x888;
const BIDDER_1: address = @0xb1;
const BIDDER_2: address = @0xb2;

public struct AuctionArgs has drop {
    begin_time_ms: u64,
    duration: u64,
    pay_addr: address,
    minimum_bid: u64,
    minimum_increase_bps: u64,
    extension_period_ms: u64,
}

public fun auction_args(): AuctionArgs {
    AuctionArgs {
        begin_time_ms: 0,
        duration: 1 * 3600 * 1000, // 1 hour
        pay_addr: PAYEE,
        minimum_bid: 1000,
        minimum_increase_bps: 100, // 1%
        extension_period_ms: 10 * 60 * 1000, // 10 minutes
    }
}

// === test runner ===

public struct TestRunner {
    scenario: Scenario,
    auction_admin: AuctionAdmin,
    clock: Clock,
}

public fun begin(): TestRunner
{
    let mut scenario = test_scenario::begin(ADMIN);
    let auction_admin = auction::new_admin(scenario.ctx());
    let mut clock = clock::create_for_testing(scenario.ctx());
    clock.set_for_testing(24*3600*1000);
    return TestRunner {
        scenario,
        auction_admin,
        clock,
    }
}

// === helpers for sui modules ===

public fun mint_sui(runner: &mut TestRunner, value: u64): Coin<SUI> {
    coin::mint_for_testing<SUI>(value, runner.scenario.ctx())
}

public fun take_auction(runner: &mut TestRunner): Auction<SUI, Item> {
    runner.scenario.next_tx(ADMIN);
    runner.scenario.take_shared<Auction<SUI, Item>>()
}

// === helpers for our modules ===

public fun item_new(runner: &mut TestRunner): Item {
    return Item {
        id: object::new(runner.scenario.ctx()),
        name: b"foo".to_string(),
    }
}

public fun auction_new(
    runner: &mut TestRunner,
    args: AuctionArgs,
): Auction<SUI, Item> {
    let item = runner.item_new();
    return auction::new_auction<SUI, Item>(
        &runner.auction_admin,
        item,
        args.begin_time_ms,
        args.duration,
        args.pay_addr,
        args.minimum_bid,
        args.minimum_increase_bps,
        args.extension_period_ms,
        &runner.clock,
        runner.scenario.ctx(),
    )
}

public fun auction_bid(
    runner: &mut TestRunner,
    auction: &mut Auction<SUI, Item>,
    bidder_addr: address,
    bid_value: u64,
) {
    runner.scenario.next_tx(bidder_addr);
    let bid_coin = runner.mint_sui(bid_value);
    auction::bid(
        auction,
        bid_coin,
        &runner.clock,
        runner.scenario.ctx(),
    );
}

public fun auction_claim(
    runner: &mut TestRunner,
    auction: Auction<SUI, Item>,
    claimer_addr: address,
): Item {
    runner.scenario.next_tx(claimer_addr);
    return auction::claim(
        auction,
        &runner.clock,
        runner.scenario.ctx(),
    )
}

public fun auction_admin_claim(
    runner: &mut TestRunner,
    auction: Auction<SUI, Item>,
) {
    runner.scenario.next_tx(ADMIN);
    auction::admin_claim(
        &runner.auction_admin,
        auction,
        runner.scenario.ctx(),
    );
}

public fun auction_admin_cancel(
    runner: &mut TestRunner,
    auction: Auction<SUI, Item>,
): Item {
    runner.scenario.next_tx(ADMIN);
    return auction::admin_cancel(
        &runner.auction_admin,
        auction,
        runner.scenario.ctx(),
    )
}

public fun auction_admin_set_pay_addr(
    runner: &mut TestRunner,
    auction: &mut Auction<SUI, Item>,
    new_pay_addr: address,
) {
    runner.scenario.next_tx(ADMIN);
    auction::admin_set_pay_addr(
        &runner.auction_admin,
        auction,
        new_pay_addr,
    );
}

// === asserts ===

public fun assert_owns_item(
    runner: &mut TestRunner,
    owner_addr: address,
) {
    runner.scenario.next_tx(owner_addr);
    assert!(runner.scenario.has_most_recent_for_sender<Item>());
}

public fun assert_owns_sui(
    runner: &mut TestRunner,
    owner_addr: address,
    sui_value: u64,
) {
    runner.scenario.next_tx(owner_addr);
    let paid_coin = runner.scenario.take_from_sender<Coin<SUI>>();
    assert_eq(paid_coin.value(), sui_value);
    transfer::public_transfer(paid_coin, owner_addr);
}

// === tests ===

#[test]
fun test_new_auction_ok()
{
    // ADMIN creates auction
    let mut runner = begin();
    let auction = runner.auction_new(auction_args());

    // asserts
    let args = auction_args();
    assert_eq(auction.begin_time_ms(), runner.clock.timestamp_ms());
    assert_eq(auction.end_time_ms(), runner.clock.timestamp_ms() + args.duration);
    assert_eq(auction.admin_addr(), object::id_address(&runner.auction_admin));
    assert_eq(auction.pay_addr(), args.pay_addr);
    assert_eq(auction.lead_addr(), @0x0);
    assert_eq(auction.lead_value(), 0);
    assert_eq(auction.minimum_bid(), args.minimum_bid);
    assert_eq(auction.minimum_increase_bps(), args.minimum_increase_bps);
    assert_eq(auction.extension_period_ms(), args.extension_period_ms);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_new_auction_e_wrong_time()
{
    // ADMIN tries to create an auction that starts 1 millisecond ago
    let mut runner = begin();
    let mut args = auction_args();
    args.begin_time_ms = runner.clock.timestamp_ms() - 1;
    let auction = runner.auction_new(args);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_DURATION)]
fun test_new_auction_e_wrong_duration()
{
    // ADMIN tries to create an auction with 0 duration
    let mut runner = begin();
    let mut args = auction_args();
    args.duration = 0;
    let auction = runner.auction_new(args);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_MINIMUM_INCREASE)]
fun test_new_auction_e_wrong_minimum_increase()
{
    // ADMIN tries to create an auction with 0.00% minimum bid increase
    let mut runner = begin();
    let mut args = auction_args();
    args.minimum_increase_bps = 0;
    let auction = runner.auction_new(args);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_MINIMUM_BID)]
fun test_new_auction_e_wrong_minimum_bid()
{
    // ADMIN tries to create an auction with 0 minimum bid
    let mut runner = begin();
    let mut args = auction_args();
    args.minimum_bid = 0;
    let auction = runner.auction_new(args);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_EXTENSION_PERIOD)]
fun test_new_auction_e_wrong_extension_period()
{
    // ADMIN tries to create an auction with 0 extension period
    let mut runner = begin();
    let mut args = auction_args();
    args.extension_period_ms = 0;
    let auction = runner.auction_new(args);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

// =====

#[test]
fun test_bid_ok()
{
    // ADMIN creates auction
    let mut runner = begin();
    let mut auction = runner.auction_new(auction_args());

    // BIDDER_1 bids the moment the auction starts
    // check assumptions
    let end_time_1 = auction.end_time_ms();
    let minimum_bid_1 = auction.minimum_bid();
    assert_eq(minimum_bid_1, 1000);
    assert_eq(auction.begin_time_ms(), runner.clock.timestamp_ms());
    // bid
    runner.auction_bid(&mut auction, BIDDER_1, minimum_bid_1);
    // check outcome
    assert_eq(auction.lead_addr(), BIDDER_1);
    assert_eq(auction.lead_value(), minimum_bid_1);
    let minimum_bid_2 = auction.minimum_bid();
    assert_eq(minimum_bid_2, 1010); // 1% higher

    // BIDDER_2 bids a millisecond before the auction ends
    runner.clock.set_for_testing(auction.end_time_ms() - 1);
    // bid
    runner.auction_bid(&mut auction, BIDDER_2, minimum_bid_2);
    // check outcome
    assert_eq(auction.lead_addr(), BIDDER_2);
    assert_eq(auction.lead_value(), minimum_bid_2);
    runner.assert_owns_sui(BIDDER_1, minimum_bid_1); // got their money back
    assert_eq(auction.end_time_ms(), end_time_1 + auction.extension_period_ms()); // extended end time

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_bid_e_wrong_time_too_early()
{
    // ADMIN creates auction that starts 1 second from now
    let mut runner = begin();
    let mut args = auction_args();
    let begin_time_ms = runner.clock.timestamp_ms() + 1000;
    args.begin_time_ms = begin_time_ms;
    let mut auction = runner.auction_new(args);

    // BIDDER_1 tries to bid 1 millisecond before the auction starts
    runner.clock.set_for_testing(begin_time_ms - 1);
    runner.auction_bid(&mut auction, BIDDER_1, 1000);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_COIN_VALUE)]
fun test_bid_e_wrong_coin_value_1st_bid()
{
    // ADMIN creates auction
    let mut runner = begin();
    let mut auction = runner.auction_new(auction_args());

    // BIDDER_1 bids
    let minimum_bid = auction.minimum_bid();
    runner.auction_bid(&mut auction, BIDDER_1, minimum_bid - 1);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_COIN_VALUE)]
fun test_bid_e_wrong_coin_value_2nd_bid()
{
    // ADMIN creates auction
    let mut runner = begin();
    let mut auction = runner.auction_new(auction_args());

    // BIDDER_1 bids
    let initial_bid = auction.minimum_bid();
    runner.auction_bid(&mut auction, BIDDER_1, initial_bid);

    // BIDDER_2 bids
    let min_second_bid = 1010; // 1% higher than the initial bid of 1000
    runner.auction_bid(&mut auction, BIDDER_2, min_second_bid - 1);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_COIN_VALUE)]
fun test_bid_e_wrong_coin_value_tiny_amounts()
{
    // ADMIN creates auction
    let mut runner = begin();
    let mut args = auction_args();
    args.minimum_bid = 1;
    args.minimum_increase_bps = 1;
    let mut auction = runner.auction_new(args);

    // BIDDER_1 bids
    runner.auction_bid(&mut auction, BIDDER_1, 1);

    // BIDDER_2 bids
    runner.auction_bid(&mut auction, BIDDER_2, 1);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_bid_e_wrong_time_too_late()
{
    // ADMIN creates auction
    let mut runner = begin();
    let mut auction = runner.auction_new(auction_args());

    // BIDDER_1 tries to bid the moment the auction ends
    runner.clock.set_for_testing(auction.end_time_ms());
    runner.auction_bid(&mut auction, BIDDER_1, 1000);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

// =====

#[test]
fun test_claim_ok()
{
    // ADMIN creates auction
    let mut runner = begin();
    let mut auction = runner.auction_new(auction_args());

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.auction_bid(&mut auction, BIDDER_1, bid_value);

    // BIDDER_1 claims the moment the auction ends
    runner.clock.set_for_testing(auction.end_time_ms());
    let item = runner.auction_claim(auction, BIDDER_1);

    // PAYEE gets the money
    runner.assert_owns_sui(PAYEE, bid_value);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(item);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_ADDRESS)]
fun test_claim_e_wrong_address()
{
    // ADMIN creates auction
    let mut runner = begin();
    let mut auction = runner.auction_new(auction_args());

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.auction_bid(&mut auction, BIDDER_1, bid_value);

    // BIDDER_2 tries to claim
    runner.clock.set_for_testing(auction.end_time_ms() );
    let item = runner.auction_claim(auction, BIDDER_2);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(item);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_TIME)]
fun test_claim_e_wrong_time()
{
    // ADMIN creates auction
    let mut runner = begin();
    let mut auction = runner.auction_new(auction_args());

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.auction_bid(&mut auction, BIDDER_1, bid_value);

    // BIDDER_1 tries to claim 1 millisecond before the auction ends
    runner.clock.set_for_testing(auction.end_time_ms() - 1);
    let item = runner.auction_claim(auction, BIDDER_1);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(item);
}

// =====

#[test]
fun test_admin_claim_ok_with_winner()
{
    // ADMIN creates auction
    let mut runner = begin();
    let mut auction = runner.auction_new(auction_args());

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.auction_bid(&mut auction, BIDDER_1, bid_value);

    // ADMIN ends the auction early
    runner.auction_admin_claim(auction);

    // BIDDER_1 gets the item because they won
    runner.assert_owns_item(BIDDER_1);

    // PAYEE gets the money
    runner.assert_owns_sui(PAYEE, bid_value);

    // clean up
    test_utils::destroy(runner);
}

#[test]
fun test_admin_claim_ok_without_winner()
{
    // ADMIN creates auction
    let mut runner = begin();
    let auction = runner.auction_new(auction_args());

    // ADMIN ends the auction early
    runner.auction_admin_claim(auction);

    // ADMIN gets the item because there's no bids
    runner.assert_owns_item(ADMIN);

    // clean up
    test_utils::destroy(runner);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_ADMIN)]
fun test_admin_claim_e_wrong_admin()
{
    // ADMIN creates auction
    let mut runner = begin();
    let auction = runner.auction_new(auction_args());

    // ADMIN tries to end the auction early with wrong AuctionAdmin
    runner.scenario.next_tx(ADMIN);
    let new_auction_admin = auction::new_admin(runner.scenario.ctx());
    auction::admin_claim(
        &new_auction_admin,
        auction,
        runner.scenario.ctx(),
    );

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(new_auction_admin);
}

// =====

#[test]
fun test_admin_cancel_ok()
{
    // ADMIN creates auction
    let mut runner = begin();
    let mut auction = runner.auction_new(auction_args());

    // BIDDER_1 bids
    let bid_value = 1000;
    runner.auction_bid(&mut auction, BIDDER_1, bid_value);

    // ADMIN cancels the auction
    let item = runner.auction_admin_cancel(auction);

    // BIDDER_1 gets their money back
    runner.assert_owns_sui(BIDDER_1, bid_value);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(item);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_ADMIN)]
fun test_admin_cancel_e_wrong_admin()
{
    // ADMIN creates auction
    let mut runner = begin();
    let auction = runner.auction_new(auction_args());

    // ADMIN tries to cancel the auction with wrong AuctionAdmin
    runner.scenario.next_tx(ADMIN);
    let new_auction_admin = auction::new_admin(runner.scenario.ctx());
    let item = auction::admin_cancel(
        &new_auction_admin,
        auction,
        runner.scenario.ctx(),
    );

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(new_auction_admin);
    test_utils::destroy(item);
}

// =====

#[test]
fun test_admin_set_pay_addr_ok()
{
    // ADMIN creates auction
    let mut runner = begin();
    let mut auction = runner.auction_new(auction_args());

    // ADMIN changes pay_addr
    let new_pay_addr = @0x123;
    runner.auction_admin_set_pay_addr(&mut auction, new_pay_addr);

    // new_pay_addr will get the money when the auction is over
    assert_eq(auction.pay_addr(), new_pay_addr);

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(auction);
}

#[test]
#[expected_failure(abort_code = auction::E_WRONG_ADMIN)]
fun test_admin_set_pay_addr_e_wrong_admin()
{
    // ADMIN creates auction
    let mut runner = begin();
    let mut auction = runner.auction_new(auction_args());

    // ADMIN tries to change pay_addr with wrong AuctionAdmin
    runner.scenario.next_tx(ADMIN);
    let new_pay_addr = @0x123;
    let new_auction_admin = auction::new_admin(runner.scenario.ctx());
    auction::admin_set_pay_addr(
        &new_auction_admin,
        &mut auction,
        new_pay_addr,
    );

    // clean up
    test_utils::destroy(runner);
    test_utils::destroy(new_auction_admin);
    test_utils::destroy(auction);
}
