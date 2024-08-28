import { useCurrentAccount } from "@mysten/dapp-kit";
import { AuctionClient, AuctionObj, UserBid } from "@polymedia/auction-sdk";
import { balanceToString } from "@polymedia/suitcase-core";
import React, { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { AppContext } from "./App";
import { Btn } from "./components/Btn";
import { CardAuction } from "./components/cards";
import { FullScreenMsg } from "./components/FullScreenMsg";
import { useInputUnsignedBalance } from "./components/inputs";
import { PageNotFound } from "./PageNotFound";

export const PageAuction: React.FC = () =>
{
    // === state ===

    const { auctionId } = useParams();
    if (!auctionId) { return <PageNotFound />; };

    const { header } = useOutletContext<AppContext>();

    // === html ===

    return (
    <div id="page-auction" className="page-regular">

        {header}

        <div className="page-content">

            <div className="page-section">
                <SectionAuction auctionId={auctionId} />
            </div>
        </div>

    </div>
    );
};

const SectionAuction: React.FC<{
    auctionId: string;
}> = ({
    auctionId,
}) =>
{
    // === state ===

    const { auctionClient } = useOutletContext<AppContext>();

    const [ auction, setAuction ] = useState<AuctionObj|null>();

    // === functions ===

    const fetchAuction = async () => {
        try {
            const auction = await auctionClient.fetchAuction(auctionId);
            setAuction(auction);
        } catch (err) {
            console.warn(err); // TODO show error to user
        }
    };

    useEffect(() => {
        fetchAuction();
    }, [auctionId]);

    // === html ===

    if (auction === undefined) {
        return <FullScreenMsg>LOADING…</FullScreenMsg>;
    }
    if (auction === null) {
        return <FullScreenMsg>AUCTION NOT FOUND</FullScreenMsg>;
    }

    return <>
        {auction.is_live && <FormBid auction={auction} />}
        <CardAuction auction={auction} />
        <SectionAuctionHistory auction={auction} />
    </>;
};

const FormBid: React.FC<{
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

    return <>
        <div className="form">
            {Object.entries(form).map(([name, input]) => (
                <React.Fragment key={name}>
                    {input.input}
                </React.Fragment>
            ))}
        </div>

        <Btn onClick={onSubmit} disabled={disableSubmit}>
            BID
        </Btn>
    </>;
};

const SectionAuctionHistory: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) => {

    // === state ===

    const { auctionClient } = useOutletContext<AppContext>();

    const [ txs, setTxs ] = useState<Awaited<ReturnType<InstanceType<typeof AuctionClient>["fetchTxsByAuctionId"]>>>();

    // === functions ===

    const fetchRecentBids = async () => { // TODO: "load more" / "next page"
        try {
            const newTxs = await auctionClient.fetchTxsByAuctionId(auction.id, null);
            setTxs(newTxs);
        } catch (err) {
            console.warn(err); // TODO show error to user
        }
    };

    // === effects ===

    useEffect(() => {
        fetchRecentBids();
    }, [auction]);

    // === html ===

    return <>
        {txs?.data.map(tx => (
            <CardTxAnyoneBids tx={tx} key={tx.digest} />
        ))}
</>;
};

const CardTxAnyoneBids: React.FC<{
    tx: any; // TODO: add type
}> = ({
    tx,
}) => {
    return <div>
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {JSON.stringify(tx, null, 2)}
        </div>
    </div>;
};
