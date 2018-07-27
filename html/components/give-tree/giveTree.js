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
   * @property {function} _NonLeafNodeCtor - Constructor for all non-leaf
   *    nodes
   * @property {function} _LeafNodeCtor - Constructor for all leaf nodes,
   * @property {boolean} neighboringLinks - Whether nodes in the tree will
   *    have links to their siblings
   * @class give.GiveTree
   */
  class GiveTree {
    /**
     * Creates an instance of GiveTree.
     *
     * @constructor
     * @param {ChromRegionLiteral} chrRange - The range this data storage unit
     *    will be responsible for.
     * @param {function} NonLeafNodeCtor - Constructor for `this._root`
     * @param {object} props - properties that will be passed to the
     *    individual implementations
     * @param {number} props.lifeSpan - Whether this tree shall wither.
     *    if `props
     * @param {function} props.LeafNodeCtor - if omitted, the constructor of
     *    `this.root` will be used
     * @memberof GiveTree
     */
    constructor (chrRange, NonLeafNodeCtor, props) {
      this.chr = chrRange.chr
      props = props || {}
      props.start = chrRange.start
      props.end = chrRange.end
      props.tree = this
      props.isRoot = true
      if ((typeof props.lifeSpan === 'number' && props.lifeSpan > 0) ||
        !props.lifeSpan
      ) {
        props.lifeSpan = props.lifeSpan || this.constructor.DEFAULT_LIFE_SPAN
        this._currGen = 0
        this.lifeSpan = props.lifeSpan
        this._root = new give.WitheringMixin(NonLeafNodeCtor)(props)
        this._witheringPromise = null
      } else {
        this._currGen = null
        this._root = new NonLeafNodeCtor(props)
      }
      this._LeafNodeCtor = props.LeafNodeCtor || NonLeafNodeCtor
    }

    get neighboringLinks () {
      return this.constructor.neighboringLinks
    }

    get coveringRange () {
      return new give.ChromRegion({
        chr: this.chr,
        start: this._root.start,
        end: this._root.end
      })
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
     * @param {object|null} props
     */
    _insertSingleRange (data, chrRange, props) {
      if (!chrRange || !chrRange.chr || chrRange.chr === this.chr) {
        props = props || {}
        props.contList = props.contList || []
        props.LeafNodeCtor = props.LeafNodeCtor || this._LeafNodeCtor
        chrRange = chrRange
          ? this._root.truncateChrRange(chrRange, true, false)
          : (data.length === 1 ? data[0] : this.coveringRange)
        this._root = this._root.insert(data, chrRange, props)
      }
    }

    /**
     * insert - Insert data entries within chromosomal range(s)
     * @memberof GiveTreeBase.prototype
     *
     * @param {Array<ChromRegionLiteral>} data - the sorted array of data
     *    entries (each should be an extension of `GIVe.ChromRegion`).
     *    `data === null` or `data === []` means there is no data in
     *    `chrRange` and `false`s will be used in actual storage.
     *    __NOTICE:__ any data overlapping `chrRange` should appear either
     *    here or in `continuedList`, otherwise `continuedList` in data
     *    entries may not work properly.
     * @param {Array<ChromRegionLiteral>|ChromRegionLiteral|null} chrRanges -
     *    the array of chromosomal range(s) that `data` corresponds to.
     *    This is used to mark the empty regions correctly. No `null` will
     *    present within these regions after this operation.
     *    The elements of this parameter should be an `Object` with at least
     *    two properties:
     *    `{ start: <start coordinate>, end: <end coordinate>, ... }`,
     *    preferably a `GIVe.ChromRegion` object.
     *    If `data.length === 1` and `chrRange === null`, then
     *    `chrRegion = data[0]` because of ChromRegion behavior.
     * @param {Array<ChromRegionLiteral>} continuedList - the list of data
     *    entries that should not start in `chrRange` but are passed from the
     *    earlier regions, this will be useful for later regions if data for
     *    multiple regions are inserted at the same time
     * @param {function|null} callback - the callback function to be used
     *    (with the data entry as its sole parameter) when inserting
     * @param {Array<object>|object|null} props - additional properties being
     *    passed onto nodes. If this is an `Array`, it should have the same
     *    `length` as `chrRanges` does.
     * @param {boolean} props.doNotWither - If `true`, the tree will not advance
     *    its generation or trigger withering.
     * @param {function|null} props.LeafNodeCtor - the constructor function of
     *    leaf nodes if they are not the same as the non-leaf nodes.
     */
    insert (data, chrRanges, props) {
      if (!props || !props.doNotWither) {
        this._advanceGen()
      }
      let exceptions = []
      if (Array.isArray(chrRanges)) {
        chrRanges.forEach((range, index) => {
          try {
            this._insertSingleRange(data, range,
              Array.isArray(props) ? props[index] : props)
          } catch (err) {
            err.message = '[insert] ' + err.message
            exceptions.push(err)
            return null
          }
        })
      } else {
        try {
          this._insertSingleRange(data, chrRanges, props)
        } catch (err) {
          err.message = '[insert] ' + err.message
          exceptions.push(err)
          return null
        }
      }
      if (!props || !props.doNotWither) {
        this._wither()
      }
      if (exceptions.length > 0) {
        let message = exceptions.reduce(
          (prevMessage, currErr) => (prevMessage + '\n' + currErr.message),
          'Exception occured during insertion:'
        )
        give._verbConsole.warn(message)
        give.fireSignal('warning', { msg: message }, null, this)
        throw new give.GiveError(message)
      }
    }

    /**
     * remove - Removing a single data entry.
     * @memberof GiveTreeBase.prototype
     *
     * @param  {ChromRegionLiteral} data - the data that needs to be removed
     * @param  {boolean} exactMatch - whether an exact match is needed
     *    to remove the entry. If `true`, then `.equalTo(data)` method (if
     *    exists within the data entry) or `===` (if no `equalTo` method
     *    exists) will be used to evaluate whether a data entry should be
     *    removed. If `false`, then all data entries at the same location
     *    (start and end) will be removed.
     * @param {boolean|null} convertTo - what shall be used to replace
     *    the removed nodes, should be either `null` (default) or `false`.
     * @param  {function|null} callback - the callback function to be used
     *    (with the data entry as its sole parameter) when the data entry
     *    is/entries are being removed.
     * @param  {object|null} props - additional properties being passed onto
     *    nodes
     */
    remove (data, exactMatch, convertTo, callback, props) {
      if (convertTo === undefined) {
        convertTo = null
      }
      props = props || {}
      props.callback = callback
      this._root = this._root.remove(data, exactMatch, convertTo, props)
    }

    _advanceGen (amount) {
      if (this._currGen !== null) {
        if (!this._witheringPromise) {
          this._currGen += (amount || 1)
          if (this._currGen >= this.constructor.MAX_GENERATION) {
            this._currGen = 0
          }
        }
      }
    }

    _wither () {
      if (this._currGen !== null) {
        this._witheringPromise = this._witheringPromise || Promise.resolve()
          .then(() => {
            this._root.wither()
            this._root = this._root.restructure()
            this._witheringPromise = null
          })
      }
    }

    /**
     * traverse - traverse given chromosomal range to apply functions to all
     * overlapping data entries.
     * @memberof GiveTreeBase.prototype
     *
     * @param {ChromRegionLiteral} chrRange - the chromosomal range to
     *    traverse. If omitted or falsey value is supplied, use the entire
     *    range.
     * @param {function} callback - the callback function to be used (with the
     *    data entry as its sole parameter) on all overlapping data entries
     *    (that pass `filter` if it exists).
     * @param {function} filter - the filter function to be used (with the
     *    data entry as its sole parameter), return `false` to exclude the
     *    entry from being called with `callback`.
     * @param {boolean} breakOnFalse - whether the traversing should break if
     *    `false` has been returned from `callback`
     * @param {object|null} props - additional properties being passed onto
     *    nodes
     * @param {boolean} props.doNotWither - If `true`, the tree will not advance
     *    its generation or trigger withering.
     * @returns {boolean} If the traverse breaks on `false`, returns `false`,
     *    otherwise `true`
     */
    traverse (chrRange, callback, filter, breakOnFalse, props, ...args) {
      props = props || {}
      if (!chrRange || !chrRange.chr || chrRange.chr === this.chr) {
        // implement withering parts:
        // 1. Advance `this._currGen` by 1
        if (!props.doNotWither) {
          this._advanceGen()
        }
        try {
          chrRange = chrRange
            ? this._root.truncateChrRange(chrRange, true, false)
            : this.coveringRange
          return this._traverse(chrRange, callback, filter,
            breakOnFalse, props, ...args)
        } catch (err) {
          give._verbConsole.warn(err)
          give.fireSignal('warning', { msg: err.toString() }, null, this)
          throw err
          // return false
        } finally {
          // 2. try to find any child that is too old
          //    (`this._currGen - birthGen > this.lifeSpan`) and remove them.
          if (!props.doNotWither) {
            this._wither()
          }
        }
      }
      return true
    }

    /**
     * _traverse - The actual function doing the traversing and should be
     *    overriden by sub classes.
     * @memberof GiveTreeBase.prototype
     *
     * @param {ChromRegionLiteral} chrRange - the chromosomal range to
     *    traverse. If omitted or falsey value is supplied, use the entire
     *    range.
     * @param {function} callback - the callback function to be used (with the
     *    data entry as its sole parameter) on all overlapping data entries
     *    (that pass `filter` if it exists).
     * @param {function} filter - the filter function to be used (with the
     *    data entry as its sole parameter), return `false` to exclude the
     *    entry from being called with `callback`.
     * @param {boolean} breakOnFalse - whether the traversing should break if
     *    `false` has been returned from `callback`
     * @param {object|null} props - additional properties being passed onto
     *    nodes
     * @returns {boolean} If the traverse breaks on `false`, returns `false`,
     *    otherwise `true`
     */
    _traverse (chrRange, callback, filter, breakOnFalse, props, ...args) {
      return this._root.traverse(chrRange, callback, filter,
        breakOnFalse, props, ...args)
    }

    /**
     * getUncachedRange - get an array of chrRegions that do not have data
     *    ready.
     * This is used for sectional loading.
     * @memberof GiveTreeBase.prototype
     *
     * @param {ChromRegionLiteral} chrRange - the chromosomal range to query
     * @param {object|null} props - additional properties being passed onto
     *    nodes
     * @returns {Array<ChromRegionLiteral>} the chromosomal ranges that do not
     *    have their data ready in this data storage unit (therefore need to
     *    be fetched from sources). If all the data needed is ready, `[]` will
     *    be returned.
     */
    getUncachedRange (chrRange, props) {
      props = props || {}
      if (!chrRange || !chrRange.chr || chrRange.chr === this.chr) {
        chrRange = chrRange
          ? this._root.truncateChrRange(chrRange, true, false)
          : this.coveringRange
        return this._root.getUncachedRange(chrRange, props)
      } else {
        return []
      }
    }
  }

  GiveTree.MAX_GENERATION = Number.MAX_SAFE_INTEGER - 100
  GiveTree.DEFAULT_LIFE_SPAN = 10

  give.GiveTree = GiveTree

  return give
})(GIVe || {})
