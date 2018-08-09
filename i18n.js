// params
const localesFolder = './src/locales/';

// general purpose
const fs = require('mz/fs'); // modernizer fs uses promises instead of callbacks
const asyncRequire = require('async-require');

// recurse down a file system tree running a callback for each file
const recurseFiles = async (root, file) => {
  let d = await fs.readdir(root);
  for (let f of d) {
    let stat = await fs.stat(root + f);
    if (stat.isDirectory(root + f)) {
      await recurseFiles(root + f + '/', file);
    }
    if (stat.isFile(root + f)) {
      if (file) await file(root + f);
    }
  }
};

// a json object representing the i18n text mappings
let data = {};

// find the place in `data` and add a node
const addNode = (path, ext) => {
  // traverse ref down the object chain until you arrive at the last node
  let ref = data;
  let chunks = path.split('/');
  let filename = chunks.pop();

  for (let chunk of chunks) {
    if (!ref[chunk]) ref[chunk] = {};
    ref = ref[chunk];
  }

  // depending on file type we need to import it differently
  if (ext === 'js') {
    ref[filename] = () => asyncRequire(localesFolder + path); // returns a promise
  } else if (ext === 'json') {
    ref[filename] = async () => JSON.parse(await fs.readFile(localesFolder + path+'.'+ext)); // returns a promise
  }
};

const textLocales = new Promise(async (res, rej) => {
  await recurseFiles(localesFolder, (file) => {
    const filename = file.substr(localesFolder.length);
    // extract file name information "name.ext"
    const doti = filename.lastIndexOf('.');
    const ext = filename.substr(doti+1).toLowerCase();
    const name = filename.substr(0,doti);

    if (name === 'index') return; // this file

    if (ext === 'js' || ext === 'json') {
      // only require() js and json files
      addNode(name, ext);
    }
  });
  res(data);
});

const traverseObj = async (obj, path) => {
  let ref = obj;
  for (let p of path) {
    if (!ref[p]) return false;
    if (typeof ref[p] === 'function') {
      ref = await ref[p]();
    } else {
      ref = ref[p];
    }
  }
  return await Promise.resolve(ref);
};

const OjsI18n = function(localeString) {
  // setLocale, pretty straight forward
  let locale;
  this.setLocale = (localeString) => {
    locale = localeString;
  };
  this.setLocale(localeString);

  // localize text by looking in locale/
  this.t = async (namespaceString, options) => {
    let t = await traverseObj(await textLocales, [locale].concat(namespaceString.split('.')));

    if (t === false) return '[locale.' + locale + '.' + namespaceString + ']';
    return t;
  };

  // localize datetime according to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
  this.d = (dateObject, options) => {
    if (!Date.prototype.isPrototypeOf(dateObject)) throw new TypeError(dateObject + ' is not a date');

    return new Intl.DateTimeFormat(locale, options).format(dateObject);
  };

  // localize number according to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NumberFormat
  this.n = (numberObject, options) => {
    if (typeof numberObject !== 'number') throw new TypeError(numberObject + ' is not a number');

    return numberObject.toLocaleString(locale, options);
  };

  // exposed variables
  Object.defineProperties(this, {
    locale: { enumerable: true, get: () => locale },
    locales: { enumerable: true, get: () => Object.keys(data) },
  });
};

module.exports = (...args) => new OjsI18n(...args);
