/* Minimal track control "band" component
  This is used to show minimal information of tracks and
  do the very basic control to adjust display settings

  Currently the implementation is extreme simplistic (a paper-checkbox or paper-radio-button)
  TODO: call track-control element from here
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '@polymer/paper-radio-button/paper-radio-button.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import '../basic-func/basic-func.js';
import '../track-object/track-object.js';
import '../give-styles.js';
import '../chart-area/give-track-styles.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="track-mini-control">
  <template>
    <style include="give-shared-styles">
    :host {
      padding: 0.1em 0;
    }

    paper-radio-button {
      --paper-radio-button-size: 1.2em;
    }

    paper-checkbox {
      --paper-checkbox-size: 1.2em;
    }
    </style>
    <template is="dom-if" if="[[singleChoice]]" restamp="true">
      <paper-radio-button id="choiceElem" name="[[track.id]]" checked="{{selected}}">
        [[_getTrackShortLabel(track)]]
      </paper-radio-button>
    </template>
    <template is="dom-if" if="[[!singleChoice]]" restamp="true">
      <paper-checkbox id="choiceElem" name="[[track.id]]" checked="{{selected}}">
        [[_getTrackShortLabel(track)]]
      </paper-checkbox>
    </template>
  </template>
  
</dom-module>`;

document.head.appendChild($_documentContainer.content);
var GIVe = (function (give) {
  'use strict'

  class TrackMiniControl extends PolymerElement {
    static get is () {
      return 'track-mini-control'
    }

    static get properties () {
      return {
        id: {
          type: String,
          readOnly: true
        },

        track: {
          type: Object
        },

        selected: {
          type: Boolean
        },

        singleChoice: {
          type: Boolean,
          value: false
        }
      }
    }

    _getTrackShortLabel (track) {
      return give.shortenString(track.getSetting('shortLabel'),
        this.constructor.TRACK_LABEL_LIMIT,
        this.constructor.TRACK_LABEL_PREFIX,
        this.constructor.TRACK_LABEL_SUFFIX)
    }

    static get heightProportion () {
      return this.DEFAULT_HEIGHT_PROPORTION
    }
  }

  TrackMiniControl.TRACK_LABEL_LIMIT = 25
  TrackMiniControl.TRACK_LABEL_PREFIX = 21
  TrackMiniControl.TRACK_LABEL_SUFFIX = 3

  TrackMiniControl.DEFAULT_HEIGHT_PROPORTION = 1.5

  give.TrackMiniControl = TrackMiniControl
  window.customElements.define('track-mini-control', give.TrackMiniControl)

  return give
})(GIVe || {})
