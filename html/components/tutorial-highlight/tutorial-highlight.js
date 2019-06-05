/* Tutorial highlights
  Used to show tutorial elements by highlighting the corresponding DOM component,
  automatically put explanation contents near said component,
  and put an "Okay, got it" button and optionally a "Remind me later"
  button to dismiss

  Implementation: use a very thick
  (~8000px or double Math.max(screen.width, screen.height)) border for highlighing

  _setTarget() adapted from paper-tooltip of Polymer library
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import { beforeNextRender } from '@polymer/polymer/lib/utils/render-status.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/paper-dialog-behavior/paper-dialog-behavior.js';
import '@polymer/iron-localstorage/iron-localstorage.js';
import '../give-styles.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="tutorial-highlight">
  <template>
    <style include="give-shared-styles">
    :host {
      font-size: 16px;
    }
    #highlighter {
      position: fixed;
      color: var(--highlighter-text-color, var(--dark-theme-text-color));
      z-index: 1000;
    }
    #highlighter > div {
      /* This is the div implementing --highlighter-margin */
      position: absolute;
      top: calc(0px - var(--highlighter-margin, 20px));
      left: calc(0px - var(--highlighter-margin, 20px));
      right: calc(0px - var(--highlighter-margin, 20px));
      bottom: calc(0px - var(--highlighter-margin, 20px));
    }
    #highlighter > div::before {
      content: '';
      outline: solid var(--highlighter-border-width, 9999px) var(--highlighter-color, var(--default-primary-color));
      @apply --layout-fit;
      opacity: 0.9;
    }
    #highlighter > div::after {
      content: '';
      @apply --layout-fit;
      border: solid 1px rgba(0, 0, 0, 0.3);
      box-shadow: inset 0 2px 12px rgba(0, 0, 0, 0.3);
    }
    #dialogBox {
      position: absolute;
      padding: 10px;
      max-width: 500px;
      line-height: 24px;
    }
    paper-button {
      background: var(--highlighter-color, var(--default-primary-color));
      color: var(--highlighter-text-color, var(--dark-theme-text-color));
      font-size: 16px;
    }
    </style>
    <div id="highlighter" hidden\$="[[isHidden]]">
      <div>
        <div id="dialogBox">
          <slot></slot>
          <paper-button on-tap="_permCloseTutorial">Okay, got it</paper-button>
          <template is="dom-if" if="[[!disableRemindLater]]">
            <paper-button on-tap="_tempCloseTutorial">Remind me later</paper-button>
          </template>
        </div>
      </div>
    </div>
    <iron-localstorage name="genemo-storage" value="{{tutorialFlags}}">
    </iron-localstorage>
  </template>
  
</dom-module>`;

document.head.appendChild($_documentContainer.content);
var GIVe = (function (give) {
  'use strict'

  class TutorialHighlight extends PolymerElement {
    static get is () {
      return 'tutorial-highlight'
    }

    static get properties () {
      return {
        domTargetId: {
          // the target of tutorial
          // if unspecified, then it's the parent node
          type: String,
          observer: '_setTarget'
        },

        tutorialKey: {
          type: String,
          value: 'defaultTutorial'
        },

        isHidden: {
          type: Boolean,
          value: true,
          readOnly: true
        },

        disableRemindLater: {
          type: Boolean,
          value: false
        },

        tutorialFlags: {
          type: Object
        }
      }
    }

    _setTarget () {
      let parentNode = this.parentNode
      // If the parentNode is a document fragment, then we need to use the host.
      let ownerRoot = this.getRootNode()

      if (this.domTargetId) {
        this.target = ownerRoot.querySelector('#' + this.domTargetId)
      } else {
        this.target =
          (parentNode.nodeType === window.Node.DOCUMENT_FRAGMENT_NODE)
            ? ownerRoot.host : parentNode
      }
    }

    _adjustSizeLayoutAndShow () {
      // adjust size and layout according to this.domTarget
      if (!this.target) {
        this._setTarget()
        if (!this.target) {
          throw new give.GiveError(
            'Target not set for tutorial-highlight element.')
        }
      }
      let rect = this.target.getBoundingClientRect()
      this.$.highlighter.style.top = rect.top + 'px'
      this.$.highlighter.style.left = rect.left + 'px'
      this.$.highlighter.style.height = rect.height + 'px'
      this.$.highlighter.style.width = rect.width + 'px'

      this._setIsHidden(false)
      beforeNextRender(this, () => {
        let insideRect = this.shadowRoot.querySelector('#highlighter > div')
          .getBoundingClientRect()

        // find the largest region to put <slot></slot>
        if (rect.left + rect.right > window.innerWidth) {
          // put content to the left
          this.$.dialogBox.style.right = '20px'
        } else {
          // put content to the right
          this.$.dialogBox.style.left = '20px'
        }
        if (rect.top + rect.bottom > window.innerHeight) {
          // put content to the top
          this.$.dialogBox.style.bottom = '20px'
        } else {
          this.$.dialogBox.style.top = insideRect.height + 20 + 'px'
        }
      })
    }

    _tempCloseTutorial () {
      this._setIsHidden(true)
    }

    _permCloseTutorial () {
      this.set('tutorialFlags.' + this.tutorialKey, true)
      this._tempCloseTutorial()
    }

    showTutorial (forceShow) {
      if (!this.tutorialFlags) {
        this.tutorialFlags = {}
      }
      if (forceShow || !this.tutorialFlags[this.tutorialKey]) {
        this._adjustSizeLayoutAndShow()
      }
    }
  }

  give.TutorialHighlight = TutorialHighlight
  window.customElements.define('tutorial-highlight', give.TutorialHighlight)

  return give
})(GIVe || {})
