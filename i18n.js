// general purpose
const fs = require('mz/fs'); // modernizer fs uses promises instead of callbacks
let textLocales = require('./locales/');

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
  });
};

module.exports = (...args) => new OjsI18n(...args);
