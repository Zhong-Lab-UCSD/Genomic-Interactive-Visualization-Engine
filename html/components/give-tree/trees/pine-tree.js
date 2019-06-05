/*
	Chrom Buffer tree

    This is a wrapper for giveTreeNode to handle root changes

*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '../../basic-func/basic-func.js';

import '../../chrom-region/chrom-region.js';
import '../give-tree.js';
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
   *
   * @typedef {object} PineNode
   * @property {boolean} isRoot
   * @property {Array<number>} keys
   * @property {Array<GiveTreeNode|null|boolean>} values
   * @property {number} reverseDepth
   * @property {GiveTree} tree - Link to the `GiveTree` object to access tree-
   *    wise properties.
   * @property {number} tree.scalingFactor - The scaling factor for the pine
   *    tree.
   *    This is the factor for non-leaf nodes (this will be used to initialize
   *    `this.tree.leafScalingFactor` if the latter is not initialized.).
   * @property {number} tree.leafScalingFactor - The scaling factor for the
   *    leaf nodes of the pine tree.
   *    For example, if `this.tree.leafScalingFactor === 100`, each leaf node
   *    (`give.DataNode`) shall cover 100bp.
   * @property {function|null} tree._SummaryCtor - The constructor for a data
   *    summary.
   * @property {object|null} Summary - The data summary for this node.
   *
   * @class give.PineNode
   *
   */
  class PineNode extends give.GiveNonLeafNode {
    /**
     * Creates an instance of PineNode.
     * @constructor
     * @param {object} props
     * @param {GiveTree} props.tree - for `this.tree`
     * @param {boolean} props.isRoot
     * @param {number} props.start
     * @param {number} props.end
     * @param {number|null} props.reverseDepth
     * @memberof PineNode
     */
    constructor (props) {
      super(...arguments)

      // Note that `this.reverseDepth` should be depending on both scaling
      //    factors.
      if (this.end - this.start <= this.tree.leafScalingFactor) {
        this.reverseDepth = 0
      } else {
        this.reverseDepth = Math.ceil(
          (Math.log(this.end - this.start) -
            Math.log(this.tree.leafScalingFactor)
          ) / Math.log(this.tree.scalingFactor))
      }

      this._summary = null
    }

    get hasData () {
      return this.summary !== null
    }

    /**
     * childHasData - whether the data of the child node is there
     *
     * @param  {number} index - index of the child node
     * @returns {boolean} - `true` if the data is ready, `false` if not.
     */
    childHasData (index) {
      return this.values[index] === false ||
        (this.values[index] !== null && this.values[index].hasData)
    }

    /**
     * _getResolutionAtDepth - get the resolution of any data node given the
     *    reversed depth of the node.
     *
     * @param {number} revDepth - the reversed depth of the node.
     * @returns {number}  Return the resolution (span of the node),
     *    1 is the smallest (finest)
     */
    _getResolutionAtDepth (revDepth) {
      return parseInt(Math.floor(this.tree.scalingFactor ** revDepth *
        this.tree.leafScalingFactor))
    }

    /**
     * getResolution - get the resolution of this data node
     *
     * @returns {number}  Return the resolution (span of the node),
     *    1 is the smallest (finest)
     */
    get resolution () {
      return this._getResolutionAtDepth(this.reverseDepth)
    }

    /**
     * getChildResolution - get the resolution of a child data node
     *
     * @param  {number|null} index - index of the child node, if `null`, then
     *    return the supposed child resolution (because it should be fixed in
     *    pine trees.)
     * @returns {number} - resolution of the child
     */
    getChildResolution (index) {
      // if index is a number, then it's asking for the resolution of that
      //   specific child, otherwise it's a generalized child resolution
      if (!isNaN(index) && parseInt(index) === index) {
        // Specialized child resolution
        if (this.reverseDepth <= 0 || this.values[index] === false) {
          return 1
        } else if (this.values[index] && this.values[index].resolution) {
          return this.values[index].resolution
        }
      }
      // Generalized child resolution
      return this.reverseDepth > 0
        ? this._getResolutionAtDepth(this.reverseDepth - 1)
        : 1
    }

    /**
     * resolutionEnough - get whether the resolution of this data node is enough
     *    for the given resolution requirement.
     *
     * @param  {number|null} resolution - the resolution required, if `null`,
     *    use `1` (the finest) instead
     * @returns {boolean}  Return `true` if the resolution is enough,
     *    otherwise `false`.
     */
    resolutionEnough (resolution) {
      resolution = (typeof resolution === 'number' && !isNaN(resolution))
        ? resolution : 1
      return this.resolution <= resolution
    }

    /**
     * childResolutionEnough - get whether the resolution of a child is enough
     *    for the given resolution requirement.
     *
     * @param  {number|null} resolution - the resolution required, if `null`,
     *    use `1` (the finest) instead for the required resolution.
     * @param  {number|null} index - index of the child node, if `null`, then
     *    return the supposed child resolution (because it should be fixed in
     *    pine trees.)
     * @returns {boolean}  Return `true` if the resolution is enough,
     *    otherwise `false`.
     */
    childResolutionEnough (resolution, index) {
      resolution = (typeof resolution === 'number' && !isNaN(resolution))
        ? resolution : 1
      return this.getChildResolution(index) <= resolution
    }

    /**
     * _getClosestResolution - get the closest resolution that is adequate for the
     *    required resolution.
     *
     * @param {number} requiredRes - the required resolution.
     * @returns {number}  Return the closest resolution that is smaller or equal
     *    to `requiredRes`.
     */
    _getClosestResolution (requiredRes) {
      if (requiredRes >= this.tree.leafScalingFactor) {
        return parseInt(Math.floor(this.tree.scalingFactor **
          Math.floor((Math.log(requiredRes / this.tree.leafScalingFactor)) /
            Math.log(this.tree.scalingFactor)) * this.tree.leafScalingFactor
        ))
      }
      return 1
    }

    /**
     * fitResolution - fit coordinates to resolution requirements.
     *    This is mainly used in cases when a value is put into a series of
     *    consecutive bins of `resolution` size, and we need to find the
     *    boundary of the bin. For example, if we put 12 into bins of 10, then
     *    we'll need either 10 or 20, depending on whether we need the lower
     *    boundary or the upper one.
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
    static fitResolution (value, resolution, roundingFunc) {
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
    updateSummary (chromEntry) {
      if (typeof this.tree._SummaryCtor === 'function') {
        let newSummary
        if (chromEntry) {
          newSummary = this.tree._SummaryCtor.extract(chromEntry)
        }
        if (newSummary instanceof this.tree._SummaryCtor) {
          // summary provided, just replace
          this._summary = newSummary
          this._summaryChromRegion = chromEntry
        } else if (!this.summary) {
          if (newSummary) {
            // newSummary is something with wrong type
            give._verbConsole.info(newSummary + ' is not a correct summary ' +
              'type. Will be regenerated from tree data.')
          }
          newSummary = new this.tree._SummaryCtor()
          if (this.values.every((nodeEntry, index) => {
            if (nodeEntry === false) {
              // Child is zero, just return true
              return true
            }
            if (nodeEntry === null ||
              (this.reverseDepth > 0 && nodeEntry.summary === null)) {
              return false
            }
            if (this.reverseDepth > 0) {
              newSummary.addSummary(this, nodeEntry.summary)
            } else {
              nodeEntry.traverse(null, chromEntryInDataNode =>
                newSummary.addDataFromChromEntry(this, chromEntryInDataNode),
              null, false, { notFirstCall: true })
            }
            return true
          })) {
            this._summary = newSummary
            this._summaryChromRegion = this.summary.attach(
              new give.ChromRegion({
                chr: this.tree.chr,
                start: this.start,
                end: this.end
              })
            )
          } else {
            this._summary = this._summary || null
            delete this._summaryChromRegion
          }
        }
      }
      return true
    }

    /**
     * getSummaryData - get the summary data of `this`
     *
     * @returns {_SummaryCtor|null}  the summary data, or `null`
     */
    get summary () {
      return this._summary
    }

    /**
     * getSummaryChromRegion - get a `ChromRegion` object including the summary
     *    data of `this` as its `._summary` property.
     *
     * @param {string} chr - chromosome for the `ChromRegion` object
     * @returns {ChromRegionLiteral|null}  the `ChromRegion` object, or `null`
     */
    get summaryChromRegion () {
      return this._summaryChromRegion || null
    }

    /**
     * insert - Insert data under this node
     * @memberof PineNode.prototype
     *
     * @param {Array<ChromRegionLiteral>} data - the sorted array of data
     *    entries (each should be an extension of `GIVe.ChromRegion`).
     *    `data === null` or `data === []` means there is no data in
     *    `chrRange` and `false`s will be used in actual storage.
     *    __NOTICE:__ any data overlapping `chrRange` should appear either
     *    here or in `continuedList`, otherwise `continuedList` in data
     *    entries may not work properly.
     *    After insertion, any entry within `data` that overlaps `chrRange`
     *    will be deleted from the array.
     * @param {ChromRegionLiteral} chrRange - the chromosomal range that
     *    `data` corresponds to.
     *    This is used to mark the empty regions correctly. No `null` will
     *    present within these regions after this operation.
     *    This parameter should be a `GIVe.ChromRegion` object.
     * @param {number} chrRange.resolution - the resolution provided for the
     *    insertion. 1 is finest. This is used in case of mixed resolutions
     *    for different `chrRange`s, This will override `props.resolution` if
     *    both exist.
     * @param {object|null} props - additional properties being passed onto
     *    nodes.
     * @param {Array<ChromRegionLiteral>} props.contList - the list of data
     *    entries that should not start in `chrRange` but are passed from the
     *    earlier regions, this will be useful for later regions if date for
     *    multiple regions are inserted at the same time
     * @param {function|null} props.callback - the callback function to be
     *    used (with the data entry as its sole parameter) when inserting
     * @param {number} props.resolution - the resolution provided for the
     *    insertion. 1 is finest. This will be overridden by
     *    `chrRange.resolution` if both exist.
     * @param {function|null} props.LeafNodeCtor - the constructor function of
     *    leaf nodes if they are not the same as the non-leaf nodes.
     * @returns {give.GiveNonLeafNode|Array<give.GiveNonLeafNode>}
     *    This shall reflect whether auto-balancing is supported for the tree.
     *    See `give.GiveNonLeafNode.prototype._restructure` for details.
     */
    insert (data, chrRange, props) {
      props = props || {}
      if (data && data.length === 1 && !chrRange) {
        chrRange = data[0]
      }

      if (data && !Array.isArray(data)) {
        throw (new give.GiveError('Data is not an array! ' +
          'This will cause problems in contList.'))
      }

      if (chrRange) {
        let resolution = chrRange.resolution || props.resolution || 1
        // clip chrRegion first (should never happen)
        chrRange = this.truncateChrRange(chrRange, true, true)
        // First, if this 'insertion' is just updating the summary data of
        //    self, just update.
        // Then, there are three cases for insertion:
        // 1. leaf nodes: use `give.DataNode` to store raw data
        // 2. non-leaf nodes:
        //    go deep to generate branch structure, or update summary
        //    (for trees that support summary and resolutions)
        if (this.resolutionEnough(resolution)) {
          // check whether the data summary matches the node boundary
          // because data retrieval may be out of sync, redundant data will need
          //    to be discarded
          while (data.length && this.start > data[0].start) {
            data.splice(0, 1)
          }
          if (data.length) {
            if (this.start !== data[0].start || this.end !== data[0].end) {
              if (!(this.hasData)) {
                if (this.end <= data[0].start) {
                  this.updateSummary(new this.tree._SummaryCtor())
                } else {
                  throw new give.GiveError('Summary range does not match! ' +
                    '`this`: ' + this.start + ' - ' + this.end + '; data: ' +
                    data[0].start + ' - ' + data[0].end
                  )
                }
              }
            } else {
              // ***** This should fit Summary definition *****
              this.updateSummary(data[0])
              if (typeof props.callback === 'function') {
                props.callback(data[0])
              }
              data.splice(0, 1)
            }
          }
        } else if (this.reverseDepth > 0) {
          // case 2
          this._addNonLeafRecords(data, chrRange, props)
        } else {
          // case 1
          this._addLeafRecords(data, chrRange, props)
        }
        this.updateSummary()
      } else { // chrRange
        throw (new give.GiveError(chrRange + ' is not a valid chrRegion.'))
      } // end if(chrRange)
      return this._restructure()
    }

    _addNonLeafRecords (data, chrRange, props) {
      // This function adds record(s), and structures of the tree

      // In leaf nodes, the actual record trunks may need to be split before
      //    range just to keep the loaded status correct.

      // Find the range of child that rangeStart is in
      let currIndex = 0
      let childRes = this.getChildResolution()
      let childRange = chrRange.clone()

      // Steps:
      // 1. Find the range where the first child node should be inserted.
      //    This should be the node where `chrRange.start` falls in.
      // 2. Split children if possible to create the dedicated range for the
      //    child.
      // 3. Check if the child node contains actual data (by checking
      //    `data[currDataIndex]`).
      //    If yes, create a non-leaf node on the dedicated range and call
      //    `child.insert` on the dedicated range, `data` and `props`;
      //    otherwise, use `false` to fill the dedicated range and merge with
      //    previous `false`s if possible.

      while (chrRange.start < chrRange.end) {
        // 1. Find the range where the first child node should be inserted.
        //    This should be the node where `chrRange.start` falls in.
        let newRangeStart = this.constructor.fitResolution(
          chrRange.start, childRes, Math.floor
        )
        let newRangeEnd = Math.min(this.end,
          this.constructor.fitResolution(chrRange.end, childRes, Math.ceil),
          newRangeStart + childRes
        )
        childRange.end = newRangeEnd
        childRange.start = newRangeStart

        while (this.keys[currIndex + 1] <= childRange.start) {
          currIndex++
        }

        // 2. Split children if possible to create the dedicated range for the
        //    child.
        if (this.keys[currIndex] < childRange.start) {
          // If there are spaces before the dedicated range
          this._splitChild(currIndex++, childRange.start)
        }

        if (this.keys[currIndex + 1] > childRange.end) {
          // If there are spaces after the dedicated range
          this._splitChild(currIndex, childRange.end)
        }

        // Now the dedicated range is ready

        // 3. Check if the child node contains actual data (by checking
        //    `data[currDataIndex]`), or the (probably empty) data range falls
        //    within child range.
        //    otherwise, use `false` to fill the dedicated range and merge with
        //    previous `false`s if possible.
        //    Note that if `props.contList` has stuff, this should be considered
        //    as CONTAIN data, so it should still goes all the way down to
        //    `give.DataNode`
        let fixChildFlag = false

        if ((data[0] && data[0].start < childRange.end) ||
          (Array.isArray(props.contList) &&
            props.contList.some(entry => entry.end > childRange.start)) ||
          (chrRange.start > childRange.start || chrRange.end < childRange.end)
        ) {
          // If yes, create a non-leaf node on the dedicated range and call
          // `child.insert` on the dedicated range, `data` and `props`;
          if (!this.values[currIndex]) {
            // try to establish previous nodes
            this.values[currIndex] = new give.PineNode({
              isRoot: false,
              start: childRange.start,
              end: childRange.end,
              reverseDepth: this.reverseDepth - 1,
              tree: this.tree
            })
          }
          fixChildFlag = !this.values[currIndex].insert(data, chrRange, props)
        } else {
          fixChildFlag = true
        }

        if (fixChildFlag) {
          // otherwise, use `false` to fill the dedicated range and merge with
          // previous `false`s if possible.
          this.values[currIndex] = false
          if (this._mergeChild(currIndex, true, false)) {
            currIndex--
          }
        }

        chrRange.start = Math.min(childRange.end, chrRange.end)
        currIndex++
      } // end while(rangeStart < rangeEnd);
    }

    _addLeafRecords (data, chrRange, props) {
      // This function only adds record(s), it won't restructure the tree
      // This function is exactly the same as `GIVE.OakNode._addLeafRecords`

      // Find the range of child that rangeStart is in
      let currIndex = 0
      props.dataIndex = 0
      let prevDataIndex
      props.contList = props.contList || []
      if (!(give.GiveTreeNode.prototype.isPrototypeOf(
        props.LeafNodeCtor.prototype
      ))) {
        throw new give.GiveError('LeafNodeCtor `' + props.LeafNodeCtor +
          '` is not a constructor for a tree node!')
      }

      while (this.keys[currIndex + 1] <= chrRange.start) {
        currIndex++
      }

      if (this.keys[currIndex] < chrRange.start) {
        // The new rangeStart appears between windows.
        // Shorten the previous data record by inserting the key,
        // and use this.values[currIndex] to fill the rest
        // (normally it should be `null`)
        this._splitChild(currIndex++, chrRange.start)
      }

      if (this.keys[currIndex + 1] > chrRange.end) {
        // The new rangeEnd appears between windows.
        // Shorten the next data record by inserting the key,
        // and use this.values[currIndex] to fill the current region
        // (normally it should be `null`)
        this._splitChild(currIndex, chrRange.end)
      }

      while (chrRange.start < chrRange.end) {
        while (this.keys[currIndex + 1] <= chrRange.start) {
          currIndex++
        }
        // First get data that should belong to contList done.
        prevDataIndex = props.dataIndex
        props.dataIndex = give._traverseData(data, props.dataIndex,
          dataEntry => dataEntry.start < chrRange.start, props.callback)
        props.contList = props.contList.concat(
          data.slice(prevDataIndex, props.dataIndex)
        ).filter(entry => entry.end > chrRange.start)

        // Now all data entries with `.start` before `nextRangeStart` should
        // be already in `props.contList`

        if (this.keys[currIndex] < chrRange.start) {
          // The new rangeStart appears between windows.
          // Shorten the previous data record by inserting the key,
          // and use `false` to fill the rest
          this._splitChild(currIndex++, chrRange.start, false)
        }

        if (
          props.dataIndex < data.length &&
          data[props.dataIndex].start === this.keys[currIndex]
        ) {
          // there are actual data at this location, create a new leaf node
          this.values[currIndex] = new props.LeafNodeCtor({
            start: this.keys[currIndex]
          })
          this.values[currIndex].insert(data, chrRange, props)
        } else if (this.keys[currIndex] < chrRange.end) {
          // needs to fill the element with `false`, and merge with previous if
          // possible
          this.values[currIndex] = props.contList.length <= 0
            ? false : new props.LeafNodeCtor({
              start: this.keys[currIndex],
              contList: props.contList.slice()
            })
          if (this._mergeChild(currIndex, false, false)) {
            currIndex--
          }
        }

        // Shrink `chrRange` to unprocessed range
        chrRange.start = (
          props.dataIndex < data.length &&
          data[props.dataIndex].start < chrRange.end
        ) ? data[props.dataIndex].start : chrRange.end
      }

      // Process `props.contList` for one last time
      props.contList = props.contList.concat(
        data.slice(prevDataIndex, props.dataIndex)
      ).filter(entry => entry.end > chrRange.end)

      // Remove all processed data from `data`
      data.splice(0, props.dataIndex)
      delete props.dataIndex
    }

    remove (data, exactMatch, convertTo, props) {
      props = props || {}
      // Check whether `this` shall be removed
      if (this.start === data.start && this.end === data.end) {
        if (!exactMatch || this._compareData(data, this)) {
          // remove content of this
          if (typeof props.callback === 'function') {
            props.callback(this)
          }
          this.clear(convertTo)
          return !!this.isRoot
        }
      }

      // data being remove is not self
      // locate the child entry first
      let i = 0
      while (i < this.values.length && this.keys[i + 1] <= data.start) {
        i++
      }
      if (this.values[i]) {
        // data must fall within `this.values[i]`
        if (!this.values[i].remove(data, exactMatch, convertTo, props)) {
          this.values[i] = convertTo
          this._mergeChild(i, true, false)
        }
      } else {
        give._verbConsole.warn('Data ' + data + ' is not found in the tree.')
      }
      return (this.values.length > 1 || (
        this.firstChild !== null && this.firstChild !== false
      )) ? this : false
    }

    /**
     * traverse - traverse all nodes / data entries within `this` and calling
     *    functions on them. Pine tree nodes need to implement resolution
     *    support.
     * @memberof PineNode.prototype
     *
     * @param  {ChromRegionLiteral} chrRange - the chromosomal range to
     *    traverse.
     * @param  {number} [chrRange.resolution] - the resolution required for
     *    the traverse. 1 is finest. This is used in case of mixed resolutions
     *    for different `chrRange`s, This will override `props.resolution` if
     *    both exist.
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
     * @param  {boolean} props.notFirstCall - whether this is not the first
     *    call of a series of `traverse` calls.
     * @param  {number} [props.resolution] - the resolution required for this
     *    traverse. 1 is finest. This will be overridden by
     *    `chrRange.resolution` if both exist.
     * @returns {boolean} - whether future traverses should be conducted.
     */
    traverse (chrRange, callback, filter, breakOnFalse, props, ...args) {
      if (chrRange) {
        let resolution = chrRange.resolution || props.resolution || 1
        // Rejuvenate `this`
        if (this.start < chrRange.end && this.end > chrRange.start) {
          // Resolution support: check if the resolution is already enough in
          // this node. If so, call `this._callFuncOnDataEntry` on
          // `this.summaryChromRegion`
          if (this.resolutionEnough(resolution) && this.hasData) {
            // Resolution enough
            return this._callFuncOnDataEntry(callback, filter, breakOnFalse,
              this.summaryChromRegion, props, ...args
            )
          } else {
            // call `GIVE.GiveNonLeafNode.prototype.traverse`
            return super.traverse(chrRange, callback, filter, breakOnFalse,
              props, ...args)
          }
        }
      } else { // !chrRange
        throw (new give.GiveError(chrRange + ' is not a valid chrRegion.'))
      } // end if(chrRange)
    }

    /**
     * getUncachedRange - Return an array of chrRegions that does not have
     *    data loaded to allow buffered loading of data
     *
     * @param  {GIVE.ChromRegion} chrRange - The range of query.
     * @param  {number} chrRange.resolution - the resolution required for the
     *    uncached range. 1 is finest. This is used in case of mixed
     *    resolutions for different `chrRange`s, This will override
     *    `props.resolution` if both exist.
     * @param  {object|null} props - additional properties being passed onto
     *    nodes
     * @param  {number|null} props.resolution - resolution required for the
     *    query, will be overridden by `chrRange.resolution` if both exist.
     * @param  {number|null} props.bufferingRatio - Ratio of desired
     *    resolution if the data is not available. This would allow a
     *    "resolution buffering" by requesting data at a slightly finer
     *    resolution than currently required.
     * @param  {Array<GIVE.ChromRegion>} props._result - previous unloaded
     *    regions. This will be appended to the front of returned value.
     *    This array will be updated if it gets appended to reduce memory
     *    usage and GC.
     * @returns {Array<GIVE.ChromRegion>} An ordered array of the regions that
     *    does not have the data at the current resolution requirement.
     *    __Regions will have a `.resolution` property indicating their
     *    intended resolutions. This shall be observed by the server so that
     *    summary of data shall work.__
     *    If no non-data ranges are found, return []
     */
    getUncachedRange (chrRange, props) {
      // return the range list with range(s) without any data
      // if no non-data ranges are found, return []

      let resolution = chrRange.resolution || props.resolution || 1
      props._result = props._result || []
      props.bufferingRatio = props.bufferingRatio || 1
      if (props.bufferingRatio < 1) {
        give._verbConsole.warn(
          'Invalid bufferingRatio: ' + props.bufferingRatio +
          '. Should be greater than 1. Changed to 1 instead.')
        props.bufferingRatio = 1
      }

      if (chrRange) {
        let currIndex = 0
        while (currIndex < this.values.length &&
          this.keys[currIndex + 1] <= chrRange.start
        ) {
          currIndex++
        }
        while (currIndex < this.values.length &&
          this.keys[currIndex] < chrRange.end
        ) {
          if (this.values[currIndex] &&
            !this.childResolutionEnough(resolution, currIndex)
          ) {
            // child has not enough resolution
            this.values[currIndex].getUncachedRange(chrRange, props)
          } else if (!this.childHasData(currIndex)) {
            // either no child at all or child does not have summary data
            // calculate the closest range needed for the resolution
            // first normalize resolution to scalingFactor
            let closestResolution = this._getClosestResolution(
              resolution / props.bufferingRatio)
            let retrieveStart = Math.max(this.keys[currIndex],
              this.constructor.fitResolution(
                chrRange.start, closestResolution, Math.floor))
            let retrieveEnd = Math.min(this.keys[currIndex + 1],
              this.constructor.fitResolution(
                chrRange.end, closestResolution, Math.ceil))
            if (props._result[props._result.length - 1] &&
              props._result[props._result.length - 1].resolution ===
                closestResolution &&
              props._result[props._result.length - 1].end === retrieveStart
            ) {
              props._result[props._result.length - 1].end = retrieveEnd
            } else {
              props._result.push(new give.ChromRegion({
                chr: chrRange.chr,
                start: retrieveStart,
                end: retrieveEnd,
                resolution: closestResolution
              }))
            }
          }
          currIndex++
        }
        return props._result
      } else { // chrRange
        throw (new give.GiveError(chrRange + ' is not a valid chrRegion.'))
      }
    }

    /**
     * hasUncachedRange - Quickly check if the node has any uncached range
     *    within a specific range.
     *
     * @param  {GIVE.ChromRegion} chrRange - The range of query.
     * @param  {number} chrRange.resolution - the resolution required for the
     *    uncached range. 1 is finest. This is used in case of mixed
     *    resolutions for different `chrRange`s, This will override
     *    `props.resolution` if both exist.
     * @param  {object} props - additional properties being passed onto
     *    nodes
     * @param  {number|null} props.resolution - resolution required for the
     *    query, will be overridden by `chrRange.resolution` if both exist.
     * @returns {boolean} `true` if the tree has uncached ranges.
     */
    hasUncachedRange (chrRange, props) {
      // return the range list with range(s) without any data
      // if no non-data ranges are found, return []

      let resolution = chrRange.resolution || props.resolution || 1
      if (chrRange) {
        let currIndex = 0
        while (currIndex < this.values.length &&
          this.keys[currIndex + 1] <= chrRange.start
        ) {
          currIndex++
        }
        while (currIndex < this.values.length &&
          this.keys[currIndex] < chrRange.end
        ) {
          if (this.values[currIndex] &&
            !this.childResolutionEnough(resolution, currIndex)
          ) {
            // child has not enough resolution
            if (this.values[currIndex].hasUncachedRange(chrRange, props)) {
              return true
            }
          } else if (!this.childHasData(currIndex)) {
            return true
          }
          currIndex++
        }
        return false
      } else { // chrRange
        throw (new give.GiveError(chrRange + ' is not a valid chrRegion.'))
      }
    }

    /**
     * isEmpty - return whether this node is empty
     * If there is no entry in both `this.startList` and `this.contList` then
     *    the node is considered empty.
     *
     * @returns {boolean}      whether the node is empty
     */
    get isEmpty () {
      return !this.hasData && super.isEmpty
    }
  }

  PineNode._DEFAULT_S_FACTOR = 10

  give.PineNode = PineNode

  return give
})(GIVe || {})
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
   * Pine tree for data storage, derived from B+ tree.
   * See `GIVE.GiveTree` for other properties and methods.
   * @typedef {object} OakTree
   * @property {number} scalingFactor - The scaling factor for the pine
   *    tree.
   *    This is the factor for non-leaf nodes (this will be used to initialize
   *    `this.tree.leafScalingFactor` if the latter is not initialized.).
   * @property {number} leafScalingFactor - The scaling factor for the
   *    leaf nodes of the pine tree.
   *    For example, if `this.tree.leafScalingFactor === 100`, each leaf node
   *    (`give.DataNode`) shall cover 100bp.
   * @property {function} _SummaryCtor - The constructor for a data
   *    summary object.
   * @property {GiveTreeNode} _NonLeafNodeCtor - Constructor for all non-leaf
   *    nodes. Should be `GIVE.PineNode` all the time. Can be overridden but not
   *    recommended.
   * @property {GiveTreeNode} _LeafNodeCtor - Constructor for all leaf nodes,
   *    `GIVE.DataNode` by default
   *
   * @class give.GiveTree
   *
   * @constructor
   * @implements GiveTreeBase
   * @param {ChromRegionLiteral} chrRange - The range this data storage unit
   *    will be responsible for.
   * @param {object} props - properties that will be passed to the individual
   *    implementations
   * @param {number} props.scalingFactor - for `this.scalingFactor`
   * @param {number} props.leafScalingFactor - for `this.leafScalingFactor`
   * @param {function} props._SummaryCtor - for `this._SummaryCtor`
   * @param {number} props.lifeSpan - for `this.lifeSpan`
   * @param {function} props.NonLeafNodeCtor - used to override non-leaf node
   *    constructors.
   * @param {function} props.LeafNodeCtor - if omitted, the constructor of
   *    `GIVE.DataNode` will be used
   */
  class PineTree extends give.GiveTree {
    constructor (chrRange, props) {
      props.LeafNodeCtor = props.LeafNodeCtor || give.DataNode
      super(chrRange, props.NonLeafNodeCtor || give.PineNode, props)
    }

    _initProperties (chrRange, NonLeafNodeCtor, props) {
      props.LeafNodeCtor = props.LeafNodeCtor || give.DataNode
      super._initProperties(...arguments)
      // Scaling factor
      if (!Number.isInteger(props.scalingFactor) || props.scalingFactor <= 2) {
        give._verbConsole.info('Default scaling factor is chosen instead of ' +
          props.scalingFactor)
        this.scalingFactor = this.constructor._DEFAULT_SCALING_FACTOR
      } else {
        this.scalingFactor = props.scalingFactor
      }

      // Leaf scaling factor
      if (!Number.isInteger(props.leafScalingFactor) ||
        props.leafScalingFactor <= 2
      ) {
        give._verbConsole.info('Non-leaf scaling factor is chosen for leaves ' +
          'instead of ' + props.leafScalingFactor)
        this.leafScalingFactor = this.constructor._DEFAULT_LEAF_SCALING_FACTOR
      } else {
        this.leafScalingFactor = props.leafScalingFactor
      }

      if (typeof props._SummaryCtor === 'function') {
        this._SummaryCtor = props._SummaryCtor
      }
    }

    /**
     * _insertSingleRange - Insert data entries within a single range
     * Please refer to `this.insert` for parameter annotation
     * @memberof GiveTreeBase.prototype
     *
     * @param {Array<ChromRegionLiteral>} data
     * @param {ChromRegionLiteral|null} chrRange -
     *    the chromosomal range that `data` corresponds to.
     * @param {number} [chrRange.resolution] - the resolution of the data being
     *    inserted. Will override `props.resolution` if both exists.
     * @param {Array<ChromRegionLiteral>} continuedList
     * @param {Array<ChromRegionLiteral>} [props.contList] - the list of data
     *    entries that should not start in `chrRange` but are passed from the
     *    earlier regions, this will be useful for later regions if date for
     *    multiple regions are inserted at the same time
     * @param {function} [props.callback] - the callback function to be used
     *    (with the data entry as its sole parameter) when inserting
     * @param {object} [props.ThisVar] - `this` used in calling
     *    `props.callback`.
     * @param {function} [props.LeafNodeCtor] - the constructor function of
     *    leaf nodes if they are not the same as the non-leaf nodes.
     * @param {number} [props.dataIndex] - the current index of `data`.
     *    If this is specified, no array splicing will be done on `data` to
     *    improve performance. `props.currIndex` will be shifted (and passed
     *    back).
     * @param {number} [props.resolution] - the resolution of the data being
     *    inserted. Will be overridden by `chrRange.resolution` if both exists.
     */
    _insertSingleRange (data, chrRange, props) {
      return super._insertSingleRange(...arguments)
    }

    /**
     * traverse - traverse given chromosomal range to apply functions to all
     * overlapping data entries.
     * @memberof GiveTreeBase.prototype
     *
     * @param {ChromRegionLiteral} chrRanges - the chromosomal range to traverse
     * @param {number} [chrRange.resolution] - the resolution required for the
     *    traverse. 1 is finest. This is used in case of mixed resolutions for
     *    different `chrRange`s, This will override `props.resolution` if both
     *    exist.
     * @param {function} callback - the callback function to be used (with the
     *    data entry as its sole parameter) on all overlapping data entries
     *    (that pass `filter` if it exists).
     * @param {function} filter - the filter function to be used (with the data
     *    entry as its sole parameter), return `false` to exclude the entry from
     *    being called with `callback`.
     * @param {boolean} breakOnFalse - whether the traversing should break if
     *    `false` has been returned from `callback`
     * @param {object|null} props - additional properties being passed onto nodes
     * @param {number} [props.resolution] - the resolution that is required,
     *    data entry (or summary entries) that can just meet this requirement will
     *    be chosen. Smaller is finer. Will be overridden by `chrRange.resolution`
     *    if both exists.
     * @returns {boolean} If the traverse breaks on `false`, returns `false`,
     *    otherwise `true`
     */
    _traverse (chrRange, callback, filter, breakOnFalse, props, ...args) {
      return super._traverse(...arguments)
    }

    /**
     * getUncachedRange - get an array of chrRegions that do not have data ready.
     * This is used for sectional loading.
     * @memberof PineTree.prototype
     *
     * @param {ChromRegionLiteral} chrRange - the chromosomal range to query
     * @param  {number} [chrRange.resolution] - the resolution required for the
     *    cached range. 1 is finest. This is recommended in case of mixed
     *    resolutions for different `chrRange`s, This will override
     *    `props.resolution` if both exist.
     * @param {object|null} props - additional properties being passed onto nodes
     * @param {number|null} [props.resolution] - the resolution that is required.
     *    Smaller is finer. Will be overridden by `chrRange.resolution` if both
     *    exists.
     * @param {number|null} [props.bufferingRatio] - the ratio to 'boost'
     *    `resolution` so that less data fetching may be needed.
     * @returns {Array<ChromRegionLiteral>} the chromosomal ranges that do not
     *    have their data ready in this data storage unit (therefore need to be
     *    fetched from sources). If all the data needed is ready, `[]` will be
     *    returned.
     *    Every returned chromosomal range will also have its corrsponding
     *    resolution in its `.resolution` property.
     */
    getUncachedRange (chrRange, props) {
      return super.getUncachedRange(...arguments)
    }
  }

  /**
   * ********** Default values **********
   * These values may need to be tweaked.
   */

  /**
   * _DEFAULT_SCALING_FACTOR - Default value for scalingFactor
   */
  PineTree._DEFAULT_SCALING_FACTOR = 20
  /**
   * _DEFAULT_LEAF_SCALING_FACTOR - Default value for leafScalingFactor
   */
  PineTree._DEFAULT_LEAF_SCALING_FACTOR = 100

  give.PineTree = PineTree
  return give
})(GIVe || {})
