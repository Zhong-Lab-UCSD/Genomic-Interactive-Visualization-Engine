// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  give.VERBOSE_MAJ_ERROR = 1
  give.VERBOSE_MIN_ERROR = 2
  give.VERBOSE_WARNING = 3
  give.VERBOSE_DEBUG = 4
  give.VERBOSE_DEBUG_MORE = 5

  give.verboseLvl = give.VERBOSE_DEBUG

  give.host = 'https://beta.give.genemo.org'

  give.Ref_InitAllTarget = '/givdata/initRef.php'
  give.Ref_InitChromTarget = '/givdata/initRef.php'
  give.Ref_InitTrackTarget = '/givdata/initTracks.php'
  give.Ref_DefaultViewWindows =
    ['chr10:30000000-55000000', 'chr10:34900000-65000000']

  give.Trk_FetchDataTarget = '/givdata/getTrackData.php'
  give.Trk_FetchCustomTarget = '/givdata/getTrackData.php'

  give.GCI_PartialNameTarget = '/givdata/partialNames.php'

  return give
})(GIVe || {})
