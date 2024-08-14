import { useCurrentAccount } from "@mysten/dapp-kit";
import { PaginatedObjectsResponse, SuiObjectResponse } from "@mysten/sui/client";
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
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import { InputString, InputUnsignedInt } from "./components/inputs";
import { useFormErrors } from "./hooks/useFormErrors";

export const PageNew: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();

    const { auctionClient, header, network } = useOutletContext<AppContext>();

    const [ ownedObjs, setOwnedObjs ] = useState<PaginatedObjectsResponse>();
    const [ chosenObjs, setChosenObjs ] = useState<SuiObject[]>([]);

    // === effects ===

    useEffect(() => {
        fetchOwnedObjects();
    }, [auctionClient, currAcct]);

    // === functions ===

    async function fetchOwnedObjects(): Promise<void>
    {
        if (!currAcct) { return; }

        try {
            const pagObjRes = await auctionClient.suiClient.getOwnedObjects({
                // owner: currAcct.address,
                owner: "0x10eefc7a3070baa5d72f602a0c89d7b1cb2fcc0b101cf55e6a70e3edb6229f8b",
                filter: { MatchNone: [{ StructType: "0x2::coin::Coin" }], },
                options: { showContent: true, showDisplay: true, showType: true },
                cursor: ownedObjs?.nextCursor,
            });
            setOwnedObjs((prevObjs) => ({
                data: [...(prevObjs ? prevObjs.data : []), ...pagObjRes.data],
                hasNextPage: pagObjRes.hasNextPage,
                nextCursor: pagObjRes.nextCursor,
            }));
        } catch (err) {
            console.warn("[fetchOwnedObjects]", err);
        }
    }

    function addOrRemoveItem(obj: SuiObject): void
    {
        setChosenObjs(prev => {
            const exists = prev.some(item => item.id === obj.id);
            if (exists) {
                return prev.filter(item => item.id !== obj.id);
            } else {
                return [...prev, obj];
            }
        });
    }

    // async function createAuction(): Promise<void> {
    // }

    // === components ===

    const CreateAuctionForm: React.FC = () =>
    {
        const currAcct = useCurrentAccount();

        const { onError, hasErrors } = useFormErrors();

        const [ type_coin, set_type_coin ] = useState<string>("0x2::sui::SUI");
        const [ name, set_name ] = useState<string>("");
        const [ description, set_description ] = useState<string>("");
        const [ pay_addr, set_pay_addr ] = useState<string>(currAcct?.address ?? "");
        const [ begin_time_ms, set_begin_time_ms ] = useState<string>("0");
        const [ duration, set_duration ] = useState<string>("86400000");
        const [ minimum_bid, set_minimum_bid ] = useState<string>("100000000");
        const [ minimum_increase_bps, set_minimum_increase_bps ] = useState<string>("500");
        const [ extension_period_ms, set_extension_period_ms ] = useState<string>("900000");

        const onSubmit = () => {
            console.log("hasErrors:", hasErrors());
        };

        return <>
        <div>
            <div>
                <div>type_coin:</div>
                <InputString val={type_coin} setVal={set_type_coin} onError={onError("set_type_coin")} required={true} />
            </div>
            <div>
                <div>name:</div>
                <InputString val={name} setVal={set_name} onError={onError("set_name")} />
            </div>
            <div>
                <div>description:</div>
                <InputString val={description} setVal={set_description} onError={onError("set_description")} />
            </div>
            <div>
                <div>pay_addr:</div>
                <InputString val={pay_addr} setVal={set_pay_addr} onError={onError("set_pay_addr")} />
            </div>
            <div>
                <div>begin_time_ms:</div>
                <InputUnsignedInt val={begin_time_ms} setVal={set_begin_time_ms} onError={onError("set_begin_time_ms")} />
            </div>
            <div>
                <div>duration:</div>
                <InputUnsignedInt val={duration} setVal={set_duration} onError={onError("set_duration")} />
            </div>
            <div>
                <div>minimum_bid:</div>
                <InputUnsignedInt val={minimum_bid} setVal={set_minimum_bid} onError={onError("set_minimum_bid")} />
            </div>
            <div>
                <div>minimum_increase_bps:</div>
                <InputUnsignedInt val={minimum_increase_bps} setVal={set_minimum_increase_bps} onError={onError("set_minimum_increase_bps")} />
            </div>
            <div>
                <div>extension_period_ms:</div>
                <InputUnsignedInt val={extension_period_ms} setVal={set_extension_period_ms} onError={onError("set_extension_period_ms")} />
            </div>
        </div>

        <div className="object-list">
            {chosenObjs.length} object{chosenObjs.length > 1 ? "s" : ""} selected:
            <div className="list-items">
            {chosenObjs.map(obj =>
                <div key={obj.id}>
                    - <LinkToPolymedia addr={obj.id} kind="object" network={network} /> | {shortenAddress(obj.type)} | {obj.name}
                </div>
            )}
            </div>
        </div>

        <button className="btn" onClick={onSubmit}>
            CREATE AUCTION
        </button>
        </>;
    }

    const ObjectGrid: React.FC = () =>
    {
        if (!ownedObjs) {
            return <span>Loading...</span>;
        }
        return <>
        <div className="grid">
            {ownedObjs.data.map((objRes) =>
            {
                const obj = objResToSuiObject(objRes);
                return (
                <div className="grid-item card" key={obj.id}
                    onClick={() => { addOrRemoveItem(obj); }}
                >
                    <div className="sui-obj">
                        <div className="obj-img">
                            <img src={obj.display.image_url ?? svgNoImage} alt="object image" />
                        </div>
                        <div className="obj-info">
                            <div className="info-line break-all">{shortenAddress(obj.id)} ({shortenAddress(obj.type)})</div>
                            {obj.name && <div className="info-line break-word">{obj.name}</div>}
                            {obj.desc && <div className="info-line break-word">{obj.desc}</div>}
                        </div>
                    </div>
                </div>
                );
            })}
        </div>

        {ownedObjs.hasNextPage &&
        <div className="load-more">
            <button className="btn" onClick={fetchOwnedObjects}>
                LOAD MORE
            </button>
        </div>}

        </>;
    };

    // === html ===

    return (
    <div className="page-regular" id="page-new">

        {header}

        <div className="page-content">

            <h1 className="page-title">NEW AUCTION</h1>

            {chosenObjs.length > 0 &&
            <div className="page-section card">
                <CreateAuctionForm />
            </div>}

            <div className="page-section">
                <div className="section-description">
                    Click on the items you want to auction.
                </div>
            </div>

            <div className="page-section">
                <ObjectGrid />
            </div>

            {/* {chosenObjs.length > 0 &&
            <div id="dialog-create-auction">
                <div className="object-count">
                    {chosenObjs.length} object{chosenObjs.length > 1 ? "s" : ""} selected
                </div>
                <button className="btn">
                    CREATE AUCTION
                </button>
            </div>} */}
        </div>

    </div>
    );
};

const svgNoImage = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m4.75 16 2.746-3.493a2 2 0 0 1 3.09-.067L13 15.25m-2.085-2.427c1.037-1.32 2.482-3.188 2.576-3.31a2 2 0 0 1 3.094-.073L19 12.25m-12.25 7h10.5a2 2 0 0 0 2-2V6.75a2 2 0 0 0-2-2H6.75a2 2 0 0 0-2 2v10.5a2 2 0 0 0 2 2Z"></path></svg>');

type SuiObject = {
    id: ReturnType<typeof objResToId>;
    type: ReturnType<typeof objResToType>;
    display: ReturnType<typeof objResToDisplay>;
    fields: ReturnType<typeof objResToFields>;
    name: string;
    desc: string;
};

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
function objResToSuiObject(objRes: SuiObjectResponse): SuiObject
{
    const id = objResToId(objRes);
    const type = objResToType(objRes);
    const display = objResToDisplay(objRes);
    const fields = objResToFields(objRes);
    const name = display.name ?? fields.name ?? null;
    const desc = display.description ?? fields.description ?? null;
    return { id, type, display, fields, name, desc };
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment */
