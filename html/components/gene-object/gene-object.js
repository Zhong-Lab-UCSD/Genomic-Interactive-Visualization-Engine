import '../basic-func/basic-func.js';
import '../chrom-region/chrom-region.js';
import '../transcript-object/transcript-object.js';
// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  class AggregatedTranscript extends give.TranscriptObject {
    merge (newRegion) {
      // add new transcript/gene to the gene
      // notice that the amount of columns in Gene will not be increased if
      // different from transcript
      // (adding a BED12 transcript to a BED4 gene will still keep it as a BED4
      // gene)
      // and it is not possible to add a transcript with less information to the
      // gene
      // (adding a BED4 transcript to a BED12 gene will generate error)

      // TODO: complete potential error handling code
      if (!this.overlaps(newRegion)) {
        return false
      }
      // first, put all the blocks into one ordered array
      if (this.numOfBlocks) {
        let newStart = Math.min(this.start, newRegion.start)
        for (let i = 0; i < this.numOfBlocks; i++) {
          this.blockStarts[i] = this.blockStarts[i] + this.start - newStart
        }
        let loc = 0
        for (let i = 0; i < newRegion.numOfBlocks; i++) {
          loc = give.locationOf(
            newRegion.blockStarts[i] + newRegion.start - newStart,
            this.blockStarts, loc)
          this.blockStarts.splice(
            loc, 0, newRegion.blockStarts[i] + newRegion.start - newStart)
          this.blockSizes.splice(loc, 0, newRegion.blockSizes[i])
        }
        // then merge the blocks
        for (let i = 0; i < this.blockStarts.length - 1; i++) {
          if (this.blockStarts[i] + this.blockSizes[i] >=
            this.blockStarts[i + 1]
          ) {
            // merge this block with the next one
            this.blockSizes[i] = Math.max(
              this.blockStarts[i] + this.blockSizes[i],
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

      return this
    }
  }

  give.AggregatedTranscript = AggregatedTranscript

  return give
})(GIVe || {})
// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  class GeneObject extends give.AggregatedTranscript {
    constructor (mainParams, refObj, additionalParams) {
      super(...arguments)
      this.transcripts = []
      this.transcripts.push(
        new give.TranscriptObject(mainParams, refObj, additionalParams))
      this.name = this.geneSymbol
    }

    merge (newRegion) {
      // add new transcript/gene to the gene
      // notice that the amount of columns in Gene will not be increased if
      // different from transcript
      // (adding a BED12 transcript to a BED4 gene will still keep it as a BED4
      // gene)
      // and it is not possible to add a transcript with less information to the
      // gene
      // (adding a BED4 transcript to a BED12 gene will generate error)

      if (super.merge(...arguments)) {
        // add the new transcript to this.transcripts
        if (newRegion.transcripts) {
          this.transcripts = this.transcripts.concat(newRegion.transcripts)
        } else {
          this.transcripts.push(newRegion)
        }
        return this
      }
      return false
    }

    getGeneName (withTransNums) {
      return this.shortName +
        ((withTransNums && this.transcripts.length > 1)
          ? ' (' + this.transcripts.length + ')' : '')
    }
  }

  give.GeneObject = GeneObject

  return give
})(GIVe || {})
