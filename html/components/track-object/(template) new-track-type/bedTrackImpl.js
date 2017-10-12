// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  give.TrackObjectImpl._BedImpl = give.TrackObjectImpl._BedImpl || {}

  give.TrackObjectImpl._BedImpl.DataHandler = function (res, data, regions) {
    // this is to handle data within response
    // return data should be already sorted by chrom and start

    // first, purge buffer if different chromosome
    //      for(var chrom in this.data) {
    //        if(this.data.hasOwnProperty(chrom) && !res.hasOwnProperty(chrom)) {
    //          // not the same chromosome
    //          delete this.data[chrom];
    //        }
    //      }
    var resChromEntryFunc = function (geneArray, geneNameMap, resChromEntry) {
      var newGene = new give.GeneObject(
        new give.TranscriptObject(resChromEntry.geneBed,
                      this.ref,
                      { geneName: resChromEntry.geneSymbol }))
      if (this.getTypeTrunk().indexOf('gene') > -1) {
        // is some gene oriented type
        if (geneNameMap.hasOwnProperty(newGene.name) && geneNameMap[newGene.name].overlaps(newGene)) {
          // check if it overlaps with existing gene(s)
          // because the gene list is sorted by start,
          //    whenever it doesn't overlap with the current gene
          //    it will become a new gene entry.
          geneNameMap[newGene.name].merge(newGene)
        } else {
          geneArray.push(newGene)
          geneNameMap[newGene.name] = newGene
        }
      } else {
        geneArray.push(newGene)
      }
    }

    for (var chrom in res) {
      if (res.hasOwnProperty(chrom) && Array.isArray(res[chrom])) {
        var geneNameMap = {}
        var geneArray = []
        res[chrom].forEach(resChromEntryFunc.bind(this, geneArray, geneNameMap), this)
        // then populate the B+ Tree with geneArray
        data[chrom].insert(geneArray, regions)
      }
    }
  }

  give.TrackObjectImpl._BedImpl.LocalFileHandler = function (localFile, regions) {
    // placeholder to read local file content
    // query is the current window (may involve buffering, can be implemented in prepareCustomQuery)
    // data will be passed via firing a 'response' event with {detail: data}
    // and the response will be handled by this.responseHandler(e, detail)

    // BED file implementation:
    //    brutal force going through the file to find regions that intersect the query region
    //    return the lines filtered
    //    currently using FileReader.readAsText(), may change into better adaptations for bigger files
    //      like in http://matthewmeye.rs/blog/post/html5-line-reader/
    //      or    http://stackoverflow.com/questions/24647563/reading-line-by-line-file-in-javascript-on-client-side

    var reader = new window.FileReader()
    var result = {}
    reader.onload = function (e) {
      var lines = e.target.result.split(/\r\n|\r|\n/g)
      lines.forEach(function (line) {
        var transcript = new give.TranscriptObject(line)
        if (regions.some(function (region) {
          return transcript.overlaps(region)
        }, this)) {
          // needs to push this line to result
          if (!result.hasOwnProperty(transcript.chr)) {
            result[transcript.chr] = []
          }
          result[transcript.chr].push({geneBed: line})
        }
      }, this)
      give.TrackObjectImpl._BedDataHandler.call(this, result, regions)
    }.bind(this)
    reader.readAsText(localFile)
  }

  give.TrackObjectImpl.bed = give.TrackObjectImpl._BedImpl
  give.TrackObjectImpl.genebed = give.TrackObjectImpl._BedImpl
  give.TrackObjectImpl.genepred = give.TrackObjectImpl._BedImpl

  return give
})(GIVe || {})
