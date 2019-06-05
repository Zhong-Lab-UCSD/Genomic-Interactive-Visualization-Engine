/* GIVe.refLinkDialog
  Show references as either numbers or texts, when tapped/clicked a paper-dialog
  showing everything inside the tag will appear near the link
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-dialog/paper-dialog.js';
import '../give-styles.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
var GIVe = (function (give) {
  'use strict'

  give.RefLinkDialog = Polymer({
    _template: html`
    <style include="give-shared-styles">
      :host {
        display: inline-block;
      }
      span#refLink {
        text-decoration: underline;
        cursor: pointer;
        color: var(--accent-color);
      }
      paper-dialog {
        margin: 5px;
      }
    </style>
    <span on-tap="_openRef" id="refLink">[[refLinkText]]</span>
    <paper-dialog id="refDialog" no-overlap="" auto-fit-on-attach="" horizontal-align="left" vertical-align="top">
      <div>
        <slot></slot>
      </div>
    </paper-dialog>
`,

    is: 'ref-link-dialog',

    properties: {

      refLinkText: {
        type: String,
        value: 'ref'
      }
    },

    ready: function () {
      this.$.refDialog.positionTarget = this.$.refLink
    },

    _openRef: function () {
      this.$.refDialog.open()
    }
  })

  return give
})(GIVe || {})
