const srcFolder = process.cwd() + '/src/'; // we will look for snippets/ and components/ here

const ejs = require('./ejs-promise/ojs'); // temporary "proves the concept" library
// ejs.delimiter = '?'; // php style :D

const streamBuffers = require('stream-buffers'); // patch for streamless returning of html

// html entity quote function, exposed for changes
module.exports.qMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&#34;',
  "'": '&#39;',
};

// symbol map, for privatish object members
const s = {
  writeStream: Symbol('writeStream'),
  render: Symbol('render'),
  jsBundle: Symbol('jsBundle'),
  cssBundle: Symbol('cssBundle'),
};

// return a constructor to hold all the variables for a single page render, takes a writableStream
const Osiris = function (writeStream) {
  // use memory buffered writeStream if none is provided
  this[s.writeStream] = writeStream || new streamBuffers.WritableStreamBuffer();

  // set up variables in "this" scope
  this.locals = {}; // global scope for templates
  this[s.jsBundle] = [];
  this[s.cssBundle] = [];
};

Osiris.prototype = {
  // call this to render a file
  render: async function (filename) {
    delete this.render; // run once

    let html;
    try {
      html = await this[s.render](filename);
    } catch (e) {
      this.print('A compilation error occured: ' + await this.q(e.message));
    } finally {
      this[s.writeStream].end(); // we're done
    }

    if (this[s.writeStream].getContents) return this[s.writeStream].getContents(); // patch for streamBuffers
    return html;
  },

  // our render function, ejs needs a filename, an object representing local scope and some options
  // gives us a callback to hook our pipes and a promise that resolve to the completely rendered template
  [s.render]: async function (filename, args = {}) {
    // copy any args we had and nuke the scope for the next template
    const previousArgs = this.args;
    this.args = args;
    await ejs.renderFile(filename, this, { });
    this.args = previousArgs;
    return '';
  },

  // write directly to stream, return empty string
  print: function (text) {

    return new Promise(async (res, rej) => {
      text = await text;
      text = text.toString();
      if (text.length === 0) return res('');
      console.log('print:' + JSON.stringify(text));
      this[s.writeStream].write(text, () => res(''));
    });
  },
  q: async (str='') => {
    str = await str; // we may be given a promise of a string
    return str.split('').map(c => module.exports.qMap[c] || c).join('');
  },

  // osiris component layer

  // render a snippet of html
  snippet: async function (filename, args) {
    await this[s.render](srcFolder + 'snippets/' + filename + '.ojs', args);
    return '';
  },

  // html elements
  element: async function (filename, args) {
    await this[s.render](srcFolder + 'elements/' + filename + '.ojs', args);
    return '';
  },

  // collection points for js and css
  js: function (str) {
    this[s.jsBundle].push(str);
    return '';
  },
  bundleJs: function () {
    return this[s.jsBundle].join("\n");
  },

  css: function (str) {
    this[s.cssBundle].push(str);
    return '';
  },
  bundleCss: function () {
    return this[s.cssBundle].join("\n");
  },
};

const copyScopes = (obj, scopes) => {
  for (let copy of scopes) for (let i of Object.keys(copy)) {
    if (typeof obj[i] !== 'undefined') continue; // copy but don't overwrite scope to this
    Object.defineProperty(obj, i, Object.getOwnPropertyDescriptor(copy, i));
  }
};

module.exports.use = (...modules) => {
  copyScopes(Osiris.prototype, modules);
};

module.exports.render = (writeStream, filename, ...modules) => {
  let osiris = new Osiris(writeStream);
  copyScopes(osiris, modules);
  return osiris.render(filename);
};
