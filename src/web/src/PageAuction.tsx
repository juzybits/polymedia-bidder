import { useCurrentAccount } from "@mysten/dapp-kit";
import { AuctionClient, AuctionObj } from "@polymedia/auction-sdk";
import { balanceToString } from "@polymedia/suitcase-core";
import React, { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { AppContext } from "./App";
import { CardAuctionItems, CardTransaction } from "./components/cards";
import { FullScreenMsg } from "./components/FullScreenMsg";
import { useInputUnsignedBalance } from "./components/inputs";
import { PageNotFound } from "./PageNotFound";

export const PageAuction: React.FC = () =>
{
    // === state ===

    const { auctionId } = useParams();
    if (!auctionId) { return <PageNotFound />; };

    const { auctionClient, header } = useOutletContext<AppContext>();

    const [ tab, setTab ] = useState<"info"|"bid"|"details"|"history">("info");
    const [ auction, setAuction ] = useState<AuctionObj|null>();

    // === effects ===

    useEffect(() => {
        fetchAuction();
    }, [auctionId]);

    // === functions ===

    const fetchAuction = async () => {
        try {
            const auction = await auctionClient.fetchAuction(auctionId);
            setAuction(auction);
        } catch (err) {
            console.warn("[fetchAuction]", err); // TODO show error to user
        }
    };

    // === html ===

    if (auction === undefined) {
        return <FullScreenMsg>LOADING…</FullScreenMsg>;
    }
    if (auction === null) {
        return <FullScreenMsg>AUCTION NOT FOUND</FullScreenMsg>;
    }

    // === html ===

    return <>
    {header}
    <div id="page-auction" className="page-regular">

        <div className="page-content">

            <div className="page-section">

                <div className="section-title">{auction.name}</div>

                {auction.description.length > 0 &&
                <div className="section-description">
                    {auction.description}
                </div>}

                <div className="content-tabbed">
                    <div className="tabs-header">
                        <div className="tab-title" onClick={() => setTab("info")}>Info</div>
                        {auction.is_live && <div className="tab-title" onClick={() => setTab("bid")}>Bid</div>}
                        <div className="tab-title" onClick={() => setTab("details")}>Details</div>
                        <div className="tab-title" onClick={() => setTab("history")}>History</div>
                    </div>

                    <div className="tabs-content">
                        {tab === "info" && <SectionInfo auction={auction} />}
                        {tab === "bid" && auction.is_live && <SectionBid auction={auction} />}
                        {tab === "details" && <SectionAuctionDetails auction={auction} />}
                        {tab === "history" && <SectionAuctionHistory auction={auction} />}
                    </div>

                </div>

            </div>

        </div>

    </div>
    </>;
};

const SectionInfo: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) => {
    return <div>
        <CardAuctionItems auction={auction} />
    </div>
};

const SectionBid: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) =>
{
    const currAcct = useCurrentAccount();

    const { auctionClient } = useOutletContext<AppContext>();

    const [ userObjId, setUserObjId ] = useState<string|null>();

    const coinDecimals = 9; const coinType = "0x2::sui::SUI"; const coinSymbol = "SUI"; // TODO @polymedia/coinmeta

    const form = {
        amount: useInputUnsignedBalance({
            label: `Amount (${coinSymbol})`,
            decimals: coinDecimals,
            min: auction.minimum_bid,
            html: { value: balanceToString(auction.minimum_bid, coinDecimals), required: true },
        }),
    };

    const hasErrors = Object.values(form).some(input => input.err !== undefined);
    const disableSubmit = hasErrors || !currAcct || userObjId === undefined;

    // === effects ===

    useEffect(() => { // TODO move to App.tsx
        fetchUserObjId();
    }, [auctionClient, currAcct]);

    // === functions ===

    const fetchUserObjId = async () => {
        if (!currAcct) {
            setUserObjId(null);
        } else {
            const newUserObjId = await auctionClient.fetchUserObjectId(currAcct.address);
            setUserObjId(newUserObjId);
        }
    };

    const onSubmit = async () => {
        if (disableSubmit) {
            return;
        }
        try {
            const resp = await auctionClient.bid(
                currAcct.address,
                userObjId,
                auction.id,
                coinType,
                form.amount.val!,
            );
            console.debug("resp:", resp);
        } catch (err) {
            console.warn(err);
        }
    };

    return <div>
        <div className="section-title">Bid</div>

        <div className="card">
        <div className="form ">
            {Object.entries(form).map(([name, input]) => (
                <React.Fragment key={name}>
                    {input.input}
                </React.Fragment>
            ))}
            <button onClick={onSubmit} className="btn" disabled={disableSubmit}>
                BID
            </button>
        </div>
        </div>

    </div>;
};

const SectionAuctionDetails: React.FC<{ // TODO
    auction: AuctionObj;
}> = ({
    auction,
}) => {
    return <div>
        <div className="section-title">Details</div>
        <div className="card">
            <div className="card-content">
                <div>Auction ID: {auction.id}</div>
                <div>Auction Name: {auction.name}</div>
            </div>
        </div>
    </div>
};

const SectionAuctionHistory: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) => {

    // === state ===

    const { auctionClient } = useOutletContext<AppContext>();

    const [ txs, setTxs ] = useState<Awaited<ReturnType<InstanceType<typeof AuctionClient>["fetchTxsByAuctionId"]>>>();

    // === effects ===

    useEffect(() => {
        fetchRecentBids();
    }, [auction]);

    // === functions ===

    const fetchRecentBids = async () => { // TODO: "load more" / "next page"
        try {
            const newTxs = await auctionClient.fetchTxsByAuctionId(auction.id, null);
            setTxs(newTxs);
        } catch (err) {
            console.warn("[fetchRecentBids]", err); // TODO show error to user
        }
    };

    // === html ===

    return <div>
        <div className="section-title">History</div>
        <div className="list-cards">
            {txs?.data.map(tx =>
                <CardTransaction tx={tx} key={tx.digest} />
            )}
        </div>
    </div>;
};
