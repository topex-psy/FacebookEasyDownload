const rapidKey = "30cf330551mshc9166932fccbbc0p1a0c3djsn926dbb2c16d3";
const dl = {
  video: () => {
    var url = new URL(location.href);
    var vid = url.searchParams.get("v");
    console.log('[FED] video id', vid);
    fetch(`https://ytgrabber.p.rapidapi.com/app/get/${vid}`, {
      "method": "GET",
      "headers": {
        "x-rapidapi-host": "ytgrabber.p.rapidapi.com",
        "x-rapidapi-key": rapidKey
      }
    })
    .then(response => {
      console.log('[FED] download list', response);
    })
    .catch(err => {
      console.log('[FED] download error', err);
    });
  }
}

function detectContentType() {
  let url = location.href;
  if (url.includes("/watch?")) return 'video';
  return null;
}