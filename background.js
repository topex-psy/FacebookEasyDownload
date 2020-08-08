var WebRequestParams = {
  urls: ["<all_urls>"]
};

chrome.webRequest.onBeforeRequest.addListener((details) => onWebRequest(details, 'onBeforeRequest'), WebRequestParams);
chrome.webRequest.onBeforeSendHeaders.addListener((details) => onWebRequest(details, 'onBeforeSendHeaders'), WebRequestParams);
chrome.webRequest.onSendHeaders.addListener((details) => onWebRequest(details, 'onSendHeaders'), WebRequestParams);
chrome.webRequest.onHeadersReceived.addListener((details) => onWebRequest(details, 'onHeadersReceived'), WebRequestParams);
chrome.webRequest.onAuthRequired.addListener((details) => onWebRequest(details, 'onAuthRequired'), WebRequestParams);
chrome.webRequest.onResponseStarted.addListener((details) => onWebRequest(details, 'onResponseStarted'), WebRequestParams);
chrome.webRequest.onBeforeRedirect.addListener((details) => onWebRequest(details, 'onBeforeRedirect'), WebRequestParams);
chrome.webRequest.onCompleted.addListener((details) => onWebRequest(details, 'onCompleted'), WebRequestParams);
chrome.webRequest.onErrorOccurred.addListener((details) => onWebRequest(details, 'onErrorOccurred'), WebRequestParams);

function onWebRequest(details, type) {
  let {url} = details;
  if (url.includes('.mp4?') && url.includes('&bytestart=')) {
    console.log('[FED] WEB REQUEEEEEEEEEEEEEEST', type, url.split('&bytestart=')[0]);
  } else {
    // console.log('[FED] WEB REQUEST', type, url);
  }
}

function downloadPhoto(tab) {
  let contentType = detectContentType(tab.url);
  console.log('[FED] download', contentType, 'from', tab);
  if (contentType == 'photo') {
    chrome.tabs.executeScript(+tab.id, {code: `
      var opt = document.querySelector('[data-action-type="open_options_flyout"]');
      var box = opt.closest('.fbPhotoSnowliftContainer');
      var pid = location.href.includes('/photos/')
        ? location.href.split('/photos/')[1].split('/')[1]
        : location.href.split('fbid=')[1].split('&')[0];
      opt.click();
      findDownload(box, pid);
    `}, onScriptExecuted);
  } else if (contentType == 'video') {
    chrome.tabs.executeScript(+tab.id, {code: `
      var possibles = document.querySelectorAll('[href*="https://video"][href*="fbcdn.net"]');
      makeDownload(possibles[possibles.length - 1]?.getAttribute('href'));
    `}, onScriptExecuted);
  } else if (contentType == 'story') {
    chrome.tabs.executeScript(+tab.id, {code: `
      var possibles = [
        ...document.querySelectorAll('img[draggable="false"]'),
        ...document.querySelectorAll('video[src*="blob:"]')
      ];
      makeDownload(possibles[possibles.length - 1]?.getAttribute('src'));
    `}, onScriptExecuted);
  } else {
    alert('Open a Facebook photo, video, or story you wish to download.');
  }
}

chrome.browserAction.onClicked.addListener(downloadPhoto);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("on action", request, sender);
  let { action } = request;
  if (action == 'clickIcon') chrome.tabs.getSelected(null, downloadPhoto);
  sendResponse({action, ok: true});
});

chrome.tabs.onActivated.addListener(function(info) {
  let { tabId } = info;
  chrome.tabs.get(+tabId, function(tab) {
    console.log("[FED] tab activated", tabId, tab, info);
    analizeTab(tab);
  });
});

chrome.tabs.onUpdated.addListener(function(tabId, info, tab) {
  console.log('[FED] tab updated', tabId, tab, info);
  analizeTab(tab);
});

chrome.tabs.getSelected(null, analizeTab);

function analizeTab(tab) {
  // console.log('[FED] analizeTab', tab);
  if (tab.url) {
    let tabId = tab.id;
    let contentType = detectContentType(tab.url);
    if (contentType) console.log('[FED] content found', contentType);
    chrome.browserAction.setTitle({title: contentType ? "Click to download (or press Ctrl+S)" : "Open a Facebook media you wish to download.", tabId});
    chrome.browserAction.setIcon({tabId, path: generateIcons(contentType ? 'icon' : 'disabled')});
  }
}

function generateIcons(name) {
  return {
    "16": name + "16.png",
    "24": name + "24.png",
    "32": name + "32.png"
  };
}

function onScriptExecuted(results) {
  let error = chrome.runtime.lastError;
  if (error) {
    console.log('script not executed', error.message);
  } else {
    console.log('script executed', results);
  }
}

function detectContentType(url) {
  if (url.includes("www.facebook.com")) {
    if (url.includes("/photo")) return 'photo';
    if (url.includes("/stories/")) return 'story';
    if (url.includes("/video")) return 'video';
  }
  return null;
}