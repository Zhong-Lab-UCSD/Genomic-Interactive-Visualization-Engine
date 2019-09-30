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
   * @typedef {object} HighlightTrackData
   * @class give.HighlightTrackData
   *
   * @constructor
   * @param {TrackObjectBase} parent - The track object parent
   */
  class HighlightTrackData extends give.TrackDataObject {
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
      // this is to handle data within response
      // return data should be already sorted by chrom and start
      let resChromEntryFunc = (geneArray, geneNameMap, resChromEntry) => {
        let newGene = new give.GeneObject(
          new give.TranscriptObject(resChromEntry.geneBed,
            this.parent.refObj,
            resChromEntry.attr
          )
        )
        if (this.parent.typeTrunk.indexOf('gene') > -1) {
          // is some gene oriented type
          // check if it overlaps with existing gene(s)
          // because the gene list is sorted by start,
          //    whenever it doesn't overlap with the current gene
          //    it will become a new gene entry.
          if (!geneNameMap.hasOwnProperty(newGene.name) ||
            !geneNameMap[newGene.name].merge(newGene)
          ) {
            geneArray.push(newGene)
            geneNameMap[newGene.name] = newGene
          }
        } else {
          geneArray.push(newGene)
        }
      }

      for (let chrom in res) {
        let regionsInChrom = regions.filter(region => (region.chr === chrom))
        if (regionsInChrom.length > 0 && res.hasOwnProperty(chrom) &&
          Array.isArray(res[chrom])
        ) {
          let geneNameMap = {}
          let geneArray = []
          res[chrom].forEach(
            entry => resChromEntryFunc(geneArray, geneNameMap, entry)
          )
          // then populate the B+ Tree with geneArray
          this.getData(chrom, true).insert(
            geneArray.sort(give.ChromRegion.compare), regionsInChrom)
        }
      }
    }

    _fileHandler (res, regions) {
      // placeholder to read local file content
      // query is the current window (may involve buffering, can be implemented in prepareCustomQuery)
      // data will be passed via firing a 'response' event with {detail: data}
      // and the response will be handled by this.responseHandler(e, detail)

      // BED file implementation:
      //    brutal force going through the file to find regions that intersect the query region
      //    return the lines filtered
      //    currently using FileReader.readAsText(), may change into better adaptations for bigger files
      //      like in http://matthewmeye.rs/blog/post/html5-line-reader/
      //      or    http://stackoverflow.com/questions/24647563/reading-line-by-line-file-in-javascript-on-client-side

      let result = {}
      let lines = res.split(/\r\n|\r|\n/g)
      lines.forEach(line => {
        let transcript = new give.TranscriptObject(line)
        if (regions.some(region => transcript.overlaps(region))) {
          // needs to push this line to result
          if (!result.hasOwnProperty(transcript.chr)) {
            result[transcript.chr] = []
          }
          result[transcript.chr].push({geneBed: line})
        }
      })
      return this._dataHandler(result, regions)
    }
  }

  give.HighlightTrackData = HighlightTrackData

  return give
})(GIVe || {})
