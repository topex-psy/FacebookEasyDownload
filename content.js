var tryNumber = 0;
var tryInterval;
var fbDtsg = '';

const maxRetry = 2;
const dl = {
  photo: () => {
    var opt = document.querySelector('[data-action-type="open_options_flyout"]');
    if (!opt) {
      alert("Couldn't find content.");
      return;
    }
    var box = opt.closest('.fbPhotoSnowliftContainer');
    var pid = location.href.includes('/photos/')
      ? location.href.split('/photos/')[1].split('/')[1]
      : location.href.split('fbid=')[1].split('&')[0];
    opt.click();
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
  },
  video: async () => {
    var possibles = document.querySelectorAll('[href*="https://video"][href*="fbcdn.net"]');
    if (possibles.length) {
      makeDownload(possibles[possibles.length - 1]?.getAttribute('href'));
      return;
    } else {
      let vid = (location.href.match(/\/\d+\//g)[0]||[])?.slice(1,-1);
      if (!vid) {
        alert("Couldn't find the video.");
        return;
      }
      console.log('[FED] video id', vid);
      getFbEnv();
      const url = `https://www.facebook.com/video/tahoe/async/${vid}/?chain=true&payloadtype=primary`;
      const options = {
        credentials: 'include',
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: `__user=${uid}&__a=1&fb_dtsg=${fbDtsg}`,
      };
      let src;
      let r = await fetch(url, options);
      r = await r.text();
      r = JSON.parse(r.slice(9)).jsmods.instances;
      for (let idx = 0; idx < r.length; idx += 1) {
        const i = r[idx];
        if (i[1] && i[1].length && i[1][0] === 'VideoConfig') {
          const data = i[2][0].videoData[0];
          src = data.hd_src_no_ratelimit || data.hd_src || data.sd_src_no_ratelimit || data.sd_src;
          break;
        }
      }
      makeDownload(src);
    }
  },
  story: () => {
    // if (tab.audible) ...it's maybe a video
    // var possibles = [
    //   ...document.querySelectorAll('img[draggable="false"]'),
    //   ...document.querySelectorAll('video[src*="blob:"]')
    // ];
    // TODO combine video & audio into 1 file:
    // https://stackoverflow.com/questions/28890275/how-to-combine-video-and-audio-through-api-or-js
    // https://stackoverflow.com/questions/52768330/combine-audio-and-video-streams-into-one-file-with-mediarecorder
    // https://bgrins.github.io/videoconverter.js/
    var possibles = document.querySelector('[data-pagelet="Stories"]').querySelectorAll('img[draggable="false"]');
    if (possibles.length) {
      makeDownload(possibles[possibles.length - 1]?.getAttribute('src'));
    } else {
      chrome.runtime?.sendMessage({action: 'getLastRequests'}, function(response) {
        makeDownload(response.webRequestLastFound[0] || '');
        makeDownload(response.webRequestLastFound[1] || '');
      });
    }
  }
}

function nextPhoto() {
  document.querySelector('a.next')?.click();
}

function detectContentType() {
  let url = location.href;
  if (url.includes("/photo")) return 'photo';
  if (url.includes("/stories/")) return 'story';
  if (url.includes("/video")) return 'video';
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

document.onkeydown = (e) => {
  var evtobj = window.event ? event : e
  if (evtobj.keyCode == 83 && evtobj.ctrlKey) {
    let contentType = detectContentType();
    if (contentType) {
      e.preventDefault();
      chrome.runtime?.sendMessage({action: 'clickIcon'}, function(response) {
        let error = chrome.runtime.lastError;
        if (error) {
          console.log('action error', error.message);
        } else {
          console.log('action response', response);
        }
      });
    }
  }
};

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