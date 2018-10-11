// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  give.DEBUG = true

  give.Host = 'https://www.givengine.org'
  give.ServerPath = '/givdata/'

  give.Ref_InitAllTarget = 'initRef.php'
  give.Ref_InitChromTarget = 'initRef.php'
  give.Ref_InitTrackTarget = 'initTracks.php'
  give.Ref_DefaultViewWindows =
    ['chr10:30000000-55000000', 'chr10:34900000-65000000']

  give.Trk_FetchDataTarget = 'getTrackData.php'
  give.Trk_FetchCustomTarget = 'getTrackData.php'

  give.GCI_PartialNameTarget = 'partialNames.php'

  give.Meta_KeyTarget = 'assets/encodeDCC/cv.ra'

  return give
})(GIVe || {})
