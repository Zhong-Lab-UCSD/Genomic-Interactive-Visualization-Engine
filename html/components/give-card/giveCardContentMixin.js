var GIVe = (function (give) {
  'use strict'

  give.GiveCardContentMixin = Polymer.dedupingMixin(base =>
    class extends base {
      constructor () {
        super(...arguments)
        this._collapsedInfoObject = null
      }

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

      updateCollapsedInfoObject (newObject) {
        if (Object.keys(newObject).length > 0) {
          this._collapsedInfoObject = newObject
        } else {
          this._collapsedInfoObject = null
        }
      }

      get collapsedElement () {
        if (this._collapsedInfoObject) {
          // prepare for shrinking and return the shrunk element
          let element = document.createElement('div')
          // add shrunk icon, ref, input file and display file
          // icon and ref in one line
          let headerElement = document.createElement('div')
          let iconElement = this.iconElement
          iconElement.classList.add('smallInline')

          let headerTextElement = document.createElement('span')
          headerTextElement.textContent = this.headerText

          headerElement.classList.add('headerText')
          headerElement.classList.add('clearFix')
          headerElement.appendChild(iconElement)
          headerElement.appendChild(headerTextElement)
          element.appendChild(headerElement)

          let resContent = document.createElement('div')
          resContent.classList.add('collapseContent')
          for (let key in this._collapsedInfoObject) {
            if (this._collapsedInfoObject.hasOwnProperty(key)) {
              resContent.appendChild(
                this._createResElement(key, this._collapsedInfoObject[key]))
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
        element.classList.add('clearFix')
        element.classList.add('fullWidth')
        element.classList.add('collapseDb')

        if (beforeNode) {
          element.appendChild(beforeNode)
        }

        let annotationElement = document.createElement('span')
        annotationElement.classList.add('anno')
        annotationElement.classList.add('leftFloat')
        annotationElement.textContent = anno + ': '
        let contentElement = document.createElement('span')
        contentElement.textContent = text

        element.appendChild(annotationElement)
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
