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
   *
   * ## Response entries from remote servers for bigWig tracks
   *
   * All entries should contain a `regionString` property saying its coverage,
   * and a `data` object for actual data.
   * For raw data, only `value` is needed (for actual signal strength over
   * the region of `regionString`):
   * ```
   * {
   *   'regionString': 'chr10:12345-67890',
   *   'data': {
   *     `value`: <value>
   *   }
   * },
   * ```
   * For summary data, it should contain all properties of a summary, see
   * `give.BigWigSummaryCtor` for details:
   * ```
   * {
   *   'regionString': 'chr10:12345-67890',
   *   'data': {
   *     `validCount`: <valid_count>,
   *     `sumData`: <sum_data>,
   *     `sumSquares`: <sum_of_data_squares>,
   *     `minVal`: <minimum_value>,
   *     `maxVal`: <maximum_value>
   *   }
   * },
   * ```
   *
   * @typedef {object} BigWigTrackData
   * @class give.BigWigTrackData
   *
   * @constructor
   * @implements TrackDataObjectBase
   * @param {TrackObjectBase} parent - The track object parent
   */
  give.BigWigTrackData = function (parent) {
    give.TrackDataObject.apply(this, arguments)
  }

  give.extend(give.TrackDataObject, give.BigWigTrackData)

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
   * BigWigSummaryCtor - Constructor of summary data for bigWig tracks
   * @constructor
   *
   * @class BigWigSummaryCtor
   * @implements SummaryCtorBase
   *
   * @property {number} validCount - the number of valid counts (nucleotides)
   *    with signal
   * @property {number} sumData - the sum value of all signals
   * @property {number} sumSquares - the sum of square values of all signals
   * @property {number} minVal - the minimum value of all signals
   * @property {number} maxVal - the maximum value of all signals
   * @property {number} value - the 'value' of this summary data, should be
   *    `this.sumData / this.validCount`
   */
  give.BigWigSummaryCtor = function (node, oldSummary) {
    give.SummaryCtorBase.apply(this, arguments)
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

  give.extend(give.SummaryCtorBase, give.BigWigSummaryCtor)

  give.BigWigSummaryCtor.testRespEntry = function (respEntry) {
    return (respEntry.data && respEntry.data.hasOwnProperty('validCount'))
  }

  give.BigWigSummaryCtor.createFromResp = function (respEntry, trackDataObj) {
    return give.SummaryCtorBase.createFromResp.apply(this, arguments)
  }

  give.BigWigSummaryCtor.prototype.addSummary = function (node, summary) {
    this.validCount += summary.validCount
    this.sumData += summary.sumData
    this.sumSquares += summary.sumSquares
    this.minVal = (this.minVal <= summary.minVal)
      ? this.minVal : summary.minVal
    this.maxVal = (this.maxVal >= summary.maxVal)
      ? this.maxVal : summary.maxVal
    this.value = this.validCount > 0 ? this.sumData / this.validCount : 0
  }

  give.BigWigSummaryCtor.prototype.addData = function (node, data) {
    this.validCount += node.getLength()
    this.sumData += data.value * node.getLength()
    this.sumSquares += data.value * data.value * node.getLength()
    this.minVal = (this.minVal <= data.value) ? this.minVal : data.value
    this.maxVal = (this.maxVal >= data.value) ? this.maxVal : data.value
    this.value = this.validCount > 0 ? this.sumData / this.validCount : 0
  }

  give.BigWigTrackData._DataStructure = give.PineTree
  give.BigWigTrackData._SummaryCtor = give.BigWigSummaryCtor

  return give
})(GIVe || {})
