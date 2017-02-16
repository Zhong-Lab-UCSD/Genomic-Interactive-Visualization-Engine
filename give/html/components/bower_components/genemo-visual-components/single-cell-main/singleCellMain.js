// initialize species and tracks

var GIVe = (function (give) {
  'use strict'

  var spcArray = give.SpeciesObject.initAllSpecies(null, null, function (species) {
    return species.settings['isSingleCellEnabled']
  }, null)

  give.mainTaskScheduler.addTask(new give.TaskEntry(function () {
    Polymer.dom(document).querySelector('#mainChartController').setSpecies(
      spcArray.dbMap['mm10'])
  }, ['web-component-ready', 'species-ready']))

  window.addEventListener('WebComponentsReady', function (e) {
    give.fireCoreSignal('content-dom-ready', null)
    give.fireSignal(give.TASKSCHEDULER_EVENT_NAME, {flag: 'web-component-ready'})
  })

  return give
})(GIVe || {})
