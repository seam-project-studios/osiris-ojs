const srcFolder = process.cwd() + '/src/'; // we will look for snippets/ and components/ here

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
module.exports.templateMap = { snippet: 'snippets', element: 'elements' };

// symbol map, for privatish object members
const s = {
  writeStream: Symbol('writeStream'),
  render: Symbol('render'),
  jsBundle: Symbol('jsBundle'),
  cssBundle: Symbol('cssBundle')
};

// return a constructor to hold all the variables for a single page render, takes a writableStream
const Osiris = function (writeStream) {
  this[s.writeStream] = writeStream;
  this[s.jsBundle] = [];
  this[s.cssBundle] = [];

  // setup variables in "this" scope
  this.locals = {}; // global scope for templates

  // setup template functions from map
  for (let funcName of Object.keys(module.exports.templateMap)) {
    let folderName = module.exports.templateMap[funcName];
    this[funcName] = async (filename, args) => {
      await this[s.render](srcFolder + folderName + '/' + filename + '.ojs', args);
      return '';
    };
  }
};

Osiris.prototype = {
  // call this to render a file
  render: async function (filename) {
    delete this.render; // run once
    await this[s.render](filename, {}); // render with empty args
    this[s.writeStream].end(); // we're done
  },

  // our render function, ojs needs a filename and an object representing local scope
  [s.render]: async function (filename, args = {}) {
    // copy args to scope and preserve previous scopes args
    const previousArgs = this.args;
    this.args = args;
    await ojs.renderFile(this[s.writeStream], filename, this);
    this.args = previousArgs;
  },

  // callback incase we need to do any clean up if the user quits half way through a render
  //onClose: function () {
  //  console.log('User closed stream!');
  //},

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
  osiris.render(filename);
};
