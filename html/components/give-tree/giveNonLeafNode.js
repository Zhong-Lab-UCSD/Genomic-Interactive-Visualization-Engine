/**
 * @license
 * Copyright 2017 GIVe Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//  When traversing, everything in 'ContList' of *the starting record only* will be processed first, then everything in 'StartList' in all overlapping records will be processed. Because of the nature of this range-indiced data, the arrangements of Keys will be slightly different from normal B+ trees:
//
//  Internal Nodes will have the same number of branches as leaf nodes (because we actually need the start and end Values for the internal node); Keys.length will be 1 more than Values.length; Keys[i] will be the start coordinate of Values[i] and end coordinate of Values[i - 1]; Keys[Keys.length - 1] will be the end coordinate of Values[Values.length - 1]. Therefore, neighboring nodes will have exactly one overlapping key.
//
//  branchingFactor will dictate the maximum number of Values within a node.
//

var GIVe = (function (give) {
  'use strict'

  /**
   * Non-leaf nodes for GIVE Trees
   * This is an interface for all nodes that belongs to GIVE Trees, including
   * insertion, deletion, traversing, and other functionalities.
   *
   * When traversing, everything in `ContList` of __the starting record entry
   * (see `GIVE.DataNode`) only__ will be processed first, then everything in
   * `StartList` in all overlapping records will be processed. Because of the
   * nature of this range-indiced data, the arrangements of keys will be
   * slightly different from normal B+ trees:
   *
   *
   * Therefore, neighboring nodes will have exactly one overlapping key.
   * @typedef {object} GiveNonLeafNode
   * @property {boolean} IsRoot - Whether this node is a root node (needed to
   *    handle changes in tree structure)
   * @property {Array<number>} Keys - A list of keys of children
   * @property {Array<GiveTreeNode|null|boolean>} Values - A list of data
   *    entries, can be `null` or `false` to represent data not loaded and empty
   *    nodes respectively.
   *    `Keys.length` will be `1` more than `Values.length`;
   *    `Keys[i]` will be the start coordinate of `Values[i]` and end
   *      coordinate of `Values[i - 1]`;
   *    `Keys[Keys.length - 1]` will be the end coordinate of
   *      `Values[Values.length - 1]`.
   * @property {number} RevDepth - "Reversed depth" of the node. Leaf is at `0`
   *    (should be `GIVE.DataNode` or similar implementations) and root is at
   *    maximum.
   * @property {GiveNonLeafNode|null|boolean} Next - The next node (sibling).
   *    Can be `null` or `false`.
   * @property {GiveNonLeafNode|null|boolean} Prev - The previous node
   *    (sibling).
   *
   * @class give.GiveNonLeafNode
   *
   * @constructor
   * @extends give.GiveTreeNode
   * @param {object} props - properties that will be passed to the individual
   *    implementations. For `GIVE.GiveNonLeafNode`, these properties will be
   *    used:
   * @param {boolean} props.IsRoot - for `this.IsRoot`
   * @param {number} props.Start - The start coordinate this node will cover.
   *    Equals to `this.Keys[0]`.
   * @param {number} props.End - The end coordinate this node will cover.
   *    Equals to `this.Keys[this.Keys.length - 1]`.
   *    Exceptions will be thrown if `props.Start` or `props.End` is not an
   *    positive integer number or `props.Start >= props.End` (zero-length
   *    regions not allowed).
   * @param {number|null} RevDepth - for `this.RevDepth`
   * @param {GiveNonLeafNode|null|boolean} NextNode - for `this.Next`
   * @param {GiveNonLeafNode|null|boolean} PrevNode - for `this.Prev`
   *
   */
  give.GiveNonLeafNode = function (props) {
    // start and length is for the corresponding region
    if (!Number.isInteger(props.Start) || !Number.isInteger(props.End)) {
      throw (new Error('Start or End is not an integer number in non-leaf ' +
             'node construction!'))
    }
    if (props.Start < 0 || props.End < 0 || props.Start >= props.End) {
      throw (new Error('Range error. Start: ' + start + ', end: ' + end))
    }
    this.IsRoot = !!isroot
    this.Keys = [props.Start, props.End]
    this.Values = [null]
    this.RevDepth = props.RevDepth
    this.Next = props.NextNode
    if (props.NextNode) {
      props.NextNode.Prev = this
    }
    this.Prev = props.PrevNode
    if (props.PrevNode) {
      props.PrevNode.Next = this
    }
  }

  give.extend(give.GiveTreeNode, give.GiveNonLeafNode)

  /**
   * truncateChrRange - trancate chromosomal range to the region covered by
   *  `this`.
   *
   * @param  {ChromRegionLiteral} chrRange - The chromosomal range to be
   *    truncated
   * @param  {boolean} truncStart - Whether to truncate the start coordinate
   * @param  {boolean} truncEnd   - Whether to truncate the end coordinate
   * @param  {boolean} doNotThrow - Whether to throw an exception if truncated
   *    region has a length not greater than 0 (because `chrRange` does not
   *    overlap with this node at all).
   * @returns {ChromRegionLiteral}  Returns a new chromosomal range with
   *    trancated coordinates.
   */
  give.GiveNonLeafNode.prototype.truncateChrRange = function (
    chrRange, truncStart, truncEnd, doNotThrow
  ) {
    var newRegion = chrRange.clone()
    if (truncStart && newRegion.getStart() < this.getStart()) {
      give._verboseConsole('Start truncated, get ' + newRegion.getStart() +
        ', truncated to ' + this.getStart() + '.', give.VERBOSE_DEBUG_MORE)
      newRegion.start = this.getStart()
    }
    if (truncEnd && newRegion.getEnd() > this.getEnd()) {
      give._verboseConsole('End truncated, get ' + newRegion.getEnd() +
        ', truncated to ' + this.getEnd() + '.', give.VERBOSE_DEBUG_MORE)
      newRegion.end = this.getEnd()
    }

    if ((newRegion.getStart() >= newRegion.getEnd() ||
      this.getStart() >= newRegion.getEnd() ||
      this.getEnd() <= newRegion.getStart()) && !doNotThrow) {
      throw (new Error(chrRange + ' is not a valid chrRegion or ' +
            'not overlapping with the current node. \nRange start: ' +
            newRegion.getStart() + ', end: ' + newRegion.getEnd() +
            '\nCurrent node start: ' + this.getStart() +
            ', end: ' + this.getEnd()))
    }
    return newRegion
  }

  /**
   * getStart - get the start coordinate of the region covered by this node
   *
   * @returns {number}  The start coordinate.
   */
  give.GiveNonLeafNode.prototype.getStart = function () {
    return this.Keys[0]
  }

  /**
   * getEnd - get the end coordinate of the region covered by this node
   *
   * @returns {number}  The end coordinate.
   */
  give.GiveNonLeafNode.prototype.getEnd = function () {
    return this.Keys[this.Keys.length - 1]
  }

  /**
   * setStart - set the start coordinate of the region covered by this node
   *
   * @param {number} newStart - The new start coordinate.
   */
  give.GiveNonLeafNode.prototype.setStart = function (newStart) {
    this.Keys[0] = newStart
  }

  /**
   * setEnd - set the end coordinate of the region covered by this node
   *
   * @param {number} newEnd - The new end coordinate.
   */
  give.GiveNonLeafNode.prototype.setEnd = function (newEnd) {
    this.Keys[this.Keys.length - 1] = newEnd
  }

  /**
   * getFirstChild - description  
   *
   * @returns {type}  description
   */
  give.GiveNonLeafNode.prototype.getFirstChild = function () {
    return this.Values[0]
  }

  give.GiveNonLeafNode.prototype.getLastChild = function () {
    return this.Values[this.Values.length - 1]
  }

  give.GiveNonLeafNode.prototype.hasData = function () {
    return (typeof this.getSummaryData === 'function' &&
      this.getSummaryData() !== null)
  }

  give.GiveNonLeafNode.prototype.childHasData = function (index) {
    return this.Values[index] === false ||
      (this.Values[index] !== null && this.Values[index].hasData())
  }

  give.GiveNonLeafNode.prototype.getResolution = function () {
    return Math.floor(Math.pow(this.branchingFactor, this.RevDepth))
  }

  give.GiveNonLeafNode.prototype.getChildResolution = function (index) {
    // if index is a number, then it's asking for the resolution of that
    //   specific child, otherwise it's a generalized child resolution
    if (isNaN(index) || parseInt(index) !== index ||
      this.Values[index] !== false) {
      return Math.floor(Math.pow(this.branchingFactor, this.RevDepth - 1))
    } else if (this.Values[index] && this.Values[index].getResolution) {
      return this.Values[index].getResolution()
    }
    // there is definitely no data in the node, so resolution is minimum
    return 1
  }

  give.GiveNonLeafNode.prototype.resNotEnough = function (resolution) {
    resolution = (typeof resolution === 'number' && !isNaN(resolution)) ? resolution : 1
    return (this.getResolution() > resolution)
  }

  give.GiveNonLeafNode.prototype.childResNotEnough = function (resolution, index) {
    resolution = (typeof resolution === 'number' && !isNaN(resolution)) ? resolution : 1
    return this.getChildResolution(index) > resolution
  }

  give.GiveNonLeafNode.prototype.updateSummary = function (summary) {
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
        if (this.Values.every(function (entry, index) {
          if (entry === false) {
            // Child is zero, just return true
            return true
          }
          if (entry === null ||
             (this.RevDepth > 1 && entry.getSummaryData() === null)) {
            return false
          }
          if (this.RevDepth > 1) {
            newSummary.addSummary(entry.getSummaryData())
          } else if (entry && entry.StartList && entry.StartList[0] && entry.StartList[0].data) {
            newSummary.addData(entry.StartList[0].data, this.Keys[index + 1] - this.Keys[index])
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

  give.GiveNonLeafNode.prototype.getSummaryData = function () {
    return this.summary
  }

  give.GiveNonLeafNode.prototype.insert = function (data, chrRange,
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
      if (this.RevDepth > 1) {
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

  give.GiveNonLeafNode.prototype.addNonLeafRecords = function (data,
    rangeStart, rangeEnd, ContList, callback, resolution, lifeSpan) {
    // This function adds record(s), and structures of the tree

    // In leaf nodes, the actual record trunks may need to be split before range
    // just to keep the loaded status correct.

    // Find the range of child that rangeStart is in
    var currIndex = 0
    var currDataIndex = 0
    var childRes = parseInt(Math.pow(this.branchingFactor, this.RevDepth - 1))
    var sectionStart, sectionEnd

    while (rangeStart < rangeEnd) {
      while (this.Keys[currIndex + 1] <= rangeStart) {
        currIndex++
      }

      // Now the start of chrRange is in the range of current child
      // create the first child according to its supposed coverage

      sectionStart = give.fitRes(rangeStart, childRes, Math.floor)
      // for all cases, create a child of false for no-data regions
      if (this.Keys[currIndex] < sectionStart) {
        // this child is actually a placeholder for multiple nodes
        // and there should be spaces before the new current node
        currIndex++
        this.Keys.splice(currIndex, 0, sectionStart)
        this.Values.splice(currIndex, 0, this.Values[currIndex - 1])
      }

      // Then pad all the regions without data,
      // sectionStart will become the first coordinate with actual data
      sectionStart = data[currDataIndex]
        ? give.fitRes(Math.min(rangeEnd, data[currDataIndex].getStart()),
          childRes, Math.floor)
        : (rangeEnd >= this.getEnd() ? this.getEnd()
          : give.fitRes(rangeEnd, childRes, Math.floor))

      while (this.Keys[currIndex] < sectionStart) {
        // There are gaps with no data
        // First check if the gap needs another node
        if (sectionStart < this.Keys[currIndex + 1]) {
          // new node is needed
          this.Keys.splice(currIndex + 1, 0, sectionStart)
          this.Values.splice(currIndex, 0, false)
        } else {
          // no new node is needed, just clear this one
          this.Values[currIndex] = false
        }

        // Merge child with Previous one if both are false
        if (this.Values[currIndex - 1] === false) {
          this.Keys.splice(currIndex, 1)
          this.Values.splice(currIndex, 1)
        } else {
          currIndex++
        }
      }

      sectionEnd = sectionStart + childRes

      if (sectionStart < rangeEnd) {
        if (this.Keys[currIndex + 1] > sectionEnd) {
          // this child is actually another placeholder for multiple nodes
          // and there should be spaces after the new current node
          this.Keys.splice(currIndex + 1, 0, sectionEnd)
          this.Values.splice(currIndex + 1, 0, this.Values[currIndex])
        } else {
          // section may actually run past this.Keys[currIndex + 1]
          // (for example, last node), then section length needs to be adjusted
          sectionEnd = this.Keys[currIndex + 1]
        }
        var childDataRangeStart = Math.max(sectionStart, rangeStart)
        var childDataRangeEnd = Math.min(sectionEnd, rangeEnd)

        if (!this.Values[currIndex]) {
          // try to establish Previous nodes
          var PrevChild = ((currIndex > 0) ? this.Values[currIndex - 1]
            : (this.Prev ? this.Prev.getLastChild() : null)) || null
          var NextChild = ((currIndex < this.Values.length - 1)
            ? this.Values[currIndex + 1]
            : (this.Next ? this.Next.getFirstChild() : null)) || null
          this.Values[currIndex] = new give.GiveNonLeafNode(this.RevDepth - 1,
            sectionStart, sectionEnd, this.SummaryCtor, NextChild,
            PrevChild, this.branchingFactor, false, lifeSpan)
          if (PrevChild) {
            PrevChild.Next = this.Values[currIndex]
          }
          if (NextChild) {
            NextChild.Prev = this.Values[currIndex]
          }
        }

        if (this.childResNotEnough(resolution, currIndex)) {
          // case 3: non-leaf nodes with worse resolution
          this.Values[currIndex].insert(data,
            { start: childDataRangeStart, end: childDataRangeEnd },
            ContList, callback, resolution, lifeSpan)
        } else { // if (!this.childResNotEnough(resolution, currIndex))
          // case 2: non-leaf nodes with adequate resolution (for children)
          // note that data[0] should be exactly the same as
          // this.Values[currIndex].getStart()
          if (this.Values[currIndex].getStart() !== data[currDataIndex].getStart() ||
            this.Values[currIndex].getEnd() !== data[currDataIndex].getEnd()) {
            throw (new Error('Summary coordinates do not match! Need ' +
              this.Values[currIndex].getStart() + '-' + this.Values[currIndex].getEnd() +
              ', get ' + data[currDataIndex].getStart() + '-' +
              data[currDataIndex].getEnd()))
          }
          this.Values[currIndex].updateSummary(data[currDataIndex].data)
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

  give.GiveNonLeafNode.prototype.addLeafRecords = function (data,
    rangeStart, rangeEnd, ContList, callback, resolution, lifeSpan) {
    // Adding leaf node records
    var currIndex = 0
    var currDataIndex = 0
    var PrevDataIndex = 0

    var filterContList = function (rangeStart, item) {
      return item.getEnd() > rangeStart
    }

    while (rangeStart < rangeEnd) {
      var NextRangeStart

      while (this.Keys[currIndex + 1] <= rangeStart) {
        currIndex++
      }

      if (this.Keys[currIndex] < rangeStart) {
        // The new rangeStart appears between windows.
        // Shorten the Previous data record by inserting the key,
        // and use this.Values[currIndex] to fill the rest (normally it should be null)
        currIndex++
        this.Keys.splice(currIndex, 0, rangeStart)
        this.Values.splice(currIndex, 0, this.Values[currIndex - 1])
      }

      // First get data that should belong to ContList done.
      while (currDataIndex < data.length &&
        data[currDataIndex].getStart() < this.Keys[currIndex]) {
        // This entry belongs to ContList from now on.
        if (data[currDataIndex].getEnd() > this.Keys[currIndex]) {
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
        data[currDataIndex].getStart() === this.Keys[currIndex]) {
        StartList.push(data[currDataIndex])
        if (callback) {
          callback(data[currDataIndex])
        }
        currDataIndex++
      }

      // Now data[currDataIndex].getStart() (if exists) will be the key for the Next record
      NextRangeStart = (currDataIndex < data.length &&
        data[currDataIndex].getStart() < rangeEnd)
        ? data[currDataIndex].getStart() : rangeEnd

      if (this.Keys[currIndex + 1] > NextRangeStart) {
        // The added data is a new data record instead of rewriting an existing one
        // The new rangeStart appears between windows.
        // Shorten the Previous data record by inserting the key,
        // and use this.Values[currIndex] to fill the rest (normally it should be null)
        this.Keys.splice(currIndex + 1, 0, NextRangeStart)
        this.Values.splice(currIndex + 1, 0, this.Values[currIndex])
      }

      if (StartList.length === 0 &&
          ((!this.Values[currIndex] ||
            this.Values[currIndex].StartList.length <= 0) &&
           (this.Values[currIndex - 1] ||
            this.Values[currIndex - 1] === false))) {
          // There isn't any stuff in this bin and Previous bin is there, then merge.
        this.Keys.splice(currIndex, 1)
        this.Values.splice(currIndex, 1)
        currIndex--
      } else {
        // Either this is top of the node, or Previous stuff is not loaded,
        // or there are actually stuff in the bin.
        if (!this.Values[currIndex]) {
          this.Values[currIndex] = false
        }
        if (StartList.length > 0 || ContList.length > 0) {
          this.Values[currIndex] = new DataNode(StartList, ContList, lifeSpan)
        }
      }

      currIndex++
      rangeStart = NextRangeStart

      // Then go through ContList to remove everything that won't continue
      ContList = ContList.filter(filterContList.bind(this, rangeStart), this)

      // Go through data from 0 to currDataIndex - 1 to see
      // If anything needs to be put onto ContList
      for (var i = PrevDataIndex; i < currDataIndex; i++) {
        if (data[i].getEnd() > rangeStart) {
          // needs to be put onto ContList
          ContList.push(data[i])
        }
        data[i] = null
      }

      PrevDataIndex = currDataIndex
    } // end while(rangeStart < rangeEnd)
    // then remove everything up to currDataIndex
    data.splice(0, currDataIndex)
  }

  give.GiveNonLeafNode.prototype.remove = function (data, removeExactMatch, callback) {
    // Removing a single data entry.
    // Notice that if data is provided and duplicate Keys (same start and end) exist,
    // it will behave as removeExactMatch indicated.
    // If removeExactMatch, data will be compared by .equalTo(data) if exists, === if not.

    // Also, the return value will be dependent on this.IsRoot
    // * For root nodes, return this if no decreasing height happen, otherwise the new root node
    // * For non-root nodes, return false if redistribution needs to be handled by its parent
    //            return this if no redistribution is needed (Keys may still need to be readjusted)

    var i = 0
    while (i < this.Values.length && this.Keys[i + 1] <= data.getStart()) {
      i++
    }
    if (this.Values[i]) {
      if (this.RevDepth === 1) {
        // Leaf node, remove data if it's there
        if (this.Keys[i] === data.getStart() && this.Values[i].StartList) {
          for (var stListIndex = 0; stListIndex < this.Values[i].StartList.length; stListIndex++) {
            if (this.Values[i].StartList[stListIndex].getEnd() === data.getEnd() &&
            (!removeExactMatch || (data.equalTo && data.equalTo(this.Values[i].StartList[stListIndex])) ||
            data === this.Values[i].StartList[stListIndex])) {
              // Match found
              if (callback) {
                callback(this.Values[i].StartList[stListIndex])
              }
              this.Values[i].StartList.splice(stListIndex, 1)
              stListIndex--
            }
          }
          if (this.Values[i].StartList.length <= 0) {
            // All data removed in the record, needs to merge with the Previous record
            if (i > 0 || (this.Prev && this.Prev.Values[this.Prev.Values.length - 1] !== null)) {
              // there is a Previous node at the same RevDepth level
              this.Keys.splice(i, 1)
              this.Values.splice(i, 1)
              if (i === 0 && this.Prev) {
                // Needs to update the last key value of this.Prev
                // Upper nodes will change their Keys by themselves
                this.Prev.setEnd(this.getStart())
              }
            } else { // i === 0 and !(this.Prev && this.Prev.Values[this.Prev.Values.length - 1] !== null),
              // which means this is exactly the first node at this level
              this.Values[i] = false
            }
            while (i < this.Values.length && i > 0 && this.Values[i] === false) { // eslint-disable-line no-unmodified-loop-condition
              // Also merge with the Next node if possible (under the same parent and both are false in Values)
              // this is possible if the parent get restructured
              this.Keys.splice(i, 1)
              this.Values.splice(i, 1)
            }
          }
        } else {
          console.log('Data ' + data + ' is not found in the tree at leaves.')
        }
      } else { // this.RevDepth !== 1
        // Non leaf node, do remove in the child node that may have data
        var flag = this.Values[i].remove(data, removeExactMatch)
        var updateStart = (i === 0)    // May need to update start because the first children is involved
        if (!flag) {
          // Redistribution and/or merging is needed, find its sibling
          // (default is the earlier sibling, if no earlier sibling, then the later one can be used)
          if (i === 0) {
            i++
          }

          var sibFront = this.Values[i - 1]
          var sibBack = this.Values[i]

          // does not need to merge, just redistribute
          sibFront.Keys.splice(-1, 1, sibBack.Keys)
          sibFront.Values.splice(sibBack.Values.length, sibBack.Values)

          // First check whether the total amount of children
          // in sibling and this.Values[i] is less than this.branchingFactor
          if (sibFront.Values.length > this.branchingFactor) {
            var sibFrontNewNum = Math.ceil(sibFront.Values.length / 2)
            sibBack.Keys = sibFront.Keys.splice(sibFrontNewNum)
            sibBack.Values = sibFront.Values.splice(sibFrontNewNum)
            sibFront.Keys.push(sibBack.getStart())
            sibBack.updateSummary()
          } else {
            // needs to merge, remove sibBack
            if (sibBack.Next && sibBack.Next.Prev) {
              sibBack.Next.Prev = sibFront
            }
            sibFront.Next = sibBack.Next
            this.Values.splice(i, 1)
            this.Keys.splice(i, 1)
          }
          sibFront.updateSummary()

          if (updateStart) {
            i--
          }
        } // end if(flag)

        // Update Keys (because child.Values[0] can be removed).
        this.Keys[i] = this.Values[i].getStart()
        if (i === 0 && this.Prev) {
          this.Prev.setEnd(this.getStart())
        }
      } // end if(this.RevDepth === 1)

      if (this.IsRoot && this.RevDepth > 1 && this.Values.length < 2) {
        // If this is root and it has only one child,
        // reduce depth of the tree by 1 and return its only child as new root
        this.Values[0].IsRoot = true
        delete this.Keys
        return this.Values[0]
      } else if (!this.IsRoot && this.Values.length < Math.ceil(this.branchingFactor / 2)) {
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
  give.GiveNonLeafNode.prototype.traverse = function (chrRange,
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
    // However, this is not a recursive call because children can get to their Next sibling by themselves

    // notFirstCall is a flag marking internal calls,
    //     calls from outside should always have notFirstCall === undefined, null or false
    //    when traverse calls children that are not the first one overlapping chrRegion
    //    notFirstCall will be set as true

    if (chrRange) {
      // clip chrRegion first (should never happen, also the end is not truncated)
      chrRange = this.truncateChrRange(chrRange, true, false)

      var currIndex = 0

      while (this.Keys[currIndex + 1] <= chrRange.start) {
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
      if (this.Keys[currIndex] < chrRange.end && currIndex < this.Values.length) {
        this.rejuvenate(rejuvenation)
      }

      while (this.Keys[currIndex] < chrRange.end && currIndex < this.Values.length) {
        if (this.RevDepth === 1 || !this.childResNotEnough(resolution, currIndex)) {
          if (this.Values[currIndex] !== false) {
            if (this.RevDepth > 1) {
              // NOTE: Temporary fix: wrap a ChromRegion object around the summary data
              // May need to explore better solutions
              callFuncOnDataEntry.call(thisVar, new give.ChromRegion({
                chr: chrRange.chr,
                start: this.Keys[currIndex],
                end: this.Keys[currIndex + 1]
              }, null, { data: this.Values[currIndex].getSummaryData() }))
            } else { // this.RevDepth === 1
              if (!notFirstCall) {
                // This is the first call, should call on all ContList as well
                if (Array.isArray(this.Values[currIndex].ContList)) {
                  if (!this.Values[currIndex].ContList.every(callFuncOnDataEntry, thisVar)) {
                    return false
                  }
                }
              }
              if (Array.isArray(this.Values[currIndex].StartList)) {
                if (!this.Values[currIndex].StartList.every(callFuncOnDataEntry, thisVar)) {
                  return false
                }
              }
            }
          }
        } else {
          // not enough resolution, descend into children
          if (!this.Values[currIndex].traverse(chrRange, callback, filter,
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

  give.GiveNonLeafNode.prototype.wither = function () {
    // If current node itself withers,
    // it will cause this and *all the children of this* wither
    // NOTE: Root node never withers
    if (!give.WitheringNode.prototype.wither.call(this) && !this.IsRoot) {
      if (this.Prev) {
        this.Prev.Next = null
      }
      if (this.Next) {
        this.Next.Prev = null
      }
      // return null so that the parent can remove it
      return null
    }

    // Then process all the children to see if any withers
    for (var i = 0; i < this.Values.length; i++) {
      if (this.Values[i] && !this.Values[i].wither()) {
        // replace the node with null (nothing)
        this.Values[i] = null
      }
      if (i > 0 && this.Values[i] === null && this.Values[i - 1] === null) {
        // Previous one is also null
        this.Keys.splice(i + 1, 1)
        this.Values.splice(i + 1, 1)
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
   * @param  {number} resolution - Resolution required for the query,
   *   will override `chrRange.resolution` if both exist.
   * @param  {number} bufferingRatio - Ratio of desired resolution if the data
   *   is not available. This would allow a "resolution buffering" by requesting
   *   data at a slightly finer resolution than currently required.
   * @returns {Array<GIVE.ChromRegion>} An ordered array of the regions that
   *   does not have the data at the current resolution requirement.
   */
  give.GiveNonLeafNode.prototype.getUncachedRange = function (chrRange, resolution, bufferingRatio) {
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
      while (this.Keys[currIndex + 1] <= rangeStart) {
        currIndex++
      }
      while (rangeStart < rangeEnd) {
        var newResult = []
        if (this.Values[currIndex] &&
          this.childResNotEnough(resolution, currIndex)
        ) {
          // child has not enough resolution
          newResult = this.Values[currIndex].getUncachedRange({
            chr: chrRange.chr,
            start: rangeStart,
            end: rangeEnd
          }, resolution, bufferingRatio)
        } else if (this.Values[currIndex] === null ||
          (!this.childHasData(currIndex) &&
            parseInt(Math.max(this.Keys[currIndex], rangeStart)) <
            parseInt(Math.min(rangeEnd, this.Keys[currIndex + 1]))
          )
        ) {
          // either no child at all or child does not have summary data
          // calculate the closest range needed for the resolution
          // first normalize resolution to branchingFactor
          var retrieveStart, retrieveEnd, res
          res = Math.floor(Math.pow(this.branchingFactor,
            Math.floor(Math.log(resolution / bufferingRatio) / Math.log(this.branchingFactor))))

          retrieveStart = parseInt(Math.max(this.Keys[currIndex],
            give.fitRes(rangeStart, res, Math.floor)))
          retrieveEnd = parseInt(Math.min(this.Keys[currIndex + 1],
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
        rangeStart = this.Keys[currIndex]
      }
      return result
    } else { // chrRange
      throw (new Error(chrRange + ' is not a valid chrRegion.'))
    }
  }

  return give
})(GIVe || {})
