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
   * @typedef {object} WitheringMixin
   * @property {number} _lastUpdateGen - last updated generation of this node
   *
   * @class give.witheringMixin
   *
   * @constructor
   * @param {object} props - properties that will be passed to the individual
   *    implementations
   * @param {object} props._currGen - the current generation
   */
  give.WitheringMixin = Base => class extends Base {
    constructor (props) {
      super(...arguments)
      if (props._currGen || (this.Tree && this.Tree._currGen)) {
        this._lastUpdateGen = props._currGen || this.Tree._currGen
      }
    }

    wither () {
      // If current node itself withers,
      // it will cause this and *all the children of this* wither
      // NOTE: Root node may also wither, which causes the whole tree to wither
      if (this._shouldWither) {
        this.clear(null)
        return null
      }
      // For children, mark all children that needs to be withered
      // then call `this.delete` on all children marked.
      this.Values.filter(value => (value && value.wither && !value.wither()))
        .forEach(value => this.delete(value, true))
      return this.isEmpty ? null : this
    }

    get _shouldWither () {
      if (!this.Tree || !this.Tree.lifeSpan) {
        return false
      }
      return this.Tree._currGen >= this._lastUpdateGen
        ? this.Tree._currGen - this._lastUpdateGen > this.Tree.lifeSpan
        : this.Tree._currGen -
          (this._lastUpdateGen - this.Tree.constructor._MAX_GENERATION) >
          this.Tree.lifeSpan
    }

    rejuvenate () {
      if (this.Tree && this.Tree._currGen) {
        this._lastUpdateGen = this.Tree._currGen
      }
    }

    traverse (chrRange, callback, filter, breakOnFalse, props, ...args) {
      this.rejuvenate()
      return super.traverse(...arguments)
  }

  return give
})(GIVe || {})
