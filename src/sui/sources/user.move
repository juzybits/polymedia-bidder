module bidder::user;

// === imports ===

use std::string::{utf8};
use sui::display::{Self};
use sui::package::{Self};
use sui::table_vec::{Self, TableVec};
use sui::table::{Self, Table};

use bidder::paginator;

// === errors ===

const E_USER_ALREADY_EXISTS: u64 = 6000;

// === structs ===

/// one time witness (OTW)
public struct USER has drop {}

/// guarantees 1 User per address
public struct UserRegistry has key {
    id: UID,
    users: Table<address, address>, // address -> User
}

/// stores all auctions created and all bids placed by an address
public struct User has key {
    id: UID,
    created: TableVec<UserAuction>,
    bids: TableVec<UserBid>,
}

/// an auction and its creation time
public struct UserAuction has store, copy {
    auction_addr: address,
    time: u64,
}

/// a bid on an auction
public struct UserBid has store, copy {
    auction_addr: address,
    time: u64,
    amount: u64,
}

// === UserRequest hot potato ===

public struct UserRequest {
    user: User,
}

public fun new_user_request(
    registry: &mut UserRegistry,
    ctx: &mut TxContext,
): UserRequest
{
    assert!( !registry.users.contains(ctx.sender()), E_USER_ALREADY_EXISTS );
    let user = new_user(ctx);
    registry.users.add(ctx.sender(), user.id.to_address());
    return UserRequest { user }
}

public fun existing_user_request(
    user: User,
): UserRequest {
    return UserRequest {
        user,
    }
}

public fun destroy_user_request(
    request: UserRequest,
    ctx: &TxContext,
) {
    let UserRequest { user } = request;
    transfer::transfer(user, ctx.sender());
}

// === public-view functions ===

/// get the address of the User object owned by the given address, or 0x0 if it doesn't exist
public fun get_user_address(
    registry: &UserRegistry,
    owner_addr: address,
): address
{
    if (table::contains(&registry.users, owner_addr)) {
        *table::borrow(&registry.users, owner_addr)
    } else {
        @0x0
    }
}

/// get the addresses of the User objects owned by the given addresses, or 0x0 if they don't exist
public fun get_user_addresses(
    registry: &UserRegistry,
    owner_addrs: vector<address>,
): vector<address>
{
    owner_addrs.map!(|owner_addr|{
        if (table::contains(&registry.users, owner_addr)) {
            *table::borrow(&registry.users, owner_addr)
        } else {
            @0x0
        }
    })
}

public fun get_auctions_created(
    user: &User,
    ascending: bool,
    cursor: u64,
    limit: u64,
): (vector<UserAuction>, bool, u64)
{
    return paginator::get_page(&user.created, ascending, cursor, limit)
}

public fun get_bids_placed(
    user: &User,
    ascending: bool,
    cursor: u64,
    limit: u64,
): (vector<UserBid>, bool, u64)
{
    return paginator::get_page(&user.bids, ascending, cursor, limit)
}

public fun get_auctions_and_bids(
    user: &User,
    ascending: bool,
    cursor_created: u64,
    cursor_bids: u64,
    limit_created: u64,
    limit_bids: u64,
): ((u64, u64, vector<UserAuction>, vector<UserBid>, bool, bool, u64, u64))
{
   let (crtd_page, crtd_more, crtd_cursor) = get_auctions_created(user, ascending, cursor_created, limit_created);
   let (bids_page, bids_more, bids_cursor) = get_bids_placed(user, ascending, cursor_bids, limit_bids);
   return (
        user.created.length(), user.bids.length(),
        crtd_page, bids_page,
        crtd_more, bids_more,
        crtd_cursor, bids_cursor,
    )
}

// === public accessors ===

public fun users(
    registry: &UserRegistry,
): &Table<address, address> {
    &registry.users
}

public fun created(
    user: &User,
): &TableVec<UserAuction> {
    &user.created
}

public fun bids(
    user: &User,
): &TableVec<UserBid> {
    &user.bids
}

// === public-package functions ===

public(package) fun add_created(
    user_req: &mut UserRequest,
    auction_addr: address,
    time: u64,
) {
    user_req.user.created.push_back(UserAuction {
        auction_addr,
        time,
    });
}

public(package) fun add_bid(
    user_req: &mut UserRequest,
    auction_addr: address,
    time: u64,
    amount: u64,
) {
    user_req.user.bids.push_back(UserBid {
        auction_addr,
        time,
        amount,
    });
}

// === private functions ===

fun new_registry(ctx: &mut TxContext): UserRegistry {
    return UserRegistry {
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

// === initialization ===

#[allow(lint(share_owned))]
fun init(otw: USER, ctx: &mut TxContext)
{
    // claim Publisher object

    let publisher = package::claim(otw, ctx);

    // create and share the only UserRegistry object that will ever exist

    let registry = new_registry(ctx);
    transfer::share_object(registry);

    // Display for UserRegistry

    let mut display_reg = display::new<UserRegistry>(&publisher, ctx);
    display_reg.add(utf8(b"name"), utf8(b"Bidder User Registry"));
    display_reg.add(utf8(b"description"), utf8(b"All BIDDER users (addresses that have created auctions or placed bids)."));
    display_reg.add(utf8(b"link"), utf8(b"https://bidder.polymedia.app"));
    display_reg.add(utf8(b"image_url"), utf8(b"data:image/svg+xml,%3Csvg%20width%3D%22100%25%22%20height%3D%22100%25%22%20viewBox%3D%220%200%201000%201000%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%230F4C75%22%2F%3E%3CforeignObject%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Cdiv%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxhtml%22%20style%3D%22%20height%3A100%25%3Bwidth%3A100%25%3Bdisplay%3Aflex%3Bflex-direction%3Acolumn%3Bjustify-content%3Acenter%3Balign-items%3Acenter%3Bgap%3A40px%3Bposition%3Arelative%3Bbox-sizing%3Aborder-box%3Bpadding%3A40px%3Bfont-family%3Asystem-ui%3Bcolor%3Awhite%3Btext-align%3Acenter%3Boverflow-wrap%3Aanywhere%3B%22%3E%3Cdiv%20style%3D%22font-size%3A160px%22%3E%3Cb%3EUSER%20REGISTRY%3C%2Fb%3E%3C%2Fdiv%3E%3Cdiv%20style%3D%22%20position%3Aabsolute%3Bbottom%3A40px%3Bright%3A40px%3Bfont-size%3A75px%3Btext-align%3Aright%3Bfont-weight%3Abold%3Bcolor%3Ayellow%3Bbackground-color%3Ablack%3Bborder%3A9px%20solid%20yellow%3Bpadding%3A0%2015px%3B%22%3EBIDDER%3C%2Fdiv%3E%3C%2Fdiv%3E%3C%2FforeignObject%3E%3C%2Fsvg%3E"));
    display_reg.add(utf8(b"project_name"), utf8(b"BIDDER | Polymedia"));
    display_reg.add(utf8(b"project_url"), utf8(b"https://bidder.polymedia.app"));
    // display_reg.add(utf8(b"thumbnail_url"), utf8(b""));
    // display_reg.add(utf8(b"project_image_url"), utf8(b""));
    // display_reg.add(utf8(b"creator"), utf8(b""));
    display::update_version(&mut display_reg);

    // Display for User

    let mut display_usr = display::new<User>(&publisher, ctx);
    display_usr.add(utf8(b"name"), utf8(b"BIDDER User"));
    display_usr.add(utf8(b"description"), utf8(b"Auctions created and bids placed by this address."));
    display_usr.add(utf8(b"link"), utf8(b"https://bidder.polymedia.app/user/o/{id}"));
    display_usr.add(utf8(b"image_url"), utf8(b"data:image/svg+xml,%3Csvg%20width%3D%22100%25%22%20height%3D%22100%25%22%20viewBox%3D%220%200%201000%201000%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%230F4C75%22%2F%3E%3CforeignObject%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Cdiv%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxhtml%22%20style%3D%22%20height%3A100%25%3Bwidth%3A100%25%3Bdisplay%3Aflex%3Bflex-direction%3Acolumn%3Bjustify-content%3Acenter%3Balign-items%3Acenter%3Bgap%3A40px%3Bposition%3Arelative%3Bbox-sizing%3Aborder-box%3Bpadding%3A40px%3Bfont-family%3Asystem-ui%3Bcolor%3Awhite%3Btext-align%3Acenter%3Boverflow-wrap%3Aanywhere%3B%22%3E%3Cdiv%20style%3D%22font-size%3A200px%22%3E%3Cb%3EUSER%3C%2Fb%3E%3C%2Fdiv%3E%3Cdiv%20style%3D%22%20position%3Aabsolute%3Bbottom%3A40px%3Bright%3A40px%3Bfont-size%3A75px%3Btext-align%3Aright%3Bfont-weight%3Abold%3Bcolor%3Ayellow%3Bbackground-color%3Ablack%3Bborder%3A9px%20solid%20yellow%3Bpadding%3A0%2015px%3B%22%3EBIDDER%3C%2Fdiv%3E%3C%2Fdiv%3E%3C%2FforeignObject%3E%3C%2Fsvg%3E"));
    display_usr.add(utf8(b"project_name"), utf8(b"BIDDER | Polymedia"));
    display_usr.add(utf8(b"project_url"), utf8(b"https://bidder.polymedia.app"));
    // display_usr.add(utf8(b"thumbnail_url"), utf8(b""));
    // display_usr.add(utf8(b"project_image_url"), utf8(b""));
    // display_usr.add(utf8(b"creator"), utf8(b""));
    display::update_version(&mut display_usr);

    // transfer objects to the sender

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
public fun new_registry_for_testing(ctx: &mut TxContext): UserRegistry {
    return new_registry(ctx)
}
