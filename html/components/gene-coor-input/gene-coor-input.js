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
/*

An embedded browser element for genomic coordinates and/or gene name search.

### Overview

`<gene-coor-input>` provides a material design input field implemented by
Polymer for gene names / aliases / genomic coordinates. This component contains
a paper-input component and will do the following:

#### Case fixing
`<gene-coor-input>` can fix cases (`chrX`, `chrY`, *etc.*) and truncate ranges
for genomic region coordinates.

#### Partial gene name search
When partial names are given `<gene-coor-input>` can search the back-end
database to look for gene names / aliases.
`<gene-coor-input>` can also find coordinates and substitute the value
correspondingly.
__Note:__ this function needs additional back-end support. Please see <https://github.com/Zhong-Lab-UCSD/Genomic-Interactive-Visualization-Engine/blob/master/html/components/gene-coor-input/README.md> for details about implementations.

*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js';
import { timeOut } from '@polymer/polymer/lib/utils/async.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/iron-dropdown/iron-dropdown.js';
import '@polymer/iron-list/iron-list.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-icons/iron-icons.js';
import '../ref-embed-mixin/ref-embed-mixin.js';
import '../give-icons/give-icons.js';
import '../give-styles.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="gene-coor-input">
  <template>
    <style include="give-shared-styles">
      :host {
        font-size: var(--base-font-size, var(--default-font-size));
        overflow: visible;
      }
      paper-input {
        margin-bottom: 0.6em;
      }
      paper-input div[slot="suffix"] {
        font-size: 0.9em;
        color: var(--secondary-text-color);
        white-space: nowrap;
      }
      paper-input div[slot="suffix"] iron-icon {
        width: 1.8em;
        height: 1.8em;
        margin: -0.4em 0;
      }
      iron-dropdown {
        background: var(--gene-coor-input-dropdown-background, var(--primary-background-color));
      }
      iron-dropdown div div.emptyMsg {
        display: block;
        padding: 0.5em 2em;
        min-height: 20px;
      }
      iron-list {
        width: 500px;
      }
      paper-item {
        cursor: pointer;
        overflow-x: hidden;
      }
      paper-item > * {
        display: inline-block;
      }
      paper-item > .geneNameClass {
        margin-right: 1em;
      }
    </style>
    <paper-input class="fullWidth" id="geneName" spellcheck="false" label="[[_calcDispLabel(label, _partialNameSupported)]]" value="{{inputValue}}" on-input="_partialInputHandler" on-focus="_textFocus" on-blur="_textUnFocus" no-label-float="[[noLabelFloat]]" always-float-label="[[alwaysFloatLabel]]" error-message="[[errorMessage]]" invalid="[[invalid]]">
      <div slot="suffix">
        [[coorSuffix]]
        <template is="dom-if" if="[[!noGeneNameSearch]]" restamp="true">
          <template is="dom-if" if="[[!_partialNameSupported]]">
            <iron-icon icon="give-iconset:search-unavailable"></iron-icon>
          </template>
          <template is="dom-if" if="[[_partialNameSupported]]">
            <iron-icon icon="search"></iron-icon>
          </template>
        </template>
      </div>
    </paper-input>
    <iron-dropdown id="geneNameDropDown" no-overlap="">
      <div slot="dropdown-content">
        <iron-list items="[[candidates]]" as="gene" selection-enabled="" id="candidatesList" selected-item="{{selectedCandidate}}" hidden\$="[[isCandidatesEmpty]]">
          <template>
            <paper-item>
              <div class="geneNameClass">
                <span>[[gene.contentBefore]]</span><strong>[[gene.contentBold]]</strong><span>[[gene.contentAfter]]</span>
              </div>
              <div class="geneDescClass">
                [[gene.description]]
              </div>
            </paper-item>
          </template>
        </iron-list>
        <template is="dom-if" if="[[_showMsgInList]]">
          <div class="emptyMsg">
            <em>[[emptyCandidatesString]]</em>
          </div>
        </template>
      </div>
    </iron-dropdown>
    <iron-ajax id="partialNameAjax" url="[[geneNameUrl]]" handle-as="json"></iron-ajax>
  </template>

  
</dom-module>`;

document.head.appendChild($_documentContainer.content);
var GIVe = (function (give) {
  'use strict'

  class GeneCoorInput extends give.RefEmbedMixin(PolymerElement) {
    constructor () {
      super(...arguments)
      this._textFocusHandlerDebouncer = null
      this._refocusDebouncer = null
      this._ajaxDebouncer = null
      this._mouseOutDebouncer = null
      this._showGeneListDebouncer = null

      this._listReadyToShow = false

      this._ajaxDebounceInterval =
        this.constructor.AJAX_DEBOUNCE_INTERVAL_IDLE
      this._updatingValue = false
    }

    static get is () {
      return 'gene-coor-input'
    }

    static get properties () {
      return {
        value: {
          type: String,
          value: '',
          notify: true,
          observer: '_valueObserver'
        },

        alwaysFloatLabel: {
          type: Boolean,
          value: false
        },

        noLabelFloat: {
          type: Boolean,
          value: false
        },

        geneNameUrl: {
          type: String,
          value: give.Host +
            (give.ServerPath || '/') +
            (give.GCI_PartialNameTarget || 'partialNames.php')
        },

        inputValue: {
          type: String,
          value: ''
        },

        label: {
          type: String,
          value: 'Coordinate (or gene name)'
        },

        errorMessage: {
          type: String,
          value: 'Invalid chromosomal region!'
        },

        overrideErrorMessage: {
          type: String,
          value: '',
          observer: '_overrideErrorMessageChanged'
        },

        candidates: {
          type: Array,
          value () {
            return []
          }
        },

        isCandidatesEmpty: {
          type: Boolean,
          value: true
        },

        _showMsgInList: {
          type: Boolean,
          value: false
        },

        coorSuffix: {
          type: String,
          value: ''
        },

        emptyCandidatesString: {
          type: String,
          value: '(No results)'
        },

        selectedCandidate: {
          type: Object,
          observer: '_partialSelectionChanged'
        },

        invalid: {
          type: Boolean,
          value: false
        },

        /**
         * Set this to false to disable partial gene name search features.
         */
        noGeneNameSearch: {
          type: Boolean,
          value: false
        },

        /**
         * Whether a partial gene name is allowed as the final value
         */
        allowPartialGeneName: {
          type: Boolean,
          value: false
        },

        required: {
          type: Boolean,
          value: false
        },

        _partialNameSupported: {
          type: Boolean,
          value: false
        }
      }
    }

    connectedCallback () {
      super.connectedCallback()
      this.querySent = ''

      this._updatingValue = false
      // set this to true to decouple input values with actual values

      this.$.geneNameDropDown.positionTarget = this.$.geneName
      // the following was disabled due to `paper-input` issue #673
      // this.$.geneNameDropDown.focusTarget = this.$.geneName

      this.addEventListener('mouseover', e => this._mouseOverHandler(e))
      this.addEventListener('mouseout', e => this._mouseOutHandler(e))
      this._partialSelectionChanged(this._partialNameSupported)

      if (this.value) {
        this.inputValue = this.value
      }
    }

    /**
     * _setTextFocus - set the focus onto the main `paper-input` field
     * This function is to circumvent `paper-input` issue #673 as described
     * at: https://github.com/PolymerElements/paper-input/issues/673
     * Can be removed once the issue is resolved.
     */
    _setTextFocus () {
      if (!this.$.geneName.focused) {
        this.$.geneName.focus()
      }
    }

    _calcDispLabel (label, partialNameSupported) {
      return label.replace(' (or gene name)',
        partialNameSupported ? ' or gene name' : '')
    }

    _setRefObj (refObj) {
      if (super._setRefObj(refObj)) {
        this._partialNameSupported = false
        if (this._refObj && !this.noGeneNameSearch) {
          // Test whether reference support partial name filling.
          this.$.partialNameAjax.params = {
            'db': this._refObj.db
          }
          let request = this.$.partialNameAjax.generateRequest()
          request.completes.then(req => (
            this._partialNameSupported =
              (req.response && req.response.supported)
          ))
            .catch(rejectedObj => (this._partialNameSupported = false))
        }
      }
    }

    _partialInputHandler () {
      // $("#waiting").html($("#geneName").val());
      this.value = this.inputValue
    }

    _valueIsCoordinate () {
      // First test if the value is chromosome name
      if (this._refObj && this._refObj.chromInfo &&
        this._refObj.chromInfo[this.value.toLowerCase()]
      ) {
        return true
      }
      // use regex to test if this.value is a coordinate
      return /^chr\w+\s*(:|\s)/i.test(this.value.toLowerCase())
    }

    _valueObserver (newValue, oldValue) {
      if (!this._updatingValue) {
        // value is coupled with input field
        this.coorSuffix = ''
        this.inputValue = newValue
        if (this._clearErrorDuringInput) {
          delete this._clearErrorDuringInput
          this.invalid = false
        }
        if (!this.noGeneNameSearch && this._partialNameSupported) {
          if (newValue !== this.querySent) {
            this._listReadyToShow = false
            if (this._showGeneListDebouncer) {
              this._showGeneListDebouncer.cancel()
              this._showGeneListDebouncer = null
            }
            this.querySent = ''
            if (newValue.length >= this.constructor.MIN_JSON_QUERY_LENGTH &&
              !this._valueIsCoordinate()
            ) {
              // length is enough for ajax and also not already updated
              // start the timer to prepare for ajax
              this._ajaxDebouncer = Debouncer.debounce(
                this._ajaxDebouncer,
                timeOut.after(this._ajaxDebounceInterval),
                () => {
                  this._ajaxDebouncer = null
                  this._sendPartialQuery()
                }
              )
            } else {
              this.querySent = ''
              this._toggleGList(false)
            }
          }
        }
      }
    }

    _setValueDecoupled (newValue) {
      this._updatingValue = true
      this.value = newValue
      this._updatingValue = false
    }

    _textFocus () {
      this._textFocusHandlerDebounced(true)
    }

    _textUnFocus () {
      this._textFocusHandlerDebounced(false)
    }

    _mouseOverHandler () {
      this._setMouseGList(true)
    }

    _mouseOutHandler () {
      this._setMouseGList(false)
    }

    _sendPartialQuery () {
      if (this.inputValue.length >= this.constructor.MIN_JSON_QUERY_LENGTH &&
        this.inputValue !== this.querySent
      ) {
        // send Ajax
        this.querySent = this.inputValue
        this.$.partialNameAjax.params = {
          'name': this.querySent,
          'maxCandidates': this.constructor.MAX_CANDIDATES,
          'db': this._refObj.db
        }
        let request = this.$.partialNameAjax.generateRequest()
        return request.completes
          .then(response => this._updatePartialQuery(response))
          .catch(rejectedObj => {
            this._toggleGList(false)
            give.fireSignal('give-warning', rejectedObj.message)
          })
      }
      return Promise.resolve()
    }

    _updatePartialQuery (req) {
      // $('#geneName').removeClass('searchFieldBusy');
      this.splice('candidates', 0, this.candidates.length)
      let data = req.response
      if (data && data.input === this.inputValue) {
        this.emptyCandidatesString = '(No results)'
        this._showMsgInList = false
        for (let key in data.list) {
          if (key === '(max_exceeded)' && data.list[key]) {
            // max number of candidates has been reached
            this.emptyCandidatesString = '(Type more for candidates)'
            this._showMsgInList = true
          } else if (data.list.hasOwnProperty(key)) {
            let val = data.list[key]
            let entry = {
              name: key,
              coor: val.coor,
              description: val.description,
              contentBefore: '',
              contentBold: '',
              contentAfter: ''
            }
            if (key.toLowerCase().indexOf(
              this.inputValue.toLowerCase()
            ) !== 0) {
              // gene has an alias that is actually matching
              if (val.alias.toLowerCase()
                .indexOf(this.inputValue.toLowerCase()) === 0
              ) {
                // has a matching alias
                entry.contentBefore = entry.name + ' ('
                entry.contentBold =
                  val.alias.substr(0, this.inputValue.length)
                entry.contentAfter =
                  val.alias.substr(this.inputValue.length) + ')'
              } else {
                // no matching alias (shouldn't happen)
                entry.contentBefore = entry.name
                console.log(this.inputValue)
                console.log(entry)
              }
            } else {
              entry.contentBold = key.substr(0, this.inputValue.length)
              entry.contentAfter = key.substr(this.inputValue.length)
            }
            this.push('candidates', entry)
          }
        }
        this.isCandidatesEmpty =
          (!this.candidates || this.candidates.length <= 0)
        this._showMsgInList = this._showMsgInList || this.isCandidatesEmpty
        this._listReadyToShow = true
        this._toggleGList(true)
      } else {
        this._toggleGList(false)
      }
    }

    _partialSelectionChanged (newValue, oldValue) {
      if (newValue && newValue.coor) {
        this.coorSuffix = '(' + newValue.coor + ')'
        this.inputValue = newValue.name
        this.querySent = newValue.name
        this._listReadyToShow = false
        this._setValueDecoupled(newValue.coor)
        this._toggleGList(false)
      }
    }

    _toggleGList (toggle) {
      if (toggle) {
        // turn on GList
        this.$.candidatesList.style.height = Math.min(this.candidates.length,
          this.constructor.GENE_LIST_MAX_LINES) *
          this.constructor.GENE_LIST_PX_PER_LINE + 'px'
        this.$.candidatesList.clearSelection()
        Promise.resolve().then(() => {
          this.$.candidatesList.updateViewportBoundaries()
          this.$.geneNameDropDown.refit()
          this.$.geneNameDropDown.open()
          this._setTextFocus()
        })
        this.$.candidatesList.notifyResize()
        this._ajaxDebounceInterval =
          this.constructor.AJAX_DEBOUNCE_INTERVAL_ACTIVE
      } else {
        this._ajaxDebounceInterval =
          this.constructor.AJAX_DEBOUNCE_INTERVAL_IDLE
        if (this.$.geneNameDropDown.opened) {
          this.$.geneNameDropDown.close()
          if (!this._inFocus) {
            this.validate()
          } else {
            this._refocusDebouncer = Debouncer.debounce(
              this._refocusDebouncer,
              timeOut.after(
                this.constructor.REFOCUS_DEBOUNCE_INTERVAL
              ),
              () => {
                this._setTextFocus()
              }
            )
          }
        }
      }
    }

    _textFocusHandlerDebounced (flag) {
      if (this._textFocusHandlerDebouncer) {
        this._textFocusHandlerDebouncer.cancel()
        this._textFocusHandlerDebouncer = null
      }
      if (flag !== this._inFocus) {
        this._textFocusHandlerDebouncer = Debouncer.debounce(
          this._textFocusHandlerDebouncer,
          timeOut.after(
            flag ? 0 : this.constructor.SET_TEXT_FOCUS_DEBOUNCE_INTERVAL
          ),
          () => {
            this._textFocusHandlerDebouncer = null
            this._textFocusHandler(flag)
          }
        )
      }
    }

    _textFocusHandler (flag) {
      this._inFocus = flag
      this._checkGList()
      if (!flag && !this.$.geneNameDropDown.opened) {
        this.validate()
      }
    }

    _setMouseGList (flag) {
      this._mouseInGList = flag
      this._checkGList()
    }

    _checkGList () {
      if (!this._inFocus && !this._mouseInGList) {
        if (this._showGeneListDebouncer) {
          this._showGeneListDebouncer.cancel()
          this._showGeneListDebouncer = null
        }
        this._mouseOutDebouncer = Debouncer.debounce(
          this._mouseOutDebouncer,
          timeOut.after(this.constructor.MOUSE_OUT_TIME_OUT),
          () => {
            this._mouseOutDebouncer = null
            if (!this._inFocus && !this._mouseInGList) {
              this._toggleGList(false)
            }
          }
        )
      } else {
        if (this._mouseOutDebouncer) {
          this._mouseOutDebouncer.cancel()
          this._mouseOutDebouncer = null
        }
        if (this._inFocus && this._listReadyToShow) {
          this._showGeneListDebouncer = Debouncer.debounce(
            this._showGeneListDebouncer,
            timeOut.after(
              this.constructor.AJAX_DEBOUNCE_INTERVAL_IDLE
            ),
            () => {
              this._showGeneListDebouncer = null
              if (this._inFocus && this._listReadyToShow) {
                this._toggleGList(true)
                this._setTextFocus()
              }
            }
          )
        }
      }
    }

    validate (doNotChangeValue) {
      let errMsg
      delete this._clearErrorDuringInput
      if (!this.value && this.required) {
        errMsg = 'Please input a value!'
      } else if (this.value &&
        !this._valueIsCoordinate() &&
        !this.allowPartialGeneName
      ) {
        // still gene name, should either choose one or not found
        if (this.candidates.length > 0) {
          errMsg = 'Please select from gene candidates!'
          this._clearErrorDuringInput = true
        } else {
          if (this._partialNameSupported) {
            errMsg = 'Gene name not found!'
            this._clearErrorDuringInput = true
          } else {
            errMsg = 'Please use coordinates!'
          }
        }
      } else if (this.value && this._valueIsCoordinate()) {
        // test whether the value is within reference bounds
        try {
          let newCoordinate =
            new give.ChromRegion(this.value, this._refObj).regionToString()
          if (!doNotChangeValue) {
            this.value = newCoordinate
          }
        } catch (e) {
          errMsg = 'Invalid chromosomal coordinate value!'
          this._clearErrorDuringInput = true
        }
      }
      if (errMsg) {
        this.errorMessage = errMsg
        this.invalid = true
      } else if (!this.overrideErrorMessage) {
        this.invalid = false
      }
      return !this.invalid
    }

    _overrideErrorMessageChanged (newValue, oldValue) {
      if (newValue) {
        this.errorMessage = newValue
        this.invalid = true
      } else {
        this.validate(true)
      }
    }
  }

  GeneCoorInput.GENE_LIST_PX_PER_LINE = 48
  GeneCoorInput.GENE_LIST_MAX_LINES = 7

  GeneCoorInput.MOUSE_OUT_TIME_OUT = 1000
  GeneCoorInput.REFOCUS_DEBOUNCE_INTERVAL = 50
  GeneCoorInput.SET_TEXT_FOCUS_DEBOUNCE_INTERVAL = 100
  GeneCoorInput.AJAX_DEBOUNCE_INTERVAL_IDLE = 200
  GeneCoorInput.AJAX_DEBOUNCE_INTERVAL_ACTIVE = 200

  GeneCoorInput.MAX_CANDIDATES = 100 // max amount of candidates allowed to return
  GeneCoorInput.MIN_JSON_QUERY_LENGTH = 1 // minimum length of query

  give.GeneCoorInput = GeneCoorInput
  window.customElements.define('gene-coor-input', give.GeneCoorInput)

  return give
})(GIVe || {})
