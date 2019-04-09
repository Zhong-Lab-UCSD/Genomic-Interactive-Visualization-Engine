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
      data.traverse(this.viewWindow,
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
    0x99DDFF, 0x44BB99, 0xBBCC33, 0xAAAA00,
  ]

  give.HighlightTrackDom = HighlightTrackDom

  return give
})(GIVe || {})
