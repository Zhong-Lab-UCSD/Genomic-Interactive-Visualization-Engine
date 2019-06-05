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

import '../basic-func/basic-func.js';
import '../track-object/track-object.js';
import '../ref-object/ref-object.js';
import '../ref-embed-mixin/ref-embed-mixin.js';
import '@polymer/neon-animation/web-animations.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-item/paper-item.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="track-filter">
  <template>
    <style include="give-shared-styles">
      :host {
        --base-font-size: 12px;
      }
      paper-dropdown-menu {
        margin: 1em;
      }
    </style>
    <paper-dropdown-menu id="keyDropdown" label="[[fieldLabel]]">
      <paper-listbox slot="dropdown-content" id="keyMenu" attr-for-selected="value" selected="{{_key}}">
        <template is="dom-repeat" items="[[_keyArray]]">
          <paper-item value="[[item.id]]">[[item.value]]</paper-item>
        </template>
      </paper-listbox>
    </paper-dropdown-menu>
    <span>
      is
    </span>
    <paper-dropdown-menu id="valueDropdown" label="[[valueLabel]]">
      <paper-listbox slot="dropdown-content" id="valueMenu" attr-for-selected="value" selected="{{_value}}">
        <template is="dom-repeat" items="[[_valueArray]]">
          <paper-item value="[[item.id]]">[[item.value]]</paper-item>
        </template>
      </paper-listbox>
    </paper-dropdown-menu>
  </template>
  
</dom-module>`;

document.head.appendChild($_documentContainer.content);
/**
 * @license
 * Copyright 2017 GIVe Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var GIVe = (function (give) {
  'use strict'

  class DataFilter {
    filter (data) {
      return true
    }
  }

  give.DataFilter = DataFilter

  return give
})(GIVe || {})
/**
 * @license
 * Copyright 2017 GIVe Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var GIVe = (function (give) {
  'use strict'

  class MetadataFilter extends give.DataFilter {
    constructor (metaKeyArr, criteriaValue, compFunction, metaFetchFunction) {
      super(...arguments)
      this.MetaKeys = metaKeyArr
      this.Criteria = criteriaValue
      this.CompFunc = compFunction
      this.MetaFunc = metaFetchFunction
    }

    set MetaKeys (metaKeyArr) {
      this._MetaKeys = metaKeyArr
        ? (Array.isArray(metaKeyArr) ? metaKeyArr.slice() : [metaKeyArr])
        : []
    }

    get MetaKeys () {
      return this._MetaKeys
    }

    set Criteria (criteriaValue) {
      this._Criteria = criteriaValue
    }

    get Criteria () {
      return this._Criteria
    }

    set CompFunc (compFunction) {
      if (typeof compFunction === 'function') {
        this._CompFunc = compFunction
      } else {
        this._CompFunc = this.constructor._DefaultCompFunc
      }
    }

    get CompFunc () {
      return this._CompFunc
    }

    set MetaFunc (metaFetchFunction) {
      if (typeof metaFetchFunction === 'function') {
        this._MetaFunc = metaFetchFunction
      } else {
        this._MetaFunc = this.constructor._DefaultMetaFunc
      }
    }

    get MetaFunc () {
      return this._MetaFunc
    }

    filter (track) {
      if (track && this.MetaKeys.length > 0) {
        return this.MetaKeys.some(
          (key) => this.CompFunc(this.MetaFunc(track, key), this.Criteria))
      }
      return !!track
    }
  }

  MetadataFilter._DefaultCompFunc = (haystack, needle) => {
    if (haystack && typeof haystack === 'string') {
      return !needle ||
        haystack.toLowerCase().includes(
          typeof needle === 'string' ? needle.toLowerCase() : needle)
    }
    return !needle
  }

  MetadataFilter._DefaultMetaFunc = (track, key) => track[key]

  give.MetadataFilter = MetadataFilter

  return give
})(GIVe || {})
var GIVe = (function (give) {
  'use strict'

  class TrackFilter extends give.RefEmbedMixin(PolymerElement) {
    static get is () {
      return 'track-filter'
    }

    static get properties () {
      return {
        _key: {
          type: String,
          observer: '_keyChanged'
        },

        _value: {
          type: String
        },

        hasValue: {
          type: Boolean,
          value: false,
          computed: '_hasValue(_value)',
          notify: true
        },

        fieldLabel: {
          type: String,
          value: 'Field'
        },

        _keyArray: {
          type: Array,
          value () {
            return [
              {
                id: 'title',
                value: 'Data type'
              },
              {
                id: 'cellType',
                value: 'Cell type'
              },
              {
                id: 'labName',
                value: 'Lab name'
              }
            ]
          }
        },

        valueLabel: {
          type: String,
          value: 'Value'
        },

        _valueArray: {
          type: Array,
          value () {
            return []
          }
        },

        _valueDict: {
          type: Object,
          value () {
            return {}
          }
        }
      }
    }

    connectedCallback () {
      super.connectedCallback()
      this._valueArray = [
        {
          id: '((n/a))',
          value: '(Field required)'
        }
      ]
      this._keyIdDict = this._getDict(this._keyArray)
      this._valueIdDict = this._getDict(this._valueArray)
    }

    _getDict (array) {
      return array.reduce((dict, entry) => {
        dict[entry.id] = entry.value
        return dict
      }, {})
    }

    _refreshRef () {
      this._key = null
      this.refReadyPromise.then(() => this._buildMetaValueTables())
    }

    _setRefObj (refObj) {
      if (super._setRefObj(refObj)) {
        this._readiness = false
        if (this._refObj) {
          this._refreshRef()
        }
      }
    }

    _buildMetaValueTables () {
      this._valueDict = {}
      this._keyArray.forEach(fieldObj => {
        this._valueDict[fieldObj.id] = new Set()
      })
      this._refObj.tracks.forEach(track => {
        this._keyArray.forEach(fieldObj => {
          let value = track.getSetting(fieldObj.id, 'string')
          if (value && !this._valueDict[fieldObj.id].has(value)) {
            this._valueDict[fieldObj.id].add(value)
          }
        })
      })
      Promise.resolve().then(() => (this._readiness = true))
    }

    _keyChanged (newValue, oldValue) {
      if (this._refObj && newValue) {
        this._valueArray =
          Array.from(this._valueDict[newValue].values()).sort().map(
            entry => ({ id: entry, value: entry })
          )
      } else {
        this._valueArray = [
          {
            id: '((n/a))',
            value: '(Field required)'
          }
        ]
      }
      this._valueIdDict = this._getDict(this._valueArray)
    }

    _hasValue (value) {
      return !!value && value !== '((n/a))'
    }

    createFilter () {
      return new give.MetadataFilter(this._key,
        this._value === '((n/a))' ? null : this._value,
        (hay, needle) => (hay.toLowerCase() === needle.toLowerCase()),
        (track, key) => track.getSetting(key, 'string')
      )
    }

    get filterDesc () {
      try {
        return this._keyIdDict[this._key] + ' is ' +
          this._valueIdDict[this._value]
      } catch (e) {
        return 'No Filter'
      }
    }
  }

  give.TrackFilter = TrackFilter
  window.customElements.define('track-filter', give.TrackFilter)

  return give
})(GIVe || {})
