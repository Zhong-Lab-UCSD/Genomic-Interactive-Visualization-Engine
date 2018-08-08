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
        props.childNum === props.keys.length - 1
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
        this.values = [null]
      }
      this.reverseDepth = (Number.isInteger(props.reverseDepth) && props.reverseDepth > 0)
        ? props.reverseDepth : 0
      if (this.tree.neighboringLinks) {
        this.next = props.nextNode
        this.prev = props.prevNode
      }
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
      return this.childNum
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
            .push(this.lastChild.end)
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
     * _restructureSingleLayer - The function to be called after
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
    _restructureSingleLayer () {
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
      convertTo = convertTo === false ? false : null
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
        (childFront === null || childFront === false)
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
      var mergedFront = false
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
          (this.values[0] && this.values[0].isEmpty)))
    }
  }

  give.GiveNonLeafNode = GiveNonLeafNode

  return give
})(GIVe || {})
