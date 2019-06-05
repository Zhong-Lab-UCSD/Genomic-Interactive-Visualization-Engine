import '../basic-func/basic-func.js';
import '../chrom-region/chrom-region.js';
// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  give.ChromRegionDisp = function (mainParams, ref, additionalParams) {
    give.ChromRegion.apply(this, arguments)
    if (typeof this.track === 'string') {
      this.track = [this.track]
    } else if (!Array.isArray(this.track)) {
      this.track = []
    }
    this.track.map = {}
    if (ref) {
      this.ref = ref
    }
    for (var i = 0; i < this.track.length; i++) {
      // first replace trackName with actual track object
      if (ref) {
        this.track[i] = this.ref.reverseLookupTable[this.track[i]]
      }
      if (this.track.map.hasOwnProperty(this.track[i].id)) {
        this.track.splice(i, 1)
        i--
      } else {
        this.track.map[this.track[i].id] = true
      }
    }
  }

  give.extend(give.ChromRegion, give.ChromRegionDisp)

  give.ChromRegionDisp.prototype._regionFromObject = function (regionObject) {
    give.ChromRegion.prototype._regionFromObject.apply(this, arguments)
    if (typeof regionObject._extendedStart !== 'number' || parseInt(regionObject._extendedStart) > this.start) {
      this._extendedStart = this.start
    } else {
      this._extendedStart = parseInt(regionObject._extendedStart)
    }
    if (typeof regionObject._extendedEnd !== 'number' || parseInt(regionObject._extendedStart) > this.start) {
      this._extendedEnd = this.end
    } else {
      this._extendedEnd = parseInt(regionObject._extendedEnd)
    }
  }

  give.ChromRegionDisp.prototype._regionFromString = function (regionString) {
    give.ChromRegion.prototype._regionFromString.apply(this, arguments)
    this._extendedStart = this.start
    this._extendedEnd = this.end
  }

  give.ChromRegionDisp.prototype.extendedRegionToString = function (includeStrand) {
    // default is including strand
    if (typeof includeStrand === 'undefined' || includeStrand === null) {
      includeStrand = true
    }
    return this.chr + ':' + (this._extendedStart + 1 - give.ChromRegion.CHROM_BASE) +
      '-' + this._extendedEnd +
      ((!includeStrand || this.strand === null) ? '' : (' (' +
      (this.strand ? '+' : '-') + ')'))
  }

  give.ChromRegionDisp.prototype.assimilate = function (region, strandSpecific) {
    give.ChromRegion.prototype.assimilate.call(this, region, strandSpecific)
    var regionExtendedStart = region._extendedStart || region.start
    var regionExtendedEnd = region._extendedEnd || region.end
    this._extendedStart = Math.min(this._extendedStart, parseInt(regionExtendedStart))
    this._extendedEnd = Math.max(this._extendedEnd, parseInt(regionExtendedEnd))
    if (region.hasOwnProperty('track')) {
      if (Array.isArray(region.track)) {
        region.track.forEach(function (trackEntry) {
          if (!this.track.map.hasOwnProperty(trackEntry.id || trackEntry)) {
            this.track.push(trackEntry)
            this.track.map[trackEntry.id || trackEntry] = true
          }
        }, this)
      } else if (this.track.map[region.track.id || region.track] !== true) {
        this.track.push(region.track)
        this.track.map[region.track.id || region.track] = true
      }
    }
    return this
  }

  give.ChromRegionDisp.prototype.getExtendedRegion = function () {
    var result = this.clone()
    result.start = this._extendedStart
    result.end = this._extendedEnd
    return result
  }

  return give
})(GIVe || {})
