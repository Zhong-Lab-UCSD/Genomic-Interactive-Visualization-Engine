/**
@license
Copyright 2017 GIVe Authors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

First, `import` the base `track-object` to implement a new track.
*/
/*
Then import all other dependencies (omit if none is needed).
*/
/*
Finally, all the components are either `import`ed (HTML files) or put in
`<script></script>` tags (JS files).
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '../track-object.js';

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

  class HighlightTrackDom extends give.TrackDom {
    _initProperties (properties) {
      super._initProperties(properties)

      this.trackMainDOMClass = 'highlight'
    }

    static get defaultProperties () {
      return Object.assign(super.defaultProperties || {}, {})
    }

    _getLabelLocation (pinValue, reverseFlag) {
      return ((pinValue === 'top') !== reverseFlag) ? 'up' : 'down'
    }

    get DEFAULT_HEIGHT () {
      return this.tickLength +
        (this.lineGapRatio * this.tickNumberGapRatio + 1) * this.textSize
    }

    // ****** customized methods below ******

    drawData () {
      // this is to draw everything from this.data to the svg
      // Steps:
      //     put genes into lines (pack display)
      //    draw genes out line by line

      // clear text Margin svg
      this.clear()
      this._getDataObject().traverse(this.viewWindow,
        entry => this._drawSingleHighlight(entry), null, false)
    }

    _drawSingleHighlight (entry) {
      if (this.regionInWindow(entry)) {
        let colorIndex =
          parseInt(entry.colorIndex || 0) % this.constructor.colorSet.length
        this.drawRectangle(entry, this.constructor.colorSet[colorIndex],
          0, this.height)
      }
    }
  }

  HighlightTrackDom.colorSet = [
    0x77AADD, 0xEE8866, 0xEEDD88, 0xFFAABB,
    0x99DDFF, 0x44BB99, 0xBBCC33, 0xAAAA00
  ]

  give.HighlightTrackDom = HighlightTrackDom

  return give
})(GIVe || {})
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
   * Object representing a corrdinate track, see `GIVe.TrackObject` for details.
   * @typedef {object} CoorTrack
   * @class give.CoorTrack
   * @implements give.TrackObject
   */
  class HighlightTrack extends give.TrackObject {
    /**
     * typeList - get the key strings showing this type of data.
     *    This shall be the same as the `type` column for track entries in
     *    `trackDb` table so that GIVE is able to figure out the track is of
     *    this type.
     * @static
     * @property
     *
     * @returns {Array<string>}  return all keys matching this type.
     */
    static get typeList () {
      return ['highlight']
    }

    constructor (ID, Settings, refObj, groupID) {
      super(...arguments)
      this.currentRegionIndex = 0
    }

    addRegion (chromRegion) {
      return this._dataObj.addRegion(chromRegion)
    }

    removeRegion (chromRegion) {
      return this._dataObj.removeRegion(chromRegion)
    }
  }

  // specify the data object (if needed) used in this track
  HighlightTrack._DataObjCtor = give.HighlightTrackData

  // specify the visualization object used in this track
  HighlightTrack._DomObjCtor = give.HighlightTrackDom

  // __IMPORTANT:__ register this new track type
  give.TrackObject.registerTrack(HighlightTrack)

  give.HighlightTrack = HighlightTrack

  return give
})(GIVe || {})
