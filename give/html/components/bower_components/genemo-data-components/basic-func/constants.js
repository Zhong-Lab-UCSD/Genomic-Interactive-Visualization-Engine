// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  give.VERBOSE_MAJ_ERROR = 1
  give.VERBOSE_MIN_ERROR = 2
  give.VERBOSE_WARNING = 3
  give.VERBOSE_DEBUG = 4
  give.VERBOSE_DEBUG_MORE = 5

  give.verboseLvl = give.VERBOSE_DEBUG

  give.host = 'https://give.genemo.org/'

  return give
})(GIVe || {})
