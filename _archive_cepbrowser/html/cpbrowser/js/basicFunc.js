// JavaScript Document
function locationOf(element, array, start, end, compareFunc) {
	// this is to return the index that element will be put AFTER
	// so if the element needs to be put to the top, it will return start-1
    if (array.length === 0) {
        return -1;
	}

    start = start || 0;
    end = end || array.length;
    var pivot = (start + end) >> 1;  // = parseInt((start + end) / 2)

    var comp = compareFunc(element, array[pivot]);
    if (end - start <= 1) {
		return (comp === -1) ? pivot - 1 : pivot;
	}

    switch (comp) {
        case -1: return locationOf(element, array, start, pivot, compareFunc);
        case 0: return pivot;
        case 1: return locationOf(element, array, pivot, end, compareFunc);
    }
}

