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
   * Oak tree for data storage, derived from B+ tree.
   * See `GIVE.GiveTree` for other properties and methods.
   * @typedef {object} OakTree
   * @property {number} BFactor - branching factor for the tree. The
   *    number of children for all non-root nodes will be equal to or greater
   *    than `this.BFactor / 2`. The number of children for all nodes
   *    will be smaller than `this.BFactor`. This is adapted from B+
   *    tree to achieve auto-balancing.
   * @property {GiveTreeNode} _NonLeafNodeCtor - Constructor for all non-leaf
   *    nodes. Should be `GIVE.OakNode` all the time. Can be overridden but not
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
   * @param {number} props.BFactor - for `this.BFactor`
   * @param {function} props.NonLeafNodeCtor - used to override non-leaf node
   *    constructors.
   * @param {function} props.LeafNodeCtor - if omitted, the constructor of
   *    `GIVE.DataNode` will be used
   */
  give.OakTree = function (chrRange, props) {
    // start and length is for the corresponding region
    // note that `OakTree` should be populated with `OakNode`s
    props = props || {}
    props.LeafNodeCtor = props.LeafNodeCtor || give.DataNode
    if (
      !Number.isInteger(props.BFactor) || props.BFactor <= 2
    ) {
      give._verbConsole.info('Default branching factor is chosen instead of ' +
        props.BFactor)
      this.BFactor = give.OakTree._DEFAULT_B_FACTOR
    } else {
      this.BFactor = props.BFactor
    }
    this.NeighboringLinks = true
    give.GiveTree.call(
      this, chrRange, props.NonLeafNodeCtor || give.OakNode, props
    )
  }

  give.extend(give.GiveTree, give.OakTree)

  /**
   * traverse - traverse given chromosomal range to apply functions to all
   * overlapping data entries.
   * @memberof GiveTreeBase.prototype
   *
   * @param {ChromRegionLiteral} chrRanges - the chromosomal range to traverse
   * @param {function} callback - the callback function to be used (with the
   *    data entry as its sole parameter) on all overlapping data entries
   *    (that pass `filter` if it exists).
   * @param {Object} thisVar - `this` element to be used in `callback` and
   *    `filter`.
   * @param {function} filter - the filter function to be used (with the data
   *    entry as its sole parameter), return `false` to exclude the entry from
   *    being called with `callback`.
   * @param {boolean} breakOnFalse - whether the traversing should break if
   *    `false` has been returned from `callback`
   * @param {object|null} props - additional properties being passed onto nodes
   * @returns {boolean} If the traverse breaks on `false`, returns `false`,
   *    otherwise `true`
   */
  give.OakTree.prototype.traverse = function (
    chrRange, callback, thisVar, filter, breakOnFalse, props
  ) {
    props = props || {}
    if (!chrRange.chr || chrRange.chr === this.Chr) {
      try {
        chrRange = this._root.truncateChrRange(chrRange, true, false)
        var currNode = this._root
        while (currNode) {
          currNode = currNode.traverse(chrRange, callback, thisVar, filter,
            breakOnFalse, props)
        }
      } catch (exception) {
        return false
      }
    }
    return true
  }

  give.OakTree._DEFAULT_B_FACTOR = 50  // this value may need to be tweaked

  return give
})(GIVe || {})
