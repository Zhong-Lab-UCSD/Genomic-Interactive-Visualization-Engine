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
   * @property {OakTreeLiteral|PineTreeLiteral} data - The data structure, an
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
    this.data = {}
    this.noData = this.parent.getSetting('noData')

    this._callbackMgr = new give.CallbackManager(
      give.TrackDataObject._getDataQueueCallbackID
    )

    this.isRetrivingData = false
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
            if (typeof queryRange.resolution === 'number' &&
              (typeof GUIRange.resolution !== 'number' ||
                GUIRange.resolution < queryRange.resolution
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
            } else if (typeof GUIRange.resolution === 'number' &&
              (typeof queryRange.resolution !== 'number' ||
                queryRange.resolution < GUIRange.resolution
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
    if (!this.noData && mergedGUIRanges && Array.isArray(mergedGUIRanges)) {
      mergedGUIRanges.forEach(function (chrRange, index) {
        if (!this.data.hasOwnProperty(chrRange.chr)) {
          this.data[chrRange.chr] = new this._DataStructure(
            this.parent.ref.chromInfo[chrRange.chr].chrRegion.start,
            this.parent.ref.chromInfo[chrRange.chr].chrRegion.end,
            this._SummaryCtor)
        }
        if (this.data[chrRange.chr].getUncachedRange) {
          var uncachedRanges = this.data[chrRange.chr].getUncachedRange(
            chrRange, null, give.TrackDataObject.RESOLUTION_BUFFER_RATIO)
          totalUncachedRanges = totalUncachedRanges.concat(uncachedRanges)
        } else {
          chrRange.resolution = typeof chrRange.resolution === 'number'
            ? chrRange.resolution / give.TrackDataObject.RESOLUTION_BUFFER_RATIO
            : chrRange.resolution
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
      return region.resolution
    }

    if (this.isCustom) {
      return {
        db: this.parent.ref.db,
        type: this.getTypeTrunk(),
        remoteURL: this.remoteFile,
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
        type: this.getTypeTrunk(),
        trackID: this.getID(),
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
   * getData - Get data from this TrackDataObject.
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
  give.TrackDataObject.prototype.getData = function (ranges, callback, callerID) {
    if (!this.noData) {
      if (this.isRetrivingData) {
        this._callbackMgr.add(this.getData.bind(this, ranges, callback, callerID))
        return true
      }

      callerID = callerID || give.TrackDataObject._NO_CALLERID_KEY

      if (!Array.isArray(ranges)) {
        ranges = [ranges]
      }
      give._verboseConsole('getData()', give.VERBOSE_DEBUG)
      give._verboseConsole(ranges.map(function (range) { return range.regionToString() }), give.VERBOSE_DEBUG)

      this._unmergedGUIRangesFromID[callerID] = ranges

      if (callback) {
        this._callbackMgr.add(callback, callerID)
      }
      give.debounce(this._getDataJobName,
              this._queryAndRetrieveData.bind(this),
              this.getDataDebounceInt)
    } else if (callback) {
      this._callbackMgr.add(callback, callerID)
      this._callbackMgr.clear(true)
    }
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
   *   `this.isCustom` and `this.localFile`)
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

    if (this.isCustom && this.localFile) {
      // if track has its own getLocalData function, then get local data instead of getting remote data
      this._readLocalFile(regions)
      // afterwards it's this.dataHandler()'s job.
    } else if (this.requestUrl) {
      give.postAjax(this.requestUrl, this._prepareRemoteQuery(regions),
              this._responseHandler, 'json', null, null, this)
    }
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
    for (var chrom in response) {
      if (response.hasOwnProperty(chrom) &&
         this.parent.ref.chromInfo.hasOwnProperty(chrom) &&
         Array.isArray(response[chrom])) {
        if (!this.data.hasOwnProperty(chrom)) {
          this.data[chrom] = new this._DataStructure(
            this.parent.ref.chromInfo[chrom].chrRegion.start,
            this.parent.ref.chromInfo[chrom].chrRegion.end,
            this._SummaryCtor)
        }
      }
    }
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

  // Static members for give.TrackDataObject
  // URLs for data retrieval
  /**
   * @property {string} fetchDataTarget - The URL to fetch remote data.
   * @static
   */
  give.TrackDataObject.fetchDataTarget = give.host +
    (give.Trk_FetchDataTarget || '/givdata/getTrackData.php')

  /**
   * @property {string} fetchCustomTarget - The URL to fetch custom track data.
   * @static
   */
  give.TrackDataObject.fetchCustomTarget = give.host +
    (give.Trk_FetchCustomTarget || '/givdata/getTrackData.php')

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
  give.TrackDataObject.RESOLUTION_BUFFER_RATIO = 1.5

  /**
   * @property {number} DEFAULT_DEBOUNCE_INTERVAL - The default values for
   *   debounce interval (in milliseconds) between `getData()` calls.
   * @static
   */
  give.TrackDataObject.DEFAULT_DEBOUNCE_INTERVAL = 200

  /**
   * **************************************************************************
   * The following are implementations for the data components of
   *   individual tracks.
   * To implement tracks for any new type, override the following methods to
   *   process the data being implemented.
   * Please refer to implementations under `impl/` for examples.
   * **************************************************************************
   */

  /**
   * _dataHandler - This should be the detailed implementation about how to
   *   handle the responses from server
   *
   * @memberof TrackDataObjectBase.prototype
   * @param  {object} response - The response from server, see
   *   `this._responseHandler`
   * @param  {Array<ChromRegionLiteral>} regions - Query regions, including
   *   potential resolutions
   */
  give.TrackDataObject.prototype._dataHandler = function (response, queryRegions) {
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
  give.TrackDataObject.prototype._localFileHandler = function (localFile, regions) {
  }

  /**
   * _SummaryCtor - Constructor of summary data
   * @constructor
   * @memberof TrackDataObjectBase.prototype
   */
  give.TrackDataObject.prototype._SummaryCtor = null

  /**
   * _DataStructure - Constructor for underlying data structure used in
   *   `this.data`. Default value is `GIVE.ChromBPlusTree` (OakTree)
   * @constructor
   * @memberof TrackDataObjectBase.prototype
   */
  give.TrackDataObject.prototype._DataStructure = give.ChromBPlusTree

  return give
})(GIVe || {})
