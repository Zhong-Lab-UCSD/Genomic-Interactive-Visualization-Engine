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
      this.__default = {
        defaultTrackIdList: defaultTrackIdList,
        groupIdList: groupIdList,
        slotNames: slotNames,
        settingString: settingString,
        includeCoordinates: includeCoordinates,
        getSlotSettingFunc: getSlotSettingFunc,
      }
      this.syncRefList(refList, false, this.__default.defaultTrackIdList,
        this.__default.groupIdList, this.__default.slotNames,
        this.__default.settingString, this.__default.includeCoordinates,
        this.__default.getSlotSettingFunc)
    }

    syncRefList (refList, resetAll, defaultTrackIdList, groupIdList) {
      this.__default.defaultTrackIdList =
        defaultTrackIdList || this.__default.defaultTrackIdList
      this.__default.groupIdList = groupIdList || this.__default.groupIdList
      return (this.readyPromise = give.RefObject.allRefPromise
        .then(() => Promise.all(refList.map((ref, index) => {
          if (resetAll || !(this[ref] instanceof give.PriorityManager)) {
            let refDefaultTrackIdList =
              (Array.isArray(this.__default.defaultTrackIdList) &&
                Array.isArray(this.__default.defaultTrackIdList[index]))
                ? this.__default.defaultTrackIdList[index]
                : this.__default.defaultTrackIdList
            let refGroupIdList =
              (Array.isArray(this.__default.groupIdList) &&
                Array.isArray(this.__default.groupIdList[index]))
                ? this.__default.groupIdList[index]
                : this.__default.groupIdList
            this[ref] = new give.PriorityManager(
              give.RefObject.findRefByDb(ref), refDefaultTrackIdList,
              refGroupIdList, this.__default.slotNames,
              this.__default.settingString, this.__default.includeCoordinates,
              this.__default.getSlotSettingFunc
            )
          }
          return this[ref].readyPromise
        })))
      )
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
        this._initialEventTargets = new Map()
        this._resolveInitPriorityManagerFunc = () => {}
        this.addEventListener('init-priority-manager',
          e => this._initEventHandler(e), true)
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
           * The track groups included in the embedded browser. Group IDs are
           * specified in the data source. The data source on our server
           * currently provides these track groups:
           * *  `'genes'`: gene annotation tracks, for all available references
           * *  `'encode'`: ENCODE data sets for human and mouse, for `mm9` and
           *    `hg19` only
           * *  `'interaction'`: genomic interaction data sets, including those
           * generated from Hi-C (chromatin-chromatin) and MARGI (RNA-chromatin)
           * data, for `mm10`, `hg38` (MARGI) and `hg19` (Hi-C)
           * *  `'singleCell'`: mouse embryo single-cell RNA-seq data set from
           * [Biase *et al.*, *Genome Research*, **24**:1787-1796](http://genome.cshlp.org/content/24/11/1787.full),
           * for `mm10` only
           * @type {Array<string>}
           */
          groupIdList: {
            type: Array
          },

          defaultTrackIdList: {
            type: Array
          },

          /**
           * Priority managers.
           * @type {give.PriorityManagerCollection}
           */
          priorityManagers: {
            type: Object,
            value: null,
            notify: true
          }
        }
      }

      ready () {
        super.ready()
        this.shadowRoot.addEventListener('init-priority-manager',
          e => this._initEventHandler(e), true)
      }

      _initEventHandler (e) {
        if (e.target === this) {
          // this event is initiated by self (not children)
          if (e.detail.token === this._initialEventToken) {
            // this event is for the current one
            if (e.detail && e.detail.initialized) {
              // already initialized (by a parent or self)
              return this._fulfillInitPriorityManagerFunc(true)
            } else {
              if (!this.priorityManagers) {
                this.priorityManagers = new PriorityManagerCollection(
                  this._refArray, this.defaultTrackIdList, this.groupIdList,
                  this.slotNames, this.settingString, this.includeCoordinates,
                  this.getSlotSettingFunc
                )
              } else {
                this.priorityManagers.syncRefList(this._refArray, false,
                  this.defaultTrackIdList, this.groupIdList)
                this._refArray.forEach(
                  ref => this.notifyPath('priorityManagers.' + ref))
              }
              this.priorityManagers.readyPromise.then(() => {
                this._initialEventTargets.forEach((token, target, map) =>
                  give.fireSignal('init-priority-manager',
                    { initialized: true, token: token }, null, target
                  )
                )
                this._initialEventTargets.clear()
                return this._fulfillInitPriorityManagerFunc(true)
              })
            }
          }
        } else {
          // this event is initiated by a child and may need to be captured
          if (!e.detail || !e.detail.initialized) {
            // not initialized (by a parent or self)
            if (this._initialEventToken) {
              this._initialEventTargets.set(e.target, e.detail.token)
            } else {
              this.priorityManagersReadyPromise.then(() =>
                give.fireSignal('init-priority-manager',
                  { initialized: true, token: e.detail.token }, null, e.target
                )
              )
            }
            e.preventDefault()
            e.stopPropagation()
          }
          // otherwise ignore and let the event pass
        }
      }

      _fulfillInitPriorityManagerFunc (resolve) {
        if (this._initialEventToken) {
          if (resolve) {
            this._resolveInitPriorityManagerFunc()
          } else {
            this._rejectInitPriorityManagerFunc(new give.PromiseCanceler())
          }
          delete this._initialEventToken
          delete this._resolveInitPriorityManagerFunc
          delete this._rejectInitPriorityManagerFunc
          delete this._priorityManagersReadyPromise
        }
      }

      _refArrayChanged (newValue, oldValue) {
        if (!give.arrayEqual(newValue, oldValue)) {
          this._fulfillInitPriorityManagerFunc(false)
          this._priorityManagersReadyPromise =
            new Promise((resolve, reject) => {
              this._resolveInitPriorityManagerFunc = resolve
              this._rejectInitPriorityManagerFunc = reject
              this._initialEventToken =
                Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - 2)) + 1
              give.fireSignal('init-priority-manager',
                { token: this._initialEventToken }, null, this
              )
            })
          return this._priorityManagersReadyPromise
        }
      }

      get priorityManagersReadyPromise () {
        return this._priorityManagersReadyPromise
          ? this._priorityManagersReadyPromise.then(
            () => this.priorityManagers.readyPromise)
          : (this.priorityManagers && this.priorityManagers.readyPromise
            ? this.priorityManagers.readyPromise
            : Promise.resolve())
      }
    }
  )

  return give
})(GIVe || {})
