var GIVe = (function (give) {
  'use strict'

  give.TranscriptObject = function (mainParams, ref, additionalParams) {
    // first, go through ChromObjectBehavior.factoryImpl

    give.ChromRegion.apply(this, arguments)

    // check whether thickStart and thickEnd are valid
    if (this.thickStart && this.thickStart < this.start) {
      this.thickStart = this.start
    }
    if (this.thickEnd && this.thickEnd > this.end) {
      this.thickEnd = this.end
    }
    this.geneName = this.geneName || this.name
  }

  give.extend(give.ChromRegion, give.TranscriptObject)

  give.TranscriptObject.prototype.getThickStart = function () {
    return (typeof this.thickStart === 'number' ? this.thickStart : null)
  }

  give.TranscriptObject.prototype.getThickEnd = function () {
    return (typeof this.thickEnd === 'number' ? this.thickEnd : null)
  }

  give.TranscriptObject.prototype.getNumOfBlocks = function () {
    return (Array.isArray(this.blockStarts) ? this.blockStarts.length : null)
  }

  give.TranscriptObject.prototype.getBlockStarts = function () {
    return (Array.isArray(this.blockStarts) ? this.blockStarts : null)
  }

  give.TranscriptObject.prototype.getBlockSizes = function () {
    return (Array.isArray(this.blockSizes) ? this.blockSizes : null)
  }

  give.TranscriptObject.prototype._regionFromString = function (regionString) {
    var elements = regionString.split(/\s+/)
    give.ChromRegion.prototype._regionFromBed.call(this, regionString)
    if (elements[4]) {
      this.score = parseInt(elements[4])
    }
    if (elements[6]) {
      this.thickStart = parseInt(elements[6])
      this.thickEnd = parseInt(elements[7])
    }
    if (elements[8]) {
      this.setRGB(elements[8])
    }
    if (elements[9]) {
      this._setBlocksFromString(elements[9], elements[10], elements[11])
    }
  }

  give.TranscriptObject.prototype._regionFromObject = function (regionObject) {
    give.ChromRegion.prototype._regionFromObject.call(this, regionObject)
    if (regionObject.score) {
      this.score = parseInt(regionObject.score)
    }
    if (regionObject.thickStart) {
      this.thickStart = parseInt(regionObject.thickStart)
      this.thickEnd = parseInt(regionObject.thickEnd)
    }
    if (regionObject.itemRGB) {
      this.setRGB(regionObject.itemRGB)
    }
    if (regionObject.blockSizes) {
      if (Array.isArray(regionObject.blockSizes)) {
        this._setBlocksFromArray(regionObject.blockSizes, regionObject.blockStarts)
      } else if (typeof regionObject.blockSizes === 'string') {
        this._setBlocksFromString(regionObject.blockSizes, regionObject.blockStarts)
      }
    }
  }

  give.TranscriptObject.prototype.regionToString = function (includeStrand) {
    // default is including strand
    return this.chr + ':' + this.start + '-' + this.end +
      ((includeStrand === false || this.strand === null) ? '' : (' (' +
       (this.strand ? '+' : '-') + ')'))
  }

  give.TranscriptObject.prototype.regionToBed = function (includeStrand) {
    return this.chr + '\t' + this.start + '\t' + this.end + '\t' + (this.name ? this.name : '.') +
        (includeStrand !== false ? '\t0\t' + (!this.strand ? '-' : '+') : '')
  }

  give.TranscriptObject.prototype._checkBlocks = function () {
    // check blockStarts and blockLengths
    for (var i = 0; i < this.blockStarts.length; i++) {
      if (this.blockStarts[i] < 0) {
        this.blockStarts[i] = 0
      } else if (this.blockStarts[i] >= this.getLength()) {
        throw (new Error('Block #' + i + ' is invalid: ' +
          this.chr + ':' + this.start + '-' + this.end + ', ' +
          this.blockStarts[i] + ' is greater than length.'))
      } else if (this.blockSizes[i] < 0) {
        throw (new Error('Block #' + i + ' size is invalid: ' +
          this.chr + ':' + this.start + '-' + this.end + '!'))
      } else if (this.blockStarts[i] + this.blockSizes[i] > this.getLength()) {
        this.blockSizes[i] = this.getLength() - this.blockStarts[i]
      }
    }
  }

  give.TranscriptObject.prototype._setBlocksFromArray = function (exonLengths, exonStarts) {
    if (exonLengths.length !== exonStarts.length) {
      throw (new Error('Exon lengths not matching: exonLengths(' +
        exonLengths.length + ') vs exonStarts (' + exonStarts.length + ')'))
    }
    this.blockStarts = exonStarts.slice()
    this.blockSizes = exonLengths.slice()
    this._checkBlocks()
  }

  give.TranscriptObject.prototype._setBlocksFromString = function (exonLengths, exonStarts) {
    try {
      var startArray = exonStarts.split(',')
      var lengthArray = exonLengths.split(',')
      var numOfBlocks = startArray.length
      this.blockSizes = []
      this.blockStarts = []
      for (var i = 0; i < numOfBlocks; i++) {
        this.blockSizes.push(parseInt(lengthArray[i]))
        this.blockStarts.push(parseInt(startArray[i]))
      }
    } catch (e) {
      if (typeof exonStarts === 'string' && exonStarts.split(',').length) {
        // there are number of exons, but exon sizes and starts are not correct
        e.message = (e.message || '') + '(Block processing)'
        throw (e)
      }
      this.blockSizes = [this.getLength()]
      this.blockStarts = [this.start]
    }
    this._checkBlocks()
  }

  give.TranscriptObject.prototype.setRGB = function (strRGB) {
    // note that itemRGB is a string per UCSC BED format "r,g,b"
    if (strRGB) {
      var rgbArr = strRGB.split(/,\s*/)
      this.itemRGB = 0
      rgbArr.forEach(function (color) {
        this.itemRGB <<= 8
        this.itemRGB += parseInt(color)
      }, this)
      return true
    } else {
      delete this.itemRGB
    }
    return false
  }

  give.TranscriptObject.prototype.getRGB = function () {
    return this.itemRGB
  }

  give.TranscriptObject.prototype.getGeneName = function (withTransNums) {
    return this.geneName
  }

  return give
})(GIVe || {})
