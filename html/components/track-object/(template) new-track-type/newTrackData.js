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
   * @param  {Array<ChromRegionLiteral>} regions - Query regions, including
   *   potential resolutions
   */
  give.NewTrackData.prototype._dataHandler = function (res, regions) {
    // for (var chrom in res) {
    //   var regionsInChrom = regions.filter(function (region) {
    //     return region.chr === chrom
    //   }, this)
    //   if (regionsInChrom.length > 0 && res.hasOwnProperty(chrom) &&
    //       Array.isArray(res[chrom])) {
    //     this.getData(chrom, true).insert(res[chrom], regionsInChrom)
    //   }
    // }
  }

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
  give.NewTrackData.prototype._localFileHandler = function (localFile, regions) {
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

  return give
})(GIVe || {})
