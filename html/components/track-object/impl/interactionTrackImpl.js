// JavaScript Document

var GIVe = (function (give) {
  'use strict'

  give.TrackObjectImpl._InteractionImpl = give.TrackObjectImpl._InteractionImpl || {}

  give.TrackObjectImpl._InteractionImpl.DataHandler = function (res, data, chrRegions) {
    // this is to handle data within response
    // return data should be already sorted by chrom and start

    // first, purge buffer if different chromosome
//      for(var chrom in this.data) {
//        if(this.data.hasOwnProperty(chrom) && !res.hasOwnProperty(chrom)) {
//          // not the same chromosome
//          delete this.data[chrom];
//        }
//      }
    // this is to handle data within response
    // first, purge buffer if different chromosome

    // notice that dirFlag can be undefined,
    //    however, if it's defined, then it will be the window index (for now)
    var linkMap = {}
    var resToRegion = function (resEntry) {
      return new give.ChromRegion(resEntry.regionString,
                    this.ref, {
                      data: {
                        linkID: parseInt(resEntry.linkID),
                        regionID: parseInt(resEntry.ID),
                        value: parseFloat(resEntry.value),
                        dirFlag: isNaN(parseInt(resEntry.dirFlag)) ? null : parseInt(resEntry.dirFlag)
                      }
                    })
    }.bind(this)
    var linkRegion = function (linkMap, region) {
      if (!linkMap.hasOwnProperty(region.data.linkID)) {
        linkMap[region.data.linkID] = []
        linkMap[region.data.linkID].map = {}
      }
      if (!linkMap[region.data.linkID].map.hasOwnProperty(region.data.regionID)) {
        linkMap[region.data.linkID].push(region)
        linkMap[region.data.linkID].map[region.data.regionID] = true
      }
      region.data.linkedRegions = linkMap[region.data.linkID]
    }.bind(this, linkMap)

    for (var chrom in res) {
      if (res.hasOwnProperty(chrom) && Array.isArray(res[chrom])) {
        data[chrom].insert(res[chrom].map(resToRegion, this),
                   chrRegions, null, linkRegion)
      }
    }
  }

  give.TrackObjectImpl._InteractionImpl.LocalFileHandler = function (localFile, queryRegions) {
    // placeholder to read local file content
    // query is the current window (may involve buffering, can be implemented in prepareCustomQuery)
    // data will be passed via firing a 'response' event with {detail: data}
    // and the response will be handled by this.responseHandler(e, detail)

    // Interaction file implementation:
    //    brutal force going through the file to find regions that intersect the query region
    //    return the lines filtered
    //    currently using FileReader.readAsText(), may change into better adaptations for bigger files
    //      like in http://matthewmeye.rs/blog/post/html5-line-reader/
    //      or    http://stackoverflow.com/questions/24647563/reading-line-by-line-file-in-javascript-on-client-side

    var reader = new window.FileReader()
    var result = {}
    reader.onload = function (e) {
      var lines = e.target.result.split(/\r\n|\r|\n/g)
      var linkID = 0
      lines.forEach(function (line) {
        linkID++
        var tokens = line.split(/\s+/g)
        var regions = [new give.ChromRegion(tokens[0] + ':' + tokens[1] + '-' + tokens[2] + '(' + tokens[3] + ')'),
          new give.ChromRegion(tokens[4] + ':' + tokens[5] + '-' + tokens[6] + '(' + tokens[7] + ')')]
        if (regions.some(function (region, index) {
          return region.overlaps(queryRegions[index])
        }, this)) {
          // needs to push this line to result
          regions.forEach(function (region, index) {
            if (!result.hasOwnProperty(region.chr)) {
              result[region.chr] = []
            }
            result[region.chr].push({regionString: region.toString(), linkID: linkID, dirFlag: index})
          }, this)
        }
      }, this)
      give.TrackObjectImpl._InteractionDataHandler.call(this, result, queryRegions)
    }.bind(this)
    reader.readAsText(localFile)
  }

  give.TrackObjectImpl.interaction = give.TrackObjectImpl._InteractionImpl

  return give
})(GIVe || {})
