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
  /**
   * @class TrackDom
   *
   * Basic track DOM behaviors, including the svg drawing functions
   *
   * @param  {type}  {description}
   */
  class TrackDom {
    constructor (track, properties) {
      /**
       * The underlying track object for metadata, settings,
       * actual data and communication with the server
       * @type {GIVE.TrackObject}
       */
      this._parent = track
      this.svgNS = 'http://www.w3.org/2000/svg'
      this.id = this.parent.typeTrunk + '_' + this.constructor._trackCounter++
      this._narrowMode = false

      properties = properties || {}
      this._initProperties(properties)

      this._cacheDebouncer = null

      /**
       * Promise resolved when the entire `chart-window` is ready
       * @type {Promise<give.ChromRegion>}
       */
      this.readyPromise = null
      /**
       * A set of indices where the latest promise correspond to
       * @type {Set}
       */
      this._readyPromiseWindowIndices = new Set()

      this._dataPromise = null
      this._debouncePromise = null

      this._pendingNewVWArr = null
      this._requestVWArr = null

      /**
       * The actual height of the track in pixels.
       * This will be useful if `this.dynamicHeight === true`
       * @type {number}
       */
      this.height = (
        properties.height ||
        this.getTrackSetting('height', 'integer') ||
        this.DEFAULT_HEIGHT
      )

      give._verbConsole.info(this.id + ' created. Calling trackImpl().')
    }

    _initProperties (properties) {
      this.x = properties.x || 0
      this.y = properties.y || 0

      this.Y_HIDDEN = -30 // value to hide stuff in svg (to calculate size)

      this.ARROW_HEIGHT_PROP = 0.5 // percentage of arrow (to height of gene)
      this.ARROW_MAX_HEIGHT_PROP = 0.9 // max percentage of arrow
      this.ARROW_MIN_HEIGHT = 4 // minimum height required for arrow
      this.ARROW_RECT_MIN_WIDTH = 1.5 // minimum rectangle width to draw arrow
      this.ARROW_GAP_WIDTH = 1.5 // gap width for arrow
      this.ARROW_FLANK_WIDTH = 0.5 // flank width for arrow

      this.MIN_TOTAL_WIDTH = 100

      this.MAX_SPACE_PER_BASE = 1.5
      // maximum space for every base (unit in textSize, cannot zoom further)

      /**
       * Right padding size of text labels, in px.
       * @type {number}
       */
      this.textRightPadding = this._initPropertyItem(
        'textRightPadding', properties, 'textRightPadding', 'float')

      /**
       * The CSS class for the main SVG element
       * @type {string}
       */
      this.trackMainDOMClass = properties.trackMainDOMClass || ''

      /**
       * the main index of the chart-window this track is in.
       * @type {number}
       */
      this.windowIndex = properties.windowIndex || 0

      /**
       * Text size of the track, will also affect line sizes.
       * This serves as the standard for the other properties.
       * @type {number}
       */
      this.textSize = this._initPropertyItem(
        'textSize', properties, 'textSize', 'integer')

      /**
       * Proportion of full line height (multiplies of `this.textSize`).
       * @type {number}
       */
      this.fullHeightRatio = this._initPropertyItem(
        'fullHeightRatio', properties, 'fullHeightRatio', 'float')

      /**
       * Proportion of half height (for bed files, for example). Multiplies
       * of `this.textSize`.
       * @type {number}
       */
      this.halfHeightRatio = this._initPropertyItem(
        'halfHeightRatio', properties, 'halfHeightRatio', 'float')

      /**
       * This is the size of the gap between lines (in a BED file, for
       * example).
       * Multiplies of `this.textSize`
       * @type {number}
       */
      this.lineGapRatio = this._initPropertyItem(
        'lineGapRatio', properties, 'lineGapRatio', 'float')

      /**
       * Interval for update drawing, needs to be a small value for coordinates
       * @type {number}
       */
      this._drawDebounceInt = this._initPropertyItem(
        '_drawDebounceInt', properties, '_drawDebounceInt', 'integer')

      /**
       * Interval for getting data into cache. This is longer than draw
       * debouncing
       * @type {number}
       */
      this._cacheDebounceInt = this._initPropertyItem(
        '_cacheDebounceInt', properties, '_cacheDebounceInt', 'integer')

      this.activeVisibility = this._initPropertyItem(
        'visibility', properties, 'visibility')

      this.textMargin = (properties.textMargin || 0)

      /**
       * Flag to indicate whether this track has a dynamic height (from its
       *   contents).
       * @type {boolean}
       */
      this.dynamicHeight = this._initPropertyItem(
        'dynamicHeight', properties, 'dynamicHeight', 'boolean')

      this.windowWidth = properties.width -
        (properties.textMargin
          ? properties.textMargin + this.textRightPadding : 0)
      this.totalWidth = properties.width

      this.pin = this._initPropertyItem('pin', properties, 'pin')

      this.forecolorIndex = this._initPropertyItem(
        'forecolorIndex', properties, 'forecolorIndex', 'integer')
    }

    _initPropertyItem (key, propertiesObj, trackSettingKey, type) {
      return propertiesObj.hasOwnProperty(key)
        ? propertiesObj[key]
        : ((trackSettingKey && this.hasTrackSetting(trackSettingKey))
          ? this.getTrackSetting(trackSettingKey, type)
          : this.constructor.defaultProperties[key]
        )
    }

    get DEFAULT_HEIGHT () {
      return this.constructor.DEFAULT_HEIGHT
    }

    get parent () {
      return this._parent
    }

    get viewWindow () {
      return this._mainSvg ? this._mainSvg.viewWindow : null
    }

    get viewWindowArray () {
      return Array.isArray(this.viewWindow)
        ? this.viewWindow : [this.viewWindow]
    }

    set viewWindow (newViewWindow) {
      if (Array.isArray(newViewWindow)) {
        newViewWindow = newViewWindow[0]
      }
      if (!this._mainSvg) {
        throw new give.GiveError(this.id + '._mainSvg is not initialized yet!')
      }
      this._mainSvg.viewWindow = newViewWindow
    }

    hasTrackSetting (key) {
      return this.parent.hasSetting(key)
    }

    getTrackSetting (key, type) {
      return this.parent.getSetting(key, type)
    }

    setTrackSetting (key, value) {
      return this.parent.setSetting(key, value)
    }

    /**
     * hasLinksInTargetView - Return whether this track DOM has a linked
     *    component in the given view window. This is used to establish links
     *    for multi-window tracks.
     * Notice that for cross-species tracks, the ref criteria should be
     *    modified accordingly in the implementation.
     *
     * @param {object} context - The context of the viewWindow to be queried.
     *    It should contain two properties.
     * @param {string} context.ref - The reference of the viewWindow
     * @param {number} context.index - The index of the viewWindow
     * @returns {boolean} Whether this track DOM has linked component in the
     *    viewWindow queried
     * @memberof TrackDom
     */
    hasLinksInTargetView (context) {
      return context && context.ref === this.parent.ref &&
        context.index <= this.windowIndex + this.parent.windowSpan - 1
    }

    /**
     * get trackSvg - Get the main SVG element for track display
     *   This will be called after the trackDOM is initialized
     *   (should be later than "attached")
     *
     * @returns {DOMelement}  SVG DOM element
     */
    get trackSvg () {
      // this will be called after the trackDOM is initialized (should be
      // later than "attached")

      if (!this._trackSvg) {
        this._trackSvg = document.createElementNS(this.svgNS, 'svg')
        this._trackSvg.setAttribute('id', this.parent.cleanId + '_trackSvg')
        this._trackSvg.setAttribute('class', 'trackSvg')

        // if textMargin is specified, create a svg element for text labels

        if (this.textMargin && !this._narrowMode) {
          this._initTextSvgAndHolder()
        }

        // create dom elements (svg)
        this._mainSvg = document.createElementNS(this.svgNS, 'svg')
        this._mainSvg.setAttribute('id', this.parent.cleanId + '_mainSvg')
        if (this.trackMainDOMClass) {
          this._mainSvg.setAttribute('class', this.trackMainDOMClass)
        }
        this._trackSvg.appendChild(this._mainSvg)

        // this._setInitialized(true);
        // this.fire('track-initialized', {ID: this.parent.id});
        this._initSvgHolder(this._mainSvg)
        this._updateSvgReceiver(this._mainSvg)

        if (typeof this._initSvgComponents === 'function') {
          this._initSvgComponents()
        }

        this.setSvgSizeLocation()
        give._verbConsole.info(this.id + '.trackSvg created.')
      }
      return this._trackSvg
    }

    get priorities () {
      return this.parent.priorities
    }

    setSvgSize () {
      this.trackSvg.setAttributeNS(null, 'width', this.totalWidth)
      // notice that the heights are placeholder and will change
      this.trackSvg.setAttributeNS(null, 'height', this.height)
      this.trackSvg.setAttribute('viewBox', '0 0 ' +
        this.totalWidth + ' ' + this.height)
      if (this._textSvg) {
        this._textSvg.setAttributeNS(null, 'x', 0)
        this._textSvg.setAttributeNS(null, 'y', 0)
        this._textSvg.setAttributeNS(null, 'width', this.textMargin)

        // notice that the heights are placeholder and will change
        this._textSvg.setAttributeNS(null, 'height', this.height)
        this._textSvg.setAttribute('viewBox', '0 0 ' +
          this.textMargin + ' ' + this.height)
      }
      this._mainSvg.setAttributeNS(null, 'x',
        (this._narrowMode ? 0 : this.textMargin + this.textRightPadding))
      this._mainSvg.setAttributeNS(null, 'y', 0)
      this._mainSvg.setAttributeNS(null, 'width', this.windowWidth)

      // notice that the heights are placeholder and will change
      this._mainSvg.setAttributeNS(null, 'height', this.height)
      this._mainSvg.setAttribute('viewBox', '0 0 ' +
        this.windowWidth + ' ' + this.height)
      if (typeof this._setSvgComponentsSize === 'function') {
        this._setSvgComponentsSize()
      }
    }

    /**
     * setSvgLocation - Set the location of main track SVG element
     *
     * @memberof TrackDom
     */
    setSvgLocation () {
      this.trackSvg.setAttributeNS(null, 'x', this.x)
      this.trackSvg.setAttributeNS(null, 'y', this.y)
    }

    /**
     * setSvgSizeLocation - Set the size and location (mainly Y value) of
     *   main track SVG element.
     */
    setSvgSizeLocation () {
      this.setSvgLocation()
      this.setSvgSize()
    }

    /**
     * height - get the height of the track SVG
     *
     * @returns {number}  height value
     */
    get height () {
      return this._trackHeight
    }

    /**
     * _initTextSvgAndHolder - Initialize the text SVG element and its content
     *   holder.
     */
    _initTextSvgAndHolder () {
      this._textSvg = document.createElementNS(this.svgNS, 'svg')
      this._textSvg.setAttribute('id', this.parent.cleanId + '_textSvg')
      this._trackSvg.appendChild(this._textSvg)
      this._initSvgHolder(this._textSvg)
    }

    /**
     * _initSvgHolder - Initialize the content holder for an SVG element.
     *
     * @param {DOMelement} svgElem - the SVG element to put the content
     *    holder in.
     */
    _initSvgHolder (svgElem) {
      // notice that `svgElem` should be there
      svgElem.holder = document.createElementNS(this.svgNS, 'g')
      svgElem.insertBefore(svgElem.holder, svgElem.gestureReceiver || null)
    }

    /**
     * _updateSvgReceiver - Add a gesture listener (rectangle) to the SVG element.
     *   Notice that text holder and main holder have their listeners
     *   separately.
     *   Also the actual listener is attached to svg elements, not the
     *   rectangles
     *
     * @param  {DOMelement} svgToDraw The SVG element to attach listeners to
     */
    _updateSvgReceiver (svgToDraw) {
      if (!svgToDraw) {
        give._verbConsole.warn('SvgToDraw is empty!')
        return
      }
      if (!svgToDraw.gestureReceiver) {
        // draw a rectangle over the coordinate track to handle mouse events
        svgToDraw.gestureReceiver = this.createRawRectangle(0, 0,
          svgToDraw.getAttributeNS(null, 'width'),
          svgToDraw.getAttributeNS(null, 'height'),
          {fill: 'none', class: 'pointerHandler'}, svgToDraw)
        svgToDraw.appendChild(svgToDraw.gestureReceiver)
      } else {
        // update the size of the existing rectangle
        this.constructor.updateRawRectangle(svgToDraw.gestureReceiver,
          0, 0,
          svgToDraw.getAttributeNS(null, 'width'),
          svgToDraw.getAttributeNS(null, 'height'))
      }
    }

    get mainGestureReceiver () {
      return this._mainSvg ? this._mainSvg.gestureReceiver : null
    }

    // /**
    //  * _changeViewWindowAfterResize - Change window width and height
    //  *   (__e.g.__ resizing browser window from an `iron-resized` event).
    //  * Notice that this is a track-level solution: the first track(s) (very
    //  *   likely to be coordinates) will generate a new `newViewWindow` value
    //  *   while the rest of the tracks will follow such window
    //  *
    //  * @param  {number} newWindowWidth The new window width (in pixels)
    //  * @param  {Array<ChromRegionLiteral>} newViewWindow  The new view window
    //  *   coordinate.
    //  *   (deprecated) If this value is `undefined` or `null`,
    //  *   then a new one will be generated based on the current view window,
    //  *   current width and new width.
    //  * @param  {...object} args  Pass all the left arguments finally to
    //  *   `this.drawData()`.
    //  * @returns {Promise} Returns a `Promise` that will resolve to the
    //  *    current `this.viewWindow` object.
    //  */
    // _changeViewWindowAfterResize (newWindowWidth, newViewWindow, ...args) {
    //   // this is only used to change the viewWindow of _mainSvg
    //   // (both narrow and wide mode)
    //   if (!newViewWindow) {
    //     // no new window, need to calculate
    //     if (!this.viewWindow) {
    //       throw new give.GiveError('No original view ' +
    //         'window, cannot calculate the new view window!')
    //     }
    //     newViewWindow = (newViewWindow === false)
    //       ? this.viewWindow
    //       : this.viewWindow.getExtension(
    //         (newWindowWidth - this.windowWidth) / this.windowWidth,
    //         null, true, this.parent.refObj)
    //   }
    //   return this._updateContent(newViewWindow, ...args)
    // }

    _checkViewWindowChanged (newWindow, index) {
      if (Array.isArray(newWindow)) {
        return this.viewWindowArray.some((window, wIndex) => {
          return this._checkSingleViewWindowChanged(newWindow[wIndex], window)
        })
      }
      if (Array.isArray(this.viewWindow)) {
        return this._checkSingleViewWindowChanged(
          newWindow, this.viewWindow[index])
      }
      return this._checkSingleViewWindowChanged(newWindow, this.viewWindow)
    }

    _checkSingleViewWindowChanged (newViewWindow, currentViewWindow) {
      if (newViewWindow instanceof give.ChromRegion) {
        return (!(currentViewWindow instanceof give.ChromRegion) ||
          !!give.ChromRegion.compare(newViewWindow, this.viewWindow))
      }
      return false
    }

    /**
     * _setWidthParameters - set width-related parameters and switching
     *    between narrow (to be implemented) or wide mode if needed.
     *
     * @param  {number} newWidth - new width, in px
     * @param  {number} newTxtMargin - new text margin, in px
     * @param  {Array<ChromRegionLiteral>} [newWindow] - new view window
     *    coordinates. This is useful when view window has changed in one
     *    track and every other track needs to be brought to synchronization.
     *    If this is falsey, then `viewwindow` shall not be changed at all.
     * @param  {boolean} forceUpdate - force the content to update (for
     *    example, when track settings have changed).
     * @param  {boolean} [newNarrowMode] - reserved for future narrow mode
     *    implementation.
     * @param  {...object} args  Pass all the left arguments finally to
     *   `this.drawData()`.
     * @returns {Promise} Returns a `Promise` that will resolve to the
     *    current `this.viewWindow` object.
     */
    _setWidthParameters (
      newWidth, newTxtMargin, newWindow, forceUpdate,
      newNarrowMode, index, ...args
    ) {
      newWidth = (typeof (newWidth) === 'number' && newWidth > 0)
        ? newWidth : this.totalWidth
      newTxtMargin = (typeof (newTxtMargin) === 'number' && newTxtMargin > 0)
        ? newTxtMargin : (this.textMargin ? this.textMargin : null)
      newNarrowMode = (typeof (newNarrowMode) === 'boolean')
        ? newNarrowMode : this._narrowMode

      forceUpdate = forceUpdate || false
      if (newTxtMargin && newTxtMargin !== this.textMargin) {
        // needs to change txtMargin
        if (newTxtMargin > 0) {
          this.textMargin = newTxtMargin
          if (!this._textSvg) {
            this._initTextSvgAndHolder()
          }
        } else {
          // delete _textSvg
          delete this.textMargin
          if (this._textSvg) {
            this._trackSvg.removeChild(this._textSvg)
            delete this._textSvg
          }
        }
        forceUpdate = true
      }

      if (forceUpdate || newWidth !== this.totalWidth ||
        newNarrowMode !== this._narrowMode ||
        this._checkViewWindowChanged(newWindow, index)
      ) {
        // drawing width changed
        this._narrowMode = newNarrowMode
        let newWinWidth = newWidth -
          ((!this._narrowMode && newTxtMargin) ? newTxtMargin : 0)
        this._pendingTotalWidth = newWidth
        this._pendingWindowWidth = newWinWidth
        return this._updateContent(newWindow, index, ...args)
      }
      return Promise.resolve(this.viewWindow)
    }

    /**
     * set height - set the height of the track
     *
     * @param  {number} newHeight - new height of the track, in px
     */
    set height (newHeight) {
      if (newHeight > 0) {
        this._trackHeight = newHeight
      } else {
        throw new give.GiveError('Invalid height value: ' + newHeight)
      }
      this.setSvgSize()
    }

    // ****** visibility control ******

    /**
     * changeVisibility - change the visibility level of the track.
     *
     * @param  {number} newValue description
     * @param  {boolean} relative - whether `newValue` is the absolute
     *    visibility level or the relative level.
     *    If `false`, absolute level is used. Please see
     *    `give.TrackObject.StatusEnum` for possible absolute values.
     *    If `true`, then `newValue` will be used to adjust visibility levels
     *    according to `this.constructor.allowedVis`. Negative value
     *    means lowering the amount of details shown.
     */
    changeVisibility (newValue, relative) {
      if (!relative) {
        // setting the absolute visibility value,
        // if not allowed, the closest one *with more detail*
        // (read: later in this.constructor.allowedVis)
        // will be chosen
        if (this.constructor.allowedVis.indexOf(newValue) >= 0) {
          this.activeVisibility = newValue
        } else {
          this.constructor.allowedVis.every(function (vis) {
            this.activeVisibility = vis
            return vis < newValue
          }, this)
        }
      } else {
        // just move values within this.constructor.allowedVis
        var newIndex = (
          this.constructor.allowedVis.indexOf(this.activeVisibility) +
            newValue
        )
        if (newIndex < 0) {
          newIndex = 0
        } else if (newIndex >= this.constructor.allowedVis.length) {
          newIndex = this.constructor.allowedVis.length - 1
        }
        this.activeVisibility = this.constructor.allowedVis[newIndex]
      }
    }

    /**
     * updateAnno - update track properties from JS annotation map object.
     *    Update happens when the track has never been updated, or
     *    `forceUpdate === true`.
     *
     * @param  {object} annoMap - annotation map used to update properties.
     *    If update happens, all properties of `annoMap` will replace
     *    properties with the same name in the track.
     * @param  {boolean} forceUpdate - update annotation even if this track
     *    has already updated before.
     */
    updateAnno (annoMap, forceUpdate) {
      if (forceUpdate === true || !this.annoUpdated) {
        for (var key in annoMap) {
          if (key !== 'track' && annoMap.hasOwnProperty(key)) {
            this.parent.setSetting(key, annoMap[key])
          }
        }
      }
      this.annoUpdated = true
    }

    // ****** customized methods ******

    /**
     * drawData - draw the data of the track
     *    This method should be implemented in track implementations.
     *    When implementing this method, use `this._getDataObject` to get
     *    the GiveTree object storing all necessary data corresponding to
     *    the correct chromosome. Then use `.traverse` to traverse through
     *    the content of the GiveTree object and apply customized drawing
     *    methods.
     */
    drawData () {
      throw new give.GiveError(
        'TrackDOMBehavior.drawData gets called but has' +
        ' not been implemented in `' + this.constructor.name + '`.'
      )
    }

    _updateViewWindowResolution (viewWindow, vWinIndex) {
      viewWindow = viewWindow || this.viewWindow
      if (Array.isArray(viewWindow)) {
        viewWindow.forEach((window, index) => {
          window.resolution =
            window.resolution || this._getResolution(window, index)
        })
      } else {
        viewWindow.resolution =
          viewWindow.resolution ||
          this._getResolution(viewWindow, vWinIndex)
      }
      return viewWindow
    }

    /**
     * _getResolution - Get the required resolution for the given view window.
     *
     * @param {ChromRegionLiteral} vWindow - the window used to calculate
     * @param {number} index - the index of the window (for tracks with multiple
     *    windows)
     * @return {number}  returns the resolution.
     */
    _getResolution (vWindow, index) {
      return 1
    }

    getViewWindowExtArray (extension, vWinArray) {
      vWinArray = vWinArray || this.viewWindowArray
      return vWinArray.map((window, index) =>
        window.getExtension(extension, null, true, this.parent.refObj)
      )
    }

    // ****** common methods used by all tracks ******

    /**
     * _getDataObject - get the data structure from `this.parent`
     *
     * @param  {string} [chrom] - the chromosome to be fetched. If omitted,
     *    use `this.viewWindow.chr`
     * @returns {GiveTreeBase|null} return the data structure object.
     */
    _getDataObject (chrom) {
      chrom = chrom || this.viewWindow.chr
      return this.parent.getData(chrom)
    }

    // ** coordinates **

    transformXCoordinate (coordinate, moveOutsideToBorder, svgToDraw) {
      // this function is used to transform a given coordinate to svg x
      // TODO: implement chromosomal based coordinates
      // TODO: move this to TrackBehavior behavior
      // coordinate should be {chr: xxx, coor: xxx}
      moveOutsideToBorder = moveOutsideToBorder || false
      svgToDraw = svgToDraw || this._mainSvg
      var windowToDraw = svgToDraw.viewWindow
      if (windowToDraw.chr !== coordinate.chr) {
        return 0
      }
      try {
        var result =
          (coordinate.coor - windowToDraw.start + 0.5) * this.windowWidth /
          parseFloat(windowToDraw.length)
        if (moveOutsideToBorder) {
          if (result < 0) {
            return -1
          } else if (result > this.windowWidth) {
            return this.windowWidth + 1
          }
        }
        return result
      } catch (e) {
        return 0
      }
    }

    revTransXCoordinate (x, svgToDraw) {
      // reversely translate X value from JavaScript to chromosome coordinate
      svgToDraw = svgToDraw || this._mainSvg
      var windowToDraw =
        svgToDraw.viewWindow || svgToDraw.parentNode.viewWindow
      return give.ChromRegion.clipCoordinate({chr: windowToDraw.chr,
        coor: parseInt(x / this.windowWidth * windowToDraw.length +
          windowToDraw.start + 0.5)}, this.parent.refObj)
    }

    // ** Simple SVG Drawing **

    addElement (elem, svgToDraw) {
      svgToDraw = svgToDraw || this._mainSvg
      svgToDraw = svgToDraw.holder || svgToDraw
      svgToDraw.appendChild(elem)
    }

    removeElement (elem, svgToDraw) {
      svgToDraw = svgToDraw || this._mainSvg
      svgToDraw = svgToDraw.holder || svgToDraw
      svgToDraw.removeChild(elem)
    }

    clear () {
      if (this._textSvg) {
        this.clearSvg(this._textSvg)
      }
      this.clearSvg(this._mainSvg)
    }

    clearSvg (svgElem) {
      if (svgElem.holder) {
        try {
          svgElem.removeChild(svgElem.holder)
        } catch (err) {
          give._verbConsole.info(err)
        }
        this._initSvgHolder(svgElem)
      } else {
        while (svgElem.firstChild) {
          svgElem.removeChild(svgElem.firstChild)
        }
      }
    }

    updateLocation (x, y) {
      if (typeof (x) === 'number') {
        this.x = x
        // this._trackSvg.setAttributeNS(null, 'x', this.x);
      }
      if (typeof (y) === 'number') {
        this.y = y
        // this._trackSvg.setAttributeNS(null, 'y', this.y);
      }
      this.setSvgLocation()
    }

    updateSize (width, height) {
      if (typeof (width) === 'number') {
        this.width = width
        // this._trackSvg.setAttributeNS(null, 'x', this.x);
      }
      if (typeof (height) === 'number') {
        this.height = height
        // this._trackSvg.setAttributeNS(null, 'y', this.y);
      }
      this.setSvgSize()
    }

    /**
     * update - set width and viewwindow, and update the content if needed.
     *
     * @param  {Array<ChromRegionLiteral>} newWindow - new view window
     *    coordinates. This is useful when view window has changed in one
     *    track and every other track needs to be brought to synchronization.
     *    If this is `false`, then `viewwindow` shall not be changed at all.
     * @param  {number} newWidth - new width, in px
     * @param  {number} newTxtMargin - new text margin, in px
     * @param  {number} vWinIndex - the index for the viewWindow, used when
     *    the track has multiple view windows.
     * @param  {...object} args  Pass all the left arguments finally to
     *   `this.drawData()`.
     * @returns {Promise} Returns a `Promise` that will resolve to the
     *    current `this.viewWindow` object.
     */
    update (newWindow, width, newTxtWidth, forceUpdate, vWinIndex, ...args) {
      let index = (typeof vWinIndex === 'number'
        ? vWinIndex - this.windowIndex : 0)
      return this._setWidthParameters(
        width, newTxtWidth, newWindow, forceUpdate, null, index, ...args
      ).then(resolvedValue => {
        this.setSvgSize()
        return resolvedValue
      })
    }

    drawLine (x1, y1, x2, y2, colorRGB, svgToDraw) {
      // notice that this function draws line according to svg coordinates,
      // not genomic coordinates
      // color is a 24-bit number
      var newLine = document.createElementNS(this.svgNS, 'line')
      newLine.setAttributeNS(null, 'x1', x1)
      newLine.setAttributeNS(null, 'x2', x2)
      newLine.setAttributeNS(null, 'y1', y1)
      newLine.setAttributeNS(null, 'y2', y2)
      if (colorRGB || colorRGB === 0) {
        newLine.setAttributeNS(null, 'stroke',
          this.constructor.rgbToHex(colorRGB))
      }
      this.addElement(newLine, svgToDraw)
      return newLine
    }

    createRawRectangle (x1, y1, x2, y2, params, svgToDraw) {
      let newRegion = document.createElementNS(this.svgNS, 'rect')
      this.constructor.updateRawRectangle(newRegion, x1, y1, x2, y2, params)
      this.addElement(newRegion, svgToDraw)
      return newRegion
    }

    static updateRawRectangle (rectangle, x1, y1, x2, y2, params) {
      let xmin = Math.min(x1, x2)
      let ymin = Math.min(y1, y2)
      rectangle.setAttributeNS(null, 'x', xmin)
      rectangle.setAttributeNS(null, 'y', ymin)
      rectangle.setAttributeNS(null, 'width', Math.abs(x2 - x1))
      rectangle.setAttributeNS(null, 'height', Math.abs(y2 - y1))
      this.setElementParams(rectangle, params)
      return rectangle
    }

    createRawPolygon (coordinates, params, svgToDraw) {
      // coordinates is an array of string "x,y"
      var newPolygon = document.createElementNS(this.svgNS, 'polygon')
      newPolygon.setAttributeNS(null, 'points', coordinates.join(' '))
      this.constructor.setElementParams(newPolygon, params)
      this.addElement(newPolygon, svgToDraw)
      return newPolygon
    }

    createText (x, y, text, textAnchor, params) {
      var newLabel = document.createElementNS(this.svgNS, 'text')
      if (textAnchor) {
        newLabel.setAttributeNS(null, 'text-anchor', textAnchor)
      }
      newLabel.setAttributeNS(null, 'x', x)
      newLabel.setAttributeNS(null, 'y', y)
      // TODO: when Edge supports SVG 1.1 dominant-baseline feature, remove this
      if (document.documentMode || navigator.userAgent.match(/Edge/)) {
        newLabel.setAttributeNS(null, 'dy', this.textSize * 0.2)
      }
      // End MSIE & Edge only hack

      this.constructor.setElementParams(newLabel, params)
      newLabel.appendChild(document.createTextNode(text))
      return newLabel
    }

    drawText (x, y, text, textAnchor, params, svgToDraw) {
      var newLabel = this.createText(x, y, text, textAnchor, params)
      this.addElement(newLabel, svgToDraw)
      return newLabel
    }

    testTextWidth (text, textAnchor, params, svgToDraw) {
      // this is used to test the length of the text
      var tmpText = this.drawText(0, this.Y_HIDDEN, text,
        textAnchor, params, svgToDraw)
      var result = tmpText.getBBox().width
      this.removeElement(tmpText, svgToDraw)
      return result
    }

    static setElementParams (elem, params) {
      for (var key in params) {
        if (
          params.hasOwnProperty(key) &&
          params[key] !== undefined && params[key] !== null
        ) {
          if (
            (key === 'fill' || key === 'stroke') &&
            (typeof params[key] === 'number')
          ) {
            // need to convert integer color to string
            params[key] = this.rgbToHex(params[key])
          }
          elem.setAttributeNS(null, key, params[key])
        }
      }
    }

    // ** Complex SVG drawing for track **

    drawRectangle (
      region, colorRGB, y, height, svgToDraw, strokeColorRGB, vertAlign
    ) {
      // height is the percentage of svgToDraw, top-aligned
      // color is an index from colorSet
      // TODO: allow different alignment

      height = height || 1
      y = y || 0

      svgToDraw = svgToDraw || this._mainSvg
      let windowToDraw = svgToDraw.viewWindow

      if (vertAlign === TrackDom.VALIGN_CENTER) {
        y -= height / 2
      } else if (vertAlign === TrackDom.VALIGN_BOTTOM) {
        y -= height
      }

      if (windowToDraw.overlaps(region) > 0) {
        var x0 = this.transformXCoordinate(region.startCoor, true)
        var x1 = this.transformXCoordinate(region.endCoor, true)
        var newRegion = this.createRawRectangle(x0, y, x1, y + height, {
          fill: colorRGB,
          stroke: (typeof strokeColorRGB === 'number')
            ? strokeColorRGB : 'none',
          id: region.id
        }, svgToDraw)

        // add strand info
        this.drawStrandArrows(x0, y, x1, y + height, region.getStrand(),
          0xFFFFFF, svgToDraw)
      }
      return newRegion
    }

    drawStrandArrows (x0, y0, x1, y1, strand, colorRGB, svgToDraw) {
      if (typeof (strand) === 'string') {
        // first calculate number of arrows
        var arrowWidth = (y1 - y0) * 0.5 * this.ARROW_HEIGHT_PROP
        if (arrowWidth < this.ARROW_MIN_HEIGHT * 0.5) {
          arrowWidth = Math.min(this.ARROW_MIN_HEIGHT,
            (y1 - y0) * 0.5 * this.ARROW_MAX_HEIGHT_PROP)
        }
        if (x1 - x0 >= arrowWidth * this.ARROW_RECT_MIN_WIDTH) {
          // needs some width to draw arrow
          var arrowCenters = []
          if (x1 - x0 >
            arrowWidth * (
              this.ARROW_FLANK_WIDTH * 2 + this.ARROW_GAP_WIDTH + 2
            )
          ) {
            // multiple arrows
            var numArrows = Math.floor(
              ((x1 - x0) / arrowWidth - this.ARROW_FLANK_WIDTH * 2 - 1) /
              (this.ARROW_GAP_WIDTH + 1)
            ) + 1
            // calculate the center for the first arrow
            var arrowCenter = (
              x0 + x1 -
              (this.ARROW_GAP_WIDTH + 1) * arrowWidth * (numArrows - 1)
            ) * 0.5

            for (var i = 0; i < numArrows; i++) {
              arrowCenters.push(arrowCenter)
              arrowCenter += (1 + this.ARROW_GAP_WIDTH) * arrowWidth
            }
          } else {
            arrowCenters.push(0.5 * (x1 + x0))
          }

          arrowCenters.forEach(
            xCtr => this.drawSingleStrandArrow(xCtr, (y1 + y0) * 0.5,
              arrowWidth, strand, colorRGB, svgToDraw)
          )
        }
      }
    }

    drawSingleStrandArrow (xCtr, yCtr, width, strand, colorRGB, svgToDraw) {
      var halfWidthX = ((strand === '+') ? width * 0.5 : -width * 0.5)
      this.drawLine(xCtr - halfWidthX, yCtr - width, xCtr + halfWidthX, yCtr,
        colorRGB, svgToDraw)
      this.drawLine(xCtr - halfWidthX, yCtr + width, xCtr + halfWidthX, yCtr,
        colorRGB, svgToDraw)
    }

    createWordWrappedText (
      text, textAnchor, params, svgToDraw, maxWidth, maxHeight
    ) {
      // notice that all whitespaces in text will be subsituted by ' ' and
      //   consecutive spaces will be collapsed
      // extendDirection ('up' | 'both' | 'down') determine how extra text
      //   will be extended
      // when avoidCollision is true, no text will be drawn if any of the
      //   text component is overlapping with existing text elements
      if (!text) {
        return null
      }
      var textArray = text.split(/\s+/)
      var results = []
      var resultWidths = []
      var currHeight = this.textSize * this.fullHeightRatio
      results.push('')
      resultWidths.push(0)

      textArray.every(function (currWord, index) {
        var currWidth, i
        do {
          currWidth = this.testTextWidth(
            (results[results.length - 1].length > 0
              ? results[results.length - 1] + ' ' : '') + currWord,
            textAnchor, params, svgToDraw)

          if (currWidth > maxWidth) {
            // this line is full
            if (results[results.length - 1].length <= 0) {
              // single super long word, break the word first
              i = 0
              do {
                i++
                results[results.length - 1] = currWord.slice(0, -i)
                currWidth = this.testTextWidth(results[results.length - 1],
                  textAnchor, params, svgToDraw)
              } while (currWidth > maxWidth && i < currWord.length)
              resultWidths[resultWidths.length - 1] = currWidth
              currWord = currWord.slice(-i)
            }

            // then add another line
            if (
              currHeight + this.textSize * (
                this.lineGapRatio + this.fullHeightRatio
              ) > maxHeight
            ) {
              // too many lines, use '...', and end processing
              do {
                results[results.length - 1] =
                  results[results.length - 1].slice(0, -1)
                currWidth = this.testTextWidth(
                  (results[results.length - 1].length > 0
                    ? results[results.length - 1] + ' ...' : '...'),
                  textAnchor, params, svgToDraw)
              } while (currWidth > maxWidth &&
                results[results.length - 1].length > 0)
              results[results.length - 1] =
                results[results.length - 1].length > 0
                  ? results[results.length - 1] + ' ...' : '...'
              resultWidths[resultWidths.length - 1] = currWidth
              return false
            }
            results.push('')
            resultWidths.push(0)
            currHeight +=
              this.textSize * (this.lineGapRatio + this.fullHeightRatio)
          } else {
            results[results.length - 1] =
              (results[results.length - 1].length > 0
                ? results[results.length - 1] + ' ' : '') + currWord
            resultWidths[resultWidths.length - 1] = currWidth
            return true
          }
        } while (currWord.length > 0)
      }, this)

      return results
    }

    drawWordWrappedText (
      x, y, textArr, textAnchor, extendDirection, params,
      svgToDraw, avoidCollision
    ) {
      // calculate the top line y based on number of lines and everything
      var vertParam = 0.5 // this is for default value ('middle')
      switch (extendDirection) {
        case 'up':
          vertParam = 1
          break
        case 'down':
          vertParam = 0
          break
      }

      // then draw everything in textArr
      // get all text elements in the svg in case collision detection is needed
      var textList = svgToDraw.querySelectorAll('text')
      var oldTextArray = Array.prototype.slice.call(textList)
      // then store all new labels in newTextArray for collision detection
      var newTextArray = []
      var currY = y - (textArr.length - 1) * vertParam *
        (this.lineGapRatio + this.fullHeightRatio) * this.textSize
      textArr.forEach(function (line, index) {
        newTextArray.push(this.drawText(
          x, currY, line, textAnchor, params, svgToDraw
        ))
        currY += (this.lineGapRatio + this.fullHeightRatio) * this.textSize
      }, this)

      // collision detection, if collision is detected, remove all new labels
      // because there should not be many text elements within the labeling
      // area, a brute-force approach should be enough
      if (avoidCollision && newTextArray.some(function (newNode) {
        var newBox = newNode.getBBox()
        return oldTextArray.some(function (oldNode) {
          var oldBox = oldNode.getBBox()
          return (newBox.x + newBox.width > oldBox.x) &&
            (oldBox.x + oldBox.width > newBox.x) &&
            (newBox.y + newBox.height > oldBox.y) &&
            (oldBox.y + oldBox.height > newBox.y)
        }, this)
      }, this)) {
        // collision found, remove everything from the newTextArray
        newTextArray.forEach(function (textElem) {
          this.removeElement(textElem, svgToDraw)
        }, this)
      }
    }

    drawShortLabel () {
      let shortLabelArr
      if (this._textSvg) {
        shortLabelArr = this._createShortLabelArr()
        if (shortLabelArr) {
          this._drawShortLabelArr(shortLabelArr)
        }
      }
    }

    _createShortLabelArr (label, maxX) {
      maxX = maxX || this.textMargin - this.textRightPadding
      return this.createWordWrappedText(
        label || this.getTrackSetting('shortLabel') || this.parent.id,
        'end', null, this._textSvg, maxX, this.height)
    }

    _drawShortLabelArr (labelArr, maxX) {
      maxX = maxX || this.textMargin - this.textRightPadding
      this.drawWordWrappedText(maxX, this.height * 0.5, labelArr,
        'end', 'both', null, this._textSvg, true)
    }

    /**
     * _checkReqVWindows - check whether the view windows are the same ones
     *    previously requested. This is used to determine if the fulfilled
     *    promise is not a staled one.
     *
     * @param {Array<ChromRegionLiteral>} vwindows - returned view windows
     * @returns {boolean} Whether the view windows are the same.
     * @memberof TrackDom
     */
    _checkReqVWindows (vwindows) {
      try {
        return vwindows.length === this._requestVWArr.length &&
          vwindows.every((vwindow, index) =>
            !give.ChromRegion.compare(vwindow, this._requestVWArr[index])
          )
      } catch (err) {
        give._verbConsole.warn(err.message)
        return false
      }
    }

    _verifyCallerIdRegions (callerIdRegions) {
      if (callerIdRegions && callerIdRegions.hasOwnProperty(this.id)) {
        let regions = callerIdRegions[this.id]
        if (!Array.isArray(regions)) {
          regions = [regions]
        }
        return this._checkReqVWindows(regions)
      } else {
        return false
      }
    }

    _dataErrorHandler (err, index) {
      if (err instanceof give.PromiseCanceler) {
        throw err
      }
      if (err &&
        (!this._verifyCallerIdRegions(err.callerIdRegions) &&
          this._readyPromiseWindowIndices.has(index)
        )
      ) {
        // not the same region, and there is a newer promise in the same
        //    window
        throw new give.PromiseCanceler(this.readyPromise)
      }
      this._commitPendingChanges()
      // TODO: do something (such as drawing in this._mainSvg) to indicate
      //    error
      this.drawShortLabel()
      throw err
    }

    _commitPendingChanges () {
      // commit pending view windows
      this.viewWindow = this._pendingNewVWArr || this.viewWindow
      this._pendingNewVWArr = null
      // commit pending widths (if any)
      if (this._pendingTotalWidth) {
        this.totalWidth = this._pendingTotalWidth
        this.windowWidth = this._pendingWindowWidth
        delete this._pendingTotalWidth
        delete this._pendingWindowWidth
        this.setSvgSize()
      }
      this._dataPromise = null
    }

    // ** Track event handling and functions **

    drawDataWrapper (callerIdRegions, index, ...args) {
      // fire track-ready event to its container
      // (to calculate size and do other stuff)
      if (!this._verifyCallerIdRegions(callerIdRegions)) {
        // the promise being resolved is stale
        throw new give.PromiseCanceler(this.readyPromise)
      }
      this._commitPendingChanges()
      this.drawData(...args)
      this.drawShortLabel()
      // draw a rectangle over the coordinate track to handle mouse events
      this._updateSvgReceiver(this._mainSvg)
      return this.viewWindow
    }

    loadCache () {
      if (!this._dataPromise) {
        // there is no future redrawing queued
        this._cacheDebouncer = Polymer.Debouncer.debounce(
          this._cacheDebouncer,
          Polymer.Async.timeOut.after(this._cacheDebounceInt),
          () => this.parent.fetchData(
            this.getViewWindowExtArray(this.constructor.CacheRangeSpanProp),
            this.id)
        )
      }
    }

    /**
     * _checkDataAndUpdateDebounced - handle debouncing and grouping multiple
     *    checks (if the track has multiple view windows)
     *
     * @param {ChromRegionLiteral} newVWindow - The new window to be checked
     *    against
     * @param {...object} args - additional arguments, for tracks with
     *    multiple windows, the first object should be `index` of the window.
     * @returns
     * @memberof TrackDom
     */
    _checkDataAndUpdateDebounced (newVWindow, index, ...args) {
      // Steps:
      // * run this._checkDataAndUpdate (debounced) as callback
      //    * if this._checkDataAndUpdate has been debounced, reject the
      //      current promise

      // First cancel cache loading debouncers if there is any.
      if (this._cacheDebouncer && this._cacheDebouncer.isActive()) {
        this._cacheDebouncer.cancel()
        this._cacheDebouncer = null
      }

      if (!Array.isArray(newVWindow)) {
        if (!this._pendingNewVWArr) {
          this._pendingNewVWArr = this.viewWindowArray.slice()
        }
        this._pendingNewVWArr[index] = newVWindow
      } else {
        this._pendingNewVWArr = newVWindow.slice()
      }

      if (!this._debouncePromise) {
        if (this._drawDebounceInt) {
          this._debouncePromise = new Promise((resolve, reject) => {
            setTimeout(resolve, this._drawDebounceInt)
          })
        } else {
          this._debouncePromise = Promise.resolve()
        }
        return this._debouncePromise
          .then(() => this._checkDataAndUpdate(index, ...args))
      }
      throw new give.PromiseCanceler(this.readyPromise)
    }

    /**
     * @function _checkDataAndUpdate
     * Check if `this.parent` has up-to-date data and then refresh the DOM
     * content. The new view window is supplied in `this._pendingNewVWArr`.
     *
     * @returns {Promise} A Promise that will resolve to `this.viewWindow`
     *    when everything is done. (`this.loadCache` uses `Polymer.Async`
     *    so it will happen after the Promise is resolved.)
     *    If a new function call can be answered with an on-going Promise
     *    (presumably chained by other Promises in calling code), a
     *    rejected Promise (with a give.PromiseCanceler) will be returned
     *    indicating no further chaining is needed.
     * @memberof TrackDom
     */
    _checkDataAndUpdate (index, ...args) {
      // The procedures for checking data and update is shown below:
      // * Call this.parent.fetchData to get the up-to-date data promise.
      //    * If the returned promise is the same as the existing one, this
      //      shows that `this.parent` will provide the correct resolution for
      //      the existing data promise (`this._dataPromise`), therefore,
      //      previously chained promises after `this._dataPromise` can
      //      still be used and no new promise shall be needed.
      //      Reject the current promise with `give.PromiseCanceler`.
      //    * If the returned promise is different (or is new), then a new
      //      promise chain is needed.
      //      The stale promise chain will be cancelled in
      //      `this.drawDataWrapper`
      // * Chained promises include `this.drawDataWrapper`, then
      //      `this.loadCache`, it will resolve to `this.viewWindow`
      //    * whenever _checkDataAndUpdate (debounced) is done, run loadCache
      this._debouncePromise = null
      this._requestVWArr = this.getViewWindowExtArray(
        this.constructor.DefaultRangeSpanProp, this._pendingNewVWArr)
      let newDataPromise = this.parent.fetchData(this._requestVWArr, this.id)
      if (this._dataPromise !== newDataPromise) {
        this._dataPromise = newDataPromise
        return newDataPromise
          .catch(err => this._dataErrorHandler(err, index))
          .then(callerIdRegions =>
            this.drawDataWrapper(callerIdRegions, index, ...args)
          )
          .then(() => this.loadCache())
          .then(() => this.viewWindow)
      }
      // Otherwise it's the same data promise, use the old chained functions
      // after this._dataPromise instead of creating new chained functions
      throw new give.PromiseCanceler(this.readyPromise)
    }

    _updateContent (viewWindow, index, ...args) {
      // viewWindow is the new viewWindow value of coordinates
      // index is the index of viewWindow (for tracks with multiple viewWindows)
      // if both are omitted, just refresh the track
      viewWindow = this._verifyViewWindow(viewWindow, index)
      this._updateViewWindowResolution(viewWindow, index)

      try {
        this.readyPromise =
          this._checkDataAndUpdateDebounced(viewWindow, index, ...args)
            .catch(e => {
              // catch all error that is *not* give.PromiseCanceler
              if (e instanceof give.PromiseCanceler) {
                throw e
              }
              give._verbConsole.warn(e)
              give.fireSignal('give-warning', { errObj: e }, null,
                this.trackSvg)
              return e
            })
            .then(e => {
              // needs to implement this 'finally except when
              //    give.PromiseCanceler is thrown' case.
              give.fireSignal('track-ready', { ID: this.parent.id }, null,
                this.trackSvg)
              this.readyPromise = null
              this._readyPromiseWindowIndices.clear()
              if (e && e instanceof Error) {
                throw e
              }
              return e
            })
            .catch(e => {
              if (e instanceof give.PromiseCanceler &&
                !this._readyPromiseWindowIndices.has(index)
              ) {
                // It's possible for a track to have a stale promise in a
                //    different view window (the second window requested got a
                //    new promise, making the previous window's promise
                //    stale.). However, such stale promises should not affect
                //    the downstream procedures for the first window since the
                //    content will be updated anyway.
                return this.viewWindow
              }
              throw e
            })
        this._readyPromiseWindowIndices.clear()
      } catch (err) {
        if (!(err instanceof give.PromiseCanceler) ||
          this._readyPromiseWindowIndices.has(index)
        ) {
          throw err
        }
      }
      this._readyPromiseWindowIndices.add(index)
      return this.readyPromise
    }

    regionInWindow (region, svgToDraw) {
      // return true if region overlaps with svgToDraw.viewWindow
      svgToDraw = svgToDraw || this._mainSvg
      return svgToDraw.viewWindow.overlaps(region) > 0
    }

    regionWindowDirection (region, svgToDraw) {
      // return relative direction of the region with svgToDraw.viewWindow
      // null if not on the same chromosome
      // -1 if region is to the left
      // 1 if region is to the right
      // 0 if overlapping
      svgToDraw = svgToDraw || this._mainSvg
      return svgToDraw.viewWindow.chr === region.chr
        ? (svgToDraw.viewWindow.start > region.end
          ? -1 : (svgToDraw.viewWindow.end < region.start ? 1 : 0)
        ) : null
    }

    _verifyViewWindow (viewWindow, vWinIndex) {
      viewWindow = viewWindow || this.viewWindow
      if (Array.isArray(viewWindow)) {
        viewWindow = viewWindow.map(
          (window, index) => this._verifyViewWindowElem(window, index)
        )
      } else {
        viewWindow = this._verifyViewWindowElem(
          viewWindow, vWinIndex - this.windowIndex)
      }
      return viewWindow
    }

    _verifyViewWindowElem (viewWindowElem, index) {
      if (typeof viewWindowElem === 'string') {
        return new give.ChromRegion(viewWindowElem, this.parent.refObj)
      } else if (viewWindowElem instanceof give.ChromRegion) {
        return viewWindowElem.clipRegion(this.parent.refObj).clone()
      } else {
        throw new give.GiveError(
          'Invalid viewWindow element: ' + viewWindowElem + '!'
        )
      }
    }

    static rgbToHex (colorRGB) {
      return '#' + ((1 << 24) + colorRGB).toString(16).slice(1)
    }

    tokensToDict (line) {
      // this function is used to 'dictionarize' the track settings line
      // it will convert lines such as 'track type=wiggle_0 name="fixedStep"
      // description="fixedStep format"' into JavaScript Objects such as
      // {
      //   'track': null,
      //   'type': 'wiggle_0',
      //   'name': 'fixedStep',
      //   'description': 'fixedStep format'
      // }
      var result = {}
      var tokens = line.split(/\s+/g)
      tokens.every(function (token, index) {
        // notice that there should be no '=' in keys, but '=' should be fine
        //   in values
        // also '#' will not be treated as comment if appearing within value
        //   and quoted
        var components = token.trim().split('=')
        var key = components.shift()
        var value = components.join('=')
        // detect # in key
        if (key.split('#').length > 1) {
          key = key.split('#', 1)
          if (key.length > 0) {
            // there is still key before '#'
            result[key] = ''
          }
          // whatever follows will be comment
          return false
        }
        if (
          (value.charAt(0) === "'" &&
            value.charAt(value.length - 1) === "'") ||
          (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"')
        ) {
          // remove outside quotes, also ignore '#'
          value = value.substr(1, value.length - 2)
        } else {
          // detect '#'
          if (value.split('#').length > 1) {
            value = value.split('#', 1)
            result[key] = value
            // whatever follows will be comment
            return false
          }
        }
        result[key] = value
        return true
      }, this)
      return result
    }

    // ** Event handlers **

    dragHandler (e, detail) {
      // this is used to handle all 'track' events
      window.getSelection().removeAllRanges()
      switch (detail.state) {
        case 'start':
        // register initial window
          try {
            e.target.classList.add('grabbing')
            this.dragData = {}
            this.dragData.oldWindow = this.viewWindow.clone()
            this.dragData.ratio = -1 / parseFloat(this.windowWidth)
          } catch (err) {
            console.log(err)
          }
          break
        case 'track':
          // update track coordinates on the fly
          // also update window text
          if (this.dragData) {
            give.fireSignal('update-window', {
              windowIndex: this.windowIndex,
              newWindow: this.dragData.oldWindow.getShift(
                detail.dx * this.dragData.ratio, true,
                this.parent.refObj).regionToString(false)
            }, null, e.target)
            // this.setViewWindowString(this.dragData.oldWindow.getShift(
            //   detail.dx * this.dragData.ratio, true, this.parent.refObj)
            //   .regionToString(false));
          }
          break
        case 'end':
        // update window content
          e.target.classList.remove('grabbing')
          if (this.dragData) {
            give.fireSignal('update-window', {
              windowIndex: this.windowIndex,
              newWindow: this.dragData.oldWindow.getShift(
                detail.dx * this.dragData.ratio, true,
                this.parent.refObj).regionToString(false)
            }, null, e.target)
          }
          delete (this.dragData)
          break
      }
    }

    wheelHandler (e, detail) {
      // do nothing here, will do stuff in coor-track
    }

    static get defaultProperties () {
      return Object.assign(super.defaultProperties || {}, {
        textSize: 12,
        fullHeightRatio: 1.0,
        halfHeightRatio: 0.6,
        lineGapRatio: 0.1,
        textRightPadding: 8,
        _drawDebounceInt: 200,
        _cacheDebounceInt: 200,
        visibility: give.TrackObject.StatusEnum.VIS_FULL,
        pin: 'scroll',
        dynamicHeight: false,
        forecolorIndex: 0
      })
    }
  }

  TrackDom._trackCounter = 0

  TrackDom.DEFAULT_HEIGHT = 80
  // this is the type of visibility values that are allowed in a particular
  //   track
  TrackDom.allowedVis = [
    give.TrackObject.StatusEnum.VIS_NONE,
    give.TrackObject.StatusEnum.VIS_DENSE,
    give.TrackObject.StatusEnum.VIS_NOTEXT,
    give.TrackObject.StatusEnum.VIS_COLLAPSED,
    give.TrackObject.StatusEnum.VIS_PACK,
    give.TrackObject.StatusEnum.VIS_FULL
  ]

  TrackDom.colorSet = [
    0x000000,
    0x3F51B5, 0x2196F3, 0x009688,
    0x4CAF50, 0xCDDC39, 0xFFC107,
    0x795548, 0xF44336, 0x9C27B0
  ] // put color set here

  TrackDom.VALIGN_TOP = 0
  TrackDom.VALIGN_CENTER = 1
  TrackDom.VALIGN_BOTTOM = 2
  TrackDom.CacheRangeSpanProp = 0.5
  TrackDom.DefaultRangeSpanProp = 0.1 // this is used for smoothing purposes

  give.TrackDom = TrackDom

  return give
})(GIVe || {})
