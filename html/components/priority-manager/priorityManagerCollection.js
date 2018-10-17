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
   * A collection of priority managers for different references.
   *  This is used to synchronize reference track states across different
   *  elements, such as `<chart-controller>`, `<chart-track-list>` and others
   * 
   * @property {Promise} readyPromise 
   *
   * @class PriorityManagerCollection
   */
  class PriorityManagerCollection {
    /**
     * Creates an instance of PriorityManagerCollection.
     * @param {Array<string>} refList - the list of reference ids, duplicates
     *    accepted and will be removed in the final collection
     * @param {Array<string>|Array<Array<string>>} defaultTrackIdList - the list
     *    where initial list of "selected" tracks will be provided, if only one
     *    list is provided, the same list will be applied to all references with
     *    only the matching tracks selected.
     *  If duplicates exist in `refList`, only the first list corresponding to
     *    every `ref` value is honored.
     * @param {Array<string>|Array<Array<string>>} groupIdList - the list where
     *    groups being included will be provided. This is honored only when
     *    `defaultTrackIdList` is not provided.
     *  If duplicates exist in `refList`, only the first list corresponding to
     *    every `ref` value is honored.
     * @param {Array<string>} slotNames - the names of the slots in which the
     *    tracks will be allocated to. Please refer to
     *    [`give.ChartWindow`](../chart-window/index.html) for the actual
     *    meaning of the slots.
     * @param {string} settingString - the key string in track settings for
     *    the current priority manager to be used as "selected".
     * @param {boolean} includeCoordinates - whether this priority manager shall
     *    treat coordinates as special tracks (during `this.clear()`).
     * @param {function} getSlotSettingFunc - a function, when called with
     *    a `give.TrackObject` `track`, will provide a default slot for the
     *    `track`.
     * @memberof PriorityManagerCollection
     */
    constructor (refList, defaultTrackIdList, groupIdList, slotNames,
      settingString, includeCoordinates, getSlotSettingFunc
    ) {
      // First de-dup refList
      this._refCollection = new Map()
      this.readyPromise = give.RefObject.allRefPromise
        .then(() => {
          return Promise.all(refList.map((ref, index) => {
            if (!this._refCollection.has(ref)) {
              let refDefaultTrackIdList =
                (Array.isArray(defaultTrackIdList) &&
                  Array.isArray(defaultTrackIdList[index]))
                  ? defaultTrackIdList[index] : defaultTrackIdList
              let refGroupIdList =
                (Array.isArray(refGroupIdList) &&
                  Array.isArray(refGroupIdList[index]))
                  ? refGroupIdList[index] : refGroupIdList
              this._refCollection.set(ref,
                new give.PriorityManager(
                  give.RefObject.findRefByDb(ref), refDefaultTrackIdList,
                  refGroupIdList, slotNames, settingString, includeCoordinates,
                  getSlotSettingFunc
                )
              )
            }
            return this._refCollection.get(ref).readyPromise
          }))
        })
    }

    getPriorityManager (ref) {
      return this._refCollection.get(ref)
    }
  }

  /**
   * Behavior that allows embedding of a priority manager collection.
   *
   * When the element is initialized (super.ready() is called). An event will be
   * fired to initialize the priority manager based on `this._refArray`,
   * `this.defaultTrackIdList` and `this.groupIdList`. This event will be handled
   * in the capture phase (not the bubbling phase) so that parent elements can
   * intercept the initialization.
   *
   * @polymer
   * @mixinFunction
   */

  give.PriorityManagerCollectionEmbedMixin = Polymer.dedupingMixin(base =>
    class extends base {
      constructor () {
        super()
        this._initialEventTargets = []
        this._resolveInitPriorityManagerFunc = () => {}
        this.addEventListener('init-priority-manager', e => {
          if (e.detail && e.detail.initialized) {
            // already initialized (by a parent or self)
            return this._resolveInitPriorityManagerFunc()
          }
          if (e.target === this) {
            // this event is initiated by self (not children)
            // initialize `this.priorityManagers`
            this.priorityManagers = new PriorityManagerCollection(
              this._refArray, this.defaultTrackIdList, this.groupIdList,
              this.slotNames, this.settingString, this.includeCoordinates,
              this.getSlotSettingFunc
            )
            this._initialEventTargets.forEach(target =>
              target.dispatchEvent(new CustomEvent(
                'init-priority-manager',
                { detail: { initialized: true } }
              ))
            )
            this._initialEventTargets.length = 0
            return this._resolveInitPriorityManagerFunc()
          } else {
            // this event is initiated by a child and needs to be captured
            this._initialEventTargets.push(e.target)
            e.preventDefault()
            e.stopPropagation()
          }
        })
      }

      static get properties () {
        return {
          /**
           * The reference used in the embedded browser.
           * Reference names needs to be in UCSC format.
           * Please see [GIVe.RefObject](../ref-object/)
           * to see available references on GIVe server.
           */
          _refArray: {
            type: Array,
            value: [],
            observer: '_refArrayChanged'
          },

          /**
           * Priority managers.
           * @type {give.PriorityManagerCollection}
           */
          priorityManagers: {
            type: Object,
            value: null
          }
        }
      }

      _refArrayChanged (newValue, oldValue) {
        this._priorityManagersReadyPromise = new Promise((resolve, reject) => {
          this._resolveInitPriorityManagerFunc = resolve
          this.dispatchEvent(new CustomEvent('init-priority-manager'))
        })
      }

      get priorityManagersReadyPromise () {
        return this._priorityManagersReadyPromise
          ? this._priorityManagersReadyPromise
          : Promise.resolve()
      }

      _syncRefsJsonToArray (numOfWindows, newRefValue) {
        numOfWindows = numOfWindows || this.numOfSubs
        newRefValue = newRefValue || this.ref
        this._refArray = give.getValueArray(newRefValue, numOfWindows)
      }

      /**
       * The observer function to handle changes in `this.ref`.
       *
       * this will reset all tracks and redo the ref
       * note that the tracks should already be initialized before switching here
       * After this, this.changeAllViewWindows should be called.
       *
       * If references are not ready (for example, need to be populated from a
       * server), `this._setRefAfterReadyCheck` will be called
       * after they are ready.
       *
       * @async
       * @param  {string} newValue - new reference name
       * @param  {string} oldValue - old reference name
       */
      _refChanged (newValue, oldValue) {
        if (!this._changingRef) {
          if (newValue) {
            return give.RefObject.allRefPromise
              .then(() => this._setRefAfterReadyCheck(newValue))
              .catch(err => {
                // call UI warning procedures in the future
                give.fireSignal('give-warning', { msg: err.message })
                this.refReadyPromise = Promise.reject(err)
              })
              .finally(() => {
                this._changingRef = true
                this.ref = this.refObj ? this.refObj.db : null
                this._changingRef = false
              })
          } else if (this.refObj) {
            let err = new give.GiveError('No ref value supplied!')
            give._verbConsole.warn(err)
            this.refReadyPromise = Promise.reject(err)
          }
        }
      }

      /**
       * Get the current reference of the element.
       *
       * @return {GIVe.RefObject}  reference currently used.
       */
      get refObj () {
        return this._refObj
      }

      /**
       * _setRefAfterReadyCheck - The function actually called after
       * the references are ready.
       *
       * @param  {string|GIVe.RefObject} ref - the reference name or reference
       *    object
       */
      _setRefAfterReadyCheck (ref) {
        this._setRefObj(give.RefObject.findRefByDb(ref))
      }

      /**
       * Simple function to set reference directly.
       *
       * @param  {GIVe.RefObject} refObj the reference object
       * @returns {boolean} Whether the reference object has been changed.
       */
      _setRefObj (refObj) {
        if (!this.refObj || this.refObj.db !== refObj.db) {
          if (!this.needsChromInfo || refObj.chromInfo) {
            // reference has been changed, needs to switch
            this._refObj = refObj
            this.refReadyPromise = refObj.initTracks()
          } else {
            this.refReadyPromise = Promise.reject(
              new give.GiveError('No ChromInfo available for ref "' +
              refObj.db + '"!')
            )
          }
          return true
        }
        return false
      }
    }
  )

  return give
})(GIVe || {})
