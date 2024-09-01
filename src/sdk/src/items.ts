import { SuiObjectResponse } from "@mysten/sui/client";
import {
    isParsedDataObject,
    objResToDisplay,
    objResToFields,
    objResToId,
    objResToType,
} from "@polymedia/suitcase-core";

const MAX_NAME_LENGTH = 100;

export type SuiItem = {
    id: ReturnType<typeof objResToId>;
    type: ReturnType<typeof objResToType>;
    display: ReturnType<typeof objResToDisplay>;
    fields: ReturnType<typeof objResToFields>;
    hasPublicTransfer: boolean;
    nameFull: string;
    nameShort: string;
    desc: string;
};

export type PaginatedItemsResponse = {
    data: SuiItem[];
    hasNextPage: boolean;
    nextCursor?: string | null;
};

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
    if (!isParsedDataObject(objRes.data.content)) {
        throw Error(`response data is not a moveObject: ${JSON.stringify(objRes, null, 2)}`);
    }

    const id = objRes.data.objectId;
    const type = objRes.data.content.type;
    const display = objResToDisplay(objRes);
    const fields = objRes.data.content.fields as Record<string, any>;
    const hasPublicTransfer = objRes.data.content.hasPublicTransfer;
    const nameFull: string = display.name?.trim() ?? fields.name?.trim() ?? "";
    const nameShort = nameFull.length <= MAX_NAME_LENGTH
        ? nameFull : nameFull.slice(0, MAX_NAME_LENGTH).trim() + " …";
    const desc = display.description?.trim() ?? fields.description ?? null;
    return { id, type, display, fields, hasPublicTransfer, nameFull, nameShort, desc };
}
/* eslint-enable */
