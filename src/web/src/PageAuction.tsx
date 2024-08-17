import React, { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { AppContext } from "./App";
import { AuctionObject } from "@polymedia/auction-sdk";
import { PageNotFound } from "./PageNotFound";

export const PageAuction: React.FC = () =>
{
    // === state ===

    const { auctionId } = useParams();
    if (!auctionId) { return <PageNotFound />; }

    const { auctionClient, header } = useOutletContext<AppContext>();

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
    }, []);

    // === html ===

    if (auction === null) {
        return <PageNotFound />;
    }

    return (
    <div id="page-home" className="page-auction">

        {header}

        <div className="page-content">

            <div className="page-section">
                <h1>Auction</h1>
            </div>

            <div className="page-section card">
                <div className="section-description">
                    <h2>Details</h2>
                </div>

                <div>

                </div>
                {auction === undefined
                ? <>Loading...</>
                : <>
                    <div style={{ whiteSpace: 'pre-wrap' }} className="break-all">
                        {JSON.stringify(auction, null, 2)}
                    </div>
                </>}

            </div>

        </div>

    </div>
    );
};
