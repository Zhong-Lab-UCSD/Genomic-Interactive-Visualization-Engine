// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  give.ChromRegionDisp = function (mainParams, species, additionalParams) {
    give.ChromRegion.apply(this, arguments)
    if (typeof this.track === 'string') {
      this.track = [this.track]
    } else if (!Array.isArray(this.track)) {
      this.track = []
    }
    this.track.map = {}
    if (species) {
      this.species = species
    }
    for (var i = 0; i < this.track.length; i++) {
      // first replace trackName with actual track object
      if (species) {
        this.track[i] = this.species.reverseLookupTable[this.track[i]]
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

  give.ChromRegionDisp.prototype.getExtendedRegions = function () {
    var result = this.clone()
    result.start = this.extendedstart
    result.end = this.extendedend
    return result
  }

  return give
})(GIVe || {})
