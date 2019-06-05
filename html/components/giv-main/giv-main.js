import '../ref-object/ref-object.js';
import '../ui-component/ui-component.js';
import '../task-scheduler/task-scheduler.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
// initialize ref and tracks

var GIVe = (function (give) {
  'use strict'

  give.mainTaskScheduler.addTask(new give.TaskEntry(function () {
    if (window.location.search.indexOf('hg38') >= 0) {
      dom(document).querySelector('#mainChartController').ref = 'hg38'
    }
  }, ['web-component-ready', 'ref-ready']))

  return give
})(GIVe || {})
