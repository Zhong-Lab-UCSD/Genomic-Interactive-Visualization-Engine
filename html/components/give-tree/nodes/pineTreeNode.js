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
//  When traversing, everything in 'ContList' of *the starting record only* will be processed first,
//  then everything in 'StartList' in all overlapping records will be processed.
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
  //    isRoot:           Boolean, showing whether this is root;
  //    branchingFactor:  Integer, showing the number of children a node can have;
  //    revDepth:         Integer, showing the reverse depth of node
  //                      (DataNode = 0, leaf = 1 and root = max);
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
    if (nextNode) {
      nextNode.prev = this
    }
    this.prev = prevNode
    if (prevNode) {
      prevNode.next = this
    }
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
    return { chr: chrRange.chr, start: rangeStart, end: rangeEnd }
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

  /**
   * getResolution - get the resolution of this data node
   *
   * @returns {number}  Return the resolution (span of the node),
   *    1 is the smallest (finest)
   */
  give.GiveTreeNode.prototype.getResolution = function () {
    return Math.floor(Math.pow(this.branchingFactor, this.revDepth))
  }

  give.GiveTreeNode.prototype.getChildResolution = function (index) {
    // if index is a number, then it's asking for the resolution of that
    //   specific child, otherwise it's a generalized child resolution
    if (!isNaN(index) && parseInt(index) === index) {
      // Specialized child resolution
      if (this.Values[index] === false) {
        return 1
      } else if (this.values[index] && this.values[index].getResolution) {
        return this.values[index].getResolution()
      }
    }
    // Generalized child resolution
    return Math.floor(Math.pow(this.branchingFactor, this.revDepth - 1))
  }

  /**
   * resNotEnough - get whether the resolution of this data node is not enough
   *    for the given resolution requirement.
   *
   * @param  {number|null} resolution - the resolution required, if `null`, use
   *    `1` (the finest) instead
   * @returns {boolean}  Return `true` if the resolution is not enough,
   *    otherwise `false`.
   */
  give.GiveTreeNode.prototype.resNotEnough = function (resolution) {
    resolution = (typeof resolution === 'number' && !isNaN(resolution))
      ? resolution : 1
    return (this.getResolution() > resolution)
  }

  give.GiveTreeNode.prototype.childResNotEnough = function (resolution, index) {
    resolution = (typeof resolution === 'number' && !isNaN(resolution))
      ? resolution : 1
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
          if (entry === false) {
            // Child is zero, just return true
            return true
          }
          if (entry === null ||
             (this.revDepth > 1 && entry.getSummaryData() === null)) {
            return false
          }
          if (this.revDepth > 1) {
            newSummary.addSummary(entry.getSummaryData())
          } else if (entry && entry.StartList && entry.StartList[0] && entry.StartList[0].data) {
            newSummary.addData(entry.StartList[0].data, this.keys[index + 1] - this.keys[index])
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
    ContList, callback, resolution, lifeSpan) {
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
      throw (new Error('Data is not an array! This will cause problems in ContList.'))
    }

    if (chrRange) {
      // clip chrRegion first (should never happen)
      chrRange = this.truncateChrRange(chrRange, true, true)
      this.rejuvenate(lifeSpan)
      // there are three cases for insertion:
      // 1. leaf nodes: use DataNode to store raw data
      // 2. non-leaf nodes with adequate resolution:
      //    update summary
      // 3. non-leaf nodes with worse resolution:
      //    go deep to generate branch structure
      if (this.revDepth > 1) {
        // case 2 and 3
        this.addNonLeafRecords(data, chrRange.start, chrRange.end,
          ContList, callback, resolution, lifeSpan)
      } else {
        // case 1
        this.addLeafRecords(data, chrRange.start, chrRange.end,
          ContList, callback, resolution, lifeSpan)
      }
      this.updateSummary()
    } else { // chrRange
      throw (new Error(chrRange + ' is not a valid chrRegion.'))
    } // end if(chrRange)
    return this
  }

  give.GiveTreeNode.prototype.addNonLeafRecords = function (data,
    rangeStart, rangeEnd, ContList, callback, resolution, lifeSpan) {
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

      // Then pad all the regions without data,
      // sectionStart will become the first coordinate with actual data
      sectionStart = data[currDataIndex]
        ? give.fitRes(Math.min(rangeEnd, data[currDataIndex].getStart()),
          childRes, Math.floor)
        : (rangeEnd >= this.getEnd() ? this.getEnd()
          : give.fitRes(rangeEnd, childRes, Math.floor))

      while (this.keys[currIndex] < sectionStart) {
        // There are gaps with no data
        // First check if the gap needs another node
        if (sectionStart < this.keys[currIndex + 1]) {
          // new node is needed
          this.keys.splice(currIndex + 1, 0, sectionStart)
          this.values.splice(currIndex, 0, false)
        } else {
          // no new node is needed, just clear this one
          this.values[currIndex] = false
        }

        // Merge child with previous one if both are false
        if (this.values[currIndex - 1] === false) {
          this.keys.splice(currIndex, 1)
          this.values.splice(currIndex, 1)
        } else {
          currIndex++
        }
      }

      sectionEnd = sectionStart + childRes

      if (sectionStart < rangeEnd) {
        if (this.keys[currIndex + 1] > sectionEnd) {
          // this child is actually another placeholder for multiple nodes
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
          this.values[currIndex] = new give.GiveTreeNode(this.revDepth - 1,
            sectionStart, sectionEnd, this.SummaryCtor, nextChild,
            prevChild, this.branchingFactor, false, lifeSpan)
          if (prevChild) {
            prevChild.next = this.values[currIndex]
          }
          if (nextChild) {
            nextChild.prev = this.values[currIndex]
          }
        }

        if (this.childResNotEnough(resolution, currIndex)) {
          // case 3: non-leaf nodes with worse resolution
          this.values[currIndex].insert(data,
            { start: childDataRangeStart, end: childDataRangeEnd },
            ContList, callback, resolution, lifeSpan)
        } else { // if (!this.childResNotEnough(resolution, currIndex))
          // case 2: non-leaf nodes with adequate resolution (for children)
          // note that data[0] should be exactly the same as
          // this.values[currIndex].getStart()
          if (this.values[currIndex].getStart() !== data[currDataIndex].getStart() ||
            this.values[currIndex].getEnd() !== data[currDataIndex].getEnd()) {
            throw (new Error('Summary coordinates do not match! Need ' +
              this.values[currIndex].getStart() + '-' + this.values[currIndex].getEnd() +
              ', get ' + data[currDataIndex].getStart() + '-' +
              data[currDataIndex].getEnd()))
          }
          this.values[currIndex].updateSummary(data[currDataIndex].data)
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
    rangeStart, rangeEnd, ContList, callback, resolution, lifeSpan) {
    // Adding leaf node records
    var currIndex = 0
    var currDataIndex = 0
    var prevDataIndex = 0

    var filterContList = function (rangeStart, item) {
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

      // First get data that should belong to ContList done.
      while (currDataIndex < data.length &&
        data[currDataIndex].getStart() < this.keys[currIndex]) {
        // This entry belongs to ContList from now on.
        if (data[currDataIndex].getEnd() > this.keys[currIndex]) {
          ContList.push(data[currDataIndex])
          if (callback) {
            callback(data[currDataIndex])
          }
        }
        currDataIndex++
      }

      // Compile all entries that should appear at this point.
      var StartList = []
      while (currDataIndex < data.length &&
        data[currDataIndex].getStart() === this.keys[currIndex]) {
        StartList.push(data[currDataIndex])
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

      if (StartList.length === 0 &&
          ((!this.values[currIndex] ||
            this.values[currIndex].StartList.length <= 0) &&
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
        if (StartList.length > 0 || ContList.length > 0) {
          this.values[currIndex] = new DataNode(StartList, ContList, lifeSpan)
        }
      }

      currIndex++
      rangeStart = nextRangeStart

      // Then go through ContList to remove everything that won't continue
      ContList = ContList.filter(filterContList.bind(this, rangeStart), this)

      // Go through data from 0 to currDataIndex - 1 to see
      // If anything needs to be put onto ContList
      for (var i = prevDataIndex; i < currDataIndex; i++) {
        if (data[i].getEnd() > rangeStart) {
          // needs to be put onto ContList
          ContList.push(data[i])
        }
        data[i] = null
      }

      prevDataIndex = currDataIndex
    } // end while(rangeStart < rangeEnd)
    // then remove everything up to currDataIndex
    data.splice(0, currDataIndex)
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
      if (this.revDepth === 1) {
        // Leaf node, remove data if it's there
        if (this.keys[i] === data.getStart() && this.values[i].StartList) {
          for (var stListIndex = 0; stListIndex < this.values[i].StartList.length; stListIndex++) {
            if (this.values[i].StartList[stListIndex].getEnd() === data.getEnd() &&
            (!removeExactMatch || (data.equalTo && data.equalTo(this.values[i].StartList[stListIndex])) ||
            data === this.values[i].StartList[stListIndex])) {
              // Match found
              if (callback) {
                callback(this.values[i].StartList[stListIndex])
              }
              this.values[i].StartList.splice(stListIndex, 1)
              stListIndex--
            }
          }
          if (this.values[i].StartList.length <= 0) {
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
      } else { // this.revDepth !== 1
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
      } // end if(this.revDepth === 1)

      if (this.isRoot && this.revDepth > 1 && this.values.length < 2) {
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
           !(typeof filter === 'function' && !filter.call(this, dataEntry))) {
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
        if (this.revDepth === 1 || !this.childResNotEnough(resolution, currIndex)) {
          if (this.values[currIndex] !== false) {
            if (this.revDepth > 1) {
              // NOTE: Temporary fix: wrap a ChromRegion object around the summary data
              // May need to explore better solutions
              callFuncOnDataEntry.call(thisVar, new give.ChromRegion({
                chr: chrRange.chr,
                start: this.keys[currIndex],
                end: this.keys[currIndex + 1]
              }, null, { data: this.values[currIndex].getSummaryData() }))
            } else { // this.revDepth === 1
              if (!notFirstCall) {
                // This is the first call, should call on all ContList as well
                if (Array.isArray(this.values[currIndex].ContList)) {
                  if (!this.values[currIndex].ContList.every(callFuncOnDataEntry, thisVar)) {
                    return false
                  }
                }
              }
              if (Array.isArray(this.values[currIndex].StartList)) {
                if (!this.values[currIndex].StartList.every(callFuncOnDataEntry, thisVar)) {
                  return false
                }
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
    // If current node itself withers,
    // it will cause this and *all the children of this* wither
    // NOTE: Root node never withers
    if (!give.WitheringNode.prototype.wither.call(this) && !this.isRoot) {
      if (this.prev) {
        this.prev.next = null
      }
      if (this.next) {
        this.next.prev = null
      }
      // return null so that the parent can remove it
      return null
    }

    // Then process all the children to see if any withers
    for (var i = 0; i < this.values.length; i++) {
      if (this.values[i] && !this.values[i].wither()) {
        // replace the node with null (nothing)
        this.values[i] = null
      }
      if (i > 0 && this.values[i] === null && this.values[i - 1] === null) {
        // previous one is also null
        this.keys.splice(i + 1, 1)
        this.values.splice(i + 1, 1)
        // remove the i-th element and its corresponding key
        i--
      }
    }
    return this
  }

  /**
   * getUncachedRange - Return an array of chrRegions that does not have data loaded
   *   to allow buffered loading of data
   *
   * @param  {GIVE.ChromRegion} chrRange - The range of query.
   * @param  {object|null} props - additional properties being passed onto nodes
   * @param  {number|null} props.resolution - Resolution required for the query,
   *   will override `chrRange.resolution` if both exist.
   * @param  {number|null} props.bufferingRatio - Ratio of desired resolution if
   *   the data is not available. This would allow a "resolution buffering" by
   *   requesting data at a slightly finer resolution than currently required.
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
        if (this.values[currIndex] &&
          this.childResNotEnough(resolution, currIndex)
        ) {
          // child has not enough resolution
          newResult = this.values[currIndex].getUncachedRange({
            chr: chrRange.chr,
            start: rangeStart,
            end: rangeEnd
          }, resolution, bufferingRatio)
        } else if (this.values[currIndex] === null ||
          (!this.childHasData(currIndex) &&
            parseInt(Math.max(this.keys[currIndex], rangeStart)) <
            parseInt(Math.min(rangeEnd, this.keys[currIndex + 1]))
          )
        ) {
          // either no child at all or child does not have summary data
          // calculate the closest range needed for the resolution
          // first normalize resolution to branchingFactor
          var retrieveStart, retrieveEnd, res
          res = Math.floor(Math.pow(this.branchingFactor,
            Math.floor(Math.log(resolution / bufferingRatio) / Math.log(this.branchingFactor))))

          retrieveStart = parseInt(Math.max(this.keys[currIndex],
            give.fitRes(rangeStart, res, Math.floor)))
          retrieveEnd = parseInt(Math.min(this.keys[currIndex + 1],
            give.fitRes(rangeEnd, res, Math.ceil)))
          newResult.push(new give.ChromRegion({
            chr: chrRange.chr,
            start: retrieveStart,
            end: retrieveEnd,
            resolution: res
          }))
        }

        if (result[result.length - 1] && newResult[0] &&
          result[result.length - 1].concat(newResult[0])) {
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

  return give
})(GIVe || {})
