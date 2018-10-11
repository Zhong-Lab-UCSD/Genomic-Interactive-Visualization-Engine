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
