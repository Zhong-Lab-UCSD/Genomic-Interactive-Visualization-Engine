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
   * These nodes have a property called `_life` to show their life span. When
   *    `.wither()` is called, the life span will shorten and if it gets too
   *    short, the node will be pruned (this will be implemented by caller).
   * `_life` can be rejuvenated by calling `.rejuvenate()` to delay withering.
   *
   * @typedef {object} WitheringNode
   * @property {number} _life - life of this node.
   *
   * @class give.WitheringNode
   *
   * @constructor
   * @param {object} props - properties that will be passed to the individual
   *    implementations
   * @param {object} props.LifeSpan - for `this._life`
   */
  give.WitheringNode = function (props) {
    // start and length is for the corresponding region
    give.GiveTreeNode.apply(this, arguments)
    this._life = props.LifeSpan
  }

  /**
   * addWithering - add withering support to `this`. Use
   *    `give.WitheringNode.addWithering.call` to add withering support to any
   *    class.
   */
  give.WitheringNode.addWithering = function () {
    /**
     * wither - reduces life of self and sub-branches and prune branches that
     *    are too old. Implemented as a caching feature.
     *
     * @param  {number} [amount] - the amount to be deducted from life.
     *    Default is 1.
     * @returns {give.WitheringNode|null} return `this` if the whole tree has
     *    not withered yet. Otherwise return `null`
     */
    this.prototype.wither = function (amount) {
      // this will cause this and *all the children of this* wither
      amount = amount || 1
      if (!isNaN(this._life)) {
        this._life -= amount
        if (this._life <= 0) {
          // signal parent to remove this
          return null
        }
      }
      return this
    }

    /**
     * rejuvenate - rejuvenate life of `this` to a given value
     *
     * @param  {number} life - target life rejuvenation value
     */
    this.prototype.rejuvenate = function (life) {
      if (!isNaN(this._life)) {
        this._life = life || this._life
      }
    }
  }

  give.WitheringNode.addWithering()

  return give
})(GIVe || {})
