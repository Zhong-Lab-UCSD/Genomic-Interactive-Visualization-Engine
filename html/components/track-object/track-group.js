import './track-object.js';
import './tracks-header.js';
// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  class TrackGroup {
    constructor (groupID, params, idprefix, idpostfix) {
      this.array = []
      this.map = {}
      this.IDPrefix = (typeof (idprefix) === 'string') ? idprefix : ''
      this.IDPostfix = (typeof (idpostfix) === 'string') ? idpostfix : ''
      params = params || {}

      this.id = groupID
      for (var key in params) {
        if (params.hasOwnProperty(key) && !this.hasOwnProperty(key)) {
          this[key] = params[key]
        }
      }
      this.label = this.label || ''
      this.priority = this.priority || this.constructor._MAX_GROUP_PRIORITY
      this.visibility = !!(this.visibility) // force into boolean
    }

    addTrack (track) {
      this.array.push(track)
      this.map[track.id] = track
    }

    removeTrack (track) {
      let id = track.id || track
      if (typeof id === 'number') {
        delete this.map[this.array[id].id]
        this.array.splice(id, 1)
      } else if (this.hasTrack(id)) {
        delete this.map[id]
        for (let i = 0; i < this.length; i++) {
          if (this.array[i].id === id) {
            this.array.splice(i, 1)
            break
          }
        }
      }
    }

    get (index) {
      // index can be number or string
      var result
      if (typeof index === 'number') {
        result = this.array[index]
      } else {
        result = this.map[index]
      }
      if (typeof (result) !== 'object') {
        throw index
      }
      return result
    }

    get length () {
      return this.array.length
    }

    // basic array manipulations

    forEach (callback, thisArg) {
      return this.array.forEach(callback, thisArg)
    }

    some (callback, thisArg) {
      return this.array.some(callback, thisArg)
    }

    every (callback, thisArg) {
      return this.array.every(callback, thisArg)
    }

    slice (begin, end) {
      return this.array.slice(begin, end)
    }

    forEachByID (IDList, callback, thisArg) {
      if (!Array.isArray(IDList)) {
        IDList = [IDList]
      }
      return IDList.forEach(id => (
        this.hasTrack(id) ? callback.call(thisArg, this.get(id)) : false
      ))
    }

    someByID (IDList, callback, thisArg) {
      if (!Array.isArray(IDList)) {
        IDList = [IDList]
      }
      return IDList.some(id => (
        this.hasTrack(id) ? callback.call(thisArg, this.get(id)) : false
      ))
    }

    everyByID (IDList, callback, thisArg) {
      if (!Array.isArray(IDList)) {
        IDList = [IDList]
      }
      return IDList.every(id => (
        this.hasTrack(id) ? callback.call(thisArg, this.get(id)) : true
      ))
    }

    clear () {
      this.map = {}
      this.array.splice(0, this.array.length)
    }

    filter (filterFunc, thisArg) {
      return this.array.filter(filterFunc, thisArg)
    }

    map (mapFunc, thisArg) {
      return this.array.map(mapFunc, thisArg)
    }

    sort (compareFunc) {
      this.array.sort(compareFunc)
      return this
    }

    filterSelf (callback, thisArg) {
      // filter stuff
      for (let i = 0; i < this.length; i++) {
        if (!callback.call(thisArg, this.array[i], i, this.array)) {
          // need to filter
          // remove from map and array
          delete this.map[this.array[i].id]
          this.array.splice(i, 1)
        }
      }
    }

    hasTrack (track) {
      // can provide trackID or track itself
      switch (typeof track) {
        case 'string':
          return this.map.hasOwnProperty(track)
        case 'object':
          if (track instanceof give.TrackObject) {
            return this.map.hasOwnProperty(track.id)
          }
        default: // eslint-disable-line no-fallthrough
          // this will also handle situations where track is not a
          // give.TrackObject object
          give._verbConsole.warn('Track ' + track +
            ' is not a give.TrackObject Object.')
          give.fireSignal('give-warning', {
            msg: 'Track ' + track +
              ' is not a give.TrackObject Object.'
          })
          return false
      }
    }

    match (iterableList) {
      let newTrackSet = new Set(iterableList)
      for (let i = 0; i < this.length; i++) {
        if (!newTrackSet.has(this.array[i])) {
          this.removeTrack(i)
          i--
        }
      }
      if (typeof iterableList[Symbol.iterator] === 'function') {
        // iterable
        for (let track of iterableList) {
          if (!this.hasTrack(track)) {
            this.addTrack(track)
          }
        }
      } else {
        // array-like
        for (let i = 0; i < iterableList.length; i++) {
          if (!this.hasTrack(iterableList[i])) {
            this.addTrack(iterableList[i])
          }
        }
      }
      return this
    }

    [Symbol.iterator] () {
      return this.array[Symbol.iterator]()
    }

    static from (trackList, oldTrackGroup, keepOriginalOrder) {
      if (!trackList ||
        (typeof trackList[Symbol.iterator] !== 'function' &&
          typeof trackList.length !== 'number'
        )
      ) {
        throw new give.GiveError('trackList not an array or an iterable!')
      }
      oldTrackGroup = oldTrackGroup || {}
      oldTrackGroup.id = oldTrackGroup.id || 'newGroup'
      let newTrackGroup = new TrackGroup(oldTrackGroup.id,
        oldTrackGroup.params, oldTrackGroup.idPrefix, oldTrackGroup.idPostfix)
      if (oldTrackGroup.array && keepOriginalOrder) {
        newTrackGroup.match(oldTrackGroup.array)
      }
      return newTrackGroup.match(trackList)
    }
  }

  TrackGroup._MAX_GROUP_PRIORITY = 100000
  TrackGroup.CUSTOM_GROUP_PRIORITY = 90000

  give.TrackGroup = TrackGroup

  return give
})(GIVe || {})
