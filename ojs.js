'use strict';

const fs = require('mz/fs');
const check = require('syntax-error');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

// overridable caching object
let mode = 'development';
module.exports.cache = {
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

Object.defineProperty(module.exports, 'mode', {
  get () {
    return mode;
  },
  set (val) {
    if (val !== 'development' && val !== 'production') {
      throw new Error('ojs.mode can only be set to development or production');
    }
    mode = val;
    if (mode === 'development') module.exports.cache.reset();
  },
  enumerable: true,
  configurable: false
});

const ojsTemplate = function (filename) {
  this.filename = filename;
  this.lines = [];
  this.source = '';

  this.rethrow = (err, lineno) => {
    let start = Math.max(lineno - 2, 0);
    let end = Math.min(this.lines.length, lineno + 10);

    // Error context
    let code = this.lines.slice(start, end).map((line, i) => {
      var curr = i + start + 1;
      return (curr == lineno ? ' >> ' : '    ') + (curr.toString().length < end.toString().length ? ' ' : '') + curr + '| ' + line;
    }).join('\n');

    // Alter exception message
    if (typeof err === 'string') err = new Error(err);

    err.path = this.filename;

    if (err.stack) {
      let stackLines = err.stack.split('\n'), newStack = [];
      for (let line of stackLines) {
        if (line.match(/^\s*at (?:(?:ojsTemplate\.)?rethrow|Object.eval \(eval at compile |Object.rethrow \[as __rethrow\])/)) {
          newStack.push('    at OJS template (' + this.filename + ':' + lineno + ')\n\n' + code);
          break;
        }
        newStack.push(line);
      }
      err.message = newStack.join('\n');
    } else {
      err.message = 'Error: ' + err.message + '\n    at OJS template (' + this.filename + ':' + lineno + ')\n\n' + code;
    }

    throw err;
  };
};

ojsTemplate.prototype = {
  compile: async function () {
    let cacheHit = module.exports.cache.get(this.filename);
    if (cacheHit) {
      this.source = cacheHit.source;
      this.fn = cacheHit.fn;
      this.lines = cacheHit.lines;
      return;
    }

    let text = (await fs.readFile(this.filename)).toString();
    text = text.replace(/^\uFEFF/, '').replace(/\r/g, '');
    let lines = this.lines = text.split('\n');

    let cur = 0; // current character through file
    let line = 1; // current line through file
    let start = 0; // start character of current chunk
    let state = 'html'; // html, js, scomment, mcomment, squote, dquote, backtick
    let source = []; // our generated code

    // sniff the string from cur for the next chars matching string
    const expect = (string, moveCur = true) => {
      const len = string.length;
      if (text.substring(cur, cur + len) === string) {
        if (moveCur) cur += len;
        return true;
      } else {
        return false;
      }
    };

    const appendAndSkip = (skip = 0) => {
      if (start !== cur) {
        let code = text.substring(start, cur);
        if (state === 'js') {
          if (code[0] === '=') {
            source.push('await print(' + code.substr(1).replace(/;\s*$/, '') + ');');
          } else {
            source.push(code);
          }
        } else if (state === 'html') {
          source.push('await print(' + JSON.stringify(code) + ');');
        }
      }
      cur += skip;
      start = cur;
    };

    const nl = () => {
      line++;
      if (state !== 'js') source.push('\n');
    };

    while (cur < text.length) {
      switch (state) {
        case 'html':
          if (expect('\n')) {
            appendAndSkip();
            nl();
          } else if (expect('<?', false)) {
            appendAndSkip(2);
            source.push('__line=' + line + ';');
            state = 'js';
          } else {
            cur++;
          }
        break;
        case 'js':
          if (expect('\n')) {
            nl();
          } else if (expect('\\')) {
            cur++; // skip escaped char
          } else if (expect("'")) {
            state = 'squote';
          } else if (expect('"')) {
            state = 'dquote';
          } else if (expect('`')) {
            state = 'backtick';
          } else if (expect('/*', false)) {
            appendAndSkip(2);
            state = 'mcomment';
          } else if (expect('//', false)) {
            appendAndSkip(2);
            state = 'scomment';
          } else if (expect('?>', false)) {
            appendAndSkip(2);
            state = 'html';
            if (expect('\n')) {
              nl();
              start = cur;
            }
          } else {
            cur++;
          }
        break;
        case 'squote':
          if (expect('\\')) {
            cur++; // escaped char, move forward
          } else if (expect("'")) {
            state = 'js';
          } else {
            cur++;
          }
        break;
        case 'dquote':
          if (expect('\\')) {
            cur++; // escaped char, move forward
          } else if (expect('"')) {
            state = 'js';
          } else {
            cur++;
          }
        break;
        case 'backtick':
          if (expect('\\')) {
            cur++; // escaped char, move forward
          } else if (expect('`')) {
            state = 'js';
          } else {
            cur++;
          }
        break;
        case 'mcomment':
          if (expect('\n')) {
            nl(); // pad new line in multiline comment
          } else if (expect('*/')) {
            state = 'js';
            start = cur; // move cursor so we don't print comment into source
          } else {
            cur++;
          }
        break;
        case 'scomment':
          if (expect('\n')) {
            nl();
            state = 'js';
            start = cur; // move cursor so we don't print comment into source
          } else {
            cur++;
          }
        break;
        default:
          throw new Error('Unexpected state ' + state);
      }
    }
    switch (state) {
      case 'html':
        appendAndSkip();
      break;
      case 'js':
      case 'squote':
      case 'dquote':
      case 'backtick':
      case 'mcomment':
        this.rethrow('Unexpected end of file', lines.length);
      break;
    }

    this.source = source.join(''); // joining arrays is slightly faster than appending strings

    // use syntax-error to check the compiled source code
    let syntaxError = check('(async function () {' + this.source + '})();', this.filename);
    if (syntaxError) this.rethrow(syntaxError, syntaxError.line);

    // wrap our source in a try catch with using our rethrower function
    this.source = ' let __line = 0; with(__args) { try {' + this.source + '} catch (e) {__rethrow(e, __line);} }';

    // create our function using the constructor, taking our __args
    this.fn = new AsyncFunction('__args', this.source);


    // save to cache
    module.exports.cache.set(this.filename, { source: this.source, fn: this.fn, lines: this.lines });
  },

  render: async function (context) {
    // setup context scopes for templates
    let args = { '__rethrow': this.rethrow };
    for (let key in context) {
      // bind functions and assign variables to scope
      if (typeof context[key] === 'function') args[key] = context[key].bind(context);
      else args[key] = context[key];
    }

    await this.fn.call({}, args); // run the function
  }
};

module.exports.renderFile = async (writeStream, filename, context) => {
  if (!writeStream.on || !writeStream.write) {
    throw new Error('ojs.renderFile(writeStream, filename, context): expects first argument to be a writable stream');
  }
  if (await fs.exists(filename) === false) {
    throw new Error('ojs.renderFile(writeStream, filename, context): filename does not exist, was given: ' + filename);
  }
  if (typeof context !== 'object') {
    throw new Error('ojs.renderFile(writeStream, filename, context): context must be an object, was given: ' + typeof context);
  }

  // setup stream handling
  if (!writeStream.__osirisHooked) {
    writeStream.__osirisHooked = true;
    const onClose = () => {
      if (context.onClose) context.onClose.apply(context);
    };
    writeStream.on('close', onClose); // close is needed for sockets
    writeStream.on('end', onClose); // end is needed for stream buffers
  }

  const print = async (text) => {
    // write directly to stream, return/resolve an empty string
    text = await text;
    text = text.toString();
    if (text.length === 0) return '';

    return new Promise((res, rej) => {
      const resolve = () => res('');

      try {
        if (!writeStream.write(text)) { // returns false if buffering output
          writeStream.once('drain', resolve); // resolve once stream is drained
        } else {
          process.nextTick(resolve); // resolve on next tick, allow other requests to finish
        }
      } catch (e) {
        resolve(); // silence write errors
      }
    });
  };

  context.print = print.bind(context); // inject print function into context

  let template = new ojsTemplate(filename);
  try {
    await template.compile();
    await template.render(context);
  } catch (e) {
    if (mode === 'development') {
      context.print('<pre>' + e.message.replace(/</g, '&lt;') + '</pre>');
      return;
    }
    throw new Error(e.message);
  }
};
