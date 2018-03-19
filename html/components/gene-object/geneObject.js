// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  give.GeneObject = function (mainParams, ref, additionalParams) {
    give.AggregatedTranscript.apply(this, arguments)
    this.transcripts = []
    this.transcripts.push(new give.TranscriptObject(mainParams, ref, additionalParams))
    this.name = this.geneSymbol
  }

  give.extend(give.AggregatedTranscript, give.GeneObject)

  give.GeneObject.prototype.merge = function (newRegion) {
    // add new transcript/gene to the gene
    // notice that the amount of columns in Gene will not be increased if different from transcript
    // (adding a BED12 transcript to a BED4 gene will still keep it as a BED4 gene)
    // and it is not possible to add a transcript with less information to the gene
    // (adding a BED4 transcript to a BED12 gene will generate error)

    if (give.AggregatedTranscript.prototype.merge.apply(this, arguments)) {
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

  give.GeneObject.prototype.getGeneName = function (withTransNums) {
    return this.getShortName() + ((withTransNums && this.transcripts.length > 1)
      ? ' (' + this.transcripts.length + ')' : '')
  }

  return give
})(GIVe || {})
