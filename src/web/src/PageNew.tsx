import { useCurrentAccount } from "@mysten/dapp-kit";
import { PaginatedObjectsResponse, SuiObjectResponse } from "@mysten/sui/client";
import { AUCTION_CONFIG as cnf } from "@polymedia/auction-sdk";
import {
    isParsedDataObject,
    objResToDisplay,
    objResToFields,
    objResToId,
    objResToType,
    shortenAddress
} from "@polymedia/suitcase-core";
import { LinkToPolymedia, ReactSetter } from "@polymedia/suitcase-react";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { Btn } from "./components/Btn";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { useInputString, useInputSuiAddress, useInputUnsignedBalance, useInputUnsignedInt } from "./components/inputs";

const ONE_HOUR_MS = 3_600_000;

export const PageNew: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();

    const { header } = useOutletContext<AppContext>();

    const [ chosenObjs, setChosenObjs ] = useState<SuiObject[]>([]);

    // === html ===

    return (
    <div id="page-new" className="page-regular">

        {header}

        <div className="page-content">

            <h1 className="page-title">NEW AUCTION</h1>

            {!currAcct
            ? <ConnectToGetStarted />
            : <>
                <div className="page-section card">
                    <FormCreateAuction chosenObjs={chosenObjs} />
                </div>

                <div className="page-section">
                    <div className="section-description">
                        Click on the items you want to auction.
                    </div>
                </div>

                <div className="page-section">
                    <ObjectGridSelector setChosenObjs={setChosenObjs} />
                </div>
            </>}

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

// === components ===

const FormCreateAuction: React.FC<{
    chosenObjs: SuiObject[];
}> = ({
    chosenObjs,
}) =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    if (!currAcct) { return; }

    const { auctionClient, network } = useOutletContext<AppContext>();

    const [ userObjId, setUserObjId ] = useState<string|null>();
    const [ showAdvancedForm, setShowAdvancedForm ] = useState(false);

    const coinDecimals = 9; const coinType = "0x2::sui::SUI"; const coinSymbol = "SUI"; // TODO @polymedia/coinmeta and support other coins

    const form = {
        // basic options
        name: useInputString({
            label: "Name", minBytes: cnf.MIN_NAME_LENGTH, maxBytes: cnf.MAX_NAME_LENGTH,
            html: { value: "", required: true },
        }),
        description: useInputString({
            label: "Description (optional)", minBytes: cnf.MIN_DESCRIPTION_LENGTH, maxBytes: cnf.MAX_DESCRIPTION_LENGTH,
            html: { value: "" },
        }),
        minimum_bid: useInputUnsignedBalance({
            label: `Minimum bid (${coinSymbol})`, decimals: coinDecimals,
            html: { value: "1", required: true },
        }),
        duration_hours: useInputUnsignedInt({
            label: "Duration (hours)", min: Math.floor(cnf.MIN_DURATION_MS/ONE_HOUR_MS), max: Math.floor(cnf.MAX_DURATION_MS/ONE_HOUR_MS),
            html: { value: "24", required: true },
        }),
        // advanced options
        type_coin: useInputString({
            label: "Coin type",
            html: { value: coinType, required: true, disabled: true },
        }),
        pay_addr: useInputSuiAddress({
            label: "Payment address",
            html: { value: currAcct.address ?? "", required: true },
        }),
        begin_delay_hours: useInputUnsignedInt({
            label: "Begin delay (hours)", max: Math.floor(cnf.MAX_BEGIN_DELAY_MS/ONE_HOUR_MS),
            html: { value: "0", required: true },
        }),
        minimum_increase_pct: useInputUnsignedInt({
            label: "Minimum bid increase (%)", min: Math.max(1, Math.floor(cnf.MIN_MINIMUM_INCREASE_BPS/100)), max: Math.floor(cnf.MAX_MINIMUM_INCREASE_BPS/100),
            html: { value: "5", required: true },
        }),
        extension_period_ms: useInputUnsignedInt({
            label: "Extension period (ms)", min: cnf.MIN_EXTENSION_PERIOD_MS, max: cnf.MAX_EXTENSION_PERIOD_MS, // TODO minutes
            html: { value: "900000", required: true },
        }),
    };

    const hasErrors = Object.values(form).some(input => input.err !== undefined);
    const disableSubmit = chosenObjs.length === 0 || hasErrors || userObjId === undefined;

    // === effects ===

    useEffect(() => { // TODO move to App.tsx
        fetchUserObj();
    }, [auctionClient, currAcct]);

    // === functions ===

    const fetchUserObj = async () => {
        const newUserObjId = await auctionClient.fetchUserObjectId(currAcct.address);
        setUserObjId(newUserObjId);
    };

    const onSubmit = async () =>
    {
        if (disableSubmit) {
            return;
        }
        try {
            const resp = await auctionClient.createAndShareAuction(
                form.type_coin.val!,
                userObjId,
                form.name.val!,
                form.description.val ?? "",
                form.pay_addr.val!,
                form.begin_delay_hours.val! * ONE_HOUR_MS,
                form.duration_hours.val! * ONE_HOUR_MS,
                form.minimum_bid.val!,
                form.minimum_increase_pct.val! * 100,
                form.extension_period_ms.val!,
                chosenObjs,
            );
            console.debug("resp:", resp);
        } catch (err) {
            console.warn(err);
        }
    };

    // === html ===

    return <>
    <div className="form">
        <div className="form-section">
            {form.name.input}
            {form.description.input}
            {form.minimum_bid.input}
            {form.duration_hours.input}
        </div>
        <div className="form-section">
            <div className="section-toggle" onClick={() => setShowAdvancedForm(!showAdvancedForm)}>
                {showAdvancedForm ? "- hide" : "+ show"} advanced options
            </div>
            {showAdvancedForm && <>
                {form.type_coin.input}
                {form.pay_addr.input}
                {form.begin_delay_hours.input}
                {form.minimum_increase_pct.input}
                {form.extension_period_ms.input}
            </>}
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

    <Btn onClick={onSubmit} disabled={disableSubmit}>
        CREATE AUCTION
    </Btn>
    </>;
};

const ObjectGridSelector: React.FC<{
    setChosenObjs: ReactSetter<SuiObject[]>;
}> = ({
    setChosenObjs,
}) =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    if (!currAcct) { return; }

    const { auctionClient } = useOutletContext<AppContext>();

    const [ ownedObjs, setOwnedObjs ] = useState<PaginatedObjectsResponse>();

    // === effects ===

    useEffect(() => {
        fetchOwnedObjects();
    }, [auctionClient, currAcct]);

    // === functions ===

    const fetchOwnedObjects = async (): Promise<void> =>
    {
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
    };

    const addOrRemoveItem = (obj: SuiObject): void =>
    {
        setChosenObjs(prev => {
            const exists = prev.some(item => item.id === obj.id);
            if (exists) {
                return prev.filter(item => item.id !== obj.id);
            } else {
                return [...prev, obj];
            }
        });
    };

    // === html ===

    if (!ownedObjs) {
        return <span>Loading...</span>;
    }

    return <>
    <div className="grid">
        {ownedObjs.data.map((objRes) =>
        {
            const obj = objResToSuiObject(objRes);
            if (!obj.hasPublicTransfer) {
                return null;
            }
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

const svgNoImage = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m4.75 16 2.746-3.493a2 2 0 0 1 3.09-.067L13 15.25m-2.085-2.427c1.037-1.32 2.482-3.188 2.576-3.31a2 2 0 0 1 3.094-.073L19 12.25m-12.25 7h10.5a2 2 0 0 0 2-2V6.75a2 2 0 0 0-2-2H6.75a2 2 0 0 0-2 2v10.5a2 2 0 0 0 2 2Z"></path></svg>');

// === helpers ===

type SuiObject = {
    id: ReturnType<typeof objResToId>;
    type: ReturnType<typeof objResToType>;
    display: ReturnType<typeof objResToDisplay>;
    fields: ReturnType<typeof objResToFields>;
    hasPublicTransfer: boolean;
    name: string;
    desc: string;
};

/* eslint-disable */
function objResToSuiObject(objRes: SuiObjectResponse): SuiObject
{
    if (objRes.error) {
        throw Error(`response error: ${JSON.stringify(objRes, null, 2)}`);
    }
    if (!objRes.data) {
        throw Error(`response has no data: ${JSON.stringify(objRes, null, 2)}`);
    }
    if (!objRes.data?.content) {
        throw Error(`response has no content: ${JSON.stringify(objRes, null, 2)}`);
    }
    if (!isParsedDataObject(objRes.data.content)) {
        throw Error(`response data is not a moveObject: ${JSON.stringify(objRes, null, 2)}`);
    }

    const id = objRes.data.objectId;
    const type = objRes.data.content.type;
    const display = objResToDisplay(objRes);
    const fields = objRes.data.content.fields as Record<string, any>;
    const hasPublicTransfer = objRes.data.content.hasPublicTransfer;
    const name = display.name ?? fields.name ?? null;
    const desc = display.description ?? fields.description ?? null;
    return { id, type, display, fields, hasPublicTransfer, name, desc };
}
/* eslint-enable */
