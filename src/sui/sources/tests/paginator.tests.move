#[test_only]
module bidder::paginator_tests;

use sui::table_vec::{Self};
use sui::test_scenario::{Self, Scenario};
use sui::test_utils::{Self, assert_eq};

use bidder::paginator;

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
fun test_get_page()
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

    // ascending, oldest 4 items 0-3
    let (page, has_more, next_cursor) = paginator::get_page(&items, 0, 4, true);
    assert_eq(page.length(), 4);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 4);
    assert_eq(*page.borrow(0), 0);
    assert_eq(*page.borrow(3), 3);

    // ascending, middle items 4-7
    let (page, has_more, next_cursor) = paginator::get_page(&items, 4, 4, true);
    assert_eq(page.length(), 4);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 8);
    assert_eq(*page.borrow(0), 4);
    assert_eq(*page.borrow(3), 7);

    // ascending, newest items 8-9, limit > remaining items
    let (page, has_more, next_cursor) = paginator::get_page(&items, 8, 4, true);
    assert_eq(page.length(), 2);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);
    assert_eq(*page.borrow(0), 8);
    assert_eq(*page.borrow(1), 9);

    // ascending, newest items 6-9, limit == remaining items
    let (page, has_more, next_cursor) = paginator::get_page(&items, 6, 4, true);
    assert_eq(page.length(), 4);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);
    assert_eq(*page.borrow(0), 6);
    assert_eq(*page.borrow(3), 9);

    // ascending, cursor > length (out of range)
    let (page, has_more, next_cursor) = paginator::get_page(&items, 999, 3, true);
    assert_eq(page.length(), 0);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);

    // ascending, limit = 0
    let (page, has_more, next_cursor) = paginator::get_page(&items, 3, 0, true);
    assert_eq(page.length(), 0);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 3);

    // ascending, cursor at newest item, limit = 1
    let (page, has_more, next_cursor) = paginator::get_page(&items, 9, 1, true);
    assert_eq(page.length(), 1);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);
    assert_eq(*page.borrow(0), 9);

    // ascending, cursor at newest item, limit > 1
    let (page, has_more, next_cursor) = paginator::get_page(&items, 9, 5, true);
    assert_eq(page.length(), 1);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 10);
    assert_eq(*page.borrow(0), 9);

    // ascending, empty list
    let (page, has_more, next_cursor) = paginator::get_page(&items_empty, 0, 5, true);
    assert_eq(page.length(), 0);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);

    // descending, newest 4 items 9-6
    let (page, has_more, next_cursor) = paginator::get_page(&items, 9, 4, false);
    assert_eq(page.length(), 4);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 5);
    assert_eq(*page.borrow(0), 9);
    assert_eq(*page.borrow(3), 6);

    // descending, middle items 5-2
    let (page, has_more, next_cursor) = paginator::get_page(&items, 5, 4, false);
    assert_eq(page.length(), 4);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 1);
    assert_eq(*page.borrow(0), 5);
    assert_eq(*page.borrow(3), 2);

    // descending, oldest items 1-0, limit > remaining items
    let (page, has_more, next_cursor) = paginator::get_page(&items, 1, 4, false);
    assert_eq(page.length(), 2);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);
    assert_eq(*page.borrow(0), 1);
    assert_eq(*page.borrow(1), 0);

    // descending, oldest 4 items 3-0, limit == remaining items
    let (page, has_more, next_cursor) = paginator::get_page(&items, 3, 4, false);
    assert_eq(page.length(), 4);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);
    assert_eq(*page.borrow(0), 3);
    assert_eq(*page.borrow(3), 0);

    // descending, cursor > length (out of range)
    let (page, has_more, next_cursor) = paginator::get_page(&items, 999, 3, false);
    assert_eq(page.length(), 3);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 6);
    assert_eq(*page.borrow(0), 9);
    assert_eq(*page.borrow(2), 7);

    // descending, limit = 0
    let (page, has_more, next_cursor) = paginator::get_page(&items, 3, 0, false);
    assert_eq(page.length(), 0);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 3);

    // descending, cursor at oldest item, limit = 1
    let (page, has_more, next_cursor) = paginator::get_page(&items, 0, 1, false);
    assert_eq(page.length(), 1);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);
    assert_eq(*page.borrow(0), 0);

    // descending, cursor at oldest item, limit > 1
    let (page, has_more, next_cursor) = paginator::get_page(&items, 0, 5, false);
    assert_eq(page.length(), 1);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);
    assert_eq(*page.borrow(0), 0);

    // descending, empty list
    let (page, has_more, next_cursor) = paginator::get_page(&items_empty, 0, 5, false);
    assert_eq(page.length(), 0);
    assert_eq(has_more, false);
    assert_eq(next_cursor, 0);

    test_utils::destroy(items);
    test_utils::destroy(items_empty);
    test_utils::destroy(runner);
}
