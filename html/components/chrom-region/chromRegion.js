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
   */
  class ChromRegion {
    /**
     * Creates an instance of ChromRegion.
     * @param {(ChromRegionLiteral|string)} mainParams -
     *   Main parameters used in the ChromRegion.
     *   Either use a string like 'chr1:12345-56789'
     *   or an object with chr, start, end, and strand or other essential
     *   props
     * @param {give.RefObject} [refObj] - Reference genome of the region,
     *   used for clipping the region, use `null` to omit
     * @param {object} [additionalParams] - Additional parameters needed
     * @param {boolean} [zeroBased] - Whether this chrom region's coordinate
     *   is zero based.
     * @memberof ChromRegion
     */
    constructor (mainParams, refObj, additionalParams, zeroBased) {
      // usage: new ChromRegionObject(mainParam, refObj, additionalParam)
      //    mainParam:
      //      either use a string like 'chr1:12345-56789'
      //      or an object with chr, start, end, and strand or other essential
      //      props
      //    refObj:
      //      used for clipping the region, null if no-clipping needed
      //    additionalParam:
      //      some other parameters that may slip into the object
      try {
        if (typeof mainParams === 'string') {
          this._regionFromString(mainParams, zeroBased, refObj)
        } else if (typeof mainParams === 'object') {
          this._regionFromObject(mainParams)
        } else {
          throw new give.GiveError(
            'Must create ChromRegion with object or string!')
        }
        if (isNaN(this._start) || isNaN(this._end)) {
          throw new give.GiveError(
            'ChromRegion start and/or end number invalid!')
        }
        this.clipRegion(refObj)
        var key
        if (typeof mainParams === 'object') {
          for (key in mainParams) {
            if (!this.hasOwnProperty(key) && mainParams.hasOwnProperty(key)) {
              try {
                this[key] = mainParams[key]
              } catch (e) {
                give._verbConsole.info(e)
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
                give._verbConsole.info(e)
              }
            }
          }
        }
      } catch (e) {
        give._verbConsole.warn(e)
        give._verbConsole.log('When creating chromosomal regions with: ')
        give._verbConsole.log(mainParams)
        throw (e)
      }
    }

    clipRegion (refObj, minLength) {
      if (this._start < this.constructor.CHROM_BASE) {
        this._start = this.constructor.CHROM_BASE
      }
      if (refObj && refObj.chromInfo) {
        if (refObj.chromInfo[this.chr.toLowerCase()]) {
          this.chr = refObj.chromInfo[this.chr.toLowerCase()].chrRegion.chr
          if (refObj.chromInfo[this.chr].chrRegion._end < this._end) {
            this._end = refObj.chromInfo[this.chr].chrRegion._end
          }
        } else if (!refObj.chromInfo[this.chr]) {
          // this is not a valid chromosome
          throw (new give.GiveError(
            this.chr + ' is not a valid chromosome for ' + refObj.db + '!'))
        }
      }
      if (this._start > this._end) {
        if (typeof minLength === 'number') {
          give._verbConsole.info('Coordinates out of bounds: ' + this.chr +
            ':' + this._start + '-' + this._end + '.', give.VERBOSE_WARNING)
          this._start = Math.max(
            this.constructor.CHROM_BASE, this._end - minLength)
          give._verbConsole.info('Changed into: ' + this.chr + ':' +
            this._start + '-' + this._end + '.', give.VERBOSE_WARNING)
        } else {
          throw (new give.GiveError(
            'Coordinates out of bounds: ' + this.chr + ':' +
            this._start + '-' + this._end + '!'))
        }
      }
      return this
    }

    get length () {
      return this._end - this._start
    }

    get startCoor () {
      return { chr: this.chr, coor: this._start }
    }

    get endCoor () {
      return { chr: this.chr, coor: this._end - 1 }
    }

    get start () {
      return this._start
    }

    get end () {
      return this._end
    }

    set start (newStart) {
      if (isNaN(newStart) || newStart > this._end) {
        throw (new give.GiveError('Invalid new start value: ' + newStart))
      }
      this._start = newStart
    }

    set end (newEnd) {
      if (isNaN(newEnd) || newEnd < this._start) {
        throw (new give.GiveError('Invalid new end value: ' + newEnd))
      }
      this._end = newEnd
    }

    _regionFromString (regionString, zeroBased, refObj) {
      if (refObj && refObj.chromInfo &&
        refObj.chromInfo[regionString.toLowerCase()]
      ) {
        this.chr = refObj.chromInfo[regionString.toLowerCase()].chrRegion.chr
        this._start =
          refObj.chromInfo[regionString.toLowerCase()].chrRegion._start
        this._end = refObj.chromInfo[regionString.toLowerCase()].chrRegion._end
        this.strand = null
      } else {
        var cleanedChrString = regionString.replace(/,/g, '')
          .replace(/\(\s*-\s*\)/g, ' NEGSTR')
          .replace(/\(\s*\+\s*\)/g, ' POSSTR')
        var elements = cleanedChrString.split(/[:\s-]+/)

        this.chr = elements[0]
        this._start = parseInt(elements[1]) -
          (zeroBased ? 0 : (1 - this.constructor.CHROM_BASE))
        this._end = parseInt(elements[2])
        this.strand = (elements.length < 4
          ? this._strand : !(elements[3] === 'NEGSTR'))
      }
    }

    _regionFromObject (regionObject) {
      this.chr = regionObject.chr
      this._start = parseInt(regionObject.start)
      this._end = parseInt(regionObject.end)
      this.strand = regionObject.strand
      this.name = regionObject.regionname || regionObject.name || ''
    }

    _regionFromBed (bedString) {
      // notice that this only handle chr, start, end, name, strand in BED 4+
      //    format
      var tokens = bedString.split(/ +|\t/)
      this.chr = tokens[0]
      this._start = parseInt(tokens[1])
      this._end = parseInt(tokens[2])
      this.strand = (tokens.length < 6) ? this._strand : tokens[5]
      this.name = (tokens[3] && tokens[3] !== '.')
        ? tokens[3] : (this.name || '')
    }

    regionToString (includeStrand) {
      // default is including strand
      return this.chr + ':' +
        (this._start + 1 - this.constructor.CHROM_BASE) + '-' + this._end +
        ((includeStrand === false || this._strand === null)
          ? '' : (' (' + (this._strand ? '+' : '-') + ')'))
    }

    regionToBed (includeStrand) {
      return this.chr + '\t' + this._start + '\t' + this._end + '\t' +
        (this.name ? this.name : '.') +
        ((includeStrand !== false && this._strand !== null)
          ? '\t0\t' + (!this._strand ? '-' : '+') : '')
    }

    toString () {
      // default is including strand
      return this.regionToString(true)
    }

    set strand (newStr) {
      switch (typeof (newStr)) {
        case 'string':
          if (newStr === '.' || newStr === '') {
            this._strand = null
          } else {
            this._strand = !(newStr.indexOf('-') >= 0 ||
              newStr.indexOf('0') >= 0)
          }
          break
        case 'number':
          this._strand = (newStr > 0)
          break
        case 'boolean':
          this._strand = newStr
          break
        case 'undefined':
          this._strand = null
          break
        default:
          this._strand = (newStr === null ? null : !!(newStr))
      }
      return this._strand
    }

    get strand () {
      return this._strand
    }

    getStrand (flankbefore, flankafter) {
      return (typeof this._strand === 'boolean')
        ? (((typeof flankbefore === 'string') ? flankbefore : '') +
          (this._strand ? '+' : '-') +
          ((typeof flankafter === 'string') ? flankafter : ''))
        : null
    }

    get shortName () {
      return give.shortenString(this.name,
        this.constructor._REGION_SHORTNAME_LIMIT,
        this.constructor._REGION_SHORTNAME_PREFIX_LENGTH,
        this.constructor._REGION_SHORTNAME_SUFFIX_LENGTH)
    }

    overlaps (region, strandSpecific) {
      // this will return the length of overlaps, if not overlapping, return 0
      // if strandSpecific is specified, then overlap will be 0 if both
      //    strands exist and do not match
      if (this.chr !== region.chr ||
        (strandSpecific &&
          (this._strand !== null && region._strand !== null) &&
          this._strand !== region._strand)) {
        return 0
      }
      if (this._start >= region._end || this._end <= region._start) {
        return 0
      }
      return parseInt(Math.min(this._end, region._end)) -
        parseInt(Math.max(this._start, region._start))
    }

    assimilate (region, strandSpecific) {
      if (!this.overlaps(region, strandSpecific)) {
        return null
      }
      this._start = parseInt(Math.min(this._start, region._start))
      this._end = parseInt(Math.max(this._end, region._end))
      return this
    }

    concat (region, strandSpecific) {
      if (strandSpecific &&
        (this._strand !== null && region._strand !== null) &&
        this._strand !== region._strand) {
        return null
      }
      if (this._end === region._start) {
        this._end = region._end
      } else if (this._start === region._end) {
        this._start = region._start
      } else {
        return null
      }
      return this
    }

    intersect (region, strandSpecific) {
      if (!this.overlaps(region, strandSpecific)) {
        return null
      }
      this._start = parseInt(Math.max(this._start, region._start))
      this._end = parseInt(Math.min(this._end, region._end))
      return this
    }

    move (distance, isProportion, refObj) {
      // isProportion means whether move by proportion
      // may clip distance to what we have
      if (isProportion) {
        distance *= this.length
      }
      distance = parseInt(distance + 0.5)
      if (distance + this._start < this.constructor.CHROM_BASE) {
        distance = this.constructor.CHROM_BASE - this._start
      } else if (refObj && refObj.chromInfo && refObj.chromInfo[this.chr] &&
        refObj.chromInfo[this.chr].chrRegion._end < this._end + distance) {
        distance = refObj.chromInfo[this.chr].chrRegion._end - this._end
      }
      this._start = this._start + distance
      this._end = this._end + distance
      return this
    }

    clone () {
      return new this.constructor(this)
    }

    getShift (distance, isProportion, refObj) {
      return this.clone().move(distance, isProportion, refObj)
    }

    extend (sizediff, center, isProportion, refObj, minimumSize) {
      // isProportion means whether extend by proportion
      minimumSize = minimumSize || 1
      if (!sizediff) {
        return this
      }
      if (isProportion) {
        sizediff *= this.length
      }
      sizediff = parseInt(sizediff + 0.5)
      var newsize = this.length + sizediff
      center = center || (this._start + this._end) / 2
      if (center < this._start) {
        center = this._start
      } else if (center > this._end) {
        center = this._end
      }
      if (newsize < minimumSize) {
        newsize = minimumSize
        sizediff = newsize - this.length
      } else if (refObj && refObj.chromInfo && refObj.chromInfo[this.chr] &&
        refObj.chromInfo[this.chr].chrRegion.length < newsize) {
        newsize = refObj.chromInfo[this.chr].chrRegion.length
      }
      if (center > this._start) {
        // extend left
        this._start = this._start -
          parseInt(sizediff * (center - this._start) / this.length + 0.5)
        if (this._start < this.constructor.CHROM_BASE) {
          this._start = this.constructor.CHROM_BASE
        }
        this._end = this._start + newsize
      } else {
        this._end = this._end + sizediff
      }
      if (refObj && refObj.chromInfo && refObj.chromInfo[this.chr] &&
        refObj.chromInfo[this.chr].chrRegion._end < this._end) {
        this._end = refObj.chromInfo[this.chr].chrRegion._end
        this._start = this._end - newsize
      }
      return this
    }

    getExtension (sizediff, center, isProportion, refObj, minimumSize) {
      return this.clone().extend(
        sizediff, center, isProportion, refObj, minimumSize)
    }

    static clipCoordinate (coor, refObj) {
      // this is to clip single coordinate
      if (coor.coor < this.CHROM_BASE) {
        coor.coor = this.CHROM_BASE
      } else if (refObj && refObj.chromInfo && refObj.chromInfo[coor.chr] &&
        refObj.chromInfo[coor.chr].chrRegion._end < coor.coor) {
        coor.coor = refObj.chromInfo[coor.chr].chrRegion._end
      }
      return coor
    }

    static isValidChromRegion (chrStr, refObj) {
      try {
        var tempChrRegion = new this(chrStr)
        tempChrRegion.clipRegion(refObj)
      } catch (e) {
        give._verbConsole.info(e)
        return false
      }
      return true
    }

    static compare (region1, region2) {
      return ((region1.chr === region2.chr)
        ? ((region1.start === region2.start)
          ? ((region1.end === region2.end)
            ? 0 : ((region1.end > region2.end) ? 1 : -1))
          : ((region1.start > region2.start) ? 1 : -1))
        : ((region1.chr > region2.chr) ? 1 : -1)) // chr not the same
    }

    static isEqual (region1, region2) {
      return (region1 && region2)
        ? (region1.chr === region2.chr &&
          region1.start === region2.start && region1.end === region2.end)
        : (!!region1 === !!region2)
    }
  }

  ChromRegion._REGION_SHORTNAME_LIMIT = 11
  ChromRegion._REGION_SHORTNAME_PREFIX_LENGTH = 6
  ChromRegion._REGION_SHORTNAME_SUFFIX_LENGTH = 4
  ChromRegion.CHROM_BASE = 0 // may be 0 for UCSC

  give.ChromRegion = ChromRegion

  return give
})(GIVe || {})
