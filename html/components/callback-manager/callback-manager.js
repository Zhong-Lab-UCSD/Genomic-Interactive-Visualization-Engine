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
   * Call back manager to queue all the callbacks and execute them when cleared
   * @typedef {object} CallbackManager
   * @property {string} _defaultID - The default ID prefix for calling elements
   * @property {object} _callbackFuncs - Objects storing callback functions,
   *   each caller ID can has only one pending callback functions
   * @property {Array<string>} _callbackArray - Array for callback caller ID
   *   to requests (remote or local)
   * @property {object|null} _clearingCallbackFuncs - Objects storing callback
   *   functions during a clearing process, each caller ID can has only one
   *   pending callback functions
   * @property {Array<string>|null} _clearingCallbackArray - Array for callback
   *   caller ID to requests (remote or local) during a clearing process
   * @property {boolean} _isClearingCallback - The flag indicating whether a
   *   clearing process is under way
   * @property {boolean} _clearingQueued - The flag indicating whether another
   *   round of clearing has been queued during the current clearing process
   *
   * @class give.CallbackManager
   *
   * @constructor
   * @param {string} defaultCallbackID - The default ID prefix for calling
   *   elements
   */
  give.CallbackManager = function (defaultCallbackID) {
    this._defaultID = defaultCallbackID ||
      give.CallbackManager._defaultCallbackID

    this._callbackArray = []
    this._callbackFuncs = {}

    this._clearingCallbackArray = null
    this._clearingCallbackFuncs = null

    this._isClearingCallback = false
    this._clearingQueued = false
  }

  /**
   * clear - Clear all pending callback functions
   * When `this.clearCallback` is called during a clearing process, after the
   *   current round of clearing, a new round of clearing will be called.
   *
   * @memberof CallbackManager.prototype
   * @param  {boolean} execute - Whether to execute the callback function
   */
  give.CallbackManager.prototype.clear = function (execute) {
    // NOTE: because callback functions may push new functions into the
    //   callback array, this clearing of callback should not be done in situ,
    //   otherwise the newly added callback functions will get flushed out.
    // `this._clearingQueued` is used to mark if `this.clearCallback` was called
    //   during a clearing process. After this round of clearing, a new round of
    //   clearing will be called if `this._clearingQueued === true`
    if (this._isClearingCallback) {
      // currently clearing callback
      // mark this._clearingQueued as true, then exit
      this._clearingQueued = true
      return
    }
    var clearingLoop
    do {
      clearingLoop = false
      this._isClearingCallback = true
      this._clearingCallbackArray = this._callbackArray.slice()
      this._clearingCallbackFuncs = Object.assign({}, this._callbackFuncs)
      this._callbackArray.length = 0
      this._callbackFuncs = {}
      while (this._clearingCallbackArray.length > 0) {
        var callback = this._clearingCallbackFuncs[this._clearingCallbackArray.shift()]
        if (execute) {
          callback()
        }
      }
      this._clearingCallbackArray = null
      this._clearingCallbackFuncs = null
      this._isClearingCallback = false
      if (this._clearingQueued) {
        clearingLoop = true
        this._clearingQueued = false
      }
    } while (clearingLoop)
  }

  /**
   * add - Queue a callback function, functions from the same caller
   *   will be collapsed and only the last callback function will be retained
   *
   * @memberof CallbackManager.prototype
   * @param  {function} callback - Callback function after the data are ready
   * @param  {string} callbackID - ID of the caller elements
   */
  give.CallbackManager.prototype.add = function (callback, callbackID) {
    callbackID = callbackID || this._defaultID + this._callbackArray.length
    if (typeof callback === 'function') {
      if (!this._callbackFuncs.hasOwnProperty(callbackID)) {
        this._callbackArray.push(callbackID)
      }
      this._callbackFuncs[callbackID] = callback
    } else {
      throw new give.GiveError('Callback is not a function!')
    }
  }

  /**
   * @property {number} _getDataQueueCallbackID - The default values for
   *   prefix for debouncing job names.
   */
  give.CallbackManager._defaultCallbackID = 'CALLBACK_QUEUE_'

  return give
})(GIVe || {})
