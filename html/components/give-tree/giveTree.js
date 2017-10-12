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
   * Object for data storage, most likely a tree of some sort
   * @typedef {object} GiveTreeBase
   * @property {string} chr - Chromosome that this data storage unit is for
   * @property {GiveTreeNode} _root - Root node object
   *
   * @class give.GiveTree
   *
   * @constructor
   * @param {ChromRegionLiteral} chrRange - The range this data storage unit
   *    will be responsible for.
   * @param {function|null} summaryCtor - The constructor of summary objects
   * @param {object} props - properties that will be passed to the individual
   *    implementations
   */
  give.GiveTree = function (chrRange, summaryCtor, props) {
    this.chr = chrRange.chr
    this._root = new give.GiveTreeNode(null, chrRange.start, chrRange.end,
      summaryCtor, null, null, bFactor, true, lifeSpan)
  }

  /**
   * _insertSingleRange - Insert data entries within a single range
   * Please refer to `this.insert` for parameter annotation
   * @memberof GiveTreeBase.prototype
   *
   * @param {Array<ChromRegionLiteral>} data
   * @param {ChromRegionLiteral|null} chrRange -
   *    the chromosomal range that `data` corresponds to.
   * @param {Array<ChromRegionLiteral>} continuedList
   * @param {function|null} callback
   * @param {number|null} resolution - the resolution of the data being
   *    inserted.
   * @param {object|null} props
   */
  give.GiveTree.prototype._insertSingleRange = function (
    data, chrRange, continuedList, callback, resolution, props
  ) {
    if (!chrRange.chr || chrRange.chr === this.chr) {
      this._root = this._root.insert(data, ((!chrRange && data.length === 1) ?
        data[0] : chrRange), continuedList,
        callback, resolution, props)
    }
  }

  /**
   * insert - Insert data entries within chromosomal range(s)
   * @memberof GiveTreeBase.prototype
   *
   * @param {Array<ChromRegionLiteral>} data - the sorted array of data entries
   *    (each should be an extension of `GIVe.ChromRegion`).
   *    `data === null` or `data === []` means there is no data in `chrRange`
   *    and `false`s will be used in actual storage.
   *    __NOTICE:__ any data overlapping `chrRange` should appear either here or
   *    in `continuedList`, otherwise `continuedList` in data entries may not
   *    work properly.
   * @param {Array<ChromRegionLiteral>|ChromRegionLiteral|null} chrRanges -
   *    the array of chromosomal range(s) that `data` corresponds to.
   *    This is used to mark the empty regions correctly. No `null` will present
   *    within these regions after this operation.
   *    The elements of this parameter should be an `Object` with at least two
   *    properties: `{ start: <start coordinate>, end: <end coordinate>, ... }`,
   *    preferably a `GIVe.ChromRegion` object.
   *    If `data.length === 1` and `chrRange === null`, then
   *    `chrRegion = data[0]` because of ChromRegion behavior.
   * @param {Array<ChromRegionLiteral>} continuedList - the list of data entries
   *    that should not start in `chrRange` but are passed from the earlier
   *    regions, this will be useful for later regions if date for multiple
   *    regions are inserted at the same time
   * @param {function|null} callback - the callback function to be used (with
   *    the data entry as its sole parameter) when inserting
   * @param {Array<number>|number|null} resolution - the resolution(s) of the
   *    data being inserted.  Smaller is finer. If this is an `Array`, it should
   *    have the same `length` as `chrRanges` does.
   * @param {object|null} props - additional properties being passed onto nodes
   */
  give.GiveTree.prototype.insert = function (
    data, chrRanges, continuedList, callback, resolution, props
  ) {
    continuedList = continuedList || []
    if (Array.isArray(chrRanges)) {
      chrRanges.forEach(function (range, index) {
        this._insertSingleRange(data, range, continuedList, callback,
          Array.isArray(resolution) ? resolution[index] : resolution, props)
      }, this)
    } else {
      this._insertSingleRange(data, chrRanges, continuedList, callback,
        resolution, props)
    }
  }

  /**
   * remove - Removing a single data entry.
   * @memberof GiveTreeBase.prototype
   *
   * @param  {ChromRegionLiteral} data - the data that needs to be removed
   * @param  {boolean} removeExactMatch - whether an exact match is needed to
   *    remove the entry. If `true`, then `.equalTo(data)` method (if exists
   *    within the data entry) or `===` (if no `equalTo` method exists) will be
   *    used to evaluate whether a data entry should be removed. If `false`,
   *    then all data entries at the same location (start and end) will be
   *    removed.
   * @param  {function|null} callback - the callback function to be used (with
   *    the data entry as its sole parameter) when the data entry is/entries are
   *    being removed.
   * @param  {object|null} props - additional properties being passed onto nodes
   */
  give.GiveTree.prototype.remove = function (
    data, removeExactMatch, callback, props
  ) {
    this._root = this._root.remove(data, removeExactMatch, callback, props)
  }

  /**
   * traverse - traverse given chromosomal range to apply functions to all
   * overlapping data entries.
   * @memberof GiveTreeBase.prototype
   *
   * @param {ChromRegionLiteral} chrRanges - the chromosomal range to traverse
   * @param {function} callback - the callback function to be used (with the
   *    data entry as its sole parameter) on all overlapping data entries
   *    (that pass `filter` if it exists).
   * @param {function} filter - the filter function to be used (with the data
   *    entry as its sole parameter), return `false` to exclude the entry from
   *    being called with `callback`.
   * @param {number|null} resolution - the resolution that is required, data
   *    entry (or summary entries) that can just meet this requirement will be
   *    chosen. Smaller is finer.
   * @param {Object} thisVar - `this` element to be used in `callback` and
   *    `filter`.
   * @param {boolean} breakOnFalse - whether the traversing should break if
   *    `false` has been returned from `callback`
   * @param {object|null} props - additional properties being passed onto nodes
   * @returns {boolean} If the traverse breaks on `false`, returns `false`,
   *    otherwise `true`
   */
  give.GiveTree.prototype.traverse = function (chrRange, callback, filter,
    resolution, thisVar, breakOnFalse, props) {
    if (!chrRange.chr || chrRange.chr === this.chr) {
      return this._root.traverse(chrRange, callback, filter,
        resolution, thisVar, breakOnFalse, false)
    }
  }

  /**
   * getUncachedRange - get an array of chrRegions that do not have data ready.
   * This is used for sectional loading.
   * @memberof GiveTreeBase.prototype
   *
   * @param {ChromRegionLiteral} chrRange - the chromosomal range to query
   * @param {number|null} resolution - the resolution that is required.
   *    Smaller is finer.
   * @param {number|null} bufferingRatio - the ratio to 'boost' `resolution` so
   *    that less data fetching may be needed.
   * @param {object|null} props - additional properties being passed onto nodes
   * @returns {Array<ChromRegionLiteral>} the chromosomal ranges that do not
   *    have their data ready in this data storage unit (therefore need to be
   *    fetched from sources). If all the data needed is ready, `[]` will be
   *    returned.
   */
  give.GiveTree.prototype.getUncachedRange = function (
    chrRange, resolution, bufferingRatio, props
  ) {
    if (!chrRange.chr || chrRange.chr === this.chr) {
      return this._root.getUncachedRange(chrRange, resolution,
        bufferingRatio, props)
    } else {
      return []
    }
  }

  return give
})(GIVe || {})
