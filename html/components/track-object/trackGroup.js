// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  give.TrackGroup = function (groupID, params, idprefix, idpostfix) {
    this.array = []
    this.map = {}
    this.IDPrefix = (typeof (idprefix) === 'string') ? idprefix : ''
    this.IDPostfix = (typeof (idpostfix) === 'string') ? idpostfix : ''

    this.id = groupID
    for (var key in params) {
      if (params.hasOwnProperty(key)) {
        this[key] = params[key]
      }
    }
    this.label = this.label || ''
    this.priority = this.priority || give.TrackGroup._MAX_GROUP_PRIORITY
    this.visibility = !!(this.visibility)    // force into boolean
  }

  give.TrackGroup.prototype.addTrack = function (track) {
    this.array.push(track)
    this.map[track.id] = track
  }

  give.TrackGroup.prototype.removeTrack = function (track) {
    var id = track.id || track
    if (typeof id === 'number') {
      delete this.map[this.array[id].id]
      this.array.splice(id, 1)
    } else if (this.hasTrack(id)) {
      delete this.map[id]
      for (var i = 0; i < this.getLength(); i++) {
        if (this.array[i].id === id) {
          this.array.splice(i, 1)
          break
        }
      }
    }
  }

  give.TrackGroup.prototype.get = function (index) {
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

  give.TrackGroup.prototype.getLength = function () {
    return this.array.length
  }

  // basic array manipulations

  give.TrackGroup.prototype.forEach = function (callback, thisArg) {
    return this.array.forEach(callback, thisArg)
  }

  give.TrackGroup.prototype.some = function (callback, thisArg) {
    return this.array.some(callback, thisArg)
  }

  give.TrackGroup.prototype.every = function (callback, thisArg) {
    return this.array.every(callback, thisArg)
  }

  give.TrackGroup.prototype.forEachByID = function (IDList, callback, thisArg) {
    if (!Array.isArray) {
      IDList = [IDList]
    }
    return IDList.forEach(function (id) {
      return callback.call(thisArg, this.get(id))
    }, this)
  }

  give.TrackGroup.prototype.someByID = function (IDList, callback, thisArg) {
    if (!Array.isArray) {
      IDList = [IDList]
    }
    return IDList.some(function (id) {
      return callback.call(thisArg, this.get(id))
    }, this)
  }

  give.TrackGroup.prototype.everyByID = function (IDList, callback, thisArg) {
    if (!Array.isArray) {
      IDList = [IDList]
    }
    return IDList.every(function (id) {
      return callback.call(thisArg, this.get(id))
    }, this)
  }

  give.TrackGroup.prototype.clear = function () {
    this.map = {}
    this.array.splice(0, this.array.length)
  }

  give.TrackGroup.prototype.filter = function (filterFunc, thisArg) {
    return this.array.filter(filterFunc, thisArg)
  }

  give.TrackGroup.prototype.map = function (mapFunc, thisArg) {
    return this.array.map(mapFunc, thisArg)
  }

  give.TrackGroup.prototype.filterSelf = function (callback, thisArg) {
    // filter stuff
    for (var i = 0; i < this.getLength(); i++) {
      if (!callback.call(thisArg, this.array[i], i, this.array)) {
        // need to filter
        // remove from map and array
        delete this.map[this.array[i].id]
        this.array.splice(i, 1)
      }
    }
  }

  give.TrackGroup.prototype.hasTrack = function (track) {
    // can provide trackID or track itself
    switch (typeof track) {
      case 'string':
        return this.map.hasOwnProperty(track)
      case 'object':
        if (track instanceof give.TrackObject) {
          return this.map.hasOwnProperty(track.id)
        }
      default: // eslint-disable-line no-fallthrough
        // this will also handle situations where track is not a give.TrackObject object
        give._verbConsole.warn('Track ' + track +
          ' is not a give.TrackObject Object.')
        give.fireSignal('warning', { msg: 'Track ' + track +
          ' is not a give.TrackObject Object.' })
        return false
    }
  }

  give.TrackGroup._MAX_GROUP_PRIORITY = 100000
  give.TrackGroup.CUSTOM_GROUP_PRIORITY = 90000

  return give
})(GIVe || {})
