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
   * @interface give.GiveNonLeafNode
   *
   * @constructor
   * @implements give.GiveTreeNode
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
   * @param {number|null} props.RevDepth - for `this.RevDepth`
   * @param {GiveNonLeafNode|null|boolean} props.NextNode - for `this.Next`
   * @param {GiveNonLeafNode|null|boolean} props.PrevNode - for `this.Prev`
   *
   */
  give.GiveNonLeafNode = function (props) {
    // start and length is for the corresponding region
    if (!Number.isInteger(props.Start) || !Number.isInteger(props.End)) {
      throw (new Error('Start or End is not an integer number in non-leaf ' +
             'node construction!'))
    }
    if (props.Start < 0 || props.End < 0 || props.Start >= props.End) {
      throw (new Error('Range error. Start: ' + props.Start +
        ', end: ' + props.End))
    }
    this.Keys = [props.Start, props.End]
    this.IsRoot = !!props.IsRoot
    this.Values = [null]
    this.RevDepth = props.RevDepth || 1
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
   * @memberof GiveNonLeafNode.prototype
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
   * @memberof GiveNonLeafNode.prototype
   *
   * @returns {number}  The start coordinate.
   */
  give.GiveNonLeafNode.prototype.getStart = function () {
    return this.Keys[0]
  }

  /**
   * getEnd - get the end coordinate of the region covered by this node
   * @memberof GiveNonLeafNode.prototype
   *
   * @returns {number}  The end coordinate.
   */
  give.GiveNonLeafNode.prototype.getEnd = function () {
    return this.Keys[this.Keys.length - 1]
  }

  /**
   * setStart - set the start coordinate of the region covered by this node
   * @memberof GiveNonLeafNode.prototype
   *
   * @param {number} newStart - The new start coordinate.
   */
  give.GiveNonLeafNode.prototype.setStart = function (newStart) {
    this.Keys[0] = newStart
  }

  /**
   * setEnd - set the end coordinate of the region covered by this node
   * @memberof GiveNonLeafNode.prototype
   *
   * @param {number} newEnd - The new end coordinate.
   */
  give.GiveNonLeafNode.prototype.setEnd = function (newEnd) {
    this.Keys[this.Keys.length - 1] = newEnd
  }

  /**
   * getNext - get the next node
   *
   * @returns {GiveNonLeafNode|null}  the next node
   */
  give.GiveNonLeafNode.prototype.getNext = function () {
    return this.Next
  }

  /**
   * getNext - get the previous node
   *
   * @returns {GiveNonLeafNode|null}  the previous node
   */
  give.GiveNonLeafNode.prototype.getPrev = function () {
    return this.Prev
  }

  /**
   * setNext - set the next node and fix all links within the child.
   *
   * @param  {GiveNonLeafNode|null} nextNode - the node that serves as the next
   *    node
   */
  give.GiveNonLeafNode.prototype.setNext = function (nextNode) {
    if (nextNode) {
      if (
        nextNode.getFirstChild() &&
        typeof nextNode.getFirstChild().setPrev === 'function'
      ) {
        nextNode.getFirstChild().setPrev(this.getLastChild())
      }
    }
    this.Next = nextNode || null
  }

  /**
   * setPrev - set the previous node and fix all links within the child.
   *
   * @param  {GiveNonLeafNode|null} prevNode - the node that serves as the
   *    previous node
   */
  give.GiveNonLeafNode.prototype.setPrev = function (prevNode) {
    if (prevNode) {
      if (
        prevNode.getLastChild() &&
        typeof prevNode.getLastChild().setNext === 'function'
      ) {
        prevNode.getLastChild().setNext(this.getFirstChild())
      }
    }
    this.Prev = prevNode || null
  }

  /**
   * getFirstChild - get the first child element of `this`.
   * @memberof GiveNonLeafNode.prototype
   *
   * @returns {give.GiveTreeNode}  The first child element
   */
  give.GiveNonLeafNode.prototype.getFirstChild = function () {
    return this.Values[0]
  }

  /**
   * getLastChild - get the last child element of `this`.
   * @memberof GiveNonLeafNode.prototype
   *
   * @returns {give.GiveTreeNode}  The last child element
   */
  give.GiveNonLeafNode.prototype.getLastChild = function () {
    return this.Values[this.Values.length - 1]
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
   *    After insertion, any entry within `data` that overlaps `chrRange` Will
   *    be deleted from the array.
   * @param {ChromRegionLiteral} chrRanges - the chromosomal range that `data`
   *    corresponds to.
   *    This is used to mark the empty regions correctly. No `null` will present
   *    within these regions after this operation.
   *    This parameter should be an `Object` with at least two properties:
   *    `{ start: <start coordinate>, end: <end coordinate>, ... }`,
   *    preferably a `GIVe.ChromRegion` object.
   * @param {Array<ChromRegionLiteral>} contList - the list of data entries
   *    that should not start in `chrRange` but are passed from the earlier
   *    regions, this will be useful for later regions if date for multiple
   *    regions are inserted at the same time
   * @param {function|null} callback - the callback function to be used (with
   *    the data entry as its sole parameter) when inserting
   * @param {Array<object>|object|null} props - additional properties being
   *    passed onto nodes.
   * @returns {give.GiveNonLeafNode|Array<give.GiveNonLeafNode>}
   *    This shall reflect whether auto-balancing is supported for the tree.
   *    See `give.GiveNonLeafNode.prototype._restructuring` for details.
   */
  give.GiveNonLeafNode.prototype.insert = function (
    data, chrRange, contList, callback, props
  ) {
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
      // there are three cases for insertion:
      // 1. leaf nodes: use `give.DataNode` to store raw data
      // 2. non-leaf nodes:
      //    go deep to generate branch structure, or update summary
      //    (for trees that support summary and resolutions)
      if (this.RevDepth > 1) {
        // case 2
        this._addNonLeafRecords(data, chrRange.start, chrRange.end,
          contList, callback, props)
      } else {
        // case 1
        this._addLeafRecords(data, chrRange.start, chrRange.end,
          contList, callback, props)
      }
    } else { // chrRange
      throw (new Error(chrRange + ' is not a valid chrRegion.'))
    } // end if(chrRange)
    return this._restructuring()
  }

  /**
   * _restructuring - The function to be called after adding/removing data to
   *    the node.
   *    This is used in implementations that involve post-insertion processes
   *    of the tree (for example, rebalancing in B+ tree derivatives).
   *    For trees that do not implement post-insertion processes, return `this`.
   * @memberof GiveNonLeafNode.prototype
   *
   * @returns {give.GiveNonLeafNode|Array<give.GiveNonLeafNode>|false}
   *    This shall reflect whether auto-balancing is supported for the tree.
   *    If no auto-balancing is supported, the return value will be always
   *    `this` since the tree structure will not change above this node.
   *    If auto-balancing is supported, then the return value will be different
   *    for root and non-root nodes:
   *    * For root nodes, this will return a new root if split/merge happens,
   *      `this` otherwise;
   *    * for inner nodes (or leaf), this will return an ordered array of
   *      (one or more) siblings so that the calling function can handle it.
   *      If the node should be removed (being merged with its sibling(s), for
   *      example) the function will return `false`.
   *      return `this` in all other cases.
   */
  give.GiveNonLeafNode.prototype._restructuring = function () {
    // for non-auto-balancing trees, return false if this node has no data any
    //    more
    return ((this.Values.length <= 0 || (
        this.Values.length === 1 && this.Values[0] === false)
      ) ? this : false)
  }

  /**
   * _addNonLeafRecords - add records to a non-leaf node
   * @memberof GiveNonLeafNode.prototype
   *
   * @param {Array<ChromRegionLiteral>} data - the sorted array of data entries.
   *    See `this.insert` for detailed description.
   * @param {number} rangeStart - the start of the chromosomal range that `data`
   *    corresponds to.
   *    This is used to mark the empty regions correctly. No `null` will present
   *    within these regions after this operation.
   * @param {number} rangeEnd - the start of the chromosomal range that `data`
   *    corresponds to. See `rangeStart`.
   * @param {Array<ChromRegionLiteral>} contList - the list of data entries
   *    that should not start in `chrRange` but are passed from the earlier
   *    regions, this will be useful for later regions if date for multiple
   *    regions are inserted at the same time
   * @param {function|null} callback - the callback function to be used (with
   *    the data entry as its sole parameter) when inserting
   * @param {Array<object>|object|null} props - additional properties being
   *    passed onto nodes.
   */
  give.GiveNonLeafNode.prototype._addNonLeafRecords = function (
    data, rangeStart, rangeEnd, contList, callback, props
  ) {
    throw new Error('GiveNonLeafNode._addNonLeafRecords not implemented in `' +
      this.constructor.name + '`!')
  }

  /**
   * _addLeafRecords - add records to a leaf node (with `revDepth === 1`)
   * @memberof GiveNonLeafNode.prototype
   *
   * @param {Array<ChromRegionLiteral>} data - the sorted array of data entries.
   *    See `this.insert` for detailed description.
   * @param {number} rangeStart - the start of the chromosomal range that `data`
   *    corresponds to.
   *    This is used to mark the empty regions correctly. No `null` will present
   *    within these regions after this operation.
   * @param {number} rangeEnd - the start of the chromosomal range that `data`
   *    corresponds to. See `rangeStart`.
   * @param {Array<ChromRegionLiteral>} contList - the list of data entries
   *    that should not start in `chrRange` but are passed from the earlier
   *    regions, this will be useful for later regions if date for multiple
   *    regions are inserted at the same time
   * @param {function|null} callback - the callback function to be used (with
   *    the data entry as its sole parameter) when inserting
   * @param {Array<object>|object|null} props - additional properties being
   *    passed onto nodes.
   */
  give.GiveNonLeafNode.prototype._addLeafRecords = function (
    data, rangeStart, rangeEnd, ContList, callback, props
  ) {
    throw new Error('GiveNonLeafNode._addLeafRecords not implemented in `' +
      this.constructor.name + '`!')
  }

  give.GiveNonLeafNode.prototype.remove = function (
    data, removeExactMatch, callback, thisVar, props
  ) {
    // Check whether `this` shall be removed
    if (this.getStart() === data.getStart() &&
      this.getEnd() === data.getEnd()
    ) {
      if (!removeExactMatch || this._compareData(data, this)) {
        // remove content of this
        this.clear()
        if (!this.IsRoot) {
          return false
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
        data, removeExactMatch, callback, thisVar, props)
      ) {
        // this node will be removed if it is not literally the first node
        //    of the tree
        if (this.Values[i] instanceof give.DataNode) {
          if (i > 0 || (this.Prev && this.Prev.getLastChild() !== null)) {
            this.Keys.splice(i, 1)
            this.Values.splice(i, 1)
            if (i === 0 && this.Prev) {
              // Needs to update the last key value of this.Prev
              // Upper nodes will change their Keys by themselves
              this.Prev.setEnd(this.getStart())
            }
          }
        } else {
          // Replace the node with `false`, it will also be merged
          //    with neighboring `false`s if possible
          this.Values[i] = false
        }
        this._mergeChild(i, true, props.crossBorder)
      }
    } else {
      give._verboseConsole('Data ' + data + ' is not found in the tree.',
        give.VERBOSE_WARNING)
    }
    return this._restructuring()
  }

  /**
   * _mergeChild - merge children that are the same as `this.Values[index]`, if
   *    they are `false` or `null`
   *
   * @param  {number} index - index of the child
   * @param  {boolean} mergeNext - whether merge the next child as well
   * @param  {boolean} crossBorder - whether merging can happen across parent
   *    borders. If so, the children nodes in siblings of this may be expanded.
   *    (The number of children will not be affected in sibling nodes, so that
   *    the structure of neighboring nodes are not messed up.)
   * @returns {boolean} whether merge happened
   */
  give.GiveNonLeafNode.prototype._mergeChild = function (
    index, mergeNext, crossBorder
  ) {
    var merged = false
    if (this.Values[index] === null || this.Values[index] === false) {
      // merge previous child first
      if (index > 0 && this.Values[index - 1] === this.Values[index]) {
        // remove child at `index`
        this.Keys.splice(index, 1)
        this.Values.splice(index, 1)
        merged = true
      } else if (crossBorder && index === 0 && this.Prev &&
        this.Values.length > 1 &&
        this.Prev.getLastChild() === this.Values[index]
      ) {
        this.Keys.splice(index, 1)
        this.Values.splice(index, 1)
        // needs to change the boundary of sibling node
        this.Prev.setEnd(this.getStart())
        merged = true
      }

      // if `mergeNext` is `true`, do the same to the next node
      if (mergeNext) {
        if (
          index < this.Values.length - 1 &&
          this.Values[index + 1] === this.Values[index]
        ) {
          // remove child at `index + 1`
          this.Keys.splice(index + 1, 1)
          this.Values.splice(index + 1, 1)
          merged = true
        } else if (crossBorder && index === this.Values.length - 1 &&
          this.Next && this.Values.length > 1 &&
          this.Next.getFirstChild() === this.Values[index]
        ) {
          this.Keys.splice(index, 1)
          this.Values.splice(index, 1)
          // needs to change the boundary of sibling node
          this.Next.setStart(this.getEnd())
          merged = true
        }
      }
    }
    return merged
  }

  give.GiveNonLeafNode.prototype.traverse = function (
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

  /**
   * getUncachedRange - Return an array of chrRegions that does not have data
   *   loaded to allow buffered loading of data
   *
   * @param  {GIVE.ChromRegion} chrRange - The range of query.
   * @param  {object|null} props - additional properties being passed onto nodes
   * @returns {Array<GIVE.ChromRegion>} An ordered array of the regions that
   *   does not have the data at the current resolution requirement.
   */
  give.GiveNonLeafNode.prototype.getUncachedRange = function (chrRange, props) {
  }

  return give
})(GIVe || {})
