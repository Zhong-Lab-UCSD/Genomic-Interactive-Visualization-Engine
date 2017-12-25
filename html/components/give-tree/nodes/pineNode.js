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

var GIVe = (function (give) {
  'use strict'

  /**
   * Non-leaf nodes for Pine Trees
   * This is an interface for all nodes that belongs to an pine tree, which
   * provides summary, caching and withering functions, but is not
   * self-balanced.
   *
   * See `GIVE.GiveNonLeafNode` for common non-leaf node documentation.
   * See `GIVE.WitheringNode` for withering node documentation.
   *
   * @typedef {object} PineNode
   * @property {boolean} IsRoot
   * @property {Array<number>} Keys
   * @property {Array<GiveTreeNode|null|boolean>} Values
   * @property {number} RevDepth
   * @property {PineNode|null|boolean} Next
   * @property {PineNode|null|boolean} Prev
   * @property {GiveTree} Tree - Link to the `GiveTree` object to access tree-
   *    wise properties.
   * @property {number} Tree.ScalingFactor - The scaling factor for the pine
   *    tree.
   *    This is the factor for non-leaf nodes (this will be used to initialize
   *    `this.Tree.LeafScalingFactor` if the latter is not initialized.).
   * @property {number} Tree.LeafScalingFactor - The scaling factor for the
   *    leaf nodes of the pine tree.
   *    For example, if `this.Tree.LeafScalingFactor === 100`, each leaf node
   *    (`give.DataNode`) shall cover 100bp.
   * @property {function|null} Tree.SummaryCtor - The constructor for a data
   *    summary.
   * @property {object|null} Summary - The data summary for this node.
   *
   * @class give.PineNode
   *
   * @constructor
   * @implements give.GiveNonLeafNode
   * @implements give.WitheringNode
   * @param {object} props
   * @param {GiveTree} props.Tree - for `this.Tree`
   * @param {boolean} props.IsRoot
   * @param {number} props.Start
   * @param {number} props.End
   * @param {number|null} props.RevDepth
   * @param {GiveNonLeafNode|null|boolean} props.NextNode
   * @param {GiveNonLeafNode|null|boolean} props.PrevNode
   *
   */
  give.PineNode = function (props) {
    // implementing `GiveNonLeafNode`
    give.GiveNonLeafNode.apply(this, arguments)
    // implementing `WitheringNode`
    give.WitheringNode.apply(this, arguments)

    // Note that `this.RevDepth` should be depending on both scaling factors.
    if (this.getEnd() - this.getStart() <= this.Tree.LeafScalingFactor) {
      this.RevDepth = 0
    } else {
      this.RevDepth = 1 + Math.ceil(
        (Math.log(this.getEnd() - this.getStart()) -
          Math.log(this.Tree.LeafScalingFactor)
        ) / Math.log(this.Tree.ScalingFactor))
    }

    this.Summary = null
  }

  give.extend(give.GiveNonLeafNode, give.PineNode)
  give.WitheringNode.addWithering.call(give.PineNode)

  give.PineNode.prototype.hasData = function () {
    return (typeof this.getSummaryData === 'function' &&
      this.getSummaryData() !== null)
  }

  /**
   * childHasData - whether the data of the child node is there
   *
   * @param  {number} index - index of the child node
   * @returns {boolean} - `true` if the data is ready, `false` if not.
   */
  give.PineNode.prototype.childHasData = function (index) {
    return this.Values[index] === false ||
      (this.Values[index] !== null && this.Values[index].hasData())
  }

  /**
   * _getResolutionAtDepth - get the resolution of any data node given the
   *    reversed depth of the node.
   *
   * @param {number} revDepth - the reversed depth of the node.
   * @returns {number}  Return the resolution (span of the node),
   *    1 is the smallest (finest)
   */
  give.PineNode.prototype._getResolutionAtDepth = function (revDepth) {
    return parseInt(
      Math.floor(
        Math.pow(
          this.Tree.ScalingFactor, revDepth
        ) * this.Tree.LeafScalingFactor
      )
    )
  }

  /**
   * getResolution - get the resolution of this data node
   *
   * @returns {number}  Return the resolution (span of the node),
   *    1 is the smallest (finest)
   */
  give.PineNode.prototype.getResolution = function () {
    return this._getResolutionAtDepth(this.RevDepth)
  }

  /**
   * getChildResolution - get the resolution of a child data node
   *
   * @param  {number|null} index - index of the child node, if `null`, then
   *    return the supposed child resolution (because it should be fixed in
   *    pine trees.)
   * @returns {number} - resolution of the child
   */
  give.PineNode.prototype.getChildResolution = function (index) {
    // if index is a number, then it's asking for the resolution of that
    //   specific child, otherwise it's a generalized child resolution
    if (!isNaN(index) && parseInt(index) === index) {
      // Specialized child resolution
      if (this.RevDepth <= 0 || this.Values[index] === false) {
        return 1
      } else if (this.Values[index] && this.Values[index].getResolution) {
        return this.Values[index].getResolution()
      }
    }
    // Generalized child resolution
    return this.RevDepth > 0
      ? this._getResolutionAtDepth(this.RevDepth - 1)
      : 1
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
  give.PineNode.prototype.resNotEnough = function (resolution) {
    resolution = (typeof resolution === 'number' && !isNaN(resolution))
      ? resolution : 1
    return this.getResolution() > resolution
  }

  /**
   * childResNotEnough - get whether the resolution of a child is not enough
   *    for the given resolution requirement.
   *
   * @param  {number|null} resolution - the resolution required, if `null`, use
   *    `1` (the finest) instead for the required resolution.
   * @param  {number|null} index - index of the child node, if `null`, then
   *    return the supposed child resolution (because it should be fixed in
   *    pine trees.)
   * @returns {boolean}  Return `true` if the resolution is not enough,
   *    otherwise `false`.
   */
  give.PineNode.prototype.childResNotEnough = function (resolution, index) {
    resolution = (typeof resolution === 'number' && !isNaN(resolution))
      ? resolution : 1
    return this.getChildResolution(index) > resolution
  }

  /**
   * updateSummary - Update the summary data within this node
   *
   * @param  {SummaryCtor} summary - if known summaries are there, replace
   *    directly
   * @returns {boolean} - return `true` if summary has been updated.
   */
  give.PineNode.prototype.updateSummary = function (summary) {
    if (typeof this.Tree.SummaryCtor === 'function') {
      if (summary instanceof this.Tree.SummaryCtor) {
        // summary provided, just replace
        this.Summary = summary
      } else {
        if (summary) {
          // summary is something with wrong type
          give._verboseConsole(summary + ' is not a correct summary type. ' +
            'Will be regenerated from tree data.', give.VERBOSE_DEBUG)
        }
        var newSummary = new this.Tree.SummaryCtor()
        if (this.Values.every(function (entry, index) {
          if (entry === false) {
            // Child is zero, just return true
            return true
          }
          if (entry === null ||
             (this.RevDepth > 0 && entry.getSummaryData() === null)) {
            return false
          }
          if (this.RevDepth) {
            newSummary.addSummary(entry.getSummaryData())
          } else {
            entry.traverse(null, function (dataEntry) {
              newSummary.addData(dataEntry)
            }, null, this, false, { NotFirstCall: true })
          }
          return true
        }, this)) {
          this.Summary = newSummary
        } else {
          this.Summary = this.Summary || null
        }
      }
    }
    return true
  }

  give.PineNode.prototype.getSummaryData = function () {
    return this.Summary
  }

  /**
   * insert - Insert data under this node
   * @memberof GiveNonLeafNode.prototype
   *
   * @param {Array<ChromRegionLiteral>} data - the sorted array of data entries
   *    (each should be an extension of `GIVe.ChromRegion`).
   *    `data === null` or `data === []` means there is no data in `chrRange`
   *    and `false`s will be used in actual storage.
   *    __NOTICE:__ any data overlapping `chrRange` should appear either here or
   *    in `continuedList`, otherwise `continuedList` in data entries may not
   *    work properly.
   *    After insertion, any entry within `data` that overlaps `chrRange` will
   *    be deleted from the array.
   * @param {ChromRegionLiteral} chrRange - the chromosomal range that `data`
   *    corresponds to.
   *    This is used to mark the empty regions correctly. No `null` will present
   *    within these regions after this operation.
   *    This parameter should be an `Object` with at least two properties:
   *    `{ start: <start coordinate>, end: <end coordinate>, ... }`,
   *    preferably a `GIVe.ChromRegion` object.
   * @param {object|null} props - additional properties being passed onto nodes.
   * @param {Array<ChromRegionLiteral>} props.ContList - the list of data
   *    entries that should not start in `chrRange` but are passed from the
   *    earlier regions, this will be useful for later regions if date for
   *    multiple regions are inserted at the same time
   * @param {function|null} props.Callback - the callback function to be used
   *    (with the data entry as its sole parameter) when inserting
   * @param {object|null} props.ThisVar - `this` used in calling
   *    `props.Callback`.
   * @param {function|null} props.LeafNodeCtor - the constructor function of
   *    leaf nodes if they are not the same as the non-leaf nodes.
   * @returns {give.GiveNonLeafNode|Array<give.GiveNonLeafNode>}
   *    This shall reflect whether auto-balancing is supported for the tree.
   *    See `give.GiveNonLeafNode.prototype._restructuring` for details.
   */
  give.PineNode.prototype.insert = function (data, chrRange, props) {
    props = props || {}
    if (data && data.length === 1 && !chrRange) {
      chrRange = data[0]
    }

    if (data && !Array.isArray(data)) {
      throw (new Error('Data is not an array! ' +
        'This will cause problems in ContList.'))
    }

    if (chrRange) {
      // clip chrRegion first (should never happen)
      chrRange = this.truncateChrRange(chrRange, true, true)
      // First, if this 'insertion' is just updating the summary data of self,
      //    just update.
      // Then, there are three cases for insertion:
      // 1. leaf nodes: use `give.DataNode` to store raw data
      // 2. non-leaf nodes:
      //    go deep to generate branch structure, or update summary
      //    (for trees that support summary and resolutions)
      if (!this.resNotEnough(props.Resolution) && data[0]) {
        // check whether the data summary matches the node boundary
        if (
          this.getStart() !== data[0].getStart() ||
          this.getEnd() !== data[0].getEnd()
        ) {
          throw new Error('Summary range does not match! `this`: ' +
            this.getStart() + ' - ' + this.getEnd() + '; data: ' +
            data[0].getStart() + ' - ' + data[0].getEnd()
          )
        }
        // ***** This should fit Summary definition *****
        this.updateSummary(data[0])
        if (typeof props.Callback === 'function') {
          props.Callback.call(props.ThisVar, data[0])
        }
        data.splice(0, 1)
      } else if (this.RevDepth > 0) {
        // case 2
        this._addNonLeafRecords(data, chrRange, props)
      } else {
        // case 1
        this._addLeafRecords(data, chrRange, props)
      }
    } else { // chrRange
      throw (new Error(chrRange + ' is not a valid chrRegion.'))
    } // end if(chrRange)
    this.rejuvenate(props.LifeSpan)
    return this._restructuring()
  }

  give.PineNode.prototype._addNonLeafRecords = function (
    data, chrRange, props
  ) {
    // This function adds record(s), and structures of the tree

    // In leaf nodes, the actual record trunks may need to be split before range
    // just to keep the loaded status correct.

    // Find the range of child that rangeStart is in
    var currIndex = 0
    var childRes = this.getChildResolution()
    var childRange = chrRange.clone()

    // Steps:
    // 1. Find the range where the first child node should be inserted.
    //    This should be the node where `chrRange.getStart()` falls in.
    // 2. Split children if possible to create the dedicated range for the
    //    child.
    // 3. Check if the child node contains actual data (by checking
    //    `data[currDataIndex]`).
    //    If yes, create a non-leaf node on the dedicated range and call
    //    `child.insert` on the dedicated range, `data` and `props`;
    //    otherwise, use `false` to fill the dedicated range and merge with
    //    previous `false`s if possible.

    while (chrRange.getStart() < chrRange.getEnd()) {
      // 1. Find the range where the first child node should be inserted.
      //    This should be the node where `chrRange.getStart()` falls in.
      childRange.start = give.fitRes(chrRange.getStart(), childRes, Math.floor)
      childRange.end = Math.min(this.getEnd(),
        give.fitRes(chrRange.getEnd(), childRes, Math.ceil),
        childRange.start + childRes
      )

      while (this.Keys[currIndex + 1] <= childRange.getStart()) {
        currIndex++
      }

      // 2. Split children if possible to create the dedicated range for the
      //    child.
      if (this.Keys[currIndex] < childRange.getStart()) {
        // If there are spaces before the dedicated range
        this._splitChild(currIndex++, childRange.getStart())
      }

      if (this.Keys[currIndex + 1] > childRange.getEnd()) {
        // If there are spaces after the dedicated range
        this._splitChild(currIndex, childRange.getEnd())
      }

      // Now the dedicated range is ready

      // 3. Check if the child node contains actual data (by checking
      //    `data[currDataIndex]`).
      //    otherwise, use `false` to fill the dedicated range and merge with
      //    previous `false`s if possible.
      //    Note that if `props.ContList` has stuff, this should be considered
      //    as CONTAIN data, so it should still goes all the way down to
      //    `give.DataNode`

      if (
        (data[0] &&
          data[0].getStart() >= childRange.getStart() &&
          data[0].getStart() < childRange.getEnd()
        ) || (
          Array.isArray(props.ContList) &&
          props.ContList.some(function (entry) {
            return entry.getEnd() > childRange.getStart()
          }, this)
        )
      ) {
        //    If yes, create a non-leaf node on the dedicated range and call
        //    `child.insert` on the dedicated range, `data` and `props`;
        if (!this.Values[currIndex]) {
          // try to establish previous nodes
          this.Values[currIndex] = new give.PineNode({
            IsRoot: false,
            Start: childRange.getStart(),
            End: childRange.getEnd(),
            RevDepth: this.RevDepth - 1,
            PrevNode: ((currIndex > 0) ? this.Values[currIndex - 1]
              : (this.prev ? this.prev.getLastChild() : null)) || null,
            NextNode: ((currIndex < this.Values.length - 1)
              ? this.Values[currIndex + 1]
              : (this.next ? this.next.getFirstChild() : null)) || null,
            Tree: this.Tree,
            LifeSpan: this.LifeSpan
          })
        }
        this.Values[currIndex].insert(data, childRange, props)
      } else {
        //    otherwise, use `false` to fill the dedicated range and merge with
        //    previous `false`s if possible.
        this.Values[currIndex] = false
        this._mergeChild(currIndex, true, false)
      }

      chrRange.start = childRange.getEnd()

      currIndex++
    } // end while(rangeStart < rangeEnd);
  }

  give.PineNode.prototype._addLeafRecords = function (
    data, chrRange, props
  ) {
    // This function only adds record(s), it won't restructure the tree
    // This function is exactly the same as `GIVE.OakNode._addLeafRecords`

    // Find the range of child that rangeStart is in
    var currIndex = 0
    props.DataIndex = 0
    var prevDataIndex
    props.ContList = props.ContList || []
    if (!(props.LeafNodeCtor instanceof give.GiveTreeNode)) {
      throw new Error('LeafNodeCtor `' + props.LeafNodeCtor +
        '` is not a constructor for a tree node!')
    }

    while (chrRange.getStart() < chrRange.getEnd()) {
      while (this.Keys[currIndex + 1] <= chrRange.getStart()) {
        currIndex++
      }
      // First get data that should belong to ContList done.
      prevDataIndex = props.DataIndex
      props.DataIndex = give._traverseData(data, props.DataIndex,
        function (dataEntry) {
          return dataEntry.getStart() < chrRange.getStart()
        }, this, props.Callback, props.ThisVar
      )
      props.ContList = props.ContList.concat(
        data.slice(prevDataIndex, props.DataIndex)
      ).filter(function (entry) {
        return entry.getEnd() > chrRange.getStart()
      })

      // Now all data entries with `.getStart()` before `nextRangeStart` should
      // be already in `props.ContList`

      if (this.Keys[currIndex] < chrRange.getStart()) {
        // The new rangeStart appears between windows.
        // Shorten the previous data record by inserting the key,
        // and use this.Values[currIndex] to fill the rest
        // (normally it should be `null`)
        this._splitChild(currIndex++, chrRange.getStart())
      }

      if (
        props.DataIndex < data.length &&
        data[props.DataIndex].getStart() === this.Keys[currIndex]
      ) {
        // there are actual data at this location, create a new leaf node
        this.Values[currIndex] = new props.LeafNodeCtor({
          Start: this.Keys[currIndex],
          End: this.Keys[currIndex + 1]
        })
        this.Values[currIndex].insert(data, chrRange, props)
      } else {
        // needs to fill the element with `false`, and merge with previous if
        // possible
        this.Values[currIndex] = false
        this._mergeChild(currIndex, false, true)
      }

      // Shrink `chrRange` to unprocessed range
      chrRange.start = (
        props.DataIndex < data.length &&
        data[props.DataIndex].getStart() < chrRange.getEnd()
      ) ? data[props.DataIndex].getStart() : chrRange.getEnd()
    }

    // Process `props.ContList` for one last time
    props.ContList = props.ContList.concat(
      data.slice(prevDataIndex, props.DataIndex)
    ).filter(function (entry) {
      return entry.getEnd() > chrRange.getEnd()
    })

    // Remove all processed data from `data`
    data.splice(0, props.DataIndex)
    delete props.DataIndex
  }

  give.PineNode.prototype.remove = function (data, removeExactMatch, props) {
    props = props || {}
    props.ConvertTo = props.ConvertTo === false ? false : null
    // Check whether `this` shall be removed
    if (this.getStart() === data.getStart() &&
      this.getEnd() === data.getEnd()
    ) {
      if (!removeExactMatch || this._compareData(data, this)) {
        // remove content of this
        if (typeof props.Callback === 'function') {
          props.Callback.call(props.ThisVar, this)
        }
        this.clear(props.ConvertTo)
        if (!this.IsRoot) {
          return false
        } else {
          return this
        }
      }
    }

    // data being remove is not self
    // locate the child entry first
    var i = 0
    while (i < this.Values.length && this.Keys[i + 1] <= data.getStart()) {
      i++
    }
    if (this.Values[i]) {
      // data must fall within `this.Values[i]`
      if (!this.Values[i].remove(
        data, removeExactMatch, props)
      ) {
        if (this.RevDepth > 0) {
          // Severe the links among the child and its siblings
          // (potential memory leak problem).
          try {
            this.Values[i].getPrev().setNext(props.ConvertTo)
          } catch (ignore) {}
          try {
            this.Values[i].getNext().setPrev(props.ConvertTo)
          } catch (ignore) {}
        }
        this.Values[i] = props.ConvertTo
        this._mergeChild(i, true)
      }
    } else {
      console.log('Data ' + data + ' is not found in the tree.')
    }
    return (this.Values.length > 1 || (
      this.getFirstChild() !== null && this.getFirstChild() !== false
    )) ? this : false
  }

  give.PineNode.prototype.traverse = function (
    chrRange, callback, filter, thisVar, breakOnFalse, props
  ) {
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

  give.PineNode.prototype.wither = function () {
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
    for (var i = 0; i < this.Values.length; i++) {
      if (this.Values[i] && !this.Values[i].wither()) {
        // replace the node with null (nothing)
        this.Values[i] = null
      }
      if (i > 0 && this.Values[i] === null && this.Values[i - 1] === null) {
        // previous one is also null
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
   * @param  {object|null} props - additional properties being passed onto nodes
   * @param  {number|null} props.resolution - Resolution required for the query,
   *   will override `chrRange.resolution` if both exist.
   * @param  {number|null} props.bufferingRatio - Ratio of desired resolution if
   *   the data is not available. This would allow a "resolution buffering" by
   *   requesting data at a slightly finer resolution than currently required.
   * @returns {Array<GIVE.ChromRegion>} An ordered array of the regions that
   *   does not have the data at the current resolution requirement.
   */
  give.PineNode.prototype.getUncachedRange = function (chrRange, props) {
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

  give.PineNode._DEFAULT_S_FACTOR = 10

  return give
})(GIVe || {})
