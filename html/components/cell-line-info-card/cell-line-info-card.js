/* Note that cell line info card can have two states:
  1. A "hovering" state, showing a summarized version of the annotations, and will be dismissed upon clicking other places
    2. A "complete" state, showing a complete version of all annotations in a MODAL dialog
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/paper-button/paper-button.js';

import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '../give-styles.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
var GIVe = (function (give) {
  'use strict'

  give.CellLineInfoCard = Polymer({
    _template: html`
    <style include="give-shared-styles">
      :host {
      }
      paper-dialog {
        text-align: left;
      }
      .tableRow {
        width: 100%;
      }
      .tableRow > * {
        display: inline-block;
        padding: 0 0.3em;
        vertical-align: top;
      }
      .tableRow > .anno {
        width: 5.5em;
      }
      .tableRow > .annoContent {
        max-width: 30em;
        word-break: break-word;
      }
    </style>
    <paper-dialog id="mainDialog" on-iron-overlay-canceled="cancelCheck">
      <h2>{{metaEntry.term}} properties</h2>
      <paper-dialog-scrollable>
        <template is="dom-repeat" id="metaContent" items="{{metaEntry.arr}}">
          <div class="fullWidth tableRow">
            <div class="anno">{{item.key}}</div>
            <div class="annoContent">
              <template is="dom-if" if="{{item.isLink}}">
                <a href="{{item.value}}" target="_blank">{{item.value}}</a>
              </template>
              <template is="dom-if" if="{{!item.isLink}}">
                {{item.value}}
              </template>
            </div>
          </div>
        </template>
      </paper-dialog-scrollable>
      <div class="buttons">
        <paper-button on-tap="confirmCheck">[[confirmString]]</paper-button>
        <paper-button dialog-dismiss="">Close</paper-button>
      </div>
    </paper-dialog>
`,

    is: 'cell-line-info-card',

    properties: {
      metaEntry: {
        type: Object,
        value: function () {
          return {}
        }
      },

      confirmString: {
        type: String,
        value: 'More info...'
      },

      metaEntries: {
        type: Object
      },

      isDetail: {
        type: Boolean,
        value: false
      }
    },

    created: function () {
      this.summaryKeys = { term: true, tissue: true, description: true, lineage: true }
      this.hiddenKeys = { color: true, category: true, protocol: true }
      this.metaLink = null
    },

    generateDialog: function (metaEntries, term, ref, isDetail) {
      // notice that whether this is a detailed one depends on the current dialog state
      if (metaEntries && metaEntries.entries &&
        metaEntries.entries[ref] && metaEntries.entries[ref][term]
      ) {
        this.metaEntries = metaEntries
        this.isDetail = (typeof (isDetail) === 'boolean'
          ? isDetail
          : (this.$.mainDialog.opened &&
            this.metaEntry.ref === ref &&
            this.metaEntry.term === term))  // display detailed version
        this.set('metaEntry.term', term)
        this.set('metaEntry.ref', ref)
        this.set('metaEntry.arr', [])    // initialize meta entries
        var keyList = metaEntries.entries[ref][term]
        var metaText = ''
        for (var key in keyList) {
          if (keyList.hasOwnProperty(key)) {
            if ((this.isDetail || this.summaryKeys[key]) && !this.hiddenKeys[key]) {
              var newEntry = {key: key, value: keyList[key].replace('%3A', ':')}
              if (keyList[key].startsWith('http://') || keyList[key].startsWith('https://')) {
                newEntry.isLink = true
              }
              this.push('metaEntry.arr', newEntry)
              metaText += key + '\t' + keyList[key] + '\n'
            }
          }
        }
        if (this.isDetail) {
          this.confirmString = 'Download meta data'
          if (this.metaLink !== null) {
            window.URL.revokeObjectURL(this.metaLink)
          }
          var metaBlob = new window.Blob([metaText], {type: 'text/plain'})
          this.metaLink = window.URL.createObjectURL(metaBlob)
        } else {
          this.confirmString = 'More info...'
        }
      }
      this.async(function () {
        this.$.mainDialog.refit()
      }, 50)
      if (!this.$.mainDialog.opened) {
        this.$.mainDialog.open()
      }
    },

    cancelCheck: function (e, detail) {
      if (detail.target.tagName === 'SPAN' &&
        detail.target.classList.contains('metaLink')
      ) {
        e.preventDefault()
      }
    },

    confirmCheck: function (e, detail) {
      if (this.isDetail) {
        // download meta
        window.open(this.metaLink)
      } else {
        this.generateDialog(this.metaEntries, this.metaEntry.term, this.metaEntry.ref, true)
      }
    }
  })

  return give
})(GIVe || {})
