#[test_only]
module auction::history_tests;

use sui::test_scenario::{Self, Scenario};
use sui::test_utils::{Self, assert_eq};

use auction::history::{Self, History};

// === default args ===

const ADMIN: address = @0x777;
const CREATOR: address = @0x123;

// === test runner ===

public struct TestRunner {
    scen: Scenario,
    history: History,
}

public fun begin(): TestRunner
{
    let mut scen = test_scenario::begin(ADMIN);
    let history = history::new_history_for_testing(scen.ctx());
    return TestRunner {
        scen,
        history,
    }
}

// === helpers for sui modules ===

// === helpers for our modules ===

// === asserts ===

// === tests ===

#[test]
fun test_get_auctions()
{
    let mut runner = begin();

    runner.history.add(CREATOR, @0xa00, runner.scen.ctx());
    runner.history.add(CREATOR, @0xa01, runner.scen.ctx());
    runner.history.add(CREATOR, @0xa02, runner.scen.ctx());
    runner.history.add(CREATOR, @0xa03, runner.scen.ctx());
    runner.history.add(CREATOR, @0xa04, runner.scen.ctx());
    runner.history.add(CREATOR, @0xa05, runner.scen.ctx());
    runner.history.add(CREATOR, @0xa06, runner.scen.ctx());
    runner.history.add(CREATOR, @0xa07, runner.scen.ctx());
    runner.history.add(CREATOR, @0xa08, runner.scen.ctx());
    runner.history.add(CREATOR, @0xa09, runner.scen.ctx());

    assert_eq(runner.history.total_auctions(), 10);

    // ascending, first 4 items (0-3)
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, true, 0, 4);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 4);
    assert_eq(*auctions.borrow(0), @0xa00);
    assert_eq(*auctions.borrow(3), @0xa03);

    // ascending, middle of the list (3-7)
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, true, 3, 4);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 7);
    assert_eq(*auctions.borrow(0), @0xa03);
    assert_eq(*auctions.borrow(3), @0xa06);

    // ascending, last 4 items (6-9)
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, true, 6, 4);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);
    assert_eq(*auctions.borrow(0), @0xa06);
    assert_eq(*auctions.borrow(3), @0xa09);

    // ascending, last 4 items (6-9), limit > amount
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, true, 6, 10);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);
    assert_eq(*auctions.borrow(0), @0xa06);
    assert_eq(*auctions.borrow(3), @0xa09);

    // ascending, cursor > length (out of range)
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, true, 15, 3);
    assert_eq(auctions.length(), 0);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);

    // ascending, limit = 0
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, true, 3, 0);
    assert_eq(auctions.length(), 0);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 3);

    // ascending, cursor at last item, limit = 1
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, true, 9, 1);
    assert_eq(auctions.length(), 1);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);
    assert_eq(*auctions.borrow(0), @0xa09);

    // ascending, cursor at last item, limit > 1
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, true, 9, 5);
    assert_eq(auctions.length(), 1);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);
    assert_eq(*auctions.borrow(0), @0xa09);

    // ascending, empty list
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(@0x999, true, 0, 5);
    assert_eq(auctions.length(), 0);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);

    // descending, last 4 items (9-6)
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, false, 9, 4);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 5);
    assert_eq(*auctions.borrow(0), @0xa09);
    assert_eq(*auctions.borrow(3), @0xa06);

    // descending, middle of the list (7-4)
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, false, 7, 4);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 3);
    assert_eq(*auctions.borrow(0), @0xa07);
    assert_eq(*auctions.borrow(3), @0xa04);

    // descending, first 4 items (3-0)
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, false, 3, 4);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);
    assert_eq(*auctions.borrow(0), @0xa03);
    assert_eq(*auctions.borrow(3), @0xa00);

    // descending, first 4 items (3-0), limit > amount
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, false, 3, 10);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);
    assert_eq(*auctions.borrow(0), @0xa03);
    assert_eq(*auctions.borrow(3), @0xa00);

    // descending, cursor > length (out of range)
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, false, 15, 3);
    assert_eq(auctions.length(), 0);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);

    // descending, limit = 0
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, false, 3, 0);
    assert_eq(auctions.length(), 0);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 3);

    // descending, cursor at first item, limit = 1
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, false, 0, 1);
    assert_eq(auctions.length(), 1);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);
    assert_eq(*auctions.borrow(0), @0xa00);

    // descending, cursor at first item, limit > 1
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, false, 0, 5);
    assert_eq(auctions.length(), 1);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);
    assert_eq(*auctions.borrow(0), @0xa00);

    // descending, empty list
    let (auctions, has_more, next_cursor) = runner.history.get_auctions(@0x999, false, 0, 5);
    assert_eq(auctions.length(), 0);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);

    test_utils::destroy(runner);
}
