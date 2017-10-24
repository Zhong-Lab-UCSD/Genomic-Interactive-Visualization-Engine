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
   * Every record will serve as a bin, with a start and end coordinate, and all
   * records combined will serve as a division of the chromosome (no gap, no
   * overlap) with all the start value for dividing points.
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
   *    `null`:   data not loaded yet, when upper layer encounter this, the code
   *              there needs to retrieve potential data;
   *    `false`:  there is no data in this bin;
   *    A `GIVe.DataNode` instance:
   *              the instance of a class described in this file
   *
   * @typedef {object} GiveDataNodeBase
   * @property {Array<ChromRegionLiteral>} StartList - A list of data entries
   *    that __start exactly at__ the start coordinate of this node.
   *    `StartList` will become an empty array only if the previous bin is
   *    `null` (because otherwise this bin can be merged with the previous one),
   *    or this is the first bin of the storage unit;
   * @property {Array<ChromRegionLiteral>} ContList - A list of data entries
   *    that __continue into__ the start coordinate of this node. This array
   *    will be sorted by the actual starting points, `[]` will have the same
   *    effect as `undefined`.
   * @class give.DataNode
   *
   * @constructor
   * @extends give.GiveTreeNode
   * @param {object} props - properties that will be passed to the individual
   *    implementations. For `GIVE.DataNode`, two properties will be used:
   * @param {Array<ChromRegionLiteral>|null} props.StartList - for
   *    `this.StartList`
   * @param {Array<ChromRegionLiteral>|null} props.ContList - for
   *    `this.ContList`
   *
   */
  give.DataNode = function (props) {
    give.GiveTreeNode.call(this, arguments)
    this.StartList = props.StartList || []
    this.ContList = props.ContList || []
  }

  give.extend(give.GiveTreeNode, give.DataNode)


  /**
   * Implementing GIVE.GiveTreeNode methods
   */

  /**
   * getResolution - get the resolution of this data node
   *
   * @returns {number}  Because data node is the leaf of all tree structures,
   *    it will always return `1` (the finest resolution).
   */
  give.DataNode.prototype.getResolution = function () {
    return 1
  }

  /**
   * resNotEnough - get whether the resolution of this data node is not enough
   *    for the given resolution requirement.
   *
   * @param  {number} resolution - the resolution required
   * @returns {boolean}  Because data node is the leaf of all tree structures,
   *    it will always return `false` (always enough).
   */
  give.DataNode.prototype.resNotEnough = function (resolution) {
    return false
  }

  /**
   * hasData - get whether this data node has data stored.
   *
   * @returns {type}  Because data node is populated with actual data,
   *    it will always return `true` (always has data).
   */
  give.DataNode.prototype.hasData = function () {
    return true
  }
