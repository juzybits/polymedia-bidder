import { useCurrentAccount } from "@mysten/dapp-kit";
import { PaginatedObjectsResponse, SuiClient } from "@mysten/sui/client";
import { objResToDisplay, objResToFields, objResToId, shortenAddress } from "@polymedia/suitcase-core";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";

export const PageNew: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();

    const { auctionClient, header } = useOutletContext<AppContext>();

    const [ ownedObjs, setOwnedObjs ] = useState<PaginatedObjectsResponse>();

    const coinType = "0x2::sui::SUI"; // TODO dropdown
    const itemIds = [ // TODO selector
        "0x123"
    ];

    // === effects ===

    useEffect(() => {
        if (currAcct) {
            // fetchOwnedObjects(auctionClient.suiClient, currAcct.address);
            fetchOwnedObjects(auctionClient.suiClient, "0x10eefc7a3070baa5d72f602a0c89d7b1cb2fcc0b101cf55e6a70e3edb6229f8b");
        }
    }, [auctionClient, currAcct])

    // === functions ===

    async function fetchOwnedObjects(
        suiClient: SuiClient,
        currAddr: string,
    ): Promise<void>
    {
        try {
            const pagObjRes = await suiClient.getOwnedObjects({
                owner: currAddr,
                options: { showContent: true, showDisplay: true },
            });
            setOwnedObjs(pagObjRes);
        } catch (err) {
            console.warn("[fetchOwnedObjects]", err);
        }
    }

    async function createAuction(): Promise<void> {
    }

    // === components ===

    const OwnedObjGrid: React.FC = () =>
    {
        if (!ownedObjs) {
            return <span>Loading...</span>
        }
        return (
        <div className="grid">
            {ownedObjs.data.map((suiObjRes) =>
            {
                const objId = objResToId(suiObjRes);
                const display = objResToDisplay(suiObjRes);
                const displayImg = JSON.stringify(display);
                const fields = objResToFields(suiObjRes);
                return (
                <div className="grid-item" key={objId}>
                    <div className="sui-obj">
                        <div className="obj-img">Display: {displayImg}</div>
                        <div className="obj-fields">{JSON.stringify(fields)}</div>
                        <div className="obj-addr">{shortenAddress(objId)}</div>
                    </div>
                </div>
                );
            })}
        </div>
        );
    }

    // === html ===

    return (
    <div id="page-new" className="page-regular">

        {header}

        <div>
            <h1>CREATE AUCTION</h1>

            <button className="btn">
                CREATE
            </button>

            <div>
                <h2>OWNED OBJECTS</h2>
                <div>
                    <OwnedObjGrid />
                </div>
            </div>
        </div>

    </div>
    );
};
