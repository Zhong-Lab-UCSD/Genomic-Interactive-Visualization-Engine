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
   * Example for a new track data object,
   * see `GIVe.TrackDataObject` for details.
   * @typedef {object} NewTrackData
   * @class give.NewTrackData
   *
   * @constructor
   * @param {TrackObjectBase} parent - The track object parent
   */
  give.NewTrackData = function (parent) {
    give.TrackDataObject.apply(this, arguments)
  }

  give.extend(give.TrackDataObject, give.NewTrackData)

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
   *    An example is given in the code as comments.
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
  // give.NewTrackData.prototype._dataHandler = function (res, regions) {
  //   for (var chrom in res) {
  //     var regionsInChrom = regions.filter(function (region) {
  //       return region.chr === chrom
  //     }, this)
  //     if (regionsInChrom.length > 0 && res.hasOwnProperty(chrom) &&
  //         Array.isArray(res[chrom])) {
  //       this.getData(chrom, true).insert(res[chrom], regionsInChrom)
  //     }
  //   }
  // }

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
   *    An example is given in the code as comments.
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
   *
   * @returns {ChromRegionLiteral} a `give.ChromRegion` object.
   */
  // give.NewTrackData.prototype._chromEntryFromResponse = function (entry) {
  //   return new give.ChromRegion(entry.regionString, this.parent.refObj,
  //     { data: ((this._SummaryCtor && this._SummaryCtor.testRespEntry(entry))
  //       ? this._SummaryCtor.createFromResp(entry, this)
  //       : this._dataFromResponse(entry))
  //     })
  // }

  /**
   * _dataFromResponse - return the data object from response
   *
   *    An example is given in the code as comments.
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
  // give.NewTrackData.prototype._dataFromResponse = function (entry) {
  //   return entry.data
  // }

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
  // give.NewTrackData.prototype._dataFromChromEntry = function (dataEntry) {
  //   if (!dataEntry.data) {
  //     give._verbConsole.info('No data in the ChromEntry. Get "' +
  //       dataEntry.data + '".')
  //     return null
  //   }
  //   return dataEntry.data
  // }

  /**
   * _localFileHandler - This should be the detailed implementation about how to
   *    handle local files
   *
   *    An example is given in the code as comments.
   *
   * @param  {string} localFile - Path of the local file
   * @param  {Array<ChromRegionLiteral>} regions - Query regions, including
   *   potential resolutions
   */
  give.NewTrackData.prototype._fileHandler = function (localFile, regions) {
    // var reader = new window.FileReader()
    // var result = {}
    // reader.onload = function (e) {
    //   var lines = e.target.result.split(/\r\n|\r|\n/g)
    //   lines.forEach(function (line) {
    //     var transcript = new give.TranscriptObject(line)
    //     if (regions.some(function (region) {
    //       return transcript.overlaps(region)
    //     }, this)) {
    //       // needs to push this line to result
    //       if (!result.hasOwnProperty(transcript.chr)) {
    //         result[transcript.chr] = []
    //       }
    //       result[transcript.chr].push({geneBed: line})
    //     }
    //   }, this)
    //   this._dataHandler(result, regions)
    // }.bind(this)
    // reader.readAsText(localFile)
  }

  /**
   * _SummaryCtor - Constructor of summary data
   * @constructor
   * @memberof TrackDataObjectBase.prototype
   */
  // give.NewTrackData.prototype._SummaryCtor = null

  /**
   * _DataStructure - Constructor for underlying data structure used in
   *   `this._data`. Default value is `GIVE.OakTree`
   * @constructor
   */
  // give.NewTrackData.prototype._DataStructure = give.OakTree

  /**
   * **************************************************************************
   * The following are implementation basis for a summary object if the track
   * needs to support such features.
   * A data summary object will be needed to handle summaries and will be
   * responsible for some basic data operations.
   * **************************************************************************
   */

  /**
   * NewTrackSummaryCtor - Constructor of summary data for the new track
   * @constructor
   *
   * @class SummaryCtorBase
   */
  // give.NewTrackSummaryCtor = function (node, oldSummary) {
  // }

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
  // give.NewTrackSummaryCtor.testRespEntry = function (entry) {
  // }

  /**
   * createFromResp - create a summary object from a response entry.
   *
   * @static
   * @param  {object} entry - the response entry object converted from JSON
   * @returns {SummaryCtorBase} the properly constructed summary object.
   */
  // give.NewTrackSummaryCtor.createFromResp = function (respEntry, trackDataObj) {
  //   return new this(respEntry.data)
  // }

  /**
   * addSummary - add summary data to this summary.
   *    This is mainly used to summarize over a series of summaries.
   *
   * @param  {GiveNonLeafNode} node    - the non-leaf node this summary is for
   * @param  {SummaryCtorBase} summary - the summary to be added
   */
  // give.NewTrackSummaryCtor.prototype.addSummary = function (node, summary) {
  // }

  /**
   * addData - add raw data entry to this summary
   *    This is mainly used to summarize over raw data entries.
   *
   * @param  {GiveNonLeafNode} node - the non-leaf node this summary is for
   * @param  {object} data - the raw data object to be added
   */
  // give.NewTrackSummaryCtor.prototype.addData = function (node, data) {
  // }

  return give
})(GIVe || {})
