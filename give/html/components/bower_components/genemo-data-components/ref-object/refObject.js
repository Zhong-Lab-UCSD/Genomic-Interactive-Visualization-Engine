// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  give.RefObject = function (DB, Name, CommonName, IsEncode, Ref, ChromInfo, settings) {
    // notice that ChromInfo is the JSON encoded object
    //    for chromosome information from chromInfo.php

    // this is for navigation thing
    this.isCollapsed = false
    // whether this ref is collapsed in the browser
    this.isActive = true
    // if user has not selected this ref to display, then it will become false;
    // this is also used for navigation only

    this.db = DB
    this.name = Name
    this.commonName = CommonName
    this.isEncode = IsEncode
    this.ref = Ref
    this.groups = {}        // this is used to get all the groups
    this.settings = {}        // object for all settings

    this.metaFilter = {
      expMap: {},
      cellLineMap: {},
      labMap: {},
      tissueMap: {}
    }

    // read Object for ref chrom info (if there)
    if (ChromInfo) {
      this.initChromInfo(ChromInfo)
    }

    this.tracksUpdated = false    // regardless of whether user has selected
    this._tracksInitialized = false    // regardless of whether user has selected
    this._tracksInitializing = false
    this.tracks = new give.TrackGroup()

    // this.initTracksFromServer()
    // initialize whenever tracks are needed

    // this is for tracks, every entry is a uniTrack Object
    // this.tracksEncode = new TrackBundleWithSample(this.db, '', '', '');

    // this.regionToShow = null;
    // this is to define the region used to show
    // (give.ChromRegion Object, including name, strand and coordinates)

    // this.orderedtracksEncode = new Array();

    if (settings) {
      for (var key in settings) {
        if (settings.hasOwnProperty(key) && !this.hasOwnProperty(key)) {
          this.settings[key] = settings[key]
        }
      }
    }

    this.metaFilterInitialized = false
    if (give.mainTaskScheduler && give.mainMetaDataEntries) {
      give.mainTaskScheduler.addTask(new give.TaskEntry(
        this.initializeMetaFilter.bind(this, give.mainMetaDataEntries),
        ['meta-data-ready', this.getCleanID() + '-tracks-ready']
      ))
    }

    this.reverseLookupTable = {}
  }

  give.RefObject.prototype.getCleanID = function () {
    return this.db.replace(/[\s()+/]/g, '')
  }

  give.RefObject.prototype.initChromInfo = function (ChromInfo) {
    if (ChromInfo) {
      this.chromInfo = {}
      for (var chrom in ChromInfo) {
        if (ChromInfo.hasOwnProperty(chrom)) {
          this.chromInfo[chrom] = {}
          this.chromInfo[chrom].name = chrom
          this.chromInfo[chrom].chrRegion =
            new give.ChromRegion(ChromInfo[chrom].chrRegion)
          if (ChromInfo[chrom].cent) {
            this.chromInfo[chrom].cent =
              new give.ChromRegion(ChromInfo[chrom].cent)
          }
          if (chrom.toLowerCase() !== chrom) {
            this.chromInfo[chrom.toLowerCase()] = this.chromInfo[chrom]
          }
        }
      }
    }
  }

  give.RefObject.prototype.initChromInfoFromServer = function (target) {
    give.postAjax(target || give.RefObject.initChromTarget, {db: this.db}, function (data) {
      this.initChromInfo(data)
      give.fireSignal(give.TASKSCHEDULER_EVENT_NAME, {flag: this.getCleanID() + '-chrominfo-ready'})
    }, 'json', null, null, this) // end ajax to initialize ref
  }

  give.RefObject.prototype.initTracks = function (groupInfo, keepOld, requestUrl) {
    // notice that trackInfo is supposed to be an array
    if (!keepOld) {
      this.tracks.clear()
      this.groups = {}
      this.reverseLookupTable = {}
    }
    var loadTrackFromRemoteData = function (groupID, track) {
      var newTrack = new give.TrackObject(track.tableName, track, this)
      newTrack.groupID = groupID
      if (requestUrl && !newTrack.requestUrl) {
        newTrack.requestUrl = requestUrl
      }
      this.tracks.addTrack(newTrack)

      // reverse lookup table related, might be rewritten if table structure is changed later
      if (Array.isArray(newTrack.getTableNames())) {
        newTrack.getTableNames().forEach(function (tableName) {
          this.reverseLookupTable[tableName] = newTrack
        }, this)
      } else {
        this.reverseLookupTable[newTrack.getTableNames()] = newTrack
      }
      // end reverse lookup related

      this.groups[groupID].addTrack(newTrack)
    }
    for (var groupID in groupInfo) {
      if (groupInfo.hasOwnProperty(groupID)) {
        this.groups[groupID] = new give.TrackGroup(groupID, groupInfo[groupID])
        groupInfo[groupID].tracks.forEach(loadTrackFromRemoteData.bind(this, groupID),
                          this)
      }
    }
    this._tracksInitialized = true
    this._tracksInitializing = false
    give.fireSignal(give.TASKSCHEDULER_EVENT_NAME, {flag: this.getCleanID() + '-tracks-ready'})
  }

  give.RefObject.prototype.callOnTracksReady = function (callback) {
    // notice that callback needs to be a bound function if 'this' is important
    return this.initTracksFromServer(null, callback)
  }

  give.RefObject.prototype.getTracks = function (callback) {
    if (this._tracksInitialized) {
      return this.tracks
    } else {
      this.initTracksFromServer(null, callback)
      return null
    }
  }

  give.RefObject.prototype.getGroups = function (callback) {
    if (this._tracksInitialized) {
      return this.groups
    } else {
      this.initTracksFromServer(null, callback)
      return null
    }
  }

  give.RefObject.prototype.initTracksFromServer = function (target, callback) {
    // callback is the callback function taking no argument (already bound)
    if (!this._tracksInitialized) {
      if (callback) {
        give.mainTaskScheduler.addTask(new give.TaskEntry(callback,
          [this.getCleanID() + '-tracks-ready']))
      }
      if (!this._tracksInitializing) {
        give.postAjax(target || give.RefObject.initTrackTarget, {db: this.db}, function (data) {
          this.initTracks(data, false, give.TrackObject.fetchDataTarget)
        }, 'json', null, null, this)
        this._tracksInitializing = true
        give._verboseConsole('Tracks not initialized for ref ' +
          this.name + '.', give.VERBOSE_DEBUG)
      }
      return false
    } else {
      if (callback) {
        return callback()
      }
    }
  }

  give.RefObject.prototype.addCustomTrack = function (track, group, callback) {
    // if group ID is not specified, use "customTracks" as ID;
    // replace tracks with the same groupID and track.tableName
    group = group || {}
    var groupID = group.id || 'customTracks'
    if (!this.groups.hasOwnProperty(groupID)) {
      this.groups[groupID] = give.RefObject.createCustomGroup(group)
    }
    // remove existing track
    if (this.groups[groupID].hasTrack(track.tableName)) {
      this.groups[groupID].removeTrack(track.tableName)
      this.tracks.removeTrack(track.tableName)
    }
    var newTrack = new give.TrackObject(track.tableName, track, this)
    newTrack.groupID = groupID
    if (!newTrack.remoteUrl) {
      newTrack.remoteUrl = give.TrackObject.fetchCustomTarget
    }
    this.tracks.addTrack(newTrack)
    this.groups[groupID].addTrack(newTrack)
    if (callback) {
      callback(this)
    }
    give.fireSignal(give.TASKSCHEDULER_EVENT_NAME, {flag: this.getCleanID() + '-custom-tracks-ready'})
  }

  give.RefObject.prototype.initializeMetaFilter = function (metaEntries) {
    // metaEntry as give.MetaDataEntries
    this.tracks.forEach(function (track) {
      var cellType = track.getSetting('cellType')
      var labName = track.getSetting('labName')
      var tissueType = metaEntries.findMeta(this.commonName, cellType, 'tissue')
      if (track.getCleanLowerTitle()) {
        if (!this.metaFilter.expMap.hasOwnProperty(track.getCleanLowerTitle())) {
          this.metaFilter.expMap[track.getCleanLowerTitle()] = []
          this.metaFilter.expMap[track.getCleanLowerTitle()].name = track.getTitle()
        }
        this.metaFilter.expMap[track.getCleanLowerTitle()].push(track.id)
      }
      if (cellType) {
        if (!this.metaFilter.cellLineMap.hasOwnProperty(cellType)) {
          this.metaFilter.cellLineMap[cellType] = []
        }
        this.metaFilter.cellLineMap[cellType].push(track.id)
      }
      if (labName) {
        if (!this.metaFilter.labMap[labName]) {
          this.metaFilter.labMap[labName] = []
        }
        this.metaFilter.labMap[labName].push(track.id)
      }
      if (tissueType) {
        if (!this.metaFilter.tissueMap[tissueType]) {
          this.metaFilter.tissueMap[tissueType] = []
        }
        this.metaFilter.tissueMap[tissueType].push(track.id)
      } else {
        give._verboseConsole(cellType + ' does not have a tissue type.',
          give.VERBOSE_DEBUG)
      }
    }, this)
    this.metaFilterInitialized = true
    give.fireSignal(give.TASKSCHEDULER_EVENT_NAME,
      {flag: this.getCleanID() + '-meta-filter-ready'})
  }

  give.RefObject.prototype.getFilteredTrackList = function (filter) {
    if (filter) {
      return this.getTracks().filter(filter, this)
    }
    return this.getTracks()
  }

  give.RefObject.prototype.setTrackSettings = function (prop, value, filter) {
    this.getFilteredTrackList(filter).forEach(function (track) {
      track.setSetting(prop, value)
    }, this)
  }

  give.RefObject.prototype.getTrackIDList = function (filter) {
    // return a list of all trackIDs that passes through the filter function
    return this.getFilteredTrackList(filter).map(function (track) {
      return track.id
    }, this)
  }

  give.RefObject.prototype.getTrackTableNameList = function (filter) {
    var result = []
    this.getFilteredTrackList(filter).forEach(function (track) {
      result = result.concat(track.getTableNames())
    }, this)
    return result
  }

  give.RefObject.initAllTarget = '/givdata/initRef.php'
  give.RefObject.initChromTarget = '/givdata/initRef.php'
  give.RefObject.initTrackTarget = '/givdata/initTracks.php'

  give.RefObject.initAllRef = function (target, spcArray, filter, callback) {
    // initialize all ref from db
    // return an array of ref
    // callback is the callback function taking spcArray as argument
    spcArray = spcArray || []
    spcArray.splice(0, spcArray.length)
    spcArray.dbMap = {}
    spcArray.ready = false
    spcArray.currRef = spcArray.currRef || function () {
      return this[this.selected] || this.dbMap[this.selected] || null
    }

    give.postAjax(target || give.RefObject.initAllTarget, {}, function (data) {
      for (var spcDb in data) {
        if (data.hasOwnProperty(spcDb) && (typeof filter !== 'function' || filter(data[spcDb]))) {
          spcArray.dbMap[spcDb] = new give.RefObject(spcDb, data[spcDb].name,
                                   data[spcDb].commonname,
                                   data[spcDb].encode, data[spcDb].dbname, data[spcDb].chromInfo,
                                   data[spcDb].settings)
          spcArray.push(spcArray.dbMap[spcDb])
        }
      }
      spcArray.ready = true
      spcArray.selected = null
      if (callback) {
        callback(spcArray)
      } else {
        give.fireSignal(give.TASKSCHEDULER_EVENT_NAME, {flag: 'ref-ready'})
      }
    }, 'json') // end ajax to initialize ref
    return spcArray
  }

  give.RefObject.createCustomGroup = function (group) {
    group = group || {}
    var groupID = group.id || 'customTracks'
    group.label = group.label || 'Custom Tracks'
    group.priority = group.priority || give.TrackGroup.CUSTOM_GROUP_PRIORITY
    return new give.TrackGroup(groupID, group)
  }

  return give
})(GIVe || {})
