import '../basic-func/basic-func.js';
import '../chrom-region/chrom-region.js';
var GIVe = (function (give) {
  'use strict'

  class TranscriptObject extends give.ChromRegion {
    constructor (mainParams, refObj, additionalParams) {
      super(...arguments)
      // check whether thickStart and thickEnd are valid
      this.geneSymbol = this.geneSymbol || this.name
    }

    get thickStart () {
      return this._thickStart
    }

    set thickStart (newThickStart) {
      if (typeof newThickStart === 'number') {
        if (newThickStart < this.start) {
          this._thickStart = this.start
        } else {
          this._thickStart = newThickStart
        }
      } else {
        this._thickStart = null
      }
    }

    get thickEnd () {
      return this._thickEnd
    }

    set thickEnd (newThickEnd) {
      if (typeof newThickEnd === 'number') {
        if (newThickEnd > this.end) {
          this._thickEnd = this.end
        } else {
          this._thickEnd = newThickEnd
        }
      } else {
        this._thickEnd = null
      }
    }

    get numOfBlocks () {
      return (Array.isArray(this._blockStarts)
        ? this._blockStarts.length : null)
    }

    get blockStarts () {
      return (Array.isArray(this._blockStarts) ? this._blockStarts : null)
    }

    get blockSizes () {
      return (Array.isArray(this._blockSizes) ? this._blockSizes : null)
    }

    _regionFromString (regionString) {
      var elements = regionString.split(/ +|\t/)
      this._regionFromBed(regionString)
      if (elements[4] && elements[4] !== '.') {
        this.score = parseInt(elements[4])
      }
      if (elements[6] && elements[6] !== '.') {
        this.thickStart = parseInt(elements[6])
        this.thickEnd = parseInt(elements[7])
      }
      if (elements[8] && elements[8] !== '.') {
        this.rgb = elements[8]
      }
      if (elements[9] && elements[9] !== '.') {
        this._setBlocksFromString(elements[10], elements[11])
      }
    }

    _regionFromObject (regionObject) {
      super._regionFromObject(regionObject)
      if (regionObject.score) {
        this.score = parseInt(regionObject.score)
      }
      if (regionObject.thickStart) {
        this._thickStart = parseInt(regionObject.thickStart)
        this._thickEnd = parseInt(regionObject.thickEnd)
      }
      if (regionObject.rgb) {
        this.rgb = regionObject.rgb
      } else if (regionObject.itemRGB) {
        this.rgb = regionObject.itemRGB
      }
      if (regionObject.blockSizes) {
        if (Array.isArray(regionObject.blockSizes)) {
          this._setBlocksFromArray(
            regionObject.blockSizes, regionObject.blockStarts)
        } else if (typeof regionObject.blockSizes === 'string') {
          this._setBlocksFromString(
            regionObject.blockSizes, regionObject.blockStarts)
        }
      }
    }

    regionToBed (includeStrand) {
      return this.chr + '\t' + this.start + '\t' + this.end + '\t' +
        (this.name ? this.name : '.') +
        (includeStrand !== false ? '\t0\t' + (!this.strand ? '-' : '+') : '')
    }

    _checkBlocks () {
      // check blockStarts and blockLengths
      for (var i = 0; i < this.numOfBlocks; i++) {
        if (typeof this._blockStarts[i] !== 'number' ||
          typeof this._blockSizes[i] !== 'number' ||
          isNaN(this._blockStarts[i]) || isNaN(this._blockSizes[i])
        ) {
          throw new give.GiveError('Block #' + i + ' is invalid: not a number.')
        }
        if (this._blockStarts[i] < 0) {
          this._blockStarts[i] = 0
        } else if (this._blockStarts[i] >= this.length) {
          throw (new give.GiveError('Block #' + i + ' is invalid: ' +
            this.regionToString(false) + ', ' +
            this._blockStarts[i] + ' is greater than length.'))
        } else if (this._blockSizes[i] < 0) {
          throw (new give.GiveError('Block #' + i + ' size is invalid: ' +
            this.regionToString(false) + '!'))
        } else if (this._blockStarts[i] + this._blockSizes[i] > this.length) {
          this._blockSizes[i] = this.length - this._blockStarts[i]
        }
      }
    }

    _setBlocksFromArray (exonLengths, exonStarts) {
      if (exonLengths.length !== exonStarts.length) {
        throw (new give.GiveError('Exon lengths not matching: exonLengths(' +
          exonLengths.length + ') vs exonStarts (' + exonStarts.length + ')'))
      }
      this._blockStarts = exonStarts.slice()
      this._blockSizes = exonLengths.slice()
      this._checkBlocks()
    }

    _setBlocksFromString (exonLengths, exonStarts) {
      try {
        var startArray = exonStarts.split(',')
        var lengthArray = exonLengths.split(',')
        var numOfBlocks = startArray.length
        this._blockSizes = []
        this._blockStarts = []
        for (var i = 0; i < numOfBlocks; i++) {
          if (lengthArray[i] !== '' && startArray[i] !== '') {
            this._blockSizes.push(parseInt(lengthArray[i]))
            this._blockStarts.push(parseInt(startArray[i]))
          }
        }
        this._checkBlocks()
      } catch (e) {
        if (typeof exonStarts === 'string' && exonStarts &&
          exonStarts.split(',').length
        ) {
          // there are number of exons,
          // but exon sizes and starts are not correct
          e.message = (e.message || '') + '(Block processing)'
          throw (e)
        }
        this._blockSizes = [this.length]
        this._blockStarts = [0]
      }
    }

    set rgb (newRGB) {
      // note that itemRGB is a string per UCSC BED format "r,g,b"
      if (typeof newRGB === 'string') {
        var rgbArr = newRGB.split(/,\s*/)
        this._itemRGB = 0
        rgbArr.forEach(color => {
          this._itemRGB <<= 8
          this._itemRGB += parseInt(color)
        })
        return true
      } else if (typeof newRGB === 'number') {
        this._itemRGB = newRGB
        return true
      } else {
        delete this._itemRGB
      }
      return false
    }

    get rgb () {
      return this._itemRGB
    }

    getGeneName (withTransNums) {
      return this.geneSymbol
    }
  }

  give.TranscriptObject = TranscriptObject

  return give
})(GIVe || {})
