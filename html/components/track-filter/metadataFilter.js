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
      super.apply(this, arguments)
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
