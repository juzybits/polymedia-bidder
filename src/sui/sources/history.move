module auction::history;

// === imports ===

use std::string::{utf8};
use sui::display::{Self};
use sui::package::{Self};
use sui::table_vec::{Self, TableVec};
use sui::table::{Self, Table};

use auction::paginator;

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
    return paginator::get_page(auctions, ascending, cursor, limit)
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

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(HISTORY {}, ctx)
}

#[test_only]
public fun new_history_for_testing(ctx: &mut TxContext): History {
    return new_history(ctx)
}
