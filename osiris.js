const ejs = require('./ejs-promise/ejs'); // temporary "proves the concept" library
ejs.delimiter = '?'; // php style :D

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
};

Osiris.prototype = {
  // call this to render a file
  render: async function (filename) {
    delete this.render; // run once

    let html = await this[s.render](filename);
    this[s.writeStream].end(); // we're done

    if (this[s.writeStream].getContents) return this[s.writeStream].getContents(); // patch for streamBuffers
    return html;
  },

  // our render function, ejs needs a filename, an object representing local scope and some options
  // gives us a callback to hook our pipes and a promise that resolve to the completely rendered template
  [s.render]: function (filename, args = {}) {
    return new Promise(async (resolve, reject) => {
      // copy any args we had and nuke the scope for the next template
      const previousArgs = this.args;
      this.args = args;

      ejs.renderFile(filename, this, { filename, context: {} }, async (err, p) => {
        // p is a promise/writeableStream from ejs layer
        if (err) return reject(err);

        if (!this[s.writeStream].getContents) { // patch for streamBuffers, buffer and flush
          p.noBuffer(); // don't hold data in buffers
          p.waitFlush(); // wait for our writeStream to flush before asking for more data from template engine
        }
        p.outputStream.pipe(this[s.writeStream], {end: false}); // pipe our output, don't close the stream when finished (we might just be an include in a template)

        await p; // once everything is done, copy our args back into scope
        this.args = previousArgs;
        resolve(p); // we've resolved
      });
    });
  },

  // write directly to stream, return empty string
  print: function (text) {
    return new Promise((res, rej) => this[s.writeStream].write(text, () => res('')));
  },
  q: (str='') => str.split('').map(c => module.exports.qMap[c] || c).join(''),

  locals: {}, // global scope for templates

  // osiris component layer

  // render a snippet of html
  snippet: async function (filename, args) {
    await this[s.render]('./src/snippets/' + filename + '.ojs', args);
    return '';
  },

  // html elements
  element: async function (filename, args) {
    await this[s.render]('./src/elements/' + filename + '.ojs', args);
    return '';
  },

  // collection points for js and css
  [s.jsBundle]: [],
  js: function (str) {
    this[s.jsBundle].push(str);
    return '';
  },
  bundleJs: function () {
    return this[s.jsBundle].join("\n");
  },

  [s.cssBundle]: [],
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
