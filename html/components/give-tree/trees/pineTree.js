// JavaScript Document
var GIVe = (function (give) {
  'use strict'
  // all private methods and static data for a single chrom B+ tree

  // data structure:
  // {
  //    isRoot:        Boolean, showing whether this is root;
  //    branchingFactor:  Integer, showing the number of children a node can have;
  //    revDepth:      Integer, showing the reverse depth of node (leaf = 0 and root = max);
  //    start:        Integer, the starting coordinate;
  //    keys:        [](Integer), the separating keys (coordinates for window);
  //    values:        [](Records), the records;
  //    next:        The next node with the same revDepth as this one;
  //    prev:        The previous node with the same revDepth.
  // }

  // public API
  give.PineTree = function (chrRange, summaryCtor, bFactor, lifeSpan) {
    // start and length is for the corresponding region
    // lifeSpan is the lifeSpan a node will live, in terms of
    //    number of traverses
    // If any node is not called after this number of traverses being requested
    //    for the tree, the node will be deleted (wither)
    // If lifeSpan < 0, then no node will be deleted (no withering)

    if (isNaN(bFactor) || parseInt(bFactor) !== bFactor || bFactor <= 2) {
      console.log('Default branching factor is chosen instead of ' + bFactor)
      bFactor = give.GiveTree._DEFAULT_B_FACTOR
    }
    if (isNaN(lifeSpan) || parseInt(lifeSpan) !== lifeSpan || lifeSpan < 0) {
      console.log('Default life span is chosen instead of ' + bFactor)
      lifeSpan = give.GiveTree._DEFAULT_LIFESPAN
    }
    this.lifeSpan = lifeSpan
    // Scaling factor
    if (
      !Number.isInteger(props.ScalingFactor) || props.ScalingFactor <= 2
    ) {
      console.log('Default scaling factor is chosen instead of ' +
        props.ScalingFactor)
      this.ScalingFactor = give.PineNode._DEFAULT_S_FACTOR
    } else {
      this.ScalingFactor = props.ScalingFactor
    }

    // Leaf scaling factor
    if (
      !Number.isInteger(props.LeafScalingFactor) || props.LeafScalingFactor <= 2
    ) {
      console.log('Non-leaf scaling factor is chosen for leaves instead of ' +
        props.LeafScalingFactor)
      this.LeafScalingFactor = this.ScalingFactor
    } else {
      this.LeafScalingFactor = props.LeafScalingFactor
    }

    if (typeof props.SummaryCtor === 'function') {
      this.Tree.SummaryCtor = props.SummaryCtor
    }

    this.chr = chrRange.chr
    this.root = new give.GiveTreeNode(null, chrRange.start, chrRange.end,
      summaryCtor, null, null, bFactor, true, lifeSpan)
  }

  give.GiveTree.prototype._insertSingleRange = function (
    data, chrRange, continuedList, callback, resolution
  ) {
    // This insert function is not supposed to handle the case where data exceeds boundary of chrRegion.
    // Root will always encompass the whole chromosome (from ref definition)
    // before calling children, the chrRegion will be split into the bins of children.

    // data:      an array of data elements, sorted by their own chrRegion.
    //          data === null or data === [] means there is no data in chrRegion
    //          (change all nulls into falses).
    //          *NOTICE*: any data overlapping chrRange should appear either here or in continuedList
    //          otherwise continuedList in record entries may not work properly.
    // chrRange:    the chromosomal region where data will be populated
    //          (no null value will present within this region after this operation).
    //          This parameter should be an Object with at least two properties:
    //          { start: <start coordinate>, end: <end coordinate>, ... }.
    //          If data.length === 1 and chrRegion === null,
    //          then chrRegion = data[0] (because of ChromRegion behavior).
    // continuedList:  an array for data elements that should be put into the continue list
    //          at the beginning of the tree, only useful when chrRange.start === this.start.
    //          Note that for best efficiency, continuedList should not contain anything that's
    //          already in data.
    // callback:    some function to be called upon the data element: callback(dataElement);

    if (!chrRange.chr || chrRange.chr === this.chr) {
      this.root = this.root.insert(data, chrRange, continuedList, callback,
        resolution, this.lifeSpan)
    }
  }

  give.GiveTree.prototype.insert = function (data, chrRange, continuedList,
    callback, resolution) {
    // This insert function is not supposed to handle the case where data exceeds boundary of chrRegion.
    // Root will always encompass the whole chromosome (from ref definition)
    // before calling children, the chrRegion will be split into the bins of children.

    // data:      an array of data elements, sorted by their own chrRegion.
    //          data === null or data === [] means there is no data in chrRegion
    //          (change all nulls into falses).
    //          *NOTICE*: any data overlapping chrRange should appear either here or in continuedList
    //          otherwise continuedList in record entries may not work properly.
    // chrRange:    the chromosomal region where data will be populated
    //          (no null value will present within this region after this operation).
    //          This parameter should be an Object with at least two properties:
    //          { start: <start coordinate>, end: <end coordinate>, ... }.
    //          If data.length === 1 and chrRegion === null,
    //          then chrRegion = data[0] (because of ChromRegion behavior).
    // continuedList:  an array for data elements that should be put into the continue list
    //          at the beginning of the tree, only useful when chrRange.start === this.start.
    //          Note that for best efficiency, continuedList should not contain anything that's
    //          already in data.
    // callback:    some function to be called upon the data element: callback(dataElement);

    continuedList = continuedList || []
    if (Array.isArray(chrRange)) {
      chrRange.forEach(function (range, index) {
        this._insertSingleRange(data, range, continuedList, callback,
          Array.isArray(resolution) ? resolution[index] : resolution,
          this.lifeSpan)
      }, this)
    } else {
      this._insertSingleRange(data, chrRange, continuedList, callback,
        resolution, this.lifeSpan)
    }
  }

  give.GiveTree.prototype.remove = function (data, removeExactMatch, callback) {
    // Removing a single data entry.
    // Notice that if data is provided and duplicate keys (same start and end) exist,
    // it will behave as removeExactMatch indicated.
    // If removeExactMatch, data will be compared by .equalTo(data) if exists, === if not.

    // Also, the return value will be dependent on this.isRoot
    // * For root nodes, return this if no decreasing height happen, otherwise the new root node
    // * For non-root nodes, return false if redistribution needs to be handled by its parent
    //            return this if no redistribution is needed (keys may still need to be readjusted)

    this.root = this.root.remove(data, removeExactMatch, callback)
  }

//    removeRange: function(chrRange) {
//      // if data is not provided, every region whose start is within chrRange (probably not used very much)
//    },
//
  give.GiveTree.prototype.traverse = function (chrRange, callback, filter,
    resolution, thisVar, breakOnFalse, wither) {
    // Will apply callbacks to all data overlapping with chrRegion;
    //    callback should take the node (or record) as its sole parameter:
    //    callback(record/node)
    // If filter is applied, callbacks will only apply when filter(data) === true
    // resolution is the maximum resolution needed for traversing

    // Notice that if chrRegion does not overlap with this node,
    //    then an exception will be thrown.

    // thisVar is the 'this' used to call callback
    // If breakOnFalse is true, then traverse will return false once callback returns false

    // Find the starting node first, then call child.traverse on child
    // However, this is not a recursive call because children can get to their next sibling by themselves

    // notFirstCall is a flag marking internal calls,
    //     calls from outside should always have notFirstCall === undefined, null or false
    //    when traverse calls children that are not the first one overlapping chrRegion
    //    notFirstCall will be set as true

    // wither is a flag whether to reduce life for nodes not traversed
    if (!chrRange.chr || chrRange.chr === this.chr) {
      var result = this.root.traverse(chrRange, callback, filter,
                    resolution, thisVar, breakOnFalse, false,
                    wither ? this.lifeSpan + 1 : 0)
      if (wither) {
        this.wither()
      }
      return result
    }
  }

  give.GiveTree.prototype.wither = function () {
    // this is the method called to wither all nodes
    if (!this.root.wither()) {
      // the whole tree will wither
      delete this.root
      return null
    }
    return this
  }

  // TODO: allow summary and leveled traverse (leveled traverse done)

  // allow sectional loading (will return an array of chrRegions that does not have data loaded)
  give.GiveTree.prototype.getUncachedRange = function (chrRange, resolution, bufferingRatio) {
    // return the range list with range(s) without any data
    //   (either not loaded, or purges for memory usage issue (to be implemented))
    // if no non-data ranges are found, return []

    // resolution is used to determine if the summary of this is already enough (to be implemented)

    if (!chrRange.chr || chrRange.chr === this.chr) {
      return this.root.getUncachedRange(chrRange, resolution, bufferingRatio)
    } else {
      return []
    }
  }

  // TODO: allow caching (nodes not used for a while will be cleared to preserve memory)

  give.GiveTree._DEFAULT_B_FACTOR = 20        // this value may need to be tweaked
  give.GiveTree._DEFAULT_LIFESPAN = 10       // this value may need to be tweaked

  return give
})(GIVe || {})
