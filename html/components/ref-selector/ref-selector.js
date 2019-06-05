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

import '@polymer/neon-animation/web-animations.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-item/paper-item.js';
import '../ref-object/ref-object.js';
import '../give-styles.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="ref-selector">
  <template>
    <style include="give-shared-styles">
    </style>
    <paper-dropdown-menu id="refDropdown" label="[[label]]">
      <paper-listbox slot="dropdown-content" id="refMenu" attr-for-selected="value" selected="{{ref}}">
        <template is="dom-repeat" items="[[refArray]]">
          <paper-item value="[[item.db]]"><span>[[item.db]]</span> (<span>[[item.commonName]]</span>)</paper-item>
        </template>
      </paper-listbox>
    </paper-dropdown-menu>
  </template>
  
</dom-module>`;

document.head.appendChild($_documentContainer.content);
var GIVe = (function (give) {
  'use strict'

  class RefSelector extends PolymerElement {
    static get is () {
      return 'ref-selector'
    }

    static get properties () {
      return {
        ref: {
          type: String,
          value: null,
          notify: true
        },

        refArray: {
          type: Array,
          value: function () {
            return []
          }
        },

        label: {
          type: String,
          value: 'Reference genome'
        }
      }
    }

    ready () {
      super.ready()
      give.RefObject.allRefPromise.then(refArray =>
        this._populateRefs(refArray))
    }

    _populateRefs (refArray) {
      (refArray || give.RefObject.refArray)
        .forEach(refObj => this._addSingleRef(refObj))
    }

    _addSingleRef (refObj) {
      this.push('refArray', refObj)
    }
  }

  give.RefSelector = RefSelector
  window.customElements.define('ref-selector', give.RefSelector)

  return give
})(GIVe || {})
