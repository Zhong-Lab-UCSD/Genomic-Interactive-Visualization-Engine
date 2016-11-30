// JavaScript Document
var GIVe = (function(give) {

	// all private methods and static data for a single chrom B+ tree

	// data structure:
	// {
	//		isRoot:				Boolean, showing whether this is root;
	//		branchingFactor:	Integer, showing the number of children a node can have;
	//		revDepth:			Integer, showing the reverse depth of node (leaf = 0 and root = max);
	//		start:				Integer, the starting coordinate;
	//		keys:				[](Integer), the separating keys (coordinates for window);
	//		values:				[](Records), the records;
	//		next:				The next node with the same revDepth as this one;
	//		prev:				The previous node with the same revDepth.
	// }


	// public API
	give.ChromBPlusTree = function(start, end, bFactor) {
		// start and length is for the corresponding region 
		this.root = new give.ChromBPlusTreeNode(0, start, end, null, null, bFactor, true);
	};

	give.ChromBPlusTree.prototype.insert = function(data, chrRange, continuedList, callback) {
		// This insert function is not supposed to handle the case where data exceeds boundary of chrRegion.
		// Root will always encompass the whole chromosome (from species definition)
		// before calling children, the chrRegion will be split into the bins of children.

		// data:			an array of data elements, sorted by their own chrRegion.
		//					data === null or data === [] means there is no data in chrRegion
		//					(change all nulls into falses).
		//					*NOTICE*: any data overlapping chrRange should appear either here or in continuedList
		//					otherwise continuedList in record entries may not work properly.
		// chrRange:		the chromosomal region where data will be populated 
		//					(no null value will present within this region after this operation).
		//					This parameter should be an Object with at least two properties: 
		//					{ start: <start coordinate>, end: <end coordinate>, ... }.
		//					If data.length === 1 and chrRegion === null, 
		//					then chrRegion = data[0] (because of ChromRegion behavior).
		// continuedList:	an array for data elements that should be put into the continue list 
		//					at the beginning of the tree, only useful when chrRange.start === this.start.
		//					Note that for best efficiency, continuedList should not contain anything that's
		//					already in data.
		// callback:		some function to be called upon the data element: callback(dataElement);
		
		continuedList = continuedList || [];
		if(Array.isArray(chrRange)) {
			chrRange.forEach(function(range) {
				this.root = this.root.insert(data, range, continuedList, callback);
			}, this);
		} else {
			this.root = this.root.insert(data, chrRange, continuedList, callback);
		}

	};

	give.ChromBPlusTree.prototype.remove = function(data, removeExactMatch, callback) {
		// Removing a single data entry.
		// Notice that if data is provided and duplicate keys (same start and end) exist, 
		// it will behave as removeExactMatch indicated.
		// If removeExactMatch, data will be compared by .equalTo(data) if exists, === if not.

		// Also, the return value will be dependent on this.isRoot
		// * For root nodes, return this if no decreasing height happen, otherwise the new root node
		// * For non-root nodes, return false if redistribution needs to be handled by its parent
		//						return this if no redistribution is needed (keys may still need to be readjusted)

		this.root = this.root.remove(data, removeExactMatch, callback);

	};

//		removeRange: function(chrRange) {
//			// if data is not provided, every region whose start is within chrRange (probably not used very much)
//		},
//			
	give.ChromBPlusTree.prototype.traverse = function(chrRange, callback, filter, resolutionFunc, thisVar, breakOnFalse) {
		// Will apply callbacks to all data overlapping with chrRegion;
		//		callback should take the node (or record) as its sole parameter:
		//		callback(record/node)
		// If filter is applied, callbacks will only apply when filter(data) === true
		// resolutionFunc is the function (taking node as parameter) 
		//		to return whether children of this has the correct resolution.
		//		Notice that if resolutionFunc returns true for a certain level, 
		//		it will definitely return true for its children

		// Notice that if chrRegion does not overlap with this node,
		//		then an exception will be thrown.

		// thisVar is the 'this' used to call callback
		// If breakOnFalse is true, then traverse will return false once callback returns false

		// Find the starting node first, then call child.traverse on child
		// However, this is not a recursive call because children can get to their next sibling by themselves

		// notFirstCall is a flag marking internal calls, 
		// 		calls from outside should always have notFirstCall === undefined, null or false
		//		when traverse calls children that are not the first one overlapping chrRegion
		//		notFirstCall will be set as true

		return this.root.traverse(chrRange, callback, filter, 
								  resolutionFunc, thisVar, breakOnFalse, false);

	};

	// TODO: allow summary and leveled traverse (leveled traverse done)

	// allow sectional loading (will return an array of chrRegions that does not have data loaded)
	give.ChromBPlusTree.prototype.getUncachedRange = function(chrRange, resolutionFunc) {
		// return the range list with range(s) without any data 
		// 	(either not loaded, or purges for memory usage issue (to be implemented))
		// if no non-data ranges are found, return []

		// resolutionFunc is used to determine if the summary of this is already enough (to be implemented)

		return this.root.getUncachedRange(chrRange, resolutionFunc);
	};

	// TODO: allow caching (nodes not used for a while will be cleared to preserve memory)

	return give;

})(GIVe || {});
