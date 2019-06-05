// processing UI components (such as error)
// separated for future UI upgrade stuff
var GIVe = (function (give) {
  'use strict'

  give.UIObject = function (win) {
    this.core = win
    if (win.document) {
      this.doc = win.document
    }

    this.left_value = 0
    this.left_width = 290

    this.navInitialized = false
  }

  give.UIObject.prototype.alert = function (msg) {
    return this.core.alert(msg)
  }

  give.UIObject.prototype.confirm = function (msg) {
    return this.core.confirm(msg)
  }

  return give
})(GIVe || {})
