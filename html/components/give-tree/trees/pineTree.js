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
   * @property {number} ScalingFactor - The scaling factor for the pine
   *    tree.
   *    This is the factor for non-leaf nodes (this will be used to initialize
   *    `this.Tree.LeafScalingFactor` if the latter is not initialized.).
   * @property {number} LeafScalingFactor - The scaling factor for the
   *    leaf nodes of the pine tree.
   *    For example, if `this.Tree.LeafScalingFactor === 100`, each leaf node
   *    (`give.DataNode`) shall cover 100bp.
   * @property {function} SummaryCtor - The constructor for a data
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
   * @param {number} props.ScalingFactor - for `this.BranchingFactor`
   * @param {number} props.LeafScalingFactor - for `this.BranchingFactor`
   * @param {function} props.SummaryCtor - for `this.BranchingFactor`
   * @param {number} props.LifeSpan - for `this.LifeSpan`
   * @param {function} props.NonLeafNodeCtor - used to override non-leaf node
   *    constructors.
   * @param {function} props.LeafNodeCtor - if omitted, the constructor of
   *    `GIVE.DataNode` will be used
   */
  give.PineTree = function (chrRange, props) {
    props = props || {}
    props.LeafNodeCtor = props.LeafNodeCtor || give.DataNode
    // start and length is for the corresponding region
    // lifeSpan is the lifeSpan a node will live, in terms of
    //    number of traverses
    // If any node is not called after this number of traverses being requested
    //    for the tree, the node will be deleted (wither)
    // If lifeSpan < 0, then no node will be deleted (no withering)

    if (isNaN(props.LifeSpan) ||
      parseInt(props.LifeSpan) !== props.LifeSpan ||
      props.LifeSpan < 0
    ) {
      console.log('Default life span is chosen instead of ' + props.LifeSpan)
      props.LifeSpan = give.PineTree._DEFAULT_LIFESPAN
    }
    this.LifeSpan = props.LifeSpan
    // Scaling factor
    if (
      !Number.isInteger(props.ScalingFactor) || props.ScalingFactor <= 2
    ) {
      console.log('Default scaling factor is chosen instead of ' +
        props.ScalingFactor)
      this.ScalingFactor = give.PineTree._DEFAULT_S_FACTOR
    } else {
      this.ScalingFactor = props.ScalingFactor
    }

    // Leaf scaling factor
    if (
      !Number.isInteger(props.LeafScalingFactor) || props.LeafScalingFactor <= 2
    ) {
      console.log('Non-leaf scaling factor is chosen for leaves instead of ' +
        props.LeafScalingFactor)
      this.LeafScalingFactor = give.PineTree._DEFAULT_LS_FACTOR
    } else {
      this.LeafScalingFactor = props.LeafScalingFactor
    }

    if (typeof props.SummaryCtor === 'function') {
      this.SummaryCtor = props.SummaryCtor
    }

    give.GiveTree.call(
      this, chrRange, props.NonLeafNodeCtor || give.PineNode, props
    )
  }

  give.extend(give.GiveTree, give.PineTree)

  /**
   * _insertSingleRange - Insert data entries within a single range
   * Please refer to `this.insert` for parameter annotation
   * @memberof GiveTreeBase.prototype
   *
   * @param {Array<ChromRegionLiteral>} data
   * @param {ChromRegionLiteral|null} chrRange -
   *    the chromosomal range that `data` corresponds to.
   * @param {number} [chrRange.Resolution] - the resolution of the data being
   *    inserted. Will override `props.Resolution` if both exists.
   * @param {Array<ChromRegionLiteral>} continuedList
   * @param {function|null} callback
   * @param {object|null} props
   * @param {number} [props.LifeSpan] - the life span for inserted nodes.
   * @param {number} [props.Resolution] - the resolution of the data being
   *    inserted. Will be overridden by `chrRange.Resolution` if both exists.
   */
  give.PineTree.prototype._insertSingleRange = function (
    data, chrRange, continuedList, callback, props
  ) {
    if (!chrRange.chr || chrRange.chr === this.Chr) {
      props = props || {}
      // Provide props.LifeSpan for the nodes
      props.LifeSpan = props.LifeSpan || this.LifeSpan
      props.LeafNodeCtor = props.LeafNodeCtor || this._LeafNodeCtor
      this._root = this._root.insert(data, ((!chrRange && data.length === 1)
        ? data[0] : chrRange), continuedList,
        callback, props)
    }
  }

  /**
   * traverse - traverse given chromosomal range to apply functions to all
   * overlapping data entries.
   * @memberof GiveTreeBase.prototype
   *
   * @param {ChromRegionLiteral} chrRanges - the chromosomal range to traverse
   * @param {number} [chrRange.Resolution] - the resolution required for the
   *    traverse. 1 is finest. This is used in case of mixed resolutions for
   *    different `chrRange`s, This will override `props.Resolution` if both
   *    exist.
   * @param {function} callback - the callback function to be used (with the
   *    data entry as its sole parameter) on all overlapping data entries
   *    (that pass `filter` if it exists).
   * @param {function} filter - the filter function to be used (with the data
   *    entry as its sole parameter), return `false` to exclude the entry from
   *    being called with `callback`.
   * @param {Object} thisVar - `this` element to be used in `callback` and
   *    `filter`.
   * @param {boolean} breakOnFalse - whether the traversing should break if
   *    `false` has been returned from `callback`
   * @param {object|null} props - additional properties being passed onto nodes
   * @param {number} [props.Resolution] - the resolution that is required,
   *    data entry (or summary entries) that can just meet this requirement will
   *    be chosen. Smaller is finer. Will be overridden by `chrRange.Resolution`
   *    if both exists.
   * @param {boolean} [props.Wither] - the resolution that is required,
   *    data entry (or summary entries) that can just meet this requirement will
   *    be chosen. Smaller is finer.
   * @returns {boolean} If the traverse breaks on `false`, returns `false`,
   *    otherwise `true`
   */
  give.PineTree.prototype.traverse = function (
    chrRange, callback, filter, thisVar, breakOnFalse, props
  ) {
    props = props || {}
    // replace `props.Wither` flag with `props.Rejuvenation`
    if (props.Wither) {
      props.Rejuvenation = this.LifeSpan + 1
    }
    // wither is a flag whether to reduce life for nodes not traversed
    if (!chrRange.chr || chrRange.chr === this.chr) {
      var result = this._root.traverse(chrRange, callback, filter,
        thisVar, breakOnFalse, false, props)
      if (props.Wither) {
        this.wither()
      }
      return result
    }
  }

  /**
   * wither - reduces life of branches and prune branches that are too old.
   *    Implemented as a caching feature.
   *
   * @returns {PineTree|null} return `this` if the whole tree has not withered
   *    yet. Otherwise return `null`
   */
  give.GiveTree.prototype.wither = function () {
    // this is the method called to wither all nodes
    if (!this._root.wither()) {
      // the whole tree will wither
      delete this._root
      return null
    }
    return this
  }

  /**
   * getUncachedRange - get an array of chrRegions that do not have data ready.
   * This is used for sectional loading.
   * @memberof PineTree.prototype
   *
   * @param {ChromRegionLiteral} chrRange - the chromosomal range to query
   * @param  {number} [chrRange.Resolution] - the resolution required for the
   *    cached range. 1 is finest. This is recommended in case of mixed
   *    resolutions for different `chrRange`s, This will override
   *    `props.Resolution` if both exist.
   * @param {object|null} props - additional properties being passed onto nodes
   * @param {number|null} [props.Resolution] - the resolution that is required.
   *    Smaller is finer. Will be overridden by `chrRange.Resolution` if both
   *    exists.
   * @param {number|null} [props.BufferingRatio] - the ratio to 'boost'
   *    `resolution` so that less data fetching may be needed.
   * @returns {Array<ChromRegionLiteral>} the chromosomal ranges that do not
   *    have their data ready in this data storage unit (therefore need to be
   *    fetched from sources). If all the data needed is ready, `[]` will be
   *    returned.
   */
  give.PineTree.prototype.getUncachedRange = function (chrRange, props) {
    return give.GiveTree.prototype.getUncachedRange.call(this, arguments)
  }

  /**
   * ********** Default values **********
   * These values may need to be tweaked.
   */

  /**
   * _DEFAULT_S_FACTOR - Default value for ScalingFactor
   */
  give.PineTree._DEFAULT_S_FACTOR = 20
  /**
   * _DEFAULT_LS_FACTOR - Default value for LeafScalingFactor
   */
  give.PineTree._DEFAULT_LS_FACTOR = 100
  /**
   * _DEFAULT_LIFESPAN - Default value for LifeSpan
   */
  give.PineTree._DEFAULT_LIFESPAN = 10

  return give
})(GIVe || {})
