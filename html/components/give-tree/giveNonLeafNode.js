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
   * `StartList` in all overlapping records will be processed.
   *
   * @typedef {object} GiveNonLeafNode
   * @property {GiveTree} Tree - Link to the `GiveTree` object to access tree-
   *    wise properties.
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
   *    Therefore, neighboring nodes will have exactly one overlapping key.
   *    `Values` can be `false` or `null` (unless prohibited by implementation)
   *    indicating empty regions or data not loaded, respectively.
   * @property {number} RevDepth - "Reversed depth" of the node. The one holding
   *    leaf nodes (should be `GIVE.DataNode` or similar implementations) is at
   *    `0` and root is at maximum.
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
   * @param {GiveTree} props.Tree - for `this.Tree`
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
   * @param {Array<number>|null} props.Keys - for `this.Keys`
   * @param {Array<GiveTreeNode>|null} props.Values - for `this.Values`
   *    Note that if `Keys` and `Values` are provided, `Start` and `End` will be
   *    overridden as they are already provided in `Keys`.
   */
  give.GiveNonLeafNode = function (props) {
    // start and length is for the corresponding region
    props = props || {}
    if (!Number.isInteger(props.Start) || !Number.isInteger(props.End)) {
      throw (new Error('Start or End is not an integer number in non-leaf ' +
             'node construction!'))
    }
    this.IsRoot = !!props.IsRoot
    this.Tree = props.Tree
    if (
      Array.isArray(props.Keys) && Array.isArray(props.Values) &&
      props.Values.length === props.Keys.length - 1
    ) {
      // TODO: Sanity check for `this.Keys`?
      this.Keys = props.Keys
      this.Values = props.Values
    } else {
      if (props.Start < 0 || props.End < 0 || props.Start >= props.End) {
        throw (new Error('Range error. Start: ' + props.Start +
          ', end: ' + props.End))
      }
      this.Keys = [props.Start, props.End]
      this.Values = [null]
    }
    this.RevDepth = (Number.isInteger(props.RevDepth) && props.RevDepth > 0)
      ? props.RevDepth : 0
    this.setNext(props.NextNode)
    this.setPrev(props.PrevNode)
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
    this.Next = nextNode || null
    if (nextNode) {
      nextNode.Prev = this
      if (
        this.getLastChild() &&
        typeof this.getLastChild().setNext === 'function'
      ) {
        this.getLastChild().setNext(nextNode.getFirstChild())
      } else {
        // needs to handle child connections by themselves
        if (
          nextNode.getFirstChild() &&
          typeof nextNode.getFirstChild().setPrev === 'function'
        ) {
          nextNode.getFirstChild().setPrev(this.getLastChild())
        }
      }
    } else {
      // `nextNode === null` or `nextNode === false`
      try {
        this.getLastChild().setNext(nextNode)
      } catch (ignore) { }
    }
  }

  /**
   * setPrev - set the previous node and fix all links within the child.
   *
   * @param  {GiveNonLeafNode|null} prevNode - the node that serves as the
   *    previous node
   */
  give.GiveNonLeafNode.prototype.setPrev = function (prevNode) {
    this.Prev = prevNode || null
    if (prevNode) {
      prevNode.Next = this
      if (
        this.getFirstChild() &&
        typeof this.getFirstChild().setPrev === 'function'
      ) {
        this.getFirstChild().setPrev(prevNode.getLastChild())
      } else {
        // needs to handle child connections by themselves
        if (
          prevNode.getLastChild() &&
          typeof prevNode.getLastChild().setNext === 'function'
        ) {
          prevNode.getLastChild().setNext(this.getFirstChild())
        }
      }
    } else {
      // `nextNode === null` or `nextNode === false`
      try {
        this.getFirstChild().setPrev(prevNode)
      } catch (ignore) { }
    }
  }

  /**
   * _severeSelfLinks - break links between siblings and `this`
   *
   * @param  {boolean|null} convertTo convert the link into. Should be either
   *    `null` (default) or `false`.
   * @param  {boolean} noPrev - do not severe links from previous siblings
   * @param  {boolean} noNext - do not severe links from next siblings
   */
  give.GiveNonLeafNode.prototype._severeSelfLinks = function (
    convertTo, noPrev, noNext
  ) {
    if (!noPrev) {
      try {
        this.getPrev().setNext(convertTo)
      } catch (ignore) { }
    }
    if (!noNext) {
      try {
        this.getNext().setPrev(convertTo)
      } catch (ignore) { }
    }
  }

  /**
   * _severeChildLinks - break links between all children.
   *
   * @param  {boolean|null} convertTo convert the link into. Should be either
   *    `null` (default) or `false`.
   * @param  {boolean} noPrev - do not severe links from previous siblings
   * @param  {boolean} noNext - do not severe links from next siblings
   */
  give.GiveNonLeafNode.prototype._severeChildLinks = function (
    convertTo, noPrev, noNext
  ) {
    if (!noPrev) {
      try {
        this.getFirstChild()._severeLinks(convertTo, false, true)
      } catch (ignore) { }
    }
    if (!noNext) {
      try {
        this.getLastChild()._severeLinks(convertTo, true, false)
      } catch (ignore) { }
    }
  }

  /**
   * _severeLinks - break links between siblings and `this`, and between all
   *    children as well.
   *
   * @param  {boolean|null} convertTo convert the link into. Should be either
   *    `null` (default) or `false`.
   * @param  {boolean} noPrev - do not severe links from previous siblings
   * @param  {boolean} noNext - do not severe links from next siblings
   */
  give.GiveNonLeafNode.prototype._severeLinks = function (
    convertTo, noPrev, noNext
  ) {
    this._severeChildLinks(convertTo, noPrev, noNext)
    this._severeSelfLinks(convertTo, noPrev, noNext)
  }

  /**
   * _fixChildLinks - fix sibling links for a specific child.
   *
   * @param  {number} index - the index of the child
   */
  give.GiveNonLeafNode.prototype._fixChildLinks = function (index) {
    if (this.RevDepth > 0) {
      var prevChild = this._getChildPrev(index)
      var nextChild = this._getChildNext(index)
      if (this.Values[index]) {
        this.Values[index].setNext(nextChild)
        this.Values[index].setPrev(prevChild)
      } else {
        try {
          prevChild.setNext(this.Values[index])
        } catch (ignore) { }
        try {
          nextChild.setPrev(this.Values[index])
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
  give.GiveNonLeafNode.prototype.getFirstChild = function () {
    return this.Values[0]
  }

  /**
   * getLastChild - get the last child element of `this`.
   * @memberof GiveNonLeafNode.prototype
   *
   * @returns {give.GiveTreeNode|boolean|null}  The last child element
   */
  give.GiveNonLeafNode.prototype.getLastChild = function () {
    return this.Values[this.Values.length - 1]
  }

  /**
   * _getChildPrev - get the previous sibling of child at `index`.
   * @memberof GiveNonLeafNode.prototype
   *
   * @param {number} index - index of the child
   * @returns {give.GiveTreeNode|boolean|null}  the previous sibling of the
   *    child
   */
  give.GiveNonLeafNode.prototype._getChildPrev = function (index) {
    return (index > 0 ? this.Values[index - 1]
      : (this.getPrev() ? this.getPrev().getLastChild() : this.getPrev()))
  }

  /**
   * _getChildNext - get the next sibling of child at `index`.
   * @memberof GiveNonLeafNode.prototype
   *
   * @param {number} index - index of the child
   * @returns {give.GiveTreeNode|boolean|null}  the next sibling of the child
   */
  give.GiveNonLeafNode.prototype._getChildNext = function (index) {
    return (index < (this.Values.length - 1) ? this.Values[index + 1]
      : (this.getNext() ? this.getNext().getFirstChild() : this.getNext()))
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
   *    After insertion, any entry within `data` that overlaps `chrRange` will
   *    be deleted from the array.
   * @param {ChromRegionLiteral} chrRange - the chromosomal range that `data`
   *    corresponds to.
   *    This is used to mark the empty regions correctly. No `null` will present
   *    within these regions after this operation.
   *    This parameter should be an `Object` with at least two properties:
   *    `{ start: <start coordinate>, end: <end coordinate>, ... }`,
   *    preferably a `GIVe.ChromRegion` object.
   * @param {object|null} props - additional properties being passed onto nodes.
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
   * @returns {give.GiveNonLeafNode|Array<give.GiveNonLeafNode>}
   *    This shall reflect whether auto-balancing is supported for the tree.
   *    See `give.GiveNonLeafNode.prototype._restructuring` for details.
   */
  give.GiveNonLeafNode.prototype.insert = function (data, chrRange, props) {
    props = props || {}
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
      // there are two cases for insertion:
      // 1. leaf nodes: use `give.DataNode` to store raw data
      // 2. non-leaf nodes:
      //    go deep to generate branch structure, or update summary
      //    (for trees that support summary and resolutions)
      if (this.RevDepth > 0) {
        // case 2
        this._addNonLeafRecords(data, chrRange, props)
      } else {
        // case 1
        this._addLeafRecords(data, chrRange, props)
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
   *    This shall reflect whether there are any changes in the tree structure.
   *    for root and non-root nodes:
   *    * For root nodes, always return `this` (cannot delete root even without
   *      any children).
   *    * for inner nodes (or leaf), if the node should be removed (being merged
   *      with its sibling(s) or becoming an empty node, for example), return
   *      `false`. Return `this` in all other cases.
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
   * @param {ChromRegionLiteral} chrRange - see `this.insert`
   * @param {object} props - additional properties being passed onto nodes.
   * @param {Array<ChromRegionLiteral>} props.ContList - see `this.insert`
   * @param {function|null} props.Callback - see `this.insert`
   * @param {object|null} props.ThisVar - see `this.insert`
   */
  give.GiveNonLeafNode.prototype._addNonLeafRecords = function (
    data, chrRange, props
  ) {
    throw new Error('GiveNonLeafNode._addNonLeafRecords not implemented in `' +
      this.constructor.name + '`!')
  }

  /**
   * _addLeafRecords - add records to a leaf node (with `revDepth === 0`)
   * @memberof GiveNonLeafNode.prototype
   *
   * @param {Array<ChromRegionLiteral>} data - the sorted array of data entries.
   *    See `this.insert` for detailed description.
   * @param {ChromRegionLiteral} chrRange - see `this.insert`
   * @param {object} props - additional properties being passed onto nodes.
   * @param {Array<ChromRegionLiteral>} props.ContList - see `this.insert`
   * @param {function|null} props.Callback - see `this.insert`
   * @param {object|null} props.ThisVar - see `this.insert`
   * @param {function|null} props.LeafNodeCtor - see `this.insert`
   */
  give.GiveNonLeafNode.prototype._addLeafRecords = function (
    data, chrRange, props
  ) {
    throw new Error('GiveNonLeafNode._addLeafRecords not implemented in `' +
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
   * @param {function|null} props.Callback - the callback function to be used
   *    (with the data entry as its sole parameter) when deleting
   * @param {object|null} props.ThisVar - `this` used in calling
   *    `props.Callback`.
   * @returns {give.GiveTreeNode|boolean}
   *    This shall reflect whether auto-balancing is supported for the tree.
   *    If structure of the tree needs to be changed, return `false` and let the
   *    caller (likely the parent node) handle the upper structure.
   */
  give.GiveNonLeafNode.prototype.remove = function (
    data, removeExactMatch, props
  ) {
    throw new Error('GiveNonLeafNode.remove not implemented in `' +
      this.constructor.name + '`!')
  }

  give.GiveTreeNode.prototype.clear = function (convertTo) {
    convertTo = convertTo === false ? false : null
    this._severeChildLinks(convertTo)
    this.Keys = [this.getStart(), this.getEnd()]
    this.Values = [convertTo]
  }

  /**
   * _splitChild - split a child into two
   *
   * @param  {number} index - index of the child to be split.
   * @param  {number} newKey - the new key separating the two children
   * @param  {give.GiveTreeNode|} newLatterChild - the new latter child.
   *    If `null`, use the old child.
   * @param  {give.GiveTreeNode|null} newFormerChild - the new former child.
   *    If `null`, use the old child.
   */
  give.GiveNonLeafNode.prototype._splitChild = function (
    index, newKey, newLatterChild, newFormerChild
  ) {
    this.Keys.splice(index + 1, 0, newKey)
    this.Values.splice(index + 1, 0,
      newLatterChild === undefined ? this.Values[index] : newLatterChild)
    this._fixChildLinks(index + 1)
    if (newFormerChild !== undefined) {
      this.Value[index] = newFormerChild
      this._fixChildLinks(index)
    }
  }

  /**
   * _childMergable - determine whether two children are mergable.
   *
   * @param  {type} childFront - the child at front being considered to merge.
   * @param  {type} childBack - the child at back being considered to merge.
   * @returns {type}            return whether the children are mergable.
   *    If both are `null` or both are `false`, return `true`.
   *    If `childFront` has `.merge(child)` function and returns true when
   *      called with `childBack`, return `true`.
   *    Return false on all other cases.
   */
  give.GiveNonLeafNode._childMergable = function (childFront, childBack) {
    return (
      childFront === childBack && (childFront === null || childFront === false)
    ) || (
      childFront && (typeof childFront.merge === `function`) &&
      childFront.merge(childBack)
    )
  }

  /**
   * _mergeChild - merge neighboring children that are the same as
   *    `this.Values[index]`, if they are `false` or `null`
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
    if ((crossBorder && this.Values.length > 1) || index > 0) {
      // merge previous child first
      var prevChild = this._getChildPrev(index)
      if (give.GiveNonLeafNode._childMergable(prevChild, this.Values[index])) {
        // remove child at `index`
        this.Keys.splice(index, 1)
        this.Values.splice(index, 1)
        this.getPrev().setEnd(this.getStart())
        this._fixChildLinks(index > 0 ? index - 1 : index)
        merged = true
      }
    }

    // if `mergeNext` is `true`, do the same to the next node
    if (mergeNext) {
      if (index < this.Values.length - 1 &&
        give.GiveNonLeafNode._childMergable(
          this.Values[index], this.Values[index + 1]
        )
      ) {
        // remove child at `index + 1`
        this.Keys.splice(index + 1, 1)
        this.Values.splice(index + 1, 1)
        this._fixChildLinks(index)
        merged = true
      } else if (crossBorder && index === this.Values.length - 1 &&
        this.getNext() && this.Values.length > 1 &&
        give.GiveNonLeafNode._childMergable(
          this.Values[index], this._getChildNext(index)
        )
      ) {
        this.getNext().Keys[0] = this.Keys[index]
        this.getNext().Values[0] = this.Values[index]
        this.Keys.splice(index, 1)
        this.Values.splice(index, 1)
        // needs to change the boundary of sibling node
        this.setEnd(this.getNext().getStart())
        this.getNext()._fixChildLinks(0)
        merged = true
      }
    }
    return merged
  }

  give.GiveNonLeafNode.prototype.traverse = function (
    chrRange, callback, thisVar, filter, breakOnFalse, props
  ) {
    // Implementation without resolution support
    // Because this is a non-leaf node, it always descends to its children
    // until some leaf node is reached.

    if (chrRange) {
      // clip chrRegion first
      // (should never happen, also the end is not truncated)
      chrRange = this.truncateChrRange(chrRange, true, false)

      var currIndex = 0

      while (this.Keys[currIndex + 1] <= chrRange.getStart()) {
        currIndex++
      }

      while (
        this.Keys[currIndex] < chrRange.getEnd() &&
        currIndex < this.Values.length
      ) {
        if (
          this.Values[currIndex] &&
          !this.Values[currIndex].traverse(chrRange, callback, thisVar, filter,
            breakOnFalse, props
          )
        ) {
          return false
        }
        props.NotFirstCall = true
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
   *    does not have the data at the current resolution requirement.
   *    If no non-data ranges are found, return []
   */
  give.GiveNonLeafNode.prototype.getUncachedRange = function (chrRange, props) {
    if (chrRange) {
      // clip chrRegion first (should never happen)
      var currRange = this.truncateChrRange(chrRange, true, true)
      var result = []
      var currIndex = 0
      while (this.keys[currIndex + 1] <= currRange.getStart()) {
        currIndex++
      }
      while (currRange.getStart() < currRange.getEnd()) {
        if (this.Values[currIndex]) {
          // there is a child node here, descend
          var newRanges =
            this.values[currIndex].getUncachedRange(currRange, props)
          if (result[result.length - 1] && newRanges[0] &&
            result[result.length - 1].concat(newRanges[0])
          ) {
            newRanges.splice(0, 1)
          }
          result = result.concat(newRanges)
        } else if (this.Values[currIndex] === null) {
          var childRange = new give.ChromRegion({
            chr: chrRange.chr,
            start: this.Keys[currIndex],
            end: this.Keys[currIndex + 1]})
          if (
            childRange.intersect(currRange) && (
              !result[result.length - 1] ||
              !result[result.length - 1].concat(childRange)
            )
          ) {
            result.push(childRange)
          }
        }
        currIndex++
        currRange.start = this.Keys[currIndex]
      }
      return result
    } else { // chrRange
      throw (new Error(chrRange + ' is not a valid chrRegion.'))
    }
  }

  return give
})(GIVe || {})
