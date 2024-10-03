import { KioskData } from "@mysten/kiosk";
import { SuiObjectResponse } from "@mysten/sui/client";
import { normalizeStructTag } from "@mysten/sui/utils";
import {
    isParsedDataKind,
    newEmptyDisplay,
    objResToDisplay,
    objResToFields,
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
    kioskData: KioskData | null;
    // kioskCap: null | KioskCap;
};

export type KioskKind = "sui_kiosk" | "ob_kiosk" | "personal_kiosk";

export const SUI_KIOSK_CAP_TYPE = "0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::KioskOwnerCap";
export const OB_KIOSK_CAP_TYPE = "0x95a441d389b07437d00dd07e0b6f05f513d7659b13fd7c5d3923c7d9d847199b::ob_kiosk::OwnerToken";
export const PERSONAL_KIOSK_CAP_TYPE = "0x0cb4bcc0560340eb1a1b929cabe56b33fc6449820ec8c1980d69bb98b649b802::personal_kiosk::PersonalKioskCap";

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
        kioskData: null,
        // kioskCap: null,
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
    const kioskData = null; // set by BidderClient
    return { id, type, display, fields, hasPublicTransfer, nameFull, nameShort, desc, kioskData };
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
    const type = normalizeStructTag(objRes.data.content.type);
    let kind: KioskKind;
    let kioskId: string;

    if (type === SUI_KIOSK_CAP_TYPE) {
        kind = "sui_kiosk";
        kioskId = fields.for;
    }
    else if (type === OB_KIOSK_CAP_TYPE) {
        kind = "ob_kiosk";
        kioskId = fields.kiosk;
    }
    else if (type === PERSONAL_KIOSK_CAP_TYPE) {
        /*
        personal_kiosk {
            "objectId": "0x467d2c53f4c5732ff469cd05ea5703a91ea97e61599f8ac17b377f758b75fd1f",
            "content": {
                "type": "0x0cb4bcc0560340eb1a1b929cabe56b33fc6449820ec8c1980d69bb98b649b802::personal_kiosk::PersonalKioskCap",
                "hasPublicTransfer": false,
                "fields": {
                "cap": {
                    "type": "0x2::kiosk::KioskOwnerCap",
                    "fields": {
                        "for": "0x42840520d4b81d3848db362a96f99885c099fbf8edd8a114a70c677f82c91b9e",
                        "id": {
                            "id": "0x6b2cea6dc1497d7fb58a2c4e01b457de81f35d839890f58815efc13a99f579b1"
                        }
                    }
                },
                }
            }
        }
        */
        kind = "personal_kiosk";
        kioskId = fields.cap.fields.for;
    }
    else {
        throw Error(`object is not a KioskOwnerCap: ${JSON.stringify(objRes, null, 2)}`);
    }

    return { id, kioskId, kind };
}
/* eslint-enable */

/** placeholder image */
export const svgNoImage = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m4.75 16 2.746-3.493a2 2 0 0 1 3.09-.067L13 15.25m-2.085-2.427c1.037-1.32 2.482-3.188 2.576-3.31a2 2 0 0 1 3.094-.073L19 12.25m-12.25 7h10.5a2 2 0 0 0 2-2V6.75a2 2 0 0 0-2-2H6.75a2 2 0 0 0-2 2v10.5a2 2 0 0 0 2 2Z"></path></svg>');
