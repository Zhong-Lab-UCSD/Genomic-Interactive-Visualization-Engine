// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  give.AggregatedTranscript = function (mainParams, ref, additionalParams) {
    give.TranscriptObject.apply(this, arguments)
  }

  give.extend(give.TranscriptObject, give.AggregatedTranscript)

  give.AggregatedTranscript.prototype.merge = function (newRegion) {
    // add new transcript/gene to the gene
    // notice that the amount of columns in Gene will not be increased if different from transcript
    // (adding a BED12 transcript to a BED4 gene will still keep it as a BED4 gene)
    // and it is not possible to add a transcript with less information to the gene
    // (adding a BED4 transcript to a BED12 gene will generate error)

    // TODO: complete potential error handling code

    // first, put all the blocks into one ordered array
    if (this.getNumOfBlocks()) {
      var newStart = Math.min(this.start, newRegion.start)
      var i
      for (i = 0; i < this.getNumOfBlocks(); i++) {
        this.blockStarts[i] = this.blockStarts[i] + this.start - newStart
      }
      var loc = 0
      for (i = 0; i < newRegion.getNumOfBlocks(); i++) {
        loc = give.locationOf(newRegion.blockStarts[i] + newRegion.start - newStart,
          this.blockStarts, loc) + 1
        this.blockStarts.splice(loc, 0, newRegion.blockStarts[i] + newRegion.start - newStart)
        this.blockSizes.splice(loc, 0, newRegion.blockSizes[i])
      }
      // then merge the blocks
      for (i = 0; i < this.blockStarts.length - 1; i++) {
        if (this.blockStarts[i] + this.blockSizes[i] >= this.blockStarts[i + 1]) {
          // merge this block with the next one
          this.blockSizes[i] = Math.max(this.blockStarts[i] + this.blockSizes[i],
                          this.blockStarts[i + 1] + this.blockSizes[i + 1]) -
                     this.blockStarts[i]
          this.blockStarts.splice(i + 1, 1)
          this.blockSizes.splice(i + 1, 1)
          i--
        }
      }
    }

    // then extend length and thick length
    this.assimilate(newRegion)
    if (this.thickStart) {
      this.thickStart = Math.min(this.thickStart, newRegion.thickStart)
    }
    if (this.thickEnd) {
      this.thickEnd = Math.max(this.thickEnd, newRegion.thickEnd)
    }
  }

  return give
})(GIVe || {})
