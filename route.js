const complain = require('complain');

const ESC_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#x60;',
  };
  
  const escapeHTML = (str, forAttribute) => {
    return str.replace(forAttribute ? /[&<>'"]/g : /[&<>]/g, (c) => {
      return ESC_MAP[c];
    });
  };
  
  const separator = '-------------------------------------------------------------------------------------------------------------------';
  
  
  const mapClass = {
      31: 'red',
      36: 'white'
  }
  
  module.exports = (req, res) => {
  
      const componentToMessages = {};
  
      const data = complain.getAll().map(e => {
          let parts = e.location.split('/');
          const fileRowCol = parts.pop();
          const nameParts = fileRowCol.split(':');
          const file = nameParts[0];
          const row = nameParts[1];
          const col = nameParts[2];
          const location = parts.join('/');
          const ret = {...e, location, fileRowCol, file, row, col};
          return ret; 
      });
  
      function sortHeading(a, b) {
          return a.heading < b.heading ? 1 : (a.heading > b.heading ? -1 : sortFile(a, b));
      }
  
  
      function sortFile(a, b) {
          return a.file < b.file ? -1 : (a.file > b.file ? 1 : ((!a.row || a.row < b.row) ? -1 : ((!b.row || a.row > b.row) ? 1 : 0)));
      }
  
      function sortLn(a, b) {
          return a.location < b.location ? -1 : (a.location > b.location ? 1 : sortHeading(a, b));
      }
  
      data.sort(sortLn);
  
      data.map(e => {
          if (componentToMessages[e.location]) {
              componentToMessages[e.location].push(e);
              componentToMessages[e.location].maxL = Math.max(e.fileRowCol.length, componentToMessages[e.location].maxL); 
          } else {
              componentToMessages[e.location] = [e];
              componentToMessages[e.location].maxL = e.fileRowCol.length;
          }
      });
  
      const cwd = process.cwd();
  
      res.setHeader('content-type', 'text/html');
      let html = `
      <style>
          body {background-color: #000; color: #aaa}
          .red {color: red;}
          .white {color: #fff;}
          .location {
              color: #fff;
              margin-bottom: 2px;
              display: inline-block;
          }
          .file {color: #777;}
  
       </style>`;
      let prevModule; 
      for (location in componentToMessages) {
          const folder = componentToMessages[location];
          const currModule = folder[0].moduleName;
          if (currModule != prevModule) {
              prevModule = currModule;
              const nFolder = Object.keys(componentToMessages).reduce((a, c) => currModule === componentToMessages[c][0].moduleName ? a + 1 : a, 0);
              const nMessages = Object.keys(componentToMessages).reduce((a, c) => currModule === componentToMessages[c][0].moduleName ? a + componentToMessages[c].length : a, 0);
              html += `\n\n\n${separator}\n\n <span>${currModule ? `Module <b class="white">${currModule}</b>` : 'This repo'} contains\n <b class="white">${nFolder}</b> folders and <b class="white">${nMessages}</b> messages that require attention</span>\n\n${separator}\n`;
          }
          html += `\n  <b class="location">${location} (${folder.length}):</b>\n`;
          for (i in folder) {
              const c = folder[i];
              let klass = '';
              if (c.headingColor) {
                  const m = c.headingColor.match(/\[([0-9]+);1m/);
                  if(m) klass = mapClass[m[1]];
                  html += `   <span class='${klass}'>${c.heading}</span> <a href="vscode://file/${cwd}/${location}/${c.fileRowCol}" class="file">${c.fileRowCol}</a>${' '.repeat(folder.maxL - c.fileRowCol.length)} ${escapeHTML(c.args[0])}\n`
              }
          }
      }
  
      res.send('<pre>' + html + '</pre>');
  };
  