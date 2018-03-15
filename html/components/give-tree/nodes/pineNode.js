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
      this.RevDepth = Math.ceil(
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
    return parseInt(Math.floor(Math.pow(this.Tree.ScalingFactor, revDepth) *
      this.Tree.LeafScalingFactor))
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
   * resEnough - get whether the resolution of this data node is enough
   *    for the given resolution requirement.
   *
   * @param  {number|null} resolution - the resolution required, if `null`, use
   *    `1` (the finest) instead
   * @returns {boolean}  Return `true` if the resolution is enough,
   *    otherwise `false`.
   */
  give.PineNode.prototype.resEnough = function (resolution) {
    resolution = (typeof resolution === 'number' && !isNaN(resolution))
      ? resolution : 1
    return this.getResolution() <= resolution
  }

  /**
   * childResEnough - get whether the resolution of a child is enough
   *    for the given resolution requirement.
   *
   * @param  {number|null} resolution - the resolution required, if `null`, use
   *    `1` (the finest) instead for the required resolution.
   * @param  {number|null} index - index of the child node, if `null`, then
   *    return the supposed child resolution (because it should be fixed in
   *    pine trees.)
   * @returns {boolean}  Return `true` if the resolution is enough,
   *    otherwise `false`.
   */
  give.PineNode.prototype.childResEnough = function (resolution, index) {
    resolution = (typeof resolution === 'number' && !isNaN(resolution))
      ? resolution : 1
    return this.getChildResolution(index) <= resolution
  }

  /**
   * _getClosestRes - get the closest resolution that is adequate for the
   *    required resolution.
   *
   * @param {number} requiredRes - the required resolution.
   * @returns {number}  Return the closest resolution that is smaller or equal
   *    to `requiredRes`.
   */
  give.PineNode.prototype._getClosestRes = function (requiredRes) {
    if (requiredRes >= this.Tree.LeafScalingFactor) {
      return parseInt(Math.floor(Math.pow(this.Tree.ScalingFactor,
        Math.floor((Math.log(requiredRes / this.Tree.LeafScalingFactor)) /
          Math.log(this.Tree.ScalingFactor))) * this.Tree.LeafScalingFactor
      ))
    }
    return 1
  }

  /**
   * fitRes - fit coordinates to resolution requirements.
   *    This is mainly used in cases when a value is put into a series of
   *    consecutive bins of `resolution` size, and we need to find the boundary
   *    of the bin. For example, if we put 12 into bins of 10, then we'll need
   *    either 10 or 20, depending on whether we need the lower boundary or the
   *    upper one.
   *
   * @static
   * @memberof GIVE.PineNode
   * @param  {number} value - value to be fitted
   * @param  {number} resolution - resolution that needs to be fitted, *i.e.*
   *    bin size.
   * @param  {function} [roundingFunc] - rounding function used when fitting
   *    the bin. Use `Math.ceil` to get upper bounds, and `Math.floor` for
   *    lower bounds. Other rounding methods can be used to achieve different
   *    purposes (getting the midpoint of the bin, for example).
   *    `Math.floor` is used by default.
   * @returns {number} returns the fitted value
   */
  give.PineNode.fitRes = function (value, resolution, roundingFunc) {
    // use roundingFunc to fit value to the closest resolution
    // roundingFunc can be Math.floor, Math.ceil or Math.round
    roundingFunc = roundingFunc || Math.round
    return parseInt(roundingFunc(value / resolution) * resolution)
  }

  /**
   * updateSummary - Update the summary data within this node
   *
   * @param  {ChromRegionLiteral} chromEntry - if known summaries exist in the
   *    data entry, replace current summary with the new one.
   * @returns {boolean} - return `true` if summary has been updated.
   */
  give.PineNode.prototype.updateSummary = function (chromEntry) {
    if (typeof this.Tree.SummaryCtor === 'function') {
      var summary
      if (chromEntry) {
        summary = this.Tree.SummaryCtor.extract(chromEntry)
      }
      if (summary instanceof this.Tree.SummaryCtor) {
        // summary provided, just replace
        this.Summary = summary
      } else if (!this.getSummaryData()) {
        if (summary) {
          // summary is something with wrong type
          give._verboseConsole(summary + ' is not a correct summary type. ' +
            'Will be regenerated from tree data.', give.VERBOSE_DEBUG)
        }
        var newSummary = new this.Tree.SummaryCtor(this)
        if (this.Values.every(function (nodeEntry, index) {
          if (nodeEntry === false) {
            // Child is zero, just return true
            return true
          }
          if (nodeEntry === null ||
             (this.RevDepth > 0 && nodeEntry.getSummaryData() === null)) {
            return false
          }
          if (this.RevDepth > 0) {
            newSummary.addSummary(this, nodeEntry.getSummaryData())
          } else {
            nodeEntry.traverse(null, function (chromEntryInDataNode) {
              newSummary.addDataFromChromEntry(this, chromEntryInDataNode)
            }, this, null, false, { NotFirstCall: true })
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

  /**
   * getSummaryData - get the summary data of `this`
   *
   * @returns {SummaryCtor|null}  the summary data, or `null`
   */
  give.PineNode.prototype.getSummaryData = function () {
    return this.Summary
  }

  /**
   * getSummaryChromRegion - get a `ChromRegion` object including the summary
   *    data of `this` as its `.Summary` property.
   *
   * @param {string} chr - chromosome for the `ChromRegion` object
   * @returns {ChromRegionLiteral|null}  the `ChromRegion` object, or `null`
   */
  give.PineNode.prototype.getSummaryChromRegion = function (chr) {
    return this.getSummaryData()
      ? this.getSummaryData().attach(new give.ChromRegion({
        chr: chr || this.Tree.Chr,
        start: this.getStart(),
        end: this.getEnd()
      }, null))
      : null
  }

  /**
   * insert - Insert data under this node
   * @memberof PineNode.prototype
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
   *    This parameter should be a `GIVe.ChromRegion` object.
   * @param {number} chrRange.Resolution - the resolution provided for the
   *    insertion. 1 is finest. This is used in case of mixed resolutions for
   *    different `chrRange`s, This will override `props.Resolution` if both
   *    exist.
   * @param {object|null} props - additional properties being passed onto nodes.
   * @param {Array<ChromRegionLiteral>} props.ContList - the list of data
   *    entries that should not start in `chrRange` but are passed from the
   *    earlier regions, this will be useful for later regions if date for
   *    multiple regions are inserted at the same time
   * @param {function|null} props.Callback - the callback function to be used
   *    (with the data entry as its sole parameter) when inserting
   * @param {object|null} props.ThisVar - `this` used in calling
   *    `props.Callback`.
   * @param {number} props.Resolution - the resolution provided for the
   *    insertion. 1 is finest. This will be overridden by `chrRange.Resolution`
   *    if both exist.
   * @param {function|null} props.LeafNodeCtor - the constructor function of
   *    leaf nodes if they are not the same as the non-leaf nodes.
   * @returns {give.GiveNonLeafNode|Array<give.GiveNonLeafNode>}
   *    This shall reflect whether auto-balancing is supported for the tree.
   *    See `give.GiveNonLeafNode.prototype._restructure` for details.
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
      var resolution = chrRange.Resolution || props.Resolution || 1
      // clip chrRegion first (should never happen)
      chrRange = this.truncateChrRange(chrRange, true, true)
      // First, if this 'insertion' is just updating the summary data of self,
      //    just update.
      // Then, there are three cases for insertion:
      // 1. leaf nodes: use `give.DataNode` to store raw data
      // 2. non-leaf nodes:
      //    go deep to generate branch structure, or update summary
      //    (for trees that support summary and resolutions)
      if (this.resEnough(resolution) && data[0]) {
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
      this.updateSummary()
    } else { // chrRange
      throw (new Error(chrRange + ' is not a valid chrRegion.'))
    } // end if(chrRange)
    this.rejuvenate(props.LifeSpan)
    return this._restructure()
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
      childRange.start = give.PineNode.fitRes(
        chrRange.getStart(), childRes, Math.floor
      )
      childRange.end = Math.min(this.getEnd(),
        give.PineNode.fitRes(chrRange.getEnd(), childRes, Math.ceil),
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
      //    `data[currDataIndex]`), or the (probably empty) data range falls
      //    within child range.
      //    otherwise, use `false` to fill the dedicated range and merge with
      //    previous `false`s if possible.
      //    Note that if `props.ContList` has stuff, this should be considered
      //    as CONTAIN data, so it should still goes all the way down to
      //    `give.DataNode`
      var fixChildFlag = false

      if (
        (data[0] &&
          data[0].getStart() < childRange.getEnd()
        ) || (
          Array.isArray(props.ContList) &&
          props.ContList.some(function (entry) {
            return entry.getEnd() > childRange.getStart()
          }, this)
        ) || (
          chrRange.getStart() > childRange.getStart() ||
          chrRange.getEnd() < childRange.getEnd()
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
            Tree: this.Tree,
            LifeSpan: this.LifeSpan
          })
        }
        fixChildFlag = !this.Values[currIndex].insert(data, chrRange, props)
      } else {
        fixChildFlag = true
      }

      if (fixChildFlag) {
        //    otherwise, use `false` to fill the dedicated range and merge with
        //    previous `false`s if possible.
        this.Values[currIndex] = false
        if (this._mergeChild(currIndex, true, false)) {
          currIndex--
        }
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
    if (!(give.GiveTreeNode.prototype.isPrototypeOf(
      props.LeafNodeCtor.prototype
    ))) {
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
          Start: this.Keys[currIndex]
        })
        this.Values[currIndex].insert(data, chrRange, props)
      } else if (this.Keys[currIndex] < chrRange.getEnd()) {
        // needs to fill the element with `false`, and merge with previous if
        // possible
        this.Values[currIndex] = props.ContList.length <= 0
          ? false : new props.LeafNodeCtor({
            Start: this.Keys[currIndex],
            ContList: props.ContList.slice()
          })
        if (this._mergeChild(currIndex, false, false)) {
          currIndex--
        }
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
        this.Values[i] = props.ConvertTo
        this._mergeChild(i, true, false)
      }
    } else {
      give._verboseConsole('Data ' + data + ' is not found in the tree.',
        give.VERBOSE_DEBUG)
    }
    return (this.Values.length > 1 || (
      this.getFirstChild() !== null && this.getFirstChild() !== false
    )) ? this : false
  }

  /**
   * traverse - traverse all nodes / data entries within `this` and calling
   *    functions on them. Pine tree nodes need to implement resolution support.
   * @memberof PineNode.prototype
   *
   * @param  {ChromRegionLiteral} chrRange - the chromosomal range to traverse.
   * @param  {number} [chrRange.Resolution] - the resolution required for the
   *    traverse. 1 is finest. This is used in case of mixed resolutions for
   *    different `chrRange`s, This will override `props.Resolution` if both
   *    exist.
   * @param  {function} callback - the callback function, takes a
   *    `GIVE.ChromRegion` object as its sole parameter and returns something
   *    that can be evaluated as a boolean value to determine whether the call
   *    shall continue (if `breakOnFalse === true`).
   * @param  {object|null} thisVar - `this` used in calling both `filter` and
   *    `callback`.
   * @param  {function|null} filter - a filter function that takes a
   *    `GIVE.ChromRegion` object as its sole parameter and returns whether the
   *    region should be included in traverse.
   * @param  {boolean} breakOnFalse - whether the traverse should be stopped if
   *    `false` is returned from the callback function.
   * @param  {object|null} props - additional properties being
   *    passed onto nodes.
   * @param  {boolean} props.NotFirstCall - whether this is not the first call
   *    of a series of `traverse` calls.
   * @param  {number} [props.Resolution] - the resolution required for this
   *    traverse. 1 is finest. This will be overridden by `chrRange.Resolution`
   *    if both exist.
   * @param  {number} [props.Rejuvenation] - the amount of life this traverse
   *    shall let participating nodes rejuvenate.
   * @returns {boolean} - whether future traverses should be conducted.
   */
  give.PineNode.prototype.traverse = function (
    chrRange, callback, thisVar, filter, breakOnFalse, props
  ) {
    if (chrRange) {
      var resolution = chrRange.Resolution || props.Resolution || 1
      // Rejuvenate `this`
      if (this.getStart() < chrRange.getEnd() &&
        this.getEnd() > chrRange.getStart()
      ) {
        this.rejuvenate(props.Rejuvenation)
        // Resolution support: check if the resolution is already enough in this
        // node. If so, call `this._callFuncOnDataEntry` on
        // `this.getSummaryChromRegion()`
        if (this.resEnough(resolution) && this.hasData()) {
          // Resolution enough
          return this._callFuncOnDataEntry(chrRange, callback, thisVar, filter,
            breakOnFalse, this.getSummaryChromRegion()
          )
        } else {
          // call `GIVE.GiveNonLeafNode.prototype.traverse`
          return give.GiveNonLeafNode.prototype.traverse.call(
            this, chrRange, callback, thisVar, filter, breakOnFalse, props)
        }
      }
    } else { // !chrRange
      throw (new Error(chrRange + ' is not a valid chrRegion.'))
    } // end if(chrRange)
  }

  give.PineNode.prototype.wither = function () {
    // If current node itself withers,
    // it will cause this and *all the children of this* wither
    // NOTE: Root node may also wither, which causes the whole tree to wither
    if (!give.WitheringNode.prototype.wither.call(this)) {
      this.clear(null)
      // return null so that the parent can remove it
      return null
    }

    // Then process all the children to see if any withers
    for (var i = 0; i < this.Values.length; i++) {
      if (this.Values[i] &&
        typeof this.Values[i].wither === 'function' && !this.Values[i].wither()
      ) {
        // replace the node with null (nothing)
        this.Values[i] = null
        if (this._mergeChild(i, true, false)) {
          i--
        }
      }
    }
    return this
  }

  /**
   * getUncachedRange - Return an array of chrRegions that does not have data
   *    loaded to allow buffered loading of data
   *
   * @param  {GIVE.ChromRegion} chrRange - The range of query.
   * @param  {number} chrRange.Resolution - the resolution required for the
   *    uncached range. 1 is finest. This is used in case of mixed resolutions
   *    for different `chrRange`s, This will override `props.Resolution` if both
   *    exist.
   * @param  {object|null} props - additional properties being passed onto nodes
   * @param  {number|null} props.Resolution - Resolution required for the query,
   *    will be overridden by `chrRange.Resolution` if both exist.
   * @param  {number|null} props.BufferingRatio - Ratio of desired resolution if
   *    the data is not available. This would allow a "resolution buffering" by
   *    requesting data at a slightly finer resolution than currently required.
   * @param  {Array<GIVE.ChromRegion>} props._Result - previous unloaded
   *    regions. This will be appended to the front of returned value.
   *    This array will be updated if it gets appended to reduce memory usage
   *    and GC.
   * @returns {Array<GIVE.ChromRegion>} An ordered array of the regions that
   *    does not have the data at the current resolution requirement.
   *    __Regions will have a `.Resolution` property indicating their intended
   *    resolutions. This shall be observed by the server so that summary of
   *    data shall work.__
   *    If no non-data ranges are found, return []
   */
  give.PineNode.prototype.getUncachedRange = function (chrRange, props) {
    // return the range list with range(s) without any data
    // if no non-data ranges are found, return []

    var resolution = chrRange.Resolution || props.Resolution || 1
    props._Result = props._Result || []
    props.BufferingRatio = props.BufferingRatio || 1
    if (props.BufferingRatio < 1) {
      give._verboseConsole(
        'Invalid bufferingRatio: ' + props.BufferingRatio +
        '. Should be greater than 1. Changed to 1 instead.',
        give.VERBOSE_WARNING)
      props.BufferingRatio = 1
    }

    if (chrRange) {
      var currIndex = 0
      while (currIndex < this.Values.length &&
        this.Keys[currIndex + 1] <= chrRange.getStart()
      ) {
        currIndex++
      }
      while (currIndex < this.Values.length &&
        this.Keys[currIndex] < chrRange.getEnd()
      ) {
        if (this.Values[currIndex] &&
          !this.childResEnough(resolution, currIndex)
        ) {
          // child has not enough resolution
          this.Values[currIndex].getUncachedRange(chrRange, props)
        } else if (!this.childHasData(currIndex)) {
          // either no child at all or child does not have summary data
          // calculate the closest range needed for the resolution
          // first normalize resolution to branchingFactor
          var retrieveStart, retrieveEnd, res
          res = this._getClosestRes(resolution / props.BufferingRatio)
          retrieveStart = Math.max(this.Keys[currIndex],
            give.PineNode.fitRes(chrRange.getStart(), res, Math.floor))
          retrieveEnd = Math.min(this.Keys[currIndex + 1],
            give.PineNode.fitRes(chrRange.getEnd(), res, Math.ceil))
          if (props._Result[props._Result.length - 1] &&
            props._Result[props._Result.length - 1].Resolution === res &&
            props._Result[props._Result.length - 1].getEnd() === retrieveStart
          ) {
            props._Result[props._Result.length - 1].end = retrieveEnd
          } else {
            props._Result.push(new give.ChromRegion({
              chr: chrRange.chr,
              start: retrieveStart,
              end: retrieveEnd,
              Resolution: res
            }))
          }
        }
        currIndex++
      }
      return props._Result
    } else { // chrRange
      throw (new Error(chrRange + ' is not a valid chrRegion.'))
    }
  }

  /**
   * isEmpty - return whether this node is empty
   * If there is no entry in both `this.StartList` and `this.ContList` then the
   *    node is considered empty.
   *
   * @returns {boolean}      whether the node is empty
   */
  give.PineNode.prototype.isEmpty = function () {
    return !this.hasData() && give.GiveNonLeafNode.prototype.isEmpty.call(this)
  }

  give.PineNode._DEFAULT_S_FACTOR = 10

  return give
})(GIVe || {})
