import '../basic-func/basic-func.js';
import { dedupingMixin } from '@polymer/polymer/lib/utils/mixin.js';
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
   * An object for effective displaying priority of a track within a given
   * priority map (every reference has one)
   *
   * @property {string} slotName - the key for the section that this track
   *    should be pinned in. This is supposedly an enum value and all available
   *    values can be seen at `this.constructor.slotNameList`.
   * @property {number} position - the position of the track within its pinned
   *    group
   *
   * @class EffectivePriority
   */
  class EffectivePriority {
    /**
     * Creates an instance of EffectivePriority.
     * @param {string} slotName - The key for the section that this track should
     *    be pinned in.
     * @param {number} [position] - Specify this to override positioning. This
     *    should not be larger than the number of existing priorities and old
     *    priorities will be affected.
     * @memberof EffectivePriority
     */
    constructor (slotName, position) {
      // raise error if slotName is not correct
      // normally pos should not be provided
      this.slotName = slotName
      this.position = position
    }
  }

  give.EffectivePriority = EffectivePriority

  /**
   *
   *
   * @class PriorityManager
   */
  class PriorityManager {
    constructor (
      refObj, defaultTrackIdList, groupIdList,
      slotNames, settingString, includeCoordinates, getSlotSettingFunc
    ) {
      this.settingString = settingString ||
        this.constructor.DEFAULT_SETTING_STRING
      this.includeCoordinates = (typeof includeCoordinates === 'boolean'
        ? includeCoordinates : this.constructor.DEFAULT_INCLUDE_COORDINATES)
      if (this.includeCoordinates) {
        this.coordinateTracks = []
        this.coordinateIdSet = new Set()
      }
      this._getSlotSettingFunc = (typeof getSlotSettingFunc === 'function'
        ? getSlotSettingFunc
        : track => this.constructor._defaultGetSlotFunc(track))
      this.idToEffectivePriorityDict = new Map()
      this._initSlotNames(slotNames)
      this._defaultTrackIdList = defaultTrackIdList
      this._groupIdList = groupIdList
      this.asyncReset(refObj)
    }

    asyncReset (refObj, defaultTrackIdList, groupIdList) {
      this.readyPromise = refObj.initTracks().then(refObj =>
        this.reset(refObj, defaultTrackIdList, groupIdList))
      return this.readyPromise
    }

    reset (refObj, defaultTrackIdList, groupIdList) {
      refObj.initPriorityManager(this, defaultTrackIdList, groupIdList)
      this._initTrackList = this.trackIdList
      return this
    }

    get initTrackIdList () {
      return this._initTrackList
    }

    _initSlotNames (slotNames) {
      this._slots = new Map()
      this.hasSlots = true
      if (Array.isArray(slotNames)) {
        if (slotNames.length <= 0 ||
          slotNames.some(name => !(name && typeof name === 'string'))
        ) {
          slotNames = ['_default']
          this.hasSlots = false
          this._getSlotSettingFunc = track => null
        }
      } else {
        slotNames = this.constructor.DEFAULT_SLOT_NAMES
      }
      slotNames.forEach((name, index) => {
        if (name && !this._slots.has(name)) {
          this._slots.set(name, { index: index, contents: [] })
        } else {
          give.fireSignal('give-warning', {
            errObj: new give.GiveError(
              'Duplicate slot name or empty name: ' + name)
          })
          give._verboseConsole.warn(
            'Duplicate slot name or empty name: ' + name)
        }
      })
    }

    _verifySlotName (slotName) {
      if ((this.hasSlots === !slotName)) {
        throw new give.GiveError(
          this.hasSlots ? 'Need a slot name!' : 'No slot name available!')
      }
      if (this.hasSlots && !this._slots.has(slotName)) {
        throw new give.GiveError('Invalid slot name: ' + slotName)
      }
      return this.hasSlots ? slotName : '_default'
    }

    _getInternalSlotName (trackId) {
      return this._verifySlotName(
        this._getEffectivePriorityFromId(trackId).slotName)
    }

    _syncEffectivePriority (slotName, start, end) {
      slotName = this._verifySlotName(slotName)
      start = (Number.isInteger(start) ? start : 0)
      end = (Number.isInteger(end)
        ? end : this._slots.get(slotName).contents.length)
      for (let index = start; index < end; index++) {
        this._getEffectivePriorityFromId(
          this._slots.get(slotName).contents[index]
        ).position = index
      }
    }

    _moveTrackIdSameSlot (trackId, newPosition) {
      let slotName = this._getInternalSlotName(trackId)
      if (Number.isInteger(newPosition) && newPosition >= 0 &&
        newPosition < this._slots.get(slotName).contents.length
      ) {
        let oldPosition = this._getEffectivePriorityFromId(trackId).position
        if (newPosition !== oldPosition) {
          this._slots.get(slotName).contents.splice(oldPosition, 1)
          this._slots.get(slotName).contents.splice(newPosition, 0, trackId)
          this._syncEffectivePriority(slotName,
            Math.min(newPosition, oldPosition),
            Math.max(newPosition, oldPosition) + 1)
        }
      } else {
        give.fireSignal('give-warning', {
          errObj: new give.GiveError('Invalid position: ' + newPosition +
            ', track will not change its position.'
          )
        })
        give._verboseConsole.warn('Invalid position: ' + newPosition + ', ' +
          'track will not change its position.')
      }
    }

    _insertTrackIdIntoSlot (trackId, slotName, position, newEffectivePriority) {
      this._slots.get(slotName).contents.splice(position, 0, trackId)
      if (newEffectivePriority) {
        this.idToEffectivePriorityDict.set(trackId,
          new EffectivePriority(this.hasSlots ? slotName : null,
            position))
        position++
      }
      this._syncEffectivePriority(slotName, position)
    }

    _removeTrackIdFromSlot (trackId, slotName, deleteEffectivePriority) {
      let position = this.getEffectivePriority(trackId).position
      this._slots.get(slotName).contents.splice(position, 1)
      if (deleteEffectivePriority) {
        this.idToEffectivePriorityDict.delete(trackId)
      }
      this._syncEffectivePriority(slotName, position)
    }

    addTrack (track, slotName, position, addToCoordinate, doNotThrow) {
      if (!addToCoordinate || this.includeCoordinates) {
        slotName = slotName || this._getSlotSettingFunc(track)
        if (this.idToEffectivePriorityDict.has(track.id)) {
          if (!doNotThrow) {
            throw new give.GiveError('Track ID already exists: ' + track.id)
          }
        } else {
          slotName = this._verifySlotName(slotName)
          if (!Number.isInteger(position) || position < 0 ||
            position > this._slots.get(slotName).contents.length
          ) {
            if (Number.isInteger(position)) {
              give.fireSignal('give-warning', {
                errObj: new give.GiveError('Invalid position: ' + position +
                  ', track will be inserted at the end of the slot.'
                )
              })
              give._verboseConsole.warn('Invalid position: ' + position + ', ' +
                'track will be inserted at the end of the slot.')
            }
            position = this._slots.get(slotName).contents.length
          }
          if (addToCoordinate && this.includeCoordinates) {
            this.coordinateTracks.push(track)
            this.coordinateIdSet.add(track.id)
          }
          this._insertTrackIdIntoSlot(track.id, slotName, position, true)
        }
      }
    }

    removeTrackById (trackId, doNotThrow) {
      let slotName = this._getInternalSlotName(trackId)
      if (!slotName) {
        if (!doNotThrow) {
          throw new give.GiveError('Track ID does not exist: ' + trackId)
        }
      }
      if (this.includeCoordinates) {
        this.coordinateTracks =
          this.coordinateTracks.filter(track => (track.id !== trackId))
        this.coordinateIdSet.delete(trackId)
      }
      this._removeTrackIdFromSlot(trackId, slotName, true)
    }

    removeTrack (track, doNotThrow) {
      return this.removeTrackById(track.id, doNotThrow)
    }

    /**
     * syncFromGroup - synchronize the priority manager with a `trackGroup` of
     *    selected tracks.
     *
     * Note: if included, coordinate tracks will not be affected by this.
     *
     * @param {give.TrackGroup} trackGroup - the `trackGroup` of selected tracks
     * @param {boolean} resetOrder - whether to reset the track order so that it
     *    will be as close to the order in `trackGroup` as possible
     * @param {boolean} doNotRemove - whether keep the old tracks (so only the
     *    previously unselected tracks will be added to the priority manager)
     * @returns {boolean} whether this synchronization caused actual change
     * @memberof PriorityManager
     */
    syncFromGroup (trackGroup, resetOrder, doNotRemove) {
      // remove the ones not in the list
      let oldTrackIdList = this.trackIdList
      if (resetOrder) {
        this.clear(true)
      } else if (!doNotRemove) {
        oldTrackIdList.forEach(trackId => {
          if (
            (!this.includeCoordinates || !this.coordinateIdSet.has(trackId)) &&
            !trackGroup.hasTrack(trackId)
          ) {
            this.removeTrackById(trackId, true)
          }
        })
      }
      for (let track of trackGroup) {
        this.addTrack(track, null, null, null, true)
      }
      let newTrackIdList = this.trackIdList
      return !give.arrayEqual(oldTrackIdList, newTrackIdList)
    }

    moveTrack (track, newSlotName, newPosition) {
      if (!this._getEffectivePriorityFromId(track.id)) {
        throw new give.GiveError('Track ID does not exist: ' + track.id)
      }
      newSlotName = this._verifySlotName(newSlotName)
      let oldSlotName = this._getInternalSlotName(track.id)
      if (!Number.isInteger(newPosition) || newPosition < 0 ||
        newPosition > this._slots.get(newSlotName).contents.length
      ) {
        if (Number.isInteger(newPosition)) {
          give.fireSignal('give-warning', {
            errObj: new give.GiveError('Invalid position: ' + newPosition +
              ', track will be moved to the end of the new slot.'
            )
          })
          give._verboseConsole.warn('Invalid position: ' + newPosition + ', ' +
            'track will be moved to the end of the new slot.')
        }
        newPosition = this._slots.get(newSlotName).contents.length
      }
      if (oldSlotName === newSlotName) {
        return this._moveTrackIdSameSlot(track.id, newPosition)
      } else {
        this._removeTrackIdFromSlot(track.id, oldSlotName, false)
        this._insertTrackIdIntoSlot(track.id, newSlotName, newPosition, false)
      }
    }

    getEffectivePriority (track) {
      return this.idToEffectivePriorityDict.get(track.id)
    }

    _getEffectivePriorityFromId (trackId) {
      return this.idToEffectivePriorityDict.get(trackId)
    }

    _isValidEffectivePriority (priority) {
      if (!(priority instanceof EffectivePriority)) {
        return false
      }
      let slotName = this._verifySlotName(priority.slotName)
      return Number.isInteger(priority.position) &&
        priority.position >= 0 &&
        priority.position < this._slots.get(slotName).contents.length
    }

    compareEffectivePriority (priority1, priority2) {
      // first handle null values (null is larger than any valid value)
      if (!this._isValidEffectivePriority(priority1) ||
        !this._isValidEffectivePriority(priority2)
      ) {
        return !this._isValidEffectivePriority(priority1)
          ? (!this._isValidEffectivePriority(priority2) ? 0 : 1) : -1
      }
      let slotName1 = this._verifySlotName(priority1.slotName)
      let slotName2 = this._verifySlotName(priority2.slotName)
      return slotName1 !== slotName2
        ? Math.sign(this._slots.get(slotName1).index -
          this._slots.get(slotName2).index)
        : Math.sign(priority1.position - priority2.position)
    }

    clear (keepCoordinate) {
      for (let slot of this._slots.values()) {
        slot.contents.length = 0
      }
      this.idToEffectivePriorityDict.clear()
      if (!keepCoordinate || !this.includeCoordinates) {
        this.coordinateTracks.length = 0
        this.coordinateIdSet.clear()
      } else {
        this.coordinateTracks.forEach(track => this.addTrack(track))
      }
    }

    hasTrackId (trackId) {
      return this.idToEffectivePriorityDict.has(trackId)
    }

    hasTrack (track) {
      return this.idToEffectivePriorityDict.has(track.id)
    }

    get trackIdList () {
      return [...this._slots.values()].reduce(
        (current, slot) => current.concat(slot.contents),
        []
      )
    }

    static _defaultGetSlotFunc (track) {
      return track.getSetting('pin') || this.DEFAULT_SLOT_NAME
    }
  }

  PriorityManager.DEFAULT_SLOT_NAMES = [
    'top',
    'scroll',
    'bottom',
    'inbetween'
  ]
  PriorityManager.DEFAULT_SLOT_NAME = 'scroll'

  PriorityManager.DEFAULT_SETTING_STRING = 'visibility'
  PriorityManager.DEFAULT_INCLUDE_COORDINATES = true

  give.PriorityManager = PriorityManager

  return give
})(GIVe || {})
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
        getSlotSettingFunc: getSlotSettingFunc
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
   * When the element is initialized (`super.ready()` is called). An event
   * will be fired to initialize the priority manager based on
   * `this._refArray`, `this.defaultTrackIdList` and `this.groupIdList`. This
   * event will be handled in the __capture phase__ (not the bubbling phase)
   * so that parent elements can intercept the initialization.
   *
   * @polymer
   * @mixinFunction
   */

  give.PriorityManagerCollectionEmbedMixin = dedupingMixin(base =>
    class extends base {
      constructor () {
        super()
        this._initialEventTargets = new Map()
        this._resolveInitPriorityManagerFunc = () => {}
        this.addEventListener('init-priority-manager',
          e => this._initEventHandler(e), true)
        this._urlParamInitializable = true
      }

      static get properties () {
        return {
          ref: {
            type: String,
            observer: '_refChangedHandler',
            notify: true
          },

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
              // Replace properties with URL GET parameters
              this._urlParamHandler()
              if (!this.priorityManagers) {
                this.priorityManagers = new PriorityManagerCollection(
                  this._refArray, this.defaultTrackIdList, this.groupIdList,
                  this.slotNames, this.settingString, this.includeCoordinates,
                  this.getSlotSettingFunc
                )
              } else {
                // Use properties to initialize `this.priorityManagers`
                this.priorityManagers.syncRefList(this._refArray, false,
                  this.defaultTrackIdList, this.groupIdList)
                this._refArray.forEach(
                  ref => this.notifyPath('priorityManagers.' + ref))
              }
              this.priorityManagers.readyPromise.then(() => {
                this._urlParamInitializable = false
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
          this._urlParamInitializable = false
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

      /**
       * Handle parameters passed via URL GET parameters
       *
       * The GET parameters (a URL-encoded JSON string) can be used to
       * override the following properties:
       * `ref`: an array replacing `this._refArray`;
       * `group`: an array replacing `this.groupIdList`
       * `track`: an array replacing `this.defaultTrackIdList`
       * Other properties can be overridden in extended classes. Just overload
       * `this._urlParamToProp` method.
       */
      _urlParamHandler () {
        if (this._urlParamInitializable) {
          let params = new window.URLSearchParams(window.location.search)
          return this._urlParamToProp(params)
        }
        return false
      }

      _urlParamToProp (params) {
        let paramReplaced = false
        if (params.has('ref')) {
          this.ref = window.decodeURIComponent(params.get('ref'))
          paramReplaced = true
        }
        if (params.has('group')) {
          this.groupIdList = JSON.parse(
            window.decodeURIComponent(params.get('group')))
          paramReplaced = true
        }
        if (params.has('track')) {
          this.defaultTrackIdList = JSON.parse(
            window.decodeURIComponent(params.get('track')))
          paramReplaced = true
        }
        return paramReplaced
      }

      _refChanged (newValue, oldValue) {
        return
      }

      _refChangedHandler (newValue, oldValue) {
        return this._refChanged(newValue, oldValue)
      }
    }
  )

  return give
})(GIVe || {})
