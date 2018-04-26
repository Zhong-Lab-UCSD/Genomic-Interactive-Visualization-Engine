// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  class RefObject {
    constructor (DB, Name, CommonName, IsEncode, Ref, ChromInfo, settings) {
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
      this.isEncode = ((typeof IsEncode === 'boolean') ? IsEncode
        : ((typeof IsEncode === 'string') ? IsEncode !== '0' : !!IsEncode))
      this.ref = Ref
      this.settings = {} // object for all settings

      this.metaFilter = {
        expMap: {},
        cellLineMap: {},
        labMap: {},
        tissueMap: {}
      }
      // read Object for ref chrom info (if there)
      this._ChromInfoPromise =
        this.initChromInfo(ChromInfo, settings.initChromTarget)

      this.groups = {} // this is used to get all the groups
      this.tracksUpdated = false // regardless of whether user has selected
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

      this.reverseLookupTable = {}
      if (!this.settings.hasOwnProperty('defaultViewWindows')) {
        this.settings.defaultViewWindows = give.RefObject.defaultViewWindows
      }
      if (typeof this.settings.defaultViewWindows === 'string') {
        this.settings.defaultViewWindows = [this.settings.defaultViewWindows]
      }
    }

    get cleanId () {
      return this.db.replace(/[\s()+/]/g, '')
    }

    initChromInfo (ChromInfo, target) {
      if (ChromInfo) {
        try {
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
        } catch (err) {
          this.ChromInfo = null
          give._verbConsole.warn(err)
          give.fireSignal('warning', { msg: err.message })
        }
        return this.ChromInfo
      } else {
        return this.initChromInfoFromServer(target)
      }
    }

    initChromInfoFromServer (target) {
      return give.postAjax(
        target || give.RefObject.initChromTarget,
        {db: this.db},
        'json', 'GET'
      ).then(data => this.initChromInfo(data))
    }

    fillTracks (groupInfo, keepOld, requestUrl) {
      // notice that trackInfo is supposed to be an array
      if (!keepOld) {
        this.tracks.clear()
        this.groups = {}
        this.reverseLookupTable = {}
      }
      var loadTrackFromRemoteData = function (groupID, track) {
        var newTrack = give.TrackObject.createTrack(track.tableName, track, this,
          null, groupID)
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
          groupInfo[groupID].tracks.forEach(
            loadTrackFromRemoteData.bind(this, groupID), this
          )
        }
      }
    }

    get promisedTracks () {
      return this.initTracks().then(() => this.tracks)
    }

    get promisedGroups () {
      return this.initTracks().then(() => this.groups)
    }

    initTracks (target) {
      // callback is the callback function taking no argument (already bound)
      if (!this._TrackPromise) {
        this._TrackPromise = give.postAjax(
          target || give.RefObject.initTrackTarget, {db: this.db},
          'json'
        ).then(data => {
          give._verbConsole.info('Tracks not initialized for ref ' +
            this.name + '.')
          this.fillTracks(data, false, give.TrackObject.fetchDataTarget)
          return this
        })
        this.initMetaFilter()
      }
      return this._TrackPromise
    }

    initMetaFilter () {
      if (give.mainMetaDataEntries) {
        if (!this._MetaPromise) {
          this._MetaPromise = Promise.all([
            give.mainMetaDataEntries.DataPromise,
            this._ChromInfoPromise,
            this._TrackPromise
          ]).then(dataArr => this.fillMetaFilter(dataArr[0]))
        }
        return this._MetaPromise
      } else {
        return Promise.reject(new Error('No main meta data entries available!'))
      }
    }

    addCustomTrack (track, group, callback) {
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
      var newTrack = new give.TrackObject(track.tableName, track, this, groupID)
      newTrack.groupID = groupID
      if (!newTrack.remoteUrl) {
        newTrack.remoteUrl = give.TrackObject.fetchCustomTarget
      }
      this.tracks.addTrack(newTrack)
      this.groups[groupID].addTrack(newTrack)
      if (callback) {
        callback.call(this)
      }
      give.fireSignal(give.TASKSCHEDULER_EVENT_NAME, {flag: this.cleanId + '-custom-tracks-ready'})
    }

    fillMetaFilter (metaEntries) {
      // metaEntry as give.MetaDataEntries
      metaEntries = metaEntries || give.mainMetaDataEntries
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
          give._verbConsole.info(cellType + ' does not have a tissue type.')
        }
      }, this)
      this.metaFilterInitialized = true
      return this
    }

    getFilteredTrackList (filter) {
      if (filter) {
        return this.tracks.filter(filter, this)
      }
      return this.tracks
    }

    setTrackSettings (prop, value, filter) {
      this.getFilteredTrackList(filter).forEach(function (track) {
        track.setSetting(prop, value)
      }, this)
    }

    getTrackIDList (filter) {
      // return a list of all trackIDs that passes through the filter function
      return this.getFilteredTrackList(filter).map(function (track) {
        return track.id
      }, this)
    }

    getTrackTableNameList (filter) {
      var result = []
      this.getFilteredTrackList(filter).forEach(function (track) {
        result = result.concat(track.getTableNames())
      }, this)
      return result
    }

    static initAllRefFromServer (target, filter) {
      return give.postAjax(target || this.initAllTarget, {}, 'json')
        .then(this.initAllRef.bind(this, filter))
    }

    static initAllRef (filter, data) {
      // initialize all ref from db
      // return an array of ref
      // callback is the callback function taking refArray as argument
      if (filter === undefined) {
        filter = this.refFilter
      }
      this.refArray = this.refArray || []
      this.refArray.splice(0, this.refArray.length)
      this.refArray.dbMap = {}
      this.refArray.currRef = this.refArray.currRef || function () {
        return this[this.selected] || this.dbMap[this.selected] || null
      }
      for (var refDb in data) {
        if (data.hasOwnProperty(refDb) &&
          (typeof filter !== 'function' || filter(data[refDb]))
        ) {
          this.refArray.dbMap[refDb] = new give.RefObject(
            refDb, data[refDb].name,
            data[refDb].commonname,
            data[refDb].encode, data[refDb].dbname, data[refDb].chromInfo,
            data[refDb].settings)
          this.refArray.push(this.refArray.dbMap[refDb])
        }
      }
      this.refArray.selected = null
      return this.refArray
    }

    static createCustomGroup (group) {
      group = group || {}
      var groupID = group.id || 'customTracks'
      group.label = group.label || 'Custom Tracks'
      group.priority = group.priority || give.TrackGroup.CUSTOM_GROUP_PRIORITY
      return new give.TrackGroup(groupID, group)
    }

    static findRefByDb (db) {
      if (typeof db === 'string' && !this.refArray) {
        // not ready yet, push to task scheduler
        throw (new Error('refArray is not initialized yet! Please use ' +
          'GIVe.RefObject.AllRefPromise.then() to wrap your function.'))
      } else {
        if (typeof db === 'string' &&
          this.refArray.dbMap.hasOwnProperty(db)) {
          // look up reference in give.RefObject.refArray
          return give.RefObject.refArray.dbMap[db]
        } else if (db instanceof give.RefObject) {
          return db
        } else {
          throw (new Error('Invalid RefObject was given: ' + db))
        }
      }
    }
  }

  RefObject.refFilter = give.Ref_RefFilter ||
    (ref => (ref.settings.isGIVeEnabled || ref.settings.isGIVEEnabled))

  RefObject.initAllTarget = give.Host +
    (give.ServerPath || '/') +
    (give.Ref_InitAllTarget || 'initRef.php')
  RefObject.initChromTarget = give.Host +
    (give.ServerPath || '/') +
    (give.Ref_InitChromTarget || 'initRef.php')
  RefObject.initTrackTarget = give.Host +
    (give.ServerPath || '/') +
    (give.Ref_InitTrackTarget || 'initTracks.php')

  RefObject.defaultViewWindows = give.Ref_DefaultViewWindows ||
    ['chr10:30000000-55000000', 'chr10:34900000-65000000']

  RefObject.AllRefPromise = RefObject.initAllRefFromServer()

  give.RefObject = RefObject

  return give
})(GIVe || {})
