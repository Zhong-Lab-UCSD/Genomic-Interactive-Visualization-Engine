// JavaScript Document

var GIVe = (function (give) {
  'use strict'

  give.TrackObjectImpl._BigWigImpl = give.TrackObjectImpl._BigWigImpl || {}

  give.TrackObjectImpl._BigWigImpl.DataHandler = function (res, data, chrRegions, resolutions) {
      /*
        Returned data will be made up of different entries
        Each entry will be a flat part of the bigWig file,
        the format will be a ChromRegion object with {data: {value: <actual value>} }
      */
    var preConvertData = function (resEntry) {
      return new give.ChromRegion(resEntry.regionString, this.species, {
        data: (resEntry.data.hasOwnProperty('validCount')
            ? new give.TrackObjectImpl._BigWigImpl.SummaryCtor(resEntry.data)
            : resEntry.data),
        resolution: (resEntry.data.hasOwnProperty('validCount')
            ? undefined : 0)
      })
    }.bind(this)

    for (var chrom in res) {
      if (res.hasOwnProperty(chrom) &&
           data.hasOwnProperty(chrom) &&
           Array.isArray(res[chrom])) {
        data[chrom].insert(res[chrom].map(preConvertData, this), chrRegions,
                     null, null, resolutions)
      }
    }
  }

  give.TrackObjectImpl._BigWigImpl.LocalFileHandler = function (localFile, regions) {
    var reader = new window.FileReader()
      // should use bigWig.readSection()
    var datapoints = {}

    reader.onload = function () {
      var bigWig = new give.BigWigFile(reader.result)
      // bigWig.readAll();
      bigWig.readSection(regions)
      datapoints = bigWig.datapoints
      console.log(datapoints)
      this.fire('response', {response: datapoints}, {bubbles: false, cancelable: true})
    }.bind(this)
    reader.readAsArrayBuffer(localFile)
  }

  give.TrackObjectImpl._BigWigImpl.SummaryCtor = function (oldSummary) {
    if (oldSummary) {
      this.validCount = oldSummary.validCount || 0
      this.sumData = oldSummary.sumData || 0
      this.sumSquare = oldSummary.sumSquare || 0
      this.minVal = (typeof oldSummary.minVal === 'number' && !isNaN(oldSummary.minVal))
          ? oldSummary.minVal : Number.POSITIVE_INFINITY
      this.maxVal = (typeof oldSummary.maxVal === 'number' && !isNaN(oldSummary.maxVal))
          ? oldSummary.maxVal : Number.NEGATIVE_INFINITY
      this.value = (this.validCount > 0 ? this.sumData / this.validCount : 0)
    } else {
      this.validCount = 0
      this.sumData = 0
      this.sumSquare = 0
      this.minVal = Number.POSITIVE_INFINITY
      this.maxVal = Number.NEGATIVE_INFINITY
      this.value = 0
    }
  }

  give.TrackObjectImpl._BigWigImpl.SummaryCtor.prototype.addSummary = function (summary) {
    this.validCount += summary.validCount
    this.sumData += summary.sumData
    this.sumSquares += summary.sumSquares
    this.minVal = ((this.minVal <= summary.minVal) ? this.minVal : summary.minVal)
    this.maxVal = ((this.maxVal >= summary.maxVal) ? this.maxVal : summary.maxVal)
    this.value = (this.validCount > 0 ? this.sumData / this.validCount : 0)
  }

  give.TrackObjectImpl._BigWigImpl.SummaryCtor.prototype.addData = function (data, length) {
    // data can be either a summary or actual components
    if (data instanceof give.TrackObjectImpl._BigWigImpl.SummaryCtor) {
      this.addSummary(data)
    } else {
      this.validCount += length
      this.sumData += data.value * length
      this.sumSquares += data.value * data.value * length
      this.minVal = ((this.minVal <= data.value) ? this.minVal : data.value)
      this.maxVal = ((this.maxVal >= data.value) ? this.maxVal : data.value)
      this.value = (this.validCount > 0 ? this.sumData / this.validCount : 0)
    }
  }

  give.TrackObjectImpl._BigWigImpl.DataStructure = give.GiveTree

  give.TrackObjectImpl.bigwig = give.TrackObjectImpl._BigWigImpl

  return give
})(GIVe || {})
