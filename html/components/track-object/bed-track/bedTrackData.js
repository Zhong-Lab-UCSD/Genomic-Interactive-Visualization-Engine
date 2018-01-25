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
  give.BedTrackData = function (parent) {
    give.TrackDataObject.apply(this, arguments)
  }

  give.extend(give.TrackDataObject, give.BedTrackData)

  give.BedTrackData.prototype._dataHandler = function (res, regions) {
    // this is to handle data within response
    // return data should be already sorted by chrom and start

    // first, purge buffer if different chromosome
    //      for(var chrom in this.data) {
    //        if(this.data.hasOwnProperty(chrom) && !res.hasOwnProperty(chrom)) {
    //          // not the same chromosome
    //          delete this.data[chrom];
    //        }
    //      }
    var resChromEntryFunc = function (geneArray, geneNameMap, resChromEntry) {
      var newGene = new give.GeneObject(
        new give.TranscriptObject(resChromEntry.geneBed,
          this.parent.ref,
          { geneName: resChromEntry.geneSymbol }
        )
      )
      if (this.parent.getTypeTrunk().indexOf('gene') > -1) {
        // is some gene oriented type
        if (geneNameMap.hasOwnProperty(newGene.name) &&
          geneNameMap[newGene.name].overlaps(newGene)
        ) {
          // check if it overlaps with existing gene(s)
          // because the gene list is sorted by start,
          //    whenever it doesn't overlap with the current gene
          //    it will become a new gene entry.
          geneNameMap[newGene.name].merge(newGene)
        } else {
          geneArray.push(newGene)
          geneNameMap[newGene.name] = newGene
        }
      } else {
        geneArray.push(newGene)
      }
    }

    for (var chrom in res) {
      var regionsInChrom = regions.filter(function (region) {
        return region.chr === chrom
      }, this)
      if (regionsInChrom.length > 0 && res.hasOwnProperty(chrom) &&
        Array.isArray(res[chrom])
      ) {
        var geneNameMap = {}
        var geneArray = []
        res[chrom].forEach(
          resChromEntryFunc.bind(this, geneArray, geneNameMap), this
        )
        // then populate the B+ Tree with geneArray
        this.getData(chrom, true).insert(
          geneArray.sort(give.ChromRegion.compareChrRegion), regionsInChrom)
      }
    }
  }

  give.BedTrackData.prototype._localFileHandler = function (localFile, regions) {
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

    var reader = new window.FileReader()
    var result = {}
    reader.onload = function (e) {
      var lines = e.target.result.split(/\r\n|\r|\n/g)
      lines.forEach(function (line) {
        var transcript = new give.TranscriptObject(line)
        if (regions.some(function (region) {
          return transcript.overlaps(region)
        }, this)) {
          // needs to push this line to result
          if (!result.hasOwnProperty(transcript.chr)) {
            result[transcript.chr] = []
          }
          result[transcript.chr].push({geneBed: line})
        }
      }, this)
      this._dataHandler(result, regions)
    }.bind(this)
    reader.readAsText(localFile)
  }

  /**
   * _SummaryCtor - Constructor of summary data
   * @constructor
   * @memberof TrackDataObjectBase.prototype
   */
  give.BedTrackData.prototype._SummaryCtor = function (oldSummary) {
    if (oldSummary) {

    } else {
      this.summaryLength
    }
  }

  give.BedTrackData.prototype._SummaryCtor.prototype.addSummary = function (
    summary
  ) {
    this.validCount += summary.validCount
    this.sumData += summary.sumData
    this.sumSquares += summary.sumSquares
    this.minVal = (this.minVal <= summary.minVal)
      ? this.minVal : summary.minVal
    this.maxVal = (this.maxVal >= summary.maxVal)
      ? this.maxVal : summary.maxVal
    this.value = this.validCount > 0 ? this.sumData / this.validCount : 0
  }

  give.BedTrackData.prototype._SummaryCtor.prototype.addData = function (
    data, length
  ) {
    // data can be either a summary or actual components
    // TODO: if data supports data.getLength(), use data.getLength() instead
    if (data instanceof this.constructor) {
      this.addSummary(data)
    } else {
      this.validCount += length
      this.sumData += data.value * length
      this.sumSquares += data.value * data.value * length
      this.minVal = (this.minVal <= data.value) ? this.minVal : data.value
      this.maxVal = (this.maxVal >= data.value) ? this.maxVal : data.value
      this.value = this.validCount > 0 ? this.sumData / this.validCount : 0
    }
  }

  /**
   * _DataStructure - Constructor for underlying data structure used in
   *   `this._data`. Default value is `GIVE.OakTree`
   * @constructor
   * @memberof TrackDataObjectBase.prototype
   */
  give.BedTrackData.prototype._DataStructure = give.PineTree

  return give
})(GIVe || {})
