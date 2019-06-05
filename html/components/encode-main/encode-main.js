import '../ui-component/ui-component.js';
var GIVe = (function (give) {
  'use strict'

  var UI = new give.UIObject(window)

  window.addEventListener('WebComponentsReady', function () {
    give.fireCoreSignal('content-dom-ready', null)
    give.fireSignal(give.TASKSCHEDULER_EVENT_NAME, {flag: 'web-component-ready'})

    document.addEventListener('alert', function (e) {
      UI.alert(e.detail.msg)
    })
  })

  return give
})(GIVe || {})
