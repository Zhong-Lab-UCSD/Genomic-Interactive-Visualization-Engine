/**
@license
Copyright 2017 GIVe Authors
*
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

### Overview

`<bed-track-dom>` is the Web Component to display BED tracks. It's part of
`GIVe.BedTrack` object and is used to visualize data from the `GIVe.BedTrack`
object.

Please refer to [`GIVe.TrackObject`](../index.html) for details on tracks in
general, to [`GIVe.BedTrack`](./bed-track/index.html) for details on BED
track implementation, or to [Polymer element registration](https://www.polymer-project.org/1.0/docs/devguide/registering-elements)
for Polymer Element guide, including lifecycles, properties, methods and others.

*/
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
var GIVe = (function (give) {
  'use strict'

  give.NewTrackDOM = Polymer({
    _template: html`

`,

    /**
     * The ID of the custom element
     */
    is: 'new-track-dom',

    /**
     * "Inherit" base track dom behaviors.
     */
    behaviors: [
      give.TrackDOMBehavior
    ],

    /**
     * Additional properties can be added here.
     * Please refer to the Polymer Project documentation for reference:
     * https://www.polymer-project.org/1.0/docs/devguide/properties
     */
    properties: {
      // exampleProperty: {
      //   // This is a sample property
      //   type: Boolean,
      //   value: false
      // },   // comma is required if this is not the last property.
    },

    created: function () {
      /**
       * Private members and constants, private initialization codes, etc.
       * can be added here. Please see https://www.polymer-project.org/1.0/docs/devguide/registering-elements
       */
      // this.EXAMPLE_CONSTANT = 10
    },

    // ****** customized methods below ******

    /**
     * trackImpl - methods that will be called when the track DOM is
     * initialized.
     *
     * @param  {give.TrackObject} track - the track object linked to this
     *    DOM.
     * @param  {object} prop - additional properties needed to initialize
     *    the DOM.
     */
    trackImpl: function (track, prop) {
      /**
       * This will be called when initializing the track. Properties from
       * the database will be passed in `prop`
       */
      // if (prop.hasOwnProperty('exampleProperty')) {
      //   this.exampleProperty = prop.exampleProperty
      // }
    },

    /**
     * drawData - draw the data of the track
     *    This method should be implemented in track implementations.
     *    When implementing this method, use `this._getDataObject` to get
     *    the GiveTree object storing all necessary data corresponding to
     *    the correct chromosome. Then use `.traverse` to traverse through
     *    the content of the GiveTree object and apply customized drawing
     *    methods.
     */
    drawData: function () {
    }
  })
  return give
})(GIVe || {})
