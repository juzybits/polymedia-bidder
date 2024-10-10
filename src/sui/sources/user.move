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
    owner: address,
    created: TableVec<UserAuction>,
    bids: TableVec<UserBid>,
    // data: String, // v2: optional user profile
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
    cursor: u64,
    limit: u64,
    ascending: bool,
): (vector<UserAuction>, bool, u64)
{
    return paginator::get_page(&user.created, cursor, limit, ascending)
}

public fun get_bids_placed(
    user: &User,
    cursor: u64,
    limit: u64,
    ascending: bool,
): (vector<UserBid>, bool, u64)
{
    return paginator::get_page(&user.bids, cursor, limit, ascending)
}

public fun get_auctions_and_bids(
    user: &User,
    cursor_created: u64,
    cursor_bids: u64,
    limit_created: u64,
    limit_bids: u64,
    ascending: bool,
): ((u64, u64, vector<UserAuction>, vector<UserBid>, bool, bool, u64, u64))
{
   let (crtd_page, crtd_more, crtd_cursor) = get_auctions_created(user, cursor_created, limit_created, ascending);
   let (bids_page, bids_more, bids_cursor) = get_bids_placed(user, cursor_bids, limit_bids, ascending);
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
        owner: ctx.sender(),
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
    display_reg.add(utf8(b"image_url"), utf8(b"data:image/svg+xml,%3Csvg%20width%3D%22100%25%22%20height%3D%22100%25%22%20viewBox%3D%220%200%20100%20100%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22%230F4C75%22%2F%3E%3Ctext%20x%3D%2250%22%20y%3D%2250%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2216%22%20font-weight%3D%22bold%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%3Ctspan%20x%3D%2250%22%20dy%3D%22-0.5em%22%3EUSER%3C%2Ftspan%3E%3Ctspan%20x%3D%2250%22%20dy%3D%221.3em%22%3EREGISTRY%3C%2Ftspan%3E%3C%2Ftext%3E%3Ctext%20x%3D%2294%22%20y%3D%2294%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%227%22%20font-weight%3D%22bold%22%20text-anchor%3D%22end%22%20dominant-baseline%3D%22text-bottom%22%3E%3Ctspan%20fill%3D%22yellow%22%20stroke%3D%22black%22%20stroke-width%3D%220.7%22%20paint-order%3D%22stroke%22%3EBIDDER%3C%2Ftspan%3E%3C%2Ftext%3E%3C%2Fsvg%3E"));
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
    display_usr.add(utf8(b"link"), utf8(b"https://bidder.polymedia.app/user/{owner}/bids"));
    display_usr.add(utf8(b"image_url"), utf8(b"data:image/svg+xml,%3Csvg%20width%3D%22100%25%22%20height%3D%22100%25%22%20viewBox%3D%220%200%20100%20100%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22%230F4C75%22%2F%3E%3Ctext%20x%3D%2250%22%20y%3D%2250%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2225%22%20font-weight%3D%22bold%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%3Ctspan%20x%3D%2250%22%20dy%3D%220%22%3EUSER%3C%2Ftspan%3E%3C%2Ftext%3E%3Ctext%20x%3D%2294%22%20y%3D%2294%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%227%22%20font-weight%3D%22bold%22%20text-anchor%3D%22end%22%20dominant-baseline%3D%22text-bottom%22%3E%3Ctspan%20fill%3D%22yellow%22%20stroke%3D%22black%22%20stroke-width%3D%220.7%22%20paint-order%3D%22stroke%22%3EBIDDER%3C%2Ftspan%3E%3C%2Ftext%3E%3C%2Fsvg%3E"));
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
