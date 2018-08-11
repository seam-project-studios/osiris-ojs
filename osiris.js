const ejs = require('./ejs-promise/ejs'); // temporary "proves the concept" library
ejs.delimiter = '?'; // php style :D

const streamBuffers = require('stream-buffers'); // patch for streamless returning of html

// symbol map, for privatish object members
const s = {
  writeStream: Symbol('writeStream'),
  render: Symbol('render'),
  jsBundle: Symbol('jsBundle'),
  cssBundle: Symbol('cssBundle'),
};

const copyScopes = (obj, scopes) => {
  for (let copy of scopes) for (let i of Object.keys(copy)) {
    if (typeof obj[i] !== 'undefined') continue; // copy but don't overwrite scope to this
    Object.defineProperty(obj, i, Object.getOwnPropertyDescriptor(copy, i));
  }
};

// return a constructor to hold all the variables for a single page render, takes a writableStream
const Osiris = function (writeStream) {
  // use memory buffered writeStream if none is provided
  if (!writeStream) writeStream = new streamBuffers.WritableStreamBuffer();
  this[s.writeStream] = writeStream;

  // our render function, ejs needs a filename, an object representing local scope and some options
  // gives us a callback to hook our pipes and a promise that resolve to the completely rendered template
  this[s.render] = (filename, args = {}) => new Promise(async (resolve, reject) => {
    // copy any args we had and nuke the scope for the next template
    let previousArgs = this.args;
    this.args = args;

    await ejs.renderFile(filename, this, { filename, context: {} }, async (err, p) => {
      // p is a promise/writeableStream from ejs layer
      if (err) return reject(err);

      if (!this[s.writeStream].getContents) { // patch for streamBuffers, buffer and flush
        p.noBuffer(); // don't hold data in buffers
        p.waitFlush(); // wait for our writeStream to flush before asking for more data from template engine
      }
      p.outputStream.pipe(this[s.writeStream], {end: false}); // pipe our output, don't close the stream when finished (we might just be an include in a template)

      resolve(p); // we've resolved, but the actual resolver isn't called until p has resolved (the template has finished rendering)

      await p;
      // copy our args back into scope
      this.args = previousArgs;
    });
  });

  this.render = async (filename, ...scopes) => {
    delete this.render; // run once

    copyScopes(this, scopes);

    // Object.freeze(this);
    let html = await this[s.render](filename);
    this[s.writeStream].end(); // we're done

    if (this[s.writeStream].getContents) return this[s.writeStream].getContents(); // patch for streamBuffers
    return html;
  };

  this.locals = {}; // global scope for templates
};

// html entity quote function
const qMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&#34;',
  "'": '&#39;',
};

Osiris.prototype = {
  // write directly to stream, return empty string
  print: function (text) {
    return new Promise((res, rej) => this[s.writeStream].write(text, () => res('')));
  },
  q: (str='') => str.split('').map(c => qMap[c] || c).join(''),

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

module.exports = {
  use: (...modules) => {
    copyScopes(Osiris.prototype, modules);
  },
  render: (writeStream, filename, ...modules) => {
    let osiris = new Osiris(writeStream);

    copyScopes(osiris, modules);

    return osiris.render(filename);
  }
}
