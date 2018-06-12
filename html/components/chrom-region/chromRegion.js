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
   * @typedef ChromRegionLiteral
   * @type {object}
   * @property {string} chr - Chromosome name
   * @property {number} start - Starting coordinate
   * @property {number} end - Ending coordinate (not included in the region)
   * @property {boolean|null} strand - The strand of the region
   * @property {object|null} data - any general data that needs to be attached
   *    to this chromosomal region
   *
   * @class give.ChromRegion
   * Data structure for chromosomal region
   *
   * @constructor
   * @param {(ChromRegionLiteral|string)} mainParams -
   *   Main parameters used in the ChromRegion.
   *   Either use a string like 'chr1:12345-56789'
   *   or an object with chr, start, end, and strand or other essential props
   * @param {give.RefObject} [ref] - Reference genome of the region,
   *   used for clipping the region, use `null` to omit
   * @param {object} [additionalParams] - Additional parameters needed
   *   to be in the ChromRegion
   */
  give.ChromRegion = function (mainParams, ref, additionalParams, zeroBased) {
    // usage: new ChromRegionObject(mainParam, ref, additionalParam)
    //    mainParam:
    //      either use a string like 'chr1:12345-56789'
    //      or an object with chr, start, end, and strand or other essential props
    //    ref:
    //      used for clipping the region, null if no-clipping needed
    //    additionalParam:
    //      some other parameters that may slip into the object

    try {
      if (typeof mainParams === 'string') {
        this._regionFromString(mainParams, zeroBased, ref)
      } else if (typeof mainParams === 'object') {
        this._regionFromObject(mainParams)
      } else {
        throw new give.GiveError(
          'Must create ChromRegion with object or string!')
      }
      if (isNaN(this.start) || isNaN(this.end)) {
        throw new give.GiveError(
          'ChromRegion start and/or end number invalid!')
      }
      this.clipRegion(ref)
      var key
      if (typeof mainParams === 'object') {
        for (key in mainParams) {
          if (!this.hasOwnProperty(key) && mainParams.hasOwnProperty(key)) {
            try {
              this[key] = mainParams[key]
            } catch (e) {
              give._verbConsole.warn(e)
            }
          }
        }
      }
      if (typeof additionalParams === 'object') {
        for (key in additionalParams) {
          if (!this.hasOwnProperty(key) &&
            additionalParams.hasOwnProperty(key)
          ) {
            try {
              this[key] = additionalParams[key]
            } catch (e) {
              give._verbConsole.warn(e)
            }
          }
        }
      }
    } catch (e) {
      give._verbConsole.warn(e)
      give._verbConsole.log('Thrown when creating chromosomal regions with:')
      give._verbConsole.log(mainParams)
      throw (e)
    }
  }

  give.ChromRegion.prototype.clipRegion = function (ref, minLength) {
    if (this.start < give.ChromRegion.CHROM_BASE) {
      this.start = give.ChromRegion.CHROM_BASE
    }
    if (ref && ref.chromInfo) {
      if (ref.chromInfo[this.chr.toLowerCase()]) {
        this.chr = ref.chromInfo[this.chr.toLowerCase()].chrRegion.chr
        if (ref.chromInfo[this.chr].chrRegion.end < this.end) {
          this.end = ref.chromInfo[this.chr].chrRegion.end
        }
      } else if (!ref.chromInfo[this.chr]) {
        // this is not a valid chromosome
        throw (new give.GiveError(
          this.chr + ' is not a valid chromosome for ' + ref.db + '!'))
      }
    }
    if (this.start > this.end) {
      if (typeof minLength === 'number') {
        give._verbConsole.info('Coordinates out of bounds: ' + this.chr + ':' +
          this.start + '-' + this.end + '.', give.VERBOSE_WARNING)
        this.start = Math.max(give.ChromRegion.CHROM_BASE, this.end - minLength)
        give._verbConsole.info('Changed into: ' + this.chr + ':' +
          this.start + '-' + this.end + '.', give.VERBOSE_WARNING)
      } else {
        throw (new give.GiveError(
          'Coordinates out of bounds: ' + this.chr + ':' +
          this.start + '-' + this.end + '!'))
      }
    }
    return this
  }

  give.ChromRegion.prototype.getLength = function () {
    return this.end - this.start
  }

  give.ChromRegion.prototype.getStartCoor = function () {
    return {chr: this.chr, coor: this.start}
  }

  give.ChromRegion.prototype.getEndCoor = function () {
    return {chr: this.chr, coor: this.end}
  }

  give.ChromRegion.prototype.getStart = function () {
    return this.start
  }

  give.ChromRegion.prototype.getEnd = function () {
    return this.end
  }

  give.ChromRegion.prototype.setStart = function (newStart, forced) {
    if (!forced && (isNaN(newStart) || newStart >= this.end)) {
      throw (new give.GiveError('Invalid new start value: ' + newStart))
    }
    this.start = newStart
  }

  give.ChromRegion.prototype.setEnd = function (newEnd, forced) {
    if (!forced && (isNaN(newEnd) || newEnd <= this.start)) {
      throw (new give.GiveError('Invalid new end value: ' + newEnd))
    }
    this.end = newEnd
  }

  give.ChromRegion.prototype._regionFromString = function (regionString, zeroBased, ref) {
    if (ref && ref.chromInfo && ref.chromInfo[regionString.toLowerCase()]) {
      this.chr = ref.chromInfo[regionString.toLowerCase()].chrRegion.chr
      this.start = ref.chromInfo[regionString.toLowerCase()].chrRegion.start
      this.end = ref.chromInfo[regionString.toLowerCase()].chrRegion.end
      this.setStrand(null)
    } else {
      var cleanedChrString = regionString.replace(/,/g, '')
        .replace(/\(\s*-\s*\)/g, ' NEGSTR').replace(/\(\s*\+\s*\)/g, ' POSSTR')
      var elements = cleanedChrString.split(/[:\s-]+/)

      this.chr = elements[0]
      this.start = parseInt(elements[1]) - (zeroBased ? 0 : (1 - give.ChromRegion.CHROM_BASE))
      this.end = parseInt(elements[2])
      this.setStrand((elements.length < 4) ? this.strand : !(elements[3] === 'NEGSTR'))
    }
  }

  give.ChromRegion.prototype._regionFromObject = function (regionObject) {
    this.chr = regionObject.chr
    this.start = parseInt(regionObject.start)
    this.end = parseInt(regionObject.end)
    this.setStrand(regionObject.strand)
    this.name = regionObject.regionname || regionObject.name || ''
  }

  give.ChromRegion.prototype._regionFromBed = function (bedString) {
    // notice that this only handle chr, start, end, name, strand in BED 4+ format
    var tokens = bedString.split(/ +|\t/)
    this.chr = tokens[0]
    this.start = parseInt(tokens[1])
    this.end = parseInt(tokens[2])
    this.setStrand((tokens.length < 6) ? this.strand : tokens[5])
    this.name = (tokens[3] && tokens[3] !== '.') ? tokens[3] : (this.name || '')
  }

  give.ChromRegion.prototype.regionToString = function (includeStrand) {
    // default is including strand
    return this.chr + ':' + (this.start + 1 - give.ChromRegion.CHROM_BASE) +
      '-' + this.end + ((includeStrand === false || this.strand === null)
      ? '' : (' (' + (this.strand ? '+' : '-') + ')'))
  }

  give.ChromRegion.prototype.regionToBed = function (includeStrand) {
    return this.chr + '\t' + this.start + '\t' + this.end + '\t' + (this.name ? this.name : '.') +
        ((includeStrand !== false && this.strand !== null) ? '\t0\t' + (!this.strand ? '-' : '+') : '')
  }

  give.ChromRegion.prototype.toString = function () {
    // default is including strand
    return this.regionToString(true)
  }

  give.ChromRegion.prototype.setStrand = function (newStr) {
    switch (typeof (newStr)) {
      case 'string':
        if (newStr === '.' || newStr === '') {
          this.strand = null
        } else {
          this.strand = !(newStr.indexOf('-') >= 0 || newStr.indexOf('0') >= 0)
        }
        break
      case 'number':
        this.strand = (newStr > 0)
        break
      case 'boolean':
        this.strand = newStr
        break
      case 'undefined':
        this.strand = null
        break
      default:
        this.strand = (newStr === null ? null : !!(newStr))
    }
    return this.strand
  }

  give.ChromRegion.prototype.getStrand = function (flankbefore, flankafter) {
    return (typeof (this.strand) === 'boolean')
      ? (((typeof (flankbefore) === 'string') ? flankbefore : '') +
      (this.strand ? '+' : '-') +
      ((typeof (flankafter) === 'string') ? flankafter : '')) : null
  }

  give.ChromRegion.prototype.getShortName = function () {
    return give.shortenString(this.name, give.ChromRegion._REGION_SHORTNAME_LIMIT,
      give.ChromRegion._REGION_SHORTNAME_PREFIX_LENGTH,
      give.ChromRegion._REGION_SHORTNAME_SUFFIX_LENGTH)
  }

  give.ChromRegion.prototype.overlaps = function (region, strandSpecific) {
    // this will return the length of overlaps, if not overlapping, return 0
    // if strandSpecific is specified, then overlap will be 0 if both strands exist and do not match
    if (this.chr !== region.chr ||
       (strandSpecific &&
      (this.strand !== null && region.strand !== null) &&
      this.strand !== region.strand)) {
      return 0
    }
    if (this.start >= region.end || this.end <= region.start) {
      return 0
    }
    return parseInt(Math.min(this.end, region.end)) -
      parseInt(Math.max(this.start, region.start))
  }

  give.ChromRegion.prototype.assimilate = function (region, strandSpecific) {
    if (!this.overlaps(region, strandSpecific)) {
      return null
    }
    this.start = parseInt(Math.min(this.start, region.start))
    this.end = parseInt(Math.max(this.end, region.end))
    return this
  }

  give.ChromRegion.prototype.concat = function (region, strandSpecific) {
    if (strandSpecific &&
      (this.strand !== null && region.strand !== null) &&
      this.strand !== region.strand) {
      return null
    }
    if (this.end === region.start) {
      this.end = region.end
    } else if (this.start === region.end) {
      this.start = region.start
    } else {
      return null
    }
    return this
  }

  give.ChromRegion.prototype.intersect = function (region, strandSpecific) {
    if (!this.overlaps(region, strandSpecific)) {
      return null
    }
    this.start = parseInt(Math.max(this.start, region.start))
    this.end = parseInt(Math.min(this.end, region.end))
    return this
  }

  give.ChromRegion.prototype.move = function (distance, isProportion, ref) {
    // isProportion means whether move by proportion
    // may clip distance to what we have
    if (isProportion) {
      distance *= this.getLength()
    }
    distance = parseInt(distance + 0.5)
    if (distance + this.start < give.ChromRegion.CHROM_BASE) {
      distance = give.ChromRegion.CHROM_BASE - this.start
    } else if (ref && ref.chromInfo && ref.chromInfo[this.chr] &&
      ref.chromInfo[this.chr].chrRegion.end < this.end + distance) {
      distance = ref.chromInfo[this.chr].chrRegion.end - this.end
    }
    this.start = this.start + distance
    this.end = this.end + distance
    return this
  }

  give.ChromRegion.prototype.clone = function () {
    return new this.constructor(this)
  }

  give.ChromRegion.prototype.getShift = function (distance, isProportion, ref) {
    return this.clone().move(distance, isProportion, ref)
  }

  give.ChromRegion.prototype.extend = function (sizediff, center, isProportion, ref,
    minimumSize) {
    // isProportion means whether extend by proportion
    minimumSize = minimumSize || 1
    if (!sizediff) {
      return this
    }
    if (isProportion) {
      sizediff *= this.getLength()
    }
    sizediff = parseInt(sizediff + 0.5)
    var newsize = this.getLength() + sizediff
    center = center || (this.start + this.end) / 2
    if (center < this.start) {
      center = this.start
    } else if (center > this.end) {
      center = this.end
    }
    if (newsize < minimumSize) {
      newsize = minimumSize
      sizediff = newsize - this.getLength()
    } else if (ref && ref.chromInfo && ref.chromInfo[this.chr] &&
      ref.chromInfo[this.chr].chrRegion.getLength() < newsize) {
      newsize = ref.chromInfo[this.chr].chrRegion.getLength()
    }
    if (center > this.start) {
      // extend left
      this.start = this.start - parseInt(sizediff * (center - this.start) / this.getLength() + 0.5)
      if (this.start < give.ChromRegion.CHROM_BASE) {
        this.start = give.ChromRegion.CHROM_BASE
      }
      this.end = this.start + newsize
    } else {
      this.end = this.end + sizediff
    }
    if (ref && ref.chromInfo && ref.chromInfo[this.chr] &&
      ref.chromInfo[this.chr].chrRegion.end < this.end) {
      this.end = ref.chromInfo[this.chr].chrRegion.end
      this.start = this.end - newsize
    }
    return this
  }

  give.ChromRegion.prototype.getExtension = function (sizediff, center, isProportion, ref, minimumSize) {
    return this.clone().extend(sizediff, center, isProportion, ref, minimumSize)
  }

  give.ChromRegion._REGION_SHORTNAME_LIMIT = 11
  give.ChromRegion._REGION_SHORTNAME_PREFIX_LENGTH = 6
  give.ChromRegion._REGION_SHORTNAME_SUFFIX_LENGTH = 4
  give.ChromRegion.CHROM_BASE = 0 // may be 0 for UCSC

  give.ChromRegion.clipCoordinate = function (coor, ref) {
    // this is to clip single coordinate
    if (coor.coor < give.ChromRegion.CHROM_BASE) {
      coor.coor = give.ChromRegion.CHROM_BASE
    } else if (ref && ref.chromInfo && ref.chromInfo[coor.chr] &&
      ref.chromInfo[coor.chr].chrRegion.end < coor.coor) {
      coor.coor = ref.chromInfo[coor.chr].chrRegion.end
    }
    return coor
  }

  give.ChromRegion.isValidChromRegion = function (chrStr, ref) {
    try {
      var tempChrRegion = new give.ChromRegion(chrStr)
      tempChrRegion.clipRegion(ref)
    } catch (e) {
      give._verbConsole.info(e)
      return false
    }
    return true
  }

  give.ChromRegion.compareChrRegion = function (region1, region2) {
    return ((region1.chr === region2.chr)
      ? ((region1.getStart() === region2.getStart())
        ? ((region1.getEnd() === region2.getEnd())
          ? 0 : ((region1.getEnd() > region2.getEnd()) ? 1 : -1))
        : ((region1.getStart() > region2.getStart()) ? 1 : -1))
      : ((region1.chr > region2.chr) ? 1 : -1)) // region1.chr !== region2.chr
  }

  return give
})(GIVe || {})
