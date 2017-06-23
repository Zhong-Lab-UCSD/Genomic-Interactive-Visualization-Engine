var GIVe = (function (give) {
  'use strict'

  give.TrackObjectImpl = {

    _default: {
      DataHandler: function (response, chromBPTree, queryRegions) {
      },
      LocalFileHandler: function (localFile, queryRegions) {
      },
      SummaryCtor: null,
      DataStructure: give.ChromBPlusTree
    }

  }

  return give
})(GIVe || {})
