// initialize ref and tracks

var GIVe = (function (give) {
  'use strict'

  var spcArray = give.RefObject.initAllRef(null, null, function (ref) {
    return ref.settings['isGIVeEnabled']
  }, null)

  give.mainTaskScheduler.addTask(new give.TaskEntry(function () {
    Polymer.dom(document).querySelector('#mainChartController').setRef(
      window.location.search.indexOf('hg38') >= 0
        ? spcArray.dbMap['hg38'] : spcArray[0])
  }, ['web-component-ready', 'ref-ready']))

  window.addEventListener('WebComponentsReady', function (e) {
    give.fireCoreSignal('content-dom-ready', null)
    give.fireSignal(give.TASKSCHEDULER_EVENT_NAME, {flag: 'web-component-ready'})
  })

  return give
})(GIVe || {})
