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
   * Object representing a BED track data object,
   * see `GIVe.TrackDataObject` for details.
   * @typedef {object} InteractionTrackData
   * @class give.InteractionTrackData
   *
   * @constructor
   * @param {TrackObjectBase} parent - The track object parent
   */
  give.InteractionTrackData = function (parent) {
    give.TrackDataObject.apply(this, arguments)
  }

  give.extend(give.TrackDataObject, give.InteractionTrackData)

  give.InteractionTrackData.prototype._dataHandler = function (res, regions) {
    // notice that dirFlag can be undefined,
    //    however, if it's defined, then it will be the window index (for now)
    var resToRegion = function (resEntry) {
      return new give.ChromRegion(
        resEntry.regionString,
        this.ref, {
          data: {
            linkID: parseInt(resEntry.linkID),
            regionID: parseInt(resEntry.ID),
            value: parseFloat(resEntry.value),
            dirFlag: isNaN(parseInt(resEntry.dirFlag))
              ? null : parseInt(resEntry.dirFlag)
          }
        }
      )
    }.bind(this)

    for (var chrom in res) {
      if (res.hasOwnProperty(chrom) && Array.isArray(res[chrom])) {
        this.getData(chrom, true).insert(res[chrom].map(resToRegion, this),
          regions)
      }
    }
  }

  give.InteractionTrackData.prototype._localFileHandler = function (
    localFile, regions
  ) {
    // placeholder to read local file content
    // query is the current window (may involve buffering, can be implemented in prepareCustomQuery)
    // data will be passed via firing a 'response' event with {detail: data}
    // and the response will be handled by this.responseHandler(e, detail)

    // Interaction file implementation:
    //    brutal force going through the file to find regions that intersect the query region
    //    return the lines filtered
    //    currently using FileReader.readAsText(), may change into better adaptations for bigger files
    //      like in http://matthewmeye.rs/blog/post/html5-line-reader/
    //      or    http://stackoverflow.com/questions/24647563/reading-line-by-line-file-in-javascript-on-client-side

    var reader = new window.FileReader()
    var result = {}
    reader.onload = function (e) {
      var lines = e.target.result.split(/\r\n|\r|\n/g)
      var linkID = 0
      lines.forEach(function (line) {
        linkID++
        var tokens = line.split(/\s+/g)
        var regionPair = [
          new give.ChromRegion(tokens[0] + ':' + tokens[1] + '-' + tokens[2] +
            '(' + tokens[3] + ')'),
          new give.ChromRegion(tokens[4] + ':' + tokens[5] + '-' + tokens[6] +
            '(' + tokens[7] + ')')
        ]
        if (regionPair.some(function (regionEnd, index) {
          return regionEnd.overlaps(regions[index])
        }, this)) {
          // needs to push this line to result
          regionPair.forEach(function (region, index) {
            if (!result.hasOwnProperty(region.chr)) {
              result[region.chr] = []
            }
            result[region.chr].push({
              regionString: region.toString(),
              linkID: linkID,
              dirFlag: index
            })
          }, this)
        }
      }, this)
      this._dataHandler(result, regions)
    }.bind(this)
    reader.readAsText(localFile)
  }

  return give
})(GIVe || {})
