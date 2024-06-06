// ==UserScript==
// @name        New features for the Gazelle datahouse
// @namespace   ahdis
// @match       https://gazelle.ihe.net/datahouse-ui/message*
// @grant       none
// @version     1.0.0
// @author      Quentin Ligier
// @description This script allows to automatically decompress GZIP-encoded messages and pretty-print them.
// @updateURL   https://github.com/ahdis/userscripts/raw/master/gazelle_datahouse.user.js
// ==/UserScript==

(async () => {
    const urlParams = new URLSearchParams(document.location.search);
    if (!urlParams.has('connectionId')) {
      return;
    }
    const connectionId = urlParams.get('connectionId');
  
    const connectionInfos = await (await fetch(`https://gazelle.ihe.net/datahouse-ui/api/connectionIndex?connection_reference=${connectionId}`)).json();
  
    const config = { attributes: false, childList: true, subtree: true };
  
    const callback = async (mutationList, observer) => {
      const divs = document.querySelectorAll('h2 + div');
      if (divs.length < 1 || !divs[0].innerText.includes('Content-Encoding: gzip')) {
        return;
      }
  
      const code = document.querySelector('h2 + div + code');
      // GZIP magic bytes
      if (code.innerText.startsWith('\x1F\x8B')) {
        const ds = new DecompressionStream("gzip");
        const base64Response = await fetch(`data:application/zip;base64,${connectionInfos[1].content.body}`);
        const blob = await base64Response.blob();
        const decompressedStream = blob.stream().pipeThrough(ds);
        let decoded = await new Response(decompressedStream).text();
  
        if (decoded[0] === '[' || decoded[0] === '{') {
          decoded = indentJson(decoded);
        } else if (decoded[0] === '<') {
          decoded = indentXml(decoded);
        }
  
        code.innerHTML = 'ahdis userscript: the message has been GZIP-decompressed and pretty-printed:<br><br>';
        const pre = document.createElement('pre');
        code.append(pre);
        pre.innerText = decoded;
      }
  
    };
  
    const observer = new MutationObserver(callback);
    observer.observe(document, config);
  })();
  
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