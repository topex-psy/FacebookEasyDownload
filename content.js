var tryNumber = 0;
var tryInterval;

const maxRetry = 2;

document.onkeydown = (e) => {
  var evtobj = window.event ? event : e
  if (evtobj.keyCode == 83 && evtobj.ctrlKey) {
    let contentType = detectContentType(location.href);
    if (contentType) {
      e.preventDefault();
      chrome.runtime?.sendMessage({action: 'clickIcon'}, onResponse);
    }
  }
};

function tryDownload(box, pid) {
  clearInterval(tryInterval);
  console.log('[FED] picture id', pid);
  tryNumber = 0;
  tryInterval = setInterval(() => {
    var con = box.querySelectorAll('.uiContextualLayerPositioner:not(.hidden_elem)');
    var btn = con[con.length-1]?.querySelector('a[data-action-type="download_photo"][href*="'+pid+'"]');
    if (btn) {
      clearInterval(tryInterval);
      console.log('[FED] download button click');
      btn.click();
      nextPhoto();
    } else {
      if (tryNumber < maxRetry) {
        tryNumber++;
        console.log('[FED] try to find download button');
      } else {
        clearInterval(tryInterval);
        console.log('[FED] use spotlight');
        makeDownload(box.querySelector('img.spotlight').getAttribute('src'));
        nextPhoto();
      }
    }
  }, 500);
}

function makeDownload(src) {
  console.log('[FED] makeDownload', src);
  if (!src) {
    alert("Couldn't find content.");
    return;
  }
  let fileName = src.split("/").pop().split('?')[0];
  // TODO how to download blob:url?
  // if (src.includes('blob:')) {
  //   var blob = new Blob([src], {type: "video/mp4"});
  //   fileName = document.title;
  //   downloadBlob(blob, fileName);
  // } else {
    fetch(src).then(response => response.blob()).then(blob => downloadBlob(blob, fileName)).catch(err => {
      console.log('[FED] fetch error', err);
      downloadUrl(src, fileName, true);
    });
  // }
}

function downloadBlob(blob, fileName) {
  console.log('[FED] download blob', blob);
  const url = URL.createObjectURL(blob);
  downloadUrl(url, fileName);
  URL.revokeObjectURL(url);
}

function downloadUrl(url, fileName, isBlank = false) {
  var a = document.createElement('a');
  a.href = url;
  if (isBlank) a.target = '_blank';
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function nextPhoto() {
  document.querySelector('a.next')?.click();
}

function onResponse(response) {
  let error = chrome.runtime.lastError;
  if (error) {
    console.log('action error', error.message);
  } else {
    console.log('action response', response);
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