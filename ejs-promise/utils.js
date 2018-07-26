/*
 * EJS Embedded JavaScript templates
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/

/**
 * Private utility functions
 * @module utils
 * @private
 */

'use strict';

var regExpChars = /[|\\{}()[\]^$+*?.]/g;

/**
 * Escape characters reserved in regular expressions.
 *
 * If `string` is `undefined` or `null`, the empty string is returned.
 *
 * @param {String} string Input string
 * @return {String} Escaped string
 * @static
 * @private
 */
exports.escapeRegExpChars = function (string) {
  // istanbul ignore if
  if (!string) {
    return '';
  }
  return String(string).replace(regExpChars, '\\$&');
};

var _ENCODE_HTML_RULES = {
      '&': '&amp;'
    , '<': '&lt;'
    , '>': '&gt;'
    , '"': '&#34;'
    , "'": '&#39;'
    }
  , _MATCH_HTML = /[&<>\'"]/g;

function encode_char(c) {
  return _ENCODE_HTML_RULES[c] || c;
};

/**
 * Stringified version of constants used by {@link module:utils.escapeXML}.
 *
 * It is used in the process of generating {@link ClientFunction}s.
 *
 * @readonly
 * @type {String}
 */

var escapeFuncStr =
  'var _ENCODE_HTML_RULES = {\n'
+ '      "&": "&amp;"\n'
+ '    , "<": "&lt;"\n'
+ '    , ">": "&gt;"\n'
+ '    , \'"\': "&#34;"\n'
+ '    , "\'": "&#39;"\n'
+ '    }\n'
+ '  , _MATCH_HTML = /[&<>\'"]/g;\n'
+ 'function encode_char(c) {\n'
+ '  return _ENCODE_HTML_RULES[c] || c;\n'
+ '};\n';

/**
 * Escape characters reserved in XML.
 *
 * If `markup` is `undefined` or `null`, the empty string is returned.
 *
 * @implements {EscapeCallback}
 * @param {String} markup Input string
 * @return {String} Escaped string
 * @static
 * @private
 */

exports.escapeXML = function (markup) {
  return markup == undefined
    ? ''
    : String(markup)
        .replace(_MATCH_HTML, encode_char);
};
exports.escapeXML.toString = function () {
  return Function.prototype.toString.call(this) + ';\n' + escapeFuncStr
};

/**
 * Copy all properties from one object to another, in a shallow fashion.
 *
 * @param  {Object} to   Destination object
 * @param  {Object} from Source object
 * @return {Object}      Destination object
 * @static
 * @private
 */
exports.shallowCopy = function (to, from) {
  from = from || {};
  for (var p in from) {
    to[p] = from[p];
  }
  return to;
};

/**
 * Simple in-process cache implementation. Does not implement limits of any
 * sort.
 *
 * @implements Cache
 * @static
 * @private
 */
exports.cache = {
  _data: {},
  set: function (key, val) {
    this._data[key] = val;
  },
  get: function (key) {
    return this._data[key];
  },
  reset: function () {
    this._data = {};
  }
};


/**
 * wrap a generator object to promise with given arguments.
 *
 * @param  {GeneratorFunction} gen       generator function you want to use
 * @param  {Object}            self      self object for generator
 * @param  {Function}          Promise   promise factory to use with this function
 * @param  {...*}              args      arguments that with pass to generator
 * @return {Promise}                     es6 promise object
 * @static
 * @private
 */
exports.wrapToPromise = function wrapToPromise(gen, self, Promise, args) {
  var defered = {};
  var args = [].slice.call(arguments, 3);
  var inst = gen.apply(self, args);
  
  var interrupted = false;
  
  var resultPromise = new Promise(function (resolve, reject) {
    defered.resolve = resolve
    defered.reject = reject
    
    // hook to prevent the promise from end instantlly and allow us to alter the result
    defered.onResolve = null;
    // hook to prevent the promise from end instantlly and allow us to alter the result
    defered.onReject = null;
    
    defered.onInterrupt = null;
    defered.interrupt = function () {
      if (defered.onInterrupt) {
        return _interrupt();
      }
      defered.onInterrupt(_interrupt);
    }
    
    var _interrupt = function () {
      interrupted = true
      if (defered.onReject) {
        defered.onReject(defered, new Error('interrupted by user'));
      } else {
        defered.reject(new Error('interrupted by user'));
      }
    }
  });
  resultPromise.defered = defered;
  resultPromise.execute = function () {
    wrapThrow(function () {
      next(inst, {done: false}, defered)
    });
    return resultPromise;
  }
  function wrapThrow(fn) {
    try {
      fn();
    } catch (err) {
      // interrupt may also be called before here
      if (interrupted) return;
      
      if ("function" === typeof defered.onReject) {
        defered.onReject(defered, err);
      } else {
        defered.reject(err);
      }
      return false;
    }
    return true;
  }
  
  function next(inst, result, defered) {
    // if this was interrupted by user, abort all calls
    if (interrupted) return;
    
    var isPromise;
    while (true) {
      // interrupt may also be called before here
      if (interrupted) return;
      
      isPromise = 
        'object' === typeof result.value && 
        null !== result.value &&
        'function' === typeof result.value.then;
      
      if (result.done) {
        if ("function" === typeof defered.onResolve) {
          return defered.onResolve(defered);
        } else {
          return defered.resolve();
        }
      }
      if (isPromise) {
        // it is a promise
        result.value.then(function (value) {
          wrapThrow(function () {
            next(inst, inst.next(value), defered);
          });
        }, function (err) {
          wrapThrow(function () {
            next(inst, inst.throw(err), defered);
          });
        })
      } else {
        if (wrapThrow(function () {
          result = inst.next(result.value);
        })) {
          continue;
        } else {
          break;
        }
      }
      break;
    }
  }
  return resultPromise
}