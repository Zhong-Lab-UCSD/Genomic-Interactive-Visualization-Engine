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
   * Object for data storage
   * Every record will serve as a bin, with a start and end coordinate, and all
   * records combined will serve as a division of the chromosome (no gap, no
   * overlap) with all the start value for dividing points.
   *
   * For example:
   * bins:   << |                      |       |          |       >>
   * Data:   << ------------]
   *            [-----------------]
   *            [------------]
   *            [------------------------------------]
   *            [--------------------------]
   *                                   [-------]
   *                                   [------------------------- >>
   *                                           [---------------]
   *                                           [----------------- >>
   *                                                      [-]
   *
   * Records can have value of:
   *    `null`:   data not loaded yet, when upper layer encounter this, the code
   *              there needs to retrieve potential data;
   *    `false`:  there is no data in this bin;
   *    A `GIVe.DataNode` instance:
   *              the instance of a class described in this file
   *
   * @typedef {object} GiveDataNodeBase
   * @property {number} Start - the starting coordinate of this data node.
   * @property {Array<ChromRegionLiteral>} StartList - A list of data entries
   *    that __start exactly at__ the start coordinate of this node.
   *    `StartList` will become an empty array only if the previous bin is
   *    `null` (because otherwise this bin can be merged with the previous one),
   *    or this is the first bin of the storage unit;
   * @property {Array<ChromRegionLiteral>} ContList - A list of data entries
   *    that __continue into__ the start coordinate of this node. This array
   *    will be sorted by the actual starting points, `[]` will have the same
   *    effect as `undefined`. This is used in `GiveDataNodeBase.traverse` only
   *    at the first node. See `GiveDataNodeBase.traverse` for details.
   * @class give.DataNode
   *
   * @constructor
   * @implements give.GiveTreeNode
   * @param {object} props - properties that will be passed to the individual
   *    implementations. For `GIVE.DataNode`, three properties will be used:
   * @param {number} props.Start - for `this.Start`
   * @param {Array<ChromRegionLiteral>|null} props.StartList - for
   *    `this.StartList`
   * @param {Array<ChromRegionLiteral>|null} props.ContList - for
   *    `this.ContList`
   *
   */
  give.DataNode = function (props) {
    give.GiveTreeNode.call(this, arguments)
    this.Start = props.Start
    this.StartList = props.StartList || []
    this.ContList = props.ContList || []
  }

  give.extend(give.GiveTreeNode, give.DataNode)

  /**
   * Implementing GIVE.GiveTreeNode methods
   */

  /**
   * hasData - get whether this data node has data stored.
   *
   * @returns {type}  Because data node is populated with actual data,
   *    it will always return `true` (always has data).
   */
  give.DataNode.prototype.hasData = function () {
    return true
  }

  give.DataNode.prototype.getStart = function () {
    return this.Start
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
   *    After insertion, any entry within `data` that has `.getStart()` value
   *    larger than `this.getStart()` will be deleted from the array or marked
   *    for deletion via `props.DataIndex`. See `props.DataIndex` for details.
   * @param {ChromRegionLiteral} chrRanges - DataNode should not handle this.
   * @param {object} props - additional properties being passed onto nodes.
   * @param {Array<ChromRegionLiteral>} props.ContList - the list of data
   *    entries that should not start in `chrRange` but are passed from the
   *    earlier regions, this will be useful for later regions if date for
   *    multiple regions are inserted at the same time
   * @param {function|null} props.Callback - the callback function to be used
   *    (with the data entry as its sole parameter) when inserting
   * @param {object|null} props.ThisVar - `this` used in calling
   *    `props.Callback`.
   * @param {number|null} props.DataIndex - current index of `data` to start
   *    insertion. This is to optimize large insertions.
   *    If this is specified, after insertion it will be moved to the first
   *    data entry whose `.getStart()` is greater than `this.getStart()`, if no
   *    such entry exists, it will be moved to `data.length`.
   *    If this is not specified, after insertion, `data[0]` will become the
   *    first data entry whose `.getStart()` is greater than `this.getStart()`.
   *    Or `data` will become `[]` if no such entry exists.
   * @returns {give.DataNode} Always return `this`.
   */
  give.DataNode.prototype.insert = function (data, chrRange, props) {
    // Steps:
    // 1. Push everything in `data` that has `getStart()` value smalled than
    //    `this.getStart()` into `contList`
    // 2. Check all `contList` to ensure they still overlap with `this`
    //    (getEnd() should be greater than `this.getStart()`), remove those who
    //    don't, copy those who do to `this.ContList`;
    // 3. Find all `data` entries that have same `getStart()` value as `this`,
    //    and copy those to `this.StartList`, move them from `data` to
    //    `contList`;

    // Helper function: find `entries` in `data` that returns `true` with
    //    `critFunc.call(thisVarCriteria, entry)`, call `callback` on `entry`
    //    if `callback` exists and advance `currIndex`.

    // 1. Push everything in `data` that has `getStart()` value smaller than
    //    `this.getStart()` into `contList`
    var currIndex = (typeof props.DataIndex === 'number' ? props.DataIndex : 0)
    var prevIndex = currIndex
    props = props || {}
    currIndex = give._traverseData(data, currIndex, function (dataEntry) {
      return dataEntry.getStart() < this.getStart()
    }, this, props.Callback, props.ThisVar)

    // 2. Check all `contList` to ensure they still overlap with `this`
    //    (getEnd() should be greater than `this.getStart()`), remove those who
    //    don't, copy those who do to `this.ContList`;
    props.ContList = props.ContList || []
    props.ContList = props.ContList.concat(data.slice(prevIndex, currIndex))
    .filter(
      function (entry) {
        return entry.getEnd() > this.getStart()
      }, this
    )
    this.ContList = props.ContList.slice()

    // 3. Find all `data` entries that have same `getStart()` value as `this`,
    //    and copy those to `this.StartList`, move them from `data` to
    //    `contList`;
    prevIndex = currIndex
    currIndex = give._traverseData(data, currIndex, function (dataEntry) {
      return dataEntry.getStart() === this.getStart()
    }, this, props.Callback, props.ThisVar)
    this.StartList = data.slice(prevIndex, currIndex)

    if (typeof props.DataIndex !== 'number') {
      // remove data if props.currIndex is not specified
      data.splice(0, currIndex)
    } else {
      // update `props.currIndex`
      props.DataIndex = currIndex
    }

    return this
  }

  give.DataNode.prototype.remove = function (
    data, removeExactMatch, props
  ) {
    props = props || {}
    if (data instanceof this.constructor &&
      this.getStart() === data.getStart() && (
        (!removeExactMatch) || this._compareData(data, this)
      )
    ) {
      // this node should be removed
      this.clear()
      return false
    }
    if (data.getStart() === this.getStart()) {
      this.StartList = this.StartList.filter(function (dataIn) {
        if (!removeExactMatch || this._compareData(data, dataIn)) {
          if (typeof props.Callback === 'function') {
            props.Callback.call(props.ThisVar, dataIn)
          }
          return false
        }
        return true
      }, this)
    }
    this.ContList = this.ContList.filter(function (dataIn) {
      if (dataIn.getStart() === data.getStart() && (
        (!removeExactMatch) || this._compareData(data, dataIn)
      )) {
        if (typeof props.Callback === 'function') {
          props.Callback.call(props.ThisVar, dataIn)
        }
        return false
      }
      return true
    }, this)
    return (this.StartList.length > 0 || this.ContList.length > 0)
      ? this : false
  }

  give.DataNode.prototype.clear = function (convertTo) {
    this.StartList = []
    this.ContList = []
  }

  /**
   * traverse - traverse all nodes / data entries within `this` and calling
   *    functions on them.
   *
   * When traversing, everything in 'ContList' of *the starting record only*
   * will be processed first, then everything in 'StartList' in all overlapping
   * records will be processed.
   * @memberof DataNode.prototype
   *
   * @param  {ChromRegionLiteral} chrRange - the chromosomal range to traverse.
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
   * @returns {boolean} - whether future traverses should be conducted.
   */
  give.DataNode.prototype.traverse = function (
    chrRange, callback, thisVar, filter, breakOnFalse, props
  ) {
    // helper function
    var callFunc = this._callFuncOnDataEntry.bind(
      this, chrRange, callback, thisVar, filter, breakOnFalse)
    // needs to traverse on ContList if `!props.NotFirstCall`
    if (!props.NotFirstCall) {
      if (!this.ContList.every(callFunc, this)) {
        return false
      }
    }
    if (!this.StartList.every(callFunc, this)
    ) {
      return false
    }
    props.NotFirstCall = true
    return true
  }

  give.DataNode.prototype.getUncachedRange = function (chrRange, props) {
    return []
  }

  /**
   * merge - merge this node with `node`
   * If `node` doesn't have any data or anything in `StartList`, merge.
   * Actually because of the structure of `GIVE.DataNode`, nothing needs
   *    to be changed in `this` if merge is successful. Just return `true`
   *    to let the caller handle `node`.
   *
   * @param  {null|boolean|GiveDataNodeBase} node - node to be merged.
   * @returns {boolean}      whether the merge is successful
   */
  give.DataNode.prototype.merge = function (node) {
    return (
      node === false || (
        node instanceof this.constructor && node.StartList.length <= 0
      )
    )
  }

  return give
})(GIVe || {})
