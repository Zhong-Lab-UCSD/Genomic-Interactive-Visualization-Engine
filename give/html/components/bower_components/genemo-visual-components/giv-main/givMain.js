// initialize ref and tracks

var GIVe = (function (give) {
  'use strict'

  give.mainTaskScheduler.addTask(new give.TaskEntry(function () {
    if (window.location.search.indexOf('hg38') >= 0) {
      Polymer.dom(document).querySelector('#mainChartController').ref = 'hg38'
    }
  }, ['web-component-ready', 'ref-ready']))

  return give
})(GIVe || {})
