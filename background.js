var webRequestParams = {
  urls: ["https://*.fbcdn.net/*"],
  types: ['xmlhttprequest']
};
var webRequestLastFound = [];
var contentType;
var isLoading = {};

chrome.browserAction.onClicked.addListener(onIconClick);
chrome.webRequest.onCompleted.addListener((details) => onWebRequest(details, 'onCompleted'), webRequestParams);
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("on action", request, sender);
  let { action } = request;
  let response = {ok: true};
  switch (action) {
    case 'clickIcon':
      chrome.tabs.getSelected(null, onIconClick);
      break;
    case 'getLastRequests':
      response = {webRequestLastFound};
      break;
    case 'setLoading':
      isLoading[sender.tab.id] = request.value;
      if (request.value) {
        generateIcons(sender.tab.id, 'spinner');
      } else {
        analyzeTab();
      }
      break;
  }
  sendResponse({action, ...response});
});

chrome.tabs.onActivated.addListener(function(info) {
  console.log('[FED] tab activated', info);
  analyzeTab();
});

chrome.tabs.onUpdated.addListener(function(tabId, info, tab) {
  console.log('[FED] tab updated', tabId, tab, info);
  if (tab.selected && tab.status != "unloaded") analyzeTab();
});

function onIconClick(tab) {
  let {url} = tab;
  if (!contentType) {
    if (url.includes("www.facebook.com")) {
      alert('Open Facebook photo, video, or story you wish to download.');
    }
    return;
  }
  console.log('[FED] download', contentType, 'from', tab);
  chrome.tabs.executeScript(+tab.id, {code: `dl['${contentType}']();`}, function(results) {
    let error = chrome.runtime.lastError;
    if (error) {
      console.log('script not executed', error.message);
    } else {
      console.log('script executed', results);
    }
  });
}

function onWebRequest(details, type) {
  let {url} = details;
  if (url.includes('.mp4?') && url.includes('&bytestart=')) {
    let mediaUrl = url.split('&bytestart=')[0];
    console.log('[FED] media request', type, mediaUrl);
    if (webRequestLastFound[0] != mediaUrl) {
      webRequestLastFound.unshift(mediaUrl);
      webRequestLastFound = webRequestLastFound.slice(0,2);
    }
  }
}

function generateIcons(tabId, name) {
  console.log('[FED] set browser icon', tabId, name);
  chrome.browserAction.setIcon({tabId, path: isLoading[tabId] ? {
    "32": "icons/spinner.gif"
  } : {
    "16": "icons/" + name + "16.png",
    "24": "icons/" + name + "24.png",
    "32": "icons/" + name + "32.png"
  }});
}

function analyze(tab) {
  console.log("[FED] analyze", tab);
  let {url} = tab;
  let tabId = tab.id;
  let site;
  contentType = null;
  if (url.includes("www.facebook.com")) {
    if (url.includes("/photo")) contentType = 'photo';
    else if (url.includes("/stories/")) contentType = 'story';
    else if (url.includes("/video")) contentType = 'video';
    site = 'Facebook';
  }
  chrome.browserAction.setTitle({title: contentType ? `Download ${site} ${contentType} (or press Ctrl+S)` : "Open a Facebook media you wish to download.", tabId});
  chrome.browserAction.setBadgeText({'text': contentType});
  chrome.browserAction.setBadgeBackgroundColor({'color': '#333333'});
  generateIcons(tabId, site ? 'icon' : 'disabled');
  if (contentType) {
    console.log('[FED] content found', site, contentType);
  }
};

function analyzeTab() {
  chrome.tabs.getSelected(null, analyze);
}

analyzeTab();