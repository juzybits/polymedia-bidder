import { useCurrentAccount } from "@mysten/dapp-kit";
import { AUCTION_CONFIG as cnf, PaginatedItemsResponse, SuiItem } from "@polymedia/auction-sdk";
import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { Btn } from "./components/Btn";
import { CardLoading, CardSuiItem, ONE_HOUR_MS, ONE_MINUTE_MS } from "./components/cards";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { useInputString, useInputSuiAddress, useInputUnsignedBalance, useInputUnsignedInt } from "./components/inputs";
import { useFetchUserId } from "./hooks/useFetchUserId";
import { SubmitRes } from "./lib/types";

export const PageNew: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();

    const { header } = useOutletContext<AppContext>();

    const [ chosenItems, setChosenItems ] = useState<SuiItem[]>([]);

    // === functions ===

    const addOrRemoveItem = (item: SuiItem): void =>
    {
        setChosenItems(prev => {
            const exists = prev.some(i => i.id === item.id);
            if (exists) {
                return prev.filter(i => i.id !== item.id);
            } else {
                return [...prev, item];
            }
        });
    };

    const isChosenItem = (item: SuiItem): boolean => {
        return chosenItems.some(i => i.id === item.id);
    };

    // === html ===

    const disableAddItem = chosenItems.length >= cnf.MAX_ITEMS;

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
                    <FormCreateAuction chosenItems={chosenItems} addOrRemoveItem={addOrRemoveItem} />
                </div>

                <div className="page-section">
                    <div className="section-title">
                        Items
                    </div>
                    <ItemGridSelector addOrRemoveItem={addOrRemoveItem} isChosenItem={isChosenItem} disableAddItem={disableAddItem} />
                </div>
            </>}

        </div>

    </div>
    </>;
};

// === components ===

const FormCreateAuction: React.FC<{
    chosenItems: SuiItem[];
    addOrRemoveItem: (item: SuiItem) => void;
}> = ({
    chosenItems,
    addOrRemoveItem,
}) =>
{
    // === state ===

    const navigate = useNavigate();

    const currAcct = useCurrentAccount();
    if (!currAcct) { return; }

    const { auctionClient, isWorking, setIsWorking } = useOutletContext<AppContext>();

    const { userId, ..._user} = useFetchUserId();

    const [ showAdvancedForm, setShowAdvancedForm ] = useState(false);
    const [ submitRes, setSubmitRes ] = useState<SubmitRes>({ ok: null });

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
        // duration_seconds: useInputUnsignedInt({
        //     label: "Duration (seconds)", min: Math.floor(cnf.MIN_DURATION_MS/ONE_HOUR_MS), max: Math.floor(cnf.MAX_DURATION_MS/ONE_HOUR_MS),
        //     html: { value: "15", required: true },
        // }),
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
        // extension_period_seconds: useInputUnsignedInt({
        //     label: "Extension period (seconds)", min: Math.max(1, Math.floor(cnf.MIN_EXTENSION_PERIOD_MS/ONE_MINUTE_MS)), max: Math.floor(cnf.MAX_EXTENSION_PERIOD_MS/ONE_MINUTE_MS),
        //     html: { value: "1", required: true },
        // }),
    };

    const hasErrors = Object.values(form).some(input => input.err !== undefined);
    const disableSubmit = chosenItems.length === 0 || hasErrors || isWorking || userId === undefined;

    // === effects ===

    // === functions ===

    const errToString = (err: unknown): string | null =>
    {
        if (!err) { return "Failed to create auction"; }

        const str = err instanceof Error ? err.message : String(err);
        if (str.includes("Rejected from user")) { return null; }

        const code = auctionClient.parseErrorCode(str);
        return code;
    };

    const onSubmit = async () =>
    {
        if (disableSubmit) {
            return;
        }
        try {
            setIsWorking(true);
            setSubmitRes({ ok: null });
            const { resp, auctionObjChange } = await auctionClient.createAndShareAuction(
                form.type_coin.val!,
                userId,
                form.name.val!,
                form.description.val ?? "",
                form.pay_addr.val!,
                form.begin_delay_hours.val! * ONE_HOUR_MS,
                form.duration_hours.val! * ONE_HOUR_MS,
                // form.duration_seconds.val! * 1000,
                form.minimum_bid.val!,
                form.minimum_increase_pct.val! * 100,
                form.extension_period_minutes.val! * ONE_MINUTE_MS,
                // form.extension_period_seconds.val! * 1000,
                chosenItems,
            );
            if (resp.effects?.status.status !== "success") {
                throw new Error(resp.effects?.status.error);
            }
            setSubmitRes({ ok: true });
            navigate(`/auction/${auctionObjChange.objectId}`);
        } catch (err) {
            setSubmitRes({ ok: false, err: errToString(err) });
            console.warn("[onSubmit]", err);
        } finally {
            setIsWorking(false);
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
            {/* {form.duration_seconds.input} */}
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
                {/* {form.extension_period_seconds.input} */}
            </>}
        </div>

        <Btn onClick={onSubmit} disabled={disableSubmit}>
            CREATE AUCTION
        </Btn>

        {submitRes.ok === false && submitRes.err &&
        <div className="error">{submitRes.err}</div>}

        <div className="chosen-items">
            <h2>Chosen items ({chosenItems.length})</h2>

            <div className="list-cards">
            {chosenItems.map(item =>
                <CardSuiItem item={item} key={item.id} onClick={() => addOrRemoveItem(item)} />
            )}
            </div>
        </div>

    </div>
    </div>
    </>;
};

const ItemGridSelector: React.FC<{
    addOrRemoveItem: (item: SuiItem) => void;
    isChosenItem: (item: SuiItem) => boolean;
    disableAddItem: boolean;
}> = ({
    addOrRemoveItem,
    isChosenItem,
    disableAddItem,
}) =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    if (!currAcct) { return; }

    const { auctionClient } = useOutletContext<AppContext>();

    const [ ownedItems, setOwnedItems ] = useState<PaginatedItemsResponse>();

    // === effects ===

    useEffect(() => {
        fetchOwnedItems();
    }, [auctionClient, currAcct]);

    // === functions ===

    const fetchOwnedItems = async (): Promise<void> =>
    {
        try {
            const newItems = await auctionClient.fetchOwnedItems(
                currAcct.address,
                // "0xb871a42470b59c7184033a688f883cf24eb5e66eae1db62319bab27adb30d031", // death
                // "0x10eefc7a3070baa5d72f602a0c89d7b1cb2fcc0b101cf55e6a70e3edb6229f8b", // trevin
                ownedItems?.nextCursor,
            );

            setOwnedItems((prevItems) => ({
                data: [...(prevItems?.data ?? []), ...newItems.data],
                hasNextPage: newItems.hasNextPage,
                nextCursor: newItems.nextCursor,
            }));
        } catch (err) {
            console.warn("[fetchOwnedItems]", err);
        }
    };

    // === html ===

    if (ownedItems === undefined) {
        return <CardLoading />;
    }

    return <>
    <div className="grid">
        {ownedItems.data.map(item =>
        {
            const isChosen = isChosenItem(item);
            return (
            <div className="grid-item card" key={item.id}
                onClick={() => (isChosen || !disableAddItem) && addOrRemoveItem(item)}
            >
                <CardSuiItem item={item}
                    isChosen={isChosen}
                    extra={
                        <div className="item-button">
                            <button
                                className={`btn ${isChosen ? "red" : ""}`}
                                disabled={!isChosen && disableAddItem}
                            >
                                {isChosen ? "REMOVE" : "ADD"}
                            </button>
                        </div>
                    }
                    />
            </div>
            );
        })}
    </div>

    {ownedItems.hasNextPage &&
    <div className="load-more">
        <button className="btn" onClick={fetchOwnedItems}>
            LOAD MORE
        </button>
    </div>}
    </>;
};
