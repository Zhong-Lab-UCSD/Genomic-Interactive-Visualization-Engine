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
 * `<bigwig-track-dom>` is the Web Component to display BigWig tracks. It's part
 * of `GIVe.BigWigTrack` object and is used to visualize data from the
 * `GIVe.BigWigTrack` object.
 *
 * ### Visibility level
 *
 * ### References
 * *   [`GIVe.TrackObject`](../index.html) for details on tracks in
 * general;
 * *   [`GIVe.BigWigTrack`](./bed-track/index.html) for details on BED
 * track implementation;
 * *   [Polymer element registration](https://www.polymer-project.org/1.0/docs/devguide/registering-elements)
 * for Polymer Element guide, including lifecycles, properties, methods and others.
 */
var GIVe = (function (give) {
  'use strict'

  class BigWigTrackDom extends give.TrackDom {
    constructor (track, props) {
      super(...arguments)
      this.MARGIN = 2
      this.FORECOLOR_INDEX = 0 // the color index for fore color
      this.TEXT_COLOR_RGB = 0 // the color index for text
      this.OVERFLOW_COLOR_INDEX = 7 // the color index for overflow (red)

      /**
       * the width of the line that is used for the overflow
       */
      this.OVERFLOW_STROKE_WIDTH = 4

      /**
       * to be explained
       */
      this.SCALE_TEXT_SIZE = 9

      /**
       *     to be explained
       */
      this.MIN_RESOLUTION_PER_PIXEL = 1

      /**
       * The upper bound for the track display. Any values above this will be displayed as a overflow line.
       */
      this.windowMax = (
        track.getSetting('windowMax', 'float') ||
        BigWigTrackDom._DEFAULT_MAX
      )

      /**
       * The lower bound for the track display. One might think that this is obviously zero, but in some cases there are actually negative intensity values at a point.
       */
      this.windowMin = track.getSetting('windowMin', 'float') ||
        BigWigTrackDom._DEFAULT_MIN

      if (!(this.windowMax > this.windowMin)) {
        give._verbConsole.warn(
          'Window Range Error: windowMax = ' +
          this.windowMax + '; windowMin = ' + this.windowMin
        )
        give.fireSignal('warning',
          { msg: 'Window Range Error: windowMax = ' +
          this.windowMax + '; windowMin = ' + this.windowMin })
        this.windowMax = BigWigTrackDom._DEFAULT_MAX
        this.windowMin = BigWigTrackDom._DEFAULT_MIN
      }

      /**
       * The height of the track, presumably in pixels. This is not the same as the window bounds, which are instead the bounds for the actual data values. If the difference between the windowMax and the windowMin is 20, and the track height is 80, then four pixels would represent one 'unit'.
       */
      try {
        this.setHeight(track.getSetting('height', 'integer'))
      } catch (e) {
        this.setHeight(BigWigTrackDom._DEFAULT_HEIGHT)
      }

      this.labelMarginRight = this.MARGIN + this.TEXT_MARGIN_GAP

      /**
       * to be explained
       */
      this.scaleTickLength = 5

      /**
       *  A simple calculation of where the top and bottom of where to draw the track is.
       */
      this.drawingBoundary = {top: this.MARGIN, bottom: this.height - this.MARGIN}

      /**
       * to be explained
       */
      this.windowRange = 0

      /**
       * Whether or not to automatically scale the window bounds according to the data displayed.
       */
      this.autoScale = this.constructor._DEFAULT_AUTOSCALE
      if (props.hasOwnProperty('autoScale')) {
        this.autoScale = props.autoScale
      } else if (track.hasSetting('autoScale')) {
        this.autoScale = track.getSetting('autoScale', 'boolean')
      }

      /**
       * Whether or not to automatically scale the window bounds according to the data displayed.
       */
      this.includeZero = this.constructor._DEFAULT_INCLUDE_ZERO
      if (props.hasOwnProperty('includeZero')) {
        this.includeZero = props.includeZero
      } else if (track.hasSetting('includeZero')) {
        this.includeZero = track.getSetting('includeZero', 'boolean')
      }

      this.upperPercentile = (
        props.upperPercentile ||
        track.getSetting('upperPercentile', 'float') ||
        this.constructor._DEFAULT_UPPER_PERCENTILE
      )

      this.lowerPercentile = (
        props.lowerPercentile ||
        track.getSetting('lowerPercentile', 'float') ||
        this.constructor._DEFAULT_LOWER_PERCENTILE
      )

      this.numOfDigits = (
        props.numOfDigits ||
        track.getSetting('numOfDigits', 'integer') ||
        this.constructor._DEFAULT_NUM_OF_DIGITS
      )

      /**
       * The amount of points used around one point; an average value of the points is displayed rather than the actual value at any given point.
       */
      this.averagePointAmount = 10
      // this.dataPoints=[]
      this.slidingWindowWidth = 5 // sliding window size (single side)
      this.dataPoints = []
    }

    /**
     * anonymous function - description
     *
     * @return {type}  returns the resolution.
     */
    _getResolution (newVWindow, index) {
      return Math.max(Math.floor(
        newVWindow.length / this.windowWidth /
        this.MIN_RESOLUTION_PER_PIXEL
      ), 1)
    }

    _pushSingleRawPointEntry (
      dataPointArray, chrRange, dataEntry
    ) {
      // start is the end of the last entry in dataPointArray
      // or chrRange.start
      let start = chrRange.start
      let lastElem = dataPointArray[dataPointArray.length - 1]
      if (lastElem && lastElem.end) {
        // lastElem is a ChromRegion object, may need to add some data
        if (lastElem.overlaps(dataEntry) > 0) {
          lastElem.data.value += dataEntry.data.value *
            lastElem.overlaps(dataEntry) / lastElem.length
        }
        start = lastElem.end
      }
      if (start < dataEntry.end) {
        let span = Math.max(parseInt(chrRange.resolution) || 1, 1)
        let chrSpan = new give.ChromRegion({
          chr: chrRange.chr,
          start: start,
          end: start + span
        })
        while (chrSpan.start < dataEntry.end &&
          chrSpan.start < chrRange.end
        ) {
          // This will insert 0 in the gaps, split value in overlaps
          // and have full value afterwards
          let newData = chrSpan.clone()
          newData.data = {
            value: dataEntry.data.value * newData.overlaps(dataEntry) /
              newData.length
          }
          dataPointArray.push(newData)
          chrSpan.move(span)
        }
      }
    }

    _generateRawPointsList (vwindow) {
      var rawDataPoints = []
      // First populate the raw data points
      this.parent.getData(vwindow.chr).traverse(vwindow,
        entry => this._pushSingleRawPointEntry(rawDataPoints, vwindow, entry),
        null, false)
      // Insert more zeroes to the end
      var lastEnd = rawDataPoints.length
        ? rawDataPoints[rawDataPoints.length - 1].end
        : vwindow.start
      while (lastEnd < vwindow.end) {
        rawDataPoints.push(new give.ChromRegion({
          chr: vwindow.chr,
          start: lastEnd,
          end: lastEnd + vwindow.resolution
        }, this.parent.ref, { data: { value: 0.0 } }))
        lastEnd += vwindow.resolution
      }
      return rawDataPoints
    }

    _generateSmoothedPoints () {
      // Get the smoothing points
      var vwindow = this.viewWindow
      var slidingWindowSpan = this._getResolution(vwindow) *
        this.slidingWindowWidth * this.MIN_RESOLUTION_PER_PIXEL
      var halfWindowIndexLength = Math.ceil(this.slidingWindowWidth *
        this.MIN_RESOLUTION_PER_PIXEL / 2)
      var extendedWindow = vwindow.getExtension(slidingWindowSpan)
        .clipRegion(this.parent.ref)
      extendedWindow.resolution = this._getResolution(vwindow)

      // Get the raw points list first
      var rawDataPoints = this._generateRawPointsList(extendedWindow)

      // Then smooth out with this.slidingWindowWidth
      // Needs to check if the borders do not have enough points

      // Prepare for the sliding sumData
      var smoothedPointsList = []

      for (var currIndex = 0; currIndex < rawDataPoints.length; currIndex++) {
        var slidingSum = 0
        var windowElemCount = 0
        for (var i = -halfWindowIndexLength; i <= halfWindowIndexLength; i++) {
          if (rawDataPoints[currIndex + i]) {
            slidingSum += rawDataPoints[currIndex + i].data.value
            windowElemCount++
          }
        }
        smoothedPointsList.push(new give.ChromRegion({
          chr: vwindow.chr,
          start: rawDataPoints[currIndex].start,
          end: rawDataPoints[currIndex].end
        }, this.parent.ref, { data: { value: slidingSum / windowElemCount } }))
      }
      return smoothedPointsList
    }

    _findAutoScale () {
      this.windowMax = this.includeZero ? 0 : Number.NEGATIVE_INFINITY
      this.windowMin = this.includeZero ? 0 : Number.POSITIVE_INFINITY
      try {
        var extremities = give._findPercentile(this.dataPoints.map(
          function (dataEntry) {
            return dataEntry.data.value
          }, this), this.upperPercentile, this.lowerPercentile)
        if (this.windowMax < extremities.upper) {
          this.windowMax = extremities.upper
        }
        if (this.windowMin > extremities.lower) {
          this.windowMin = extremities.lower
        }
      } catch (ignore) {
      }
      if (!(this.windowMax > this.windowMin)) {
        this.windowMax = 1
        this.windowMin = 0
      }
    }

    drawData () {
      // default drawing mode is 0 (sliding window smoothing)
      var mode = parseInt(give.getParameterByName('mode') || 0)
      // draw the given point with height determined by signal strength
      this.clear()
      var vwindow = this.mainSvg.viewWindow
      if (this.parent.getData(vwindow.chr)) {
        this.dataPoints = this._generateSmoothedPoints()
        if (this.autoScale) {
          this._findAutoScale()
        }
        if (mode === 0) {
          this.drawPeak(this.dataPoints)
        }
        if (mode === 1) {
          this.bSpline()
        }
        if ((mode === 2) || (mode === 3)) {
          this.newBCurve()
        }
      }
      this.drawScale()
    }

    /**
     * anonymous function - transforms a signal strength into a y coordinate on the svg.
     *
     * @param  {type} signal signal strength
     * @param  {type} flags  has two booleans
     * @return {type}        returns the y coordinate
     */
    transformYCoordinate (signal, flags) {
    // transform Y coordinate from signal with this.windowMin and this.windowMax
    // notice that if the value exceeds either boundary,
    // it will return the Y value at the boundary, but will mark flags.EXCEED_MAX or flags.EXCEED_MIN as true
    // (flags needs to be an object from the caller to receive such values)
      flags = flags || {}
      delete flags.EXCEED_MIN
      delete flags.EXCEED_MAX // clear flags first
      if (signal > this.windowMax) {
        flags.EXCEED_MAX = true
        return this.drawingBoundary.top
      } else if (signal < this.windowMin) {
        flags.EXCEED_MIN = true
        return this.drawingBoundary.bottom
      }
      return (signal - this.windowMax) / (this.windowMin - this.windowMax) *
      (this.drawingBoundary.bottom - this.drawingBoundary.top) + this.drawingBoundary.top
    }

    /**
     * anonymous function - scales a line to be drawn based on window ranges, assuming autoscale is being used.
     *
     * @param  {type} strength description
     * @param  {type} extremes description
     * @return {type}          description
     */
    scaleLine (strength, extremes) {
      var zero, value
      if (extremes[0] < 0 && extremes[1] > 0) { // if range is from - to +
        zero = ((0 - extremes[0]) / extremes[3] * this.height)
        value = ((value - extremes[0]) / extremes[3] * this.height)
      } else { // if range is only + or only -
        if (extremes[0] > 0 && extremes[1] > 0) { // if range is only +
          zero = 0
          value = (value / extremes[1] * this.height)
        } else if (extremes[0] > 0 && extremes[1] > 0) { // if range is only -
          zero = this.height
          value = this.height - (value / extremes[1] * this.height)
        } else {
        // there is something wrong
        }
      }
      return [this.height - zero, this.height - value]
    }

    /**
     * anonymous function - scales a line to be drawn based on the custom window range.
     *
     * @param  {type} strength description
     * @return {type}          description
     */
    scaleLineCustom (strength) {
      var zero = 0
      var value = 0
      var cutOff = 0
      zero = this.windowMax / this.windowRange * this.height
      value = (this.windowMax - strength) / this.windowRange * this.height
      if (this.windowMax < 0) {
        zero = 0
        cutOff += 1
      }
      if (this.windowMin > 0) {
        zero = this.height
        cutOff -= 1
      }
      if (strength > this.windowMax) {
        value = 0
        cutOff += 1
      }
      if (strength < this.windowMin) {
        value = this.height
        cutOff -= 1
      }
      if ((this.windowMin > 0 && strength > this.windowMax) || (this.windowMax < 0 && strength < this.windowMin)) {
        cutOff += 3
      }
      return [zero, value, cutOff]
    }

    /**
     * anonymous function - Draws the horizontal thick, diferent colored lines where the values go further than the window ranges.
     *
     * @param  {type} overflows the list of overflow areas
     * @return {type}           description
     */
    drawOverflowLines (overflows) {
    // overflows is an object containing overflowing ChrRegions
    // { 'exceedMax': Array(), 'exceedMin': Array() }
    // purple

      var drawOverflowRect = function (y, region) {
        this.drawRectangle(region, this.rgbToHex(this.colorSet[this.OVERFLOW_COLOR_INDEX]),
          y, this.OVERFLOW_STROKE_WIDTH, this.mainSvg)
      }.bind(this)
      overflows.exceedMax.forEach(drawOverflowRect.bind(null, 0))
      overflows.exceedMin.forEach(drawOverflowRect.bind(null, this.height - this.OVERFLOW_STROKE_WIDTH))
    }

    /**
     * anonymous function - Adds a point from the dataEntry to the datapoints.
     *
     * @param  {type} dataEntry holds many points, just not in the correct format (yet).
     * @return {type}           description
     */
    addPoint (vwindowChr, dataEntry) {
      // var x = dataEntry.start
      // var y = dataEntry.end
      // var z = dataEntry.data instanceof give.TrackObjectImpl._BigWigImpl.SummaryCtor
      //   ? dataEntry.data.sumData / dataEntry.length : dataEntry.data.value
      // var vwindow = this.mainSvg.viewWindow
      this.parent.data[vwindowChr].dataPoints.push(dataEntry)
    }
    // another function called draw splines? which converts the four bezier  points to scale on the svg and draws them as a curve?
    // use svg function

    drawBCurve (bPoints) {
      var svgToDraw = this.mainSvg
      var BCurve = document.createElementNS(this.svgNS, 'path')
      BCurve.setAttribute('d', 'M' + bPoints[0][0] + ' ' + bPoints[0][1] + ' C ' + bPoints[1][0] + ' ' + bPoints[1][1] + ' ' + bPoints[2][0] + ' ' + bPoints[2][1] + ' ' + bPoints[3][0] + ' ' + bPoints[3][1])// use c for the rest
      BCurve.setAttribute('stroke', 'black')
      BCurve.setAttribute('fill', 'transparent')
      this.addElement(BCurve, svgToDraw)
    }
    drawDownLine (x, y) {
      var svgToDraw = this.mainSvg
      var DownLine = document.createElementNS(this.svgNS, 'line')
      DownLine.setAttribute('x1', x)
      DownLine.setAttribute('x2', x)
      DownLine.setAttribute('y1', y)
      DownLine.setAttribute('y2', 0)
      DownLine.setAttribute('stroke', 'black')
      this.addElement(DownLine, svgToDraw)
    }
    bSpline (points) {
      // for each (four?) points: calculate the tripmid point things, store them as p1.t2 , p2.t1, p2.t2, p3.t1, p3.t2, p4.t1
      // calculate the midpoints of each connected trimidpoint pair, store as p2.m, p3.m
      // calculate input the points as bezier: p2.m, p2.t2, p3.t1, p3.m, with the middle two as control points.
      // this should take points and bspline it?    ToDo: create separate functions for regular average and bspline, to switch between them easily.
      var vwindow = this.mainSvg.viewWindow
      var windowToDraw = this.mainSvg.viewWindow
      for (var i = 0; i < this.parent.data[vwindow.chr].dataPoints.length - 4; i++) { // calculate thirdpoints and put them in arrays
        var p1 = this.parent.data[vwindow.chr].dataPoints[i]
        var p2 = this.parent.data[vwindow.chr].dataPoints[i + 1]// reassign for easier coding
        var p3 = this.parent.data[vwindow.chr].dataPoints[i + 2]
        var p4 = this.parent.data[vwindow.chr].dataPoints[i + 3]
        var broken = false
        for (var j = i; j < i + 3; j++) {
          if (this.parent.data[vwindow.chr].dataPoints[j].end !== this.parent.data[vwindow.chr].dataPoints[j + 1].start) {
            broken = true// draw line down, might be drawn more than once
            this.drawDownLine(this.transformXCoordinate({
              chr: windowToDraw.chr, coor: (this.parent.data[vwindow.chr].dataPoints[j].start)
            }, false), this.transformYCoordinate(this.parent.data[vwindow.chr].dataPoints[j].data.value))
            this.drawDownLine(this.transformXCoordinate({
              chr: windowToDraw.chr, coor: (this.parent.data[vwindow.chr].dataPoints[j + 1].start)
            }, false), this.transformYCoordinate(this.parent.data[vwindow.chr].dataPoints[j + 1].data.value))
          }
        }
        if (broken) {
          continue
        }
        //    p1.t2 = [(p1.start + 1 / 3 * (p2.start - p1.start)), (p1.value + 1 / 3 * (p2.value - p1.value))]
        // draw lines between points, split lines into thirds
        p2.t1 = [(p1.start + 2 / 3 * (p2.start - p1.start)), (p1.data.value + 2 / 3 * (p2.data.value - p1.data.value))]
        p2.t2 = [(p2.start + 1 / 3 * (p3.start - p2.start)), (p2.data.value + 1 / 3 * (p3.data.value - p2.data.value))]
        p3.t1 = [(p2.start + 2 / 3 * (p3.start - p2.start)), (p2.data.value + 2 / 3 * (p3.data.value - p2.data.value))]
        p3.t2 = [(p3.start + 1 / 3 * (p4.start - p3.start)), (p3.data.value + 1 / 3 * (p4.data.value - p3.data.value))]
        //    p4.t1 = [(p3.start + 2 / 3 * (p4.start - p3.start)), (p4.value + 2 / 3 * (p4.value - p3.value))]
        p2.midPoint = [(p2.t1[0] + p2.t2[0]) / 2, (p2.t1[1] + p2.t2[1]) / 2]
        p3.midPoint = [(p3.t1[0] + p3.t2[0]) / 2, (p3.t1[1] + p3.t2[1]) / 2]
        var bPoints = [p2.midPoint, p2.t2, p3.t1, p3.midPoint]
        p2.adjustedMidPoint = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p2.midPoint[0]) }, false), this.transformYCoordinate(p2.midPoint[1])]
        p2.adjustedt2 = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p2.t2[0]) }, false), this.transformYCoordinate(p2.t2[1])]
        p3.adjustedt1 = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p3.t1[0]) }, false), this.transformYCoordinate(p3.t1[1])]
        p3.adjustedMidPoint = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p3.midPoint[0]) }, false), this.transformYCoordinate(p3.midPoint[1])]
        var adjustedBPoints = [p2.adjustedMidPoint, p2.adjustedt2, p3.adjustedt1, p3.adjustedMidPoint]
        this.drawBCurve(adjustedBPoints)
      }
      // this.transformXCoordinate({chr: windowToDraw.chr, coor: (start + end) / 2}, false)
      // drawSpline(points)
    }
    newBCurve () { // this one fills it too. note that some zooms have less than four points to workwith.
      var vwindow = this.mainSvg.viewWindow
      var svgToDraw = this.mainSvg
      var curveStart = 0
      var zeroCounter = 0 // if its is equal to 3 then consider new polygon
      var mode = parseInt(give.getParameterByName('mode') || '2')
      if (mode == 2) {
        for (var i = 0; i < this.parent.data[vwindow.chr].dataPoints.length - 2; i++) {
          if (this.parent.data[vwindow.chr].dataPoints[i].end != this.parent.data[vwindow.chr].dataPoints[i + 1].start) {
            this.newDrawBCurve(curveStart, i + 1)
            curveStart = i + 1// will add in 0s to datapoints, need to break them if three in a row, also move to midpoinnt vs getStart
          }
        }
      }
      if (mode === 3) {
        for (var i = 0; i < this.parent.data[vwindow.chr].dataPoints.length - 2; i++) { // this is with 0's.
          if (this.parent.data[vwindow.chr].dataPoints[i].data.value == 0) {
            zeroCounter += 1
          }
          if (zeroCounter >= 3) {
            this.newDrawBCurve(curveStart, i + 1)
            curveStart = i + 1// will add in 0s to datapoints, need to break them if three in a row, also move to midpoinnt vs getStart
            zeroCounter = 0
          }
        }
      }
    }
    calculateSvgCurvePoints (i) {
      var vwindow = this.mainSvg.viewWindow
      var svgToDraw = this.mainSvg
      var windowToDraw = this.mainSvg.viewWindow
      var p1 = this.parent.data[vwindow.chr].dataPoints[i]
      var p2 = this.parent.data[vwindow.chr].dataPoints[i + 1]// reassign for easier coding
      var p3 = this.parent.data[vwindow.chr].dataPoints[i + 2]
      var p4 = this.parent.data[vwindow.chr].dataPoints[i + 3]

        //    p1.t2 = [(p1.start + 1 / 3 * (p2.start - p1.start)), (p1.value + 1 / 3 * (p2.value - p1.value))]
        // draw lines between points, split lines into thirds
      p2.t1 = [(p1.start + 2 / 3 * (p2.start - p1.start)), (p1.data.value + 2 / 3 * (p2.data.value - p1.data.value))]
      p2.t2 = [(p2.start + 1 / 3 * (p3.start - p2.start)), (p2.data.value + 1 / 3 * (p3.data.value - p2.data.value))]
      p3.t1 = [(p2.start + 2 / 3 * (p3.start - p2.start)), (p2.data.value + 2 / 3 * (p3.data.value - p2.data.value))]
      p3.t2 = [(p3.start + 1 / 3 * (p4.start - p3.start)), (p3.data.value + 1 / 3 * (p4.data.value - p3.data.value))]
        //    p4.t1 = [(p3.start + 2 / 3 * (p4.start - p3.start)), (p4.value + 2 / 3 * (p4.value - p3.value))]
      p2.midPoint = [(p2.t1[0] + p2.t2[0]) / 2, (p2.t1[1] + p2.t2[1]) / 2]
      p3.midPoint = [(p3.t1[0] + p3.t2[0]) / 2, (p3.t1[1] + p3.t2[1]) / 2]
      var bPoints = [p2.midPoint, p2.t2, p3.t1, p3.midPoint]
      p2.adjustedMidPoint = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p2.midPoint[0]) }, false), this.transformYCoordinate(p2.midPoint[1])]
      p2.adjustedt2 = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p2.t2[0]) }, false), this.transformYCoordinate(p2.t2[1])]
      p3.adjustedt1 = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p3.t1[0]) }, false), this.transformYCoordinate(p3.t1[1])]
      p3.adjustedMidPoint = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p3.midPoint[0]) }, false), this.transformYCoordinate(p3.midPoint[1])]
      var adjustedBPoints = [p2.adjustedMidPoint, p2.adjustedt2, p3.adjustedt1, p3.adjustedMidPoint]
      return adjustedBPoints
    }
    newDrawBCurve (start, end) {
      var vwindow = this.mainSvg.viewWindow
      var svgToDraw = this.mainSvg
      var windowToDraw = this.mainSvg.viewWindow
      var BCurve = document.createElementNS(this.svgNS, 'path')
      var d = 'M'
      BCurve.setAttribute('stroke', 'black')
      BCurve.setAttribute('fill', 'blue')
        // BCurve.setAttribute("d","M")
      var SvgPoints = this.calculateSvgCurvePoints(start)
        // Start with 0
      d = d + SvgPoints[0][0] + ' ' + this.transformYCoordinate(0) + ' C ' + SvgPoints[1][0] + ' ' + SvgPoints[1][1] + ' ' + SvgPoints[2][0] + ' ' + SvgPoints[2][1] + ' ' + SvgPoints[3][0] + ' ' + SvgPoints[3][1]
      for (var i = start + 1; i < end - 3; i++) { // sytnax: M10 10 C 10 10 10 10 10 10 C 10 10 10 10 10 10 ...
        SvgPoints = this.calculateSvgCurvePoints(i)
        d = d + ' C ' + SvgPoints[1][0] + ' ' + SvgPoints[1][1] + ' ' + SvgPoints[2][0] + ' ' + SvgPoints[2][1] + ' ' + SvgPoints[3][0] + ' ' + SvgPoints[3][1]
      }
      SvgPoints = this.calculateSvgCurvePoints(end - 3)
        // end with 0
      d = d + ' C ' + SvgPoints[1][0] + ' ' + SvgPoints[1][1] + ' ' + SvgPoints[2][0] + ' ' + SvgPoints[2][1] + ' ' + SvgPoints[3][0] + ' ' + this.transformYCoordinate(0)
      BCurve.setAttribute('d', d)
      this.addElement(BCurve, svgToDraw)
    }

    /**
     * anonymous function - Takes a specified amount of points (by averagePointAmount) around the point and assigns the average y value of all those points to the middle point's display.
     * An even amount of points will mean taking an extra point to the left in the average.
     *
     * @return {type}  description
     */
    averagePoints () {
      var splitAmount = Math.ceil((this.averagePointAmount - 1) / 2)
      var vwindow = this.mainSvg.viewWindow
      this.parent.data[vwindow.chr].averageDataPoints = []
      for (var i = splitAmount; i < this.parent.data[vwindow.chr].dataPoints.length - splitAmount - 1; i++) {
        var temp = this.parent.data[vwindow.chr].dataPoints[i]
        var sum = 0
        for (var j = 0; j < this.averagePointAmount; j++) {
          sum += this.parent.data[vwindow.chr].dataPoints[i - splitAmount + j].data.value
        }
        temp.data.value = parseInt(sum / this.averagePointAmount + 0.5)
        this.parent.data[vwindow.chr].averageDataPoints.push(temp)
      }
    }

    _pushCoorToPolygon (polygon, vwindow, xCoor, yValue, flags, replace) {
      if (!replace) {
        polygon.points.push(this.transformXCoordinate({
          chr: vwindow.chr,
          coor: xCoor
        }, false) + ',' + this.transformYCoordinate(yValue, flags))
      } else {
        polygon.points[0] = this.transformXCoordinate({
          chr: vwindow.chr,
          coor: xCoor
        }, false) + ',' + this.transformYCoordinate(yValue, flags)
      }
      polygon.lastX = xCoor
    }

    _endPolygon (polygon) {
      var svgToDraw = this.mainSvg
      this.createRawPolygon(polygon.points, {
        class: 'wiggleShapes',
        fill: this.rgbToHex(this.colorSet[0]),
        stroke: this.rgbToHex(this.colorSet[0])
      }, svgToDraw)
      this.drawOverflowLines(polygon.overflows)
      polygon.points = []
      polygon.overflows = {exceedMax: [], exceedMin: []}
    }

    /**
     * drawPeak - Draws the given points onto the svg window.
     *
     * @param  {type} currPolygon description
     * @param  {type} dataEntry   description
     * @return {type}             description
     */
    drawPeak (dataPoints) {
      var svgToDraw = this.mainSvg
      var windowToDraw = svgToDraw.viewWindow

      var currPolygon = { points: [], overflows: {exceedMax: [], exceedMin: []} }

      for (var i = 0; i < dataPoints.length; i++) {
        var start = dataPoints[i].start
        var end = dataPoints[i].end
        var yValue = dataPoints[i].data.value

        // first decide whether only one point will be pushed
        var middlePointOnly = (this.transformXCoordinate({chr: windowToDraw.chr, coor: end}) -
          this.transformXCoordinate({chr: windowToDraw.chr, coor: start}) < 1)

        if (yValue !== 0) {
          // this point (two points) should be pushed to currPolygon
          if (currPolygon.points.length === 0) {
            // no point yet, push a zero first
            this._pushCoorToPolygon(currPolygon, windowToDraw,
              (middlePointOnly ? (start + end) / 2 : start), 0)
          }
          var flags = {}
          if (middlePointOnly) {
            this._pushCoorToPolygon(currPolygon, windowToDraw,
              (start + end) / 2, yValue, flags)
          } else {
            this._pushCoorToPolygon(currPolygon, windowToDraw,
              start, yValue, flags)
            this._pushCoorToPolygon(currPolygon, windowToDraw,
              end, yValue, flags)
          }
          // process overflows
          if (flags.EXCEED_MIN) {
            var lastExceed = currPolygon.overflows.exceedMin[currPolygon.overflows.exceedMin.length - 1]
            if (!lastExceed || !lastExceed.concat(dataPoints[i])) {
              currPolygon.overflows.exceedMin.push(dataPoints[i].clone())
            }
          } else if (flags.EXCEED_MAX) {
            lastExceed = currPolygon.overflows.exceedMax[currPolygon.overflows.exceedMax.length - 1]
            if (!lastExceed || !lastExceed.concat(dataPoints[i])) {
              currPolygon.overflows.exceedMax.push(dataPoints[i].clone())
            }
          }
        } else { // yValue === 0
          if (currPolygon.points.length > 1) {
            // there is an old polygon, finish this first
            this._pushCoorToPolygon(currPolygon, windowToDraw,
              (middlePointOnly ? (start + end) / 2 : start), 0)
            this._endPolygon(currPolygon)
          }
          // then put the zero in currPolygon
          // (replace the previous one if exists)
          this._pushCoorToPolygon(currPolygon, windowToDraw,
            (middlePointOnly ? (start + end) / 2 : end), 0, null, true)
        }
      } // end iterating dataPoints

      if (currPolygon.points.length > 1) {
        this._pushCoorToPolygon(currPolygon, windowToDraw,
          currPolygon.lastX, 0)
        this._endPolygon(currPolygon)
      }
    }

    _drawPeakFromBedGraph (currPolygon, dataEntry) {
      var svgToDraw = this.mainSvg
      var windowToDraw = svgToDraw.viewWindow
      var flags = {}

      currPolygon = currPolygon || {}
      if (!currPolygon.hasOwnProperty('points')) {
        currPolygon.points = []
      }

      var start = dataEntry ? Math.max(dataEntry.start, windowToDraw.start) : windowToDraw.end + 1
      var end = dataEntry ? Math.min(dataEntry.end, windowToDraw.end) : windowToDraw.end + 2
      if (start < end) {
        if (currPolygon.points.length > 0) {
        // old polygon is there
          if (currPolygon.lastX < start) {
          // it's a separate polygon
            currPolygon.points.push(
            this.transformXCoordinate({chr: windowToDraw.chr, coor: currPolygon.lastX}, false) +
            ',' + this.transformYCoordinate(0))
            this.createRawPolygon(currPolygon.points, {class: 'wiggleShapes',
              fill: this.rgbToHex(this.colorSet[0]),
              stroke: this.rgbToHex(this.colorSet[0])
            }, svgToDraw)
            this.drawOverflowLines(currPolygon.overflows)
            currPolygon.points = []
          }
        }
        if (dataEntry && dataEntry.chr === windowToDraw.chr) {
          var yvalue = dataEntry.data instanceof give.TrackObjectImpl._BigWigImpl.SummaryCtor
            ? dataEntry.data.sumData / dataEntry.length : dataEntry.data.value
          if (currPolygon.points.length <= 0) {
          // start a new polygon, push the (x, 0) point of this segment
            currPolygon.points.push(
            this.transformXCoordinate({chr: windowToDraw.chr, coor: start}, false) +
            ',' + this.transformYCoordinate(0))
            currPolygon.overflows = {exceedMax: [], exceedMin: []}
          }
        // then push the top two points
          if (/* this.transformXCoordinate({chr: windowToDraw.chr, coor: end}) -
            this.transformXCoordinate({chr: windowToDraw.chr, coor: start}) < 1 */true) {
            // both are within one pixel
            currPolygon.points.push(
            this.transformXCoordinate({chr: windowToDraw.chr, coor: (start + end) / 2}, false) +
            ',' + this.transformYCoordinate(yvalue, flags))
          } else {
            currPolygon.points.push(
            this.transformXCoordinate({chr: windowToDraw.chr, coor: start}, false) +
            ',' + this.transformYCoordinate(yvalue, flags))
            currPolygon.points.push(
            this.transformXCoordinate({chr: windowToDraw.chr, coor: end}, false) +
            ',' + this.transformYCoordinate(yvalue, flags))
          }
          currPolygon.lastX = end
        }
      }
      // process overflows
      if (flags.EXCEED_MIN) {
        var lastExceed = currPolygon.overflows.exceedMin[currPolygon.overflows.exceedMin.length - 1]
        if (!lastExceed || !lastExceed.concat(dataEntry)) {
          currPolygon.overflows.exceedMin.push(dataEntry.clone())
        }
      } else if (flags.EXCEED_MAX) {
        lastExceed = currPolygon.overflows.exceedMax[currPolygon.overflows.exceedMax.length - 1]
        if (!lastExceed || !lastExceed.concat(dataEntry)) {
          currPolygon.overflows.exceedMax.push(dataEntry.clone())
        }
      }

      return true
    }

    /**
     * drawScale - Draws the signal strength scale on the left side of the
     *  track.
     */
    drawScale () {
      if (this.textSvg) {
      // first draw the lines
        this.drawLine(
          this.textMargin - this.MARGIN, this.drawingBoundary.top,
          this.textMargin - this.MARGIN, this.drawingBoundary.bottom,
          this.TEXT_COLOR_RGB, this.textSvg)
        this.drawLine(this.textMargin - this.MARGIN - this.scaleTickLength,
          this.drawingBoundary.top,
          this.textMargin - this.MARGIN, this.drawingBoundary.top,
          this.TEXT_COLOR_RGB, this.textSvg)
        this.drawLine(this.textMargin - this.MARGIN - this.scaleTickLength,
          this.drawingBoundary.bottom,
          this.textMargin - this.MARGIN, this.drawingBoundary.bottom,
          this.TEXT_COLOR_RGB, this.textSvg)
        // then the text
        this.drawText(this.textMargin - this.MARGIN -
          this.scaleTickLength - this.TEXT_MARGIN_GAP,
          this.drawingBoundary.top + this.textSize * 0.4,
          give._maxDecimalDigits(this.windowMax,
            this.numOfDigits).toString(),
          'end', null, this.textSvg)
        this.drawText(this.textMargin - this.MARGIN -
          this.scaleTickLength - this.TEXT_MARGIN_GAP,
          this.drawingBoundary.bottom - this.textSize * 0.4,
          give._maxDecimalDigits(this.windowMin,
            this.numOfDigits).toString(),
          'end', null, this.textSvg)
      }
    }

    /**
     * anonymous function - Sets the window range.
     *
     * @param  {type} min description
     * @param  {type} max description
     * @return {type}     description
     */
    setExtremes (min, max) {
      if (max > min) {
        this.windowMin = min
        this.windowMax = max
        this.windowRange = max - min
        this.autoScale = false
      } else {} // there is an error
    }

    /**
     * anonymous function - Automatically scales the window, taking the maximum and minimum signal strengths in the display window as the range extremes.
     *
     * @return {type}  description
     */
    autoWindow () {
      this.autoScale = true
    }
  }

  BigWigTrackDom._DEFAULT_HEIGHT = 80
  BigWigTrackDom._DEFAULT_MAX = 20
  BigWigTrackDom._DEFAULT_MIN = 0

  BigWigTrackDom._DEFAULT_AUTOSCALE = false
  BigWigTrackDom._DEFAULT_INCLUDE_ZERO = true

  BigWigTrackDom._DEFAULT_UPPER_PERCENTILE = 0.1
  BigWigTrackDom._DEFAULT_LOWER_PERCENTILE = 0.1
  BigWigTrackDom._DEFAULT_NUM_OF_DIGITS = 2

  give.BigWigTrackDom = BigWigTrackDom

  return give
})(GIVe || {})
