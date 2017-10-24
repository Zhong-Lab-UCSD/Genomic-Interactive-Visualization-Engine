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

   * @class give.GiveTreeNode
   *
   * @constructor
   */
  give.GiveTreeNode = function () {
  }

  /**
   * getResolution - get the resolution of this data node
   *
   * @returns {number}  Return the resolution (span of the node),
   *    1 is the smallest (finest)
   */
  give.DataNode.prototype.getResolution = function () {
    return 1
  }

  /**
   * resNotEnough - get whether the resolution of this data node is not enough
   *    for the given resolution requirement.
   *
   * @param  {number|null} resolution - the resolution required, if `null`, use
   *    `1` (the finest) instead
   * @returns {boolean}  Return `true` if the resolution is not enough,
   *    otherwise `false`.
   */
  give.DataNode.prototype.resNotEnough = function (resolution) {
    resolution = (typeof resolution === 'number' && !isNaN(resolution))
      ? resolution : 1
    return (this.getResolution() > resolution)
  }

  /**
   * hasData - get whether this data node has data stored.
   *
   * @returns {boolean}  Return `true` if the data is ready, otherwise `false`.
   */
  give.DataNode.prototype.hasData = function () {
  }
