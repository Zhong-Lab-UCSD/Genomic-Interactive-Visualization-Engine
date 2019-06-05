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

First, `import` everything needed to implement a new track.
*/
/*
Then import all other dependencies (omit if none is needed).
*/
/*
Finally, all the components are either `import`ed (HTML file) or put in
`<script></script>` tags (JS files).
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '../track-object.js';

import '../../gene-object/gene-object.js';
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
   * @typedef {object} BedTrackData
   * @class give.BedTrackData
   *
   * @constructor
   * @param {TrackObjectBase} parent - The track object parent
   */
  class BedTrackData extends give.TrackDataObject {
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

  give.BedTrackData = BedTrackData

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
 *
 * ### Overview
 *
 * `<bed-track-dom>` is the Web Component to display BED tracks. It's part of
 * `GIVe.BedTrack` object and is used to visualize data from the `GIVe.BedTrack`
 * object.
 *
 * ### Visibility level
 *
 * ### References
 * *   [`GIVe.TrackObject`](../index.html) for details on tracks in
 * general;
 * *   [`GIVe.BedTrack`](./bed-track/index.html) for details on BED
 * track implementation;
 * *   [Polymer element registration](https://www.polymer-project.org/1.0/docs/devguide/registering-elements)
 * for Polymer Element guide, including lifecycles, properties, methods and others.
 */
var GIVe = (function (give) {
  'use strict'
  class RasInfo {
    constructor (start, end, rasterCount, rasterFillThreshold) {
      this.prepareRaster(start, end, rasterCount)
      this.prepareInfo(0)
      this.RasterFillThreshold = rasterFillThreshold || 0.0001
    }

    prepareInfo (index, callback) {
      if (this._Raster.length > 1) {
        if (this._Info && typeof callback === 'function') {
          callback(this.flag, this.currIndex)
        }
        this._Info = this._Info ||
          new Array(RasInfo.RASTER_STATES.TotalNumOfStates)
        this._Info.fill(0)
        if (index < 0 || index >= this._Raster.length - 1) {
          // index out of bounds
          this._RasIndex = null
          throw new give.GiveError('Index out of bounds for raster! Raster length: ' +
            this._Raster.length + ', index: ' + index)
        }
        this._RasIndex = index || 0
      }
    }

    get flag () {
      var maxFlag = RasInfo.RASTER_STATES.EMPTY
      this._Info.every(function (entry, index) {
        if (entry > parseInt((this.rasterEnd - this.rasterStart) *
          this.RasterFillThreshold)
        ) {
          maxFlag = index
          return true
        }
        return false
      }, this)
      return maxFlag
    }

    get rasterStart () {
      return this._Raster[this._RasIndex]
    }

    get rasterEnd () {
      return this._Raster[this._RasIndex + 1]
    }

    next (callback) {
      this.prepareInfo(this._RasIndex + 1, callback)
      return this._RasIndex
    }

    addData (length, flag) {
      for (let i = RasInfo.RASTER_STATES.EMPTY; i <= flag; i++) {
        this._Info[i] += length
      }
    }

    prepareRaster (start, end, rasterCount) {
      if (isNaN(rasterCount) || rasterCount < 1) {
        rasterCount = 1
      }
      if (end - start < rasterCount) {
        rasterCount = end - start
      }
      let currCoor = start
      this._Raster = [currCoor]
      do {
        currCoor += parseInt((end - currCoor) / rasterCount + 0.5)
        rasterCount--
        this._Raster.push(currCoor)
      } while (currCoor < end)
    }

    findRasIndex (coordinate) {
      // bring this._RasterizedInfo._RasterIndex up to date
      return give.locationOf(coordinate, this._Raster) - 1
    }

    get currIndex () {
      return this._RasIndex
    }

    /**
     * genRasOutput - generate a series of consolidated non-empty rasterized
     *    region.
     *
     * @param  {Array<number>} RasFlags   description
     * @param  {number} startIndex description
     * @returns {Array<object>}  return consolidated non-empty objects.
     *    For example:
     *    '''
     *    [
     *      {
     *        'start': 123456,
     *        'end': 234567,
     *        'flag': 1 (=== give.RasInfo.RASTER_STATES.LINE)
     *      },
     *      ...
     *    ]
     *    '''
     */
    genRasOutput (RasFlags, startIndex) {
      var results = []
      var lastFlag
      var lastIndex = startIndex
      RasFlags.forEach(function (flag, index) {
        if (flag !== lastFlag) {
          if (lastFlag) {
            results.push({
              start: this._Raster[lastIndex],
              end: this._Raster[startIndex + index],
              flag: lastFlag
            })
          }
          lastIndex = startIndex + index
          lastFlag = flag
        }
      }, this)
      if (lastFlag) {
        results.push({
          start: this._Raster[lastIndex],
          end: this._Raster[startIndex + RasFlags.length],
          flag: lastFlag
        })
      }
      return results
    }
  }

  RasInfo.RASTER_STATES = {
    TotalNumOfStates: 4,
    EMPTY: 0,
    LINE: 1,
    THIN: 2,
    THICK: 3
  }

  give.RasInfo = RasInfo

  class BedTrackDom extends give.TrackDom {
    _initProperties (properties) {
      super._initProperties(properties)

      /**
       * @property {number} geneMargin
       * margin size between genes when gene name is shown. Unit in px.
       */
      this.geneMargin = this._initPropertyItem(
        'geneMargin', properties, 'geneMargin', 'integer')

      /**
       * @property {number} geneHeightRatio
       * height of gene entries. Proportion to `this.textSize`.
       */
      this.geneHeightRatio = this._initPropertyItem(
        'geneHeightRatio', properties, 'geneHeightRatio', 'float')

      /**
       * @property {number} geneNoTextMargin
       * margin size between genes when no text is shown. Unit in px.
       */
      this.geneNoTextMargin = this._initPropertyItem(
        'geneNoTextMargin', properties, 'geneNoTextMargin', 'integer')

      /**
       * @property {number} adaptiveMaxLines
       * limit to downgrade visibility
       */
      this.adaptiveMaxLines = this._initPropertyItem(
        'adaptiveMaxLines', properties, 'adaptiveMaxLines', 'integer')

      /**
       * @property {number} TRIANGLE_FILL
       * the fill color for the triangles (indicating clipped content)
       */
      this.TRIANGLE_FILL = 0xFFFFFF

      /**
       * @property {number} forecolorIndex
       * the color index for fore color
       */
      this.forecolorIndex = this._initPropertyItem(
        'forecolorIndex', properties, 'forecolorIndex', 'integer')

      /**
       * @property {number} RASTER_SIZE
       * The size of raster in `DENSE` view in pixel.
       */
      this.RASTER_SIZE = 1

      /**
       * whether this track honors itemRGB values provided by BED data.
       */
      this.honorItemRgb = this._initPropertyItem(
        'honorItemRgb', properties, 'honorItemRgb', 'boolean')

      this._RasInfo = null
    }

    /**
     * ****** Implementation methods below ******
     */

    drawData () {
      // this is to draw everything from this.data to the svg
      // Steps:
      //     put genes into lines (pack display)
      //    draw genes out line by line

      // clear text Margin svg
      this.clear()

      this.changeVisibility(this.parent.visibility, false)
      let numOfLines = 1
      let data = this._getDataObject(this.viewWindow.chr)

      this._RasInfo = null
      if (data) {
        while (!(numOfLines = this._prepareLines(data)) &&
          this.activeVisibility > give.TrackObject.StatusEnum.VIS_NONE);
        if (this.activeVisibility <=
          give.TrackObject.StatusEnum.VIS_NOTEXT
        ) {
          // Raster is needed
          this._RasInfo = new give.RasInfo(
            this.viewWindow.start,
            this.viewWindow.end,
            this.windowWidth / this.RASTER_SIZE)
        }
        if (this.activeVisibility > give.TrackObject.StatusEnum.VIS_DENSE
        ) {
          data.traverse(this.viewWindow,
            entry => this._drawSingleGene(entry),
            null, false)
        } else {
          // create a series of "megagenes" with all overlapping genes
          // then draw the "megagenes" instead
          let megaGenes = []
          data.traverse(this.viewWindow,
            entry => this._aggregateTranscript(megaGenes, entry),
            null, false)
          megaGenes.forEach(this._drawSingleGene, this)
        }
      }

      // resize the height
      this.height = this._calcHeight(numOfLines)
    }

    /**
     * ****** Private and helper methods below ******
     */

    /**
     * _calcHeight - calculate the height of this track
     *
     * @param  {number} [numOfLines] - number of lines in this track
     * @returns {number} height of this track
     */
    _calcHeight (numOfLines) {
      numOfLines = numOfLines || 1
      return (numOfLines * (this.fullHeightRatio + this.lineGapRatio) -
        this.lineGapRatio) * this.textSize
    }

    _aggregateTranscript (transcriptArray, transcript) {
      if (transcriptArray.length <= 0 ||
        !transcriptArray[transcriptArray.length - 1].merge(transcript)
      ) {
        transcriptArray.push(new give.AggregatedTranscript(transcript))
      }
    }

    /**
     * _allocateLineToTrans - test and allocate line number to a single
     *    transcript.
     *    Allocated line number will be written into `transcript` via its
     *    `lineY` property.
     *    Also, if the current visibility is at `DENSE`, fill the
     *    rasterized information.
     *
     * @param  {Array<object>} lineEnds - An array of objects depicting
     *    existing line ends for collision detection., object can have two
     *    properties:
     *    * end: the end coordinate of the line;
     *    * textAtLeft: whether this line has text at left (in text column).
     * @param  {TranscriptObject} transcript - the transcript to be
     *    allocated.
     * @returns {boolean} return `true` if allocation succeeds, `false` if
     *    allocation cannot be done under current settings.
     *    (This will happen when adaptive display is on and current active
     *    setting cannot hold all transcripts.)
     */
    _allocateLineToTrans (lineEnds, transcript) {
      // calculate x0 and x1 for the gene
      if (!this.regionInWindow(transcript)) {
        return true
      }
      if (this.activeVisibility <= give.TrackObject.StatusEnum.VIS_DENSE) {
        return true
      }
      var x0 = this.transformXCoordinate(transcript.startCoor, true)
      var x1 = this.transformXCoordinate(transcript.endCoor, true)
      var textAtLeft = false
      if (this.activeVisibility >
        give.TrackObject.StatusEnum.VIS_NOTEXT &&
        transcript.getGeneName(true)
      ) {
        var newLabel = this.drawText(x0 - this.textRightPadding,
          this.Y_HIDDEN, transcript.getGeneName(true), 'end')
        // move text to textMargin if out of bounds
        x0 = newLabel.getBBox().x
        if (this.textMargin && x0 < 0) {
          x0 = 0
          textAtLeft = true
        }
        this.removeElement(newLabel)
      }

      if (!lineEnds.some((lineEnd, index) => {
        if (
          (lineEnd.end <= x0 && !(lineEnd.textAtLeft && textAtLeft)) ||
          this.activeVisibility <= give.TrackObject.StatusEnum.VIS_DENSE
        ) {
          // this gene can be fit into this line
          transcript.lineY = index
          lineEnd.end = x1 + (this.activeVisibility >
            give.TrackObject.StatusEnum.VIS_NOTEXT
            ? this.geneMargin : this.geneNoTextMargin)
          return true
        }
        return false
      })) {
        // no empty lines, create a new line
        if (this.parent.getSetting('adaptive', 'boolean') &&
          lineEnds.length >= this.adaptiveMaxLines
        ) {
          // maximum number of lines exceeded
          // reduce visibility level by 1
          this.changeVisibility(-1, true)
          return false
        }
        transcript.lineY = lineEnds.length
        lineEnds.push({
          end: x1 + (this.activeVisibility >
            give.TrackObject.StatusEnum.VIS_NOTEXT
            ? this.geneMargin : this.geneNoTextMargin),
          textAtLeft: textAtLeft
        })
      }
      return true
    }

    /**
     * _prepareLines - prepare lines for genes in adaptive cases.
     *    This is especially useful for display modes like `pack`, where
     *      items are stacked if space allows.
     *    When `this.parent.getSetting('adaptive', 'boolean') === true`, the
     *      actual display mode needs to be determined by the code. This
     *      function will calculate the x0 and x1 for every gene, taking
     *      text width into consideration, and increase display density
     *      accordingly.
     *    This function will allocate items to their corresponding lines by
     *      setting the `lineY` property.
     *
     * @param  {GiveTreeBase} data - data object used to prepare the lines.
     * @returns {number}  number of lines this track will take.
     */
    _prepareLines (data) {
      let lineEnds = [] // arrays of line end coordinates
      if (this.activeVisibility <= give.TrackObject.StatusEnum.VIS_DENSE) {
        return 1
      }
      if (data.traverse(this.viewWindow,
        entry => this._callTransFuncOnGene(
          transcript => this._allocateLineToTrans(lineEnds, transcript),
          entry
        ), null, true)
      ) {
        return lineEnds.length > 0 ? lineEnds.length : 1
      } else {
        return false
      }
    }

    /**
     * _drawOverflowTriangles - draw two overflow triangles if genes exceed
     *    the viewWindow
     *
     * @param  {TranscriptObject} transcript - the gene/transcript to be
     *    drawn. Only the entry provided here will be drawn, so if a gene
     *    is provided, only the gene, not its transcript(s) will be drawn.
     * @param  {number} colorRGB - RGB value of the color for the gene
     * @param  {number} height - full height for drawing (CDS for example).
     * @param  {number} yCoor - the y coordinate from the top to draw this
     *    gene/transcript. __Notice that genes drawn are vertically-aligned
     *    to the center so yCoor should be the coordinates at the center.__
     */
    _drawOverflowTriangles (transcript, colorRGB, height, yCoor) {
      var halfHeight = 0.5 * height
      if (this.transformXCoordinate(transcript.startCoor, false) < 0) {
        // left triangles
        this.createRawPolygon([ '0,' + yCoor,
          halfHeight + ',' + (yCoor - halfHeight),
          halfHeight + ',' + yCoor,
          height + ',' + (yCoor - halfHeight),
          height + ',' + (yCoor + halfHeight),
          halfHeight + ',' + yCoor,
          halfHeight + ',' + (yCoor + halfHeight) ],
        { fill: this.TRIANGLE_FILL, stroke: colorRGB }
        )
      }

      if (this.transformXCoordinate(transcript.endCoor, false) >
        this.windowWidth
      ) {
        // right triangles
        this.createRawPolygon([ this.windowWidth + ',' + yCoor,
          (this.windowWidth - halfHeight) + ',' + (yCoor - halfHeight),
          (this.windowWidth - halfHeight) + ',' + yCoor,
          (this.windowWidth - height) + ',' + (yCoor - halfHeight),
          (this.windowWidth - height) + ',' + (yCoor + halfHeight),
          (this.windowWidth - halfHeight) + ',' + yCoor,
          (this.windowWidth - halfHeight) + ',' + (yCoor + halfHeight) ],
        { fill: this.TRIANGLE_FILL, stroke: colorRGB }
        )
      }
    }

    /**
     * _callTransFuncOnGene - call functions on transcripts of genes, or
     *    the gene itself depends on visibility settings.
     *    If active visibility is greater than
     *    `give.TrackObject.StatusEnum.VIS_COLLAPSED`, then function will
     *    be called upon every transcript, otherwise it will be called upon
     *    the gene.
     *    Notice that the loop will be broken once `transcriptCallback`
     *    returns `false`.
     *
     * @param  {function} transcriptCallback - call back functions for
     *    each transcript (taking only the transcript as its parameter)
     * @param  {GeneObject} gene - the gene to be called upon.
     * @return {boolean} Whether the function call returns `true`
     */
    _callTransFuncOnGene (transcriptCallback, gene) {
      var transcripts
      if (this.activeVisibility >
        give.TrackObject.StatusEnum.VIS_COLLAPSED &&
        gene.transcripts
      ) {
        transcripts = gene.transcripts
      } else {
        transcripts = [gene]
      }
      return transcripts.every(transcriptCallback)
    }

    /**
     * _drawSingleTranscript - draw a single gene in the track SVG
     *
     * @param  {GeneObject} gene - the gene to be drawn.
     */
    _drawSingleGene (gene, index, geneArray) {
      this._callTransFuncOnGene(
        transcript => this._drawSingleTranscript(transcript,
          Array.isArray(geneArray) ? index === geneArray.length - 1 : false,
          null,
          (this.honorItemRgb && gene.rgb !== undefined)
            ? gene.rgb : null
        ),
        gene)
    }

    /**
     * _drawSingleTranscript - draw a single transcript in the track SVG
     *
     * @param  {TranscriptObject} transcript - the transcript to be
     *    drawn. Only the entry provided here will be drawn, so if a gene
     *    is provided, only the gene, not its transcript(s) will be drawn.
     * @param  {boolean} [lastTrans] - whether this transcript is the last one
     *    to draw. Used to finish rasterized drawing.
     * @param  {number} [yCoor] - the y coordinate from the top to draw this
     *    transcript. __Notice that genes drawn are vertically-aligned
     *    to the center so yCoor should be the coordinates at the center.__
     * @param  {number} [colorRGB] - RGB value of the color for the gene
     * @param  {number} [height] - full height for drawing (CDS for
     *    example).
     * @param  {number} [halfHeightRatio] - Ratio for lower height values in
     *    some regions (for example, UTRs). __This should be normalized by
     *    `height`.__
     * @param  {number} [lineHeight] - unit for all height values.
     */
    _drawSingleTranscript (
      transcript, lastTrans, yCoor, colorRGB, height, halfHeightRatio,
      lineHeight
    ) {
      if (!this.regionInWindow(transcript)) {
        return true
      }
      height = height ||
        this.fullHeightRatio * this.textSize * this.geneHeightRatio
      halfHeightRatio = halfHeightRatio || this.halfHeightRatio
      lineHeight = lineHeight ||
        (this.fullHeightRatio + this.lineGapRatio) * this.textSize
      if (typeof (colorRGB) !== 'number') {
        colorRGB = this.constructor.colorSet[this.forecolorIndex]
      }

      if (typeof (yCoor) !== 'number' || isNaN(yCoor)) {
        yCoor = (parseInt(
          this.activeVisibility > give.TrackObject.StatusEnum.VIS_DENSE
            ? transcript.lineY : 0) + 0.5) * lineHeight ||
          lineHeight / 2
      }

      if (this.activeVisibility > give.TrackObject.StatusEnum.VIS_NOTEXT) {
        this._drawSingleTranscriptBodyFullRes(transcript, yCoor, colorRGB,
          height, halfHeightRatio, lineHeight)
        // draw text
        var newLabel = this.drawText(
          this.transformXCoordinate(transcript.startCoor, true) -
            this.textRightPadding,
          yCoor, transcript.getGeneName(true), 'end',
          {style: 'fill: ' + this.constructor.rgbToHex(colorRGB)}
        )

        // move text to textMargin if out of bounds
        if (this.textMargin && newLabel.getBBox().x < 0) {
          newLabel.setAttributeNS(null, 'x', this.textMargin)
          this.addElement(newLabel, this._textSvg)
        }
      } else {
        this._drawSingleTranscriptBodyRaster(transcript, lastTrans, yCoor,
          colorRGB, height, halfHeightRatio, lineHeight)
      }

      this._drawOverflowTriangles(transcript, colorRGB, height, yCoor)
      return true
    }

    /**
     * _drawSingleTranscriptBodyFullRes - draw a single transcript in the
     *    track SVG at full resolution
     *
     * @param  {TranscriptObject} transcript - the transcript to be
     *    drawn. Only the entry provided here will be drawn, so if a gene
     *    is provided, only the gene, not its transcript(s) will be drawn.
     * @param  {number} yCoor - the y coordinate from the top to draw this
     *    transcript. __Notice that genes drawn are vertically-aligned
     *    to the center so yCoor should be the coordinates at the center.__
     * @param  {number} colorRGB - RGB value of the color for the gene
     * @param  {number} height - full height for drawing (CDS for
     *    example).
     * @param  {number} halfHeightRatio - Ratio for lower height values in
     *    some regions (for example, UTRs). __This should be normalized by
     *    `height`.__
     * @param  {number} lineHeight - unit for all height values.
     */
    _drawSingleTranscriptBodyFullRes (
      transcript, yCoor, colorRGB, height, halfHeightRatio, lineHeight
    ) {
      /**
       * _processSingleBlock - helper function to draw only one block
       *
       * @param  {number} blockStart - the start coordinate of the block.
       * @param  {number} blockEnd - the end coordinate of the block.
       * @param  {number} [thickStart] - the start coordinate of thick
       *    portions, which may overlap with the block.
       * @param  {number} [thickEnd] - the end coordinate of thick
       *    portions, which may overlap with the block.
       * @param  {ChromRegionLiteral} [coor] - chromosomal region object.
       *    Used to cut back GC.
       */
      var _processSingleBlock = (
        blockStart, blockEnd, thickStart, thickEnd, coor
      ) => {
        coor = coor || new give.ChromRegion({chr: transcript.chr,
          start: blockStart,
          end: blockEnd,
          strand: transcript.strand})
        var isThick = false
        if (typeof thickStart === 'number' ||
          typeof thickEnd === 'number'
        ) {
          if (thickStart < blockEnd && thickStart > blockStart) {
            // CDS start is in this block
            coor.end = thickStart
            coor.start = blockStart
            this.drawRectangle(coor, colorRGB,
              yCoor, height * halfHeightRatio,
              null, colorRGB,
              give.TrackDom.VALIGN_CENTER
            )
            blockStart = thickStart
          }
          if (thickEnd < blockEnd && thickEnd > blockStart) {
            // CDS end is in this block
            coor.end = thickEnd
            coor.start = blockStart
            this.drawRectangle(coor, colorRGB, yCoor,
              height, null, colorRGB,
              give.TrackDom.VALIGN_CENTER
            )
            blockStart = thickEnd
          }
          isThick = (thickStart < blockEnd) && (thickEnd > blockStart)
        } else {
          isThick = true
        }
        coor.end = blockEnd
        coor.start = blockStart
        this.drawRectangle(coor, colorRGB,
          yCoor, height * (isThick ? 1 : halfHeightRatio),
          null, colorRGB, give.TrackDom.VALIGN_CENTER
        )
      }

      let coor = new give.ChromRegion({chr: transcript.chr,
        start: transcript.start,
        end: transcript.end,
        strand: transcript.strand})
      let blockStart, blockEnd

      if (transcript.numOfBlocks) {
        // Have different blocks
        blockEnd = transcript.start + transcript.blockStarts[0]
        // draw thick blocks and connecting lines
        for (let i = 0; i < transcript.numOfBlocks; i++) {
          blockStart = transcript.start +
            transcript.blockStarts[i]
          // first draw connecting lines (intron, if any)
          if (blockEnd < blockStart) {
            coor.end = blockStart
            coor.start = blockEnd
            this._drawSpanningLine(coor, colorRGB, yCoor, height)
          }
          blockEnd = blockStart + transcript.blockSizes[i]
          _processSingleBlock(blockStart, blockEnd,
            transcript.thickStart, transcript.thickEnd, coor
          )
        }
      } else {
        // no blocks
        _processSingleBlock(transcript.start, transcript.end,
          transcript.thickStart, transcript.thickEnd, coor
        )
      }
    }

    /**
     * _drawSingleTranscriptBodyRaster - draw a single transcript in the
     *    track SVG, rasterized by provided raster or `this._Raster`
     *
     * @param  {TranscriptObject} transcript - the transcript to be
     *    drawn. Only the entry provided here will be drawn, so if a gene
     *    is provided, only the gene, not its transcript(s) will be drawn.
     * @param  {boolean} [lastTrans] - whether this transcript is the last one
     *    to draw. Used to finish rasterized drawing.
     * @param  {number} yCoor - the y coordinate from the top to draw this
     *    transcript. __Notice that genes drawn are vertically-aligned
     *    to the center so yCoor should be the coordinates at the center.__
     * @param  {number} colorRGB - RGB value of the color for the gene
     * @param  {number} height - full height for drawing (CDS for
     *    example).
     * @param  {number} halfHeightRatio - Ratio for lower height values in
     *    some regions (for example, UTRs). __This should be normalized by
     *    `height`.__
     * @param  {number} lineHeight - unit for all height values.
     */
    _drawSingleTranscriptBodyRaster (transcript, lastTrans, yCoor,
      colorRGB, height, halfHeightRatio, lineHeight
    ) {
      /**
       * Steps:
       * 1. Find the raster index for the transcript;
       * 2. Fill RasterizedInfo for the current raster until coordinate
       *    shifts away. Old RasterizedInfo may be used if available;
       * 3. Use RasterizedInfo to assign RasterizationState, the actual
       *    value to draw for current raster;
       * 4. Draw bodies based on RasterizationState
       */

      var rasterFlags = []
      var addRasToFlags = (flag, index) => rasterFlags.push(flag)

      var finishRas = lastTrans ||
        (this.activeVisibility > give.TrackObject.StatusEnum.VIS_DENSE)

      /**
       * _processSingleBlock - helper function to draw only one block
       *
       * @param  {number} blockStart - the start coordinate of the block.
       * @param  {number} blockEnd - the end coordinate of the block.
       * @param  {number} [thickStart] - the start coordinate of thick
       *    portions, which may overlap with the block.
       * @param  {number} [thickEnd] - the end coordinate of thick
       *    portions, which may overlap with the block.
       */
      var _processSingleBlock = (
        blockStart, blockEnd, thickStart, thickEnd
      ) => {
        var isThick = false
        if (blockStart < this._RasInfo.rasterStart) {
          blockStart = this._RasInfo.rasterStart
        }
        while (blockStart < blockEnd) {
          var segEnd = Math.min(blockEnd, this._RasInfo.rasterEnd)
          if (typeof thickStart === 'number' ||
            typeof thickEnd === 'number'
          ) {
            if (thickStart < segEnd && thickStart > blockStart) {
              // CDS start is in this segment
              this._RasInfo.addData(thickStart - blockStart,
                give.RasInfo.RASTER_STATES.THIN)
              blockStart = thickStart
            }
            if (thickEnd < segEnd && thickEnd > blockStart) {
              // CDS end is in this block
              this._RasInfo.addData(thickEnd - blockStart,
                give.RasInfo.RASTER_STATES.THICK)
              blockStart = thickEnd
            }
            isThick = (thickStart < segEnd) && (thickEnd > blockStart)
          } else {
            isThick = true
          }
          this._RasInfo.addData(segEnd - blockStart,
            isThick ? give.RasInfo.RASTER_STATES.THICK
              : give.RasInfo.RASTER_STATES.THIN)

          blockStart = segEnd
          if (blockStart >= this._RasInfo.rasterEnd) {
            // moved past the current raster, finish it and append to
            // rasterFlags
            this._RasInfo.next(addRasToFlags)
          }
        }
        return blockStart
      }

      var blockStart = transcript.start
      var rasterDrawIndex

      try {
        if (this.activeVisibility > give.TrackObject.StatusEnum.VIS_DENSE) {
          rasterDrawIndex = this._RasInfo.findRasIndex(blockStart)
          this._RasInfo.prepareInfo(rasterDrawIndex)
        } else {
          rasterDrawIndex = this._RasInfo.currIndex
          let targetIndex = this._RasInfo.findRasIndex(blockStart)
          while (this._RasInfo.currIndex < targetIndex) {
            this._RasInfo.next(addRasToFlags)
          }
        }

        if (transcript.numOfBlocks) {
          // Have different blocks
          let blockEnd = blockStart + transcript.blockStarts[0]
          for (let i = 0; i < transcript.numOfBlocks; i++) {
            blockStart = transcript.start +
              transcript.blockStarts[i]
            // first draw connecting lines (intron, if any)
            if (blockEnd < blockStart) {
              // fill rasters in the gap with `give.RasInfo.RASTER_STATES.LINE`
              blockEnd = Math.max(this._RasInfo.rasterStart, blockEnd)
              while (blockEnd < blockStart) {
                let segEnd = Math.min(blockStart, this._RasInfo.rasterEnd)
                this._RasInfo.addData(segEnd - blockEnd,
                  give.RasInfo.RASTER_STATES.LINE)
                if (segEnd === this._RasInfo.rasterEnd) {
                  this._RasInfo.next(addRasToFlags)
                }
                blockEnd = segEnd
              }
            }
            blockEnd = blockStart + transcript.blockSizes[i]
            _processSingleBlock(blockStart, blockEnd,
              transcript.thickStart, transcript.thickEnd
            )
          }
        } else {
          // no blocks
          _processSingleBlock(blockStart, transcript.end,
            transcript.thickStart, transcript.thickEnd)
        }
        if (finishRas) {
          this._RasInfo.next(addRasToFlags)
        }
      } catch (ignore) {
      } finally {
        // finish rasterFlags
        if (rasterFlags.length > 0) {
          let rasOutput = this._RasInfo.genRasOutput(
            rasterFlags, rasterDrawIndex)
          let coor
          rasOutput.forEach(function (rasObj, index) {
            if (rasObj.flag) {
              coor = coor || new give.ChromRegion({
                chr: transcript.chr,
                start: rasObj.start,
                end: rasObj.end,
                strand: transcript.strand
              })
              coor.end = rasObj.end
              coor.start = rasObj.start
              if (rasObj.flag === give.RasInfo.RASTER_STATES.LINE) {
                // draw spanning line
                this._drawSpanningLine(coor, colorRGB, yCoor, height)
              } else {
                this.drawRectangle(coor, colorRGB,
                  yCoor, (rasObj.flag === give.RasInfo.RASTER_STATES.THICK
                    ? 1 : halfHeightRatio) * height, null,
                  null, give.TrackDom.VALIGN_CENTER
                )
              }
            }
          }, this)
        }
      }
    }

    _drawSpanningLine (region, colorRGB, y, height) {
      height = height || 1
      y = y || 0

      if (this.regionInWindow(region) > 0) {
        var x0 = this.transformXCoordinate(region.startCoor, true)
        var x1 = this.transformXCoordinate(region.endCoor, true)
        this.drawLine(x0, y, x1, y, colorRGB)
        this.drawStrandArrows(x0, y - 0.5 * height, x1, y + 0.5 * height,
          region.getStrand(), colorRGB)
      }
    }

    static get defaultProperties () {
      return Object.assign(super.defaultProperties || {}, {
        geneMargin: 10,
        geneNoTextMargin: 2,
        geneHeightRatio: 0.8,
        forecolorIndex: 1,
        adaptiveMaxLines: 12,
        dynamicHeight: true,
        honorItemRgb: false
      })
    }
  }

  give.BedTrackDom = BedTrackDom

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
   * Object representing a BED track, see `GIVe.TrackObject` for details.
   * @typedef {object} BedTrack
   * @class give.BedTrack
   * @implements give.TrackObject
   */
  class BedTrack extends give.TrackObject {
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
      return ['bed', 'genebed', 'genepred']
    }
  }

  BedTrack._DataObjCtor = give.BedTrackData
  BedTrack._DomObjCtor = give.BedTrackDom

  give.TrackObject.registerTrack(BedTrack)

  give.BedTrack = BedTrack

  return give
})(GIVe || {})
