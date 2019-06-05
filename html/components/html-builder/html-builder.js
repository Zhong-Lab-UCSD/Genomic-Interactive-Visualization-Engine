/**
@license
Copyright 2017 GIVe Authors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-input/paper-textarea.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../give-styles.js';
import '../basic-func/basic-func.js';
import '../track-object/track-object.js';
import '../gene-coor-input/gene-coor-input.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="html-builder">
  <template>
    <style include="give-shared-styles iron-flex iron-flex-alignment">
      :host {
        position: relative;
        overflow-x: auto;
        @apply --layout-vertical;
      }
      hr {
        margin: 0.2em 24px -1em 24px;
        border: none;
        border-top: 1px groove;
      }
      div.controllerInputs {
        --base-font-size: 12px;
      }
      div.controllers > * {
        margin: 0.15em 0;
      }
      div.controllers > div.controllerGroup {
        margin-left: -0.5em;
        margin-right: -0.5em;
      }
      div.controllers > div.controllerGroup > * {
        margin-left: 0.5em;
        margin-right: 0.5em;
      }
      div.controllers > div.controllerGroup > div > div {
        display: inline-block;
      }
      div.anno {
        color: var(--default-primary-color);
        margin-right: 0.5em;
      }
      div.anno::first-letter {
        text-transform: capitalize;
      }
      div.infoSpan {
        width: 13.5em;
        overflow-wrap: break-word;
        margin-bottom: 0.2em;
      }
      paper-textarea#codeRegion {
        @apply --layout-flex;
        --paper-input-container-input: {
          font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace;
          font-size: 14px;
          line-height: 1.5em;
        };
      }
      paper-input#titleInput {
        @apply --layout-flex;
      }
      div.controllerGroup > gene-coor-input {
        width: 21em;
        margin-top: 0.5em;
        margin-bottom: 0.5em;
        --gene-coor-input-dropdown-background: var(--card-background-color);
      }
      paper-dialog div.buttons paper-button {
        margin: unset;
        background: unset;
      }
      paper-dialog iron-icon {
        width: 1.25em;
        height: 1.25em;
        margin: 0 0.2em;
      }
      paper-dialog div.statusMessage {
        display: inline-flex;
        color: var(--primary-text-color);
        opacity: var(--primary-text-opacity);
        margin: 0.7em 1em;
      }
      paper-dialog div.statusMessage.error {
        color: var(--error-color);
      }
    </style>
    <paper-dialog id="mainDialog">
      <h2>GIVE HTML Universal Generator</h2>
      <div class="controllers layout vertical">
        <div class="controllerGroup layout self-start horizontal wrap">
          <div class="layout horizontal start">
            <div class="anno">Reference: </div>
            <div class="infoSpan">[[_computeRefLabel(_refObj)]]</div>
          </div>
          <div class="layout horizontal start">
            <div class="anno">Group(s) selected: </div>
            <template is="dom-if" if="[[!_computeHideArray(dispGroupArray)]]">
              <div>
                <template is="dom-repeat" items="[[dispGroupArray]]" initial-count="10">
                  <div class="infoSpan">
                    [[_computeGroupLabel(item)]]
                  </div>
                </template>
              </div>
            </template>
            <template is="dom-if" if="[[_computeHideArray(dispGroupArray)]]">
              <div class="infoSpan">
                [[_computeHiddenGroupMsg(dispGroupArray)]]
              </div>
            </template>
          </div>
          <div class="layout horizontal start">
            <div class="anno">Track(s) selected: </div>
            <template is="dom-if" if="[[!_computeHideArray(dispTrackArray)]]">
              <div>
                <template is="dom-repeat" items="[[dispTrackArray]]" initial-count="10">
                  <div class="infoSpan">
                    [[_computeTrackLabel(item)]]
                  </div>
                </template>
              </div>
            </template>
            <template is="dom-if" if="[[_computeHideArray(dispTrackArray)]]">
              <div class="infoSpan">
                [[_computeHiddenTrackMsg(dispTrackArray)]]
              </div>
            </template>
          </div>
        </div>
        <div class="controllerGroup controllerInputs layout horizontal end">
          <paper-dropdown-menu id="refDropdown" label="Web Component to be used:">
            <paper-listbox slot="dropdown-content" id="refMenu" attr-for-selected="value" selected="{{selectedElement}}">
              <paper-item value="chart-controller">
                &lt;chart-controller&gt;
              </paper-item>
              <paper-item value="chart-area">
                &lt;chart-area&gt;
              </paper-item>
            </paper-listbox>
          </paper-dropdown-menu>
          <template is="dom-if" if="[[_controllerSelected(selectedElement)]]">
            <paper-input label="Title for the Chart Controller" value="{{customTitle}}" id="titleInput">
            </paper-input>
          </template>
        </div>
        <div class="controllerGroup controllerInputs layout horizontal start">
          <paper-dropdown-menu id="displayModeDropdown" label="Display mode:">
            <paper-listbox slot="dropdown-content" id="dispModeMenu" attr-for-selected="value" selected="{{_numOfSubs}}">
              <paper-item value="1">
                Single-window
              </paper-item>
              <paper-item value="2">
                Dual-window
              </paper-item>
            </paper-listbox>
          </paper-dropdown-menu>
          <gene-coor-input ref="[[ref]]" label="[[_computeLabelForCoorOne(_numOfSubs)]]" value="{{_defaultCoor1}}" on-blur="_settingChanged">
          </gene-coor-input>
          <template is="dom-if" if="[[_multiWindow(_numOfSubs)]]">
            <gene-coor-input ref="[[ref]]" label="[[_computeLabelForCoorTwo(_numOfSubs)]]" value="{{_defaultCoor2}}" on-blur="_settingChanged">
            </gene-coor-input>
          </template>
        </div>
      </div>
      <hr>
      <paper-textarea id="codeRegion" label="Embed Code" value="{{htmlCode}}" disabled\$="[[_needUpdate]]">
      </paper-textarea>
      <div class="buttons">
        <template is="dom-if" if="[[_computeCanUpdate(_needUpdate, _hasError)]]">
          <div class="statusMessage">[[_statusMessage]]</div>
        </template>
        <template is="dom-if" if="[[_hasError]]">
          <div class="statusMessage error">[[_errorMessage]]</div>
        </template>
        <template is="dom-if" if="[[_computeCanUpdate(_needUpdate, _hasError)]]">
          <paper-button raised="" on-tap="updateCode" disabled\$="[[_hasError]]">
            <iron-icon icon="refresh"></iron-icon>
            Update code
          </paper-button>
        </template>
        <template is="dom-if" if="[[_clipboardEnabled]]">
          <template is="dom-if" if="[[!_showClipboardState]]">
            <paper-button on-tap="copyToClipboard" disabled\$="[[!_computeClipboardEnabled(_needUpdate, _hasError, _clipboardEnabled)]]">
              <iron-icon icon="content-copy"></iron-icon>
              Copy code to clipboard
            </paper-button>
          </template>
          <template is="dom-if" if="[[_showClipboardState]]">
            <div class="statusMessage">
              <iron-icon icon="check"></iron-icon>
              Code copied to clipboard
            </div>
          </template>
        </template>
        <template is="dom-if" if="[[!_clipboardEnabled]]">
          <div class="statusMessage error">
            <iron-icon icon="error"></iron-icon>
            Cannot access clipboard
          </div>
        </template>
        <paper-button disabled\$="[[!_computeSaveEnabled(_needUpdate, _hasError)]]" on-tap="saveCode">
          <iron-icon icon="file-download"></iron-icon>
          Save
        </paper-button>
        <paper-button dialog-dismiss="">
          Close
        </paper-button>
      </div>
    </paper-dialog>
  </template>
  
</dom-module>`;

document.head.appendChild($_documentContainer.content);
var GIVe = (function (give) {
  'use strict'

  class HtmlBuilder extends give.RefEmbedMixin(PolymerElement) {
    static get is () {
      return 'html-builder'
    }

    static get properties () {
      return {
        dispTrackArray: {
          type: Array,
          value () {
            return []
          }
        },

        dispGroupArray: {
          type: Array,
          value () {
            return []
          }
        },

        selectedElement: {
          type: String,
          value: 'chart-controller'
        },

        customTitle: {
          type: String,
          value: '',
          observer: '_settingChanged'
        },

        _numOfSubs: {
          type: Number,
          value: 1,
          observer: '_settingChanged'
        },

        _defaultCoor1: {
          type: String,
          value: ''
        },

        _defaultCoor2: {
          type: String,
          value: ''
        },

        _clipboardEnabled: {
          type: Boolean,
          value: true
        },

        _showClipboardState: {
          type: Boolean,
          value: false
        },

        _statusMessage: {
          type: String,
          value: ''
        },

        _errorMessage: {
          type: String,
          value: 'Please fix errors before updating the code.'
        },
        
        htmlCode: {
          type: String,
          value: '',
          observer: '_codeChanged'
        },

        _hasError: {
          type: Boolean,
          value: false
        }
      }
    }

    ready () {
      super.ready()
      this._coordinatesFilled = false
      this._needUpdate = false
    }

    _computeRefLabel (refObj) {
      return refObj ? refObj.db + ' (' + refObj.commonName + ')' : '(None)'
    }

    _computeHideArray (itemArray) {
      return !itemArray || !itemArray.length ||
        itemArray.length > this.constructor.MAX_DESC_LENGTH
    }
    
    _computeGroupLabel (group) {
      return group.label || group.id
    }

    _computeHiddenGroupMsg (groupArray) {
      return (!groupArray || !groupArray.length)
        ? '(None selected)'
        : (groupArray.length + ' group' + (groupArray.length > 1 ? 's' : ''))
    }

    _computeTrackLabel (track) {
      return track.title || track.getSetting('shortLabel', 'string')
    }

    _computeHiddenTrackMsg (trackArray) {
      return (!trackArray || !trackArray.length)
        ? '(None selected)'
        : (trackArray.length + ' track' + (trackArray.length > 1 ? 's' : ''))
    }

    _computeClipboardEnabled (needUpdate, hasError, clipboardEnabled) {
      return !needUpdate && !hasError && clipboardEnabled
    }

    _computeSaveEnabled (needUpdate, hasError) {
      return !needUpdate && !hasError
    }

    _computeCanUpdate (needUpdate, hasError) {
      return needUpdate && !hasError
    }

    _computeLabelForCoorOne (numOfSubs) {
      return 'Default coordinates (or gene name)' +
        (numOfSubs > 1 ? ' #1' : '')
    }

    _computeLabelForCoorTwo (numOfSubs) {
      return 'Default coordinates (or gene name) #2'
    }

    _multiWindow (numOfSubs) {
      return numOfSubs > 1
    }

    _controllerSelected (element) {
      return element === 'chart-controller'
    }

    _validateCoordinates () {
      let coorElems = [...this.shadowRoot.querySelectorAll('gene-coor-input')]
      // First determine if any of the coordinates are filled
      this._coordinatesFilled = coorElems.some(elem => !!elem.value)
      coorElems.forEach(elem => {
        elem.validate()
        if ((!!elem.value) !== this._coordinatesFilled) {
          elem.overrideErrorMessage =
            'Defaults should be both blank or both filled!'
        } else {
          elem.overrideErrorMessage = ''
        }
      })
      // Then find potential invalid coordinates
      return coorElems.every(elem => !elem.invalid)
    }

    _resetClipboardState () {
      this._showClipboardState = false
      this._showStatusMessage = false
      this._statusMessage = ''
      this._hasError = false
    }

    _settingChanged (newValue, oldValue) {
      afterNextRender(this, () => {
        this._resetClipboardState()
        let updatedCode = this._updatedCode
        if (updatedCode) {
          if (this.htmlCode !== updatedCode) {
            this._statusMessage = this.constructor.STATUS_NEED_UPDATE
            this._needUpdate = true
          } else {
            this._needUpdate = false
          }
        } else {
          if (!this.htmlCode) {
            this._statusMessage = ''
            this._needUpdate = false
          } else {
            this._hasError = true
          }
        }
      })
    }

    _codeChanged (newValue, oldValue) {
      this._resetClipboardState()
    }

    get _updatedCode () {
      try {
        if (!this._validateCoordinates()) {
          return null
        }
        let baseURL = window.location.protocol + '//' +
          window.location.host
        let result = '<script src="' + baseURL +
          '/bower_components/webcomponentsjs/webcomponents-loader.js">' +
          '<\/script>\n' +
          '<link rel="import" href="' + baseURL +
          '/components/' + this.selectedElement + '/' +
          this.selectedElement + '.html">\n'

        let refArray = []
        for (let i = 0; i < this._numOfSubs; i++) {
          refArray.push(this._refObj.db)
        }
        result += '<' + this.selectedElement + ' ref=\'["' +
          refArray.join('", "') + '"]\''

        result += ' num-of-subs="' +
          this._numOfSubs + '"'
        result += '\n  group-id-list=\'["' +
          this.dispGroupArray.map(function (group) {
            return group.id
          }, this).join('", "') + '"]\''
        if (this.dispTrackArray.length > 0) {
          result += '\n  default-track-id-list=\'["' +
            this.dispTrackArray.map(function (track) {
              return track.id
            }, this).join('", "') + '"]\''
        }

        if (this._coordinatesFilled) {
          let coordinateArray = []
          for (let i = 0; i < this._numOfSubs; i++) {
            coordinateArray.push(
              this.shadowRoot.querySelectorAll('gene-coor-input')[i].value)
          }
          result += '\n  coordinate=\'["' +
            coordinateArray.join('", "') + '"]\''
        }

        if (this._controllerSelected(this.selectedElement) &&
          this.customTitle
        ) {
          result += '\n  title-text="' +
            this.customTitle + '"'
        }
        result += '>\n</' + this.selectedElement + '>'
        return result
      } catch (e) {
        return null
      }
    }

    updateCode () {
      this.htmlCode = this._updatedCode || this.htmlCode
      this.updateCodeLink()
      this._needUpdate = false
      this._statusMessage = ''
    }

    copyToClipboard () {
      // To prevent messing up with the selection of paper-textarea,
      // create a new <text-area> element to do the copying.
      if (give._copyTextToClipboard(this.htmlCode)) {
        // indicate the copying was successful
        this._showClipboardState = true
        this._statusMessage = this.constructor.STATUS_CLIPBOARD_SUCCESSFUL
      } else {
        // indicate otherwise
        this._showClipboardState = true
        this._statusMessage = this.constructor.STATUS_CLIPBOARD_FAILED
        this._clipboardEnabled = false
      }
    }

    saveCode () {
      this._downloadElem = this._downloadElem || document.createElement('a')
      this._downloadElem.setAttribute('href', this.codeLink)
      this._downloadElem.setAttribute('download', 'embedGIVE.html')

      this._downloadElem.style.display = 'none'
      this.$.mainDialog.appendChild(this._downloadElem)

      this._downloadElem.click()

      this.$.mainDialog.removeChild(this._downloadElem)
    }

    updateCodeLink () {
      if (this.codeLink !== null) {
        window.URL.revokeObjectURL(this.codeLink)
      }
      if (this.htmlCode.length > 0) {
        var codeFile = new window.Blob([this.htmlCode], {type: 'text/plain'})
        this.codeLink = window.URL.createObjectURL(codeFile)
      }
    }

    createDialog (ref, groupArray, trackArray) {
      if (!ref && !this._refObj) {
        // reference not ready, nor is it provided
        throw new give.GiveError('No reference is given!')
      } else if (ref) {
        this.ref = ref
        this.refReadyPromise.then(
          () => this._createDialogWithRef(groupArray, trackArray)
        )
      } else {
        return this._createDialogWithRef(groupArray, trackArray)
      }
    }

    _createDialogWithRef (groupArray, trackArray) {
      this.dispGroupArray = []
      this.dispGroupArray = groupArray.slice()
      this.dispTrackArray = []
      if (Array.isArray(trackArray) && trackArray.length > 0) {
        this.dispTrackArray = trackArray.slice()
      }
      this.updateCode()
      this.$.mainDialog.open()
    }
  }

  HtmlBuilder.MAX_DESC_LENGTH = 5

  HtmlBuilder.STATUS_NEED_UPDATE =
    'Settings changed. Please update code first.'
  HtmlBuilder.STATUS_CLIPBOARD_SUCCESSFUL =
    'Code successfully copied to clipboard.'
  HtmlBuilder.STATUS_CLIPBOARD_FAILED =
    'Cannot access clipboard. You\'ll need to copy code manually.'

  give.HtmlBuilder = HtmlBuilder
  window.customElements.define('html-builder', give.HtmlBuilder)

  return give
})(GIVe || {})
