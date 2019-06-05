import '../ref-object/ref-object.js';
import '../ui-component/ui-component.js';
import '../task-scheduler/task-scheduler.js';
import '@polymer/iron-localstorage/iron-localstorage.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
// initialize ref and tracks

var GIVe = (function (give) {
  'use strict'

  var scDialog, scShowRefBtn, scDoNotShowBtn,
    scLocalStorage

  window.addEventListener('WebComponentsReady', function (e) {
    give.fireCoreSignal('content-dom-ready', null)
    give.fireSignal(give.TASKSCHEDULER_EVENT_NAME, {flag: 'web-component-ready'})
    scDialog = dom(document).querySelector('#SCRefDialog')
    scShowRefBtn = dom(document).querySelector('#SCShowRef')
    scDoNotShowBtn = dom(document).querySelector('#SCDoNotShow')

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
