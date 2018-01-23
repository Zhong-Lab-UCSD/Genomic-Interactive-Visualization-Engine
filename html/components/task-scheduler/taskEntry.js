// JavaScript Document
var GIVe = (function (give) {
  'use strict'

  give.TaskEntry = function (callback, prerequisites) {
    if (typeof callback === 'function') {
      this.callback = callback
      if (!Array.isArray(prerequisites)) {
        prerequisites = [prerequisites]
      }
      this.prerequisites = prerequisites
    } else {
      throw (new Error('Task entry error: no callback defined.'))
    }
    this.isDone = false
  }

  give.TaskEntry.prototype.checkPrerequisites = function (prereqObj) {
    return (!this.isDone) && this.prerequisites.every(function (prereq) {
      return prereqObj.hasOwnProperty(prereq)
    }, this)
  }

  give.TaskEntry.prototype.checkPrerequisitesAndRun = function (prereqObj) {
    if (this.checkPrerequisites(prereqObj)) {
      this.isDone = true
      return this.callback()
    }
    return null
  }

  return give
})(GIVe || {})
