const srcFolder = process.cwd() + '/src/'; // we will look for templateMap folders here

const ojs = require('./ojs');

// html entity quote function, exposed for changes
module.exports.qMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&#34;',
  "'": '&#39;',
};

// default template folders & functions, exposed for changes
module.exports.templateMap = {
  snippet: 'snippets',
  element: 'elements'
};

// symbol map, for privatish object members
const s = {
  jsBundle: Symbol('jsBundle'),
  cssBundle: Symbol('cssBundle')
};

let mode = 'development';
Object.defineProperty(module.exports, 'mode', {
  get () {
    return mode;
  },
  set (val) {
    if (val !== 'development' && val !== 'production') {
      throw new Error('osiris.mode can only be set to development or production');
    }
    mode = val;
    if (mode === 'development') ojs.cache.reset();
  },
  enumerable: true,
  configurable: false
});

// override ojs cache
ojs.cache = {
  _data: {},
  set: function (key, val) {
    if (mode === 'development') return; // disable caching in dev mode
    this._data[key] = val;
  },
  get: function (key) {
    return this._data[key];
  },
  remove: function (key) {
    delete this._data[key];
  },
  reset: function () {
    this._data = {};
  }
};

// return a constructor to hold all the variables for a single page render, takes a writableStream
const Osiris = function (writeStream) {
  this[s.jsBundle] = [];
  this[s.cssBundle] = [];

  // setup variables in "this" scope
  this.locals = {}; // global scope for templates

  // our render function, ojs needs a filename and an object representing local scope
  const render = async (filename, args = {}) => {
    // copy args to scope and preserve previous scopes args
    const previousArgs = this.args;
    this.args = args;
    await ojs.renderFile(writeStream, filename, this);
    this.args = previousArgs;
  };

  // call this to render a file
  this.render = async (filename) => {
    delete this.render; // run once
    await render(filename, {}); // render with empty args
    writeStream.end(); // we're done
  };

  this.onClose = () => {
    // user closed before template finished
  };

  this.onError = async (message) => {
    if (mode === 'development') {
      await this.print('<pre>' + this.q(message) + '</pre>');
    } else {
      throw message;
    }
    writeStream.end(); // we've failed
  };

  // setup template functions from map
  for (let funcName of Object.keys(module.exports.templateMap)) {
    let folderName = module.exports.templateMap[funcName];
    this[funcName] = async (filename, args) => {
      await render(srcFolder + folderName + '/' + filename + '.ojs', args);
      return '';
    };
  }
};

Osiris.prototype = {
  // quote a function according to exports.qMap, return a promise if given a promise
  q: (str='') => {
    const doQ = (str) => str.split('').map(c => module.exports.qMap[c] || c).join('');

    if (str instanceof Promise) return new Promise(async (res, rej) => {
      res(doQ(await str));
    });

    return doQ(str);
  },

  // collection points for js and css
  js: function (str) {
    this[s.jsBundle].push(str);
    return '';
  },
  bundleJs: function () {
    return this[s.jsBundle].join('\n');
  },

  css: function (str) {
    this[s.cssBundle].push(str);
    return '';
  },
  bundleCss: function () {
    return this[s.cssBundle].join('\n');
  },
};

const copyScopes = (obj, scopes) => {
  for (let copy of scopes) for (let i of Object.keys(copy)) {
    Object.defineProperty(obj, i, Object.getOwnPropertyDescriptor(copy, i));
  }
};

module.exports.use = (...modules) => {
  copyScopes(Osiris.prototype, modules);
};

module.exports.render = (writeStream, filename, ...modules) => {
  let osiris = new Osiris(writeStream);
  copyScopes(osiris, modules);
  osiris.render(filename);
};
