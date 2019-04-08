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
   * Every record will serve as a bin, with a start and end coordinate, and
   * all records combined will serve as a division of the chromosome (no gap,
   * no overlap) with all the start value for dividing points.
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
   *    `null`:   data not loaded yet, when upper layer encounter this, the
   *              code there needs to retrieve potential data;
   *    `false`:  there is no data in this bin;
   *    A `GIVe.DataNode` instance:
   *              the instance of a class described in this file
   *
   * @typedef {object} GiveDataNodeBase
   * @property {number} start - the starting coordinate of this data node.
   * @property {Array<ChromRegionLiteral>} startList - A list of data entries
   *    that __start exactly at__ the start coordinate of this node.
   *    `startList` will become an empty array only if the previous bin is
   *    `null` (because otherwise this bin can be merged with the previous
   *    one), or this is the first bin of the storage unit;
   * @property {Array<ChromRegionLiteral>} contList - A list of data entries
   *    that __continue into__ the start coordinate of this node. This array
   *    will be sorted by the actual starting points, `[]` will have the same
   *    effect as `undefined`. This is used in `GiveDataNodeBase.traverse`
   *    only at the first node. See `GiveDataNodeBase.traverse` for details.
   * @class give.DataNode
   *
   * @implements give.GiveTreeNode
   */
  class DataNode extends give.GiveTreeNode {
    /**
     * Creates an instance of DataNode.
     * @constructor
     * @param {object} props - properties that will be passed to the
     *    individual implementations. For `GIVE.DataNode`, three properties
     *    will be used:
     * @param {number} props.start - for `this.start`
     * @param {Array<ChromRegionLiteral>|null} props.startList - for
     *    `this.startList`
     * @param {Array<ChromRegionLiteral>|null} props.contList - for
     *    `this.contList`
     * @memberof DataNode
     */
    constructor (props) {
      super(props)
      this._start = props.start
      this.startList = props.startList || []
      this.contList = props.contList || []
    }

    /**
     * Implementing GIVE.GiveTreeNode methods
     */

    /**
     * hasData - get whether this data node has data stored.
     *
     * @returns {type}  Because data node is populated with actual data,
     *    it will always return `true` (always has data).
     */
    hasData () {
      return true
    }

    get start () {
      return this._start
    }

    /**
     * insert - Insert data under this node
     * @memberof GiveNonLeafNode.prototype
     *
     * @param {Array<ChromRegionLiteral>} data - the sorted array of data
     *    entries (each should be an extension of `GIVe.ChromRegion`).
     *    `data === null` or `data === []` means there is no data in
     *    `chrRange` and `false`s will be used in actual storage.
     *    __NOTICE:__ any data overlapping `chrRange` should appear either
     *    here or in `continuedList`, otherwise `continuedList` in data
     *    entries may not work properly.
     *    After insertion, any entry within `data` that has `.start` value
     *    larger than `this.start` will be deleted from the array or marked
     *    for deletion via `props.dataIndex`. See `props.dataIndex` for
     *    details.
     * @param {ChromRegionLiteral} chrRanges - DataNode should not handle
     *    this.
     * @param {object} props - additional properties being passed onto nodes.
     * @param {Array<ChromRegionLiteral>} props.contList - the list of data
     *    entries that should not start in `chrRange` but are passed from the
     *    earlier regions, this will be useful for later regions if date for
     *    multiple regions are inserted at the same time
     * @param {function|null} props.callback - the callback function to be
     *    used (with the data entry as its sole parameter) when inserting
     * @param {number|null} props.dataIndex - current index of `data` to start
     *    insertion. This is to optimize large insertions.
     *    If this is specified, after insertion it will be moved to the first
     *    data entry whose `.start` is greater than `this.start`, if no
     *    such entry exists, it will be moved to `data.length`.
     *    If this is not specified, after insertion, `data[0]` will become the
     *    first data entry whose `.start` is greater than `this.start`.
     *    Or `data` will become `[]` if no such entry exists.
     * @returns {give.DataNode} Always return `this`.
     */
    insert (data, chrRange, props) {
      // Steps:
      // 1. Push everything in `data` that has `start` value smaller than
      //    `this.start` into `contList`
      props = props || {}
      var currIndex =
        (typeof props.dataIndex === 'number' ? props.dataIndex : 0)
      var prevIndex = currIndex
      currIndex = give._traverseData(data, currIndex,
        dataEntry => dataEntry.start < this.start, props.callback)

      // 2. Check all `contList` to ensure they still overlap with `this`
      //    (getEnd() should be greater than `this.start`), remove those who
      //    don't, copy those who do to `this.contList`;
      props.contList = (props.contList || [])
        .concat(data.slice(prevIndex, currIndex))
        .filter(entry => entry.end > this.start)
      this.contList = props.contList.slice()

      // 3. Find all `data` entries that have same `start` value as `this`,
      //    and copy those to `this.startList`, move them from `data` to
      //    `contList`;
      prevIndex = currIndex
      currIndex = give._traverseData(data, currIndex,
        dataEntry => dataEntry.start === this.start, props.callback)
      this.startList = data.slice(prevIndex, currIndex)
      props.contList = props.contList.concat(this.startList)

      if (typeof props.dataIndex !== 'number') {
        // remove data if props.currIndex is not specified
        data.splice(0, currIndex)
      } else {
        // update `props.currIndex`
        props.dataIndex = currIndex
      }

      return this
    }

    remove (data, exactMatch, props) {
      props = props || {}
      if (data instanceof this.constructor && this.start === data.start && (
        (!exactMatch) || this._compareData(data, this)
      )) {
        // this node should be removed
        this.clear()
        return false
      }
      if (data.start === this.start) {
        this.startList = this.startList.filter(dataIn => {
          if (!exactMatch || this._compareData(data, dataIn)) {
            if (typeof props.callback === 'function') {
              props.callback(dataIn)
            }
            return false
          }
          return true
        })
      }
      this.contList = this.contList.filter(dataIn => {
        if (dataIn.start === data.start && (
          !exactMatch || this._compareData(data, dataIn)
        )) {
          if (typeof props.callback === 'function') {
            props.callback(dataIn)
          }
          return false
        }
        return true
      })
      return this.isEmpty ? false : this
    }

    clear (convertTo) {
      this.startList = []
      this.contList = []
    }

    /**
     * traverse - traverse all nodes / data entries within `this` and calling
     *    functions on them.
     *
     * When traversing, everything in 'contList' of *the starting record only*
     * will be processed first, then everything in 'startList' in all
     * overlapping records will be processed.
     * @memberof DataNode.prototype
     *
     * @param  {ChromRegionLiteral} chrRange - the chromosomal range
     *    to traverse.
     * @param  {function} callback - the callback function, takes a
     *    `GIVE.ChromRegion` object as its sole parameter and returns
     *    something that can be evaluated as a boolean value to determine
     *    whether the call shall continue (if `breakOnFalse === true`).
     * @param  {function|null} filter - a filter function that takes a
     *    `GIVE.ChromRegion` object as its sole parameter and returns whether
     *    the region should be included in traverse.
     * @param  {boolean} breakOnFalse - whether the traverse should be stopped
     *    if `false` is returned from the callback function.
     * @param  {object|null} props - additional properties being
     *    passed onto nodes.
     * @param  {...any} args - additional args being passed onto `callback`
     *    and `filter`
     * @param  {boolean} props.notFirstCall - whether this is not the first
     *    call of a series of `traverse` calls.
     * @returns {boolean} - whether future traverses should be conducted.
     */
    traverse (chrRange, callback, filter, breakOnFalse, props, ...args) {
      // helper function
      let callFunc = entry => {
        // First determine if `chrRange` exists and does not overlap
        // `dataEntry`. If so, return `true` to proceed with the next
        if (chrRange &&
          (chrRange.start >= entry.end || entry.start >= chrRange.end)
        ) {
          return true
        }
        // If `chrRange` does not exist or overlaps `dataEntry`
        // call `callback` and return its value (applying `filter` and
        // `breakOnFalse`).
        return this._callFuncOnDataEntry(callback, filter, breakOnFalse,
          entry, props, ...args)
      }
      // needs to traverse on contList if `!props.notFirstCall`
      if (!props.notFirstCall) {
        if (!this.contList.every(callFunc)) {
          return false
        }
      }
      props.notFirstCall = true
      return this.startList.every(callFunc)
    }

    hasUncachedRange (chrRange, props) {
      return false
    }

    getUncachedRange (chrRange, props) {
      return props._result || []
    }

    /**
     * mergeAfter - merge this node with `node`
     * If `node` doesn't have any data or anything in `startList`, merge.
     * Actually because of the structure of `GIVE.DataNode`, nothing needs
     *    to be changed in `this` if merge is successful. Just return `true`
     *    to let the caller handle `node`.
     *
     * @param  {null|boolean|GiveDataNodeBase} node - node to be merged.
     *    Note that this node has to be positioned after `this`.
     * @returns {boolean}      whether the merge is successful
     */
    mergeAfter (node) {
      if (
        node === false || (
          node instanceof this.constructor && node.startList.length <= 0
        )
      ) {
        return true
      } else if (node instanceof this.constructor) {
        // the node is not mergable, but its contList may be updated
        let contList = this.contList.concat(this.startList).filter(
          entry => (entry.end > node.start))
        if (node.contList.length > contList.length) {
          give._verbConsole.warn('Warning: continuedList inconsistent.')
        }
        node.contList = contList
      } 
      return false
    }

    /**
     * isEmpty - return whether this node is empty
     * If there is no entry in both `this.startList` and `this.contList` then
     *    the node is considered empty.
     *
     * @returns {boolean}      whether the node is empty
     */
    get isEmpty () {
      return this.startList.length <= 0 && this.contList.length <= 0
    }
  }

  give.DataNode = DataNode
  return give
})(GIVe || {})
