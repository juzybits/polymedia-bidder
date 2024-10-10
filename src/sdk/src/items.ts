import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { normalizeStructTag } from "@mysten/sui/utils";
import {
    isParsedDataKind,
    newEmptyDisplay,
    objResToDisplay,
    objResToFields,
    shortenAddress,
} from "@polymedia/suitcase-core";
import { OwnedKioskItem } from "./kiosks.js";

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
    kiosk: OwnedKioskItem | null;
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
        kiosk: null,
    };
}

/* eslint-disable */
export function objResToSuiItem(resp: SuiObjectResponse): SuiItem | null
{
    if (resp.error) {
        return null;
    }
    if (!resp.data) {
        throw Error(`response has no data: ${JSON.stringify(resp, null, 2)}`);
    }
    return objDataToSuiItem(resp.data);
}

export function objDataToSuiItem(data: SuiObjectData): SuiItem
{
    if (!data?.content) {
        throw Error(`object data has no content: ${JSON.stringify(data, null, 2)}`);
    }
    if (!data?.display) {
        throw Error(`object data has no display: ${JSON.stringify(data, null, 2)}`);
    }
    if (!isParsedDataKind(data.content, "moveObject")) {
        throw Error(`object data data is not a moveObject: ${JSON.stringify(data, null, 2)}`);
    }

    const id = data.objectId;
    const type = normalizeStructTag(data.content.type);
    const display = {
        ...newEmptyDisplay(),
        ...data.display.data,
    };
    if (display.image_url?.startsWith("ipfs://")) {
        display.image_url = display.image_url.replace("ipfs://", "https://ipfs.io/ipfs/");
    }
    const fields = data.content.fields as Record<string, any>;
    const hasPublicTransfer = data.content.hasPublicTransfer;
    const desc = display.description?.trim() ?? fields.description ?? null;
    const nameFull: string = display.name?.trim() ?? fields.name?.trim() ?? desc ??"";
    const nameShort = nameFull.length <= MAX_NAME_LENGTH
        ? nameFull : nameFull.slice(0, MAX_NAME_LENGTH).trim() + " …";
    const kiosk = null; // set by BidderClient
    return { id, type, display, fields, hasPublicTransfer, nameFull, nameShort, desc, kiosk };

}
/* eslint-enable */

/** placeholder image */
export const svgNoImage = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m4.75 16 2.746-3.493a2 2 0 0 1 3.09-.067L13 15.25m-2.085-2.427c1.037-1.32 2.482-3.188 2.576-3.31a2 2 0 0 1 3.094-.073L19 12.25m-12.25 7h10.5a2 2 0 0 0 2-2V6.75a2 2 0 0 0-2-2H6.75a2 2 0 0 0-2 2v10.5a2 2 0 0 0 2 2Z"></path></svg>');
