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
   * Object representing a track,
   * contains its data component and visualization component.
   * @typedef {object} TrackObjectBase
   * @property {string} id - ID of track object
   * @property {object} Settings - Settings of the track, in a dictionary format
   * @property {object} defaultSettings - defaultSettings upon initialization
   * @property {RefObjectLiteral} ref - Genome reference object of the track
   * @property {TrackDataObjectBase} _dataObj - The data object,
   *   should be an instance of `give.TrackDataObject` or its derived class
   *
   * @class give.TrackObject
   *
   * @constructor
   * @param {string} ID - The ID of the new track object
   * @param {object} Settings - Settings of the new track. Dictionary format.
   *   Note that if `Settings` has a property named `settings`,
   *   it will be merged with `this.Settings`, while properties in
   *   `Settings.settings` take precedence in cases of conflict names
   * @param {RefObjectLiteral} ref - the reference the track is using
   */
  give.TrackObject = function (ID, Settings, ref) {
    this.id = ID
    Settings = Settings || {}
    // collapse settings object first
    //  (properties in Settings.settings take precedence)
    if (Settings.settings) {
      Settings = Object.assign(Settings, Settings.settings)
      delete Settings.settings
    }

    this.Settings = Object.assign({}, Settings)
    this.defaultSettings = Settings
    this._initSettings()

    this.ref = ref
    this._dataObj = (typeof this._DataObjCtor === 'function')
      ? new this._DataObjCtor(this)
      : null
  }

  /**
   * @memberof TrackObjectBase.prototype
   * The constructor for actual data object being used in this track.
   */
  give.TrackObject.prototype._DataObjCtor = null

  /**
   * @memberof TrackObjectBase.prototype
   * The constructor for actual DOM object being used in this track.
   */
  give.TrackObject.prototype._DomObjCtor = null

  /**
   * _initSettings - Initialize settings for track object
   * This is used to set some flags from this.Settings for compatibility
   * @memberof TrackObjectBase.prototype
   */
  give.TrackObject.prototype._initSettings = function () {
    this.priority = this.getSetting('priority') || give.TrackObject.DEFAULT_PRIORITY
    if (this.getSetting('visibility')) {
      this.setVisibility(this.getSetting('visibility'))
    } // otherwise leave it to DOM

    if (this.getSetting('requestUrl')) {
      this.requestUrl = this.getSetting('requestUrl')
    }

    if (this.getSetting('isCustom')) {
      this.isCustom = true
      if (this.getSetting('localFile')) {
        // should be a File Object (extension of Blob)
        this.localFile = this.getSetting('localFile')
      } else if (this.getSetting('remoteUrl')) {
        // should be a URL
        this.remoteFile = this.getSetting('remoteUrl')
      }
    }
  }

  /**
   * getTitle - Get the track title information
   * Title is showing what the track is actually about. Currently it's
   * `<datatype>` [(`feature`)], e.g. 'ChIP-Seq (CTCF)'
   *
   * @memberof TrackObjectBase.prototype
   * @returns {string}  the resulting title
   */
  give.TrackObject.prototype.getTitle = function () {
    // generate this.title (previously done by UCSC Browser core)
    if (this.getSetting('groupDataType')) {
      return this.getSetting('groupDataType') +
        (this.getSetting('groupFeature') ? ' (' + this.getSetting('groupFeature') + ')' : '')
    } else if (this.getSetting('dataType')) {
      return this.getSetting('dataType') +
        (this.getSetting('trackFeature') ? ' (' + this.getSetting('trackFeature') + ')' : '')
    }
    return ''
  }

  give.TrackObject.prototype.getTableNames = function () {
    // this is used to shield "super" tracks in the future
    return this.getSetting('track')
  }

  /**
   * getCleanLowerTitle - Get the track title,
   * removing blanks and other characters, then converting to lowercase
   *
   * @memberof TrackObjectBase.prototype
   * @returns {string}  the resulting title
   */
  give.TrackObject.prototype.getCleanLowerTitle = function () {
    // generate this.title (previously done by UCSC Browser core)
    return this.getTitle().replace(/[\s-]+/g, '').toLowerCase()
  }

  /**
   * getUcscVis - Get UCSC visibility string
   * Used to get a short string showing the visibility in UCSC format.
   * (Internally the visibility is stored as a number.)
   *
   * @memberof TrackObjectBase.prototype
   * @returns {string}  UCSC visibility of the track
   */
  give.TrackObject.prototype.getUcscVis = function () {
    switch (this.getSetting('visibility')) {
      case give.TrackObject.StatusEnum.VIS_FULL:
        return 'full'
      case give.TrackObject.StatusEnum.VIS_DENSE:
        return 'dense'
      case give.TrackObject.StatusEnum.VIS_PACK:
        return 'pack'
      case give.TrackObject.StatusEnum.VIS_COLLAPSED:
        return 'collapsed'
      case give.TrackObject.StatusEnum.VIS_NOTEXT:
        return 'notext'
      default:
        return 'hide'
    }
  }

  /**
   * setSetting - Set the setting value.
   *
   * @memberof TrackObjectBase.prototype
   * @param  {string} key - Key of the setting entry
   * @param  {object} value - value of the entry
   */
  give.TrackObject.prototype.setSetting = function (key, value) {
    // Visibility needs special treatment
    if (key === 'visibility') {
      this.setVisibility(value)
    } else {
      this.Settings[key] = value
    }
  }

  /**
   * resetSetting - Reset the setting to its default value
   * If the setting does not have default value, remove the setting entry
   *
   * @memberof TrackObjectBase.prototype
   * @param  {string} key - Key of the setting entry
   */
  give.TrackObject.prototype.resetSetting = function (key) {
    if (this.defaultSettings.hasOwnProperty(key)) {
      this.setSetting(key, this.defaultSettings[key])
    } else {
      delete this.Settings[key]
    }
  }

  /**
   * resetAllSettings - Reset all settings to default values
   * @memberof TrackObjectBase.prototype
   */
  give.TrackObject.prototype.resetAllSettings = function () {
    this.Settings = Object.assign({}, this.defaultSettings)
    this._initSettings()
  }

  /**
   * getSetting - get setting value
   *
   * @memberof TrackObjectBase.prototype
   * @param  {type} key - the key of the setting entry
   * @returns {object} The value of the setting entry
   */
  give.TrackObject.prototype.getSetting = function (key) {
//    if(!this.Settings.settings.hasOwnProperty(key)) {
//      if(this.Settings.hasOwnProperty(key)) {
//        this.Settings.settings[key] = this.Settings[key];
//      }
//    }
//    delete this.Settings[key];
    return this.Settings[key]
  }

  /**
   * setVisibility - Set the visibility of the track
   *
   * @memberof TrackObjectBase.prototype
   * @param  {boolean|string|number|undefined|null} vis The visibility.
   *   If `vis` is a `boolean`, `null` or `undefined`, it will work by toggling
   *     between the current non-`hide` visibility and `hide`.
   *     Current visibility will be saved in `this.oldVisibility`;
   *   If `vis` is a `number`, it just works as the internal values;
   *   If `vis` is a `string`, it will convert UCSC terms into internal numeric
   *     values.
   */
  give.TrackObject.prototype.setVisibility = function (vis) {
    // if vis === false, then save old visibility
    if (typeof vis === 'boolean') {
      if (!vis) {
        // needs to save current visibility
        this.oldVisibility = this.oldVisibility || this.getSetting('visibility')
        this.Settings['visibility'] = give.TrackObject.StatusEnum.VIS_NONE
      } else {
        this.Settings['visibility'] = this.oldVisibility ||
          give.TrackObject.StatusEnum.VIS_FULL
        delete this.oldVisibility
      }
    } else if (typeof vis === 'number') {
      // is visibility value
      if (vis === give.TrackObject.StatusEnum.VIS_NONE) {
        // needs to save current visibility
        this.oldVisibility = this.oldVisibility || this.getSetting('visibility')
      } else {
        delete this.oldVisibility
      }
      this.Settings['visibility'] = vis
    } else if (typeof vis === 'string') {
      switch (vis.toLowerCase()) {
        case 'dense':
          this.Settings['visibility'] = give.TrackObject.StatusEnum.VIS_DENSE
          break
        case 'full':
          this.Settings['visibility'] = give.TrackObject.StatusEnum.VIS_FULL
          break
        case 'hide':
          this.Settings['visibility'] = give.TrackObject.StatusEnum.VIS_NONE
          break
        case 'pack':
          this.Settings['visibility'] = give.TrackObject.StatusEnum.VIS_PACK
          break
        case 'collapsed':
          this.Settings['visibility'] = give.TrackObject.StatusEnum.VIS_COLLAPSED
          break
        case 'notext':
          this.Settings['visibility'] = give.TrackObject.StatusEnum.VIS_NOTEXT
          break
        default:
      }
    } else if (typeof vis === 'undefined' || vis === null) {
      // use as toggle switch
      this.setVisibility(!this.getSetting('visibility'))
    }
  }

  // getInfo: function() {
  //  return "<td>" + this.info.replace(/\t/g, "</td>\n<td>") + "</td>";
  // };
  //
  // getInfoString: function() {
  //  return this.info.replace(/\t/g, ' - ');
  // };
  //
  //
  /**
   * getID - Get the ID of the track
   *
   * @memberof TrackObjectBase.prototype
   * @returns {string}  The ID
   */
  give.TrackObject.prototype.getID = function () {
    return this.id
  }

  /**
   * getReadableID - Get a human readable ID of the track,
   *   `_` will be replaced by ` `
   *
   * @memberof TrackObjectBase.prototype
   * @returns {string}  Human readable ID
   */
  give.TrackObject.prototype.getReadableID = function () {
    return this.getID().replace(/_+/g, ' ')
  }

  /**
   * getType - Get the track type string.
   *   The track type string is inherited from UCSC, where the first keyword
   *   indicates the main track type (which can be retrieved by
   *   `this.getTypeTrunk()`)
   *
   * @memberof TrackObjectBase.prototype
   * @returns {string}  The track type string
   */
  give.TrackObject.prototype.getType = function () {
    return this.getSetting('type')
  }

  /**
   * getTypeTrunk - Get the track type keyword.
   *   This is used to get the lowercase keyword of the track type
   *   (see `this.getType()`).
   *
   * @memberof TrackObjectBase.prototype
   * @returns {string}  The track type keyword
   */
  give.TrackObject.prototype.getTypeTrunk = function () {
    return this.getSetting('type').split(/\s+/, 2)[0].toLowerCase()
  }

  /**
   * getCleanID - Get the ID that conforms to HTML 4.1
   *   Brackets and spaces will be removed in ID.
   *   *Since HTML5 is being required now, this function may be deprecated.*
   *
   * @memberof TrackObjectBase.prototype
   * @returns {string}  Cleaned ID
   */
  give.TrackObject.prototype.getCleanID = function () {
    // remove blanks and brackets in IDs to conform to HTML 4.1
    return this.getID().replace(/[\s()+/]/g, '')
  }

  /**
   * getPriority - Get the priority value of the track
   *   This value is changable at runtime and will affect the order of the track
   *     in `chart-area` element **within the same group**.
   *   Tracks with smaller priority will be put closer to the top of the view
   *     (if the view has its order reversed, then it will be closer to the
   *     bottom).
   *   Please refer to `give.ChartArea` for track orders
   *
   * @memberof TrackObjectBase.prototype
   * @returns {number}  The priority value
   */
  give.TrackObject.prototype.getPriority = function () {
    // TODO:
    //  1. implement group priority
    //   2. implement customized temporary priority
    return this.priority
  }

  /**
   * fetchData - Get data for ranges at given resolutions, then call callback.
   *
   * @memberof TrackObjectBase.prototype
   * @param  {Array<ChromRegionLiteral>|ChromRegionLiteral} ranges -
   *   An array of `give.ChromRegion`s to get the data for.
   *   For each `ChromRegion` element, resolution can be individually assigned
   *     by setting `element.resolution` property or using the next parameter
   *     (When both are assigned, `elemnent.resolution` takes precedence).
   * @param  {Array<number>} resolutions Resolutions required for the ranges
   * @param  {function} callback    The callback function that will be called
   *   once the data is loaded.
   *   The function should not take any arguments (Use function.prototype.bind()
   *     to pre-package required parameters).
   * @param  {string} callerID    The element ID calling `this.fetchData`, this is
   *   used to collapse multiple calls from the same element.
   */
  give.TrackObject.prototype.fetchData = function (ranges, resolutions, callback, callerID) {
    if (this._dataObj && this._dataObj.fetchData) {
      return this._dataObj.fetchData(ranges, resolutions, callback, callerID)
    } else {
      // There is no data in this track, get the callback done and return
      if (typeof callback === 'function') {
        callback()
      }
    }
  }

  /**
   * getData - Get the actual `this._dataObj._DataStructure` object representing
   *    the underlying data. Underlying data are supposed to be ready when this
   *    method is called.
   * This method can be overriden to accept `null` if needed
   *
   * @param  {string} chrom The chrom to be requested
   * @returns {this._dataObj._DataStructure|null}       the underlying data
   *    (or `null` if no data for the track)
   */
  give.TrackData.prototype.getData = function (chrom) {
    if (this._dataObj) {
      return this._dataObj.getData(chrom)
    }
    return null
  }

  /**
   * ********** Static Properties for TrackObject Below **********
   */

  /**
   * createDomObj - Create a DOM Object from this track.
   *   The DOM Object will need to handle all display issues separately but
   *   connects to `this` for data retrieval and other issues.
   *
   * @param  {object} prop - Properties to be passed on to the DOM Object
   * @returns {give.TrackDOMBehavior}      - The DOM Object
   */
  give.TrackObject.prototype.createDomObj = function (prop) {
    if (typeof this._DomObjCtor === 'function') {
      return new this._DomObjCtor(this, prop)
    } else {
      return null
    }
  }

  /**
   * Enum for track visibility values.
   * @static
   * @readonly
   * @enum {number}
   */
  give.TrackObject.StatusEnum = {
    /**
     * Full visibility. Show the most amount of details for the track.
     */
    VIS_FULL: 5,
    /**
     * Show lots of details for the track. Pack the information together if
     * possible.
     */
    VIS_PACK: 4,
    /**
     * Show some details for the track. Pack the information together if
     * possible. Some information may be collapsed.
     */
    VIS_COLLAPSED: 3,
    /**
     * Show some details for the track. Pack the information together if
     * possible. Some information may be collapsed. Text labels will be omitted.
     */
    VIS_NOTEXT: 2,
    /**
     * Show as few details for the track as possible. Only minimum details
     * is shown to provide essential information for the track.
     */
    VIS_DENSE: 1,
    /**
     * Hide the track. Do not show in the browser.
     */
    VIS_NONE: 0
  }

  /**
   * @property {number} DEFAULT_PRIORITY - The default values for priorities
   * @static
   */
  give.TrackObject.DEFAULT_PRIORITY = 100.0

  /**
   * comparePriorities - compare the priority values between two tracks
   *   The group priority will take precedence and be compared first, then
   *   individual track priority will be compared.
   *   `undefined` is larger than any numeric value.
   *
   * @static
   * @memberof TrackObjectBase
   * @param  {TrackObjectBase} track1 The first track object
   * @param  {TrackObjectBase} track2 The second track object
   * @param  {object} groups Dictionary for groups (key is `group.id`)
   * @returns {number}  Compare results:
   *   1 if track1's priority is larger than track2's;
   *   0 if both priorities are equal;
   *   -1 if track1's priority is smaller than track2's.
   */
  give.TrackObject.comparePriorities = function (track1, track2, groups) {
    // compare group priorities first, then local priorities
    // tracks without groups will be considered as top priority (for now)
    var group1Prior = 0
    var group2Prior = 0
    try {
      group1Prior = groups[track1.groupID].priority
    } catch (e) {
    }
    try {
      group2Prior = groups[track2.groupID].priority
    } catch (e) {
    }
    return group1Prior !== group2Prior
      ? (group1Prior < group2Prior ? -1 : 1)
      : (track1.getPriority() < track2.getPriority() ? -1
        : track1.getPriority() > track2.getPriority() ? 1 : 0)
  }

  /**
   * createCoorTrack - Create a coordinate track for given reference
   *
   * @static
   * @param  {RefObjectLiteral} ref Reference for the coordinate track
   * @param  {string} id  ID of the coordinate track
   *   If no ID is specified, `'coor_' + ref.db` will be used as ID
   * @returns {TrackObjectBase}     The resulting track object
   */
  give.TrackObject.createCoorTrack = function (ref, id) {
    var newTrack = new give.TrackObject(id || 'coor_' + ref.db,
      { type: 'coordinate', priority: 0, noData: true }, ref)
    newTrack.setSetting('type', 'coordinate')
    newTrack.priority = 0
    newTrack.noData = true
    return newTrack
  }

  /**
   * createTrack - Create a track object by its type
   *
   * @param  {string} type     The type of the track
   * @param  {string} ID       ID of the track, see constructor
   * @param  {object} Settings Settings to be passed, see constructor
   * @param  {RefObjectLiteral} ref      Reference, see constructor
   * @returns {TrackObjectBase}          returned TrackObject
   */
  give.TrackObject.createTrack = function (ID, Settings, ref, type) {
    try {
      type = type || Settings.type || Settings.settings.type
      type = type.split(/\s+/, 2)[0].toLowerCase()
    } catch (e) {
    }
    if (this.typeMap && this.typeMap.hasOwnProperty(type)) {
      return new this.typeMap[type](ID, Settings, ref)
    } else {
      give._verboseConsole('Type \'' + type + '\' is not a valid type! ',
        give.VERBOSE_WARNING)
      return new this.typeMap._default(ID, Settings, ref)
    }
  }

  /**
   * registerTrack - Register this track by its type trunk
   *
   * @param  {TrackObjectBase} trackImpl Implementation of track,
   *    `trackImpl.getType()` (notice that this is __not__
   *    `trackImpl.prototype.getType()`, which is the non-static method)
   *    will be called to get the key value(s)
   * @returns {boolean}     Return true if there is no implementation with the
   *    same key(s), otherwise false
   */
  give.TrackObject.registerTrack = function (trackImpl) {
    var keys = trackImpl.getType()
    if (!Array.isArray(keys)) {
      keys = [keys]
    }
    var result = keys.every(function (key) {
      return !give.TrackObject.typeMap.hasOwnProperty(key)
    }, this)
    keys.forEach(function (key) {
      give.TrackObject.typeMap[key] = trackImpl
    }, this)
    return result
  }

  /**
   * typeMap - a dictionary where all the implementations should register.
   * To register, put the type string as `key`, derived TrackObject as `value`.
   * e.g. `give.TrackObject.typeMap['bed'] = give.BedTrack`
   */
  give.TrackObject.typeMap = {
    _default: give.TrackObject
  }

  /**
   * ********** Virtual Methods to Be Implemented in Tracks Below **********
   */

  /**
   * @memberof TrackObjectBase.prototype
   * The constructor for actual data object being used in this track.
   */
  give.TrackObject.prototype._DataObjCtor = null

  /**
   * @memberof TrackObjectBase.prototype
   * The constructor for actual DOM object being used in this track.
   */
  give.TrackObject.prototype._DomObjCtor = null

  return give
})(GIVe || {})
