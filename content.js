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