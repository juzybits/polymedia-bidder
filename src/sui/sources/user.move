module auction::user;

// === imports ===

use std::string::{utf8};
use sui::display::{Self};
use sui::package::{Self};
use sui::table_vec::{Self, TableVec};
use sui::table::{Self, Table};

use auction::paginator;

// === structs ===

public struct USER has drop {}

public struct Registry has key {
    id: UID,
    users: Table<address, address>,
}

public struct User has key {
    id: UID,
    created: TableVec<address>,
    bids: TableVec<Bid>,
}

public struct Bid has store, copy {
    auction_id: address,
    bid_amount: u64,
}

// === public-view functions ===

public fun get_created_page(
    user: &User,
    ascending: bool,
    cursor: u64,
    limit: u64,
): (vector<address>, bool, u64)
{
    return paginator::get_page(&user.created, ascending, cursor, limit)
}

public fun get_bids_page(
    user: &User,
    ascending: bool,
    cursor: u64,
    limit: u64,
): (vector<Bid>, bool, u64)
{
    return paginator::get_page(&user.bids, ascending, cursor, limit)
}

// === public accessors ===

public fun created(
    user: &User,
): &TableVec<address> {
    &user.created
}

public fun bids(
    user: &User,
): &TableVec<Bid> {
    &user.bids
}

// === public-package functions ===

public(package) fun add_created(
    user: &mut User,
    auction_addr: address,
) {
    user.created.push_back(auction_addr);
}

public(package) fun add_bid(
    user: &mut User,
    bid: Bid,
) {
    user.bids.push_back(bid);
}

public(package) fun new_bid(
    auction_addr: address,
    bid_amount: u64,
): Bid {
    return Bid {
        auction_id: auction_addr,
        bid_amount: bid_amount,
    }
}

// === public-package hot potato ===

public struct Request {
    user: User,
}

public(package) fun new_request(
    ctx: &mut TxContext,
): Request {
    return Request {
        user: new_user(ctx),
    }
}

public(package) fun borrow_mut(
    request: &mut Request,
): &mut User {
    return &mut request.user
}

public(package) fun destroy_request(
    request: Request,
    ctx: &TxContext,
) {
    let Request { user } = request;
    user.transfer_to_sender(ctx);
}

// === private functions ===

fun new_registry(ctx: &mut TxContext): Registry {
    return Registry {
        id: object::new(ctx),
        users: table::new(ctx),
    }
}

fun new_user(
    ctx: &mut TxContext,
): User
{
    return User {
        id: object::new(ctx),
        created: table_vec::empty(ctx),
        bids: table_vec::empty(ctx),
    }
}

fun transfer_to_sender(
    user: User,
    ctx: &TxContext,
) {
    transfer::transfer(user, ctx.sender());
}

// === initialization ===

#[allow(lint(share_owned))]
fun init(otw: USER, ctx: &mut TxContext)
{
    // Claim Publisher object

    let publisher = package::claim(otw, ctx);

    // Create and share the only Registry object that will ever exist

    let registry = new_registry(ctx);
    transfer::share_object(registry);

    // Display for Registry

    let mut display_reg = display::new<Registry>(&publisher, ctx);
    display_reg.add(utf8(b"name"), utf8(b"Auction User Registry"));
    display_reg.add(utf8(b"description"), utf8(b"All auction creators and bidders."));
    display_reg.add(utf8(b"link"), utf8(b"https://auction.polymedia.app"));
    display_reg.add(utf8(b"image_url"), utf8(b"data:image/svg+xml,%3Csvg%20width%3D%22100%25%22%20height%3D%22100%25%22%20viewBox%3D%220%200%201000%201000%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23002436%22%2F%3E%3CforeignObject%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Cdiv%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxhtml%22%20style%3D%22%20height%3A100%25%3Bwidth%3A100%25%3Bdisplay%3Aflex%3Bflex-direction%3Acolumn%3Bjustify-content%3Acenter%3Balign-items%3Acenter%3Bgap%3A1em%3Bbox-sizing%3Aborder-box%3Bpadding%3A0.66em%3Bfont-size%3A75px%3Bfont-family%3Asystem-ui%3Bcolor%3Awhite%3Btext-align%3Acenter%3Boverflow-wrap%3Aanywhere%3B%22%3E%3Cdiv%20style%3D%22font-size%3A1.5em%22%3E%3Cb%3EAUCTION%20USER%20REGISTRY%3C%2Fb%3E%3C%2Fdiv%3E%3C%2Fdiv%3E%3C%2FforeignObject%3E%3C%2Fsvg%3E"));
    display_reg.add(utf8(b"project_name"), utf8(b"Auction | Polymedia"));
    display_reg.add(utf8(b"project_url"), utf8(b"https://auction.polymedia.app"));
    // display_reg.add(utf8(b"thumbnail_url"), utf8(b""));
    // display_reg.add(utf8(b"project_image_url"), utf8(b""));
    // display_reg.add(utf8(b"creator"), utf8(b""));
    display::update_version(&mut display_reg);

    // Display for User

    let mut display_usr = display::new<User>(&publisher, ctx);
    display_usr.add(utf8(b"name"), utf8(b"Auction User"));
    display_usr.add(utf8(b"description"), utf8(b"User auctions and bids."));
    display_usr.add(utf8(b"link"), utf8(b"https://auction.polymedia.app"));
    display_usr.add(utf8(b"image_url"), utf8(b"data:image/svg+xml,%3Csvg%20width%3D%22100%25%22%20height%3D%22100%25%22%20viewBox%3D%220%200%201000%201000%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23002436%22%2F%3E%3CforeignObject%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Cdiv%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxhtml%22%20style%3D%22%20height%3A100%25%3Bwidth%3A100%25%3Bdisplay_usr%3Aflex%3Bflex-direction%3Acolumn%3Bjustify-content%3Acenter%3Balign-items%3Acenter%3Bgap%3A1em%3Bbox-sizing%3Aborder-box%3Bpadding%3A0.66em%3Bfont-size%3A75px%3Bfont-family%3Asystem-ui%3Bcolor%3Awhite%3Btext-align%3Acenter%3Boverflow-wrap%3Aanywhere%3B%22%3E%3Cdiv%20style%3D%22font-size%3A1.5em%22%3E%3Cb%3EAUCTION%20USER%3C%2Fb%3E%3C%2Fdiv%3E%3C%2Fdiv%3E%3C%2FforeignObject%3E%3C%2Fsvg%3E"));
    display_usr.add(utf8(b"project_name"), utf8(b"Auction | Polymedia"));
    display_usr.add(utf8(b"project_url"), utf8(b"https://auction.polymedia.app"));
    // display_usr.add(utf8(b"thumbnail_url"), utf8(b""));
    // display_usr.add(utf8(b"project_image_url"), utf8(b""));
    // display_usr.add(utf8(b"creator"), utf8(b""));
    display::update_version(&mut display_usr);

    // Transfer objects to the sender

    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(display_reg, ctx.sender());
    transfer::public_transfer(display_usr, ctx.sender());
}

// === test functions ===

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(USER {}, ctx)
}

#[test_only]
public fun new_registry_for_testing(ctx: &mut TxContext): Registry {
    return new_registry(ctx)
}
