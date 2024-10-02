import { SuiObjectResponse } from "@mysten/sui/client";
import {
    isParsedDataKind,
    newEmptyDisplay,
    objResToDisplay,
    objResToFields,
    objResToId,
    objResToType,
    shortenAddress,
} from "@polymedia/suitcase-core";

const MAX_NAME_LENGTH = 100;

export type SuiItem = {
    id: string;
    type: string;
    display: ReturnType<typeof objResToDisplay>;
    fields: ReturnType<typeof objResToFields>;
    hasPublicTransfer: boolean;
    nameFull: string;
    nameShort: string;
    desc: string;
    kioskCap: null | KioskCap;
};

export type KioskKind = "kiosk" | "ob_kiosk" /* | "personal_kiosk" */;

export type KioskCap = {
    id: string;
    kioskId: string;
    kind: KioskKind;
};

export function newItemPlaceholder(addr: string): SuiItem {
    const display = newEmptyDisplay();
    display.image_url = svgNoImage;
    return {
        id: addr,
        type: "_placeholder_",
        display,
        fields: {},
        hasPublicTransfer: true,
        nameFull: addr,
        nameShort: shortenAddress(addr),
        desc: "",
        kioskCap: null,
    };
}

/* eslint-disable */
export function objResToSuiItem(objRes: SuiObjectResponse): SuiItem
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
    if (!isParsedDataKind(objRes.data.content, "moveObject")) {
        throw Error(`response data is not a moveObject: ${JSON.stringify(objRes, null, 2)}`);
    }

    const id = objRes.data.objectId;
    const type = objRes.data.content.type;
    const display = objResToDisplay(objRes);
    if (display.image_url?.startsWith("ipfs://")) {
        display.image_url = display.image_url.replace("ipfs://", "https://ipfs.io/ipfs/");
    }
    const fields = objRes.data.content.fields as Record<string, any>;
    const hasPublicTransfer = objRes.data.content.hasPublicTransfer;
    const desc = display.description?.trim() ?? fields.description ?? null;
    const nameFull: string = display.name?.trim() ?? fields.name?.trim() ?? desc ??"";
    const nameShort = nameFull.length <= MAX_NAME_LENGTH
        ? nameFull : nameFull.slice(0, MAX_NAME_LENGTH).trim() + " …";
    const kioskCap = null; // set by BidderClient
    return { id, type, display, fields, hasPublicTransfer, nameFull, nameShort, desc, kioskCap };
}

export function objResToKioskCap(objRes: SuiObjectResponse): KioskCap
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
    if (!isParsedDataKind(objRes.data.content, "moveObject")) {
        throw Error(`response data is not a moveObject: ${JSON.stringify(objRes, null, 2)}`);
    }

    const id = objRes.data.objectId;
    const fields = objRes.data.content.fields as Record<string, any>;
    const type = objRes.data.content.type;
    let kind: KioskKind;
    let kioskId: string;

    if (type.match(/^0x0*2::kiosk::KioskOwnerCap$/)) {
        kind = "kiosk";
        kioskId = fields.for;
    }
    else if (type === "0x95a441d389b07437d00dd07e0b6f05f513d7659b13fd7c5d3923c7d9d847199b::ob_kiosk::OwnerToken") {
        kind = "ob_kiosk";
        kioskId = fields.kiosk;
    }
    // else if (type === "0x0cb4bcc0560340eb1a1b929cabe56b33fc6449820ec8c1980d69bb98b649b802::personal_kiosk::PersonalKioskCap") {
    //     kind = "personal_kiosk";
    //     kioskId = fields.for;
    // }
    else {
        throw Error(`object is not a KioskOwnerCap: ${JSON.stringify(objRes, null, 2)}`);
    }

    return { id, kioskId, kind };
}
/* eslint-enable */

/** placeholder image */
export const svgNoImage = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m4.75 16 2.746-3.493a2 2 0 0 1 3.09-.067L13 15.25m-2.085-2.427c1.037-1.32 2.482-3.188 2.576-3.31a2 2 0 0 1 3.094-.073L19 12.25m-12.25 7h10.5a2 2 0 0 0 2-2V6.75a2 2 0 0 0-2-2H6.75a2 2 0 0 0-2 2v10.5a2 2 0 0 0 2 2Z"></path></svg>');
