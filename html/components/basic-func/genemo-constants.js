// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  give.compHost = 'https://comp.genemo.org'

  give.Gnm_LoadSessionTarget = '/cpbrowser/loadSession.php'
  give.Gnm_UploadPrepareTarget = '/cpbrowser/uploadPrepare.php'
  give.Gnm_CompBedTarget = '/cpbrowser/geneTrackComparison.php'
  give.Gnm_CompBigwigTarget = '/cpbrowser/geneTrackBigwig.php'
  give.Gnm_LoadResultTarget = '/cpbrowser/geneTrackToUser.php'

  return give
})(GIVe || {})
