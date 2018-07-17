/**
 * @license
 * Copyright 2017 GIVe Authors
 * *
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
    constructor (track, properties) {
      super(...arguments)
      this.MIN_TICK_GAP = 100
      this.MIN_TICK_TEXT_MARGIN = 50
      this.MIN_TICK_TEXT_MARGIN_W_TEXTSVG = 50
      this.LINEGAP_RATIO = 2.4 // this is the actual gap used to display between ticks and numbers

      properties = properties || {}

      this._setDynamicHeight(false)
      this._setTrackMainDOMClass('coordinates')

      this._setTrackHeight(properties.height || this.tickLength +
        (this.lineGapRatio * this.LINEGAP_RATIO + 1) * this.textSize)

      if (properties.hasOwnProperty('colorIndex')) {
        this.foreColor = this.colorSet[properties.colorIndex]
      } else if (properties.hasOwnProperty('color')) {
        this.foreColor = parseInt(properties.color)
      }

      if (this.textMargin) {
        this.MIN_TICK_TEXT_MARGIN = this.MIN_TICK_TEXT_MARGIN_W_TEXTSVG
      }

      this._drawDebounceInt = 0

      this.tickLength = properties.hasOwnProperty('tickLength')
        ? properties.tickLength
        : this.constructor._DEFAULT_TICK_LENGTH

      this.minorMajorRatio = properties.hasOwnProperty('minorMajorRatio')
        ? properties.minorMajorRatio
        : this.constructor._DEFAULT_MINOR_MAJOR_RATIO

      this.minorLength = properties.hasOwnProperty('minorLength')
        ? properties.minorLength
        : this.constructor._DEFAULT_MINOR_LENGTH

      this.labelLocation = properties.hasOwnProperty('labelLocation')
        ? properties.labelLocation
        : (this.pin === 'top' ? 'up' : 'down')

      this.scrollPercentage = properties.hasOwnProperty('scrollPercentage')
        ? properties.scrollPercentage
        : this.constructor._DEFAULT_SCROLL_PERCENTAGE

      this.foreColor = properties.hasOwnProperty('foreColor')
        ? properties.foreColor
        : this.constructor._DEFAULT_FORE_COLOR
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
      viewWindow = viewWindow || this.mainSvg.viewWindow
      maxNumOfTicks = maxNumOfTicks ||
        Math.max(this.windowWidth / this.MIN_TICK_GAP, 1) + 1
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

      svgToDraw = this.mainSvg || svgToDraw

      var windowToDraw = svgToDraw.viewWindow
      labels = labels || this.labelLocation

      // first get the drawing window size from svgToDraw
      // calculate number of ticks in the svg
      var ticks = this.getRealTicks()
      ticks.forEach(function (value, index) {
        var tickX = this.transformXCoordinate(value, false, svgToDraw)
        var tickY = 0.5
        if (labels === 'up') {
          tickY += this.textSize * (1 + this.lineGapRatio * this.LINEGAP_RATIO) +
            (!value.major ? this.tickLength * (1 - this.minorLength) : 0) -
            0.5
        }
        this.drawLine(tickX, tickY, tickX,
          tickY + this.tickLength * (!value.major ? this.minorLength : 1),
          this.foreColor, svgToDraw)

        if (value.major && tickX > this.MIN_TICK_TEXT_MARGIN &&
          tickX < this.windowWidth - this.MIN_TICK_TEXT_MARGIN &&
          (labels === 'up' || labels === 'down')) {
          // add text label for the tick
          this.drawText(tickX, (labels === 'up'
            ? 0 : this.lineGapRatio * this.textSize + this.tickLength) +
            0.5 * this.textSize, value.coor, 'middle')
        }
      }, this)
      // then draw a line connecting all the ticks
      this.drawLine(0, labels === 'up' ? this.trackHeight - 0.5 : 0.5,
        this.windowWidth, labels === 'up' ? this.trackHeight - 0.5 : 0.5,
        this.foreColor, svgToDraw)

      if (labels === 'up' || labels === 'down') {
        this.drawText(this.textMargin ? this.textMargin : 0,
          (labels === 'up' ? 0.5
            : this.lineGapRatio * this.LINEGAP_RATIO * this.textSize +
              this.tickLength
          ) + 0.5 * this.textSize,
          windowToDraw.chr, this.textMargin ? 'end' : 'start', null,
          this.textMargin ? this.textSvg : this.mainSvg)
      }
    }

    wheelHandler (e, detail) {
      var diff = e.deltaY / 100 * this.scrollPercentage
      give.fireSignal('update-window', {
        windowIndex: this.windowIndex,
        newWindow: this._mainSvg.viewWindow
          .getExtension(
            diff, this.revTransXCoordinate(e.pageX -
              e.target.getBoundingClientRect().left).coor,
            true, this.parent.ref,
            Math.ceil(this.windowWidth /
              (this.MAX_SPACE_PER_BASE * this.textSize))
          ).regionToString(false)
      }, null, e.target)
    // this.setViewWindowsString(this.mainSvg.viewWindow.getExtension(
    //  diff, this.revTransXCoordinate(e.x).coor, true, this.parent.ref).regionToString(false));
    // svgTarget.needsUpdate = true;
    // this.updateChart(50);
    }
  }

  CoorTrackDom._DEFAULT_TICK_LENGTH = 9
  CoorTrackDom._DEFAULT_MINOR_MAJOR_RATIO = 0.2
  CoorTrackDom._DEFAULT_MINOR_LENGTH = 0.75

  CoorTrackDom._DEFAULT_SCROLL_PERCENTAGE = 0.3
  CoorTrackDom._DEFAULT_FORE_COLOR = 0x000000

  CoorTrackDom.PIN = 'top'
  CoorTrackDom.DYNAMIC_HEIGHT = false

  give.CoorTrackDom = CoorTrackDom

  return give
})(GIVe || {})
