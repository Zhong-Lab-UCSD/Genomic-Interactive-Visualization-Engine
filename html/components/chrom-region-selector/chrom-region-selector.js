import '@polymer/polymer/polymer-legacy.js';
import '../chrom-region-display/chrom-region-disp.js';
import '../track-object/track-object.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-material/paper-material.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../give-styles.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
var GIVe = (function (give) {
  'use strict'

  give.ChromRegionSelector = Polymer({
    _template: html`
    <style include="give-shared-styles iron-flex iron-flex-alignment">
    :host {
      padding: 0.5em;
      display: block;
    }
    paper-material {
      padding: 0.2em 0.5em;
      font-size: 0.9em;
      line-height: 1.2em;
      background: var(--card-background-color);
    }
    paper-button {
      margin: 0;
      height: 2.2em;
    }
    div {
      margin: 0.15em 0;
    }
    .regionTitle {
      font-weight: bold;
    }
    .regionCoordinates {
      font-size: 0.8em;
      margin: 0.3em 0 0 0;
    }
    .anno {
      color: var(--default-primary-color);
      margin-right: 0.5em;
      text-transform: capitalize;
    }
    .trackNames {
      margin: 0 0 0.1em 0;
    }
    </style>
    <paper-material elevation="1">
      <div class="layout horizontal">
        <div class="flex">
          <div class="regionTitle">[[region.name]]</div>
          <div class="regionCoordinates">[[_getRegionString(region)]]</div>
        </div>
        <paper-button on-tap="openRegionInBrowser">
          <iron-icon icon="forward"></iron-icon>
          Show
        </paper-button>
      </div>
      <template is="dom-if" if="[[regionHasTracks]]">
        <div class="layout horizontal start">
          <div class="anno">Tracks</div>
          <div class="flex trackNameContainer">
            <template is="dom-repeat" id="trackList" items="[[region.track]]">
              <div class="trackNames">[[_getTrackLabel(item)]]</div>
            </template>
          </div>
        </div>
      </template>
    </paper-material>
`,

    is: 'chrom-region-selector',

    properties: {

      region: {
        type: Object
      },

      regionHasTracks: {
        type: Boolean,
        readOnly: true,
        value: false
      }

    },

    attached: function () {
      if (Array.isArray(this.region.track) && this.region.track.length > 0) {
        this._setRegionHasTracks(true)
      } else {
        this._setRegionHasTracks(false)
      }
    },

    _getRegionString: function (region) {
      return region.toString()
    },

    _getTrackLabel: function (track) {
      return track.getSetting('shortLabel')
    },

    openRegionInBrowser: function () {
      this.fire('change-window', {
        newWindow: this.region.getExtendedRegion
          ? this.region.getExtendedRegion().regionToString(false)
          : this.region.regionToString(false),
        tracks: this.region.track
      })
    }
  })

  return give
})(GIVe || {})
