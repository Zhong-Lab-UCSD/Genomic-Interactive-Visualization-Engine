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
    constructor (slotNames) {
      this._slots = {}
      this.idToEffectivePriorityDict = new Map()
      this.hasSlots = true
      if (Array.isArray(slotNames)) {
        if (slotNames.length <= 0 ||
          slotNames.some(name => !(name && typeof name === 'string'))
        ) {
          slotNames = ['_default']
          this.hasSlots = false
        }
      } else {
        slotNames = this.constructor.DEFAULT_SLOT_NAMES
      }
      slotNames.forEach((name, index) => {
        if (name && !this._slots[name]) {
          this._slots[name] = { index: index, contents: [] }
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
      if (this.hasSlots && !this._slots[slotName]) {
        throw new give.GiveError('Invalid slot name: ' + slotName)
      }
      return this.hasSlots ? slotName : '_default'
    }

    _getInternalSlotName (trackId) {
      return this._verifySlotName(this.getEffectivePriority(trackId).slotName)
    }

    _syncEffectivePriority (slotName, start, end) {
      slotName = this._verifySlotName(slotName)
      start = (Number.isInteger(start) ? start : 0)
      end = (Number.isInteger(end)
        ? end : this._slots[slotName].contents.length)
      for (let index = start; index < end; index++) {
        this.getEffectivePriority(
          this._slots[slotName].contents[index]
        ).position = index
      }
    }

    _moveTrackIdSameSlot (trackId, newPosition) {
      let slotName = this._getInternalSlotName(trackId)
      if (Number.isInteger(newPosition) && newPosition >= 0 &&
        newPosition < this._slots[slotName].contents.length
      ) {
        let oldPosition = this.getEffectivePriority(trackId).position
        if (newPosition !== oldPosition) {
          this._slots[slotName].contents.splice(oldPosition, 1)
          this._slots[slotName].contents.splice(newPosition, 0, trackId)
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
      this._slots[slotName].contents.splice(position, 0, trackId)
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
      this._slots[slotName].contents.splice(position, 1)
      if (deleteEffectivePriority) {
        this.idToEffectivePriorityDict.delete(trackId)
      }
      this._syncEffectivePriority(slotName, position)
    }

    addTrackId (trackId, slotName, position) {
      if (this.idToEffectivePriorityDict.has(trackId)) {
        throw new give.GiveError('Track ID already exists: ' + trackId)
      }
      slotName = this._verifySlotName(slotName)
      if (!Number.isInteger(position) || position < 0 ||
        position > this._slots[slotName].contents.length
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
        position = this._slots[slotName].contents.length
      }
      this._insertTrackIdIntoSlot(trackId, slotName, position, true)
    }

    removeTrackId (trackId) {
      let slotName = this._getInternalSlotName(trackId)
      if (!slotName) {
        throw new give.GiveError('Track ID does not exist: ' + trackId)
      }
      this._removeTrackIdFromSlot(trackId, slotName, true)
    }

    moveTrackId (trackId, newSlotName, newPosition) {
      if (!this.getEffectivePriority(trackId)) {
        throw new give.GiveError('Track ID does not exist: ' + trackId)
      }
      newSlotName = this._verifySlotName(newSlotName)
      let oldSlotName = this._getInternalSlotName(trackId)
      if (!Number.isInteger(newPosition) || newPosition < 0 ||
        newPosition > this._slots[newSlotName].contents.length
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
        newPosition = this._slots[newSlotName].contents.length
      }
      if (oldSlotName === newSlotName) {
        return this._moveTrackIdSameSlot(trackId, newPosition)
      } else {
        this._removeTrackIdFromSlot(trackId, oldSlotName, false)
        this._insertTrackIdIntoSlot(trackId, newSlotName, newPosition, false)
      }
    }

    getEffectivePriority (trackId) {
      return this.idToEffectivePriorityDict.get(trackId)
    }

    _isValidEffectivePriority (priority) {
      if (!(priority instanceof EffectivePriority)) {
        return false
      }
      let slotName = this._verifySlotName(priority.slotName)
      return Number.isInteger(priority.position) &&
        priority.position >= 0 &&
        priority.position < this._slots[slotName].contents.length
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
        ? Math.sign(this._slots[slotName1].index - this._slots[slotName2].index)
        : Math.sign(priority1.position - priority2.position)
    }

    clear () {
      for (let slotName in this._slots) {
        this._slots[slotName].contents.length = 0
      }
      this.idToEffectivePriorityDict.clear()
    }

    hasTrackId (trackId) {
      return this.idToEffectivePriorityDict.has(trackId)
    }
  }

  PriorityManager.DEFAULT_SLOT_NAMES = [
    'top',
    'scroll',
    'bottom',
    'inbetween'
  ]

  give.PriorityManager = PriorityManager

  return give
})(GIVe || {})
