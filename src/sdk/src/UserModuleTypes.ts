import { bcs } from "@mysten/sui/bcs";

export const UserAuctionBcs = bcs.struct("UserAuction", {
    auction_addr: bcs.Address,
    time: bcs.U64,
});

export type UserAuction = {
    auction_addr: string;
    time: number;
};

export const UserBidBcs = bcs.struct("UserBid", {
    auction_addr: bcs.Address,
    time: bcs.U64,
    amount: bcs.U64,
});

export type UserBid = {
    auction_addr: string;
    time: number;
    amount: bigint;
};
