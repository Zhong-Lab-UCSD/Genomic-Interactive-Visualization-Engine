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
   * Node interface for GIVE Trees
   *
   * @typedef {object} GiveTreeNode

   * @interface give.GiveTreeNode
   *
   * @constructor
   */
  give.GiveTreeNode = function () {
  }

  /**
   * hasData - get whether this data node has data stored.
   *
   * @returns {boolean}  Return `true` if the data is ready, otherwise `false`.
   *    Return `false` by default since this basic implementation does not
   *    include summaries.
   */
  give.GiveTreeNode.prototype.hasData = function () {
    return false
  }

  /**
   * getStart - get the start coordinate of the region covered by this node
   * @memberof GiveTreeNode.prototype
   *
   * @returns {number}  The start coordinate.
   */
  give.GiveTreeNode.prototype.getStart = function () {
    throw new Error('GiveTreeNode.getStart not implemented in `' +
      this.constructor.name + '`!')
  }

  /**
   * setStart - set the start coordinate of the region covered by this node
   * @memberof GiveTreeNode.prototype
   *
   * @param {number} newStart - The new start coordinate.
   */
  give.GiveTreeNode.prototype.setStart = function (newStart) {
    give._verboseConsole('GiveTreeNode.setStart gets called but has not been ' +
      'implemented in `' + this.constructor.name + '`.', give.VERBOSE_WARNING)
  }

  /**
   * insert - Insert data under this node
   * @memberof GiveTreeNode.prototype
   *
   * @param {Array<ChromRegionLiteral>} data - the sorted array of data entries
   *    (each should be an extension of `GIVe.ChromRegion`).
   *    `data === null` or `data === []` means there is no data in `chrRange`
   *    and `false`s will be used in actual storage.
   *    __NOTICE:__ any data overlapping `chrRange` should appear either here or
   *    in `continuedList`, otherwise `continuedList` in data entries may not
   *    work properly.
   *    After insertion, any entry within `data` that overlaps `chrRange` Will
   *    be deleted from the array __unless `props.currIndex` is provided__ in
   *    the parameter, see `props.currIndex` below.
   * @param {ChromRegionLiteral} chrRange - the chromosomal range that `data`
   *    corresponds to.
   *    This is used to mark the empty regions correctly. No `null` will present
   *    within these regions after this operation.
   *    This parameter should be an `Object` with at least two properties:
   *    `{ start: <start coordinate>, end: <end coordinate>, ... }`,
   *    preferably a `GIVe.ChromRegion` object.
   * @param {object|null} props - additional properties being
   *    passed onto nodes.
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
   * @param {number|null} props.DataIndex - the current index of `data`.
   *    If this is specified, no array splicing will be done on `data` to
   *    improve performance. `props.currIndex` will be shifted (and passed
   *    back).
   * @returns {give.GiveTreeNode}
   *    Return `this`.
   *    This is reserved for tree structures that may change after insertion.
   *    For example, auto-balancing trees may return multiple entries,
   *    indicating siblings being created.
   */
  give.GiveTreeNode.prototype.insert = function (data, chrRange, props) {
    throw new Error('GiveTreeNode.insert not implemented in `' +
      this.constructor.name + '`!')
  }

  /**
   * remove - Remove data entries from the node.
   *    Data entries with the same start (and end values if exists) will be
   *    removed. If multiple entries are found with the same start (and end
   *    values), the behavior will be defined by `removeExactMatch`.
   * @memberof GiveTreeNode.prototype
   *
   * @param  {ChromRegionLiteral|GiveTreeNode} data - the data entry being
   *    removed.
   * @param  {boolean} removeExactMatch - whether an exact match is needed to
   *    remove multiple data entries with the same start and end values.
   *    If `true`, `data` will be compared by `.equalTo(data)` if exists,
   *    `===` if not. (this is done via calling
   *    `this.constructor._compareData(dataIn, dataEx)`)
   *    If `false`, all entries matching the start and end values will be
   *    removed.
   * @param  {object|null} props - additional properties being
   *    passed onto nodes.
   * @param {boolean|null} props.ConvertTo - what shall be used to replace
   *    the removed nodes, should be either `null` (default) or `false`.
   * @param {function|null} props.Callback - the callback function to be used
   *    (with the data entry as its sole parameter) when deleting
   * @param {object|null} props.ThisVar - `this` used in calling
   *    `props.Callback`.
   * @returns {give.GiveTreeNode|boolean}
   *    This shall reflect whether auto-balancing is supported for the tree.
   *    See `give.GiveNonLeafNode.prototype._restructuring` for details.
   *    If `this` gets deleted and is not root, return `false` and let the
   *    caller (likely the parent node) handle the upper structure.
   */
  give.GiveTreeNode.prototype.remove = function (
    data, removeExactMatch, props
  ) {
    throw new Error('GiveTreeNode.remove not implemented in `' +
      this.constructor.name + '`!')
  }

  /**
   * _compareData - Compare an internal data entry with an external entry.
   * @memberof GiveTreeNode.prototype
   *
   * @param  {ChromRegionLiteral|GiveTreeNode} dataEx - the external data entry.
   * @param  {ChromRegionLiteral|GiveTreeNode} dataIn - the internal data entry.
   * @returns {boolean} whether the two data entries match.
   */
  give.GiveTreeNode.prototype._compareData = function (dataEx, dataIn) {
    return dataIn &&
      ((typeof dataIn.equalTo === 'function' && dataIn.equalTo(dataEx)) ||
      dataIn === dataEx)
  }

  /**
   * clear - clear everything within this node and make it empty (basic
   *    properties should still be retained).
   * @param {boolean|null} convertTo - what shall be used to replace the
   *    removed contents, should be either `null` (default) or `false`.
   */
  give.GiveTreeNode.prototype.clear = function (convertTo) {
    throw new Error('GiveTreeNode.remove not implemented in `' +
      this.constructor.name + '`!')
  }

  /**
   * _callFuncOnDataEntry - helper function to call `callback` on data entries.
   * @memberof GiveTreeNode.prototype
   *
   * @param  {ChromRegionLiteral|null} chrRange - the chromosomal range, if
   *    provided, data should overlap with chrRange to be called.
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
   * @param  {ChromRegionLiteral|GiveTreeNode} dataEntry - the data entry
   *    `callback` is going to be called upon.
   * @returns {boolean} - whether future traverses should be conducted.
   */
  give.GiveTreeNode.prototype._callFuncOnDataEntry = function (
    chrRange, callback, thisVar, filter, breakOnFalse, dataEntry
  ) {
    if (
      (!chrRange || (chrRange.getStart() < dataEntry.getEnd() &&
        dataEntry.getStart() < chrRange.getEnd())) &&
      (typeof filter !== 'function' || filter.call(thisVar, dataEntry))
    ) {
      if (!callback.call(thisVar, dataEntry) && breakOnFalse) {
        return false
      }
    }
    return true
  }

  /**
   * traverse - traverse all nodes / data entries within `this` and calling
   *    functions on them.
   * @memberof GiveTreeNode.prototype
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
  give.GiveTreeNode.prototype.traverse = function (
    chrRange, callback, thisVar, filter, breakOnFalse, props
  ) {
    throw new Error('GiveTreeNode.traverse not implemented in `' +
      this.constructor.name + '`!')
  }

  /**
   * getUncachedRange - Return an array of chrRegions that does not have data
   *   loaded to allow buffered loading of data
   *
   * @param  {ChromRegionLiteral} chrRange - The range of query.
   * @param  {object|null} props - additional properties being passed onto nodes
   * @returns {Array<ChromRegionLiteral>} An ordered array of the regions that
   *    does not have the data at the current resolution requirement. If no
   *    such range is needed, return `[]`
   */
  give.GiveTreeNode.prototype.getUncachedRange = function (chrRange, props) {
    throw new Error('GiveTreeNode.getUncachedRange not implemented in `' +
      this.constructor.name + '`!')
  }

  return give
})(GIVe || {})
