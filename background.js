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

function downloadPhoto(tab) {
  console.log('[FED] download', contentType, 'from', tab);
  if (contentType == 'photo') {
    chrome.tabs.executeScript(+tab.id, {code: `
      var opt = document.querySelector('[data-action-type="open_options_flyout"]');
      var box = opt.closest('.fbPhotoSnowliftContainer');
      var pid = location.href.includes('/photos/')
        ? location.href.split('/photos/')[1].split('/')[1]
        : location.href.split('fbid=')[1].split('&')[0];
      opt.click();
      picDownload(box, pid);
    `}, onScriptExecuted);
  } else if (contentType == 'video') {
    chrome.tabs.executeScript(+tab.id, {code: `
      var possibles = document.querySelectorAll('[href*="https://video"][href*="fbcdn.net"]');
      if (possibles.length) {
        makeDownload(possibles[possibles.length - 1]?.getAttribute('href'));
      } else {
        var id = (location.href.match(/\\/\\d+\\//g)[0]||[])?.slice(1,-1);
        vidDownload(id);
      }
    `}, onScriptExecuted);
  } else if (contentType == 'story') {
    // if (tab.audible) ...it's maybe a video
    // var possibles = [
    //   ...document.querySelectorAll('img[draggable="false"]'),
    //   ...document.querySelectorAll('video[src*="blob:"]')
    // ];
    // TODO combine video & audio into 1 file:
    // https://stackoverflow.com/questions/28890275/how-to-combine-video-and-audio-through-api-or-js
    // https://stackoverflow.com/questions/52768330/combine-audio-and-video-streams-into-one-file-with-mediarecorder
    // https://bgrins.github.io/videoconverter.js/
    chrome.tabs.executeScript(+tab.id, {code: `
      var possibles = document.querySelector('[data-pagelet="Stories"]').querySelectorAll('img[draggable="false"]');
      if (possibles.length) {
        makeDownload(possibles[possibles.length - 1]?.getAttribute('src'));
      } else {
        makeDownload('${webRequestLastFound[0] || ''}');
        makeDownload('${webRequestLastFound[1] || ''}');
      }
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
  if (tab.status != "unloaded") analizeTab(tab);
});

chrome.tabs.getSelected(null, analizeTab);

function analizeTab(tab) {
  if (!tab.url) return;
  let {url} = tab;
  let tabId = tab.id;
  let icon = 'disabled';
  contentType = null;
  if (url.includes("www.facebook.com")) {
    if (url.includes("/photo")) contentType = 'photo';
    else if (url.includes("/stories/")) contentType = 'story';
    else if (url.includes("/video")) contentType = 'video';
    icon = 'icon';
  }
  chrome.browserAction.setTitle({title: contentType ? `Download ${contentType} (or press Ctrl+S)` : "Open a Facebook media you wish to download.", tabId});
  chrome.browserAction.setIcon({tabId, path: generateIcons(icon)});
  chrome.browserAction.setBadgeText({
    'text': contentType
  });
  chrome.browserAction.setBadgeBackgroundColor({
    'color': '#333333'
  });
  if (contentType) {
    console.log('[FED] content found', contentType);
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