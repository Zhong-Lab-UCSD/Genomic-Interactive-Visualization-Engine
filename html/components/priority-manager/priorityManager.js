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
        .then(() => this)
      return this.readyPromise
    }

    reset (refObj, defaultTrackIdList, groupIdList) {
      return refObj.initPriorityManager(this, defaultTrackIdList, groupIdList)
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
          give.fireSignal('warning', {
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
        give.fireSignal('warning', {
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
              give.fireSignal('warning', {
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
          give.fireSignal('warning', {
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
