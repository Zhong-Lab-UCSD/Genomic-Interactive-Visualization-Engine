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

  /**
   * Object representing a corrdinate track, see `GIVe.TrackObject` for details.
   * @typedef {object} CoorTrack
   * @class give.CoorTrack
   * @implements give.TrackObject
   */
  class HighlightTrack extends give.TrackObject {
    /**
     * typeList - get the key strings showing this type of data.
     *    This shall be the same as the `type` column for track entries in
     *    `trackDb` table so that GIVE is able to figure out the track is of
     *    this type.
     * @static
     * @property
     *
     * @returns {Array<string>}  return all keys matching this type.
     */
    static get typeList () {
      return ['highlight']
    }

    constructor (ID, Settings, refObj, groupID) {
      super(...arguments)
      this.currentRegionIndex = 0
    }

    addRegion (chromRegion) {
      return this._dataObj.addRegion(chromRegion)
    }

    removeRegion (chromRegion) {
      return this._dataObj.removeRegion(chromRegion)
    }
  }

  // specify the data object (if needed) used in this track
  HighlightTrack._DataObjCtor = give.HighlightTrackData

  // specify the visualization object used in this track
  HighlightTrack._DomObjCtor = give.HighlightTrackDom

  // __IMPORTANT:__ register this new track type
  give.TrackObject.registerTrack(HighlightTrack)

  give.HighlightTrack = HighlightTrack

  return give
})(GIVe || {})
