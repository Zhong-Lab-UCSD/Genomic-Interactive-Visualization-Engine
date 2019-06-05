import { dedupingMixin } from '@polymer/polymer/lib/utils/mixin.js';
import '@polymer/polymer/lib/utils/render-status.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
var GIVe = (function (give) {
  'use strict'

  give.GiveCardContentMixin = dedupingMixin(base =>
    class extends mixinBehaviors([
      IronResizableBehavior
    ], base) {
      static get properties () {
        return {
          icon: {
            type: String,
            value: '',
            readOnly: true
          },

          iconAlt: {
            type: String,
            value: '',
            readOnly: true
          },

          headerText: {
            type: String,
            value: '',
            readOnly: true
          },

          _readiness: {
            type: Boolean,
            value: false,
            observer: '_readinessChanged'
          },

          _domReady: {
            type: Boolean,
            value: false
          },

          allowFlexGrow: {
            type: Boolean,
            value: false
          }
        }
      }

      get allowFlexShrink () {
        return !!this._allowFlexShrink
      }

      get readiness () {
        // default behavior is that whenever it's loaded, the contents are ready.
        return this._readiness
      }

      // get flexShrinkRatio () {
      //   if (this.allowFlexShrink) {
      //     return typeof this._flexShrinkRatio === 'number'
      //       ? this._flexShrinkRatio : (this.contentHeight || 1)
      //   }
      // }

      _readinessChanged (newValue, oldValue) {
        give.fireSignal('content-ready', { flag: newValue }, null, this)
      }

      get expandedHeaderElement () {
        let element = document.createElement('div')
        let iconElement = this.iconElement
        if (iconElement) {
          iconElement.classList.add('smallInline')
          element.appendChild(iconElement)
        }
        let textSpan = document.createElement('span')
        textSpan.textContent = this.headerText

        element.classList.add('headerText')
        element.appendChild(textSpan)

        if (this.otherElem) {
          element.appendChild(this.otherElem)
        }

        return element
      }

      get _collapsedInfoObject () {
        return null
      }

      get collapsedElement () {
        let collapsedInfoObj = this._collapsedInfoObject
        if (collapsedInfoObj) {
          // prepare for shrinking and return the shrunk element
          let element = document.createElement('div')
          // add shrunk icon, ref, input file and display file
          // icon and ref in one line
          let headerElement = document.createElement('div')
          let iconElement = this.iconElement

          let headerTextElement = document.createElement('span')
          headerTextElement.textContent = this.headerText

          headerElement.classList.add('headerText')
          if (iconElement) {
            iconElement.classList.add('smallInline')
            headerElement.appendChild(iconElement)
          }
          headerElement.appendChild(headerTextElement)
          element.appendChild(headerElement)

          let resContent = document.createElement('div')
          resContent.classList.add('collapseContent')
          for (let key in collapsedInfoObj) {
            if (collapsedInfoObj.hasOwnProperty(key)) {
              resContent.appendChild(
                this._createResElement(key, collapsedInfoObj[key]))
            }
          }
          element.appendChild(resContent)
          return element
        }
        return null
      }

      get iconElement () {
        if (this.icon) {
          let iconElem = document.createElement('iron-icon')
          iconElem.setAttribute('icon', this.icon)
          iconElem.setAttribute('alt', this.iconAlt)
          return iconElem
        }
        return null
      }

      _createResElement (anno, text, beforeNode, afterNode) {
        let element = document.createElement('div')
        element.classList.add('collapseContentLine')

        if (beforeNode) {
          element.appendChild(beforeNode)
        }

        if (anno && !anno.startsWith('__')) {
          let annotationElement = document.createElement('span')
          annotationElement.classList.add('anno')
          annotationElement.textContent = anno + ': '
          element.appendChild(annotationElement)
        }
        let contentElement = document.createElement('span')
        contentElement.classList.add('content')
        contentElement.textContent = text

        element.appendChild(contentElement)

        if (afterNode) {
          element.appendChild(afterNode)
        }

        return element
      }
    }
  )

  return give
})(GIVe || {})
