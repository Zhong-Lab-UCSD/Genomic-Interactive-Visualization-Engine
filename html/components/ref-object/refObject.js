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

  class RefObject {
    constructor (DB, Name, CommonName, IsEncode, chromInfo, settings) {
      // notice that chromInfo is the JSON encoded object
      //    for chromosome information from chromInfo.php

      // this is for navigation thing
      this.isCollapsed = false
      // whether this refObj is collapsed in the browser
      this.isActive = true
      // if user has not selected this refObj to display, then it will become
      // false; this is also used for navigation only

      this.db = DB
      this.name = Name
      this.commonName = CommonName
      this.isEncode = ((typeof IsEncode === 'boolean') ? IsEncode
        : ((typeof IsEncode === 'string') ? IsEncode !== '0' : !!IsEncode))
      this.settings = {} // object for all settings

      this.metaFilter = {
        expMap: {},
        cellLineMap: {},
        labMap: {},
        tissueMap: {}
      }
      // read Object for refObj chrom info (if there)
      this._chromInfoPromise =
        this.initChromInfo(chromInfo, settings.initChromTarget)

      this.groups = {} // this is used to get all the groups
      this.tracksUpdated = false // regardless of whether user has selected
      this.tracks = new give.TrackGroup()
      this.coordinateTracks = new give.TrackGroup()
      this.highlightTrack = null

      // this.initTracksFromServer()
      // initialize whenever tracks are needed

      // this is for tracks, every entry is a uniTrack Object
      // this.tracksEncode = new TrackBundleWithSample(this.db, '', '', '');

      // this.regionToShow = null;
      // this is to define the region used to show
      // (give.ChromRegion Object, including name, strand and coordinates)

      // this.orderedtracksEncode = new Array();

      if (settings) {
        for (let key in settings) {
          if (settings.hasOwnProperty(key) && !this.hasOwnProperty(key)) {
            this.settings[key] = settings[key]
          }
        }
      }

      this.reverseLookupTable = {}
      if (!this.settings.hasOwnProperty('defaultViewWindows')) {
        this.settings.defaultViewWindows = this.constructor.defaultViewWindows
      }
      if (typeof this.settings.defaultViewWindows === 'string') {
        this.settings.defaultViewWindows = [this.settings.defaultViewWindows]
      }

      this._trackPromise = null
    }

    get cleanId () {
      return this.db.replace(/[\s()+/]/g, '')
    }

    initChromInfo (chromInfo, target) {
      if (chromInfo) {
        return Promise.resolve(this._initChromInfoFromData(chromInfo))
      } else {
        return this._initChromInfoFromServer(target)
      }
    }

    _initChromInfoFromData (chromInfo) {
      try {
        this.chromInfo = {}
        for (let chrom in chromInfo) {
          if (chromInfo.hasOwnProperty(chrom)) {
            this.chromInfo[chrom] = {}
            this.chromInfo[chrom].name = chrom
            this.chromInfo[chrom].chrRegion =
              new give.ChromRegion(chromInfo[chrom].chrRegion)
            if (chromInfo[chrom].cent) {
              this.chromInfo[chrom].cent =
                new give.ChromRegion(chromInfo[chrom].cent)
            }
            if (chrom.toLowerCase() !== chrom) {
              this.chromInfo[chrom.toLowerCase()] = this.chromInfo[chrom]
            }
          }
        }
        this.highlightTrack = this.createHighlightTrack()
      } catch (err) {
        this.chromInfo = null
        give._verbConsole.warn(err)
        give.fireSignal('give-warning', { msg: err.message })
      }
      return this.chromInfo
    }

    _initChromInfoFromServer (target) {
      return give.postAjax(
        target || this.constructor.initChromTarget,
        {db: this.db},
        'json', 'GET'
      ).then(data => this._initChromInfoFromData(data))
    }

    fillTracks (groupInfo, keepOld, requestUrl) {
      // notice that groupInfo is supposed to be an array
      if (!keepOld) {
        this.tracks.clear()
        this.groups = {}
        this.reverseLookupTable = {}
      }
      let loadTrackFromRemoteData = (groupID, track) => {
        let newTrack = give.TrackObject.createTrack(track.tableName, track,
          this, null, groupID)
        if (requestUrl && !newTrack.requestUrl) {
          newTrack.requestUrl = requestUrl
        }
        this.tracks.addTrack(newTrack)

        // reverse lookup table related, might be rewritten if table structure
        // is changed later
        if (Array.isArray(newTrack.tableNames)) {
          newTrack.tableNames.forEach(tableName => (
            this.reverseLookupTable[tableName] = newTrack
          ))
        } else {
          this.reverseLookupTable[newTrack.tableNames] = newTrack
        }
        // end reverse lookup related

        this.groups[groupID].addTrack(newTrack)
      }
      for (let groupID in groupInfo) {
        if (groupInfo.hasOwnProperty(groupID)) {
          this.groups[groupID] = new give.TrackGroup(
            groupID, groupInfo[groupID])
          groupInfo[groupID].tracks.forEach(
            track => loadTrackFromRemoteData(groupID, track)
          )
        }
      }

      // sort tracks based on their priority,
      // then rewrite all priority values within each group
      // this will make sure future sorting will be stable
      // (since priority values are not used once all tracks are loaded anyway)
      this.sortTracks(true)
    }

    sortTracks (refreshPriority, compareFunc) {
      compareFunc = compareFunc || give.TrackObject.comparePriorities
      this.tracks.sort(compareFunc)
      if (refreshPriority) {
        let priority = 1
        this.tracks.forEach(track => {
          track.priority = priority
          priority++
        })
      }
      for (let groupID in this.groups) {
        if (this.groups.hasOwnProperty(groupID)) {
          this.groups[groupID].sort(compareFunc)
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
      if (!this._trackPromise) {
        this._trackPromise = give.postAjax(
          target || this.constructor.initTrackTarget, {db: this.db},
          'json'
        ).then(data => {
          give._verbConsole.info('Tracks not initialized for ref ' +
            this.name + '.')
          this.fillTracks(data, false, give.TrackObject.fetchDataTarget)
        }).then(() => {
          if (!this.coordinateTracks.length) {
            let coordinateTrack = this.createCoordinateTrack()
            this.coordinateTracks.addTrack(coordinateTrack)
            this.tracks.addTrack(coordinateTrack)
          }
          return this
        })
        this.initMetaFilter()
      }
      return this._trackPromise
    }

    createCoordinateTrack (slotName) {
      slotName = slotName || this.constructor.DEFAULT_COORDINATE_SLOT_NAME
      return give.TrackObject.createCoorTrack(this,
        'coor_' + this.db + '_' + slotName, { pin: slotName })
    }

    initCoordinateTracks (priorityManager) {
      this.coordinateTracks.forEach(track => {
        track.setDefaultSetting(priorityManager.settingString, true)
        track.setSetting(priorityManager.settingString, true)
        if (!priorityManager.hasTrack(track)) {
          priorityManager.addTrack(track, null, null, true)
        }
      })
    }

    createHighlightTrack () {
      return give.TrackObject.createTrack(
        'highlight_' + this.db,
        { localOnly: true }, this, 'highlight', null)
    }

    updateHighlights (highlightArray) {
      this.highlightTrack.clear()
      highlightArray.forEach(
        highlightRegion => this.highlightTrack.insert(highlightRegion))
    }

    initMetaFilter () {
      if (give.mainMetaDataEntries) {
        if (!this._MetaPromise) {
          this._MetaPromise = Promise.all([
            give.mainMetaDataEntries.DataPromise,
            this._chromInfoPromise,
            this.initTracks()
          ]).then(dataArr => this.fillMetaFilter(dataArr[0]))
        }
        return this._MetaPromise
      } else {
        return Promise.reject(
          new give.GiveError('No main meta data entries available!')
        )
      }
    }

    initPriorityManager (priorityManager, defaultIdList, groupIdList) {
      // clear previous track priority values and overwrite with new ones
      defaultIdList = defaultIdList || priorityManager._defaultTrackIdList
      groupIdList = groupIdList || priorityManager._groupIdList
      if (priorityManager instanceof give.PriorityManager) {
        if (Array.isArray(defaultIdList)) {
          return this._applyDefaultIdList(priorityManager, defaultIdList)
        } else {
          priorityManager.clear()
          if (Array.isArray(groupIdList)) {
            this._applyGroupIdList(priorityManager, groupIdList)
          }
          return this._applyDefaultSettings(priorityManager)
        }
      }
      return null
    }

    _applyDefaultSettings (priorityManager) {
      // re-enabling coordinate tracks if priorityManager needs to
      if (priorityManager.includeCoordinates) {
        this.initCoordinateTracks(priorityManager)
      }
      this.tracks.forEach(track => {
        if (!(track instanceof give.CoorTrack)) {
          track.resetSetting(priorityManager.settingString)
          if (track.getSetting(priorityManager.settingString)) {
            priorityManager.addTrack(track)
          }
        } 
      })
      return priorityManager
    }

    _applyDefaultIdList (priorityManager, idList) {
      // clear previous track priority values and overwrite with new ones
      priorityManager.clear()
      // set all tracks to non-visible (or whatever settingString specifies)
      this.tracks.forEach(
        track => {
          track.setDefaultSetting(priorityManager.settingString, false)
          track.setSetting(priorityManager.settingString, false)
        }
      )
      // re-enabling coordinate tracks if priorityManager needs to
      if (priorityManager.includeCoordinates) {
        this.initCoordinateTracks(priorityManager)
      }
      // set tracks matching the list to visible
      // (or whatever settingString specifies)
      idList.forEach(id => {
        if (this.tracks.hasTrack(id)) {
          let track = this.tracks.get(id)
          track.setDefaultSetting(priorityManager.settingString, true)
          track.setSetting(priorityManager.settingString, true)
          priorityManager.addTrack(track)
        }
      })
      return priorityManager
    }

    _applyGroupIdList (priorityManager, idList) {
      // This is done in a sort-of reversed way: groups that are NOT SELECTED
      // will have their tracks toggled to hidden

      // set tracks matching the list to visible
      // (or whatever settingString specifies)
      for (let groupID in this.groups) {
        if (this.groups.hasOwnProperty(groupID)) {
          if (idList.indexOf(groupID) < 0) {
            // group not there
            this.groups[groupID].forEach(track => {
              track.setDefaultSetting(priorityManager.settingString, false)
              track.setSetting(priorityManager.settingString, false)
              if (priorityManager.hasTrack(track)) {
                priorityManager.removeTrack(track)
              }
            })
          }
        }
      }
      return priorityManager
    }

    addCustomTrack (track, group, callback) {
      // if group ID is not specified, use "customTracks" as ID;
      // replace tracks with the same groupID and track.tableName
      group = group || {}
      let groupID = group.id || 'customTracks'
      if (!this.groups.hasOwnProperty(groupID)) {
        this.groups[groupID] = this.constructor.createCustomGroup(group)
      }
      // remove existing track
      if (this.groups[groupID].hasTrack(track.tableName)) {
        this.groups[groupID].removeTrack(track.tableName)
        this.tracks.removeTrack(track.tableName)
      }
      let newTrack = new give.TrackObject(track.tableName, track, this, groupID)
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
      this.tracks.forEach(track => {
        if (!(track instanceof give.CoorTrack)) {
          let cellType = track.getSetting('cellType')
          let labName = track.getSetting('labName')
          let tissueType = metaEntries.findMeta(
            this.commonName, cellType, 'tissue'
          )
          if (track.cleanLowerTitle) {
            if (!this.metaFilter.expMap.hasOwnProperty(track.cleanLowerTitle)) {
              this.metaFilter.expMap[track.cleanLowerTitle] = []
              this.metaFilter.expMap[track.cleanLowerTitle].name = track.title
            }
            this.metaFilter.expMap[track.cleanLowerTitle].push(track.id)
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
        }
      })
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
      return this.getFilteredTrackList(filter).reduce(
        (list, track) => list.concat(track.tableNames),
        []
      )
    }

    static initAllRefFromServer (target, filter) {
      return give.postAjax(target || this.initAllTarget, {}, 'json')
        .then(data => this.initAllRef(data, filter))
    }

    static initAllRef (data, filter) {
      // initialize all refObj from db
      // return an array of refObj
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
      for (let refDb in data) {
        if (data.hasOwnProperty(refDb) &&
          (typeof filter !== 'function' || filter(data[refDb]))
        ) {
          this.refArray.dbMap[refDb] = new this(
            refDb, data[refDb].name,
            data[refDb].commonname,
            data[refDb].encode, data[refDb].chromInfo,
            data[refDb].settings)
          this.refArray.push(this.refArray.dbMap[refDb])
        }
      }
      this.refArray.selected = null
      return this.refArray
    }

    static createCustomGroup (group) {
      group = group || {}
      let groupID = group.id || 'customTracks'
      group.label = group.label || 'Custom Tracks'
      group.priority = group.priority || give.TrackGroup.CUSTOM_GROUP_PRIORITY
      return new give.TrackGroup(groupID, group)
    }

    static findRefByDb (db) {
      if (typeof db === 'string' && !this.refArray) {
        // not ready yet, push to task scheduler
        throw (new give.GiveError('refArray is not initialized yet! Please ' +
          'use GIVe.RefObject.allRefPromise.then() to wrap your function.'))
      } else {
        if (typeof db === 'string' &&
          this.refArray.dbMap.hasOwnProperty(db)) {
          // look up reference in give.RefObject.refArray
          return this.refArray.dbMap[db]
        } else if (db instanceof this) {
          return db
        } else {
          throw (new give.GiveError('Invalid RefObject was given: ' + db))
        }
      }
    }
  }

  RefObject.refFilter = give.Ref_RefFilter ||
    (refObj => (
      refObj.settings.isGIVeEnabled ||
      refObj.settings.isGIVEEnabled ||
      refObj.settings.browserActive
    ))
  RefObject.DEFAULT_SETTING_STRING = 'visibility'
  RefObject.DEFAULT_SLOT_NAME = 'scroll'
  RefObject.DEFAULT_COORDINATE_SLOT_NAME = 'top'

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

  RefObject.allRefPromise = RefObject.initAllRefFromServer()

  give.RefObject = RefObject

  return give
})(GIVe || {})
