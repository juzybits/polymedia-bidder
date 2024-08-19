module auction::paginator;

use std::u64::{Self};
use sui::table_vec::{TableVec};

public fun get_page<T: store + copy>(
    items: &TableVec<T>,
    ascending: bool,
    cursor: u64,
    limit: u64,
): (vector<T>, bool, u64)
{
    if (items.length() == 0) {
        (vector::empty(), false, 0)
    } else if (ascending) {
        get_page_ascending(items, cursor, limit)
    } else {
        get_page_descending(items, cursor, limit)
    }
}

fun get_page_ascending<T: store + copy>(
    items: &TableVec<T>,
    cursor: u64,
    limit: u64,
): (vector<T>, bool, u64)
{
    let length = items.length();

    let start = cursor;
    let end = u64::min(length, cursor + limit);

    let mut data = vector<T>[];
    let mut i = start;
    while (i < end) {
        vector::push_back(&mut data, *items.borrow(i));
        i = i + 1;
    };

    let has_more = end < length;
    let next_cursor = end;

    return (data, has_more, next_cursor)
}

fun get_page_descending<T: store + copy>(
    items: &TableVec<T>,
    cursor: u64,
    limit: u64,
): (vector<T>, bool, u64)
{
    let length = items.length();

    let start =
        if (cursor < length) { cursor }
        else { length - 1 }; // start at last item

    let end =
        if (limit > cursor) { 0 } // end at first item
        else { cursor - limit + 1 };

    let mut data = vector<T>[];
    let mut i = start;
    while (i >= end) {
        vector::push_back(&mut data, *items.borrow(i));
        if (i == 0) { break }  // prevent underflow
        else { i = i - 1; }
    };

    let has_more = start > 0 && cursor < length && end > 0;

    let next_cursor =
        if (cursor >= length) {
            length  // if cursor is out of range, next_cursor should be the length of the list
        } else if (end > 0) {
            end - 1  // the last item fetched in descending order
        } else {
            0
        };

    return (data, has_more, next_cursor)
}
