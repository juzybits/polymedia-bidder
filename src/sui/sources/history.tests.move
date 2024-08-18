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

    let (auctions, has_more, next_cursor) = runner.history.get_auctions(CREATOR, true, 0, 5);
    assert_eq(auctions.length(), 5);
    assert_eq(has_more, true);
    assert_eq(next_cursor, 5);

    test_utils::destroy(runner);
}
