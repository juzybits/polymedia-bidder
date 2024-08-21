import React, { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { AppContext } from "./App";
import { AuctionObject } from "@polymedia/auction-sdk";
import { FullScreenMsg } from "./components/FullScreenMsg";
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

    const [ auction, setAuction ] = useState<AuctionObject|null>();

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
    <div style={{ whiteSpace: "pre-wrap" }} className="break-all">
        {JSON.stringify(auction, null, 2)}
    </div>
    </>;
};
