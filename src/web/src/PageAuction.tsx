import { AuctionObj } from "@polymedia/auction-sdk";
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
        {auction.is_live && <BidForm auction={auction} />}
        <CardAuction auction={auction} />
    </>;
};

const BidForm: React.FC<{
    auction: AuctionObj;
}> = ({
    auction,
}) =>
{
    const coinDecimals = 9; const coinType = "0x2::sui::SUI"; const coinSymbol = "SUI"; // TODO @polymedia/coinmeta

    const form = {
        amount: useInputUnsignedBalance({
            label: `Amount (${coinSymbol})`,
            decimals: coinDecimals,
            min: auction.minimum_bid,
            html: { value: "", required: true },
        }),
    };

    const hasErrors = Object.values(form).some(input => input.err !== undefined);
    const disableSubmit = hasErrors;

    // === functions ===

    const onSubmit = () => {
        // TODO
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
            CREATE AUCTION
        </Btn>
    </>;
};
