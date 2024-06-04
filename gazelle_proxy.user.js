// ==UserScript==
// @name        New features for the Gazelle proxy
// @namespace   ahdis
// @match       https://gazelle.ihe.net/proxy/messages/http.seam*
// @grant       none
// @version     20240604T121900
// @author      Quentin Ligier
// @description This script allows to automatically decompress GZIP-encoded messages.
// @updateURL   https://github.com/ahdis/userscripts/raw/master/gazelle_proxy.user.js
// ==/UserScript==

const headers = document.querySelector('pre').innerText;

if (headers.includes('Content-Encoding: gzip')) {
  const downloadButton = document.querySelectorAll('span.gzl-icon-download + input')[1];
  const largerId = downloadButton.name;
  const parts = downloadButton.name.split(':');
  const smallerId = `${parts[0]}:${parts[1]}`;

  const params = new URLSearchParams();
  params.set(smallerId, smallerId);
  params.set(largerId, 'Télécharger le fichier');
  params.set('javax.faces.ViewState', document.querySelector(`form[id="${smallerId}"] input[name="javax.faces.ViewState"]`).value);
  fetch('https://gazelle.ihe.net/proxy/messages/http.seam', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: params
  }).then(async res => {
    const ds = new DecompressionStream("gzip");
    const blob = await res.blob();
    const decompressedStream = blob.stream().pipeThrough(ds);
    const decoded = await new Response(decompressedStream).text();
    const messageDiv = document.querySelector(`form[id="${parts[0]}:insertForm"] div.well`);
    messageDiv.innerText = `ahdis userscript: the message has been GZIP-decompressed:\n\n${decoded}`;
  });
}