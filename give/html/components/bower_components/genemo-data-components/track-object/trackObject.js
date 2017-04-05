// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  give.TrackObject = function (ID, Settings, ref) {
    this.id = ID
    Settings = Settings || {}
    // collapse settings object first
    //  (properties in Settings.settings takes precedence)
    if (Settings.settings) {
      Settings = Object.assign(Settings, Settings.settings)
      delete Settings.settings
    }

    this.Settings = Object.assign({}, Settings)
    this.defaultSettings = Settings
    this._initSettings()

    this.ref = ref

    this.getDataJobName = this.getID() + '_GETDATA'
    this.getDataDebounceInt = 200
    this.pendingGUIRangesFromID = {}
    this.pendingQueryRegions = {regions: [], resolutions: []}
    this.data = {}

    this._callbackArray = []
    this._callbackFuncs = {}

    this.isRetrivingData = false
  }

  give.TrackObject.prototype._initSettings = function () {
    this.priority = this.getSetting('priority') || give.TrackObject.DEFAULT_PRIORITY
    if (this.getSetting('visibility')) {
      this.setVisibility(this.getSetting('visibility'))
    } // otherwise leave it to DOM

    if (this.getSetting('requestUrl')) {
      this.requestUrl = this.getSetting('requestUrl')
    }

    if (this.getSetting('isCustom')) {
      this.isCustom = true
      if (this.getSetting('localFile')) {
        // should be a File Object (extension of Blob)
        this.localFile = this.getSetting('localFile')
      } else if (this.getSetting('remoteUrl')) {
        // should be a URL
        this.remoteFile = this.getSetting('remoteUrl')
      }
    }
  }

  give.TrackObject.prototype.getTitle = function () {
    // generate this.title (previously done by UCSC Browser core)
    if (this.getSetting('groupDataType')) {
      return this.getSetting('groupDataType') +
        (this.getSetting('groupFeature') ? ' (' + this.getSetting('groupFeature') + ')' : '')
    } else if (this.getSetting('trackDataType')) {
      return this.getSetting('trackDataType') +
        (this.getSetting('trackFeature') ? ' (' + this.getSetting('trackFeature') + ')' : '')
    }
    return ''
  }

  give.TrackObject.prototype.getTableNames = function () {
    // this is used to shield "super" tracks in the future
    return this.getSetting('track')
  }

  give.TrackObject.prototype.getCleanLowerTitle = function () {
    // generate this.title (previously done by UCSC Browser core)
    return this.getTitle().replace(/[\s-]+/g, '').toLowerCase()
  }

  give.TrackObject.prototype.getUcscVis = function () {
    switch (this.getSetting('visibility')) {
      case give.TrackObject.StatusEnum.VIS_FULL:
        return 'full'
      case give.TrackObject.StatusEnum.VIS_DENSE:
        return 'dense'
      case give.TrackObject.StatusEnum.VIS_PACK:
        return 'pack'
      case give.TrackObject.StatusEnum.VIS_COLLAPSED:
        return 'collapsed'
      case give.TrackObject.StatusEnum.VIS_NOTEXT:
        return 'notext'
      default:
        return 'hide'
    }
  }

  give.TrackObject.prototype.setSetting = function (key, value) {
//    if(this.Settings.hasOwnProperty(key)) {
//      delete this.Settings[key];
//    }
    if (key === 'visibility') {
      this.setVisibility(value)
    } else {
      this.Settings[key] = value
    }
  }

  give.TrackObject.prototype.resetSetting = function (key) {
    if (this.defaultSettings.hasOwnProperty(key)) {
      this.setSetting(key, this.defaultSettings[key])
    } else {
      delete this.Settings[key]
    }
  }

  give.TrackObject.prototype.resetAllSettings = function () {
    this.Settings = Object.assign({}, this.defaultSettings)
    this._initSettings()
  }

  give.TrackObject.prototype.getSetting = function (key) {
//    if(!this.Settings.settings.hasOwnProperty(key)) {
//      if(this.Settings.hasOwnProperty(key)) {
//        this.Settings.settings[key] = this.Settings[key];
//      }
//    }
//    delete this.Settings[key];
    return this.Settings[key]
  }

  give.TrackObject.prototype.setVisibility = function (vis) {
    // if vis === false, then save old visibility
    if (typeof vis === 'boolean') {
      if (!vis) {
        // needs to save current visibility
        this.oldVisibility = this.oldVisibility || this.getSetting('visibility')
        this.Settings['visibility'] = give.TrackObject.StatusEnum.VIS_NONE
      } else {
        this.Settings['visibility'] = this.oldVisibility ||
          give.TrackObject.StatusEnum.VIS_FULL
        delete this.oldVisibility
      }
    } else if (typeof vis === 'number') {
      // is visibility value
      if (vis === give.TrackObject.StatusEnum.VIS_NONE) {
        // needs to save current visibility
        this.oldVisibility = this.oldVisibility || this.getSetting('visibility')
      } else {
        delete this.oldVisibility
      }
      this.Settings['visibility'] = vis
    } else if (typeof vis === 'string') {
      switch (vis.toLowerCase()) {
        case 'dense':
          this.Settings['visibility'] = give.TrackObject.StatusEnum.VIS_DENSE
          break
        case 'full':
          this.Settings['visibility'] = give.TrackObject.StatusEnum.VIS_FULL
          break
        case 'hide':
          this.Settings['visibility'] = give.TrackObject.StatusEnum.VIS_NONE
          break
        case 'pack':
          this.Settings['visibility'] = give.TrackObject.StatusEnum.VIS_PACK
          break
        case 'collapsed':
          this.Settings['visibility'] = give.TrackObject.StatusEnum.VIS_COLLAPSED
          break
        case 'notext':
          this.Settings['visibility'] = give.TrackObject.StatusEnum.VIS_NOTEXT
          break
        default:
      }
    } else if (typeof vis === 'undefined' || vis === null) {
      // use as toggle switch
      this.setVisibility(!this.getSetting('visibility'))
    }
  }

  // getInfo: function() {
  //  return "<td>" + this.info.replace(/\t/g, "</td>\n<td>") + "</td>";
  // };
  //
  // getInfoString: function() {
  //  return this.info.replace(/\t/g, ' - ');
  // };
  //
  give.TrackObject.prototype.getID = function () {
    return this.id
  }

  give.TrackObject.prototype.getReadableID = function () {
    return this.getID().replace(/_+/g, ' ')
  }

  give.TrackObject.prototype.getType = function () {
    return this.getSetting('type')
  }

  give.TrackObject.prototype.getTypeTrunk = function () {
    return this.getSetting('type').split(/\s+/, 2)[0].toLowerCase()
  }

  give.TrackObject.prototype.getCleanID = function () {
    // remove blanks and brackets in IDs to conform to HTML 4.1
    return this.getID().replace(/[\s()+/]/g, '')
  }

  give.TrackObject.prototype.getPriority = function () {
    // TODO:
    //  1. implement group priority
    //   2. implement customized temporary priority
    return this.priority
  }

  give.TrackObject.prototype.mergeGUIRegionsByResolution = function () {
    // this is to generate a single array of ChromRegions, separated by resolution
    var mergedGUIRanges = []
    mergedGUIRanges.resolutions = []
    for (var callerID in this.pendingGUIRangesFromID) {
      if (this.pendingGUIRangesFromID.hasOwnProperty(callerID)) {
        for (var i = 0; i < this.pendingGUIRangesFromID[callerID].length; i++) {
          var GUIRange = this.pendingGUIRangesFromID[callerID][i]
          var GUIResolution = this.pendingGUIRangesFromID[callerID].resolutions[i]
          var j = 0

          while (j < mergedGUIRanges.length &&
             (mergedGUIRanges[j].chr < GUIRange.chr ||
              (mergedGUIRanges[j].chr === GUIRange.chr &&
               mergedGUIRanges[j].getEnd() <= GUIRange.getStart()))) {
            j++
          }

          while (j < mergedGUIRanges.length && GUIRange &&
              GUIRange.overlaps(mergedGUIRanges[j])) {
            // needs to determine which one should take the resolution
            var queryRange = mergedGUIRanges[j]
            var queryResolution = mergedGUIRanges.resolutions[j]
            if (typeof GUIResolution !== 'number' ||
               (typeof queryResolution === 'number' &&
              GUIResolution < queryResolution)) {
              // GUI has smaller resolution
              if (queryRange.getStart() < GUIRange.getStart()) {
                if (queryRange.getEnd() > GUIRange.getEnd()) {
                  // queryRange is split into two
                  var newQueryRange = queryRange.clone()
                  newQueryRange.start = GUIRange.getEnd()
                  mergedGUIRanges.splice(j + 1, 0, newQueryRange)
                  mergedGUIRanges.resolutions.splice(j + 1, 0, queryResolution)
                }
                queryRange.end = GUIRange.getStart()
              } else {
                if (queryRange.getEnd() <= GUIRange.getEnd()) {
                  // queryRange is completely covered by GUIRange,
                  //    remove queryRange
                  mergedGUIRanges.splice(j, 1)
                  mergedGUIRanges.resolutions.splice(j, 1)
                } else {
                  // queryRange has something at the end
                  queryRange.start = GUIRange.getEnd()
                }
                j--
              }
            } else if (typeof GUIResolution !== 'number' ||
               (typeof queryResolution === 'number' &&
              GUIResolution < queryResolution)) {
              // query has smaller resolution
              if (queryRange.getStart() <= GUIRange.getStart()) {
                if (queryRange.getEnd() >= GUIRange.getEnd()) {
                  // queryRange completely covers GUIRange
                  // remove GUIRange
                  GUIRange = null
                } else {
                  // GUIRange still has something at the end
                  GUIRange.start = queryRange.getEnd()
                }
              } else {
                if (queryRange.getEnd() < GUIRange.getEnd()) {
                  // GUIRange will be split into two
                  // push the earlier GUIRange into mergedGUIRanges
                  var newGUIRange = GUIRange.clone()
                  newGUIRange.end = queryRange.getStart()
                  mergedGUIRanges.splice(j, 0, newGUIRange)
                  mergedGUIRanges.resolutions.splice(j, 0, GUIResolution)
                } else {
                  // queryRange has something at the end
                  GUIRange.end = queryRange.getStart()
                  j--
                }
              }
            } else {
              // same resolution, merge the region
              GUIRange.assimilate(queryRange)
              mergedGUIRanges.splice(j, 1)
              mergedGUIRanges.resolutions.splice(j, 1)
            }
            j++
          }

          mergedGUIRanges.splice(j, 0, GUIRange)
          mergedGUIRanges.resolutions.splice(j, 0, GUIResolution)
        }
      }
    }

    give._verboseConsole(mergedGUIRanges, give.VERBOSE_DEBUG)

    return mergedGUIRanges
  }

  give.TrackObject.prototype.getTrackUncachedRange = function () {
    // check whether buffer needs to be updated
    // notice that chrRanges should be an ordered, non-overlapping array of ChromRegionObject
    this.pendingQueryRegions = {regions: [], resolutions: []}
    var mergedGUIRanges = this.mergeGUIRegionsByResolution()
    if (!this.isPureLocal && mergedGUIRanges && Array.isArray(mergedGUIRanges)) {
      mergedGUIRanges.forEach(function (chrRange, index) {
        if (this.data[chrRange.chr] && this.data[chrRange.chr].getUncachedRange) {
          var uncachedRanges =
            this.data[chrRange.chr].getUncachedRange(chrRange,
                                 mergedGUIRanges.resolutions[index])
          this.pendingQueryRegions.regions = this.pendingQueryRegions.regions.concat(uncachedRanges)
          this.pendingQueryRegions.resolutions = this.pendingQueryRegions.resolutions.concat(
            (new Array(uncachedRanges.length)).fill(
              typeof mergedGUIRanges.resolutions[index] === 'number'
                ? mergedGUIRanges.resolutions[index] / give.TrackObject.RESOLUTION_BUFFER_RATIO
                : mergedGUIRanges.resolutions[index]))
        } else {
          this.pendingQueryRegions.regions.push(chrRange)
          this.pendingQueryRegions.resolutions.push(
            typeof mergedGUIRanges.resolutions[index] === 'number'
              ? mergedGUIRanges.resolutions[index] / give.TrackObject.RESOLUTION_BUFFER_RATIO
              : mergedGUIRanges.resolutions[index])
        }
      }, this)
    }
    // this.pendingQueryRegions will be the regions fed into Chrom B+ Tree
    return this.pendingQueryRegions
  }

  give.TrackObject.prototype._prepareRemoteQuery = function (regions, resolutions) {
    // provide data to mainAjax
    // for most of the tracks, this is only trackID and window
    if (this.isCustom) {
      return {
        db: this.ref.db,
        type: this.getTypeTrunk(),
        remoteURL: this.remoteFile,
        window: regions.map(function (region) {
          return region.regionToString(false)
        }, this),
        resolutions: Array.isArray(resolutions) ? {
          resolutions: resolutions
        } : null,
        isCustom: true
      }
    } else {
      return {
        db: this.ref.db,
        type: this.getTypeTrunk(),
        trackID: this.getID(),
        window: regions.map(function (region) {
          return region.regionToString(false)
        }, this),
        params: Array.isArray(resolutions) ? {
          resolutions: resolutions
        } : null
      }
    }
  }

  give.TrackObject.prototype._prepareCustomQuery = function () {
    // provide data to custom track query
    // for most of the tracks, this is only window (does not need to stringify)
    return this.pendingQueryRegions
  }

  give.TrackObject.prototype.getData = function (ranges, resolutions, callback, callerID) {
    // this is the interface exposed to the DOM object
    // DOM will call getData to see if data needs to be retrieved
    // callback will be the function from DOM object

    // data handling will be done locally (in TrackObject here)

    // first merge ranges currently being debounced

    if (this.isRetrivingData) {
      this._addCallback(this.getData.bind(this, ranges, resolutions, callback, callerID))
      return true
    }

    callerID = callerID || give.TrackObject.NO_CALLERID_KEY

    if (!Array.isArray(ranges)) {
      ranges = [ranges]
    }
    if (!Array.isArray(resolutions)) {
      resolutions = (new Array(ranges.length)).fill(resolutions)
    }

    this.pendingGUIRangesFromID[callerID] = ranges
    this.pendingGUIRangesFromID[callerID].resolutions = resolutions

    this.getTrackUncachedRange()
    if (callback) {
      this._addCallback(callback, callerID)
    }
    if (this.pendingQueryRegions.regions.length > 0) {
      give.debounce(this.getDataJobName,
              this._retrieveData.bind(this, this.pendingQueryRegions.regions,
                         this.pendingQueryRegions.resolutions),
              this.getDataDebounceInt)
    } else {
      if (give.isDebouncerActive(this.getDataJobName)) {
        give.cancelDebouncer(this.getDataJobName)
      }
      this.pendingGUIRangesFromID = {}
      this._clearCallback(true)
    }
    // return whether data is actually being retrieved (maybe unnecessary?)
    return (this.pendingQueryRegions.regions.length > 0)
  }

  give.TrackObject.prototype._clearCallback = function (execute) {
    while (this._callbackArray.length > 0) {
      var callback = this._callbackFuncs[this._callbackArray.shift()]
      if (execute) {
        callback()
      }
    }
    this._callbackFuncs = {}
  }

  give.TrackObject.prototype._addCallback = function (callback, callbackID) {
    callbackID = callbackID || give.TrackObject._getDataQueueCallbackID + this._callbackArray.length
    if (!this._callbackFuncs.hasOwnProperty(callbackID)) {
      this._callbackArray.push(callbackID)
    }
    this._callbackFuncs[callbackID] = callback
  }

  give.TrackObject.prototype._retrieveData = function (regions, resolutions) {
    // directly from request URL
    // use iron-ajax to submit request directly
    // customized components are used in data preparation and data handler
    // use dataHandler(e, detail) as return handler
    // callback is in case update is needed
    // remoteQuery is already prepared or can be provided by regions

    if (regions && regions.length > 0) {
      if (this.isCustom && this.localFile) {
        // if track has its own getLocalData function, then get local data instead of getting remote data
        this.getReadLocalFile().call(this, this.localFile,
                       this._prepareCustomQuery(regions, resolutions))
        // afterwards it's this.dataHandler()'s job.
      } else if (this.requestUrl) {
        this.isRetrivingData = true
        give.postAjax(this.requestUrl, this._prepareRemoteQuery(regions, resolutions),
                this.responseHandler, 'json', null, null, this)
      }
    } else {
      // nothing really needs to be done to get data, so just call callback function
      this._clearCallback(true)
    }
  }

  give.TrackObject.prototype.getDataHandler = function () {
    if (give.TrackObjectImpl.hasOwnProperty(this.getTypeTrunk())) {
      return give.TrackObjectImpl[this.getTypeTrunk()].DataHandler.bind(this)
    } else {
      return give.TrackObjectImpl._default.DataHandler.bind(this)
    }
  }

  give.TrackObject.prototype.GetSummaryCtor = function () {
    if (give.TrackObjectImpl.hasOwnProperty(this.getTypeTrunk())) {
      return give.TrackObjectImpl[this.getTypeTrunk()].SummaryCtor
    } else {
      return give.TrackObjectImpl._default.SummaryCtor
    }
  }

  give.TrackObject.prototype.GetDataStructure = function () {
    if (give.TrackObjectImpl.hasOwnProperty(this.getTypeTrunk()) &&
      give.TrackObjectImpl[this.getTypeTrunk()].DataStructure) {
      return give.TrackObjectImpl[this.getTypeTrunk()].DataStructure
    } else {
      return give.TrackObjectImpl._default.DataStructure
    }
  }

  give.TrackObject.prototype.getReadLocalFile = function () {
    if (give.TrackObjectImpl.hasOwnProperty(this.getTypeTrunk())) {
      return function (localFile, regions) {
        give.TrackObjectImpl[this.getTypeTrunk()].LocalFileHandler.call(this, localFile, regions)
        this._clearCallback(true)
      }.bind(this)
    } else {
      return function (localFile, regions) {
        give.TrackObjectImpl._default.LocalFileHandler.call(this, localFile, regions)
        this._clearCallback(true)
      }.bind(this)
    }
  }

  give.TrackObject.prototype.readRemoteFile = function (URL, query, callback) {
    // placeholder to read remote URL
    // query is the current window (may involve buffering, can be implemented in _prepareCustomQuery)
    // data will be passed via firing a 'response' event with {detail: data}
    // and the response will be handled by this.responseHandler(e, detail)
    //
    // Notice that to achieve this, CORS needs to be enabled on target server
    // The fallback method is going through GeNemo server as a proxy
    return false
  }

  give.TrackObject.prototype.responseHandler = function (response) {
    // notice that this will do some preparation works:
    //  1. If this.data does not contain a Chrom B+ Tree for chrom, add one;
    //  2. Enumerate all res.chrom to run this.getDataHandler()
    //  3. TODO: Add cache purging stuff in the future
    for (var chrom in response) {
      if (response.hasOwnProperty(chrom) &&
         this.ref.chromInfo.hasOwnProperty(chrom) &&
         Array.isArray(response[chrom])) {
        if (!this.data.hasOwnProperty(chrom)) {
          this.data[chrom] = new (this.GetDataStructure())(this.ref.chromInfo[chrom].chrRegion.start,
                                 this.ref.chromInfo[chrom].chrRegion.end,
                                 this.GetSummaryCtor())
        }
      }
    }
    this.getDataHandler()(response, this.data,
                this.pendingQueryRegions.regions,
                this.pendingQueryRegions.resolutions)
    this.pendingQueryRegions = {regions: [], resolutions: []}
    this.pendingGUIRangesFromID = {}
    this.isRetrivingData = false
    this._clearCallback(true)
  }

  give.TrackObject.StatusEnum = {
    VIS_FULL: 5,
    VIS_NONE: 0,
    VIS_PACK: 4,
    VIS_COLLAPSED: 3,      // this is for gene track only, will collapse overlapping transcripts
    VIS_NOTEXT: 2,        // this is for gene track only, will remove all texts
    VIS_DENSE: 1
  }

  give.TrackObject.DEFAULT_PRIORITY = 100.0
  give.TrackObject.NO_CALLERID_KEY = '_giveNoCallerID'
  give.TrackObject.fetchDataTarget = give.host +
    (give.Trk_FetchDataTarget || '/givdata/getTrackData.php')
  give.TrackObject.fetchCustomTarget = give.host +
    (give.Trk_FetchCustomTarget || '/givdata/getTrackData.php')
  give.TrackObject._getDataQueueCallbackID = 'GETDATA_QUEUE_'

  give.TrackObject.RESOLUTION_BUFFER_RATIO = 2.0

  give.TrackObject.createCoorTrack = function (ref, id) {
    var newTrack = new give.TrackObject(id || 'coor_' + ref.db,
      { type: 'coordinate', priority: 0, isPureLocal: true }, ref)
    newTrack.setSetting('type', 'coordinate')
    newTrack.priority = 0
    newTrack.isPureLocal = true
    return newTrack
  }

  give.TrackObject.comparePriorities = function (track1, track2, groups) {
    // compare group priorities first, then local priorities
    // tracks without groups will be considered as top priority (for now)
    var group1Prior = 0
    var group2Prior = 0
    try {
      group1Prior = groups[track1.groupID].priority
    } catch (e) {
    }
    try {
      group2Prior = groups[track2.groupID].priority
    } catch (e) {
    }
    return group1Prior !== group2Prior
      ? (group1Prior < group2Prior ? -1 : 1)
      : (track1.getPriority() < track2.getPriority() ? -1
        : track1.getPriority() > track2.getPriority() ? 1 : 0)
  }

  return give
})(GIVe || {})
