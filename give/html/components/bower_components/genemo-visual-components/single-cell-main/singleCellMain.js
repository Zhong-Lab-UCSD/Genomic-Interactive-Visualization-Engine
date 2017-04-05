// initialize ref and tracks

var GIVe = (function (give) {
  'use strict'

  var scDialog, scShowRefBtn, scDoNotShowBtn,
    scLocalStorage

  window.addEventListener('WebComponentsReady', function (e) {
    give.fireCoreSignal('content-dom-ready', null)
    give.fireSignal(give.TASKSCHEDULER_EVENT_NAME, {flag: 'web-component-ready'})
    scDialog = Polymer.dom(document).querySelector('#SCRefDialog')
    scShowRefBtn = Polymer.dom(document).querySelector('#SCShowRef')
    scDoNotShowBtn = Polymer.dom(document).querySelector('#SCDoNotShow')

    scLocalStorage = document.createElement('iron-localstorage')
    scLocalStorage.autoSaveDisabled = true
    scLocalStorage.name = '_SCDoNotShowRef'
    scLocalStorage.reload()
    if (!scLocalStorage.value) {
      // Reference should be displayed for the first time
      scDoNotShowBtn.removeAttribute('hidden')
      scDialog.open()
    }

    scShowRefBtn.addEventListener('tap', scDialog.open.bind(scDialog))
    scDoNotShowBtn.addEventListener('tap', function (e) {
      if (scLocalStorage && scLocalStorage.save) {
        scLocalStorage.value = true
        scLocalStorage.save()
        scDoNotShowBtn.setAttribute('hidden', '')
      } else {
        console.log('Error: scLocalStorage is not available.')
      }
      scDialog.close()
    })
  })

  return give
})(GIVe || {})
