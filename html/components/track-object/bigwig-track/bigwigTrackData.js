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
  class BigWigTrackData extends give.TrackDataObject {
    /**
     * _readLocalFile - read a local file representing the track
     *
     * @memberof TrackDataObjectBase.prototype
     * @param  {string} fileName - name of the file
     * @async
     * @returns {Promise} returns a promise that resolves to the file content.
     */
    _readLocalFile (fileName) {
      return new Promise((resolve, reject) => {
        let reader = new window.FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsArrayBuffer(fileName)
      })
    }

    /**
     * _fileHandler - This should be the detailed implementation about how to
     *    handle local files
     *
     * @param  {string} localFile - Path of the local file
     * @param  {Array<ChromRegionLiteral>} regions - Query regions, including
     *   potential resolutions
     */
    _fileHandler (result, regions) {
      let bigWig = new give.BigWigFile(result)
      // bigWig.readAll();
      bigWig.readSection(regions)
      let datapoints = bigWig.datapoints
      return this._dataHandler(datapoints, regions)
    }
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
  class BigWigSummaryCtor extends give.SummaryCtorBase {
    constructor (chrRegion, oldSummary) {
      super(...arguments)
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
        this.minVal = 0
        this.maxVal = 0
        this.value = 0
      }
    }

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
    static _testRespEntry (entry) {
      return (entry.data && entry.data.hasOwnProperty('validCount'))
    }

    /**
     * addSummary - add summary data to this summary.
     *    This is mainly used to summarize over a series of summaries.
     *
     * @param  {GiveNonLeafNode} node    - the non-leaf node this summary is for
     * @param  {SummaryCtorBase} summary - the summary to be added
     */
    addSummary (node, summary) {
      this.sumData += summary.sumData
      this.sumSquares += summary.sumSquares
      this.minVal = (this.validCount > 0 && this.minVal <= summary.minVal)
        ? this.minVal : summary.minVal
      this.maxVal = (this.validCount > 0 && this.maxVal >= summary.maxVal)
        ? this.maxVal : summary.maxVal
      this.validCount += summary.validCount
      this.value = this.validCount > 0 ? this.sumData / this.validCount : 0
    }

    /**
     * addData - add raw data entry to this summary
     *    This is mainly used to summarize over raw data entries.
     *
     * @param  {GiveNonLeafNode} node - the non-leaf node this summary is for
     * @param  {object} data - the raw data object to be added
     */
    addData (node, data) {
      this.sumData += data.value * node.length
      this.sumSquares += data.value * data.value * node.length
      this.minVal = (this.validCount > 0 && this.minVal <= data.value)
        ? this.minVal : data.value
      this.maxVal = (this.validCount > 0 && this.maxVal >= data.value)
        ? this.maxVal : data.value
      this.validCount += node.length
      this.value = this.validCount > 0 ? this.sumData / this.validCount : 0
    }
  }

  BigWigTrackData._DataStructure = give.PineTree
  BigWigTrackData._SummaryCtor = BigWigSummaryCtor

  give.BigWigTrackData = BigWigTrackData

  return give
})(GIVe || {})
