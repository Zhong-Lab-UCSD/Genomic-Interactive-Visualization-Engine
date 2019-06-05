/*
	Chrom B+ tree

    This is a wrapper for ChromBPlusTreeNode to handle root changes

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

  class CannotBalanceError extends give.GiveError {
    constructor () {
      super(...arguments)
      if (give.GiveError.captureStackTrace) {
        give.GiveError.captureStackTrace(this, CannotBalanceError)
      }
    }
  }

  /**
   * Non-leaf nodes for Oak Trees
   * This is an interface for all nodes that belongs to an oak tree, which is
   * an modified version of B+ tree.
   *
   * See `GIVE.GiveNonLeafNode` for common non-leaf node documentation.
   *
   * @typedef {object} OakNode
   * @property {boolean} isRoot
   * @property {Array<number>} keys
   * @property {Array<GiveTreeNode|null|boolean>} values
   * @property {number} reverseDepth
   * @property {OakNode|null|boolean} Next
   * @property {OakNode|null|boolean} Prev
   * @property {number} tree.branchingFactor - The branching factor for the B+
   *    tree.
   *    It indicates how many children at most can a node have, and how many
   *    children at least should a node have (`branchingFactor / 2`)
   *
   * @class give.OakNode
   *
   * @constructor
   * @implements give.GiveNonLeafNode
   * @param {object} props
   * @param {GiveTree} props.tree
   * @param {boolean} props.isRoot
   * @param {number} props.start
   * @param {number} props.end
   * @param {number|null} props.reverseDepth
   * @param {GiveNonLeafNode|null|boolean} props.nextNode
   * @param {GiveNonLeafNode|null|boolean} props.prevNode
   *
   */
  class OakNode extends give.GiveNonLeafNode {
    _extendBoundary (convertTo, start, end) {
      let extendHappened = false
      if (typeof start === 'number' && start < this.start) {
        // extend start to new start
        if (this.reverseDepth > 0) {
          this.firstChild._extendBoundary(convertTo, start, null)
          this.start = start
        } else {
          if (this.firstChild === convertTo) {
            this.start = start
          } else {
            this.values.unshift(convertTo)
            this.keys.unshift(start)
          }
        }
        extendHappened = true
      }
      if (typeof end === 'number' && end > this.end) {
        // extend start to new start
        if (this.reverseDepth > 0) {
          this.lastChild._extendBoundary(convertTo, null, end)
          this.end = end
        } else {
          if (this.lastChild === convertTo) {
            this.end = end
          } else {
            this.values.push(convertTo)
            this.keys.push(end)
          }
        }
        extendHappened = true
      }
      if (!extendHappened) {
        throw new give.GiveError('No extension happened in _extendBounary! ' +
          'start: ' + start + '; end: ' + end)
      }
      return this._restructureSingleLayer()
    }

    mergeAfter (node) {
      if (node instanceof this.constructor && this.end === node.start) {
        if (this.childNum === 1 && !this.values[0]) {
          // `this` is an empty node, assimilate everything from node, then
          // extend start
          node._extendBoundary(this.values[0], this.start)
          this.keys = node.keys
          this.values = node.values
        } else if (node.childNum === 1 && !node.values[0]) {
          this._extendBoundary(node.values[0], null, node.end)
        } else if (
          this.childNum + node.childNum <= this.tree.branchingFactor
        ) {
          this.keys = this.keys.concat(node.keys.slice(1))
          this.values = this.values.concat(node.values)
        } else {
          // unmerged
          return false
        }
        return this
      }
      return false
    }

    /**
     * _splitChild - Split a child according to its type.
     *    If it is an `OakNode`, split it to satisfy B+ tree requirements.
     *    If it is a `DataNode`, split as `give.GiveNonLeafNode._splitChild`
     *    does.
     *
     * @param  {number} index - index of the child to be split.
     * @param  {number} newKey - the new key separating the two children.
     *    Only used when the child is a `DataNode`.
     * @param  {give.GiveTreeNode|false|null} [newLatterChild] - the new
     *    latter child. If `undefined`, use the old child.
     *    Only used when the child is a `DataNode`.
     * @param  {give.GiveTreeNode|false|null} [newFormerChild] - the new
     *    former child. If `undefined`, use the old child.
     *    Only used when the child is a `DataNode`.
     * @returns {number} Number of split children
     * @memberof OakNode
     */
    _splitChild (index, newKey, newLatterChild, newFormerChild) {
      if (this.reverseDepth <= 0) {
        if (this.tree.localOnly && arguments[2] === undefined) {
          arguments[2] = this.emptyChildValue
        }
        return super._splitChild(...arguments)
      }
      if (this.values[index].length <= this.tree.branchingFactor) {
        return 1
      }
      // Node is over-capacity, split into sibling nodes
      // Calculate the number of siblings this node will split into
      let numOfSibs =
        Math.floor(this.values[index].childNum * 2 / this.tree.branchingFactor)
      // chop off children from the end
      for (let sibsLeft = numOfSibs - 1; sibsLeft > 0; sibsLeft--) {
        // get the number of children to be put into this sibling
        let sibNumOfChildren =
          Math.floor(this.values[index].childNum / (sibsLeft + 1))
        let props = {
          isRoot: false,
          // Extract one more key from this.keys
          keys: this.values[index].keys.slice(-(sibNumOfChildren + 1)),
          values: this.values[index].values.slice(-sibNumOfChildren),
          reverseDepth: this.values[index].reverseDepth,
          nextNode: this.values[index + 1],
          prevNode: this.values[index],
          tree: this.tree
        }
        this.values[index].keys.splice(-sibNumOfChildren)
        this.values[index].values.splice(-sibNumOfChildren)

        this.values.splice(index + 1, 0, new this.constructor(props))
        this.keys.splice(index + 1, 0, this.values[index].end)
      }
      return numOfSibs
    }

    _redistributeGrandChildren (index) {
      let sibNumOfChildren = Math.floor(
        (this.values[index - 1].childNum +
          this.values[index].childNum) / 2)
      if (sibNumOfChildren > this.tree.branchingFactor) {
        sibNumOfChildren = this.tree.branchingFactor
      }
      let deltaNum = sibNumOfChildren - this.values[index - 1].childNum
      if (deltaNum > 0) {
        // move from the latter sibling to the former
        this.values[index - 1].values = this.values[index - 1].values.concat(
          this.values[index].values.slice(0, deltaNum)
        )
        this.values[index - 1].keys = this.values[index - 1].keys.concat(
          this.values[index].keys.slice(1, deltaNum + 1)
        )
        this.values[index].values.splice(0, deltaNum)
        this.values[index].keys.splice(0, deltaNum)
      } else {
        // move from the latter sibling to the former
        // (notice that deltaNum < 0)
        this.values[index].values =
          this.values[index - 1].values.slice(deltaNum).concat(
            this.values[index].values
          )
        this.values[index].keys =
          this.values[index - 1].keys.slice(deltaNum - 1, -1).concat(
            this.values[index].keys
          )
        this.values[index - 1].values.splice(deltaNum)
        this.values[index - 1].keys.splice(deltaNum)
      }
      this.keys[index] = this.values[index].start
    }

    _restructureRoot () {
      // If this is root, then it needs to be responsible for itself
      if (this.isRoot) {
        let oldRoot = this
        let newRoot = this
        if (this.childNum > this.tree.branchingFactor) {
          // add a new layer of tree and return new root
          do {
            oldRoot = newRoot
            oldRoot.isRoot = false
            newRoot = new this.constructor({
              isRoot: true,
              // Put `this` and all siblings under the new root
              keys: [oldRoot.start, oldRoot.end],
              values: [oldRoot],
              reverseDepth: oldRoot.reverseDepth + 1,
              nextNode: null,
              prevNode: null,
              tree: oldRoot.tree
            })
            newRoot._splitChild(0)
          } while (newRoot.childNum > this.tree.branchingFactor)
        } else if (this.childNum <= 1 && this.reverseDepth > 0) {
          // reduce the number of layer of the tree to the first child
          // with `childNum > 1 || reverseDepth <= 0`
          oldRoot.isRoot = false
          do {
            oldRoot = newRoot
            newRoot = oldRoot.values[0]
            oldRoot.clear(null)
          } while (newRoot.childNum <= 1 && newRoot.reverseDepth > 0)
          newRoot.isRoot = true
        }
        return newRoot
      }
      return this.isEmpty ? false : this
    }

    /**
     * _restructureSingleLayer - The function to be called after
     *    adding/removing data to the node.
     *    In OakNodes, auto-balancing is implemented according to B+ tree
     *    specs. `this._restructureSingleLayer()` actually only rearranges
     *    children to make sure they meet B+ tree requirements. `this` may not
     *    meet B+ tree requirement if it's an intermediate node, which will be
     *    handled by its immediate parent.
     *    If `this` is a root node and needs splitting / reducing length, a
     *    new root node will be created to fix the tree structure and
     *    returned.
     *    If there is no way to arrange children to make all children meet
     *    B+ tree requirements, a `CannotBalanceError` will be thrown to allow
     *    redistribution of children from parent nodes.
     * @param {boolean} intermediate - Whether this restructuring is an
     *    intermediate approach.
     *    If this is true, then the function is called to rearrange in parent
     *    nodes because their children cannot get their grandchildren
     *    conforming to B+ tree requirements. If this is the case, the
     *    children in this call does not need to completely conform to B+
     *    tree requirements since the function flow will come back once the
     *    grandchildren have been rearranged.
     * @memberof OakNode.prototype
     *
     * @returns {give.GiveNonLeafNode|Array<give.GiveNonLeafNode>|false}
     *    Since auto-balancing is supported, the return value will be
     *    different for root and non-root nodes:
     *    * For root nodes, this will return a new root if split/merge
     *      happens;
     *    * In all other cases, return `this`.
     *    * For inner nodes (or leaf), Return an ordered array of (one or
     *      more) siblings if splitting happens for the calling function to
     *      handle. If the node should be merged with its sibling(s), return
     *      `false`. Return `this` in all other cases.
     * @throws {CannotBalanceError} Throw an error if after doing everything
     *    it can, it still cannot make all its children meet the B+ tree
     *    requirement. This would happen if a large number of nodes under
     *    this node were deleted and after merging all direct children, there
     *    is still not enough grandchildren for the child.
     */
    _restructureSingleLayer (intermediate) {
      // Procedures:
      // 1. Iterate over all children to see if any of them need updating
      // 2. Redistribute / merge / split children depending on it and its
      //    siblings
      if (this.reverseDepth > 0) {
        for (let i = 0; i < this.childNum; i++) {
          let sibNext = (i < (this.childNum - 1)) ? i + 1 : i
          let sibPrev = (i < (this.childNum - 1)) ? i : i - 1
          if (this.values[i].childNum < this.tree.branchingFactor / 2) {
            if (this.childNum <= 1) {
              if ((!intermediate || this.values[i].childNum <= 1) &&
                !this.isRoot
              ) {
                // If this call is an intermediate adjustment, throw error
                //    only when `this` has one grandchild (therefore
                //    adjustment is not possible).
                // Otherwise throw when not all children can be rearranged
                //    to make them meet B+ tree requirements.
                throw new CannotBalanceError()
              }
            } else {
              // not enough grand-children for the child, redistribute / merge
              if (this.values[sibPrev].childNum +
                this.values[sibNext].childNum >
                this.tree.branchingFactor
              ) {
                // redistribution is enough
                this._redistributeGrandChildren(sibNext)
              } else {
                // needs merge
                this._mergeChild(sibNext)
                i--
              }
            }
          } else if (this.values[i].childNum > this.tree.branchingFactor) {
            // too many grand-children, redistribute / split
            if (this.childNum > 1 &&
              (this.values[sibPrev].childNum + this.values[sibNext].childNum <
                this.tree.branchingFactor * 2
              )
            ) {
              // redistribution is enough
              this._redistributeGrandChildren(sibNext)
            } else {
              // needs split
              i += this._splitChild(i) - 1
            }
          }
        }
      }
      if (!intermediate) {
        return this._restructureRoot()
      }
      return this.isEmpty ? false : this
    }

    _restructure () {
      try {
        if (this.reverseDepth > 0) {
          let grandChildrenCompliant = false
          do {
            try {
              this.values.forEach(node => node._restructure())
              grandChildrenCompliant = true
            } catch (err) {
              if (err instanceof CannotBalanceError) {
                this._restructureSingleLayer(true)
              }
            }
          } while (!grandChildrenCompliant)
        }
      } catch (err) {
        if (err instanceof CannotBalanceError && !this.isRoot) {
          throw err
        }
      }
      return this._restructureSingleLayer()
    }

    _addNonLeafRecords (data, chrRange, props) {
      // This function only adds record(s), it won't restructure the tree

      // This is not a leaf node
      // Break out chrRange by child, then insert the sub-range into every
      //    child
      let currIndex = 0

      while (chrRange.start < chrRange.end) {
        while (this.keys[currIndex + 1] <= chrRange.start) {
          currIndex++
        }

        // Now the start of chrRange is in the range of current child
        let section = chrRange.clone()
        if (this.keys[currIndex + 1] < chrRange.end) {
          section.end = this.keys[currIndex + 1]
        }
        let sibs = this.values[currIndex].insert(data, section, props)
        if (Array.isArray(sibs)) {
          // Has siblings, put them into this.values
          this.keys.splice(currIndex + 1, 0, ...sibs.map(sib => sib.start))
          this.values.splice(currIndex + 1, 0, ...sibs)
          currIndex += sibs.length
        }

        chrRange.start = section.end
        currIndex++
      } // end while(rangeStart < rangeEnd);
    }

    _addLeafRecords (data, chrRange, props) {
      // This function only adds record(s), it won't restructure the tree

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

      // At this point the index hasn't moved into overlapping `chrRange` yet

      while (this.keys[currIndex + 1] <= chrRange.start) {
        currIndex++
      }

      if (this.keys[currIndex] < chrRange.start) {
        // The new rangeStart appears between windows.
        // Shorten the previous data record by inserting the key,
        // and use this.values[currIndex] to fill the rest
        // (normally it should be `null`)
        if (this.values[currIndex]) {
          props.contList = this.values[currIndex].updateContList()
        }
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
          if (this.values[currIndex]) {
            props.contList = this.values[currIndex].updateContList()
          }
          currIndex++
        }
        if (this.keys[currIndex] < chrRange.start) {
          // The new rangeStart appears between windows.
          // Shorten the previous data record by inserting the key,
          // and use `false` to fill the rest
          if (this.values[currIndex]) {
            props.contList = this.values[currIndex].updateContList()
          }
          this._splitChild(currIndex++, chrRange.start, false)
        }

        if (
          props.contList.length > 0 ||
          (props.dataIndex < data.length &&
            data[props.dataIndex].start <= this.keys[currIndex])
        ) {
          // there are actual data at this location, create a new leaf node
          if (!this.tree.localOnly && this.values[currIndex]) {
            give._verbConsole.info('Rewritten data notes at ' +
              this.keys[currIndex])
          }
          if (!this.values[currIndex]) {
            this.values[currIndex] = new props.LeafNodeCtor({
              start: this.keys[currIndex],
              end: this.keys[currIndex + 1]
            })
          }
          this.values[currIndex].insert(data, chrRange, props)
          if (this.values[currIndex].isEmpty) {
            this.values[currIndex] = false
          }
        } else {
          // needs to fill the element with `false`, and merge with previous
          // if possible
          this.values[currIndex] = false
        }
        if (this._mergeChild(currIndex, false, true)) {
          currIndex--
        }

        // Shrink `chrRange` to unprocessed range
        chrRange.start = (
          props.dataIndex < data.length &&
          data[props.dataIndex].start < chrRange.end
        ) ? data[props.dataIndex].start : chrRange.end
      }

      this._mergeChild(currIndex, true, true)

      // Process `props.contList` for one last time
      props.contList = props.contList.concat(
        data.slice(prevDataIndex, props.dataIndex)
      ).filter(entry => entry.end > chrRange.end)

      // Remove all processed data from `data`
      data.splice(0, props.dataIndex)
      delete props.dataIndex
    }

    /**
     * remove - Remove data entries from the node.
     *    Data entries with the same start (and end values if exists) will be
     *    removed. If multiple entries are found with the same start (and end
     *    values), the behavior will be defined by `exactMatch`.
     *    __NOTE:__ The tree will not be restructured due to the fact that
     *    multiple remove calls may happen within one action and restructuring
     *    every time incurs unnecessary computational burden.
     *
     * @memberof GiveTreeNode.prototype
     *
     * @param  {ChromRegionLiteral|GiveTreeNode} data - the data entry being
     *    removed.
     * @param  {boolean} exactMatch - whether an exact match is needed to
     *    remove multiple data entries with the same start and end values.
     *    If `true`, `data` will be compared by `.equalTo(data)` if exists,
     *    `===` if not. (this is done via calling
     *    `this.constructor._compareData(dataIn, dataEx)`)
     *    If `false`, all entries matching the start and end values will be
     *    removed.
     * @param {boolean|null} convertTo - what shall be used to replace
     *    the removed nodes, should be either `null` (default) or `false`.
     * @param  {object|null} [props] - additional properties being
     *    passed onto nodes.
     * @param {function|null} props.callback - the callback function to be
     *    used (with the data entry as its sole parameter) when deleting
     * @returns {give.GiveTreeNode|boolean}
     *    If the node itself shall be removed, return a falsey value to allow
     *    parents to take additional steps. If the node is root, return the
     *    new root if decreasing of tree height happened.
     */
    remove (data, exactMatch, convertTo, props) {
      props = props || {}
      convertTo = (convertTo === false ? false : null)
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
      while (i < this.childNum && this.keys[i + 1] <= data.start) {
        i++
      }
      if (this.values[i]) {
        // data must fall within `this.values[i]`
        if (!this.values[i].remove(data, exactMatch, convertTo, props)) {
          // this node will be removed if it is not literally the first node
          //    of the tree
          if (this.reverseDepth <= 0) {
            this.values[i] = convertTo
            this._mergeChild(i, true, true)
            return this
          } else {
            // a branch need to be deleted, replace the region with `null`
            if (i < this.childNum - 1 &&
              (this.values[i + 1].firstLeaf === convertTo || i <= 0)
            ) {
              this._mergeChild(i + 1)
            } else if (i > 0) {
              this._mergeChild(i)
            } else {
              // only one child, remove `this` as well
              this.clear(convertTo)
              return !!this.isRoot
            }
          }
        }
      } else {
        give._verbConsole.warn('Data ' + data + ' is not found in the tree.')
      }
      return this
    }

    traverse (chrRange, callback, filter, breakOnFalse, props, ...args) {
      // Implementation without resolution support
      // Because this is a non-leaf node, it always descends to its children
      // until some leaf node is reached.

      if (chrRange) {
        var currIndex = 0
        while (currIndex < this.childNum &&
          this.keys[currIndex + 1] <= chrRange.start
        ) {
          currIndex++
        }
        if (this.reverseDepth) {
          return (this.keys[currIndex] < chrRange.end &&
            currIndex < this.childNum) ? this.values[currIndex] : null
        } else {
          while (
            this.keys[currIndex] < chrRange.end &&
            currIndex < this.childNum
          ) {
            if (this.values[currIndex]) {
              if (!this.values[currIndex].traverse(chrRange, callback,
                filter, breakOnFalse, props, ...args) && breakOnFalse
              ) {
                return false
              }
            }
            props.notFirstCall = true
            currIndex++
          }
          return (this.keys[currIndex] < chrRange.end)
            ? this.next : null
        }
      } else { // !chrRange
        throw (new give.GiveError(chrRange + ' is not a valid chrRegion.'))
      } // end if(chrRange)
    }
  }

  give.OakNode = OakNode

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
   * Oak tree for data storage, derived from B+ tree.
   * See `GIVE.GiveTree` for other properties and methods.
   * @typedef {object} OakTree
   * @property {number} branchingFactor - branching factor for the tree. The
   *    number of children for all non-root nodes will be equal to or greater
   *    than `this.branchingFactor / 2`. The number of children for all nodes
   *    will be smaller than `this.branchingFactor`. This is adapted from B+
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
   * @param {number} props.branchingFactor - for `this.branchingFactor`
   * @param {function} props.NonLeafNodeCtor - used to override non-leaf node
   *    constructors.
   * @param {function} props.LeafNodeCtor - if omitted, the constructor of
   *    `GIVE.DataNode` will be used
   */
  class OakTree extends give.GiveTree {
    constructor (chrRange, props) {
      // start and length is for the corresponding region
      // note that `OakTree` should be populated with `OakNode`s
      super(chrRange, props.NonLeafNodeCtor || give.OakNode, props)
    }

    _initProperties (chrRange, NonLeafNodeCtor, props) {
      props.LeafNodeCtor = props.LeafNodeCtor || give.DataNode
      super._initProperties(...arguments)
      if (
        !Number.isInteger(props.branchingFactor) || props.branchingFactor <= 2
      ) {
        give._verbConsole.info('Default branching factor chosen instead of ' +
          props.branchingFactor)
        this.branchingFactor = this.constructor._DEFAULT_B_FACTOR
      } else {
        this.branchingFactor = props.branchingFactor
      }
    }

    _traverse (chrRange, callback, filter, breakOnFalse, props, ...args) {
      let currNode = this._root
      while (currNode) {
        currNode = currNode.traverse(chrRange, callback, filter,
          breakOnFalse, props, ...args)
      }
      return currNode === null
    }
  }

  OakTree._DEFAULT_B_FACTOR = 50 // this value may need to be tweaked
  OakTree.neighboringLinks = true

  give.OakTree = OakTree

  return give
})(GIVe || {})
