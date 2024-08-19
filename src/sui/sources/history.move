module auction::history;

// === imports ===

use std::string::{utf8};
use std::u64::{Self};
use sui::display::{Self};
use sui::package::{Self};
use sui::table_vec::{Self, TableVec};
use sui::table::{Self, Table};

// === errors ===

// === constants ===

// === structs ===

public struct HISTORY has drop {}

public struct History has key, store {
    id: UID,
    total_auctions: u64,
    creators: Table<address, Creator>,
}

public struct Creator has store {
    auctions: TableVec<address>,
}

// === method aliases ===

// === public-mutative functions ===

// === public-view functions ===

public fun get_auctions(
    history: &History,
    creator_addr: address,
    ascending: bool,
    cursor: u64,
    limit: u64,
): (vector<address>, bool, u64)
{
    if (!history.creators.contains(creator_addr)) {
        return (vector[], false, 0)
    };

    let auctions = history.creators.borrow(creator_addr).auctions();

    if (ascending) {
        get_auctions_ascending(auctions, cursor, limit)
    } else {
        get_auctions_descending(auctions, cursor, limit)
    }
}

fun get_auctions_ascending(
    auctions: &TableVec<address>,
    cursor: u64,
    limit: u64,
): (vector<address>, bool, u64)
{
    let length = auctions.length();

    let start = cursor;
    let end = u64::min(length, cursor + limit);

    let mut data = vector<address>[];
    let mut i = start;
    while (i < end) {
        vector::push_back(&mut data, *auctions.borrow(i));
        i = i + 1;
    };

    let has_more = end < length;
    let next_cursor = end;

    return (data, has_more, next_cursor)
}

fun get_auctions_descending(
    auctions: &TableVec<address>,
    cursor: u64,
    limit: u64,
): (vector<address>, bool, u64)
{
    let length = auctions.length();

    let start =
        if (cursor < length) { cursor }
        else { length - 1 }; // start at last item

    let end =
        if (limit > cursor) { 0 } // end at first item
        else { cursor - limit + 1 };

    let mut data = vector<address>[];
    let mut i = start;
    while (i >= end) {
        vector::push_back(&mut data, *auctions.borrow(i));
        if (i == 0) { break }  // prevent underflow
        else { i = i - 1; }
    };

    let has_more = start > 0 && cursor < length && end > 0;

    let next_cursor =
        if (cursor >= length) {
            length  // if cursor is out of range, next_cursor should be the length of the list
        } else if (end > 0) {
            end - 1  // the last item fetched in descending order
        } else {
            0
        };

    return (data, has_more, next_cursor)
}

// === public accessors ===

public fun total_auctions(
    history: &History,
): u64 {
    history.total_auctions
}

public fun creators(
    history: &History,
): &Table<address, Creator> {
    &history.creators
}

public fun auctions(
    creator: &Creator,
): &TableVec<address> {
    &creator.auctions
}

// === admin functions ===

// === public-package functions ===

public(package) fun add(
    history: &mut History,
    creator_addr: address,
    auction_addr: address,
    ctx: &mut TxContext,
) {
    if (!history.creators.contains(creator_addr)) {
        history.creators.add(
            creator_addr,
            new_creator(ctx),
        );
    };

    let creator = history.creators.borrow_mut(creator_addr);
    creator.auctions.push_back(auction_addr);
    history.total_auctions = history.total_auctions + 1;
}

// === private functions ===

fun new_history(
    ctx: &mut TxContext,
): History
{
    return History {
        id: object::new(ctx),
        total_auctions: 0,
        creators: table::new(ctx),
    }
}

fun new_creator(
    ctx: &mut TxContext,
): Creator
{
    return Creator {
        auctions: table_vec::empty(ctx),
    }
}

// === initialization ===

#[allow(lint(share_owned))]
fun init(otw: HISTORY, ctx: &mut TxContext)
{
    // Create and share the only History object that will ever exist

    let history = new_history(ctx);
    transfer::public_share_object(history);

    // Publisher

    let publisher = package::claim(otw, ctx);

    // Display for History

    let mut display = display::new<History>(&publisher, ctx);
    display.add(utf8(b"name"), utf8(b"Auction History"));
    display.add(utf8(b"description"), utf8(b"All auctions ever created."));
    display.add(utf8(b"link"), utf8(b"https://auction.polymedia.app"));
    display.add(utf8(b"image_url"), utf8(b"data:image/svg+xml,TODO"));
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

#[test_only]
public fun new_history_for_testing(ctx: &mut TxContext): History {
    return new_history(ctx)
}
