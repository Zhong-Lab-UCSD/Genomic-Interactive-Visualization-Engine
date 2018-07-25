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
   * @property {boolean} IsRoot
   * @property {Array<number>} Keys
   * @property {Array<GiveTreeNode|null|boolean>} Values
   * @property {number} RevDepth
   * @property {OakNode|null|boolean} Next
   * @property {OakNode|null|boolean} Prev
   * @property {number} Tree.BFactor - The branching factor for the B+
   *    tree.
   *    It indicates how many children at most can a node have, and how many
   *    children at least should a node have (`BFactor / 2`)
   *
   * @class give.OakNode
   *
   * @constructor
   * @implements give.GiveNonLeafNode
   * @param {object} props
   * @param {GiveTree} props.Tree
   * @param {boolean} props.IsRoot
   * @param {number} props.Start
   * @param {number} props.End
   * @param {number|null} props.RevDepth
   * @param {GiveNonLeafNode|null|boolean} props.NextNode
   * @param {GiveNonLeafNode|null|boolean} props.PrevNode
   *
   */
  class OakNode extends give.GiveNonLeafNode {
    _extendBoundary (convertTo, start, end) {
      let extendHappened = false
      if (typeof start === 'number' && start < this.start) {
        // extend start to new start
        if (this.RevDepth > 0) {
          this.firstChild._extendBoundary(convertTo, start, null)
          this.start = start
        } else {
          if (this.firstChild === convertTo) {
            this.start = start
          } else {
            this.Values.unshift(convertTo)
            this.Keys.unshift(start)
          }
        }
        extendHappened = true
      }
      if (typeof end === 'number' && end > this.end) {
        // extend start to new start
        if (this.RevDepth > 0) {
          this.lastChild._extendBoundary(convertTo, null, end)
          this.end = end
        } else {
          if (this.lastChild === convertTo) {
            this.end = end
          } else {
            this.Values.push(convertTo)
            this.Keys.push(end)
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
        if (this.childNum === 1 && !this.Values[0]) {
          // `this` is an empty node, assimilate everything from node, then
          // extend start
          node._extendBoundary(this.Values[0], this.start)
          this.Keys = node.Keys
          this.Values = node.Values
        } else if (node.childNum === 1 && !node.Values[0]) {
          this._extendBoundary(node.Values[0], null, node.end)
        } else if (this.childNum + node.childNum <= this.Tree.BFactor) {
          this.Keys = this.Keys.concat(node.Keys.slice(1))
          this.Values = this.Values.concat(node.Values)
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
      if (this.RevDepth <= 0) {
        return super._splitChild(...arguments)
      }
      if (this.Values[index].length <= this.Tree.BFactor) {
        return 1
      }
      // Node is over-capacity, split into sibling nodes
      // Calculate the number of siblings this node will split into
      let numOfSibs =
        Math.floor(this.Values[index].childNum * 2 / this.Tree.BFactor)
      // chop off children from the end
      for (let sibsLeft = numOfSibs - 1; sibsLeft > 0; sibsLeft--) {
        // get the number of children to be put into this sibling
        let sibNumOfChildren =
          Math.floor(this.Values[index].childNum / (sibsLeft + 1))
        let props = {
          IsRoot: false,
          // Extract one more key from this.Keys
          Keys: this.Values[index].Keys.slice(-(sibNumOfChildren + 1)),
          Values: this.Values[index].Values.slice(-sibNumOfChildren),
          RevDepth: this.Values[index].RevDepth,
          NextNode: this.Values[index + 1],
          PrevNode: this.Values[index],
          Tree: this.Tree
        }
        this.Values[index].Keys.splice(-sibNumOfChildren)
        this.Values[index].Values.splice(-sibNumOfChildren)

        this.Values.splice(index + 1, 0, new this.constructor(props))
        this.Keys.splice(index + 1, 0, this.Values[index].end)
      }
      return numOfSibs
    }

    _redistributeGrandChildren (index) {
      let sibNumOfChildren = Math.floor(
        (this.Values[index - 1].childNum +
          this.Values[index].childNum) / 2)
      if (sibNumOfChildren > this.Tree.BFactor) {
        sibNumOfChildren = this.Tree.BFactor
      }
      let deltaNum = sibNumOfChildren - this.Values[index - 1].childNum
      if (deltaNum > 0) {
        // move from the latter sibling to the former
        this.Values[index - 1].Values = this.Values[index - 1].Values.concat(
          this.Values[index].Values.slice(0, deltaNum)
        )
        this.Values[index - 1].Keys = this.Values[index - 1].Keys.concat(
          this.Values[index].Keys.slice(1, deltaNum + 1)
        )
        this.Values[index].Values.splice(0, deltaNum)
        this.Values[index].Keys.splice(0, deltaNum)
      } else {
        // move from the latter sibling to the former
        // (notice that deltaNum < 0)
        this.Values[index].Values =
          this.Values[index - 1].Values.slice(deltaNum).concat(
            this.Values[index].Values
          )
        this.Values[index].Keys =
          this.Values[index - 1].Keys.slice(deltaNum - 1, -1).concat(
            this.Values[index].Keys
          )
        this.Values[index - 1].Values.splice(deltaNum)
        this.Values[index - 1].Keys.splice(deltaNum)
      }
      this.Keys[index] = this.Values[index].start
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
      if (this.RevDepth > 0) {
        for (let i = 0; i < this.childNum; i++) {
          let sibNext = (i < (this.childNum - 1)) ? i + 1 : i
          let sibPrev = (i < (this.childNum - 1)) ? i : i - 1
          if (this.Values[i].childNum < this.Tree.BFactor / 2) {
            if (this.childNum <= 1) {
              if (!this.IsRoot &&
                (!intermediate || this.Values[i].childNum <= 1)
              ) {
                // not enough grand-children overall, throw to let parent
                //    handle
                throw new CannotBalanceError()
              }
            } else {
              // not enough grand-children for the child, redistribute / merge
              if (this.Values[sibPrev].childNum +
                this.Values[sibNext].childNum >
                this.Tree.BFactor
              ) {
                // redistribution is enough
                this._redistributeGrandChildren(sibNext)
              } else {
                // needs merge
                this._mergeChild(sibNext)
                i--
              }
            }
          } else if (this.Values[i].childNum > this.Tree.BFactor) {
            // too many grand-children, redistribute / split
            if (this.Values[sibPrev].childNum +
              this.Values[sibNext].childNum <
              this.Tree.BFactor * 2
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
      // If this is root, then it needs to be responsible for itself
      if (this.IsRoot) {
        let oldRoot
        let newRoot = this
        if (this.childNum > this.Tree.BFactor) {
          // add a new layer of tree and return new root
          do {
            oldRoot = newRoot
            oldRoot.IsRoot = false
            newRoot = new this.constructor({
              IsRoot: true,
              // Put `this` and all siblings under the new root
              Keys: [oldRoot.start, oldRoot.end],
              Values: [oldRoot],
              RevDepth: oldRoot.RevDepth + 1,
              NextNode: null,
              PrevNode: null,
              Tree: oldRoot.Tree
            })
            newRoot._splitChild(0)
          } while (newRoot.childNum > this.Tree.BFactor)
        } else if (this.childNum <= 1 && this.RevDepth > 0) {
          // reduce the number of layer of the tree to the first child
          // with `childNum > 1 || RevDepth <= 0`
          this.IsRoot = false
          do {
            oldRoot = newRoot
            newRoot = oldRoot.Values[0]
            oldRoot.clear(null)
          } while (newRoot.childNum <= 1 && newRoot.RevDepth > 0)
          newRoot.IsRoot = true
        }
        return newRoot
      }
      return this.isEmpty ? false : this
    }

    _restructure () {
      if (this.RevDepth > 0) {
        let grandChildrenCompliant = false
        do {
          try {
            this.Values.forEach(node => node._restructure())
            grandChildrenCompliant = true
          } catch (err) {
            if (err instanceof CannotBalanceError) {
              this._restructureSingleLayer(true)
            }
          }
        } while (!grandChildrenCompliant)
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
        while (this.Keys[currIndex + 1] <= chrRange.start) {
          currIndex++
        }

        // Now the start of chrRange is in the range of current child
        let section = chrRange.clone()
        if (this.Keys[currIndex + 1] < chrRange.end) {
          section.end = this.Keys[currIndex + 1]
        }
        let sibs = this.Values[currIndex].insert(data, section, props)
        if (Array.isArray(sibs)) {
          // Has siblings, put them into this.Values
          this.Keys.splice(currIndex + 1, 0, ...sibs.map(sib => sib.start))
          this.Values.splice(currIndex + 1, 0, ...sibs)
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
      props.DataIndex = 0
      let prevDataIndex
      props.ContList = props.ContList || []
      if (!(give.GiveTreeNode.prototype.isPrototypeOf(
        props.LeafNodeCtor.prototype
      ))) {
        throw new give.GiveError('LeafNodeCtor `' + props.LeafNodeCtor +
          '` is not a constructor for a tree node!')
      }

      while (this.Keys[currIndex + 1] <= chrRange.start) {
        currIndex++
      }

      if (this.Keys[currIndex] < chrRange.start) {
        // The new rangeStart appears between windows.
        // Shorten the previous data record by inserting the key,
        // and use this.Values[currIndex] to fill the rest
        // (normally it should be `null`)
        this._splitChild(currIndex++, chrRange.start)
      }

      if (this.Keys[currIndex + 1] > chrRange.end) {
        // The new rangeEnd appears between windows.
        // Shorten the next data record by inserting the key,
        // and use this.Values[currIndex] to fill the current region
        // (normally it should be `null`)
        this._splitChild(currIndex, chrRange.end)
      }

      while (chrRange.start < chrRange.end) {
        while (this.Keys[currIndex + 1] <= chrRange.start) {
          currIndex++
        }
        if (this.Keys[currIndex] < chrRange.start) {
          // The new rangeStart appears between windows.
          // Shorten the previous data record by inserting the key,
          // and use `false` to fill the rest
          this._splitChild(currIndex++, chrRange.start, false)
        }

        if (
          props.ContList.length > 0 ||
          (props.DataIndex < data.length &&
            data[props.DataIndex].start <= this.Keys[currIndex])
        ) {
          // there are actual data at this location, create a new leaf node
          this.Values[currIndex] = new props.LeafNodeCtor({
            Start: this.Keys[currIndex],
            End: this.Keys[currIndex + 1]
          })
          this.Values[currIndex].insert(data, chrRange, props)
          if (this.Values[currIndex].isEmpty) {
            this.Values[currIndex] = false
          }
        } else {
          // needs to fill the element with `false`, and merge with previous
          // if possible
          this.Values[currIndex] = false
        }
        if (this._mergeChild(currIndex, false, true)) {
          currIndex--
        }

        // Shrink `chrRange` to unprocessed range
        chrRange.start = (
          props.DataIndex < data.length &&
          data[props.DataIndex].start < chrRange.end
        ) ? data[props.DataIndex].start : chrRange.end
      }

      this._mergeChild(currIndex, true, true)

      // Process `props.ContList` for one last time
      props.ContList = props.ContList.concat(
        data.slice(prevDataIndex, props.DataIndex)
      ).filter(entry => entry.end > chrRange.end)

      // Remove all processed data from `data`
      data.splice(0, props.DataIndex)
      delete props.DataIndex
    }

    /**
     * remove - Remove data entries from the node.
     *    Data entries with the same start (and end values if exists) will be
     *    removed. If multiple entries are found with the same start (and end
     *    values), the behavior will be defined by `exactMatch`.
     *
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
     * @param {function|null} props.Callback - the callback function to be
     *    used (with the data entry as its sole parameter) when deleting
     * @returns {give.GiveTreeNode|boolean}
     *    If the node itself shall be removed, return a falsey value to allow
     *    parents to take additional steps. If the node is root, return the
     *    new root if decreasing of tree height happened.
     * @throws {CannotBalanceError} If the node itself cannot get all its
     *    grand-children balanced, a `CannotBalanceError` will be thrown.
     */
    remove (data, exactMatch, convertTo, props) {
      props = props || {}
      convertTo = (convertTo === false ? false : null)
      // Check whether `this` shall be removed
      if (this.start === data.start && this.end === data.end) {
        if (!exactMatch || this._compareData(data, this)) {
          // remove content of this
          if (typeof props.Callback === 'function') {
            props.Callback(this)
          }
          this.clear(convertTo)
          return !!this.IsRoot
        }
      }

      // data being remove is not self
      // locate the child entry first
      let i = 0
      while (i < this.childNum && this.Keys[i + 1] <= data.start) {
        i++
      }
      if (this.Values[i]) {
        // data must fall within `this.Values[i]`
        if (!this.Values[i].remove(data, exactMatch, convertTo, props)) {
          // this node will be removed if it is not literally the first node
          //    of the tree
          if (this.RevDepth <= 0) {
            this.Values[i] = convertTo
            this._mergeChild(i, true, true)
            return this
          } else {
            // a branch need to be deleted, replace the region with `null`
            if (i < this.childNum - 1 &&
              (this.Values[i + 1].firstLeaf === convertTo || i <= 0)
            ) {
              this._mergeChild(i + 1)
            } else if (i > 0) {
              this._mergeChild(i)
            } else {
              // only one child, remove `this` as well
              this.clear(convertTo)
              return !!this.IsRoot
            }
          }
        }
      } else {
        give._verbConsole.warn('Data ' + data + ' is not found in the tree.')
      }
      return this
    }

    traverse (
      chrRange, callback, thisVar, filter, breakOnFalse, props
    ) {
      // Implementation without resolution support
      // Because this is a non-leaf node, it always descends to its children
      // until some leaf node is reached.

      if (chrRange) {
        var currIndex = 0
        while (currIndex < this.childNum &&
          this.Keys[currIndex + 1] <= chrRange.start
        ) {
          currIndex++
        }
        if (this.RevDepth) {
          return (this.Keys[currIndex] < chrRange.end &&
            currIndex < this.childNum) ? this.Values[currIndex] : null
        } else {
          while (
            this.Keys[currIndex] < chrRange.end &&
            currIndex < this.childNum
          ) {
            if (this.Values[currIndex] &&
              (!this.Values[currIndex].traverse(chrRange, callback,
                filter, breakOnFalse, props) && breakOnFalse
              )
            ) {
              return false
            }
            props.NotFirstCall = true
            currIndex++
          }
          return (this.Keys[currIndex] < chrRange.end)
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
