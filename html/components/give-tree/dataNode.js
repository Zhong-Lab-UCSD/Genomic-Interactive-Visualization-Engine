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
   *    effect as `undefined`.
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

  give.DataNode.prototype.insert = function (
    data, chrRange, contList, callback, thisVar, props
  ) {
    // Steps:
    // 1. Push everything in `data` that has `getStart()` value smalled than
    //    `this` into `contList`
    // 2. Check all `contList` to ensure they still overlap with `this`
    //    (getEnd() should be greater than `this.getStart()`), remove those who
    //    don't, copy those who do to `this.ContList`;
    // 3. Find all `data` entries that have same `getStart()` value as `this`,
    //    and copy those to `this.StartList`, move them from `data` to
    //    `contList`;

    // Helper function: find `entries` in `data` that returns `true` with
    //    `critFunc.call(thisVarCriteria, entry)`, call `callback` on `entry`
    //    if `callback` exists and advance `currIndex`.
    function traverseData (
      data, currIndex, critFunc, thisVarCriteria, callback, thisVar
    ) {
      while (currIndex < data.length &&
        critFunc.call(thisVarCriteria, data[currIndex])
      ) {
        if (typeof callback === 'function') {
          callback.call(thisVar, data[currIndex])
        }
        currIndex++
      }
      return currIndex
    }

    // 1. Push everything in `data` that has `getStart()` value smaller than
    //    `this` into `contList`
    var currIndex = (typeof props.CurrIndex === 'number' ? props.CurrIndex : 0)
    var prevIndex = currIndex
    currIndex = traverseData(data, currIndex, function (dataEntry) {
      return dataEntry.getStart() < this.getStart()
    }, this, callback, thisVar)

    // 2. Check all `contList` to ensure they still overlap with `this`
    //    (getEnd() should be greater than `this.getStart()`), remove those who
    //    don't, copy those who do to `this.ContList`;
    contList = contList.concat(data.slice(prevIndex, currIndex)).filter(
      function (entry) {
        return entry.getEnd() > this.getStart()
      }, this
    )
    this.ContList = contList.slice()

    // 3. Find all `data` entries that have same `getStart()` value as `this`,
    //    and copy those to `this.StartList`, move them from `data` to
    //    `contList`;
    prevIndex = currIndex
    currIndex = traverseData(data, currIndex, function (dataEntry) {
      return dataEntry.getStart() === this.getStart()
    }, this, callback, thisVar)
    this.StartList = data.slice(prevIndex, currIndex)

    if (typeof props.currIndex !== 'number') {
      // remove data if props.currIndex is not specified
      data.splice(0, currIndex)
    } else {
      // update `props.currIndex`
      props.currIndex = currIndex
    }

    return this
  }

  give.DataNode.prototype.remove = function (
    data, removeExactMatch, callback, thisVar, props
  ) {
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
          if (typeof callback === 'function') {
            callback.call(thisVar, dataIn)
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
        if (typeof callback === 'function') {
          callback.call(thisVar, dataIn)
        }
        return false
      }
      return true
    }, this)
    return (this.StartList.length > 0 || this.ContList.length > 0)
      ? this : false
  }

  give.DataNode.prototype.clear = function () {
    this.StartList = []
    this.ContList = []
  }

  give.DataNode.prototype.traverse = function (
    chrRange, callback, filter, thisVar, breakOnFalse, props
  ) {
    // helper function
    var callFunc = this._callFuncOnDataEntry.bind(
      this, chrRange, callback, breakOnFalse, filter, thisVar)
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
    props.notFirstCall = true
    return true
  }

  give.DataNode.prototype.getUncachedRange = function (chrRange, props) {
    return []
  }

  return give
})(GIVe || {})
