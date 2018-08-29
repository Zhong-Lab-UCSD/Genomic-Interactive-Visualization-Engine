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

  class PromiseAggregator {
    constructor (thenFunc, catchFunc) {
      this._usePaddedPromises = false
      if (typeof thenFunc === 'function') {
        this._thenFunc = thenFunc
        this._usePaddedPromises = true
      }
      if (typeof catchFunc === 'function') {
        this._catchFunc = catchFunc
        this._usePaddedPromises = true
      }
      this._originalPromises = []
      if (this._usePaddedPromises) {
        this._paddedPromises = []
      }
    }

    get promiseToAggregate () {
      return this._usePaddedPromises
        ? this._paddedPromises : this._originalPromises
    }

    clear () {
      this._originalPromises.length = 0
      if (this._usePaddedPromises) {
        this._paddedPromises.length = 0
      }
      return this
    }

    _getPaddedPromise (promise) {
      if (!this._usePaddedPromises) {
        return null
      }
      if (typeof this._thenFunc === 'function') {
        promise = promise.then(result => this._thenFunc(result))
      }
      if (typeof this._catchFunc === 'function') {
        promise = promise.catch(err => this._catchFunc(err))
      }
      return promise
    }

    aggregate (objArray, promiseFunc) {
      let promisesChanged = false
      if (this._originalPromises.length <= 0) {
        objArray.forEach((obj, index) => {
          let originalPromise = promiseFunc(obj, index)
          this._originalPromises.push(originalPromise)
          if (this._usePaddedPromises) {
            this._paddedPromises.push(this._getPaddedPromise(originalPromise))
          }
        })
        promisesChanged = true
      } else {
        objArray.forEach((obj, index) => {
          try {
            let newPromise = promiseFunc(obj, index)
            if (newPromise !== this._originalPromises[index]) {
              // new promise
              this._originalPromises[index] = newPromise
              if (this._usePaddedPromises) {
                this._paddedPromises.push(this._getPaddedPromise(newPromise))
              }
              promisesChanged = true
            }
          } catch (e) {
            // skip promises that have been cancelled
            // (which means the original should be kept)
            if (!(e instanceof give.PromiseCanceller)) {
              throw e
            }
          }
        })
      }
      if (promisesChanged) {
        this.aggreatedPromise = Promise.all(this._usePaddedPromises
          ? this._paddedPromises : this._originalPromises)
        return this.aggreatedPromise
      }
      throw new give.PromiseCanceller()
    }
  }

  give.PromiseAggregator = PromiseAggregator

  return give
})(GIVe || {})
