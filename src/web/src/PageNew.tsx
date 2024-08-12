import { useCurrentAccount } from "@mysten/dapp-kit";
import { PaginatedObjectsResponse, SuiClient } from "@mysten/sui/client";
import {
    objResToDisplay,
    objResToFields,
    objResToId,
    objResToType,
    shortenAddress,
} from "@polymedia/suitcase-core";
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
        fetchOwnedObjects(null);
    }, [auctionClient, currAcct])

    // === functions ===

    async function fetchOwnedObjects(
        cursor: string | null | undefined,
    ): Promise<void>
    {
        if (!currAcct) { return; }

        setOwnedObjs(undefined);
        try {
            const pagObjRes = await auctionClient.suiClient.getOwnedObjects({
                // owner: currAcct.address,
                owner: "0x10eefc7a3070baa5d72f602a0c89d7b1cb2fcc0b101cf55e6a70e3edb6229f8b",
                filter: { MatchNone: [{ StructType: "0x2::coin::Coin" }], },
                options: { showContent: true, showDisplay: true, showType: true },
                cursor,
            });
            setOwnedObjs(pagObjRes);
        } catch (err) {
            console.warn("[fetchOwnedObjects]", err);
        }
    }

    async function fetchNextPage()
    {
        if (!ownedObjs) { return; }

        fetchOwnedObjects(ownedObjs.nextCursor);
        window.scrollTo(0, 0);
    }

    async function createAuction(): Promise<void> {
    }

    // === components ===

    const ObjectGrid: React.FC = () =>
    {
        if (!ownedObjs) {
            return <span>Loading...</span>
        }
        return (
        <div className="grid">
            {ownedObjs.data.map((objRes) =>
            {
                const objId = objResToId(objRes);
                const type = objResToType(objRes);
                const display = objResToDisplay(objRes);
                const fields = objResToFields(objRes);
                const name = display.name ?? fields.name ?? null;
                const desc = display.description ?? fields.description ?? null;
                return (
                <div className="grid-item" key={objId}>
                    <div className="sui-obj">
                        <div className="obj-img">
                            <img src={display.image_url ?? svgNoImage} alt="object image" />
                        </div>
                        <div className="obj-info">
                            <div className="info-line break-all">{shortenAddress(objId)} ({shortenAddress(type)})</div>
                            {name && <div className="info-line break-word">{name}</div>}
                            {desc && <div className="info-line break-word">{desc}</div>}
                        </div>
                    </div>
                </div>
                );
            })}

            {ownedObjs.hasNextPage &&
            <div className="next-page">
                <button className="btn" onClick={fetchNextPage}>
                    NEXT PAGE
                </button>
            </div>
            }
        </div>
        );
    }

    // === html ===

    return (
    <div id="page-new" className="page-regular">

        {header}

        <div>
            <h1>CREATE AUCTION</h1>

            {/* <button className="btn">
                CREATE
            </button> */}

            <div>
                <h2>YOUR OBJECTS</h2>
                <div>
                    <ObjectGrid />
                </div>
            </div>
        </div>

    </div>
    );
};

const svgNoImage = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m4.75 16 2.746-3.493a2 2 0 0 1 3.09-.067L13 15.25m-2.085-2.427c1.037-1.32 2.482-3.188 2.576-3.31a2 2 0 0 1 3.094-.073L19 12.25m-12.25 7h10.5a2 2 0 0 0 2-2V6.75a2 2 0 0 0-2-2H6.75a2 2 0 0 0-2 2v10.5a2 2 0 0 0 2 2Z"></path></svg>');
