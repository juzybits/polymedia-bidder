import { useCurrentAccount } from "@mysten/dapp-kit";
import { PaginatedObjectsResponse, SuiObjectResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { AuctionModule } from "@polymedia/auction-sdk";
import {
    objResToDisplay,
    objResToFields,
    objResToId,
    objResToType,
    shortenAddress,
    stringToBalance,
} from "@polymedia/suitcase-core";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { Button } from "./components/Button";
import { InputString, InputUnsignedBalance, InputUnsignedInt, useInputValidation } from "./components/inputs";

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
                owner: currAcct.address,
                // owner: "0x10eefc7a3070baa5d72f602a0c89d7b1cb2fcc0b101cf55e6a70e3edb6229f8b",
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

        const { hasErrors, onValidate } = useInputValidation();

        const coinDecimals = 9; // TODO: @polymedia/coinmeta
        const [ type_coin, set_type_coin ] = useState<string>("0x2::sui::SUI");
        const [ name, set_name ] = useState<string>("");
        const [ description, set_description ] = useState<string>("");
        const [ pay_addr, set_pay_addr ] = useState<string>(currAcct?.address ?? "");
        const [ begin_time_ms, set_begin_time_ms ] = useState<string>("0");
        const [ duration_ms, set_duration_ms ] = useState<string>("86400000");
        const [ minimum_bid, set_minimum_bid ] = useState<string>("1");
        const [ minimum_increase_bps, set_minimum_increase_bps ] = useState<string>("500");
        const [ extension_period_ms, set_extension_period_ms ] = useState<string>("900000");

        const disableSubmit = chosenObjs.length === 0 || hasErrors() || !currAcct;

        const onSubmit = async () =>
        {
            if (disableSubmit) {
                return;
            }
            try {
                const tx = new Transaction();

                const [auctionObj] = AuctionModule.admin_creates_auction(
                    tx,
                    auctionClient.packageId,
                    type_coin,
                    name,
                    description,
                    pay_addr,
                    parseInt(begin_time_ms),
                    parseInt(duration_ms),
                    stringToBalance(minimum_bid, coinDecimals),
                    parseInt(minimum_increase_bps),
                    parseInt(extension_period_ms),
                );

                for (const obj of chosenObjs) {
                    AuctionModule.admin_adds_item(
                        tx,
                        auctionClient.packageId,
                        type_coin,
                        obj.type,
                        auctionObj,
                        obj.id,
                    );
                }

                tx.transferObjects([auctionObj], currAcct.address);

                const resp = await auctionClient.signAndExecuteTransaction(tx);
                console.debug("resp:", resp);
            } catch (err) {
                console.warn(err);
            }
        };

        return <>
        <div>
            <div>
                <div>Name (optional)</div>
                <InputString val={name} setVal={set_name} onValidate={onValidate("name")} />
            </div>
            <div>
                <div>Description (optional)</div>
                <InputString val={description} setVal={set_description} onValidate={onValidate("description")} />
            </div>
            <div>
                <div>Coin type</div>
                <InputString val={type_coin} setVal={set_type_coin} onValidate={onValidate("type_coin")}
                    required={true} />
            </div>
            <div>
                <div>Payment address</div>
                <InputString val={pay_addr} setVal={set_pay_addr} onValidate={onValidate("pay_addr")}
                    required={true} />
            </div>
            <div>
                <div>Begin time</div>
                <InputUnsignedInt val={begin_time_ms} setVal={set_begin_time_ms} onValidate={onValidate("begin_time_ms")}
                    required={true} />
            </div>
            <div>
                <div>Duration</div>
                <InputUnsignedInt val={duration_ms} setVal={set_duration_ms} onValidate={onValidate("duration")}
                    required={true} />
            </div>
            <div>
                <div>Minimum bid</div>
                <InputUnsignedBalance val={minimum_bid} setVal={set_minimum_bid} onValidate={onValidate("minimum_bid")}
                    required={true} decimals={coinDecimals} />
            </div>
            <div>
                <div>Minimum bid increase</div>
                <InputUnsignedInt val={minimum_increase_bps} setVal={set_minimum_increase_bps} onValidate={onValidate("minimum_increase_bps")}
                    required={true} />
            </div>
            <div>
                <div>Extension period</div>
                <InputUnsignedInt val={extension_period_ms} setVal={set_extension_period_ms} onValidate={onValidate("extension_period_ms")}
                    required={true} />
            </div>
        </div>

        {chosenObjs.length > 0 &&
        <div className="object-list">

            {chosenObjs.length} object{chosenObjs.length > 1 ? "s" : ""} selected:

            <div className="list-items">
            {chosenObjs.map(obj =>
                <div key={obj.id}>
                    - <LinkToPolymedia addr={obj.id} kind="object" network={network} /> | {shortenAddress(obj.type)} | {obj.name}
                </div>
            )}
            </div>

        </div>}

        <Button onClick={onSubmit} disabled={disableSubmit}>
            CREATE AUCTION
        </Button>

        </>;
    };

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

            {currAcct &&
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
