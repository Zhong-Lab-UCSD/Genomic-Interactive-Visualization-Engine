// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  give.TrackObject = function (ID, Settings, ref) {
    this.id = ID
    Settings = Settings || {}
    // collapse settings object first
    //  (properties in Settings.settings takes precedence)
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
    this._domObj = (typeof this._DomObjCtor === 'function')
      ? new this._DomObjCtor(this)
      : null
  }

  give.TrackObject.prototype._DataObjCtor = null
  give.TrackObject.prototype._DomObjCtor = null

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

  give.TrackObject.prototype.getCleanLowerTitle = function () {
    // generate this.title (previously done by UCSC Browser core)
    return this.getTitle().replace(/[\s-]+/g, '').toLowerCase()
  }

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

  give.TrackObject.prototype.setSetting = function (key, value) {
//    if(this.Settings.hasOwnProperty(key)) {
//      delete this.Settings[key];
//    }
    if (key === 'visibility') {
      this.setVisibility(value)
    } else {
      this.Settings[key] = value
    }
  }

  give.TrackObject.prototype.resetSetting = function (key) {
    if (this.defaultSettings.hasOwnProperty(key)) {
      this.setSetting(key, this.defaultSettings[key])
    } else {
      delete this.Settings[key]
    }
  }

  give.TrackObject.prototype.resetAllSettings = function () {
    this.Settings = Object.assign({}, this.defaultSettings)
    this._initSettings()
  }

  give.TrackObject.prototype.getSetting = function (key) {
//    if(!this.Settings.settings.hasOwnProperty(key)) {
//      if(this.Settings.hasOwnProperty(key)) {
//        this.Settings.settings[key] = this.Settings[key];
//      }
//    }
//    delete this.Settings[key];
    return this.Settings[key]
  }

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
  give.TrackObject.prototype.getID = function () {
    return this.id
  }

  give.TrackObject.prototype.getReadableID = function () {
    return this.getID().replace(/_+/g, ' ')
  }

  give.TrackObject.prototype.getType = function () {
    return this.getSetting('type')
  }

  give.TrackObject.prototype.getTypeTrunk = function () {
    return this.getSetting('type').split(/\s+/, 2)[0].toLowerCase()
  }

  give.TrackObject.prototype.getCleanID = function () {
    // remove blanks and brackets in IDs to conform to HTML 4.1
    return this.getID().replace(/[\s()+/]/g, '')
  }

  give.TrackObject.prototype.getPriority = function () {
    // TODO:
    //  1. implement group priority
    //   2. implement customized temporary priority
    return this.priority
  }

  give.TrackObject.prototype.getData = function (ranges, resolutions, callback, callerID) {
    if (this._dataObj && this._dataObj.getData) {
      return this._dataObj.getData(ranges, resolutions, callback, callerID)
    } else {
      // There is no data in this track, get the callback done and return
      if (typeof callback === 'function') {
        callback()
      }
    }
  }

  give.TrackObject.StatusEnum = {
    VIS_FULL: 5,
    VIS_NONE: 0,
    VIS_PACK: 4,
    VIS_COLLAPSED: 3,      // this is for gene track only, will collapse overlapping transcripts
    VIS_NOTEXT: 2,        // this is for gene track only, will remove all texts
    VIS_DENSE: 1
  }

  give.TrackObject.DEFAULT_PRIORITY = 100.0

  give.TrackObject.RESOLUTION_BUFFER_RATIO = 2.0

  give.TrackObject.createCoorTrack = function (ref, id) {
    var newTrack = new give.TrackObject(id || 'coor_' + ref.db,
      { type: 'coordinate', priority: 0, noData: true }, ref)
    newTrack.setSetting('type', 'coordinate')
    newTrack.priority = 0
    newTrack.noData = true
    return newTrack
  }

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

  return give
})(GIVe || {})
