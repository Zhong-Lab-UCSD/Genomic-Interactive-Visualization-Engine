import '../basic-func/basic-func.js';
import '../basic-func/genemo-constants.js';
import '../meta-entries/meta-entries.js';
import '../ref-object/ref-object.js';
import '../chrom-region-display/chrom-region-disp.js';
import '../ui-component/ui-component.js';
import '../task-scheduler/task-scheduler.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
var GIVe = (function (give) {
  'use strict'

  var UI = new give.UIObject(window)

  // this is used in trackObject.settings to indicate that this track is selected
  give.GENEMO_SELECTED_KEY = 'isGenemoSelected'
  give.CUSTOM_GROUP_ID = 'queryGroup'

  // these are DOM element IDs and DOM element Objects
  give.SEARCH_PANEL_DOM_ID = 'genemoSearchPanel'
  give.TRACK_LIST_PANEL_DOM_ID = 'trackSelectionPanel'

  // mainPanel drawerWidth values
  give.MAINPANEL_DRAWER_MARGIN = 7         // px

  var mainPanelDom, mainPanelDrawerDom,
    mainRegionListDom,
    searchTracksDom,
    trackListDom,
    mainChartDom, firstContainerDom,
    videoButtonDom, searchPanelDom,
    searchCardDom

  var firstRun = true

  give.switchFromFirstRun = function () {
    if (firstRun) {
      mainPanelDrawerDom.appendChild(searchTracksDom)
      // then move all the buttons to the toolbar
      dom(searchPanelDom).querySelectorAll('a, paper-button').forEach(function (elem) {
        try {
          dom(searchPanelDom).removeChild(elem)
        } catch (e) {
        }
      }, this)
      firstContainerDom.hidden = true
      mainPanelDom.hidden = false
      mainPanelDom.closeDrawer()
      mainPanelDom.drawerWidth = dom(document).querySelector('#' + give.SEARCH_PANEL_DOM_ID).offsetWidth +
        give.MAINPANEL_DRAWER_MARGIN * 2 + 'px'
      firstRun = false
    }
  }

  give.mainTaskScheduler.addTask(new give.TaskEntry(function () {
    dom(document).querySelector('#searchCard').setRef(give.RefObject.refArray)
  }, ['web-component-ready', 'ref-ready']))

  give.validateUploadFileOrURL = function (event) {
    var sessionDataObj = event.detail.sessionDataObj
    give.toggleUpload(false)
    give.setRegionListUnready()

    var tableNameQuery = new window.FormData()
    tableNameQuery.append('Submit', 'Submit')
    tableNameQuery.append('ref', sessionDataObj.db)
    tableNameQuery.append('email', sessionDataObj.email)

    var selTrackNames = give.RefObject.refArray.dbMap[sessionDataObj.db].getTrackTableNameList(function (track) {
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
          throw new give.GiveError(saveSessionResp.error)
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
    IDPrepQuery.append('selected', give.RefObject.refArray.dbMap[dataObj.db].getTrackIDList(function (track) {
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
    give.postAjaxLegacy(give.compHost + give.Gnm_UploadPrepareTarget, IDPrepQuery,
          callback, 'json').then((value) => {})
  }

  give.loadSession = function (sessionObj) {
    try {
      // this is to change the selected setting for the ref
      give.RefObject.refArray[sessionObj.db].setTrackSettings(give.GENEMO_SELECTED_KEY, false)
      give.RefObject.refArray[sessionObj.db].getTracks().forEachByID(JSON.parse(sessionObj.list), function (track) {
        track.setSetting(give.GENEMO_SELECTED_KEY, true)
      }, this)
      give.switchFromFirstRun()
      var ext = sessionObj.originalFile.substr((~-sessionObj.originalFile.lastIndexOf('.') >>> 0) + 2).toLowerCase()
      var bwFlag = (ext === 'bw' || ext === 'bigwig')
      give.setCustomTrack(sessionObj.db, sessionObj.urlToShow, bwFlag
        ? 'bigWig' : 'bed')
      var sessionDataObj = {
        inputFileName: sessionObj.originalFile,
        searchRange: sessionObj.searchRange
      }
      give.getComputedRegions(sessionObj.id, sessionObj.db, give.uploadUiHandler.bind(this, sessionDataObj))
    } catch (jsonExcept) {
      // something is wrong with JSON (which means something wrong when the PHP code tries to process input)
      console.log(sessionObj.list)
      give.fireSignal('alert', {msg: 'Session data corrupted. Please contact us with your following Session ID to see if the results can be still retrieved. Session ID: ' + sessionObj.id})
    }
  }

  give.sendRegionsToCompute = function (bwFlag, tableNameQuery, callback) {
    give.postAjaxLegacy(give.compHost + (bwFlag ? give.Gnm_CompBigwigTarget
      : give.Gnm_CompBedTarget), tableNameQuery, callback, 'json')
  }

  give.getComputedRegions = function (id, ref, callback) {
    give.postAjaxLegacy(give.compHost + give.Gnm_LoadResultTarget,
      { id: id, species: ref }, callback, 'json')
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
    give.RefObject.refArray.dbMap[db].addCustomTrack(track, { id: give.CUSTOM_GROUP_ID })
  }

  give.uploadUiHandler = function (query, data) {
    var annotationLine = '#sourceFile=' + (query.urlFileInput || query.inputFileName) +
      (query.searchRange ? (' searchRange=' + query.searchRange) : '') + '\n'
    var inputFileName = query.inputFileName

    if (!data || data.hasOwnProperty('error')) {
      // write blank or error message on gene list component
      give.fireSignal('alert', {msg: 'No results returned.'})
    } else {
      var geneList = give.mergeGeneList(give.populateRegionList(data,
        give.RefObject.refArray.dbMap[query.db]))

      give.fireCoreSignal('collapse', {group: 'query-search', flag: false})

      // write stuff for gene list component
      mainRegionListDom.setList(geneList, annotationLine, inputFileName)
      // $("#genelistContentHolder").append(writeGeneListTable(geneList, spcArray, cmnTracksEncode, updateNavFunc, changeGeneNameFunc));
    }
    give.toggleUpload(true)
    return 0
  }

  give.setRegionListUnready = function (regionListDom) {
    regionListDom = regionListDom || mainRegionListDom
    regionListDom.setList(null, null, null, true)
  }

  give.mergeGeneList = function (glist) {
    // merge all geneList
    // need to have at least half overlap
    var newRegionList = []
    glist.forEach(function (listItem) {
      var overlapped = false
      var firstOverlapIndex = newRegionList.length
      newRegionList = newRegionList.filter(function (region, index) {
        if (region.overlaps(listItem) >= Math.max(region.length, listItem.length) / 2) {
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

  give.populateRegionList = function (rawObj, ref) {
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
        chrRegionRaw.setStart(parseInt(chrRegionRaw.start || chrRegionRaw.genestart))
        chrRegionRaw.setEnd(parseInt(chrRegionRaw.end || chrRegionRaw.geneend))
        chrRegionRaw.name = (chrRegionRaw.name || regionName).replace(/[\s()+/]/g, '')
        var newChrRegion = new give.ChromRegionDisp(chrRegionRaw, ref)
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

  give.changeRef = function (ref) {
    if (give.RefObject.refArray.dbMap[ref] && give.RefObject.refArray.dbMap[ref] !== give.RefObject.refArray.currRef()) {
      // ref changed, needs to update lots of stuff
      give.RefObject.refArray.selected = ref
      trackListDom.setRef(give.RefObject.refArray.currRef())
      // reset chromRegionList
      mainRegionListDom.setList()
      // reset mainChart
      mainChartDom.setRef(give.RefObject.refArray.currRef())
    }
  }

  give.switchPage = function (selectedPageID) {
    if (selectedPageID === give.TRACK_LIST_PANEL_DOM_ID) {
      // needs to show track list, prepare track list then
      trackListDom.syncTrackToDom()
    }
    if (searchTracksDom && searchTracksDom.select) {
      searchTracksDom.select(selectedPageID)
      mainPanelDom.drawerWidth = dom(document).querySelector('#' + selectedPageID).offsetWidth +
        give.MAINPANEL_DRAWER_MARGIN * 2 + 'px'
    }
  }

  give.refChangedHandler = function (e) {
    give.changeRef(e.detail.newRef)
  }

  give.switchPageHandler = function (e) {
    give.switchPage(e.detail.selectedPageID)
  }

  // detect sessionID to see whether loading session is needed
  if (give.getParameterByName('sessionID')) {
    // sessionID is specified
    give.sessionObj = {}
    give.postAjaxLegacy(
      give.compHost + give.Gnm_LoadSessionTarget,
      {
        'sessionID': give.getParameterByName('sessionID')
      }, function (response) {
        // populate give.sessionObj
        give.sessionObj.id = response.id
        give.sessionObj.db = response.db
        give.sessionObj.list = response.selected_tracks
        give.sessionObj.urlToShow = response.display_file_url
        give.sessionObj.originalFile = response.original_file_name
          ? response.original_file_name
          : response.display_file_url.split(/[\\/]/).pop()
        give.sessionObj.hasDisplay = !(response.display_file_url.indexOf(response.id) >= 0 ||
          response.display_file_url.indexOf(response.original_file_name) >= 0)
        give.sessionObj.searchRange = response.search_range.trim()
        give.fireSignal(give.TASKSCHEDULER_EVENT_NAME, {flag: 'session-object-ready'})
      }, 'json', 'POST', function (status) {
        // may need to differentiate with different statuses
        UI.alert('Invalid address or address expired.')
      }
    )

    // schedule later operations after sessionObj is loaded
    give.mainTaskScheduler.addTask(new give.TaskEntry(
      give.loadSession.bind(this, give.sessionObj),
      ['session-object-ready']
    ))
    give.mainTaskScheduler.addTask(new give.TaskEntry(
      function () {
        searchCardDom.loadSessionObj(give.sessionObj)
      }, ['session-object-ready', 'web-component-ready']
    ))
  }

  window.addEventListener('WebComponentsReady', function () {
    give.fireCoreSignal('content-dom-ready', null)
    give.fireSignal(give.TASKSCHEDULER_EVENT_NAME, {flag: 'web-component-ready'})
    searchCardDom = document.querySelector('#searchCard')
    if (searchCardDom) {
      searchCardDom.addEventListener('submit-form', give.validateUploadFileOrURL)
    }

    var engBtn = document.querySelector('#engBtn')
    if (engBtn) {
      engBtn.addEventListener('tap', give.setTexts.bind(window, 'en'))
    }

    var zhBtn = document.querySelector('#zhBtn')
    if (zhBtn) {
      zhBtn.addEventListener('tap', give.setTexts.bind(window, 'zh'))
    }

    document.addEventListener('alert', function (e) {
      UI.alert(e.detail.msg)
    })

    mainPanelDom = dom(document).querySelector('#mainPanel')
    mainPanelDrawerDom = dom(document).querySelector('#mainPanelDrawer')
    mainRegionListDom = dom(document).querySelector('#mainRegionList')
    searchTracksDom = dom(document).querySelector('#searchAndTrackTabs')
    trackListDom = dom(document).querySelector('#mainChartTrackList')

    firstContainerDom = dom(document).querySelector('#genemoFirstContainer')

    mainChartDom = dom(document).querySelector('#mainChartArea')

    searchPanelDom = dom(document).querySelector('#' + give.SEARCH_PANEL_DOM_ID)

    videoButtonDom = dom(document).querySelectorAll('.videoBtn')
    if (videoButtonDom.length > 0) {
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
        videoButtonDom.forEach(function (elem) {
          elem.addEventListener('tap', videoDialog.open.bind(videoDialog))
        })
      }
    }

    document.addEventListener('ref-changed', give.refChangedHandler)
    document.addEventListener('switch-page', give.switchPageHandler)

    document.addEventListener('change-window', function (e) {
      give.RefObject.refArray.currRef().getGroups().encode.forEach(function (track) {
        track.setVisibility(false)
      }, this)
      e.detail.tracks.forEach(function (track) {
        track.setVisibility(true)
      }, this)
      mainChartDom.updateWindow(e)
    })

    if (give.sessionObj && searchCardDom) {
      searchCardDom.loadSessionObj(give.sessionObj)
    }

    if (give.sessionObj) {
      give.setRegionListUnready()
    }

    if (give.sessionError) {
      UI.alert(give.sessionError)
    }
  })

  return give
})(GIVe || {})
