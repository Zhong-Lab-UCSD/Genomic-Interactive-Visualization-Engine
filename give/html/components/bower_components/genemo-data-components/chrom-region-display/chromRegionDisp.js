// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  give.ChromRegionDisp = function (mainParams, species, additionalParams) {
    give.ChromRegion.apply(this, arguments)
    this.data = this.data || {}
  }

  give.extend(give.ChromRegion, give.ChromRegionDisp)

  give.ChromRegionDisp.prototype.regionFromObject = function (regionObject) {
    give.ChromRegion.prototype.regionFromObject.apply(this, arguments)
    if (typeof regionObject.extendedstart !== 'number' || parseInt(regionObject.extendedstart) > this.start) {
      this.extendedstart = this.start
    } else {
      this.extendedstart = parseInt(regionObject.extendedstart)
    }
    if (typeof regionObject.extendedend !== 'number' || parseInt(regionObject.extendedstart) > this.start) {
      this.extendedend = this.end
    } else {
      this.extendedend = parseInt(regionObject.extendedend)
    }
  }

  give.ChromRegionDisp.prototype.regionFromString = function (regionString) {
    give.ChromRegion.prototype.regionFromString.apply(this, arguments)
    this.extendedstart = this.start
    this.extendedend = this.end
  }

  give.ChromRegionDisp.prototype.extendedRegionToString = function (includeStrand) {
    // default is including strand
    if (typeof includeStrand === 'undefined' || includeStrand === null) {
      includeStrand = true
    }
    return this.chr + ':' + this.extendedstart + '-' + this.extendedend +
      ((!includeStrand || this.strand === null) ? '' : (' (' +
      (this.strand ? '+' : '-') + ')'))
  }

  give.ChromRegionDisp.prototype.assimilate = function (region, strandSpecific) {
    give.ChromRegion.prototype.assimilate.call(this, region, strandSpecific)
    var regionExtendedStart = region.extendedstart || region.start
    var regionExtendedEnd = region.extendedend || region.end
    this.extendedstart = Math.min(this.extendedstart, parseInt(regionExtendedStart))
    this.extendedend = Math.max(this.extendedend, parseInt(regionExtendedEnd))
    if (region.hasOwnProperty('track')) {
      if (!this.hasOwnProperty('track')) {
        this.track = []
        this.track.map = {}
      } else if (typeof (this.track) === 'string') {
        this.track = [this.track]
        this.track.map = {}
        this.track.map[this.track[0]] = true
      }
  //    if($.isArray(region.data['track'])) {
  //      $.each(region.data['track'], function(key, val) {
  //        this.data['track'].push(val);
  //      });
  //    } else {
  //      this.data['track'].push(region.data['track']);
  //    }
      if (this.track.map[region.track] !== true) {
        this.track.push(region.track)
        this.track.map[region.track] = true
      }
    }
    return this
  }

  return give
})(GIVe || {})
