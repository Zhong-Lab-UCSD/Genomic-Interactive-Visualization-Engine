var GIVe = (function (give) {
  'use strict'

  give.GiveCardContentMixin = Polymer.dedupingMixin(base =>
    class extends base {
      static get properties () {
        return {
          collapseObject: {
            type: Object,
            value: null
          },

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

          _contentReady: {
            type: Boolean,
            value: false
          },

          _domReady: {
            type: Boolean,
            value: false
          }
        }
      }

      get isReady () {
        // default behavior is that whenever it's loaded, the contents are ready.
        return this._contentReady
      }

      setReady (readiness) {
        // set this.ready as ready and fire 'content-ready' event
        this._setContentReady(readiness)
        this.fire('content-ready', { flag: this.contentReady }, { cancelable: true })
      }

      isDOMReady () {
        return this.domReady // default behavior is that whenever it's loaded, the contents are ready.
      }

      setDOMReady (readiness) {
        // set this.domReady as ready and fire 'content-dom-ready' event
        this._setDomReady(readiness)
        this.fire('content-dom-ready', { flag: this.domReady }, { cancelable: true })
      }

      checkReadiness () {
        if (this.domReady) {
          this.fire('content-dom-ready', { flag: this.domReady }, { cancelable: true })
          if (this.contentReady) {
            this.fire('content-ready', { flag: this.contentReady }, { cancelable: true })
          }
        }
      }

      get expandedHeaderElement () {
        let element = document.createElement('div')
        let iconElement = this.iconElement
        iconElement.classList.add('smallInline')

        let textSpan = document.createElement('span')
        textSpan.textContent = this.headerText

        element.classList.add('headerText')
        element.appendChild(iconElement)
        element.appendChild(textSpan)

        if (this.otherElem) {
          element.appendChild(this.otherElem)
        }

        return element
      }

      updateCurrentInfo (props) {
        if (Object.keys(props).length > 0) {
          this.collapseObject = props
        } else {
          this.collapseObject = null
        }
      }

      get collapseElement () {
        if (this.collapseObject) {
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
          for (let key in this.collapseObject) {
            if (this.collapseObject.hasOwnProperty(key)) {
              resContent.appendChild(
                this.createResElement(key, this.collapseObject[key]))
            }
          }
          element.appendChild(resContent)
          return element
        }
        return null
      }

      get iconElement () {
        let iconElem = document.createElement('iron-icon')
        iconElem.setAttribute('icon', this.icon)
        iconElem.setAttribute('alt', this.iconAlt)
        return iconElem
      }

      createResElement (anno, text, beforeNode, afterNode) {
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

      connectedCallback () {
        if (typeof super.connectedCallback === 'function') {
          super.connectedCallback()
        }
        this.checkReadiness()
      }
    }
  )

  return give
})(GIVe || {})
