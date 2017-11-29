// JavaScript Document
//  Withering Node
//
//  This is the node used to wither (for caching purposes)
//

var GIVe = (function (give) {
  'use strict'

  give.WitheringNode = function (props) {
    // start and length is for the corresponding region
    give.GiveTreeNode.call(this, arguments)
    this.life = props.LifeSpan
  }

  give.WitheringNode.prototype.wither = function (amount) {
    // this will cause this and *all the children of this* wither
    amount = amount || 1
    if (!isNaN(this.life)) {
      this.life -= amount
      if (this.life <= 0) {
        // signal parent to remove this
        return null
      }
    }
    return this
  }

  give.WitheringNode.prototype.rejuvenate = function (life) {
    if (!isNaN(this.life)) {
      this.life = life || this.life
    }
  }

  return give
})(GIVe || {})
