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
   * Object representing a BiwWig track data object,
   * see `GIVe.TrackDataObject` for details.
   * @typedef {object} BigWigTrackData
   * @class give.BigWigTrackData
   *
   * @constructor
   * @param {TrackObjectBase} parent - The track object parent
   */
  give.BigWigTrackData = function (parent) {
    give.TrackDataObject.apply(this, arguments)
  }

  give.extend(give.TrackDataObject, give.BigWigTrackData)

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
   * @param  {object} res - Responses from remote servers.
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
  give.BigWigTrackData.prototype._dataHandler = function (res, regions) {
    /**
     * Returned data will be made up of different entries
     * Each entry will be a flat part of the bigWig file,
     * the format will be a ChromRegion object with
     * {data: {value: <actual value>} }
     */
    var preConvertData = function (resEntry) {
      return new give.ChromRegion(resEntry.regionString, this.parent.ref, {
        data: resEntry.data.hasOwnProperty('validCount')
          ? new this._SummaryCtor(resEntry.data) : resEntry.data
      })
    }.bind(this)

    for (var chrom in res) {
      var regionsInChrom = regions.filter(function (region) {
        return region.chr === chrom
      }, this)
      if (regionsInChrom.length > 0 && res.hasOwnProperty(chrom) &&
        Array.isArray(res[chrom])
      ) {
        this.getData(chrom, true).insert(res[chrom].map(preConvertData, this),
          regionsInChrom)
      }
    }
  }

  /**
   * _localFileHandler - This should be the detailed implementation about how to
   *    handle local files
   *
   * @param  {string} localFile - Path of the local file
   * @param  {Array<ChromRegionLiteral>} regions - Query regions, including
   *   potential resolutions
   */
  give.BigWigTrackData.prototype._localFileHandler = function (
    localFile, regions
  ) {
    var reader = new window.FileReader()
      // should use bigWig.readSection()
    var datapoints = {}

    reader.onload = function () {
      var bigWig = new give.BigWigFile(reader.result)
      // bigWig.readAll();
      bigWig.readSection(regions)
      datapoints = bigWig.datapoints
      console.log(datapoints)
      this.fire('response', {response: datapoints}, {
        bubbles: false, cancelable: true
      })
    }.bind(this)
    reader.readAsArrayBuffer(localFile)
  }

  /**
   * _SummaryCtor - Constructor of summary data
   * @constructor
   * @memberof TrackDataObjectBase.prototype
   */
  give.BigWigTrackData.prototype._SummaryCtor = function (oldSummary) {
    if (oldSummary) {
      this.validCount = oldSummary.validCount || 0
      this.sumData = oldSummary.sumData || 0
      this.sumSquares = oldSummary.sumSquares || 0
      this.minVal = (
        typeof oldSummary.minVal === 'number' && !isNaN(oldSummary.minVal))
        ? oldSummary.minVal : Number.POSITIVE_INFINITY
      this.maxVal = (
        typeof oldSummary.maxVal === 'number' && !isNaN(oldSummary.maxVal))
        ? oldSummary.maxVal : Number.NEGATIVE_INFINITY
      this.value = (this.validCount > 0 ? this.sumData / this.validCount : 0)
    } else {
      this.validCount = 0
      this.sumData = 0
      this.sumSquares = 0
      this.minVal = Number.POSITIVE_INFINITY
      this.maxVal = Number.NEGATIVE_INFINITY
      this.value = 0
    }
  }

  give.BigWigTrackData.prototype._SummaryCtor.prototype.addSummary = function (
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

  give.BigWigTrackData.prototype._SummaryCtor.prototype.addData = function (
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
  give.BigWigTrackData.prototype._DataStructure = give.PineTree

  return give
})(GIVe || {})
