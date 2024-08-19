#[test_only]
module auction::paginator_tests;

use sui::table_vec::{Self};
use sui::test_scenario::{Self, Scenario};
use sui::test_utils::{Self, assert_eq};

use auction::paginator;

// === addresses ===

const ADMIN: address = @0x777;

// === test runner ===

public struct TestRunner {
    scen: Scenario,
}

public fun begin(): TestRunner
{
    let scen = test_scenario::begin(ADMIN);
    return TestRunner {
        scen,
    }
}

// === tests ===

#[test]
fun test_get_auctions()
{
    let mut runner = begin();

    let mut items = table_vec::empty<u8>(runner.scen.ctx());
    items.push_back(0);
    items.push_back(1);
    items.push_back(2);
    items.push_back(3);
    items.push_back(4);
    items.push_back(5);
    items.push_back(6);
    items.push_back(7);
    items.push_back(8);
    items.push_back(9);

    let items_empty = table_vec::empty<u8>(runner.scen.ctx());

    assert_eq(items.length(), 10);

    // ascending, first 4 items (0-3)
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, true, 0, 4);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 4);
    assert_eq(*auctions.borrow(0), 0);
    assert_eq(*auctions.borrow(3), 3);

    // ascending, middle of the list (3-7)
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, true, 3, 4);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 7);
    assert_eq(*auctions.borrow(0), 3);
    assert_eq(*auctions.borrow(3), 6);

    // ascending, last 4 items (6-9)
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, true, 6, 4);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);
    assert_eq(*auctions.borrow(0), 6);
    assert_eq(*auctions.borrow(3), 9);

    // ascending, last 4 items (6-9), limit > amount
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, true, 6, 10);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);
    assert_eq(*auctions.borrow(0), 6);
    assert_eq(*auctions.borrow(3), 9);

    // ascending, cursor > length (out of range)
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, true, 15, 3);
    assert_eq(auctions.length(), 0);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);

    // ascending, limit = 0
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, true, 3, 0);
    assert_eq(auctions.length(), 0);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 3);

    // ascending, cursor at last item, limit = 1
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, true, 9, 1);
    assert_eq(auctions.length(), 1);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);
    assert_eq(*auctions.borrow(0), 9);

    // ascending, cursor at last item, limit > 1
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, true, 9, 5);
    assert_eq(auctions.length(), 1);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);
    assert_eq(*auctions.borrow(0), 9);

    // ascending, empty list
    let (auctions, has_more, next_cursor) = paginator::get_page(&items_empty, true, 0, 5);
    assert_eq(auctions.length(), 0);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);

    // descending, last 4 items (9-6)
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, false, 9, 4);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 5);
    assert_eq(*auctions.borrow(0), 9);
    assert_eq(*auctions.borrow(3), 6);

    // descending, middle of the list (7-4)
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, false, 7, 4);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 3);
    assert_eq(*auctions.borrow(0), 7);
    assert_eq(*auctions.borrow(3), 4);

    // descending, first 4 items (3-0)
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, false, 3, 4);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);
    assert_eq(*auctions.borrow(0), 3);
    assert_eq(*auctions.borrow(3), 0);

    // descending, first 4 items (3-0), limit > amount
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, false, 3, 10);
    assert_eq(auctions.length(), 4);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);
    assert_eq(*auctions.borrow(0), 3);
    assert_eq(*auctions.borrow(3), 0);

    // descending, cursor > length (out of range)
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, false, 15, 3);
    assert_eq(auctions.length(), 0);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);

    // descending, limit = 0
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, false, 3, 0);
    assert_eq(auctions.length(), 0);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 3);

    // descending, cursor at first item, limit = 1
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, false, 0, 1);
    assert_eq(auctions.length(), 1);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);
    assert_eq(*auctions.borrow(0), 0);

    // descending, cursor at first item, limit > 1
    let (auctions, has_more, next_cursor) = paginator::get_page(&items, false, 0, 5);
    assert_eq(auctions.length(), 1);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);
    assert_eq(*auctions.borrow(0), 0);

    // descending, empty list
    let (auctions, has_more, next_cursor) = paginator::get_page(&items_empty, false, 0, 5);
    assert_eq(auctions.length(), 0);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);

    test_utils::destroy(items);
    test_utils::destroy(items_empty);
    test_utils::destroy(runner);
}
