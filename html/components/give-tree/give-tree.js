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
  class GiveTreeNode {
    /**
     * hasData - get whether this data node has data stored.
     *
     * @returns {boolean}  Return `true` if the data is ready, otherwise
     *    `false`.
     *    Return `false` by default since this basic implementation does not
     *    include summaries.
     */
    get hasData () {
      return false
    }

    /**
     * getStart - get the start coordinate of the region covered by this node
     * @memberof GiveTreeNode.prototype
     *
     * @returns {number}  The start coordinate.
     */
    get start () {
      throw new give.GiveError('GiveTreeNode.start not implemented in `' +
        this.constructor.name + '`!')
    }

    /**
     * setStart - set the start coordinate of the region covered by this node
     * @memberof GiveTreeNode.prototype
     *
     * @param {number} newStart - The new start coordinate.
     */
    set start (newStart) {
      throw new give.GiveError('GiveTreeNode.start gets called but has not ' +
        'been implemented in `' + this.constructor.name + '`.')
    }

    /**
     * getEnd - get the end coordinate of the region covered by this node
     * @memberof GiveTreeNode.prototype
     *
     * @returns {number}  The end coordinate.
     */
    get end () {
      throw new give.GiveError('GiveTreeNode.start not implemented in `' +
        this.constructor.name + '`!')
    }

    /**
     * setEnd - set the end coordinate of the region covered by this node
     * @memberof GiveTreeNode.prototype
     *
     * @param {number} newEnd - The new end coordinate.
     */
    set end (newEnd) {
      throw new give.GiveError('GiveTreeNode.start gets called but has not ' +
        'been implemented in `' + this.constructor.name + '`.')
    }

    /**
     * insert - Insert data under this node
     * @memberof GiveTreeNode.prototype
     *
     * @param {Array<ChromRegionLiteral>} data - the sorted array of data
     *    entries (each should be an extension of `GIVe.ChromRegion`).
     *    `data === null` or `data === []` means there is no data in
     *    `chrRange` and `false`s will be used in actual storage.
     *    __NOTICE:__ any data overlapping `chrRange` should appear either
     *    here or in `continuedList`, otherwise `continuedList` in data
     *    entries may not work properly.
     *    After insertion, any entry within `data` that overlaps `chrRange`
     *    will be deleted from the array __unless `props.currIndex` is
     *    provided__ in the parameter, see `props.currIndex` below.
     * @param {ChromRegionLiteral} chrRange - the chromosomal range that
     *    `data` corresponds to.
     *    This is used to mark the empty regions correctly. No `null` will
     *    present within these regions after this operation.
     *    This parameter should be an `Object` with at least two properties:
     *    `{ start: <start coordinate>, end: <end coordinate>, ... }`,
     *    preferably a `GIVe.ChromRegion` object.
     * @param {object} props - additional properties being
     *    passed onto nodes.
     * @param {Array<ChromRegionLiteral>} [props.contList] - the list of
     *    data entries that should not start in `chrRange` but are passed
     *    from the earlier regions, this will be useful for later regions if
     *    date for multiple regions are inserted at the same time.
     * @param {function} [props.callback] - the callback function to be used
     *    (with the data entry as its sole parameter) when inserting
     * @param {function} [props.LeafNodeCtor] - the constructor function of
     *    leaf nodes if they are not the same as the non-leaf nodes.
     * @param {number} [props.dataIndex] - the current index of `data`.
     *    If this is specified, no array splicing will be done on `data` to
     *    improve performance. `props.currIndex` will be shifted (and passed
     *    back).
     * @returns {give.GiveTreeNode}
     *    Return `this`.
     *    This is reserved for tree structures that may change after
     *    insertion. For example, auto-balancing trees may return multiple
     *    entries, indicating siblings being created.
     */
    insert (data, chrRange, props) {
      throw new give.GiveError('GiveTreeNode.insert not implemented in `' +
        this.constructor.name + '`!')
    }

    /**
     * remove - Remove data entries from the node.
     *    Data entries with the same start (and end values if exists) will be
     *    removed. If multiple entries are found with the same start (and end
     *    values), the behavior will be defined by `exactMatch`.
     * @memberof GiveTreeNode.prototype
     *
     * @param  {ChromRegionLiteral|GiveTreeNode} data - the data entry being
     *    removed.
     * @param  {boolean} exactMatch - whether an exact match is needed
     *    to remove multiple data entries with the same start and end values.
     *    If `true`, `data` will be compared by `.equalTo(data)` if exists,
     *    `===` if not. (this is done via calling
     *    `this.constructor._compareData(dataIn, dataEx)`)
     *    If `false`, all entries matching the start and end values will be
     *    removed.
     * @param {boolean|null} convertTo - what shall be used to replace
     *    the removed nodes, should be either `null` (default) or `false`.
     * @param  {object} [props] - additional properties being
     *    passed onto nodes.
     * @param {function|null} props.callback - the callback function to be
     *    used (with the data entry as its sole parameter) when deleting
     * @returns {give.GiveTreeNode|boolean}
     *    If the node itself shall be removed, return a falsey value to allow
     *    parents to take additional steps.
     */
    remove (data, exactMatch, convertTo, props) {
      throw new give.GiveError('GiveTreeNode.remove not implemented in `' +
        this.constructor.name + '`!')
    }

    /**
     * _compareData - Compare an internal data entry with an external entry.
     * @memberof GiveTreeNode.prototype
     *
     * @param  {ChromRegionLiteral|GiveTreeNode} dataEx - the external data
     *    entry.
     * @param  {ChromRegionLiteral|GiveTreeNode} dataIn - the internal data
     *    entry.
     * @returns {boolean} whether the two data entries match.
     */
    _compareData (dataEx, dataIn) {
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
    clear (convertTo) {
      throw new give.GiveError('GiveTreeNode.remove not implemented in `' +
        this.constructor.name + '`!')
    }

    /**
     * _callFuncOnDataEntry - helper function to call `callback` on data
     *    entries.
     * @memberof GiveTreeNode.prototype
     *
     * @param  {ChromRegionLiteral|null} chrRange - the chromosomal range, if
     *    provided, data should overlap with chrRange to be called.
     * @param  {function} callback - the callback function, takes a
     *    `GIVE.ChromRegion` object as its sole parameter and returns
     *    something that can be evaluated as a boolean value to determine
     *    whether the call shall continue (if `breakOnFalse === true`).
     * @param  {function|null} filter - a filter function that takes a
     *    `GIVE.ChromRegion` object as its sole parameter and returns whether
     *    the region should be included in traverse.
     * @param  {boolean} breakOnFalse - whether this function should return
     *    `false` if `callback` returns `false`.
     * @param  {ChromRegionLiteral|GiveTreeNode} entry - the data entry
     *    `callback` is going to be called upon.
     * @param  {object} props - additional properties being
     *    passed onto nodes.
     * @param  {boolean} props.notFirstCall - whether this is not the first
     *    call of a series of `traverse` calls.
     * @param  {...object} args - additional args being passed onto `callback`
     *    and `filter`
     * @returns {boolean} - whether future traverses should be conducted.
     */
    _callFuncOnDataEntry (
      callback, filter, returnFalse, entry, props, ...args
    ) {
      if (typeof filter === 'function' && !filter(entry, props, ...args)) {
        return true
      }
      return callback(entry, props, ...args) || !returnFalse
    }

    /**
     * traverse - traverse all nodes / data entries within `this` and calling
     *    functions on them.
     * @memberof GiveTreeNode.prototype
     *
     * @param  {ChromRegionLiteral} chrRange - the chromosomal range to
     *    traverse.
     * @param  {function} callback - the callback function, takes a
     *    `GIVE.ChromRegion` object as its sole parameter and returns
     *    something that can be evaluated as a boolean value to determine
     *    whether the call shall continue (if `breakOnFalse === true`).
     * @param  {function|null} filter - a filter function that takes a
     *    `GIVE.ChromRegion` object as its sole parameter and returns
     *    whether the region should be included in traverse.
     * @param  {boolean} breakOnFalse - whether the traverse should be
     *    stopped if `false` is returned from the callback function.
     * @param  {object} props - additional properties being
     *    passed onto nodes.
     * @param  {boolean} props.notFirstCall - whether this is not the first
     *    call of a series of `traverse` calls.
     * @returns {boolean} - whether future traverses should be conducted.
     */
    traverse (chrRange, callback, filter, breakOnFalse, props, ...args) {
      throw new give.GiveError('GiveTreeNode.traverse not implemented in `' +
        this.constructor.name + '`!')
    }

    /**
     * getUncachedRange - Return an array of chrRegions that does not have
     *    data loaded to allow buffered loading of data
     *
     * @param  {ChromRegionLiteral} chrRange - The range of query.
     * @param  {object} props - additional properties being passed onto
     *    nodes
     * @returns {Array<ChromRegionLiteral>} An ordered array of the regions
     *    that does not have the data at the current resolution requirement.
     *    If no such range is needed, return `[]`
     */
    getUncachedRange (chrRange, props) {
      throw new give.GiveError('GiveTreeNode.getUncachedRange not ' +
        'implemented in `' + this.constructor.name + '`!')
    }

    /**
     * hasUncachedRange - Quickly check if the node has any uncached range
     *    within a specific range.
     *
     * @param  {ChromRegionLiteral} chrRange - The range of query.
     * @param  {object} props - additional properties being passed onto
     *    nodes
     * @returns {boolean} `true` if the tree has uncached ranges.
     */
    hasUncachedRange (chrRange, props) {
      throw new give.GiveError('GiveTreeNode.hasUncachedRange not ' +
        'implemented in `' + this.constructor.name + '`!')
    }

    /**
     * isEmpty - return whether this node is empty (meaning no data is covered
     *    by the tree, and the entire range is already loaded)
     *
     * @returns {boolean}      whether the node is empty
     */
    get isEmpty () {
      throw new give.GiveError('GiveTreeNode.isEmpty not implemented in `' +
        this.constructor.name + '`!')
    }
  }

  give.GiveTreeNode = GiveTreeNode

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
   * Non-leaf nodes for GIVE Trees
   * This is an interface for all nodes that belongs to GIVE Trees, including
   * insertion, deletion, traversing, and other functionalities.
   *
   * When traversing, everything in `contList` of __the starting record entry
   * (see `GIVE.DataNode`) only__ will be processed first, then everything in
   * `startList` in all overlapping records will be processed.
   *
   * @typedef {object} GiveNonLeafNode
   * @property {GiveTree} tree - Link to the `GiveTree` object to access tree-
   *    wise properties.
   * @property {boolean} isRoot - Whether this node is a root node (needed to
   *    handle changes in tree structure)
   * @property {Array<number>} keys - A list of keys of children
   * @property {Array<GiveTreeNode|null|boolean>} values - A list of data
   *    entries, can be `null` or `false` to represent data not loaded and
   *    empty nodes respectively.
   *    `keys.length` will be `1` more than `childNum`;
   *    `keys[i]` will be the start coordinate of `values[i]` and end
   *      coordinate of `values[i - 1]`;
   *    `keys[keys.length - 1]` will be the end coordinate of
   *      `values[childNum - 1]`.
   *    Therefore, neighboring nodes will have exactly one overlapping key.
   *    `values` can be `false` or `null` (unless prohibited by
   *    implementation) indicating empty regions or data not loaded,
   *    respectively.
   * @property {number} reverseDepth - "Reversed depth" of the node. The one
   *    holding leaf nodes (should be `GIVE.DataNode` or similar
   *    implementations) is at `0` and root is at maximum.
   * @property {GiveNonLeafNode|null|boolean} Next - The next node (sibling).
   *    Can be `null` or `false`.
   * @property {GiveNonLeafNode|null|boolean} Prev - The previous node
   *    (sibling).
   *
   * @interface GiveNonLeafNode
   * @implements give.GiveTreeNode
   *
   */
  class GiveNonLeafNode extends give.GiveTreeNode {
    /**
     * Creates an instance of GiveNonLeafNode.
     * @constructor
     * @param {object} props - properties that will be passed to the
     *    individual implementations. For `GIVE.GiveNonLeafNode`, these
     *    properties will be used:
     * @param {boolean} props.isRoot - for `this.isRoot`
     * @param {GiveTree} props.tree - for `this.tree`
     * @param {number} props.start - The start coordinate this node will
     *    cover. Equals to `this.keys[0]`.
     * @param {number} props.end - The end coordinate this node will cover.
     *    Equals to `this.keys[this.keys.length - 1]`.
     *    Exceptions will be thrown if `props.start` or `props.end` is not an
     *    positive integer number or `props.start >= props.end` (zero-length
     *    regions not allowed).
     * @param {number|null} props.reverseDepth - for `this.reverseDepth`
     * @param {GiveNonLeafNode|null|boolean} props.nextNode - for `this._next`
     * @param {GiveNonLeafNode|null|boolean} props.prevNode - for `this._prev`
     * @param {Array<number>|null} props.keys - for `this.keys`
     * @param {Array<GiveTreeNode>|null} props.values - for `this.values`
     *    Note that if `keys` and `values` are provided, `start` and `end`
     *    will be overridden as they are already provided in `keys`.
     * @memberof GiveNonLeafNode
     */
    constructor (props) {
      super(...arguments)
      // start and length is for the corresponding region
      props = props || {}
      this.isRoot = !!props.isRoot
      this.tree = props.tree
      if (
        Array.isArray(props.keys) && Array.isArray(props.values) &&
        props.values.length === props.keys.length - 1
      ) {
        // TODO: Sanity check for `this.keys`?
        this.keys = props.keys
        this.values = props.values
      } else {
        if (!Number.isInteger(props.start) || !Number.isInteger(props.end)) {
          throw (new give.GiveError('start or end is not an integer number ' +
            'in non-leaf node construction!'))
        } else if (props.start < 0 || props.end < 0 ||
          props.start >= props.end
        ) {
          throw (new give.GiveError('Range error. start: ' + props.start +
            ', end: ' + props.end))
        }
        this.keys = [props.start, props.end]
        this.values = [this.emptyChildValue]
      }
      this.reverseDepth = (
        Number.isInteger(props.reverseDepth) && props.reverseDepth > 0)
        ? props.reverseDepth : 0
      if (this.tree.neighboringLinks) {
        this.next = props.nextNode
        this.prev = props.prevNode
      }
    }

    get emptyChildValue () {
      return this.tree.localOnly ? false : null
    }

    /**
     * truncateChrRange - trancate chromosomal range to the region covered by
     *  `this`.
     * @memberof GiveNonLeafNode.prototype
     *
     * @param  {ChromRegionLiteral} chrRange - The chromosomal range to be
     *    truncated
     * @param  {boolean} truncStart - Whether to truncate the start coordinate
     * @param  {boolean} truncEnd   - Whether to truncate the end coordinate
     * @param  {boolean} doNotThrow - Whether to throw an exception if
     *    truncated region has a length not greater than 0 (because `chrRange`
     *    does not overlap with this node at all).
     * @returns {ChromRegionLiteral}  Returns a new chromosomal range with
     *    trancated coordinates.
     */
    truncateChrRange (chrRange, truncStart, truncEnd, doNotThrow) {
      var newRegion = chrRange.clone()
      try {
        if (truncStart && newRegion.start < this.start) {
          newRegion.start = this.start
        }
        if (truncEnd && newRegion.end > this.end) {
          newRegion.end = this.end
        }
      } catch (err) {
        if (!doNotThrow) {
          throw (new give.GiveError(chrRange + ' is not a valid chrRegion ' +
            'or not overlapping with the current node. \nRange start: ' +
            newRegion.start + ', end: ' + newRegion.end +
            '\nCurrent node start: ' + this.start +
            ', end: ' + this.end))
        }
      }
      return newRegion
    }

    /**
     * getStart - get the start coordinate of the region covered by this node
     * @memberof GiveNonLeafNode.prototype
     *
     * @returns {number}  The start coordinate.
     */
    get start () {
      return this.keys[0]
    }

    /**
     * getEnd - get the end coordinate of the region covered by this node
     * @memberof GiveNonLeafNode.prototype
     *
     * @returns {number}  The end coordinate.
     */
    get end () {
      return this.keys[this.keys.length - 1]
    }

    /**
     * getLength - get the length of the region covered by this node
     * @memberof GiveNonLeafNode.prototype
     *
     * @returns {number}  The length of the node
     */
    get length () {
      return this.end - this.start
    }

    /**
     * get childNum - get the number of children under this node.
     * @memberof GiveNonLeafNode.prototype
     *
     * @returns {number}  The number of children
     */
    get childNum () {
      return this.values.length
    }

    /**
     * setStart - set the start coordinate of the region covered by this node
     * @memberof GiveNonLeafNode.prototype
     *
     * @param {number} newStart - The new start coordinate.
     */
    set start (newStart) {
      this.keys[0] = newStart
    }

    /**
     * setEnd - set the end coordinate of the region covered by this node
     * @memberof GiveNonLeafNode.prototype
     *
     * @param {number} newEnd - The new end coordinate.
     */
    set end (newEnd) {
      this.keys[this.keys.length - 1] = newEnd
    }

    /**
     * getNext - get the next node
     *
     * @returns {GiveNonLeafNode|null}  the next node
     */
    get next () {
      if (!this.tree.neighboringLinks) {
        throw new give.GiveError(
          'Cannot get the next sibling in an unlinked tree!')
      }
      return this._next
    }

    /**
     * getNext - get the previous node
     *
     * @returns {GiveNonLeafNode|null}  the previous node
     */
    get prev () {
      if (!this.tree.neighboringLinks) {
        throw new give.GiveError(
          'Cannot get the previous sibling in an unlinked tree!')
      }
      return this._prev
    }

    /**
     * setNext - set the next node and fix all links within the child.
     *
     * @param  {GiveNonLeafNode|null} nextNode - the node that serves as the
     *    next node
     */
    set next (nextNode) {
      if (!this.tree.neighboringLinks) {
        throw new give.GiveError(
          'Cannot set the next sibling in an unlinked tree!')
      }
      this._next = nextNode || null
      if (nextNode) {
        nextNode._prev = this
        if (this.lastChild instanceof GiveNonLeafNode) {
          this.lastChild.next = nextNode.firstChild
        } else {
          // needs to handle child connections by themselves
          if (nextNode.firstChild instanceof GiveNonLeafNode) {
            nextNode.firstChild.prev = this.lastChild
          }
        }
      } else {
        // `nextNode === null` or `nextNode === false`
        try {
          this.lastChild.next = nextNode
        } catch (ignore) { }
      }
    }

    /**
     * setPrev - set the previous node and fix all links within the child.
     *
     * @param  {GiveNonLeafNode|null} prevNode - the node that serves as the
     *    previous node
     */
    set prev (prevNode) {
      if (!this.tree.neighboringLinks) {
        throw new give.GiveError(
          'Cannot set the previous sibling in an unlinked tree!')
      }
      this._prev = prevNode || null
      if (prevNode) {
        prevNode._next = this
        if (this.firstChild instanceof GiveNonLeafNode) {
          this.firstChild.prev = prevNode.lastChild
        } else {
          // needs to handle child connections by themselves
          if (prevNode.lastChild instanceof GiveNonLeafNode) {
            prevNode.lastChild.next = this.firstChild
          }
        }
      } else {
        // `nextNode === null` or `nextNode === false`
        try {
          this.firstChild.prev = prevNode
        } catch (ignore) { }
      }
    }

    /**
     * _severeSelfLinks - break links between siblings and `this`
     *
     * @param  {boolean|null} convertTo convert the link into. Should be
     *    `undefined` (default), `null` or `false`.
     * @param  {boolean} noPrev - do not severe links from previous siblings
     * @param  {boolean} noNext - do not severe links from next siblings
     */
    _severeSelfLinks (convertTo, noPrev, noNext) {
      if (!this.tree.neighboringLinks) {
        throw new give.GiveError(
          'No sibling links to severe in an unlinked tree!')
      }
      if (!noPrev) {
        try {
          this.prev.next = convertTo
        } catch (ignore) { }
      }
      if (!noNext) {
        try {
          this.next.prev = convertTo
        } catch (ignore) { }
      }
    }

    /**
     * _severeChildLinks - break links between all children.
     *
     * @param  {boolean|null} convertTo convert the link into. Should be
     *    either `null` (default) or `false`.
     * @param  {boolean} noPrev - do not severe links from previous siblings
     * @param  {boolean} noNext - do not severe links from next siblings
     */
    _severeChildLinks (
      convertTo, noPrev, noNext
    ) {
      if (!this.tree.neighboringLinks) {
        throw new give.GiveError(
          'No child links to severe in an unlinked tree!')
      }
      if (!noPrev) {
        try {
          this.firstChild._severeLinks(convertTo, false, true)
        } catch (ignore) { }
      }
      if (!noNext) {
        try {
          this.lastChild._severeLinks(convertTo, true, false)
        } catch (ignore) { }
      }
    }

    /**
     * _severeLinks - break links between siblings and `this`, and between all
     *    children as well.
     *
     * @param  {boolean|null} convertTo convert the link into. Should be
     *    either `undefined` (default), `null` or `false`.
     * @param  {boolean} noPrev - do not severe links from previous siblings
     * @param  {boolean} noNext - do not severe links from next siblings
     */
    _severeLinks (convertTo, noPrev, noNext) {
      this._severeChildLinks(convertTo, noPrev, noNext)
      this._severeSelfLinks(convertTo, noPrev, noNext)
    }

    /**
     * _fixChildLinks - fix sibling links for a specific child.
     *
     * @param  {number} index - the index of the child
     * @param  {boolean} doNotFixBack - if `true`, the links after this child
     *    will not be fixed.
     * @param  {boolean} doNotFixFront - if `true`, the links before this
     *    child will not be fixed.
     */
    _fixChildLinks (index, doNotFixBack, doNotFixFront) {
      if (!this.tree.neighboringLinks) {
        throw new give.GiveError('No child links to fix in an unlinked tree!')
      }
      if (this.reverseDepth > 0) {
        if (!doNotFixBack) {
          try {
            let nextChild = this._getChildNext(index)
            if (this.values[index]) {
              this.values[index].next = nextChild
            } else {
              nextChild.prev = this.values[index]
            }
          } catch (ignore) { }
        }
        if (!doNotFixFront) {
          try {
            let prevChild = this._getChildPrev(index)
            if (this.values[index]) {
              this.values[index].prev = prevChild
            } else {
              prevChild.next = this.values[index]
            }
          } catch (ignore) { }
        }
      }
    }

    /**
     * getFirstChild - get the first child element of `this`.
     * @memberof GiveNonLeafNode.prototype
     *
     * @returns {give.GiveTreeNode|boolean|null}  The first child element
     */
    get firstChild () {
      return this.values[0]
    }

    get firstLeaf () {
      return this.reverseDepth > 0 ? this.firstChild.firstLeaf : this.firstChild
    }

    /**
     * getLastChild - get the last child element of `this`.
     * @memberof GiveNonLeafNode.prototype
     *
     * @returns {give.GiveTreeNode|boolean|null}  The last child element
     */
    get lastChild () {
      return this.values[this.childNum - 1]
    }

    get lastLeaf () {
      return this.reverseDepth > 0 ? this.lastChild.lastLeaf : this.lastChild
    }

    /**
     * _getChildPrev - get the previous sibling of child at `index`.
     * @memberof GiveNonLeafNode.prototype
     *
     * @param {number} index - index of the child
     * @returns {give.GiveTreeNode|boolean|null}  the previous sibling of the
     *    child
     * @throws {give.GiveError} If no children available, throw an error
     */
    _getChildPrev (index) {
      if (index > 0) {
        return this.values[index - 1]
      }
      if (this.prev) {
        return this.prev.lastChild
      }
      throw new give.GiveError('No previous children!')
    }

    /**
     * _getChildNext - get the next sibling of child at `index`.
     * @memberof GiveNonLeafNode.prototype
     *
     * @param {number} index - index of the child
     * @returns {give.GiveTreeNode|boolean|null}  the next sibling of the
     *    child
     * @throws {give.GiveError} If no children available, throw an error
     */
    _getChildNext (index) {
      if (index < (this.childNum - 1)) {
        return this.values[index + 1]
      }
      if (this.next) {
        return this.next.firstChild
      }
      throw new give.GiveError('No next children!')
    }

    /**
     * insert - Insert data under this node
     * @memberof GiveNonLeafNode.prototype
     *
     * @param {Array<ChromRegionLiteral>} data - the sorted array of data
     *    entries (each should be an extension of `GIVe.ChromRegion`).
     *    `data === null` or `data === []` means there is no data in `chrRange`
     *    and `false`s will be used in actual storage.
     *    __NOTICE:__ any data overlapping `chrRange` should appear either
     *    here or in `continuedList`, otherwise `continuedList` in data
     *    entries may not work properly.
     *    After insertion, any entry within `data` that overlaps `chrRange`
     *    will be deleted from the array.
     * @param {ChromRegionLiteral} chrRange - the chromosomal range that
     *    `data` corresponds to.
     *    This is used to mark the empty regions correctly. No `null` will
     *    present within these regions after this operation.
     *    This parameter should be an `Object` with at least two properties:
     *    `{ start: <start coordinate>, end: <end coordinate>, ... }`,
     *    preferably a `GIVe.ChromRegion` object.
     * @param {object} props - additional properties being passed onto
     *    nodes.
     * @param {Array<ChromRegionLiteral>} props.contList - the list of data
     *    entries that should not start in `chrRange` but are passed from the
     *    earlier regions, this will be useful for later regions if date for
     *    multiple regions are inserted at the same time
     * @param {function|null} props.callback - the callback function to be
     *    used (with the data entry as its sole parameter) when inserting
     * @param {function|null} props.LeafNodeCtor - the constructor function of
     *    leaf nodes if they are not the same as the non-leaf nodes.
     * @returns {give.GiveNonLeafNode|Array<give.GiveNonLeafNode>}
     *    This shall reflect whether auto-balancing is supported for the tree.
     *    See `give.GiveNonLeafNode.prototype._restructureSingleLayer` for details.
     */
    insert (data, chrRange, props) {
      if (data && data.length === 1 && !chrRange) {
        chrRange = data[0]
      }

      if (data && !Array.isArray(data)) {
        throw (new give.GiveError('Data is not an array! ' +
          'This will cause problems in contList.'))
      }

      if (chrRange) {
        // clip chrRegion first (should never happen)
        chrRange = this.truncateChrRange(chrRange, true, true)
        // there are two cases for insertion:
        // 1. leaf nodes: use `give.DataNode` to store raw data
        // 2. non-leaf nodes:
        //    go deep to generate branch structure, or update summary
        //    (for trees that support summary and resolutions)
        if (this.reverseDepth > 0) {
          // case 2
          this._addNonLeafRecords(data, chrRange, props)
          // Note: keys may change after adding leaf records
          this.keys = this.values.map(node => node.start)
          this.keys.push(this.lastChild.end)
        } else {
          // case 1
          this._addLeafRecords(data, chrRange, props)
        }
      } else { // chrRange
        throw (new give.GiveError(chrRange + ' is not a valid chrRegion.'))
      } // end if(chrRange)
      return this._restructureSingleLayer()
    }

    /**
     * _restructure - The function to be called after
     *    adding/removing data to the node.
     *    This is used in implementations that involve post-insertion
     *    processes of the tree (for example, rebalancing in B+ tree
     *    derivatives).
     *    The function will only restructure the immediate children of `this`
     *    or `this` if it is a root node. It will assume all grandchildren
     *    (if any) has been already restructured correctly.
     *    For trees that do not implement post-insertion processes, return
     *    `this`.
     * @memberof GiveNonLeafNode.prototype
     *
     * @returns {give.GiveNonLeafNode|Array<give.GiveNonLeafNode>|false}
     *    This shall reflect whether there are any changes in the tree
     *    structure for root and non-root nodes:
     *    * For root nodes, always return `this` (cannot delete root even
     *      without any children).
     *    * For inner nodes (or leaf), if the node should be removed (being
     *      merged with its sibling(s) or becoming an empty node, for
     *      example), return `false`. Return `this` in all other cases.
     */
    _restructure () {
      // for non-auto-balancing trees, return false if this node has no data
      //    any more
      if (this.values[0] && this.values[0].isEmpty) {
        this.values[0] = false
      }
      return (!this.isRoot && this.isEmpty) ? false : this
    }

    /**
     * _addNonLeafRecords - add records to a non-leaf node
     * @memberof GiveNonLeafNode.prototype
     *
     * @param {Array<ChromRegionLiteral>} data - the sorted array of data
     *    entries. See `this.insert` for detailed description.
     * @param {ChromRegionLiteral} chrRange - see `this.insert`
     * @param {object} props - additional properties being passed onto nodes.
     * @param {Array<ChromRegionLiteral>} props.contList - see `this.insert`
     * @param {function|null} props.callback - see `this.insert`
     */
    _addNonLeafRecords (data, chrRange, props) {
      throw new give.GiveError('GiveNonLeafNode._addNonLeafRecords not ' +
        'implemented in `' + this.constructor.name + '`!')
    }

    /**
     * _addLeafRecords - add records to a leaf node (with `revDepth === 0`)
     * @memberof GiveNonLeafNode.prototype
     *
     * @param {Array<ChromRegionLiteral>} data - the sorted array of data
     *    entries. See `this.insert` for detailed description.
     * @param {ChromRegionLiteral} chrRange - see `this.insert`
     * @param {object} props - additional properties being passed onto nodes.
     * @param {Array<ChromRegionLiteral>} props.contList - see `this.insert`
     * @param {function|null} props.callback - see `this.insert`
     * @param {function|null} props.LeafNodeCtor - see `this.insert`
     */
    _addLeafRecords (data, chrRange, props) {
      throw new give.GiveError('GiveNonLeafNode._addLeafRecords not ' +
        'implemented in `' + this.constructor.name + '`!')
    }

    clear (convertTo) {
      convertTo = convertTo === false ? false : this.emptyChildValue
      if (this.tree.neighboringLinks) {
        this._severeChildLinks(convertTo)
      }
      this.keys = [this.start, this.end]
      this.values = [convertTo]
    }

    /**
     * _splitChild - split a child into two
     * If the old child at `index` is not `null` or `false`, both
     *    `newLatterChild` and `newFormerChild` will be needed (otherwise the
     *    tree structure may be corrupted).
     *
     * @param  {number} index - index of the child to be split.
     * @param  {number} newKey - the new key separating the two children
     * @param  {give.GiveTreeNode|false|null} [newLatterChild] - the new
     *    latter child. If `undefined`, use the old child.
     * @param  {give.GiveTreeNode|false|null} [newFormerChild] - the new
     *    former child. If `undefined`, use the old child.
     * @returns {number} Number of split children (2 in this case)
     */
    _splitChild (index, newKey, newLatterChild, newFormerChild) {
      if (this.values[index] &&
        (newLatterChild === undefined && newFormerChild === undefined)
      ) {
        throw new give.GiveError('Cannot split an existing child without ' +
          'providing both resulting siblings!')
      }
      this.keys.splice(index + 1, 0, newKey)
      this.values.splice(index + 1, 0,
        newLatterChild === undefined ? this.values[index] : newLatterChild)
      if (newLatterChild !== undefined) {
        if (this.tree.neighboringLinks) {
          this._fixChildLinks(index + 1, false, true)
        }
      }
      if (newFormerChild !== undefined) {
        this.Value[index] = newFormerChild
        if (this.tree.neighboringLinks) {
          this._fixChildLinks(index, newLatterChild === undefined, false)
        }
      }
      return 2
    }

    /**
     * _childMergable - determine whether two children are mergable.
     *
     * @param  {type} childFront - the child at front being considered to
     *    merge.
     * @param  {type} childBack - the child at back being considered to merge.
     * @returns {type}            return whether the children are mergable.
     *    If both are `null` or both are `false`, return `true`.
     *    If `childFront` has `.mergeAfter(child)` function and returns true
     *      when called with `childBack`, return `true`.
     *    Return false on all other cases.
     */
    static _childMergable (childFront, childBack) {
      return (childFront === childBack &&
        (childFront === this.emptyChildValue || childFront === false)
      ) || (childFront && (typeof childFront.mergeAfter === 'function') &&
        childFront.mergeAfter(childBack)
      )
    }

    /**
     * _mergeChild - merge neighboring children that are the same as
     *    `this.values[index]`, if they are `false` or `null`.
     *    This function will always merge with the child __before__ `index`
     *    first, then, if `mergeNext === true`, merge with the child after
     *    `index`.
     *
     * @param  {number} index - index of the child
     * @param  {boolean} mergeNext - whether merge the next child as well
     * @param  {boolean} crossBorder - whether merging can happen across
     *    parent borders. If so, the children nodes in siblings of this may be
     *    expanded. (The number of children will not be affected in sibling
     *    nodes, so that the structure of neighboring nodes are not messed
     *    up.)
     *    __Note:__ `crossBorder` can only be used when
     *    `this.tree.neighboringLinks === true`.
     *    If `this.tree.neighboringLinks === false`, this argument will be
     *    ignored, because `this` has no way of knowing its own siblings, thus
     *    unable to merge children across sibling
     *    borders.
     * @returns {boolean} whether merge happened to the previous child (this
     *    is used for calling function to correct indices when merging during
     *    traversing.)
     */
    _mergeChild (index, mergeNext, crossBorder) {
      let mergedFront = false
      if (index > 0 ||
        (this.tree.neighboringLinks && crossBorder && this.childNum > 1)
      ) {
        // merge previous child first
        try {
          if (this.constructor._childMergable(
            this._getChildPrev(index), this.values[index]
          )) {
            // remove child at `index`
            this.keys.splice(index, 1)
            this.values.splice(index, 1)
            if (this.tree.neighboringLinks) {
              if (index === 0) {
                this.prev.end = this.start
                this._fixChildLinks(index, true)
              } else {
                this._fixChildLinks(index - 1, false, true)
              }
            }
            mergedFront = true
          }
        } catch (ignore) {}
      }

      // if `mergeNext` is `true`, do the same to the next node
      if (mergeNext) {
        if (index < this.childNum - 1 &&
          this.constructor._childMergable(
            this.values[index], this.values[index + 1]
          )
        ) {
          // remove child at `index + 1`
          this.keys.splice(index + 1, 1)
          this.values.splice(index + 1, 1)
          if (this.tree.neighboringLinks) {
            this._fixChildLinks(index, false, true)
          }
        } else if (
          crossBorder && index === this.childNum - 1 &&
          this.next && this.childNum > 1 &&
          this.constructor._childMergable(
            this.values[index], this._getChildNext(index)
          )
        ) {
          this.next.keys[0] = this.keys[index]
          this.next.values[0] = this.values[index]
          this.keys.splice(-1)
          this.values.splice(-1)
          // needs to change the boundary of sibling node
          this.end = this.next.start
          if (this.tree.neighboringLinks) {
            this.next._fixChildLinks(0, false, true)
          }
        }
      }
      return mergedFront
    }

    traverse (chrRange, callback, filter, breakOnFalse, props, ...args) {
      // Implementation without resolution support
      // Because this is a non-leaf node, it always descends to its children
      // until some leaf node is reached.
      if (!chrRange) {
        throw (new give.GiveError(chrRange + ' is not a valid chrRegion.'))
      }
      let index = 0
      while (index < this.childNum &&
        this.keys[index + 1] <= chrRange.start
      ) {
        index++
      }
      while (this.keys[index] < chrRange.end && index < this.childNum) {
        if (this.values[index] &&
          !this.values[index].traverse(chrRange, callback, filter,
            breakOnFalse, props, ...args)
        ) {
          return false
        }
        props.notFirstCall = true
        index++
      }
      return true
    }

    /**
     * getUncachedRange - Return an array of chrRegions that does not have
     *   data loaded to allow buffered loading of data
     *
     * @param  {GIVE.ChromRegion} chrRange - The range of query.
     * @param  {object|null} props - additional properties being passed onto
     *    nodes
     * @param  {Array<GIVE.ChromRegion>} props._result - previous unloaded
     *    regions. This will be appended to the front of returned value.
     *    This array will be updated if it gets appended to reduce memory
     *    usage and GC.
     * @returns {Array<GIVE.ChromRegion>} An ordered array of the regions that
     *    does not have the data at the current resolution requirement.
     *    If no non-data ranges are found, return []
     */
    getUncachedRange (chrRange, props) {
      props._result = props._result || []
      if (chrRange) {
        var index = 0
        while (index < this.childNum &&
          this.keys[index + 1] <= chrRange.start
        ) {
          index++
        }
        while (index < this.childNum &&
          this.keys[index] < chrRange.end
        ) {
          if (this.values[index]) {
            // there is a child node here, descend
            this.values[index].getUncachedRange(chrRange, props)
          } else if (this.values[index] === null) {
            let newStart = Math.max(this.keys[index], chrRange.start)
            let newEnd = Math.min(this.keys[index + 1], chrRange.end)
            if (props._result[props._result.length - 1] &&
              props._result[props._result.length - 1].end === newStart
            ) {
              props._result[props._result.length - 1].end = newEnd
            } else {
              props._result.push(new give.ChromRegion({
                chr: chrRange.chr,
                start: newStart,
                end: newEnd
              }))
            }
          }
          index++
        }
        return props._result
      } else { // chrRange
        throw (new give.GiveError(chrRange + ' is not a valid chrRegion.'))
      }
    }

    hasUncachedRange (chrRange, props) {
      if (chrRange) {
        var index = 0
        while (index < this.childNum &&
          this.keys[index + 1] <= chrRange.start
        ) {
          index++
        }
        while (index < this.childNum &&
          this.keys[index] < chrRange.end
        ) {
          if (this.values[index]) {
            // there is a child node here, descend
            if (this.values[index].hasUncachedRange(chrRange, props)) {
              return true
            }
          } else if (this.values[index] === null) {
            return true
          }
          index++
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
      return this.childNum <= 0 || (this.childNum === 1 &&
        (this.values[0] === false ||
          !!(this.values[0] && this.values[0].isEmpty)))
    }
  }

  give.GiveNonLeafNode = GiveNonLeafNode

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
   * Withering nodes.
   * These nodes have a property called `_lastUpdateGen` to show their last
   *    updated generation number. When `.wither()` is called, the age will
   *    be calculated by `this.tree._currGen` and then compared with
   *    `this.tree.lifeSpan`. If the node is older than expected, then the
   *    content of the node will be purged with `null` with `.clear(null)`.
   * The node is also responsible for withering of all its children. For any
   *    child that returns `true` for its `.wither()` call, call
   *    `.remove(child, true)` to remove them.
   *
   * @typedef {object} WitheringMixin
   * @property {number} _lastUpdateGen - Last updated generation of this node.
   *    This value will be updated whenever `.insert()` or `.traverse()` is
   *    called so that active branches won't wither easily. Because of this,
   *    the `_lastUpdateGen` for parents should always be no earlier than their
   *    children (see `this.wither()` for a potential exception and the
   *    solution for that).
   *
   * @class give.witheringMixin
   *
   * @constructor
   * @param {object} [props] - properties that will be passed to the individual
   *    implementations
   * @param {object} [props._currGen] - the current generation
   */
  give.WitheringMixin = Base => class extends Base {
    constructor (props) {
      super(...arguments)
      if ((props && props._currGen) || (this.tree && this.tree.lifeSpan)) {
        this._lastUpdateGen = props._currGen || this.tree._currGen
      }
    }

    mergeAfter (node) {
      let nodeGen = node
        ? (node._lastUpdateGen || this._lastUpdateGen) : this._lastUpdateGen
      if (typeof super.mergeAfter === 'function') {
        let result = super.mergeAfter(...arguments)
        if (result) {
          if (this._genOlderThan(nodeGen)) {
            this._lastUpdateGen = nodeGen
          }
        }
        return result
      }
      return false
    }

    _genOlderThan (generationToComp) {
      return this.tree && this.tree.lifeSpan &&
        generationToComp > this._lastUpdateGen &&
        ((generationToComp <= this.tree._currGen) ===
          (this._lastUpdateGen <= this.tree._currGen)
        )
    }

    /**
     * wither - Let nodes and/or their children that are too old wither
     *    Note that this withering only removes nodes, it does not do any
     *    restructuring that may be required for some trees. The restructuring
     *    needs to happen in the __`GiveTree`__ object calling this.
     *
     * @returns {boolean} `true` if the node itself has withered and should
     *    be removed from its parent.
     */
    wither () {
      // If `this.tree.neighboringLinks === true`, traversing may get around
      //    parents, which may cause the generation of parent nodes to be older
      //    than their offspring, this needs to be corrected first.
      if (this.tree.neighboringLinks) {
        this.values.forEach(value => {
          if (value && typeof value._lastUpdateGen === 'number' &&
            this._genOlderThan(value._lastUpdateGen)
          ) {
            this._lastUpdateGen = value._lastUpdateGen
          }
        })
      }
      // If current node itself withers,
      // it will cause this and *all the children of this* wither
      // NOTE: Root node may also wither, which causes the whole tree to wither
      if (this._shouldWither) {
        this.clear(null)
        return true
      }
      // For children, mark all children that needs to be withered
      // then call `this.delete` on all children marked.
      for (let index = 0; index < this.childNum; index++) {
        let child = this.values[index]
        if (child && typeof child.wither === 'function' && child.wither()) {
          this.remove(child, true, null)
          index--
        }
      }
      return this.childNum <= 1 && this.values[0] === null
    }

    get _shouldWither () {
      if (!this.tree || !this.tree.lifeSpan) {
        return false
      }
      return !(this.firstChild && this.firstChild._shouldWither === false) && (
        this.tree._currGen >= this._lastUpdateGen
          ? this.tree._currGen - this._lastUpdateGen > this.tree.lifeSpan
          : this.tree._currGen +
            (this.tree.constructor.MAX_GENERATION - this._lastUpdateGen) >
            this.tree.lifeSpan
      )
    }

    rejuvenate () {
      if (this.tree && this.tree.lifeSpan) {
        this._lastUpdateGen = this.tree._currGen
      }
    }

    traverse (chrRange, callback, filter, breakOnFalse, props, ...args) {
      let result
      if (typeof super.traverse === 'function') {
        result = super.traverse(...arguments)
      }
      if (!props || !props.doNotWither) {
        this.rejuvenate()
      }
      return result
    }

    getUncachedRange (chrRange, props, ...args) {
      let result
      if (typeof super.getUncachedRange === 'function') {
        result = super.getUncachedRange(...arguments)
      }
      if (!props || !props.doNotWither) {
        this.rejuvenate()
      }
      return result
    }
  }

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
        node.updateContList(this.contList.concat(this.startList))
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

    updateContList (contList) {
      if (contList) {
        contList = contList.filter(entry => (entry.end > this.start))
        if (this.contList.length > contList.length) {
          give._verbConsole.warn('Warning: continuedList inconsistent.')
        }
        this.contList = contList
      }
      return this.contList.concat(this.startList)
    }
  }

  give.DataNode = DataNode
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
     *    To disable withering, set `props.lifeSpan` to 0 or a negative value.
     * @param {function} props.LeafNodeCtor - if omitted, the constructor of
     *    `this.root` will be used
     * @param {boolean} props.localOnly - Whether this tree allows live
     *    updating of its content (CUD operations), if this is `true`,
     *    withering will be disabled and `props.lifeSpan` will be ignored.
     * @memberof GiveTree
     */
    constructor (chrRange, NonLeafNodeCtor, props) {
      props = props || {}
      this._initProperties(chrRange, NonLeafNodeCtor, props)
      props.start = chrRange.start
      props.end = chrRange.end
      props.tree = this
      props.isRoot = true
      if (!this.localOnly &&
        ((typeof props.lifeSpan === 'number' && props.lifeSpan > 0) ||
        !props.lifeSpan)
      ) {
        props.lifeSpan = props.lifeSpan || this.constructor.DEFAULT_LIFE_SPAN
        this._currGen = 0
        this.lifeSpan = props.lifeSpan
        this._root = new (give.WitheringMixin(NonLeafNodeCtor))(props)
        this._witheringPromise = null
      } else {
        this._currGen = null
        this._root = new NonLeafNodeCtor(props)
      }
    }

    _initProperties (chrRange, NonLeafNodeCtor, props) {
      this.chr = chrRange.chr
      this._LeafNodeCtor = props.LeafNodeCtor || NonLeafNodeCtor
      this.localOnly = !!props.localOnly
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
     * @param {ChromRegionLiteral} [chrRange] -
     *    the chromosomal range that `data` corresponds to.
     * @param {object} props
     * @param {boolean} [props.doNotWither]
     * @param {Array<ChromRegionLiteral>} [props.contList]
     * @param {function} [props.callback]
     * @param {function} [props.LeafNodeCtor]
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
     *    here or in `props.contList`, otherwise `continuedList` in data
     *    entries may not work properly.
     * @param {Array<ChromRegionLiteral>|ChromRegionLiteral} [chrRanges]
     *    the array of chromosomal range(s) that `data` corresponds to.
     *    This is used to mark the empty regions correctly. No `null` will
     *    present within these regions after this operation.
     *    The elements of this parameter should be an `Object` with at least
     *    two properties:
     *    `{ start: <start coordinate>, end: <end coordinate>, ... }`,
     *    preferably a `GIVe.ChromRegion` object.
     *    If `data.length === 1` and `chrRange === null`, then
     *    `chrRegion = data[0]` because of ChromRegion behavior.
     *    If `this.localOnly === true`, this parameter will be ignored.
     * @param {Array<object>|object} [props] - additional properties being
     *    passed onto nodes. If this is an `Array`, it should have the same
     *    `length` as `chrRanges` does.
     * @param {boolean} [props.doNotWither] - If `true`, the tree will not
     *    advance its generation or trigger withering.
     * @param {function} [props.LeafNodeCtor] - the constructor function of
     *    leaf nodes if they are not the same as the non-leaf nodes.
     * @param {Array<ChromRegionLiteral>} [props.contList] - the list of data
     *    entries that should not start in `chrRange` but are passed from the
     *    earlier regions, this will be useful for later regions if data for
     *    multiple regions are inserted at the same time
     * @param {function} [props.callback] - the callback function to be used
     *    (with the data entry as its sole parameter) when inserting
     */
    insert (data, chrRanges, props) {
      let exceptions = []
      if (this.localOnly) {
        this._insertSingleRange(data, this.coveringRange,
          Array.isArray(props) ? props[0] : props)
      } else {
        if (!Array.isArray(chrRanges)) {
          chrRanges = [chrRanges]
        }
        let uncachedRanges = chrRanges.reduce(
          (uncachedRanges, range) =>
            uncachedRanges.concat(this.getUncachedRange(range)),
          []
        )
        uncachedRanges.forEach((range, index) => {
          try {
            this._insertSingleRange(data, range,
              Array.isArray(props) ? props[index] : props)
          } catch (err) {
            err.message = '[insert] ' + err.message + '\n' + err.stack
            exceptions.push(err)
            return null
          }
        })
        if (exceptions.length > 0) {
          let message = exceptions.reduce(
            (prevMessage, currErr) => (prevMessage + '\n' + currErr.message),
            'Exception occured during insertion:'
          )
          give._verbConsole.warn(message)
          give.fireSignal('give-warning', { msg: message }, null, this)
          throw new give.GiveError(message)
        }
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
            this._root = this._root._restructure()
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
          give.fireSignal('give-warning', { msg: err.toString() }, null, this)
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
     * @param {object} props - additional properties being passed onto
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
      if (!this.localOnly &&
        (!chrRange || !chrRange.chr || chrRange.chr === this.chr)
      ) {
        chrRange = chrRange
          ? this._root.truncateChrRange(chrRange, true, false)
          : this.coveringRange
        return this._root.getUncachedRange(chrRange, props)
      } else {
        return []
      }
    }

    /**
     * hasUncachedRange - quickly check if the tree has any uncached range
     *    within a specific range.
     * This is used for sectional loading.
     * @memberof GiveTreeBase.prototype
     *
     * @param {ChromRegionLiteral} chrRange - the chromosomal range to query
     * @param {object|null} props - additional properties being passed onto
     *    nodes
     * @returns {boolean} `true` if the tree has uncached ranges.
     */
    hasUncachedRange (chrRange, props) {
      props = props || {}
      if (!this.localOnly &&
        (!chrRange || !chrRange.chr || chrRange.chr === this.chr)
      ) {
        chrRange = chrRange
          ? this._root.truncateChrRange(chrRange, true, false)
          : this.coveringRange
        return this._root.hasUncachedRange(chrRange, props)
      }
      return false
    }
  }

  GiveTree.MAX_GENERATION = Number.MAX_SAFE_INTEGER - 100
  GiveTree.DEFAULT_LIFE_SPAN = 10

  give.GiveTree = GiveTree

  return give
})(GIVe || {})
