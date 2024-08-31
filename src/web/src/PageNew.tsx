import { useCurrentAccount } from "@mysten/dapp-kit";
import { PaginatedObjectsResponse } from "@mysten/sui/client";
import { AUCTION_CONFIG as cnf } from "@polymedia/auction-sdk";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { CardSuiObject } from "./components/cards";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { useInputString, useInputSuiAddress, useInputUnsignedBalance, useInputUnsignedInt } from "./components/inputs";
import { objResToSuiItem, SuiItem } from "./lib/items";

const ONE_HOUR_MS = 3_600_000;
const ONE_MINUTE_MS = 60_000;

export const PageNew: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();

    const { header } = useOutletContext<AppContext>();

    const [ chosenObjs, setChosenObjs ] = useState<SuiItem[]>([]);

    // === functions ===

    const addOrRemoveItem = (obj: SuiItem): void =>
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

    const isChosenObj = (obj: SuiItem): boolean =>
    {
        return chosenObjs.some(item => item.id === obj.id);
    };

    // === html ===

    return <>
    {header}
    <div id="page-new" className="page-regular">

        <div className="page-content">

            <h1 className="page-title">NEW AUCTION</h1>

            {!currAcct
            ? <ConnectToGetStarted />
            : <>
                <div className="page-section">
                    <div className="section-title">
                        Settings
                    </div>
                    <FormCreateAuction chosenObjs={chosenObjs} addOrRemoveItem={addOrRemoveItem} />
                </div>

                <div className="page-section">
                    <div className="section-title">
                        Items
                    </div>
                    <ObjectGridSelector addOrRemoveItem={addOrRemoveItem} isChosenObj={isChosenObj} />
                </div>
            </>}

        </div>

    </div>
    </>;
};

// === components ===

const FormCreateAuction: React.FC<{
    chosenObjs: SuiItem[];
    addOrRemoveItem: (obj: SuiItem) => void;
}> = ({
    chosenObjs,
    addOrRemoveItem,
}) =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    if (!currAcct) { return; }

    const { auctionClient } = useOutletContext<AppContext>();

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
        extension_period_minutes: useInputUnsignedInt({
            label: "Extension period (minutes)", min: Math.max(1, Math.floor(cnf.MIN_EXTENSION_PERIOD_MS/ONE_MINUTE_MS)), max: Math.floor(cnf.MAX_EXTENSION_PERIOD_MS/ONE_MINUTE_MS),
            html: { value: "15", required: true },
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
        try {
            const newUserObjId = await auctionClient.fetchUserObjectId(currAcct.address);
            setUserObjId(newUserObjId);
        } catch (err) {
            console.warn("[fetchUserObj]", err); // TODO show error to user
        }
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
                form.extension_period_minutes.val! * ONE_MINUTE_MS,
                chosenObjs,
            );
            console.debug("resp:", resp);
        } catch (err) {
            console.warn(err);
        }
    };

    // === html ===

    return <>
    <div className="card">
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
                {form.extension_period_minutes.input}
            </>}
        </div>

        <button onClick={onSubmit} className="btn" disabled={disableSubmit}>
            CREATE AUCTION
        </button>

        <div className="chosen-items">
            <h2>Chosen items ({chosenObjs.length})</h2>

            <div className="list-cards">
            {chosenObjs.map(obj =>
                <CardSuiObject obj={obj} key={obj.id} onClick={() => addOrRemoveItem(obj)} />
            )}
            </div>
        </div>

    </div>
    </div>
    </>;
};

const ObjectGridSelector: React.FC<{
    addOrRemoveItem: (obj: SuiItem) => void;
    isChosenObj: (obj: SuiItem) => boolean;
}> = ({
    addOrRemoveItem,
    isChosenObj,
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
                // owner: "0xb871a42470b59c7184033a688f883cf24eb5e66eae1db62319bab27adb30d031", // death
                // owner: "0x10eefc7a3070baa5d72f602a0c89d7b1cb2fcc0b101cf55e6a70e3edb6229f8b", // trevin
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

    // === html ===

    if (ownedObjs === undefined) {
        return <span>Loading...</span>;
    }

    return <>
    <div className="grid">
        {ownedObjs.data.map((objRes) =>
        {
            const obj = objResToSuiItem(objRes); // TODO do this only once instead of on render
            if (!obj.hasPublicTransfer) {
                return null;
            }
            const isChosen = isChosenObj(obj);
            return (
            <div className="grid-item card" key={obj.id}
                // onClick={() => { showItemInfo(obj); TODO: "flip" card and show ID etc }}
            >
                <CardSuiObject obj={obj}
                    isChosen={isChosen}
                    extra={
                        <div className="obj-button">
                            <button className={`btn ${isChosen ? "red" : ""}`} onClick={() => addOrRemoveItem(obj)}>
                                {isChosen ? "REMOVE" : "ADD"}
                            </button>
                        </div>
                    }
                    />
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
