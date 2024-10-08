import { useCurrentAccount } from "@mysten/dapp-kit";
import { AUCTION_CONFIG as cnf, SuiItem, svgNoImage } from "@polymedia/bidder-sdk";
import { shortenAddress, TimeUnit } from "@polymedia/suitcase-core";
import { isLocalhost, LinkToExplorer, useFetch, useFetchAndLoadMore, useInputAddress, useInputString, useInputUnsignedBalance, useInputUnsignedInt } from "@polymedia/suitcase-react";
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

const debugKiosk = isLocalhost();

function getCurrAddr(
    currAcct: ReturnType<typeof useCurrentAccount>,
): {
    currAddr: string | null,
    dryRun: boolean,
} {
    return { dryRun: false, currAddr: currAcct ? currAcct.address : null };
    // return { dryRun: true, currAddr: "0x10eefc7a3070baa5d72f602a0c89d7b1cb2fcc0b101cf55e6a70e3edb6229f8b"}; // trevin.sui
    // return { dryRun: true, currAddr: "0xb871a42470b59c7184033a688f883cf24eb5e66eae1db62319bab27adb30d031"}; // death.sui
    // return { dryRun: true, currAddr: "0x1eb7c57e3f2bd0fc6cb9dcffd143ea957e4d98f805c358733f76dee0667fe0b1"}; // adeniyi.sui
    // return { dryRun: true, currAddr: "0x21283b1f04359b2f84e28c05962efc00ef33a40f23e9ab9f655c327fd6efc432"}; // fuddies top holder
}

export const PageNew: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    const { currAddr } = getCurrAddr(currAcct);

    const { header, bidderClient } = useAppContext();

    const [ chosenItems, setChosenItems ] = useState<SuiItem[]>([]);

    const blockedTypes = useFetch(() =>
        fetch("https://raw.githubusercontent.com/suiet/guardians/refs/heads/main/src/object-list.json")
        .then(response => response.json())
        .then(data => {
            const map = new Map<string, boolean>();
            for (const type of data.blocklist as string[]) { // eslint-disable-line
                map.set(type, true);
            }
            return map;
        })
    );

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

            <div className="page-title">
                NEW AUCTION
            </div>

            {!currAddr
            ? <div className="card compact"><ConnectToGetStarted /></div>
            : <>
                <div className="page-section">
                    <FormCreateAuction
                        chosenItems={chosenItems}
                        addOrRemoveItem={addOrRemoveItem}
                    />
                </div>

                <div className="page-section">
                    <ItemGridSelector
                        addOrRemoveItem={addOrRemoveItem}
                        isChosenItem={isChosenItem}
                        disableAddItem={disableAddItem}
                        blockedTypes={blockedTypes.data ?? new Map()}
                    />
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
    const { currAddr, dryRun } = getCurrAddr(currAcct);
    if (!currAddr) { return; }

    const { bidderClient, isWorking, setIsWorking, setModalContent } = useAppContext();

    const { userId, updateUserId } = useFetchUserId(currAddr);

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
            html: { value: currAddr, required: true },
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

            const { resp, auctionObjChange, userObjChange } = await bidderClient.createAndShareAuctionWithKiosk(
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
                dryRun,
                currAddr,
            );
            if (resp.effects?.status.status !== "success") {
                throw new Error(resp.effects?.status.error);
            }
            if (!dryRun) {
                !userId && updateUserId(userObjChange!.objectId);
                setSubmitRes({ ok: true });
                navigate(`/auction/${auctionObjChange!.objectId}/items`, {
                    state: { justCreated: true },
                });
            } else {
                console.debug("dryRun ok:", resp);
            }
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

const ItemGridSelector: React.FC<{ // TODO add filter by type, ID
    addOrRemoveItem: (item: SuiItem) => void;
    isChosenItem: (item: SuiItem) => boolean;
    disableAddItem: boolean;
    blockedTypes: Map<string, string[]>;
}> = ({
    addOrRemoveItem,
    isChosenItem,
    disableAddItem,
    blockedTypes,
}) =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    const { currAddr } = getCurrAddr(currAcct);
    if (!currAddr) { return; }

    const { bidderClient, explorer, network, setModalContent } = useAppContext();

    const [ toggleChoice, setToggleChoice ] = useState<"objects"|"kiosks">("objects");

    const [ acceptedDisclaimer, setAcceptedDisclaimer ] = useState(loadKioskDisclaimer());

    const ownedItems = useFetchAndLoadMore<SuiItem, string|null|undefined>(
        (cursor) => bidderClient.fetchOwnedItems(currAddr, cursor),
        [bidderClient, currAddr],
    );

    const ownedKioskItems = useFetchAndLoadMore<SuiItem, string|undefined>(
        async (cursor) => bidderClient.fetchOwnedKioskItems(currAddr, cursor, 10),
        [bidderClient, currAddr]
    );

    function acceptDisclaimer() {
        setAcceptedDisclaimer(true);
        acceptKioskDisclaimer();
    }

    // === html ===

    const itemSelector = (
        items: typeof ownedItems | typeof ownedKioskItems,
        type: "objects" | "kiosks",
    ) => {
        if (items.error) {
            return <CardWithMsg>{items.error}</CardWithMsg>;
        }
        if (items.isLoading && items.data.length === 0) {
            return <CardSpinner />;
        }
        if (items.data.length === 0) {
            if (type === "objects" && (network === "mainnet" || DEV_PACKAGE_IDS[network] === "")) {
                return <div className="card-description">You don't own any items.</div>;
            }
            if (type === "objects") {
                return <DevNftCreator onNftCreated={() => bidderClient.fetchOwnedItems(currAddr, null)} />;
            }
            return <div className="card-description">You don't have any items in kiosks.</div>;
        }
        return <>
            <div className="card-description">
                Select the items you want to sell.
            </div>

            <div className="grid-selector">
                <div className="grid">
                    {items.data.map(item => {
                        if (blockedTypes.has(item.type)) {
                            return null;
                        }
                        const isChosen = isChosenItem(item);
                        return (
                            <div className={`card grid-item ${isChosen ? "chosen" : ""}`} key={item.id}
                                onClick={() => { !debugKiosk && setModalContent(<CardSuiItem item={item} verbose={true} />); }}
                            >
                                <CardSuiItem item={item}
                                    isChosen={isChosen}
                                    extra={<>
                                        {debugKiosk && item.kiosk && <div className="item-info">
                                            <div>item: <LinkToExplorer addr={item.id} kind="object" explorer={explorer} network={network} /></div>
                                            <div>cap: <LinkToExplorer addr={item.kiosk.cap.objectId} kind="object" explorer={explorer} network={network} /></div>
                                            <div>kiosk: <LinkToExplorer addr={item.kiosk.kiosk.id} kind="object" explorer={explorer} network={network} /></div>
                                            <div>items: {item.kiosk.kiosk.itemCount}</div>
                                            <div>locked: {item.kiosk.item.isLocked ? "yes" : "no"}</div>
                                            {/* <div>listed: {item.kiosk.item.isListed ? "yes" : "no"}</div> */}
                                            <div>personal: {item.kiosk.cap.isPersonal ? "yes" : "no"}</div>
                                        </div>}
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
                                    </>}
                                />
                            </div>
                        );
                    })}
                </div>

                {items.hasNextPage &&
                <div className="center-element">
                    <Btn
                        working={items.isLoading}
                        onClick={items.loadMore}
                    >
                        LOAD MORE {type.toUpperCase()}
                    </Btn>
                </div>}
            </div>
        </>;
    };

    return (
    <div className="card">

        <div className="card-header column-on-small">
            <div className="card-title">Choose items</div>
            {<div className="card-toggle">
                <div
                    className={`header-label ${toggleChoice === "objects" ? "selected" : ""}`}
                    onClick={() => setToggleChoice("objects")}
                >
                    Objects
                </div>
                <div
                    className={`header-label ${toggleChoice === "kiosks" ? "selected" : ""}`}
                    onClick={() => setToggleChoice("kiosks")}
                >
                    Kiosks
                </div>
            </div>}
        </div>

        {toggleChoice === "objects" && itemSelector(ownedItems, "objects")}
        {toggleChoice === "kiosks" && (
            acceptedDisclaimer
            ? itemSelector(ownedKioskItems, "kiosks")
            : <div className="card compact">
                <div className="card-title center-element">🚨 DISCLAIMER 🚨</div>
                <div className="card-description">
                    This is a beta feature and there could be bugs. Please use with care, and let me know if you encounter any issues.
                </div>
                <div className="card-description">
                    <Btn onClick={() => acceptDisclaimer()}>I UNDERSTAND</Btn>
                </div>
            </div>
        )}

    </div>);
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

// local storage

const kioskDisclaimerKey = "polymedia.kiosk.disclaimer";

function loadKioskDisclaimer(): boolean {
    const disclaimer = localStorage.getItem(kioskDisclaimerKey);
    return disclaimer !== null;
}

function acceptKioskDisclaimer() {
    localStorage.setItem(kioskDisclaimerKey, "1");
}
