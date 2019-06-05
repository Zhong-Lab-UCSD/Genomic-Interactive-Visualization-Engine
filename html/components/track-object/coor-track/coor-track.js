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

  class CoorTrackDom extends give.TrackDom {
    _initProperties (properties) {
      super._initProperties(properties)

      this.trackMainDOMClass = 'coordinates'

      this.minTickGap = this._initPropertyItem(
        'minTickGap', properties, 'minTickGap', 'integer')
      this.minTickTextMargin = this._initPropertyItem(
        this.textMargin ? 'minTickTextMarginWithTextSvg' : 'minTickTextMargin',
        properties,
        this.textMargin ? 'minTickTextMarginWithTextSvg' : 'minTickTextMargin',
        'integer')
      // this is the actual gap used to display between ticks and numbers
      // unit is number of line gaps
      this.tickNumberGapRatio = this._initPropertyItem(
        'tickNumberGapRatio', properties, 'tickNumberGapRatio', 'float')

      this.tickLength = this._initPropertyItem(
        'tickLength', properties, 'tickLength', 'integer')

      this.minorMajorRatio = this._initPropertyItem(
        'minorMajorRatio', properties, 'minorMajorRatio', 'float')

      this.minorLength = this._initPropertyItem(
        'minorLength', properties, 'minorLength', 'float')

      this.labelLocation = properties.hasOwnProperty('labelLocation')
        ? properties.labelLocation
        : this._getLabelLocation(this.parent.getSetting('pin'),
          !!properties.reverseFlag)

      this.scrollPercentage = this._initPropertyItem(
        'scrollPercentage', properties, 'scrollPercentage', 'float')
    }

    static get defaultProperties () {
      return Object.assign(super.defaultProperties || {}, {
        _drawDebounceInt: 0,
        tickLength: 9,
        minorMajorRatio: 0.2,
        tickNumberGapRatio: 2.4,
        minorLength: 0.75,
        scrollPercentage: 0.3,
        minTickGap: 100,
        minTickTextMargin: 50,
        minTickTextMarginWithTextSvg: 50,
        pin: 'top'
      })
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
      this.drawCoordinates()
    }

    // ** coordinate handling **

    getRealTicks (viewWindow, maxNumOfTicks) {
    // will get the span between ticks for viewWindow
    // should be an array of [1,2,5] * 10^x
    // the results will contain two sets of ticks
      viewWindow = viewWindow || this.viewWindow
      maxNumOfTicks = maxNumOfTicks ||
        Math.max(this.windowWidth / this.minTickGap, 1) + 1
      var span = viewWindow.length / maxNumOfTicks
      var minorSpan
      if (Math.ceil(span) > 0) {
      // round up to closest [1,2,5] * 10^x
        var spanExp = parseInt(Math.log(span) / Math.LN10)
        var spanHeader = span / Math.pow(10, spanExp)
        if (spanHeader > 5) {
          spanExp++
          spanHeader = 1
        } else if (spanHeader > 2) {
          spanHeader = 5
        } else if (spanHeader > 1) {
          spanHeader = 2
        }
        span = spanHeader * Math.pow(10, spanExp)
      }
      span = Math.ceil(span)
      if (span <= 0) {
        span = 1
      }

      minorSpan = Math.ceil(span * this.minorMajorRatio)

      var currIndex = Math.ceil(viewWindow.start / minorSpan) * minorSpan
      var result = [{
        chr: viewWindow.chr, coor: currIndex, major: !(currIndex % span)
      }]
      currIndex += minorSpan
      while (currIndex < viewWindow.end) {
        result.push({
          chr: viewWindow.chr, coor: currIndex, major: !(currIndex % span)
        })
        currIndex += minorSpan
      }
      return result
    }

    drawCoordinates (svgToDraw, labels) {
      // svgToDraw is the DOM svg component (the track element, not the figure itself)
      // windowToDraw is the window object (chr, start, end, subwindows)
      // this will draw coordinate for windowToDraw at the top of svgToDraw
      // labels will be some values to indicate whether a label needs to be included:
      //    'up' means the labels will be put on top of the ticks
      //    'down' means the labels will be put below the ticks

      svgToDraw = this._mainSvg || svgToDraw

      var windowToDraw = svgToDraw.viewWindow
      labels = labels || this.labelLocation

      // first get the drawing window size from svgToDraw
      // calculate number of ticks in the svg
      var ticks = this.getRealTicks()
      ticks.forEach(function (value, index) {
        var tickX = this.transformXCoordinate(value, false, svgToDraw)
        var tickY = 0.5
        if (labels === 'up') {
          tickY += this.textSize *
            (1 + this.lineGapRatio * this.tickNumberGapRatio) +
            (!value.major ? this.tickLength * (1 - this.minorLength) : 0) -
            0.5
        }
        this.drawLine(tickX, tickY, tickX,
          tickY + this.tickLength * (!value.major ? this.minorLength : 1),
          this.forecolorIndex, svgToDraw)

        if (value.major && tickX > this.minTickTextMargin &&
          tickX < this.windowWidth - this.minTickTextMargin &&
          (labels === 'up' || labels === 'down')) {
          // add text label for the tick
          this.drawText(tickX, (labels === 'up'
            ? 0 : this.lineGapRatio * this.textSize + this.tickLength) +
            0.5 * this.textSize, value.coor, 'middle')
        }
      }, this)
      // then draw a line connecting all the ticks
      this.drawLine(0, labels === 'up' ? this.height - 0.5 : 0.5,
        this.windowWidth, labels === 'up' ? this.height - 0.5 : 0.5,
        this.constructor.colorSet[this.forecolorIndex], svgToDraw)

      if (labels === 'up' || labels === 'down') {
        this.drawText(this.textMargin ? this.textMargin : 0,
          (labels === 'up' ? 0.5
            : this.lineGapRatio * this.tickNumberGapRatio * this.textSize +
              this.tickLength
          ) + 0.5 * this.textSize,
          windowToDraw.chr, this.textMargin ? 'end' : 'start', null,
          this.textMargin ? this._textSvg : this._mainSvg)
      }
    }

    wheelHandler (e, detail) {
      var diff = e.deltaY / 100 * this.scrollPercentage
      give.fireSignal('update-window', {
        windowIndex: this.windowIndex,
        newWindow: this.viewWindow
          .getExtension(
            diff, this.revTransXCoordinate(e.pageX -
              e.target.getBoundingClientRect().left).coor,
            true, this.parent.refObj,
            Math.ceil(this.windowWidth /
              (this.MAX_SPACE_PER_BASE * this.textSize))
          ).regionToString(false)
      }, null, e.target)
    }
  }

  give.CoorTrackDom = CoorTrackDom

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
  class CoorTrack extends give.TrackObject {
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
      return ['coordinate', 'coor']
    }

    constructor () {
      super(...arguments)
      if (!this.getSetting('pin')) {
        this.setSetting('pin', 'top')
      }
    }
  }

  // specify the visualization object used in this track
  CoorTrack._DomObjCtor = give.CoorTrackDom

  // __IMPORTANT:__ register this new track type
  give.TrackObject.registerTrack(CoorTrack)

  give.CoorTrack = CoorTrack

  return give
})(GIVe || {})
