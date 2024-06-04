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
    let decoded = await new Response(decompressedStream).text();

    if (decoded[0] === '[' || decoded[0] === '{') {
      decoded = indentJson(decoded);
    } else if (decoded[0] === '<') {
      decoded = indentXml(decoded);
    }

    const messageDiv = document.querySelector(`form[id="${parts[0]}:insertForm"] div.well`);
    messageDiv.innerHTML = `ahdis userscript: the message has been GZIP-decompressed:\n\n<pre>${escapeHtml(decoded)}</pre>`;
  });
}


function indentXml(xml) {
  let formatted = "",
    indent = "";
  const tab = "  ";
  xml.split(/>\s*</).forEach(function (node) {
    if (node.match(/^\/\w/)) indent = indent.substring(tab.length); // decrease indent by one 'tab'
    formatted += indent + "<" + node + ">\r\n";
    if (node.match(/^<?\w[^>]*[^\/]$/)) indent += tab; // increase indent
  });
  return formatted.substring(1, formatted.length - 3);
}

function indentJson(json) {
  return JSON.stringify(JSON.parse(json), null, 2);
}

function escapeHtml(unsafe) {
  return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}