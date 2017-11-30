// JavaScript Document
//  Chrom B+ tree node
//
//  This is the data object used to store genomic data for fast insertion/deletion/query/enumeration.
//  It's basically an extended B+ tree with some difference in key implementation.
//
//  Every record will serve as a bin, with a start and end coordinate,
//  and all records combined will serve as a division of the chromosome (no gap, no overlap)
//  with all the start value for dividing points.
//
//  For example:
//
//    bins:   << |                      |       |          |       >>
//    Data:   << ------------]
//           [-----------------]
//           [------------]
//           [------------------------------------]
//           [--------------------------]
//                      [-------]
//                      [------------------------- >>
//                          [---------------]
//                          [----------------- >>
//                               [-]
//
//  Records can have value of:
//
//    null:  data not loaded yet, when upper layer encounter this,
//        the code there needs to retrieve potential data;
//
//    false:  there is no data in this bin;
//
//    { startList: [] / null, continuedList: [] / undefined, resolution: int }:
//      An object saving references to actual data (Objects with ChromRegion behavior) that spans the bin,
//      startList:    data that start at this bin (have the same start coordinate),
//              startList will become an empty array only if the previous bin is unloaded
//              (because otherwise this bin can be merged with the previous one),
//              or this is the first bin;
//      continuedList:  data that starts at previous bin(s) but overlapping with this bin,
//              this array will be sorted by the actual starting points,
//              [] will have the same effect as 'undefined'.
//      resolution:    the resolution of the data record (if exists, 0 otherwise)
//
//  When traversing, everything in 'continuedList' of *the starting record only* will be processed first,
//  then everything in 'startList' in all overlapping records will be processed.
//
//  Because of the nature of this range-indiced data,
//  the arrangements of keys will be slightly different from normal B+ trees:
//
//  Internal Nodes will have the same number of branches as leaf nodes
//  (because we actually need the start and end values for the internal node);
//  keys.length will be 1 more than values.length;
//  keys[i] will be the start coordinate of values[i] and end coordinate of values[i - 1];
//  keys[keys.length - 1] will be the end coordinate of values[values.length - 1].
//  Therefore, neighboring nodes will have exactly one overlapping key.
//
//  branchingFactor will dictate the maximum number of values within a node.
//

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
  //    values:        [](Records), the records (see above for data structure);
  //    next:        The next node with the same revDepth as this one;
  //    prev:        The previous node with the same revDepth.
  // }

  // public API
  give.ChromBPlusTreeNode =
    function (revdepth, start, end, summaryCtor, nextNode, prevNode, bFactor, isroot) {
    // start and length is for the corresponding region
      if (isNaN(bFactor) || parseInt(bFactor) !== bFactor || bFactor <= 2) {
        give._verboseConsole('Default branching factor is chosen instead of ' +
          bFactor, give.VERBOSE_DEBUG)
        bFactor = give.ChromBPlusTreeNode._DEFAULT_B_FACTOR
      }
      if (typeof revdepth !== 'number' || isNaN(revdepth)) {
        revdepth = 0
      }
      if (start >= end) {
        throw (new Error('Range error. Start: ' + start + ', end: ' + end))
      }
      this.isRoot = !!isroot
      this.branchingFactor = bFactor
      this.keys = [start, end]
      // Notice that this is slightly different from normal B+ trees
      // because we need to actually knowthe end of the region.

      this.values = [null]          // the data is at a "to be filled" state
      this.revDepth = revdepth
      this.next = nextNode
      this.prev = prevNode
      if (typeof summaryCtor === 'function') {
        this.SummaryCtor = summaryCtor
      }
      this.summary = null
    }

  give.ChromBPlusTreeNode.prototype.truncateChrRange = function (chrRange, truncStart, truncEnd, doNotThrow) {
    var rangeStart = chrRange.start
    var rangeEnd = chrRange.end
    if (truncStart && rangeStart < this.getStart()) {
      give._verboseConsole('Start truncated, get ' + rangeStart +
        ', truncated to ' + this.getStart() + '.', give.VERBOSE_DEBUG_MORE)
      rangeStart = this.getStart()
    }
    if (truncEnd && rangeEnd > this.getEnd()) {
      give._verboseConsole('End truncated, get ' + rangeEnd +
        ', truncated to ' + this.getEnd() + '.', give.VERBOSE_DEBUG_MORE)
      rangeEnd = this.getEnd()
    }

    if ((rangeStart >= rangeEnd || this.getStart() >= rangeEnd ||
      this.getEnd() <= rangeStart) && !doNotThrow) {
      throw (new Error(chrRange +
            ' is not a valid chrRegion or not overlapping with the current node. \nRange start: ' +
            rangeStart + ', end: ' + rangeEnd + '\nCurrent node start: ' +
            this.getStart() + ', end: ' + this.getEnd()))
    }
    return { start: rangeStart, end: rangeEnd }
  }

  give.ChromBPlusTreeNode.prototype.getStart = function () {
    return this.keys[0]
  }

  give.ChromBPlusTreeNode.prototype.getEnd = function () {
    return this.keys[this.keys.length - 1]
  }

  give.ChromBPlusTreeNode.prototype.setStart = function (newStart) {
    this.keys[0] = newStart
  }

  give.ChromBPlusTreeNode.prototype.setEnd = function (newEnd) {
    this.keys[this.keys.length - 1] = newEnd
  }

  give.ChromBPlusTreeNode.prototype.getResolution = function (index) {
    if (this.values[index] === false) {
      // there is definitely no data in the node, so resolution is minimum
      return 0
    } else if (this.values[index] === null) {
      return Number.POSITIVE_INFINITY
    } else {
      if (this.revDepth === 0) {
        return this.values[index].resolution || 0
      } else if (typeof this.SummaryCtor === 'function' &&
             this.values[index].getSummaryData() === null) {
        // data is not loaded, resolution is maximum (always overwrite)
        return Number.POSITIVE_INFINITY
      } else {
        return this.keys[index + 1] - this.keys[index]
      }
    }
  }

  give.ChromBPlusTreeNode.prototype.resolutionNotEnough = function (index, resolution) {
    resolution = (typeof resolution === 'number' && !isNaN(resolution)) ? resolution : 0
    return (this.getResolution(index) > resolution)
  }

  give.ChromBPlusTreeNode.prototype.updateSummary = function () {
    if (typeof this.SummaryCtor === 'function') {
      var newSummary = new this.SummaryCtor()
      if (this.values.every(function (entry, index) {
        if (entry === null ||
           (this.revDepth > 0 && entry.getSummaryData() === null)) {
          return false
        }
        if (this.revDepth > 0) {
          newSummary.addSummary(entry.getSummaryData())
        } else if (entry) {
          newSummary.addData(entry, this.keys[index + 1] - this.keys[index])
        }
        return true
      }, this)) {
        this.summary = newSummary
      } else {
        this.summary = null
      }
    }
  }

  give.ChromBPlusTreeNode.prototype.getSummaryData = function () {
    return this.summary
  }

  give.ChromBPlusTreeNode.prototype.insert =
    function (data, chrRange, continuedList, callback, resolution) {
      // The return value of this will be different for root and non-root nodes:
      // for root nodes, this will return a new root if split happens;
      // for inner nodes (or leaf), this will either self (this) or
      //    an ordered array of (one or more) siblings so that the calling function can handle it.

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
      //          at the beginning of the tree, only useful when chrRange.getStart() === this.getStart().
      //          Note that for best efficiency, continuedList should not contain anything that's
      //          already in data.
      // callback:    call back function called for every inserted data elements
      // resolution:    function for resolution purposes,
      //          if current node already exists and does not pass this function (if exists)
      //          then it will be deleted and its region not covered by chrRange will
      //          be marked as null ("not loaded"), otherwise it will be skipped
      //          (theoretically this should never happen)

      if (data && data.length === 1 && !chrRange) {
        chrRange = data[0]
      }

      if (data && !Array.isArray(data)) {
        throw (new Error('Data is not an array! This will cause problems in continuedList.'))
      }

      if (chrRange) {
      // clip chrRegion first (should never happen)
        chrRange = this.truncateChrRange(chrRange, true, true)
      // after that stuff gets different for leaf and other nodes
        if (this.revDepth === 0) {
          this.addRecordAsLeaf(data, chrRange.start, chrRange.end,
                   continuedList, callback, resolution)
        } else {
 // this.revDepth > 0

          this.addRecordAsNonLeaf(data, chrRange.start, chrRange.end,
                    continuedList, callback, resolution)
        } // end if(this.revDepth === 0)

      // Then restructure the tree to meet B+ tree specs
        if (this.values.length > this.branchingFactor) {
        // Node is over-capacity, split into sibling nodes
        // Calculate the number of siblings this node will split into
          var numOfSibs = Math.floor(this.values.length * 2 / this.branchingFactor)
          var siblings = new Array(numOfSibs - 1)

        // chop off children from the end
          for (var iSib = siblings.length - 1; iSib >= 0; iSib--) {
          // get the number of children to be put into this sibling
            var sibNumOfChildren = Math.floor(this.values.length / (iSib + 2))
            var newSibling = new give.ChromBPlusTreeNode(this.revDepth,
                                 this.keys[this.keys.length - 1 - sibNumOfChildren],
                                 this.getEnd(),
                                 this.SummaryCtor,
                                 this.next, this,     // notice that prevNode will be updated later
                                 this.branchingFactor, false)

          // Extract one more key from this.keys
            newSibling.keys = this.keys.slice(-(sibNumOfChildren + 1))

            newSibling.values = this.values.slice(-sibNumOfChildren)
            newSibling.updateSummary()

            this.keys.splice(-sibNumOfChildren, sibNumOfChildren)
            this.values.splice(-sibNumOfChildren, sibNumOfChildren)
            this.next = newSibling

            siblings[iSib] = newSibling
            if (siblings[iSib + 1]) {
            // update the prevNode for later sibling
              siblings[iSib + 1].prev = newSibling
            }
          }
          this.updateSummary()

        // If this is root, then a new root needs to be created
          if (this.isRoot) {
            var newRoot = new give.ChromBPlusTreeNode(this.revDepth + 1,
                                this.getStart(),
                                siblings[siblings.length - 1].getEnd(),
                                this.SummaryCtor, null, null,
                                this.branchingFactor, true)
            this.isRoot = false

          // Put this and siblings under the new root
            newRoot.keys = [this.getStart(), this.getEnd()]
            newRoot.values = [this]

            siblings.forEach(function (siblingNode) {
              newRoot.keys.push(siblingNode.getEnd())
              newRoot.values.push(siblingNode)
            })
            newRoot.updateSummary()

            return newRoot
          } else {
            return siblings
          }
        } else { // !(this.values.length > this.branchingFactor)
        // needs to update summary
          this.updateSummary()
          return this    // nothing happens, insertion is successful
        }
      } else { // chrRange
        throw (new Error(chrRange + ' is not a valid chrRegion.'))
      } // end if(chrRange)
    }

  give.ChromBPlusTreeNode.prototype.addRecordAsLeaf =
    function (data, rangeStart, rangeEnd, continuedList, callback, resolution) {
    // This function only adds record(s), it won't restructure the tree

    // In leaf nodes, the actual record trunks may need to be split before range
    // just to keep the loaded status correct.

    // Find the range of child that rangeStart is in
      var currIndex = 0
      var currDataIndex = 0
      var prevDataIndex = 0

      var filterContinuedList = function (rangeStart, item) {
        return item.getEnd() > rangeStart
      }

      while (rangeStart < rangeEnd) {
        var nextRangeStart

        while (this.keys[currIndex + 1] <= rangeStart) {
          currIndex++
        }

        var needsUpdate = this.resolutionNotEnough(currIndex, resolution)

        // First get data that should belong to continuedList done.
        while (currDataIndex < data.length &&
          data[currDataIndex].getStart() < Math.max(this.keys[currIndex], rangeStart)) {
          // This entry belongs to continuedList from now on.
          if (data[currDataIndex].getEnd() > this.keys[currIndex]) {
            continuedList.push(data[currDataIndex])
            if (needsUpdate && callback) {
              callback(data[currDataIndex])
            }
          }
          currDataIndex++
        }

        if (needsUpdate) {
        // resolution of this.keys[currIndex] is worse than resolution
          this.values[currIndex] = null

          if (this.keys[currIndex] < rangeStart) {
          // The new rangeStart appears between windows.
          // Shorten the previous data record by inserting the key,
          // and use this.values[currIndex] to fill the rest (normally it should be null)
            currIndex++
            this.keys.splice(currIndex, 0, rangeStart)
            this.values.splice(currIndex, 0, this.values[currIndex - 1])
          }

        // Compile all entries that should appear at this point.
          var startList = []
          while (currDataIndex < data.length && data[currDataIndex].getStart() === this.keys[currIndex]) {
            startList.push(data[currDataIndex])
            if (callback) {
              callback(data[currDataIndex])
            }
            currDataIndex++
          }

          // Now data[currDataIndex].getStart() (if exists) will be the key for the next record
          nextRangeStart = (currDataIndex < data.length && data[currDataIndex].getStart() < rangeEnd)
            ? data[currDataIndex].getStart() : rangeEnd

          if (this.keys[currIndex + 1] > nextRangeStart) {
          // The added data is a new data record instead of rewriting an existing one
          // The new rangeStart appears between windows.
          // Shorten the previous data record by inserting the key,
          // and use this.values[currIndex] to fill the rest (normally it should be null)
            this.keys.splice(currIndex + 1, 0, nextRangeStart)
            this.values.splice(currIndex + 1, 0, this.values[currIndex])
          }

          if (startList.length === 0 &&
            ((!this.values[currIndex] ||
              !this.values[currIndex].startList ||
              this.values[currIndex].startList.length <= 0) &&
             (this.values[currIndex - 1] ||
              this.values[currIndex - 1] === false))) {
            // There isn't any stuff in this bin and previous bin is there, then merge.
            this.keys.splice(currIndex, 1)
            this.values.splice(currIndex, 1)
            currIndex--
          } else {
          // Either this is top of the node, or previous stuff is not loaded,
          // or there are actually stuff in the bin.
            if (!this.values[currIndex]) {
              this.values[currIndex] = false
            }
            if (startList.length > 0) {
              this.values[currIndex] = this.values[currIndex] || {}
              this.values[currIndex].startList = startList
              this.values[currIndex].resolution = startList[0].resolution || resolution
            }
            if (continuedList.length > 0) {
              this.values[currIndex] = this.values[currIndex] || {}
              this.values[currIndex].continuedList = continuedList.slice()
              this.values[currIndex].resolution = 0
            }
          }
        } else { // !needsUpdate
        // just skip this entry
          nextRangeStart = this.keys[currIndex + 1]
        }

        currIndex++
        rangeStart = nextRangeStart

      // Then go through continuedList to remove everything that won't continue
        continuedList = continuedList.filter(filterContinuedList.bind(this, rangeStart), this)

      // Go through data from 0 to currDataIndex - 1 to see
      // If anything needs to be put onto continuedList
        for (var i = prevDataIndex; i < currDataIndex; i++) {
          if (data[i].getEnd() > rangeStart) {
          // needs to be put onto continuedList
            continuedList.push(data[i])
          }
          data[i] = null
        }

        prevDataIndex = currDataIndex
      } // end while(rangeStart < rangeEnd)
    // then remove everything up to currDataIndex
      data.splice(0, currDataIndex)
    }

  give.ChromBPlusTreeNode.prototype.addRecordAsNonLeaf =
    function (data, rangeStart, rangeEnd, continuedList, callback, resolution) {
    // This function only adds record(s), it won't restructure the tree

    // This is not a leaf node
    // Break out chrRange by child, then insert the sub-range into every child
      var currIndex = 0
      var insertSibling = function (sibling) {
      // First put the end value
        currIndex++
        this.keys.splice(currIndex, 0, sibling.getStart())
        this.values.splice(currIndex, 0, sibling)
      }

      while (rangeStart < rangeEnd) {
        while (this.keys[currIndex + 1] <= rangeStart) {
          currIndex++
        }

      // Now the start of chrRange is in the range of current child
        var sectionEnd = this.keys[currIndex + 1] > rangeEnd ? rangeEnd : this.keys[currIndex + 1]
        var potentialSiblings = this.values[currIndex].insert(data,
        { start: rangeStart, end: sectionEnd }, continuedList, callback, resolution)
        if (Array.isArray(potentialSiblings)) {
        // Has siblings, put them into this.values
          potentialSiblings.forEach(insertSibling, this)
        }

        rangeStart = sectionEnd
        currIndex++
      } // end while(rangeStart < rangeEnd);
    }

  give.ChromBPlusTreeNode.prototype.remove = function (data, removeExactMatch, callback) {
    // Removing a single data entry.
    // Notice that if data is provided and duplicate keys (same start and end) exist,
    // it will behave as removeExactMatch indicated.
    // If removeExactMatch, data will be compared by .equalTo(data) if exists, === if not.

    // Also, the return value will be dependent on this.isRoot
    // * For root nodes, return this if no decreasing height happen, otherwise the new root node
    // * For non-root nodes, return false if redistribution needs to be handled by its parent
    //            return this if no redistribution is needed (keys may still need to be readjusted)

    var i = 0
    while (i < this.values.length && this.keys[i + 1] <= data.getStart()) {
      i++
    }
    if (this.values[i]) {
      if (this.revDepth === 0) {
        // Leaf node, remove data if it's there
        if (this.keys[i] === data.getStart() && this.values[i].startList) {
          for (var stListIndex = 0; stListIndex < this.values[i].startList.length; stListIndex++) {
            if (this.values[i].startList[stListIndex].getEnd() === data.getEnd() &&
            (!removeExactMatch || (data.equalTo && data.equalTo(this.values[i].startList[stListIndex])) ||
            data === this.values[i].startList[stListIndex])) {
              // Match found
              if (callback) {
                callback(this.values[i].startList[stListIndex])
              }
              this.values[i].startList.splice(stListIndex, 1)
              stListIndex--
            }
          }
          if (this.values[i].startList.length <= 0) {
            // All data removed in the record, needs to merge with the previous record
            if (i > 0 || (this.prev && this.prev.values[this.prev.values.length - 1] !== null)) {
              // there is a previous node at the same revDepth level
              this.keys.splice(i, 1)
              this.values.splice(i, 1)
              if (i === 0 && this.prev) {
                // Needs to update the last key value of this.prev
                // Upper nodes will change their keys by themselves
                this.prev.setEnd(this.getStart())
              }
            } else { // i === 0 and !(this.prev && this.prev.values[this.prev.values.length - 1] !== null),
              // which means this is exactly the first node at this level
              this.values[i] = false
            }
            while (i < this.values.length && i > 0 && this.values[i] === false) { // eslint-disable-line no-unmodified-loop-condition
              // Also merge with the next node if possible (under the same parent and both are false in values)
              // this is possible if the parent get restructured
              this.keys.splice(i, 1)
              this.values.splice(i, 1)
            }
          }
        } else {
          console.log('Data ' + data + ' is not found in the tree at leaves.')
        }
      } else { // this.revDepth !== 0
        // Non leaf node, do remove in the child node that may have data
        var flag = this.values[i].remove(data, removeExactMatch)
        var updateStart = (i === 0)    // May need to update start because the first children is involved
        if (!flag) {
          // Redistribution and/or merging is needed, find its sibling
          // (default is the earlier sibling, if no earlier sibling, then the later one can be used)
          if (i === 0) {
            i++
          }

          var sibFront = this.values[i - 1]
          var sibBack = this.values[i]

          // does not need to merge, just redistribute
          sibFront.keys.splice(-1, 1, sibBack.keys)
          sibFront.values.splice(sibBack.values.length, sibBack.values)

          // First check whether the total amount of children
          // in sibling and this.values[i] is less than this.branchingFactor
          if (sibFront.values.length > this.branchingFactor) {
            var sibFrontNewNum = Math.ceil(sibFront.values.length / 2)
            sibBack.keys = sibFront.keys.splice(sibFrontNewNum)
            sibBack.values = sibFront.values.splice(sibFrontNewNum)
            sibFront.keys.push(sibBack.getStart())
            sibBack.updateSummary()
          } else {
            // needs to merge, remove sibBack
            if (sibBack.next && sibBack.next.prev) {
              sibBack.next.prev = sibFront
            }
            sibFront.next = sibBack.next
            this.values.splice(i, 1)
            this.keys.splice(i, 1)
          }
          sibFront.updateSummary()

          if (updateStart) {
            i--
          }
        } // end if(flag)

        // Update keys (because child.values[0] can be removed).
        this.keys[i] = this.values[i].getStart()
        if (i === 0 && this.prev) {
          this.prev.setEnd(this.getStart())
        }
      } // end if(this.revDepth === 0)

      if (this.isRoot && this.revDepth > 0 && this.values.length < 2) {
        // If this is root and it has only one child,
        // reduce depth of the tree by 1 and return its only child as new root
        this.values[0].isRoot = true
        delete this.keys
        return this.values[0]
      } else if (!this.isRoot && this.values.length < Math.ceil(this.branchingFactor / 2)) {
        // This is not root and has less children than required.
        // Send signal upstream for parent to handle.
        return false
      } else { // This have number of children that match B+ tree requirements
        this.updateSummary()
        return this
      }
    } else {
      console.log('Data ' + data + ' is not found in the tree.')
    }
  }

//      removeRange: function(chrRange) {
//        // if data is not provided, every region whose start is within chrRange (probably not used very much)
//      };
//
  give.ChromBPlusTreeNode.prototype.traverse =
    function (chrRange, callback, filter, resolution, thisVar, breakOnFalse, notFirstCall) {
    // Will apply callbacks to all data overlapping with chrRegion;
    //    callback should take the node (or record) as its sole parameter:
    //    callback(record/node)
    // If filter is applied, callbacks will only apply when filter(data) === true
    // resolutionFunc is the function (taking node as parameter)
    //    to return whether children of this has the correct resolution.
    //    Notice that if resolutionFunc returns true for a certain level,
    //    it will definitely return true for its children

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

      if (chrRange) {
      // clip chrRegion first (should never happen, also the end is not truncated)
        chrRange = this.truncateChrRange(chrRange, true, false)

        var currIndex = 0

        while (this.keys[currIndex + 1] <= chrRange.start) {
          currIndex++
        }

        var callFuncOnDataEntry = function (dataEntry) {
          if ((notFirstCall ||
          (dataEntry.getStart() < chrRange.end && dataEntry.getEnd() > chrRange.start)) &&
           !(typeof filter === 'function' && !filter(dataEntry))) {
            if (!callback.call(this, dataEntry) && breakOnFalse) {
              return false
            }
          }
          return true
        }

        while (this.keys[currIndex] < chrRange.end && currIndex < this.values.length) {
          if (this.revDepth === 0 || !this.resolutionNotEnough(currIndex, resolution)) {
            if (this.revDepth > 0) {
              callFuncOnDataEntry.call(thisVar, this.values[currIndex].getSummaryData())
            } else { // this.revDepth === 0
              if (!notFirstCall) {
              // This is the first call, should call on all continuedList as well
                if (this.values[currIndex] &&
                 Array.isArray(this.values[currIndex].continuedList)) {
                  if (!this.values[currIndex].continuedList.every(callFuncOnDataEntry, thisVar)) {
                    return false
                  }
                }
              }
              if (this.values[currIndex] &&
               Array.isArray(this.values[currIndex].startList)) {
                if (!this.values[currIndex].startList.every(callFuncOnDataEntry, thisVar)) {
                  return false
                }
              }
            }
          } else {
          // not enough resolution, descend into children
            if (!this.values[currIndex].traverse(chrRange, callback, filter,
                            resolution, thisVar, breakOnFalse, notFirstCall)) {
              return false
            }
          }
          notFirstCall = true
          currIndex++
        }

        return true
      } else { // !chrRange
        throw (new Error(chrRange + ' is not a valid chrRegion.'))
      } // end if(chrRange)
    }

  // TODO: allow summary and leveled traverse (leveled traverse done)

  // allow sectional loading (will return an array of chrRegions that does not have data loaded)
  give.ChromBPlusTreeNode.prototype.getUncachedRange = function (chrRange, resolution) {
    // return the range list with range(s) without any data
    //   (either not loaded, or purges for memory usage issue (to be implemented))
    // if no non-data ranges are found, return []

    // resolutionFunc is used to determine if the summary of this is already enough (to be implemented)

    if (chrRange) {
      // clip chrRegion first (should never happen)
      var currRange = this.truncateChrRange(chrRange, true, true)
      var result = []
      var rangeStart = currRange.start
      var rangeEnd = currRange.end
      var currIndex = 0
      while (this.keys[currIndex + 1] <= rangeStart) {
        currIndex++
      }
      while (rangeStart < rangeEnd) {
        if (this.resolutionNotEnough(currIndex, resolution)) {
          // resolution for this is already enough for the task
          // check if summary data are there already, if so, just return []
          // to be implemented
          // return if match, otherwise go through the following steps
          if (this.revDepth > 0) {
            result = result.concat(this.values[currIndex].getUncachedRange({chr: chrRange.chr, start: rangeStart, end: rangeEnd}, resolution))
            // rangeEnd will be truncated in the sub-functional call so it should be OK.
          } else { // this.revDepth === 0
            if (parseInt(Math.max(this.keys[currIndex], rangeStart)) <
               parseInt(Math.min(rangeEnd, this.keys[currIndex + 1]))) {
              result.push(new give.ChromRegion({
                chr: chrRange.chr,
                start: parseInt(Math.max(this.keys[currIndex], rangeStart)),
                end: parseInt(Math.min(rangeEnd, this.keys[currIndex + 1])) }))
            }
          } // end if (this.revDepth > 0)
        } // end if (resolutionFunc && resolutionFunc(this))
        currIndex++
        rangeStart = this.keys[currIndex]
      }
      return result
    } else { // chrRange
      throw (new Error(chrRange + ' is not a valid chrRegion.'))
    }
  }

  // TODO: allow caching (nodes not used for a while will be cleared to preserve memory)

  give.ChromBPlusTreeNode._DEFAULT_B_FACTOR = 50        // this value may need to be tweaked

  return give
})(GIVe || {})
