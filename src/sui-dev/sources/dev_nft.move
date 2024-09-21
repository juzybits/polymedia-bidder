module dev::dev_nft;

// === imports ===

use std::string::{utf8, String};
use sui::display::{Self};
use sui::package::{Self};

// === structs ===

public struct DEV_NFT has drop {}

public struct DevNft has key, store {
    id: UID,
    name: String,
    description: String,
    image_url: String,
}

// === public-mutative functions ===

public fun new_dev_nft(
    name: vector<u8>,
    description: vector<u8>,
    image_url: vector<u8>,
    ctx: &mut TxContext
): DevNft {
    return DevNft {
        id: object::new(ctx),
        name: name.to_string(),
        description: description.to_string(),
        image_url: image_url.to_string(),
    }
}

// === initialization ===

#[allow(lint(share_owned))]
fun init(otw: DEV_NFT, ctx: &mut TxContext)
{
    // claim Publisher object

    let publisher = package::claim(otw, ctx);

    // Display<DevNft>

    let mut display = display::new<DevNft>(&publisher, ctx);
    display.add(utf8(b"name"), utf8(b"{name}"));
    display.add(utf8(b"description"), utf8(b"{description}"));
    display.add(utf8(b"image_url"), utf8(b"{image_url}"));
    display.add(utf8(b"project_name"), utf8(b"Free NFTs for testing"));
    display.add(utf8(b"project_url"), utf8(b"https://polymedia.app"));
    display::update_version(&mut display);

    // transfer objects to the sender

    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(display, ctx.sender());
}
