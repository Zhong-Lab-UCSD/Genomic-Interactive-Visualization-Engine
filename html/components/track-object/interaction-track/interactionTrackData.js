/**
 * @license
 * Copyright 2017-2019 The Regents of the University of California.
 * All Rights Reserved.
 *
 * Created by Xiaoyi Cao
 * Department of Bioengineering
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
  class InteractionTrackData extends give.TrackDataObject {
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
    _dataHandler (res, regions) {
      // notice that dirFlag can be undefined,
      //    however, if it's defined, then it will be the window index (for now)
      let resToRegion = resEntry => new give.ChromRegion(
        resEntry.regionString,
        this.parent.refObj, {
          data: {
            linkID: resEntry.linkID,
            regionID: parseInt(resEntry.ID),
            value: parseFloat(resEntry.value),
            dirFlag: isNaN(parseInt(resEntry.dirFlag))
              ? null : parseInt(resEntry.dirFlag)
          }
        }
      )

      for (var chrom in res) {
        if (res.hasOwnProperty(chrom) && Array.isArray(res[chrom])) {
          this.getData(chrom, true).insert(res[chrom].map(resToRegion),
            regions)
        }
      }
    }

    _fileHandler (res, regions) {
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

      let lines = res.split(/\r\n|\r|\n/g)
      let linkID = 0
      let result = {}
      lines.forEach(line => {
        linkID++
        let tokens = line.split(/\s+/g)
        let regionPair = [
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
      })
      return this._dataHandler(result, regions)
    }
  }

  give.InteractionTrackData = InteractionTrackData

  return give
})(GIVe || {})
