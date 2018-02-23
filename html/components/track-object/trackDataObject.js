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
   * Data structure for a track in GIVE
   * @typedef {object} TrackDataObjectBase
   * @property {TrackObjectBase} parent - Track object as parent
   * @property {string} _getDataJobName - The job name of debouncing purposes
   * @property {number} getDataDebounceInt - Debouncing interval
   * @property {object} _unmergedGUIRangesFromID - Regions requested by GUI elements
   *   that have not been merged yet
   * @property {Array<ChromRegionLiteral>} _pendingQueryRegions - Regions submitted
   *   to requests (remote or local)
   * @property {OakTreeLiteral|PineTreeLiteral} _data - The data structure, an
   *   instance of `this._DataStructure`
   * @property {CallbackManager} _callbackMgr - A `give.CallbackManager` object
   *   that handles all callback operations.
   *
   * @class give.TrackDataObject
   *
   * @constructor
   * @param {TrackObjectBase} parent - The track object parent
   */
  give.TrackDataObject = function (parent) {
    if (!(parent instanceof give.TrackObject)) {
      throw new Error('Parent ' + parent + ' is not a proper GIVE.TrackObject!')
    }
    this.parent = parent

    this._getDataJobName = ((this.parent.getID && this.parent.getID())
      ? this.parent.getID()
      : (Math.random().toString(36) + '0000000').slice(2, 7)) + '_GETDATA'
    this.getDataDebounceInt = this.parent.getSetting('debounceInterval') ||
      give.TrackDataObject.DEFAULT_DEBOUNCE_INTERVAL
    this._unmergedGUIRangesFromID = {}
    this._pendingQueryRegions = []
    this._data = {}

    this._callbackMgr = new give.CallbackManager(
      give.TrackDataObject._getDataQueueCallbackID
    )

    this._initSettings()
    this.isRetrivingData = false
  }

  give.TrackDataObject.prototype.getTrackSetting = function (key) {
    return this.parent.getSetting(key)
  }

  give.TrackDataObject.prototype.setTrackSetting = function (key, value) {
    return this.parent.setSetting(key, value)
  }

  give.TrackDataObject.prototype._initSettings = function () {
    if (!this.getTrackSetting('requestUrl')) {
      this.setTrackSetting('requestUrl', this.getTrackSetting('isCustom')
        ? give.TrackDataObject.fetchCustomTarget
        : give.TrackDataObject.fetchDataTarget)
    }
  }

  /**
   * _mergeGUIRegionsByResolution - merge the ranges submitted to the data object
   * (potentially by different GUI elements, __e.g.__ different view windows) into
   * one single list.
   *
   * The ranges with finer (smaller value) resolution requirements will override
   * the ranges with coarser ones.
   *
   * The result will be a single array of all requested ranges, each with the finest
   * resolution requirement by the GUI element.
   *
   * @memberof TrackDataObjectBase.prototype
   * @param  {Object} unmergedGUIRanges - An `Object` containing all requested
   * `GIVE.ChromRegion`s, the object should have properties named by its requesting
   * GUI element and the value being an `Array` of non-overlapping
   * `GIVE.ChromRegion`s. Resolutions can be provided as the `resolution` property
   * of the `GIVE.ChromRegion` object. For example:
   * ```
   * {
   *   'bigwig_dom_1': [
   *     new GIVE.ChromRegion("chr1:12345-67890", species, {resolution: 100}),
   *     new GIVE.ChromRegion("chr1:123456-789012", species, {resolution: 100})
   *   ]
   * }
   * ```
   * @returns {Array<ChromRegionLiteral>} An ordered array of merged ranges.
   */
  give.TrackDataObject.prototype._mergeGUIRegionsByResolution = function (
    unmergedGUIRanges
  ) {
    // this is to generate a single array of ChromRegions, separated by resolution
    var mergedGUIRanges = []
    for (var callerID in unmergedGUIRanges) {
      if (unmergedGUIRanges.hasOwnProperty(callerID)) {
        for (var i = 0; i < unmergedGUIRanges[callerID].length; i++) {
          var GUIRange = unmergedGUIRanges[callerID][i]
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
            if (typeof queryRange.Resolution === 'number' &&
              (typeof GUIRange.Resolution !== 'number' ||
                GUIRange.Resolution < queryRange.Resolution
              )
            ) {
              // GUI has smaller resolution
              if (queryRange.getStart() < GUIRange.getStart()) {
                if (queryRange.getEnd() > GUIRange.getEnd()) {
                  // queryRange is split into two
                  var newQueryRange = queryRange.clone()
                  newQueryRange.start = GUIRange.getEnd()
                  mergedGUIRanges.splice(j + 1, 0, newQueryRange)
                }
                queryRange.end = GUIRange.getStart()
              } else {
                if (queryRange.getEnd() <= GUIRange.getEnd()) {
                  // queryRange is completely covered by GUIRange,
                  //    remove queryRange
                  mergedGUIRanges.splice(j, 1)
                } else {
                  // queryRange has something at the end
                  queryRange.start = GUIRange.getEnd()
                }
                j--
              }
            } else if (typeof GUIRange.Resolution === 'number' &&
              (typeof queryRange.Resolution !== 'number' ||
                queryRange.Resolution < GUIRange.Resolution
              )
            ) {
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
                  GUIRange.start = queryRange.getEnd()
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
            }
            j++
          }

          if (GUIRange) {
            mergedGUIRanges.splice(j, 0, GUIRange.clone())
          }
        }
      }
    }

    give._verboseConsole(mergedGUIRanges, give.VERBOSE_DEBUG)

    return mergedGUIRanges
  }

  /**
   * _getTrackUncachedRange - get uncached ranges from the data object (Oak tree,
   * Pine tree, etc.)
   *
   * @memberof TrackDataObjectBase.prototype
   * @param  {Array<ChromRegionLiteral>} mergedGUIRanges - An ordered,
   *   non-overlapping list of merged regions, this list can be obtained by
   *   calling `this._mergeGUIRegionsByResolution()`.
   * @returns {Array<ChromRegionLiteral>} The list with cached regions removed
   */
  give.TrackDataObject.prototype._getTrackUncachedRange = function (mergedGUIRanges) {
    var totalUncachedRanges = []
    if (mergedGUIRanges && Array.isArray(mergedGUIRanges)) {
      mergedGUIRanges.forEach(function (chrRange, index) {
        if (this.getData(chrRange.chr, true).getUncachedRange) {
          var uncachedRanges = this.getData(chrRange.chr).getUncachedRange(
            chrRange, {
              BufferingRatio: this._getResBufferRatio()
            }
          )
          totalUncachedRanges = totalUncachedRanges.concat(uncachedRanges)
        } else {
          chrRange.Resolution = typeof chrRange.Resolution === 'number'
            ? chrRange.Resolution / this._getResBufferRatio()
            : chrRange.Resolution
          totalUncachedRanges.push(chrRange)
        }
      }, this)
    }
    return totalUncachedRanges
  }

  /**
   * _prepareRemoteQuery - Prepare the remote query object
   *
   * @memberof TrackDataObjectBase.prototype
   * @param  {Array<ChromRegionLiteral>} regions - The array of query regions
   * @returns {object} - The object being fed to the server via AJAX
   */
  give.TrackDataObject.prototype._prepareRemoteQuery = function (regions) {
    // provide data to mainAjax
    // for most of the tracks, this is only trackID and window

    var getRegionRes = function (region) {
      return region.Resolution
    }

    if (this.getTrackSetting('isCustom')) {
      return {
        db: this.parent.ref.db,
        type: this.parent.getTypeTrunk(),
        remoteURL: this.getTrackSetting('remoteUrl'),
        window: regions.map(function (region) {
          return region.regionToString(false)
        }, this),
        params: regions.some(getRegionRes, this) ? {
          resolutions: regions.map(getRegionRes, this)
        } : null
      }
    } else {
      return {
        db: this.parent.ref.db,
        type: this.parent.getTypeTrunk(),
        trackID: this.parent.getID(),
        window: regions.map(function (region) {
          return region.regionToString(false)
        }, this),
        params: regions.some(getRegionRes, this) ? {
          resolutions: regions.map(getRegionRes, this)
        } : null
      }
    }
  }

  /**
   * _prepareCustomQuery - Provide data to custom track query.
   *   for most of the tracks, this is only window (does not need to stringify)
   *
   * @memberof TrackDataObjectBase.prototype
   * @returns {Array<ChromRegionLiteral>} The array of query regions
   */
  give.TrackDataObject.prototype._prepareCustomQuery = function () {
    return this._pendingQueryRegions
  }

  /**
   * fetchData - Get data from this TrackDataObject.
   *   GUI elements will call this function to see if data in cache need to be
   *   retrieved, and queue a callback function once data are ready.
   *   Multiple consecutive calls will be collapsed together to reduce
   *   computational burden.
   *
   * @memberof TrackDataObjectBase.prototype
   * @param  {Array<ChromRegionLiteral>|ChromRegionLiteral} ranges - The range to
   *   be queried
   * @param  {function} callback - Callback function after the data are ready
   * @param  {string} callerID - ID of the caller elements, to group consecutive
   *   calls together
   */
  give.TrackDataObject.prototype.fetchData = function (ranges, callback, callerID) {
    if (this.isRetrivingData) {
      this._callbackMgr.add(this.fetchData.bind(this, ranges, callback, callerID))
      return true
    }

    callerID = callerID || give.TrackDataObject._NO_CALLERID_KEY

    if (!Array.isArray(ranges)) {
      ranges = [ranges]
    }
    give._verboseConsole('fetchData()', give.VERBOSE_DEBUG)
    give._verboseConsole(ranges.map(function (range) { return range.regionToString() }), give.VERBOSE_DEBUG)

    this._unmergedGUIRangesFromID[callerID] = ranges

    if (callback) {
      this._callbackMgr.add(callback, callerID)
    }
    give.debounce(this._getDataJobName,
            this._queryAndRetrieveData.bind(this),
            this.getDataDebounceInt)
  }

  /**
   * getData - Get the actual `this._DataStructure` object representing the
   *    underlying data. Underlying data are supposed to be ready when this
   *    method is called.
   * This method can be overriden to accept `null` if needed
   *
   * @param  {string} chrom - The chrom to be requested
   * @param  {boolean} createIfNotExist - if the data structure is not there
   *    for the chromosome, create a new data structure if this is `true`,
   *    throw an exception if this is `false`.
   * @returns {this._DataStructure|null}       the underlying data
   *    (or `null` if no data for the track)
   */
  give.TrackDataObject.prototype.getData = function (chrom, createIfNotExist) {
    if (!this._data || !this._data.hasOwnProperty(chrom)) {
      if (createIfNotExist) {
        this._data = this._data || {}
        this._data[chrom] = this._createNewDataStructure(chrom)
      } else {
        throw new Error('Data not ready for track \'' +
          this.parent.getID() + '\'' + ', chromosome \'' + chrom + '\'.')
      }
    }
    return this._data[chrom]
  }

  /**
   * _queryAndRetrieveData - Merge all unmerged query in
   *   `this._unmergedGUIRangesFromID`, filter out the cached
   *   portion, store the results in `this._pendingQueryRegions`,
   *   then proceed with data retrieval
   * @memberof TrackDataObjectBase.prototype
   */
  give.TrackDataObject.prototype._queryAndRetrieveData = function () {
    this.isRetrivingData = true
    this._pendingQueryRegions = this._getTrackUncachedRange(
      this._mergeGUIRegionsByResolution(this._unmergedGUIRangesFromID)
    )
    this._unmergedGUIRangesFromID = {}
    if (this._pendingQueryRegions && this._pendingQueryRegions.length > 0) {
      this._retrieveData(this._pendingQueryRegions)
    } else {
      // nothing really needs to be done to get data, so just call callback function
      this.isRetrivingData = false
      this._callbackMgr.clear(true)
    }
  }

  /**
   * _retrieveData - Retrieve data based on track type (determined by
   *   `this.getTrackSetting('isCustom')` and
   *   `this.getTrackSetting('localFile')`)
   *
   * @memberof TrackDataObjectBase.prototype
   * @param  {Array<ChromRegionLiteral>} regions - Query regions, including
   *   potential resolutions
   */
  give.TrackDataObject.prototype._retrieveData = function (regions) {
    // directly from request URL
    // use iron-ajax to submit request directly
    // customized components are used in data preparation and data handler
    // use dataHandler(e, detail) as return handler
    // callback is in case update is needed
    // remoteQuery is already prepared or can be provided by regions

    if (this.getTrackSetting('isCustom') && this.getTrackSetting('localFile')) {
      // if track has its own getLocalData function, then get local data instead of getting remote data
      this._readLocalFile(regions)
      // afterwards it's this.dataHandler()'s job.
    } else if (this.getTrackSetting('requestUrl')) {
      give.postAjax(this.getTrackSetting('requestUrl'),
        this._prepareRemoteQuery(regions),
        this._responseHandler, 'json', null, null, this)
    }
  }

  /**
   * _createNewDataStructure - create a new data structure and pass in
   *    necessary parameters based on `this`.
   *
   * @param  {string} chrom - chromosomal name of the new data structure.
   * @returns {this._DataStructure} - a new data structure for the chromosome.
   */
  give.TrackDataObject.prototype._createNewDataStructure = function (chrom) {
    return new this._DataStructure(
      this.parent.ref.chromInfo[chrom].chrRegion,
      {
        SummaryCtor: this._SummaryCtor
      }
    )
  }

  /**
   * _getDataStructure - create a new data structure and pass in
   *    necessary parameters based on `this`.
   *
   * @param  {string} chrom - chromosomal name of the new data structure.
   * @returns {this._DataStructure} - current data structure for the chromosome.
   */
  give.TrackDataObject.prototype._getDataStructure = function (chrom) {

  }

  /**
   * _responseHandler - Function used to handle remote responses
   *
   * @memberof TrackDataObjectBase.prototype
   * @param  {object} response - Responses from remote servers.
   *   The object should contain chromosomal names as its
   *   property names, and an array of data entries as the property value.
   *   For example:
   *   ```
   *   {
   *     'chr10': [
   *       {
   *         'genebed': 'chr10 12345 67890 somegene 120 + ...' // BED format
   *         'geneSymbol': 'someSymbol'
   *       },
   *       ...
   *     ]
   *   }
   *   ```
   *   The detailed format requirements will depend on the implementation of
   *   both the server-side code and `this._dataHandler`
   */
  give.TrackDataObject.prototype._responseHandler = function (response) {
    this._dataHandler(response, this._pendingQueryRegions)
    this._pendingQueryRegions.length = 0
    this.isRetrivingData = false
    this._callbackMgr.clear(true)
  }

  /**
   * _readLocalFile - description
   *
   * @memberof TrackDataObjectBase.prototype
   * @param  {Array<ChromRegionLiteral>} regions - Query regions, including
   *   potential resolutions
   */
  give.TrackDataObject.prototype._readLocalFile = function (regions) {
    this._localFileHandler(this.localFile, regions)
    regions.length = 0
    this.isRetrivingData = false
    this._callbackMgr.clear(true)
  }

  /**
   * _readRemoteFile - placeholder to read remote URL
   *
   * @memberof TrackDataObjectBase.prototype
   * @param  {string} URL - The URL of the remote file
   * @param  {Array<ChromRegionLiteral>} query - Query regions, including
   *   potential resolutions
   */
  give.TrackDataObject.prototype._readRemoteFile = function (URL, query) {
    // placeholder to read remote URL
    // query is the current window (may involve buffering, can be implemented in _prepareCustomQuery)
    // data will be passed via firing a 'response' event with {detail: data}
    // and the response will be handled by this._responseHandler(e, detail)
    //
    // Notice that to achieve this, CORS needs to be enabled on target server
    // The fallback method is going through GeNemo server as a proxy
    return false
  }

  /**
   * _getResBufferRatio - get the buffer ratio of resolution
   *
   * @returns {number}  the buffer ratio. For example, 1.2 means the requested
   *    resolution will be 20% finer than needed.
   */
  give.TrackDataObject.prototype._getResBufferRatio = function () {
    return give.TrackDataObject.RESOLUTION_BUFFER_RATIO
  }

  // Static members for give.TrackDataObject
  // URLs for data retrieval
  /**
   * @property {string} fetchDataTarget - The URL to fetch remote data.
   * @static
   */
  give.TrackDataObject.fetchDataTarget = give.Host +
    (give.ServerPath || '/') +
    (give.Trk_FetchDataTarget || 'getTrackData.php')

  /**
   * @property {string} fetchCustomTarget - The URL to fetch custom track data.
   * @static
   */
  give.TrackDataObject.fetchCustomTarget = give.Host +
    (give.ServerPath || '/') +
    (give.Trk_FetchCustomTarget || 'getTrackData.php')

  /**
   * @property {number} _getDataQueueCallbackID - The default values for
   *   prefix for debouncing job names.
   * @static
   */
  give.TrackDataObject._getDataQueueCallbackID = 'GETDATA_QUEUE_'

  /**
   * @property {string} _NO_CALLERID_KEY - Default caller ID if none is provided.
   * @static
   */
  give.TrackDataObject._NO_CALLERID_KEY = '_giveNoCallerID'

  /**
   * @property {number} RESOLUTION_BUFFER_RATIO - The default values for buffer
   *   if data at current resolution is not available.
   * @static
   */
  give.TrackDataObject.RESOLUTION_BUFFER_RATIO = 1.25

  /**
   * @property {number} DEFAULT_DEBOUNCE_INTERVAL - The default values for
   *   debounce interval (in milliseconds) between `fetchData()` calls.
   * @static
   */
  give.TrackDataObject.DEFAULT_DEBOUNCE_INTERVAL = 200

  /**
   * **************************************************************************
   * The following are implementations for the data components of
   *   individual tracks.
   * To implement tracks for any new type, override the following methods to
   *   process the data being implemented.
   * Please refer to implementations under individual track folders for
   *   examples.
   * **************************************************************************
   */

  /**
   * _dataHandler - This should be the detailed implementation about how to
   *    handle the responses from server
   *
   *    When implementing this method, use `this.getData` to get the `GiveTree`
   *    object storing all necessary data corresponding to the correct
   *    chromosome. Then use `.insert` to insert the new data entries.
   *
   *    See documentation for `GIVe.TrackDataObject` for references to
   *    `this.getData`, and `GIVe.GiveTree` for references to `.insert`.
   *
   * @memberof TrackDataObjectBase.prototype
   * @param  {object} response - Responses from remote servers.
   *   The object should contain chromosomal region strings as its
   *   property names, and an array of data entries as the property value.
   *   For example:
   *   ```
   *   {
   *     'chr10:1-1000000': [
   *       <response entry>,
   *       ...
   *     ]
   *   }
   *   ```
   *   See `this._chromEntryFromResponse` for details of `<response entry>`.
   * @param  {Array<ChromRegionLiteral>} queryRegions - Query regions,
   *   including potential resolutions
   */
  give.TrackDataObject.prototype._dataHandler = function (
    response, queryRegions
  ) {
    queryRegions.forEach(function (region, index) {
      if (Array.isArray(response[region.regionToString()])) {
        this.getData(region.chr, true).insert(
          response[region.regionToString()].map(
            this._chromEntryFromResponse, this
          ), region)
      }
    }, this)
  }

  /**
   * _chromEntryFromResponse - convert remote responses into `give.ChromRegion`
   *    entries with actual data.
   *    This is needed because `give.DataNode` takes only `give.ChromRegion`
   *    objects, so if the actual data object __is not a chromosomal region__,
   *    conversion between the data object and a `give.ChromRegion` object will
   *    be needed.
   *    This conversion should match `this._dataFromChromEntry`, which
   *    provides conversion from the other end if needed.
   *
   * @memberof TrackDataObjectBase.prototype
   * @param  {object} entry - Responses from remote servers.
   *   The object should contain chromosomal names as its
   *   property names, and an array of data entries as the property value.
   *   If using the default methods from the base class, all
   *   entries should contain a `regionString` property saying its coverage,
   *   and a `data` object for actual data:
   *   ```
   *   {
   *     'regionString': 'chr10:12345-67890',
   *     'data': { <data_object> }
   *   },
   *   ```
   *   Actual `data` structure will depend on implementations. See
   *   `this._dataFromResponse` for details.
   *
   *   The whole structure of `entry` can be rewritten if
   *   `this._dataFromResponse` or this method is overriden.
   * @returns {ChromRegionLiteral} a `give.ChromRegion` object.
   */
  give.TrackDataObject.prototype._chromEntryFromResponse = function (entry) {
    return new give.ChromRegion(entry.regionString, this.parent.ref,
      { data: ((this._SummaryCtor && this._SummaryCtor.testRespEntry(entry))
        ? this._SummaryCtor.createFromResp(entry, this)
        : this._dataFromResponse(entry))
      })
  }

  /**
   * _dataFromResponse - return the data object from response
   *
   * @param  {object} entry - Responses from remote servers.
   *   The object should contain chromosomal names as its
   *   property names, and an array of data entries as the property value.
   *   If using the default methods from the base class, all
   *   entries should contain a `regionString` property saying its coverage,
   *   and a `data` object for actual data:
   *   ```
   *   {
   *     'regionString': 'chr10:12345-67890',
   *     'data': { <data_object> }
   *   },
   *   ```
   * @returns {object} return the data object.
   */
  give.TrackDataObject.prototype._dataFromResponse = function (entry) {
    return entry.data
  }

  /**
   * _dataFromChromEntry - extract data from `give.ChromRegion`.
   *    This is almost the reverse function of `this._chromEntryFromResponse`
   *
   * @memberof TrackDataObjectBase.prototype
   * @param  {ChromRegionLiteral} dataEntry - the `give.ChromRegion` object to
   *    extract data from.
   * @returns {object|BigWigTrackData._SummaryCtor} either the data object,
   *    or the (properly constructed) summary object from the response.
   */
  give.TrackDataObject.prototype._dataFromChromEntry = function (dataEntry) {
    if (!dataEntry.data) {
      give._verboseConsole('No data in the ChromEntry. Get "' +
        dataEntry.data + '".', give.VERBOSE_DEBUG)
      return null
    }
    return dataEntry.data
  }

  /**
   * _localFileHandler - This should be the detailed implementation about how to
   *   handle local files
   *
   * @memberof TrackDataObjectBase.prototype
   * @param  {string} localFile - Path of the local file
   * @param  {Array<ChromRegionLiteral>} regions - Query regions, including
   *   potential resolutions
   */
  give.TrackDataObject.prototype._localFileHandler = function (
    localFile, regions
  ) {
  }

  /**
   * _SummaryCtor - Constructor of summary data
   * @constructor
   * @memberof TrackDataObjectBase.prototype
   */
  give.TrackDataObject.prototype._SummaryCtor = null

  /**
   * _DataStructure - Constructor for underlying data structure used in
   *   `this._data`. Default value is `GIVE.OakTree`
   * @constructor
   * @memberof TrackDataObjectBase.prototype
   */
  give.TrackDataObject.prototype._DataStructure = give.OakTree

  /**
   * **************************************************************************
   * The following are implementation basis for a summary object if the track
   * needs to support such features.
   * A data summary object will be needed to handle summaries and will be
   * responsible for some basic data operations.
   * **************************************************************************
   */

  /**
   * SummaryCtorBase - Constructor of summary data
   * @constructor
   *
   * @class SummaryCtorBase
   */
  give.SummaryCtorBase = function (node, oldSummary) {
  }

  /**
   * testDataEntry - test whether the response entry is a summary or not.
   *    Because responses may contain raw data or summaries, this is needed
   *    to distinguish the two types.
   *
   * @static
   * @param  {object} entry - the response entry object converted from JSON
   * @returns {boolean} `true` if the response entry is a summary, `false`
   *    otherwise.
   */
  give.SummaryCtorBase.testRespEntry = function (entry) {
  }

  /**
   * createFromResp - create a summary object from a response entry.
   *
   * @static
   * @param  {object} entry - the response entry object converted from JSON
   * @returns {SummaryCtorBase} the properly constructed summary object.
   */
  give.SummaryCtorBase.createFromResp = function (respEntry, trackDataObj) {
    return new this(respEntry.data)
  }

  /**
   * attach - attach the summary itself to a chromosomal region.
   *
   * @param  {ChromRegionLiteral} chrRegion - the chromosomal region to be
   *    attached to.
   * @returns {ChromRegionLiteral} the chromosomal region with summary attached.
   */
  give.SummaryCtorBase.prototype.attach = function (chrRegion) {
    chrRegion.data = this
    return chrRegion
  }

  /**
   * addSummary - add summary data to this summary.
   *    This is mainly used to summarize over a series of summaries.
   *
   * @param  {GiveNonLeafNode} node    - the non-leaf node this summary is for
   * @param  {SummaryCtorBase} summary - the summary to be added
   */
  give.SummaryCtorBase.prototype.addSummary = function (node, summary) {
  }

  /**
   * addData - add raw data entry to this summary
   *    This is mainly used to summarize over raw data entries.
   *
   * @param  {GiveNonLeafNode} node - the non-leaf node this summary is for
   * @param  {object} data - the raw data object to be added
   */
  give.SummaryCtorBase.prototype.addData = function (node, data) {
  }

  /**
   * addDataOrSummary - add summary or raw data to this summary.
   *    This is mainly used to summarize over its children.
   *
   * @param  {GiveNonLeafNode} node - the non-leaf node this summary is for
   * @param  {SummaryCtorBase|object} entry - the data to be added
   */
  give.SummaryCtorBase.prototype.addDataOrSummary = function (node, entry) {
    // entry can be either a summary or actual components
    if (entry instanceof this.constructor) {
      return this.addSummary(node, entry)
    } else {
      return this.addData(node, entry)
    }
  }

  return give
})(GIVe || {})
