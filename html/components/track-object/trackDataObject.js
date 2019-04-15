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
   * @class TrackDataObject
   * @property {TrackObjectBase} parent - Track object as parent
   * @property {number} getDataDebounceInt - Debouncing interval
   * @property {object} _pendingRangesById - Regions requested by GUI elements
   *   that have not been merged yet
   * @property {OakTreeLiteral|PineTreeLiteral} _data - The data structure, an
   *   instance of `this._DataStructure`
   * @property {boolean} localOnly - Whether all data should be stored in
   *   local memory for this track. No additional server fetching or file
   *   loading needed, only do CRUD through internal CRUD api.
   *
   *   Withering will be disabled if `localOnly` is set to `true`, partial
   *   reading is done through regular `traverse()` method and complete
   *   reading is available via `read()`
   *
   *
   * @constructor
   * @param {TrackObjectBase} parent - The track object parent
   */
  class TrackDataObject {
    constructor (parent) {
      if (!(parent instanceof give.TrackObject)) {
        throw new give.GiveError(
          'Parent ' + parent + ' is not a proper GIVE.TrackObject!')
      }
      this._parent = parent

      this._debouncePromise = null
      this._pendingRangesById = {}

      this._fetchPromise = null
      this._ongoingFetchPromise = null
      this._data = {}
      this.localOnly = false

      this._initSettings()
    }

    get parent () {
      return this._parent
    }

    getTrackSetting (key, type) {
      return this.parent.getSetting(key, type)
    }

    setTrackSetting (key, value) {
      return this.parent.setSetting(key, value)
    }

    _initSettings () {
      if (this.getTrackSetting('localOnly')) {
        this.localOnly = true
      } else if (!this.getTrackSetting('requestUrl')) {
        this.setTrackSetting('requestUrl', this.getTrackSetting('isCustom')
          ? this.constructor.fetchCustomTarget
          : this.constructor.fetchDataTarget)
      }
      this.getDataDebounceInt = this.localOnly ? 0
        : (this.parent.getSetting('debounceInterval') ||
          this.constructor.DEFAULT_DEBOUNCE_INTERVAL)
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
    _mergeGUIRegionsByResolution (unmergedGUIRanges) {
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
                 mergedGUIRanges[j].end <= GUIRange.start))) {
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
                if (queryRange.start < GUIRange.start) {
                  if (queryRange.end > GUIRange.end) {
                    // queryRange is split into two
                    var newQueryRange = queryRange.clone()
                    newQueryRange.start = GUIRange.end
                    mergedGUIRanges.splice(j + 1, 0, newQueryRange)
                  }
                  queryRange.end = GUIRange.start
                  j++
                } else {
                  if (queryRange.end <= GUIRange.end) {
                    // queryRange is completely covered by GUIRange,
                    //    remove queryRange
                    mergedGUIRanges.splice(j, 1)
                  } else {
                    // queryRange has something at the end
                    queryRange.start = GUIRange.end
                  }
                }
              } else if (typeof GUIRange.resolution === 'number' &&
                (typeof queryRange.resolution !== 'number' ||
                  queryRange.resolution < GUIRange.resolution
                )
              ) {
                // query has smaller resolution
                if (queryRange.start <= GUIRange.start) {
                  if (queryRange.end >= GUIRange.end) {
                    // queryRange completely covers GUIRange
                    // remove GUIRange
                    GUIRange = null
                  } else {
                    // GUIRange still has something at the end
                    GUIRange.start = queryRange.end
                    j++
                  }
                } else {
                  if (queryRange.end < GUIRange.end) {
                    // GUIRange will be split into two
                    // push the earlier GUIRange into mergedGUIRanges
                    var newGUIRange = GUIRange.clone()
                    newGUIRange.end = queryRange.start
                    mergedGUIRanges.splice(j, 0, newGUIRange)
                    GUIRange.start = queryRange.end
                    j++
                  } else {
                    // queryRange has something at the end
                    GUIRange.end = queryRange.start
                  }
                }
              } else {
                // same resolution, merge the region
                GUIRange.assimilate(queryRange)
                mergedGUIRanges.splice(j, 1)
              }
            }

            if (GUIRange) {
              mergedGUIRanges.splice(j, 0, GUIRange.clone())
            }
          }
        }
      }

      give._verbConsole.info(this.parent.id + ': merged: [' +
        mergedGUIRanges.map(
          range => range.regionToString() + ' (@ ' + range.resolution + ')'
        ).join(', ') + ']')

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
    _getTrackUncachedRange (mergedGUIRanges) {
      var totalUncachedRanges = []
      if (mergedGUIRanges && Array.isArray(mergedGUIRanges)) {
        mergedGUIRanges.forEach(chrRange => {
          if (this.getData(chrRange.chr, true).getUncachedRange) {
            var uncachedRanges = this.getData(chrRange.chr).getUncachedRange(
              chrRange, {
                bufferingRatio: this.resBufferRatio
              }
            )
            totalUncachedRanges = totalUncachedRanges.concat(uncachedRanges)
          } else {
            chrRange.resolution = typeof chrRange.resolution === 'number'
              ? chrRange.resolution / this.resBufferRatio
              : chrRange.resolution
            totalUncachedRanges.push(chrRange)
          }
        })
      }
      return totalUncachedRanges
    }

    _trackHasUncachedRange (ranges) {
      if (ranges && Array.isArray(ranges)) {
        return ranges.some(chrRange => {
          if (this.getData(chrRange.chr, true).hasUncachedRange) {
            return this.getData(chrRange.chr).hasUncachedRange(chrRange)
          }
          return true
        })
      }
      return false
    }

    /**
     * _prepareRemoteQuery - Prepare the remote query object
     *
     * @memberof TrackDataObjectBase.prototype
     * @param  {Array<ChromRegionLiteral>} regions - The array of query regions
     * @returns {object} - The object being fed to the server via AJAX
     */
    _prepareRemoteQuery (regions) {
      // provide data to mainAjax
      // for most of the tracks, this is only trackID and window
      let query = {
        db: this.parent.ref,
        type: this.parent.typeTrunk,
        window: regions.map(region => region.regionToString(false))
      }
      if (regions.some(region => region.resolution)) {
        query.params = {
          resolutions: regions.map(region => region.resolution)
        }
      }
      if (this.getTrackSetting('isCustom')) {
        query.remoteUrl = this.getTrackSetting('remoteUrl')
      } else {
        query.trackID = this.parent.id
      }
      return query
    }

    /**
     * _prepareCustomQuery - Provide data to custom track query.
     *   for most of the tracks, this is only window (does not need to stringify)
     *
     * @memberof TrackDataObjectBase.prototype
     * @param  {Array<ChromRegionLiteral>} regions - The array of query regions
     * @returns {Array<ChromRegionLiteral>} The array of query regions
     */
    _prepareCustomQuery (regions) {
      return regions
    }

    /**
     * fetchData - Get data from this TrackDataObject.
     *   GUI elements will call this function to see if data in cache need to
     *   be retrieved, and queue a callback function once data are ready.
     *   Multiple consecutive calls will be collapsed together to reduce
     *   computational burden.
     *
     * @memberof TrackDataObjectBase.prototype
     * @async
     * @param  {Array<ChromRegionLiteral>|ChromRegionLiteral} ranges - The
     *    range(s) to be queried
     * @param  {string} callerID - ID of the caller elements, to group
     *    consecutive calls together
     * @returns {Promise} returns a promise that resolves to an object
     *    with `callerID`s as key and the last committed range(s) as value
     *    when data is fetched.
     *    __NOTE__: if multiple fetchData requests are called within the
     *    same fetch data cycle, the promises returned will be the same.
     */
    fetchData (ranges, callerID) {
      callerID = callerID || TrackDataObject._NO_CALLERID_KEY

      if (!Array.isArray(ranges)) {
        ranges = [ranges]
      }
      give._verbConsole.info(this.parent.id + ' @ ' + Date.now() +
        ': fetchData([' +
        ranges.map(range => range.regionToString()).join(', ') + '], ' +
        callerID + ')')

      if (!this._trackHasUncachedRange(ranges)) {
        let callerObj = {}
        callerObj[callerID] = ranges
        return Promise.resolve(callerObj)
      }

      this._pendingRangesById[callerID] = ranges

      if (!this._debouncePromise) {
        if (this.getDataDebounceInt) {
          this._debouncePromise = new Promise((resolve, reject) => {
            setTimeout(resolve, this.getDataDebounceInt)
          })
        } else {
          this._debouncePromise = Promise.resolve()
        }
        this._fetchPromise = this._debouncePromise
          .then(() => this._collapseQueryAndRetrieve())
        return this._fetchPromise
      }
      return this._fetchPromise
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
    getData (chrom, createIfNotExist) {
      if (!this._data || !this._data.hasOwnProperty(chrom)) {
        if (createIfNotExist || this.localOnly) {
          this._data = this._data || {}
          this._data[chrom] = this._createNewDataStructure(chrom)
        } else {
          throw new give.GiveError('Data not ready for track \'' +
            this.parent.id + '\'' + ', chromosome \'' + chrom + '\'.')
        }
      }
      return this._data[chrom]
    }

    /**
     * _collapseQueryAndRetrieve - Merge all unmerged query in
     *   `this._pendingRangesById`, filter out the cached
     *   portion, then proceed with data retrieval
     * @memberof TrackDataObjectBase.prototype
     * @async
     * @returns {Promise} returns a promise that resolves to an object
     *    with `callerID`s as key and the last committed range(s) as value
     *    when data is ready.
     */
    _collapseQueryAndRetrieve () {
      if (this._ongoingFetchPromise === this._fetchPromise) {
        // this will only happen when debounce interval is shorter than fetch
        // extend the debounce to fetch completion and queue another fetch
        return this._fetchPromise.then(() => this._collapseQueryAndRetrieve())
      }

      this._debouncePromise = null
      let committedRegions = this._getTrackUncachedRange(
        this._mergeGUIRegionsByResolution(this._pendingRangesById)
      )
      give._verbConsole.info(this.parent.id + ' @ ' + Date.now() +
        ': committed([' +
        committedRegions.map(range => range.regionToString()).join(', ') +
        '])')

      this._committedRangesById = this._pendingRangesById
      this._pendingRangesById = {}
      if (committedRegions && committedRegions.length > 0) {
        this._ongoingFetchPromise = this._fetchPromise
        return this._retrieveData(committedRegions)
      }
      return Promise.resolve(this._committedRangesById)
    }

    /**
     * _retrieveData - Retrieve data based on track type (determined by
     *   `this.getTrackSetting('isCustom')` and
     *   `this.getTrackSetting('localFile')`)
     *
     * @memberof TrackDataObjectBase.prototype
     * @param  {Array<ChromRegionLiteral>} regions - Query regions, including
     *   potential resolutions
     * @async
     * @returns {Promise} returns a promise that resolves to an object
     *    with `callerID`s as key and the last committed range(s) as value
     *    when data is ready.
     */
    _retrieveData (regions) {
      // directly from request URL
      // use iron-ajax to submit request directly
      // customized components are used in data preparation and data handler
      // use dataHandler(e, detail) as return handler
      // callback is in case update is needed
      // remoteQuery is already prepared or can be provided by regions
      let promise = null
      if (this.getTrackSetting('isCustom')) {
        if (this.getTrackSetting('localFile')) {
          // if track has its own getLocalData function, then get local data
          // instead of getting remote data
          promise = this._readLocalFile(this.getTrackSetting('localFile'))
          // afterwards it's this.dataHandler()'s job.
        } else {
          // a custom track with a remote URL
          promise = this._readRemoteFile(this.getTrackSetting('remoteUrl'))
        }
        promise = promise.then(response => this._responseHandler(
          this._fileHandler.bind(this), response, regions
        ))
      } else if (this.getTrackSetting('requestUrl')) {
        promise = give.postAjax(this.getTrackSetting('requestUrl'),
          this._prepareRemoteQuery(regions), 'json'
        ).then(response => this._responseHandler(
          this._dataHandler.bind(this), response, regions
        ))
      }
      promise = promise
        ? promise.catch(err => this._dataErrorHandler(err))
        : Promise.resolve(this._committedRangesById)
      return promise.finally(() => this._clearCommittedInfo())
    }

    _dataErrorHandler (err) {
      if (err && typeof err === 'object') {
        err.callerIdRegions = this._committedRangesById
      }
      throw err
    }

    _clearCommittedInfo () {
      give._verbConsole.info(this.parent.id + ' @ ' + Date.now() +
        ': clearCommittedInfo()')
      if (this._ongoingFetchPromise === this._fetchPromise) {
        this._fetchPromise = null
      }
      this._ongoingFetchPromise = null
      this._committedRangesById = null
    }

    /**
     * _readLocalFile - read a local file representing the track
     *
     * @memberof TrackDataObjectBase.prototype
     * @param  {string} fileName - name of the file
     * @async
     * @returns {Promise} returns a promise that resolves to the file content.
     */
    _readLocalFile (fileName) {
      return new Promise((resolve, reject) => {
        let reader = new window.FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsText(fileName)
      })
    }

    /**
     * _createNewDataStructure - create a new data structure and pass in
     *    necessary parameters based on `this`.
     *
     * @param  {string} chrom - chromosomal name of the new data structure.
     * @returns {this.constructor._DataStructure} - a new data structure for the
     *    chromosome.
     */
    _createNewDataStructure (chrom) {
      return new this.constructor._DataStructure(
        this.parent.refObj.chromInfo[chrom].chrRegion,
        {
          localOnly: this.localOnly,
          _SummaryCtor: this.constructor._SummaryCtor
        }
      )
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
     * @returns {object} returns `this._committedRangesById` (and remove the
     *   property from `this`).
     */
    _responseHandler (dataHandler, response, committedRegions) {
      give._verbConsole.info(this.parent.id + ' @ ' + Date.now() +
        ': dataHandler(), regions = [' +
        committedRegions.map(range => range.regionToString()).join(', ') +
        ']')
      give._verbConsole.info(response)

      dataHandler(response, committedRegions)
      return this._committedRangesById
    }

    /**
     * _readRemoteFile - placeholder to read remote URL
     *
     * @memberof TrackDataObjectBase.prototype
     * @param  {string} URL - The URL of the remote file
     * @param  {Array<Number>} range - The range of the file (in bytes)
     * @returns {Promise} A promise that resolves to the content of the remote
     *    URL.
     */
    _readRemoteFile (url, range) {
      // placeholder to read remote URL
      // query is the current window (may involve buffering, can be implemented
      // in _prepareCustomQuery)
      // data will be passed via the resolution of the promise
      // and the response will be handled by this._responseHandler(e, detail)
      //
      // Notice that to achieve this, CORS needs to be enabled on target server
      // The fallback method is going through GeNemo server as a proxy
      return give.postAjax(url, null, 'blob').catch(err => {
        // this is used to handle CORS-related errors
        if (err.status && err.status >= 400) {
          // re-route the request through target server
          // TODO: implement this "proxy-ish" behavior on `/givdata`
          return give.postAjax(
            this.getTrackSetting('requestUrl'), {
              remoteUrl: url,
              range: range || null
            },
            'blob'
          )
        } else {
          throw (err)
        }
      })
    }

    /**
     * resBufferRatio - get the buffer ratio of resolution
     *
     * @returns {number}  the buffer ratio. For example, 1.2 means the requested
     *    resolution will be 20% finer than needed.
     */
    get resBufferRatio () {
      return this.constructor.RESOLUTION_BUFFER_RATIO
    }

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

    applyByChrom (regions, callback) {
      while (regions && regions.length) {
        let currChrom = regions[0].chr
        let chromRegionsSameChr =
          regions.filter(region => region.chr === currChrom)
        callback(currChrom, chromRegionsSameChr)
        regions = regions.filter(region => region.chr !== currChrom)
      }
    }

    insert (chromRegions) {
      return this.applyByChrom(chromRegions,
        (chrom, regions) => this.getData(chrom, true).insert(regions)
      )
    }

    remove (chromRegions) {
      return this.applyByChrom(chromRegions,
        (chrom, regions) => this.getData(chrom, true).remove(regions)
      )
    }

    update (chromRegionsOld, chromRegionsNew) {
      this.remove(chromRegionsOld)
      this.insert(chromRegionsNew)
    }

    clear () {
      this._data = {}
    }

    /**
     * _dataHandler - This should be the detailed implementation about how to
     *    handle the responses from server
     *
     *    When implementing this method, use `this.getData` to get the `GiveTree`
     *    object storing all necessary data corresponding to the correct
     *    chromosome. Then use `.insert` to insert the new data entries.
     *
     *    See documentation for `TrackDataObject` for references to
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
    _dataHandler (response, queryRegions) {
      queryRegions.forEach(function (region, index) {
        if (Array.isArray(response[region.regionToString()])) {
          this.getData(region.chr, true).insert(
            response[region.regionToString()].map(
              entry => this.constructor._chromEntryFromResponse(
                entry, this.parent.refObj
              ), this
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
    static _chromEntryFromResponse (entry, refObj) {
      var chrRegion = new give.ChromRegion(entry.regionString, refObj)
      chrRegion.data = ((this._SummaryCtor &&
        this._SummaryCtor._testRespEntry(entry))
        ? this._SummaryCtor.createFromResp(chrRegion, entry)
        : this._dataFromResponse(entry))
      return chrRegion
    }

    /**
     * _dataFromResponse - return the data object from response (JSON) entry.
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
    static _dataFromResponse (entry) {
      return entry.data
    }

    /**
     * _dataFromChromEntry - extract data from `give.ChromRegion`.
     *    This is almost the reverse function of `this._chromEntryFromResponse`
     *
     * @memberof TrackDataObjectBase.prototype
     * @param  {ChromRegionLiteral} dataEntry - the `give.ChromRegion` object to
     *    extract data from.
     * @returns {object} the data object.
     */
    static _dataFromChromEntry (dataEntry) {
      if (!dataEntry.data) {
        give._verbConsole.info('No data in the ChromEntry. Get "' +
          dataEntry.data + '".')
        return null
      }
      return dataEntry.data
    }

    /**
     * _localFileHandler - This should be the detailed implementation about how to
     *   handle local files
     *
     * @memberof TrackDataObjectBase.prototype
     * @param  {String} readFileResult - content of the file just read
     * @param  {Array<ChromRegionLiteral>} regions - Query regions, including
     *   potential resolutions
     */
    _fileHandler (readFileResult, regions) {
    }
  }

  /**
   * _SummaryCtor - Constructor of summary data
   * @constructor
   * @memberof TrackDataObjectBase
   * @static
   */
  TrackDataObject._SummaryCtor = null

  /**
   * _DataStructure - Constructor for underlying data structure used in
   *   `this._data`. Default value is `GIVE.OakTree`
   * @constructor
   * @memberof TrackDataObjectBase
   * @static
   */
  TrackDataObject._DataStructure = give.OakTree

  // Static members for TrackDataObject
  // URLs for data retrieval
  /**
   * @property {string} fetchDataTarget - The URL to fetch remote data.
   * @static
   * @memberof TrackDataObject
   */
  TrackDataObject.fetchDataTarget = give.Host +
    (give.ServerPath || '/') +
    (give.Trk_FetchDataTarget || 'getTrackData.php')

  /**
   * @property {string} fetchCustomTarget - The URL to fetch custom track data.
   * @static
   * @memberof TrackDataObject
   */
  TrackDataObject.fetchCustomTarget = give.Host +
    (give.ServerPath || '/') +
    (give.Trk_FetchCustomTarget || 'getTrackData.php')

  /**
   * @property {string} _NO_CALLERID_KEY - Default caller ID if none is provided.
   * @static
   * @memberof TrackDataObject
   */
  TrackDataObject._NO_CALLERID_KEY = '_giveNoCallerID'

  /**
   * @property {number} RESOLUTION_BUFFER_RATIO - The default values for buffer
   *   if data at current resolution is not available.
   * @static
   */
  TrackDataObject.RESOLUTION_BUFFER_RATIO = 1.25

  /**
   * @property {number} DEFAULT_DEBOUNCE_INTERVAL - The default values for
   *   debounce interval (in milliseconds) between `fetchData()` calls.
   * @static
   * @memberof TrackDataObject
   */
  TrackDataObject.DEFAULT_DEBOUNCE_INTERVAL = 200

  give.TrackDataObject = TrackDataObject

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
  class SummaryCtorBase {
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
    static _testRespEntry (entry) {
      return false
    }

    /**
     * dataFromChromEntry - extract data object from `give.ChromRegion`.
     *    This should be the same as `TrackDataObject._dataFromChromEntry`
     *    (or the corresponding `TrackDataObject`).
     *
     * @static
     * @param  {ChromRegionLiteral} entry - the `give.ChromRegion` object
     * @returns {object} returns the data contained within `entry`.
     */
    static _dataFromChromEntry (entry) {
      return give.TrackDataObject._dataFromChromEntry(entry)
    }

    /**
     * createFromResp - create a summary object from a response entry.
     *
     * @static
     * @param  {ChromRegionLiteral} chrRegion - The region this summary is for.
     * @param  {object} respEntry - the response entry object converted from
     *    JSON
     * @returns {SummaryCtorBase} the properly constructed summary object.
     */
    static createFromResp (chrRegion, respEntry) {
      return new this(chrRegion, respEntry.data)
    }

    /**
     * attach - attach the summary itself to a chromosomal region.
     *
     * @param  {ChromRegionLiteral} chrRegion - the chromosomal region to be
     *    attached to.
     * @returns {ChromRegionLiteral} the chromosomal region with summary
     *    attached.
     */
    attach (chrRegion) {
      chrRegion.data = this
      return chrRegion
    }

    /**
     * extract - extract the summary data from a chromosomal region.
     * This is the reverse operation of `SummaryCtorBase.attach`.
     *
     * @param  {ChromRegionLiteral} chrRegion - the chromosomal region to
     *    extract summary data from.
     * @returns {SummaryCtorBase} extracted summary data.
     */
    static extract (chrRegion) {
      return chrRegion.data
    }

    /**
     * addSummary - add summary data to this summary.
     *    This is mainly used to summarize over a series of summaries.
     *
     * @param  {GiveNonLeafNode} node    - the non-leaf node this summary is for
     * @param  {SummaryCtorBase} summary - the summary to be added
     */
    addSummary (node, summary) {
    }

    /**
     * addData - add raw data entry to this summary
     *    This is mainly used to summarize over raw data entries.
     *
     * @param  {GiveNonLeafNode} node - the non-leaf node this summary is for
     * @param  {object} data - the raw data object to be added
     */
    addData (node, data) {
    }

    /**
     * addData - add raw data entry to this summary
     *    This is mainly used to summarize over raw data entries.
     *
     * @param  {GiveNonLeafNode} node - the non-leaf node this summary is for
     * @param  {ChromRegionLiteral} chromEntry - the raw data object to be added
     */
    addDataFromChromEntry (node, chromEntry) {
      return this.addData(
        node, this.constructor._dataFromChromEntry(chromEntry)
      )
    }

    /**
     * addDataOrSummary - add summary or raw data to this summary.
     *    This is mainly used to summarize over its children.
     *
     * @param  {GiveNonLeafNode} node - the non-leaf node this summary is for
     * @param  {SummaryCtorBase|object} entry - the data to be added
     */
    addDataOrSummary (node, entry) {
      // entry can be either a summary or actual components
      if (entry instanceof this.constructor) {
        return this.addSummary(node, entry)
      } else {
        return this.addData(node, entry)
      }
    }
  }

  give.SummaryCtorBase = SummaryCtorBase

  return give
})(GIVe || {})
