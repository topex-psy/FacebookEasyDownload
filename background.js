var webRequestParams = {
  urls: ["https://*.fbcdn.net/*"],
  types: ['xmlhttprequest']
};
var webRequestLastFound = [];
var contentType;

chrome.webRequest.onCompleted.addListener((details) => onWebRequest(details, 'onCompleted'), webRequestParams);

function onWebRequest(details, type) {
  let {url} = details;
  if (url.includes('.mp4?') && url.includes('&bytestart=')) {
    let mediaUrl = url.split('&bytestart=')[0];
    console.log('[FED] media request', type, mediaUrl);
    webRequestLastFound.unshift(mediaUrl);
    webRequestLastFound = webRequestLastFound.slice(0,2);
  }
}

function onIconClick(tab) {
  let {url} = tab;
  if (!contentType) {
    if (url.includes("www.facebook.com")) {
      alert('Open Facebook photo, video, or story you wish to download.');
    } else if (url.includes("www.youtube.com")) {
      alert('Open YouTube video you wish to download.');
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

chrome.browserAction.onClicked.addListener(onIconClick);

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
  }
  sendResponse({action, ...response});
});

chrome.tabs.onActivated.addListener(function(info) {
  console.log('[FED] tab activated', info);
  let { tabId } = info;
  analyzeTab(tabId);
});

chrome.tabs.onUpdated.addListener(function(tabId, info, tab) {
  console.log('[FED] tab updated', tabId, tab, info);
  if (tab.status != "unloaded") analyzeTab(tabId);
});

function analyze(tab) {
  let error = chrome.runtime.lastError;
  if (error) {
    console.log('[FED] analyze', error.message);
  } else if (tab.url) {
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
    } else if (url.includes("www.youtube.com")) {
      if (url.includes("/watch?")) contentType = 'video';
      site = 'YouTube';
    }
    chrome.browserAction.setTitle({title: contentType ? `Download ${site} ${contentType} (or press Ctrl+S)` : "Open a Facebook media you wish to download.", tabId});
    chrome.browserAction.setIcon({tabId, path: generateIcons(site?.toLowerCase() || 'disabled')});
    chrome.browserAction.setBadgeText({'text': contentType});
    chrome.browserAction.setBadgeBackgroundColor({'color': '#333333'});
    if (contentType) {
      console.log('[FED] content found', site, contentType);
    }
  }
};

function analyzeTab(tabId = null) {
  console.log("[FED] analyzeTab", tabId);
  if (tabId) chrome.tabs.get(+tabId, analyze);
  else chrome.tabs.getSelected(null, analyze);
}

// chrome.tabs.getSelected(null, analyzeTab);
analyzeTab();

function generateIcons(name) {
  return {
    "16": 'icons/' + name + "16.png",
    "24": 'icons/' + name + "24.png",
    "32": 'icons/' + name + "32.png"
  };
}