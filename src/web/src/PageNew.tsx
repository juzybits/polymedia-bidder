import { useCurrentAccount } from "@mysten/dapp-kit";
import { AUCTION_CONFIG as cnf, SuiItem, svgNoImage } from "@polymedia/bidder-sdk";
import { shortenAddress, TimeUnit } from "@polymedia/suitcase-core";
import { useFetchAndLoadMore, useInputAddress, useInputString, useInputUnsignedBalance, useInputUnsignedInt } from "@polymedia/suitcase-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./components/Btn";
import { CardSpinner, CardSuiItem, CardWithMsg } from "./components/cards";
import { ConnectToGetStarted } from "./components/ConnectToGetStarted";
import { DEV_PACKAGE_IDS, DevNftCreator } from "./components/DevNftCreator";
import { IconCheck, IconInfo } from "./components/icons";
import { useFetchUserId } from "./hooks/useFetchUserId";
import { SubmitRes } from "./lib/types";

export const PageNew: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();

    const { header } = useAppContext();

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

            <div className="page-title">NEW AUCTION</div>

            {!currAcct
            ? <div className="card compact"><ConnectToGetStarted /></div>
            : <>
                <div className="page-section">
                    <FormCreateAuction chosenItems={chosenItems} addOrRemoveItem={addOrRemoveItem} />
                </div>

                <div className="page-section">
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

    const { bidderClient, isWorking, setIsWorking, setModalContent } = useAppContext();

    const { userId, updateUserId } = useFetchUserId(currAcct.address);

    const [ showAdvancedForm, setShowAdvancedForm ] = useState(false);
    const [ submitRes, setSubmitRes ] = useState<SubmitRes>({ ok: null });

    const coinDecimals = 9; const coinType = "0x2::sui::SUI"; const coinSymbol = "SUI"; // TODO @polymedia/coinmeta and support other coins

    const [devMode, setDevMode] = useState(false);
    const showDevModeToggle = window.location.hostname !== "bidder.polymedia.app";

    const form = {
        // basic options
        name: useInputString({
            label: "Title", minBytes: cnf.MIN_NAME_LENGTH, maxBytes: cnf.MAX_NAME_LENGTH,
            msgRequired: "Choose a title for your auction",
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
            label: "Duration (hours)", min: Math.floor(cnf.MIN_DURATION_MS/TimeUnit.ONE_HOUR), max: Math.floor(cnf.MAX_DURATION_MS/TimeUnit.ONE_HOUR),
            html: { value: "24", required: true },
        }),
        duration_seconds: useInputUnsignedInt({ // dev only
            label: "Duration (seconds)", min: Math.floor(cnf.MIN_DURATION_MS/1000), max: Math.floor(cnf.MAX_DURATION_MS/1000),
            html: { value: "15", required: true },
        }),
        // advanced options
        type_coin: useInputString({
            label: "Coin type",
            html: { value: coinType, required: true, disabled: true },
        }),
        pay_addr: useInputAddress({
            label: "Payment address",
            html: { value: currAcct.address ?? "", required: true },
        }),
        begin_delay_hours: useInputUnsignedInt({
            label: "Begin delay (hours)", max: Math.floor(cnf.MAX_BEGIN_DELAY_MS/TimeUnit.ONE_HOUR),
            html: { value: "0", required: true },
        }),
        begin_delay_seconds: useInputUnsignedInt({ // dev only
            label: "Begin delay (seconds)", max: Math.floor(cnf.MAX_BEGIN_DELAY_MS/1000),
            html: { value: "0", required: true },
        }),
        minimum_increase_pct: useInputUnsignedInt({
            label: "Minimum bid increase (%)", min: Math.max(1, Math.floor(cnf.MIN_MINIMUM_INCREASE_BPS/100)), max: Math.floor(cnf.MAX_MINIMUM_INCREASE_BPS/100),
            html: { value: "5", required: true },
        }),
        extension_period_minutes: useInputUnsignedInt({
            label: "Extension period (minutes)", min: Math.max(1, Math.floor(cnf.MIN_EXTENSION_PERIOD_MS/TimeUnit.ONE_MINUTE)), max: Math.floor(cnf.MAX_EXTENSION_PERIOD_MS/TimeUnit.ONE_MINUTE),
            html: { value: "15", required: true },
        }),
        extension_period_seconds: useInputUnsignedInt({ // dev only
            label: "Extension period (seconds)", min: Math.max(1, Math.floor(cnf.MIN_EXTENSION_PERIOD_MS/1000)), max: Math.floor(cnf.MAX_EXTENSION_PERIOD_MS/1000),
            html: { value: "1", required: true },
        }),
    };

    const hasErrors = Object.values(form).some(input => input.err !== undefined);
    const disableSubmit = chosenItems.length === 0 || hasErrors || isWorking || userId === undefined;

    // === effects ===

    // === functions ===

    const onSubmit = async () =>
    {
        if (disableSubmit) {
            return;
        }
        try {
            setIsWorking(true);
            setSubmitRes({ ok: null });
            const { resp, auctionObjChange, userObjChange } = await bidderClient.createAndShareAuction(
                form.type_coin.val!,
                userId,
                form.name.val!,
                form.description.val ?? "",
                form.pay_addr.val!,
                devMode ? form.begin_delay_seconds.val! * 1000 : form.begin_delay_hours.val! * TimeUnit.ONE_HOUR,
                devMode ? form.duration_seconds.val! * 1000 : form.duration_hours.val! * TimeUnit.ONE_HOUR,
                form.minimum_bid.val!,
                form.minimum_increase_pct.val! * 100,
                devMode ? form.extension_period_seconds.val! * 1000 : form.extension_period_minutes.val! * TimeUnit.ONE_MINUTE,
                chosenItems,
            );
            if (resp.effects?.status.status !== "success") {
                throw new Error(resp.effects?.status.error);
            }
            !userId && updateUserId(userObjChange.objectId);
            setSubmitRes({ ok: true });
            navigate(`/auction/${auctionObjChange.objectId}/items`);
        } catch (err) {
            const errMsg = bidderClient.errCodeToStr(err, "Failed to create auction");
            setSubmitRes({ ok: false, err: errMsg });
            console.warn("[onSubmit]", err);
        } finally {
            setIsWorking(false);
        }
    };

    const showInfoModal = () => {
        setModalContent(<>
            <div className="card-title"><IconInfo />Advanced options</div>
            <div><b>Payment address:</b> The Sui address that will receive the auction proceeds.</div>
            <div><b>Begin delay:</b> The time before the auction starts. 0 = starts immediately.</div>
            <div><b>Minimum bid increase:</b> The required percentage increase for each new bid.</div>
            <div><b>Extension period:</b> Bids placed within this time before the auction ends will delay the end time by the same amount.</div>
        </>);
    };

    // useEffect(() => { // dev only
    //     setShowAdvancedForm(true);
    //     showInfoModal();
    // }, [chosenItems]);

    // === html ===

    const DevModeToggle = () => {
        return (
            <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                    type="checkbox"
                    checked={devMode}
                    onChange={(e) => setDevMode(e.target.checked)}
                    style={{ marginRight: "0.6em"}}
                />
                <span>dev mode</span>
            </label>
        );
    };

    return <>
    <div className="card compact">
    <div className="card-title">Auction settings</div>
    <div className="form">
        <div className="form-section">
            {form.name.input}
            {form.description.input}
            {form.minimum_bid.input}
            {devMode ? form.duration_seconds.input : form.duration_hours.input}
            {showDevModeToggle && <DevModeToggle />}
        </div>
        <div className="form-section">
            {!showAdvancedForm &&
            <div className="section-toggle" onClick={() => setShowAdvancedForm(true)}>
                + show advanced options
            </div>}
            {showAdvancedForm &&
            <div className="card-header">
                <div className="card-title cursor-pointer" onClick={() => setShowAdvancedForm(false)}>
                    Advanced options
                </div>
                <IconInfo onClick={showInfoModal} />
            </div>}
            {showAdvancedForm && <>
                {form.type_coin.input}
                {form.pay_addr.input}
                {devMode ? form.begin_delay_seconds.input : form.begin_delay_hours.input}
                {form.minimum_increase_pct.input}
                {devMode ? form.extension_period_seconds.input : form.extension_period_minutes.input}
            </>}
        </div>

        <Btn onClick={onSubmit} disabled={disableSubmit}>
            CREATE AUCTION
        </Btn>

        {submitRes.ok === false && submitRes.err &&
        <div className="error">{submitRes.err}</div>}

        <div className="chosen-items">
            <div className="card-title">Auction items ({chosenItems.length})</div>

            <div className="card-list">
            {chosenItems.map(item =>
                <CardChosenItem item={item} key={item.id} onClick={() => addOrRemoveItem(item)} />
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

    const { bidderClient, network, setModalContent } = useAppContext();

    const ownedItems = useFetchAndLoadMore<SuiItem, string|null|undefined>(
        // (cursor) => bidderClient.fetchOwnedItems("0x750efb8f6d1622213402354bfafb986ac5674c2066e961badf83c7ccd2dc5505", cursor), // trevinsbuyingwallet.sui
        // (cursor) => bidderClient.fetchOwnedItems("0xb871a42470b59c7184033a688f883cf24eb5e66eae1db62319bab27adb30d031", cursor), // death.sui
        (cursor) => bidderClient.fetchOwnedItems(currAcct.address, cursor),
        [bidderClient, currAcct],
    );

    // === html ===

    if (ownedItems.error) {
        return <CardWithMsg>{ownedItems.error}</CardWithMsg>;
    }
    if (ownedItems.isLoading && ownedItems.data.length === 0) {
        return <CardSpinner />;
    }

    return <>
    <div className="card">
    <div className="card-title">Choose items</div>
    <div className="card-description">
        {ownedItems.data.length > 0
        ? <>Select the items you want to sell.</>
        : (network === "mainnet" || DEV_PACKAGE_IDS[network] === "")
            ? <>You don't own any items.</>
            : <DevNftCreator onNftCreated={() => bidderClient.fetchOwnedItems(currAcct.address, null)} />}
    </div>
    {ownedItems.data.length > 0 &&
    <div className="grid">
        {ownedItems.data.map(item =>
        {
            const isChosen = isChosenItem(item);
            return (
            <div className={`card grid-item ${isChosen ? "chosen" : ""}`} key={item.id}
                onClick={() => { setModalContent(<CardSuiItem item={item} verbose={true} />); }}
            >
                <CardSuiItem item={item}
                    isChosen={isChosen}
                    extra={
                        <div className="item-button">
                            <button
                                className={`btn ${isChosen ? "red" : ""}`}
                                disabled={!isChosen && disableAddItem}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    (isChosen || !disableAddItem) && addOrRemoveItem(item);
                                }}
                            >
                                {isChosen ? "REMOVE" : "ADD"}
                            </button>
                        </div>
                    }
                    />
            </div>
            );
        })}
    </div>}
    </div>

    {ownedItems.hasNextPage &&
    <div className="center-element">
        <Btn
            working={ownedItems.isLoading}
            onClick={ownedItems.loadMore}
        >
            LOAD MORE ITEMS
        </Btn>
    </div>}
    </>;
};

const CardChosenItem: React.FC<{
    item: SuiItem;
    isChosen?: boolean;
    onClick?: () => void;
}> = ({
    item,
    isChosen = false,
    onClick = undefined,
}) =>
{
    const imgSrc = item.display.image_url ?? svgNoImage;
    const imgClass = (!item.display.image_url || item.type === "_placeholder_") ? "no-image" : "";
    return (
        <div className="chosen-item" onClick={onClick}>
            <div className="item-img">
                <img src={imgSrc} className={imgClass}/>
                {isChosen && <IconCheck className="item-chosen icon" /> }
            </div>
            <div className="item-info">
                <div className="item-title break-any">
                    {item.nameShort ? item.nameShort : shortenAddress(item.type)}
                </div>
            </div>
        </div>
    );
};
