var GIVe = (function (give) {
  'use strict'

  var UI = new give.UIObject(window)
  give.spcArray = give.SpeciesObject.initAllSpecies(null, null, function (species) {
    return species.encode
  }, null)

  // this is used in trackObject.settings to indicate that this track is selected
  give.GENEMO_SELECTED_KEY = 'isGenemoSelected'
  give.CUSTOM_GROUP_ID = 'queryGroup'

  // these are DOM element IDs
  give.REGION_LIST_DOM_ID = 'mainRegionList'
  give.SEARCH_AND_TRACKS_DOM_ID = 'searchAndTrackTabs'
  give.MAIN_PANEL_DOM_ID = 'mainPanel'
  give.MAIN_PANEL_TARGET_DRAWER_DOM_ID = 'mainPanelDrawer'
  give.FIRST_CONTAINER_DOM_ID = 'genemoFirstContainer'

  give.SEARCH_PANEL_DOM_ID = 'genemoSearchPanel'
  give.TRACK_LIST_DOM_ID = 'mainChartTrackList'
  give.TRACK_LIST_PANEL_DOM_ID = 'trackSelectionPanel'
  give.TRACK_FILTER_DOM_ID = 'trackFilter'
  give.MAIN_CHART_DOM_ID = 'mainChartArea'

  give.firstRun = true

  give.switchFromFirstRun = function () {
    if (give.firstRun) {
      Polymer.dom(document).querySelector('div[drawer]#' +
        give.MAIN_PANEL_TARGET_DRAWER_DOM_ID).appendChild(
          Polymer.dom(document).querySelector('#' + give.SEARCH_AND_TRACKS_DOM_ID)
        )
      Polymer.dom(document).querySelector('#' + give.FIRST_CONTAINER_DOM_ID).hidden = true
      Polymer.dom(document).querySelector('#' + give.MAIN_PANEL_DOM_ID).hidden = false
      Polymer.dom(document).querySelector('#' + give.MAIN_PANEL_DOM_ID).closeDrawer()
      give.firstRun = false
    }
  }

  give.mainTaskScheduler.addTask(new give.TaskEntry(function () {
    document.querySelector('#searchCard').setSpecies(give.spcArray)
  }, ['web-component-ready', 'species-ready']))

  give.loadSessionInfo = function (sessionID, db, selectedTracks, urlToShow, originalFile, hasDisplay, searchRange) {
    give.sessionObj = {}
    give.sessionObj.id = sessionID
    give.sessionObj.db = db
    give.sessionObj.list = selectedTracks
    give.sessionObj.urlToShow = urlToShow
    give.sessionObj.originalFile = originalFile
    give.sessionObj.hasDisplay = hasDisplay
    give.sessionObj.searchRange = searchRange
  }

  give.validateUploadFileOrURL = function (event) {
    var sessionDataObj = event.detail.sessionDataObj
    give.toggleUpload(false)
    give.setRegionListUnready()

    var tableNameQuery = new window.FormData()
    tableNameQuery.append('Submit', 'Submit')
    tableNameQuery.append('species', sessionDataObj.db)
    tableNameQuery.append('email', sessionDataObj.email)

    var selTrackNames = give.spcArray.dbMap[sessionDataObj.db].getTrackTableNameList(function (track) {
      return track.getSetting(give.GENEMO_SELECTED_KEY)
    })

    if (selTrackNames.length <= 0) {
      give.fireSignal('alert', { msg: 'Please select at least one track to search!' })
      give.toggleUpload(true)
      return false
    }

    selTrackNames.forEach(function (tableName) {
      tableNameQuery.append('geneTracks[]', tableName)
    })

    if (sessionDataObj.searchRange) {
      tableNameQuery.append('chrom', sessionDataObj.searchRangeArr[0])
      tableNameQuery.append('start', parseInt(sessionDataObj.searchRangeArr[1]))
      tableNameQuery.append('end', parseInt(sessionDataObj.searchRangeArr[2]))
    }

    // send the file to uploadPrepare.php for preprocessing
    give.saveSession(sessionDataObj, function (saveSessionResp) {
      try {
        if (saveSessionResp.error) {
          throw new Error(saveSessionResp.error)
        }
        tableNameQuery.append('id', saveSessionResp.id)
        // add custom track (here on the browser) then send to compute
        give.setCustomTrack(sessionDataObj.db, saveSessionResp.urlToShow, saveSessionResp.bwFlag
          ? 'bigWig' : 'bed')
        give.sendRegionsToCompute(saveSessionResp.bwFlag,
          tableNameQuery, give.uploadUiHandler.bind(this, sessionDataObj))
      } catch (e) {
        give.fireSignal('alert', {msg: e.message})
        give.toggleUpload(true)
      }
    })
    give.switchFromFirstRun()

    give.fireCoreSignal('collapse', {group: 'query-search', flag: false})

    return false
  }

  give.saveSession = function (dataObj, callback) {
    // maybe in the future these two can be using the same dataObj to simplify code
    var IDPrepQuery = new window.FormData()
    IDPrepQuery.append('db', dataObj.db)
    IDPrepQuery.append('selected', give.spcArray.dbMap[dataObj.db].getTrackIDList(function (track) {
      return track.getSetting(give.GENEMO_SELECTED_KEY)
    }))
    IDPrepQuery.append('email', dataObj.email)
    if (dataObj.url) {
      // no file
      IDPrepQuery.append('url', dataObj.url)
      // check whether the file is bigwig format (.bw or .bigwig)
      var ext = dataObj.url.substr((~-dataObj.url.lastIndexOf('.') >>> 0) + 2).toLowerCase()
      if (ext === 'bw' || ext === 'bigwig') {
        // is bigwig file, add bigwig flag
        IDPrepQuery.append('bwData', true)
      }
    } else {
      IDPrepQuery.append('file', dataObj.file)
    }
    if (dataObj.urlToShow) {
      IDPrepQuery.append('urlToShow', dataObj.urlToShow)
    }
    if (dataObj.searchRange) {
      IDPrepQuery.append('searchRange', dataObj.searchRange)
    }
    // var compDomain = (window.location.search.indexOf('XCGenemoTest') > 0)? (window.location.protocol + '//comp.genemo.org/cpbrowser/'): 'cpbrowser/';
    var compDomain = window.location.protocol + '//comp.genemo.org/cpbrowser/'
    give.postAjax(compDomain + 'uploadPrepare.php', IDPrepQuery,
          callback, 'json')
  }

  give.loadSession = function (sessionObj) {
    try {
      // this is to change the selected setting for the species
      give.spcArray[sessionObj.db].setTrackSettings(give.GENEMO_SELECTED_KEY, false)
      give.spcArray[sessionObj.db].getTracks().forEachByID(JSON.parse(sessionObj.list), function (track) {
        track.setSetting(give.GENEMO_SELECTED_KEY, true)
      }, this)
      // then need to fire signal for the UI to respond
    } catch (jsonExcept) {
      // something is wrong with JSON (which means something wrong when the PHP code tries to process input)
      console.log(sessionObj.list)
      give.fireSignal('alert', {msg: 'Session data corrupted. Please contact us with your following Session ID to see if the results can be still retrieved. Session ID: ' + sessionObj.id})
    }
  }

  give.sendRegionsToCompute = function (bwFlag, tableNameQuery, callback) {
  // var compDomain = (window.location.search.indexOf('XCGenemoTest') > 0)? (window.location.protocol + '//comp.genemo.org/cpbrowser/'): 'cpbrowser/';
    var compDomain = window.location.protocol + '//comp.genemo.org/cpbrowser/'
    give.postAjax(compDomain + (bwFlag ? 'geneTrackBigwig.php' : 'geneTrackComparison.php'),
      tableNameQuery, callback, 'json')
  }

  give.setCustomTrack = function (db, url, type) {
    var track = {
      settings: {
        isCustom: true,
        type: type,
        visibility: give.TrackObject.StatusEnum.VIS_FULL,
        adaptive: 'on'
      }
    }
    track.settings.remoteUrl = url
    track.settings.requestUrl = give.TrackObject.fetchCustomTarget
    track.settings.shortLabel = 'Query input'
    track.tableName = 'queryInput'
    give.spcArray.dbMap[db].addCustomTrack(track, { id: give.CUSTOM_GROUP_ID })
  }

  give.uploadUiHandler = function (query, data) {
    var annotationLine = '#sourceFile=' + (query.urlFileInput || query.inputFileName) +
      (query.searchRange ? (' searchRange=' + query.searchRange) : '') + '\n'
    var inputFileName = query.inputFileName
    var regionListDOM = Polymer.dom(document).querySelector('#' + give.REGION_LIST_DOM_ID)

    if (!data || data.hasOwnProperty('error')) {
      // write blank or error message on gene list component
      give.fireSignal('alert', {msg: 'No results returned.'})
    } else {
      var geneList = give.mergeGeneList(give.populateRegionList(data,
        give.spcArray.dbMap[query.db]))

      give.fireCoreSignal('collapse', {group: 'query-search', flag: false})

      // write stuff for gene list component
      regionListDOM.setList(geneList, annotationLine, inputFileName)
      // $("#genelistContentHolder").append(writeGeneListTable(geneList, spcArray, cmnTracksEncode, updateNavFunc, changeGeneNameFunc));
    }
    give.toggleUpload(true)
    return 0
  }

  give.setRegionListUnready = function (domID) {
    domID = domID || give.REGION_LIST_DOM_ID
    var regionListDOM = Polymer.dom(document).querySelector('#' + domID)
    regionListDOM.setList()
    regionListDOM.setReady(false)
  }

  give.mergeGeneList = function (glist) {
    // merge all geneList
    // need to have at least half overlap
    var newRegionList = []
    glist.forEach(function (listItem) {
      var overlapped = false
      var firstOverlapIndex = newRegionList.length
      newRegionList = newRegionList.filter(function (region, index) {
        if (region.overlaps(listItem) >= Math.max(region.getLength(), listItem.getLength()) / 2) {
          listItem = region.assimilate(listItem)
          if (!overlapped) {
            overlapped = true
            firstOverlapIndex = index
          }
          return false
        }
        return true
      }, this)
      newRegionList.splice(firstOverlapIndex, 0, listItem)
    }, this)

    // populate the name map
    newRegionList.forEach(function (region) {
      newRegionList.map[region.name] = region
    }, this)
    return newRegionList
  }

  give.populateRegionList = function (rawObj, species) {
      // this function will convert raw Object (from JSON input) into an array of Region class
      // and also, if the rawObj don't have name for each genes, "Region X" will be used
    var regionList = []
    regionList.map = {}
    for (var regionName in rawObj) {
      if (rawObj.hasOwnProperty(regionName)) {
        var chrRegionRaw = rawObj[regionName]
        if (!isNaN(regionName) || regionName.slice(0, 6).toLowerCase() === 'region') {
          // it's a number or general name
          // use "Region " + number here
          regionName = 'Region ' + (regionList.length + 1)
        }
        chrRegionRaw.start = parseInt(chrRegionRaw.start || chrRegionRaw.genestart)
        chrRegionRaw.end = parseInt(chrRegionRaw.end || chrRegionRaw.geneend)
        chrRegionRaw.name = (chrRegionRaw.name || regionName).replace(/[\s()+/]/g, '')
        var newChrRegion = new give.ChromRegionDisp(chrRegionRaw, species)
        regionList.push(newChrRegion)
        regionList.map[regionName] = newChrRegion
      }
    }
    return regionList
  }

  give.toggleUpload = function (enableFlag) {
    if (enableFlag) {
      give.fireCoreSignal('disable', {group: 'query-search', flag: false})
    } else {
      give.fireCoreSignal('disable', {group: 'query-search', flag: true})
    }
  }

  give.changeSpecies = function (ref) {
    if (give.spcArray.dbMap[ref] && give.spcArray.dbMap[ref] !== give.spcArray.currSpecies()) {
      // species changed, needs to update lots of stuff
      give.spcArray.selected = ref
      Polymer.dom(document).querySelector('#' + give.TRACK_FILTER_DOM_ID).initialize(give.spcArray.currSpecies())
      Polymer.dom(document).querySelector('#' + give.TRACK_LIST_DOM_ID).changeSpecies(give.spcArray.currSpecies())
      // reset chromRegionList
      Polymer.dom(document).querySelector('#' + give.REGION_LIST_DOM_ID).setList()
      // reset mainChart
      Polymer.dom(document).querySelector('#' + give.MAIN_CHART_DOM_ID).changeSpecies(give.spcArray.currSpecies())
    }
  }

  give.switchTrack = function (selectedItem) {
    if (selectedItem === give.TRACK_LIST_PANEL_DOM_ID) {
      // needs to show track list, prepare track list then
      Polymer.dom(document).querySelector('#' + give.TRACK_LIST_DOM_ID).trackToDOM()
    }
    var pages = Polymer.dom(document).querySelector('#' + give.SEARCH_AND_TRACKS_DOM_ID)
    if (pages && pages.select) {
      pages.select(selectedItem)
    }
  }

  give.speciesChangedHandler = function (e) {
    give.changeSpecies(e.detail.newRef)
  }

  give.switchTrackHandler = function (e) {
    give.switchTrack(e.detail.selectedItem)
  }

  window.addEventListener('WebComponentsReady', function () {
    give.fireCoreSignal('content-dom-ready', null)
    give.fireSignal(give.TASKSCHEDULER_EVENT_NAME, {flag: 'web-component-ready'})
    var searchCard = document.querySelector('#searchCard')
    if (searchCard) {
      searchCard.addEventListener('submit-form', give.validateUploadFileOrURL)
    }

    var manualBtn = document.querySelector('#manualBtn')
    if (manualBtn) {
      manualBtn.addEventListener('click', window.open.bind(window, 'genemo-assets/manual_genemo.php', '_blank'))
    }
    var videoBtn = document.querySelector('#videoBtn')
    if (videoBtn) {
      var videoDialog = document.querySelector('#videoDialog')
      var videoPlayer = document.querySelector('#videoPlayer')
      if (videoDialog) {
        videoDialog.addEventListener('iron-overlay-opened', function () {
          if (videoPlayer && videoPlayer.playsupported) {
            videoPlayer.play()
          }
        })
        videoDialog.addEventListener('iron-overlay-closed', function () {
          if (videoPlayer && videoPlayer.playsupported) {
            videoPlayer.pause()
          }
        })
        videoBtn.addEventListener('click', videoDialog.open.bind(videoDialog))
      }
    }
    var engBtn = document.querySelector('#engBtn')
    if (engBtn) {
      engBtn.addEventListener('click', give.setTexts.bind(window, 'en'))
    }

    var zhBtn = document.querySelector('#zhBtn')
    if (zhBtn) {
      zhBtn.addEventListener('click', give.setTexts.bind(window, 'zh'))
    }

    document.addEventListener('alert', function (e) {
      UI.alert(e.detail.msg)
    })

    document.addEventListener('species-changed', give.speciesChangedHandler)
    document.addEventListener('switch-track-selection', give.switchTrackHandler)
    document.addEventListener('filter-tracks', give.filterTracksFromList)

    var mainChartArea = Polymer.dom(document).querySelector('#' + give.MAIN_CHART_DOM_ID)
    document.addEventListener('change-window', mainChartArea.updateWindowHandler.bind(mainChartArea))

    if (give.sessionObj && searchCard) {
      searchCard.loadSessionObj(give.sessionObj)
    }

    if (give.sessionError) {
      UI.alert(give.sessionError)
    }
  })

  return give
})(GIVe || {})
