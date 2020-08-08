var tryNumber = 0;
var tryInterval;
var fbDtsg = '';

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

function picDownload(box, pid) {
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

async function vidDownload(id) {
  id = id || (location.href.match(/\/\d+\//g)[0]||[])?.slice(1,-1);
  if (!id) {
    alert("Couldn't find the video.");
    return;
  }
  console.log('[FED] video id', id);
  getFbEnv();
  const url = `https://www.facebook.com/video/tahoe/async/${id}/?chain=true&payloadtype=primary`;
  const options = {
    credentials: 'include',
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: `__user=${uid}&__a=1&fb_dtsg=${fbDtsg}`,
  };
  let dl = false;
  let r = await fetch(url, options);
  r = await r.text();
  r = JSON.parse(r.slice(9)).jsmods.instances;
  for (let idx = 0; idx < r.length; idx += 1) {
    const i = r[idx];
    if (i[1] && i[1].length && i[1][0] === 'VideoConfig') {
      const data = i[2][0].videoData[0];
      const src = data.hd_src_no_ratelimit || data.hd_src || data.sd_src_no_ratelimit || data.sd_src;
      makeDownload(src);
      dl = true;
    }
  }
  if (!dl) {
    alert("Couldn't find the video.");
  }
}

function makeDownload(src) {
  console.log('[FED] makeDownload', src);
  if (!src) {
    alert("Couldn't find content.");
    return;
  }
  let fileName = src.split("/").pop().split('?')[0];
  fetch(src).then(response => response.blob()).then(blob => downloadBlob(blob, fileName)).catch(err => {
    console.log('[FED] fetch error', err);
    downloadUrl(src, fileName, true);
  });
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

function getFbEnv() {
  const s = document.querySelectorAll('script');
  for (let i = 0; i < s.length; i += 1) {
    let t = s[i].textContent;
    if (t) {
      const m = t.match(/"USER_ID":"(\d+)"/);
      if (m) {
        uid = m[1];
      }
      if (t.indexOf('DTSGInitialData') > 0) {
        t = t.slice(t.indexOf('DTSGInitialData'));
        t = t.slice(0, t.indexOf('}')).split('"');
        fbDtsg = t[4];
      }
    }
  }
}