// JavaScript Document
//  GIVe tree node
//
//  This is the data object used to store genomic data for fast insertion/deletion/query/enumeration.
//  It's modified from B+ tree with some difference in key implementation.
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
//    DataEntry Object: see below for implementation
//
//  Non-leaf nodes can be null or false to indicate unloaded or no data within
//    the region specified in the keys
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

  // Private-ish part for data structure
  var DataEntry = function (startList, continuedList, lifeSpan) {
    //    { startList: [], continuedList: [], resolution: int }:
    //      An object saving references to actual data (Objects with ChromRegion behavior) that spans the bin,
    //      startList:    data that start at this bin (have the same start coordinate),
    //              startList will become an empty array only if the previous bin is unloaded
    //              (because otherwise this bin can be merged with the previous one),
    //              or this is the first bin;
    //      continuedList:  data that starts at previous bin(s) but overlapping with this bin,
    //              this array will be sorted by the actual starting points,
    //              [] will have the same effect as 'undefined'.
    //
    give.WitheringNode.call(this, lifeSpan)
    this.startList = startList || []
    this.continuedList = continuedList || []
  }

  give.extend(give.WitheringNode, DataEntry)

  DataEntry.prototype.getResolution = function () {
    return 1
  }

  DataEntry.prototype.resNotEnough = function (resolution) {
    return false
  }

  DataEntry.prototype.hasData = function () {
    return true
  }

  // data structure:
  // {
  //    isRoot:           Boolean, showing whether this is root;
  //    branchingFactor:  Integer, showing the number of children a node can have;
  //    revDepth:         Integer, showing the reverse depth of node (leaf = 0 and root = max);
  //    start:            Integer, the starting coordinate;
  //    keys:             [](Integer), the separating keys (coordinates for window);
  //    values:           [](Records), the records (see above for data structure);
  //    next:             The next node with the same revDepth as this one;
  //    prev:             The previous node with the same revDepth.
  // }

  // public API
  give.GiveTreeNode = function (revdepth, start, end, summaryCtor,
    nextNode, prevNode, bFactor, isroot, lifeSpan) {
    // implementing WitheringNode
    give.WitheringNode.call(this, lifeSpan)
    // start and length is for the corresponding region
    if (typeof revdepth !== 'number' || isNaN(revdepth)) {
      revdepth = Math.ceil(Math.log(end - start) / Math.log(bFactor))
    }
    if (start >= end) {
      throw (new Error('Range error. Start: ' + start + ', end: ' + end))
    }
    this.isRoot = !!isroot
    this.branchingFactor = bFactor
    // notice that the node will be branched if resolution is not enough
    this.keys = [start, end]
    // Notice that this is slightly different from normal B+ trees
    // because we need to actually know the end of the region.
    this.values = [null]
    this.revDepth = revdepth
    this.next = nextNode
    this.prev = prevNode
    if (typeof summaryCtor === 'function') {
      this.SummaryCtor = summaryCtor
    }
    this.summary = null
  }

  give.extend(give.WitheringNode, give.GiveTreeNode)

  give.GiveTreeNode.prototype.truncateChrRange = function (chrRange, truncStart, truncEnd, doNotThrow) {
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

  give.GiveTreeNode.prototype.getStart = function () {
    return this.keys[0]
  }

  give.GiveTreeNode.prototype.getEnd = function () {
    return this.keys[this.keys.length - 1]
  }

  give.GiveTreeNode.prototype.setStart = function (newStart) {
    this.keys[0] = newStart
  }

  give.GiveTreeNode.prototype.setEnd = function (newEnd) {
    this.keys[this.keys.length - 1] = newEnd
  }

  give.GiveTreeNode.prototype.getFirstChild = function () {
    return this.values[0]
  }

  give.GiveTreeNode.prototype.getLastChild = function () {
    return this.values[this.values.length - 1]
  }

  give.GiveTreeNode.prototype.hasData = function () {
    return (typeof this.getSummaryData === 'function' &&
      this.getSummaryData() !== null)
  }

  give.GiveTreeNode.prototype.childHasData = function (index) {
    return this.values[index] === false ||
      (this.values[index] !== null && this.values[index].hasData())
  }

  give.GiveTreeNode.prototype.getResolution = function () {
    return Math.floor(Math.pow(this.branchingFactor, this.revDepth))
  }

  give.GiveTreeNode.prototype.getChildResolution = function (index) {
    // if index is a number, then it's asking for the resolution of that
    //   specific child, otherwise it's a generalized child resolution
    if (isNaN(index) || parseInt(index) !== index ||
      this.values[index] !== false) {
      return Math.floor(Math.pow(this.branchingFactor, this.revDepth - 1))
    } else if (this.values[index] && this.values[index].getResolution) {
      return this.values[index].getResolution()
    }
    // there is definitely no data in the node, so resolution is minimum
    return 1
  }

  give.GiveTreeNode.prototype.resNotEnough = function (resolution) {
    resolution = (typeof resolution === 'number' && !isNaN(resolution)) ? resolution : 1
    return (this.getResolution() > resolution)
  }

  give.GiveTreeNode.prototype.childResNotEnough = function (resolution, index) {
    resolution = (typeof resolution === 'number' && !isNaN(resolution)) ? resolution : 1
    return this.getChildResolution(index) > resolution
  }

  give.GiveTreeNode.prototype.updateSummary = function (summary) {
    if (typeof this.SummaryCtor === 'function') {
      if (summary instanceof this.SummaryCtor) {
        // summary provided, just replace
        this.summary = summary
      } else {
        if (summary) {
          // summary is something with wrong type
          give._verboseConsole(summary + ' is not a correct summary type. ' +
            'Will be regenerated from tree data.', give.VERBOSE_DEBUG)
        }
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
          this.summary = this.summary || null
        }
      }
    }
  }

  give.GiveTreeNode.prototype.getSummaryData = function () {
    return this.summary
  }

  give.GiveTreeNode.prototype.insert = function (data, chrRange,
    continuedList, callback, resolution, lifeSpan) {
    // The return value of this will be different for root and non-root nodes:
    // for root nodes, this will return a new root if split happens;
    // for inner nodes (or leaf), this will either self (this) or
    //    an ordered array of (one or more) siblings so that the calling function can handle it.

    // This insert function is not supposed to handle the case where data exceeds boundary of chrRegion.
    // Root will always encompass the whole chromosome (from species definition)
    // before calling children, the chrRegion will be split into the bins of children.

    this.life = this.life || lifeSpan

    if (data && data.length === 1 && !chrRange) {
      chrRange = data[0]
    }

    if (data && !Array.isArray(data)) {
      throw (new Error('Data is not an array! This will cause problems in continuedList.'))
    }

    if (chrRange) {
      // clip chrRegion first (should never happen)
      chrRange = this.truncateChrRange(chrRange, true, true)
      this.rejuvenate(lifeSpan)
      // there are three cases for insertion:
      // 1. leaf nodes: use DataEntry to store raw data
      // 2. non-leaf nodes with adequate resolution:
      //    update summary
      // 3. non-leaf nodes with worse resolution:
      //    go deep to generate branch structure
      if (this.revDepth > 1) {
        // case 2 and 3
        this.addNonLeafRecords(data, chrRange.start, chrRange.end,
          continuedList, callback, resolution, lifeSpan)
      } else {
        // case 1
        this.addLeafRecords(data, chrRange.start, chrRange.end,
          continuedList, callback, resolution, lifeSpan)
      }
      this.updateSummary()
    } else { // chrRange
      throw (new Error(chrRange + ' is not a valid chrRegion.'))
    } // end if(chrRange)
    return this
  }

  give.GiveTreeNode.prototype.addNonLeafRecords = function (data,
    rangeStart, rangeEnd, continuedList, callback, resolution, lifeSpan) {
    // This function adds record(s), and structures of the tree

    // In leaf nodes, the actual record trunks may need to be split before range
    // just to keep the loaded status correct.

    // Find the range of child that rangeStart is in
    var currIndex = 0
    var currDataIndex = 0
    var childRes = parseInt(Math.pow(this.branchingFactor, this.revDepth - 1))
    var sectionStart, sectionEnd

    while (rangeStart < rangeEnd) {
      while (this.keys[currIndex + 1] <= rangeStart) {
        currIndex++
      }

      // Now the start of chrRange is in the range of current child
      // create the first child according to its supposed coverage

      sectionStart = give.fitRes(rangeStart, childRes, Math.floor)
      // for all cases, create a child of false for no-data regions
      if (this.keys[currIndex] < sectionStart) {
        // this child is actually a placeholder for multiple nodes
        // and there should be spaces before the new current node
        currIndex++
        this.keys.splice(currIndex, 0, sectionStart)
        this.values.splice(currIndex, 0, this.values[currIndex - 1])
      }

      var childDataNonEmptyStart = give.fitRes(data[currDataIndex]
          ? Math.min(rangeEnd, data[currDataIndex].getStart())
          : rangeEnd, childRes, Math.floor)

      if (this.keys[currIndex] < childDataNonEmptyStart) {
        // insert the false nodes
        currIndex++
        this.keys.splice(currIndex, 0, childDataNonEmptyStart)
        this.values.splice(currIndex, 0, false)
        sectionStart = childDataNonEmptyStart
      }

      sectionEnd = sectionStart + childRes

      if (sectionStart < rangeEnd) {
        if (this.keys[currIndex + 1] > sectionEnd) {
          // this child is actually a placeholder for multiple nodes
          // and there should be spaces after the new current node
          this.keys.splice(currIndex + 1, 0, sectionEnd)
          this.values.splice(currIndex + 1, 0, this.values[currIndex])
        } else {
          // section may actually run past this.keys[currIndex + 1]
          // (for example, last node), then section length needs to be adjusted
          sectionEnd = this.keys[currIndex + 1]
        }
        var childDataRangeStart = Math.max(sectionStart, rangeStart)
        var childDataRangeEnd = Math.min(sectionEnd, rangeEnd)

        if (!this.values[currIndex]) {
          // try to establish previous nodes
          var prevChild = ((currIndex > 0) ? this.values[currIndex - 1]
            : (this.prev ? this.prev.getLastChild() : null)) || null
          var nextChild = ((currIndex < this.values.length - 1)
            ? this.values[currIndex + 1]
            : (this.next ? this.next.getFirstChild() : null)) || null
          this.values[currIndex] = new give.GiveTreeNode(this.revdepth - 1,
            sectionStart, sectionEnd, this.SummaryCtor, nextChild,
            prevChild, this.branchingFactor, false, lifeSpan)
        }

        if (this.resNotEnough()) {
          // case 3: non-leaf nodes with worse resolution
          this.values[currIndex].insert(data,
            { start: childDataRangeStart, end: childDataRangeEnd },
            continuedList, callback, resolution, lifeSpan)
        } else { // if (!this.resNotEnough())
          // case 2: non-leaf nodes with adequate resolution
          // note that data[0] should be exactly the same as this.getStart()
          if (this.getStart() !== data[currDataIndex].getStart() ||
            this.getEnd() !== data[currDataIndex].getEnd()) {
            throw (new Error('Summary coordinates do not match! Need ' +
              this.getStart() + '-' + this.getEnd() +
              ', get ' + data[currDataIndex].getStart() + '-' +
              data[currDataIndex].getEnd()))
          }
          this.updateSummary(data[currDataIndex].data)
          if (callback) {
            callback(data[currDataIndex])
          }
          currDataIndex++
        }
      } // end if (sectionStart < rangeEnd)
      rangeStart = sectionEnd

      currIndex++
    } // end while(rangeStart < rangeEnd);

    data.splice(0, currDataIndex)
  }

  give.GiveTreeNode.prototype.addLeafRecords = function (data,
    rangeStart, rangeEnd, continuedList, callback, resolution, lifeSpan) {
    // Adding leaf node records
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

      if (this.keys[currIndex] < rangeStart) {
        // The new rangeStart appears between windows.
        // Shorten the previous data record by inserting the key,
        // and use this.values[currIndex] to fill the rest (normally it should be null)
        currIndex++
        this.keys.splice(currIndex, 0, rangeStart)
        this.values.splice(currIndex, 0, this.values[currIndex - 1])
      }

      // First get data that should belong to continuedList done.
      while (currDataIndex < data.length &&
        data[currDataIndex].getStart() < this.keys[currIndex]) {
        // This entry belongs to continuedList from now on.
        if (data[currDataIndex].getEnd() > this.keys[currIndex]) {
          continuedList.push(data[currDataIndex])
          if (callback) {
            callback(data[currDataIndex])
          }
        }
        currDataIndex++
      }

      // Compile all entries that should appear at this point.
      var startList = []
      while (currDataIndex < data.length &&
        data[currDataIndex].getStart() === this.keys[currIndex]) {
        startList.push(data[currDataIndex])
        if (callback) {
          callback(data[currDataIndex])
        }
        currDataIndex++
      }

      // Now data[currDataIndex].getStart() (if exists) will be the key for the next record
      nextRangeStart = (currDataIndex < data.length &&
        data[currDataIndex].getStart() < rangeEnd)
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
        if (startList.length > 0 || continuedList.length > 0) {
          this.values[currIndex] = new DataEntry(startList, continuedList, lifeSpan)
        }
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

  give.GiveTreeNode.prototype.addRecordAsNonLeaf = function (data,
    rangeStart, rangeEnd, continuedList, callback, resolution) {
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

  give.GiveTreeNode.prototype.remove = function (data, removeExactMatch, callback) {
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
  give.GiveTreeNode.prototype.traverse = function (chrRange,
    callback, filter, resolution, thisVar, breakOnFalse, notFirstCall,
    rejuvenation) {
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

      // rejuvenate this branch
      if (this.keys[currIndex] < chrRange.end && currIndex < this.values.length) {
        this.rejuvenate(rejuvenation)
      }

      while (this.keys[currIndex] < chrRange.end && currIndex < this.values.length) {
        if (this.revDepth === 0 || !this.resNotEnough(currIndex, resolution)) {
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

  give.GiveTreeNode.prototype.wither = function () {
    // this will cause this and *all the children of this* wither
    if (!give.WitheringNode.prototype.wither.call(this)) {
      return null
    }
    for (var i = 0; i < this.values.length; i++) {
      if (this.values[i] && !this.values[i].wither()) {
        // remove the i-th element and its corresponding key
        this.keys.splice(i, 1)
        this.values.splice(i, 1)
        i--
      }
    }
    return this
  }

  //
  /**
   * getUncachedRange - Return an array of chrRegions that does not have data loaded
   *   to allow buffered loading of data
   *
   * @param  {GIVE.ChromRegion} chrRange - The range of query.
   * @param  {number} resolution - Resolution required for the query,
   *   will override `chrRange.resolution` if both exist.
   * @param  {number} bufferingRatio - Ratio of desired resolution if the data
   *   is not available. This would allow a "resolution buffering" by requesting
   *   data at a slightly finer resolution than currently required.
   * @returns {Array<GIVE.ChromRegion>} An ordered array of the regions that
   *   does not have the data at the current resolution requirement.
   */
  give.GiveTreeNode.prototype.getUncachedRange = function (chrRange, resolution, bufferingRatio) {
    // return the range list with range(s) without any data
    //   (either not loaded, or purges for memory usage issue (to be implemented))
    // if no non-data ranges are found, return []

    // resolutionFunc is used to determine if the summary of this is already enough (to be implemented)

    resolution = resolution || chrRange.resolution
    bufferingRatio = bufferingRatio || 1
    if (bufferingRatio < 1) {
      give._verboseConsole(
        'Invalid bufferingRatio: ' + bufferingRatio +
        '. Should be greater than 1. Changed to 1 instead.',
        give.VERBOSE_WARNING)
      bufferingRatio = 1
    }

    if (chrRange) {
      // clip chrRegion first
      var currRange = this.truncateChrRange(chrRange, true, true)
      var result = []
      var rangeStart = currRange.start
      var rangeEnd = currRange.end
      var currIndex = 0
      while (this.keys[currIndex + 1] <= rangeStart) {
        currIndex++
      }
      while (rangeStart < rangeEnd) {
        var newResult = []
        if (this.values[currIndex] === null) {
          // current child is a placeholder
          // calculate the closest range needed for the resolution
          // first normalize resolution to branchingFactor
          var retrieveStart, retrieveEnd, res
          res = Math.floor(Math.pow(this.branchingFactor,
            Math.floor(Math.log(resolution) / Math.log(this.branchingFactor))))

          retrieveStart = parseInt(Math.max(this.getStart(),
            give.fitRes(rangeStart, res, Math.floor)))
          retrieveEnd = parseInt(Math.min(this.getEnd(),
            give.fitRes(rangeEnd, res, Math.ceil)))

          newResult.push(new give.ChromRegion({
            chr: chrRange.chr,
            start: retrieveStart,
            end: retrieveEnd,
            resolution: resolution / bufferingRatio
          }))
        } else if (this.values[currIndex]) {
          if (this.childResNotEnough(currIndex, resolution)) {
            // child has not enough resolution
            newResult = this.values[currIndex].getUncachedRange({
              chr: chrRange.chr,
              start: rangeStart,
              end: rangeEnd
            }, resolution, bufferingRatio)
          } else if (!this.childHasData(currIndex)) {
            // child does not have summary data, but resolution is OK
            if (parseInt(Math.max(this.keys[currIndex], rangeStart)) <
              parseInt(Math.min(rangeEnd, this.keys[currIndex + 1]))) {
              newResult.push(new give.ChromRegion({
                chr: chrRange.chr,
                start: parseInt(Math.max(this.keys[currIndex], rangeStart)),
                end: parseInt(Math.min(rangeEnd, this.keys[currIndex + 1])),
                resolution: resolution / bufferingRatio
              }))
            }
          }
        } // end if (this.values[currIndex] === null)

        if (result[result.length - 1] && newResult[0] &&
          result[result.length - 1].concat(newResult)) {
          // newResult[0] has been assimilated
          newResult.splice(0, 1)
        }
        result = result.concat(newResult)
        currIndex++
        rangeStart = this.keys[currIndex]
      }
      return result
    } else { // chrRange
      throw (new Error(chrRange + ' is not a valid chrRegion.'))
    }
  }

  // TODO: allow caching (nodes not used for a while will be cleared to preserve memory)

  return give
})(GIVe || {})
