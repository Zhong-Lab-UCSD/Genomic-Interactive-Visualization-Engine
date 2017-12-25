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

  give.WitheringNode = function (props) {
    // start and length is for the corresponding region
    give.GiveTreeNode.apply(this, arguments)
    this.life = props.LifeSpan
  }

  give.WitheringNode.addWithering = function () {
    this.prototype.wither = function (amount) {
      // this will cause this and *all the children of this* wither
      amount = amount || 1
      if (!isNaN(this.life)) {
        this.life -= amount
        if (this.life <= 0) {
          // signal parent to remove this
          return null
        }
      }
      return this
    }

    this.prototype.rejuvenate = function (life) {
      if (!isNaN(this.life)) {
        this.life = life || this.life
      }
    }
  }

  give.WitheringNode.addWithering()

  return give
})(GIVe || {})
