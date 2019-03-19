'use strict';

const fs = require('mz/fs');
const check = require('syntax-error');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

const ojsTemplate = function (filename) {
  this.filename = filename;
  this.source = '';
};

ojsTemplate.prototype = {
  compile: async function () {
    let text = (await fs.readFile(this.filename)).toString();
    text = text.replace(/^\uFEFF/, '').replace(/\r/g, '');
    let lines = text.split('\n');

    this.rethrow = (err, lineno) => {
      let start = Math.max(lineno - 5, 0);
      let end = Math.min(lines.length, lineno + 5);

      // Error context
      let code = lines.slice(start, end).map((line, i) => {
        var curr = i + start + 1;
        return (curr == lineno ? ' >> ' : '    ') + curr + '| ' + line;
      }).join('\n');

      // Alter exception message
      if (typeof err === 'string') err = new Error(err);
      err.path = this.filename;
      err.message = (this.filename + ':' + lineno + '\n' + code + '\n\nMessage: ' + err.message);

      throw err;
    }

    let cur = 0; // current character through file
    let line = 1; // current line through file
    let start = 0; // start character of current chunk
    let state = 'html'; // html, js, scomment, mcomment, squote, dquote
    let source = [];

    // sniff the string from cur for the next chars matching string
    const expect = (string, moveCur = true) => {
      const len = string.length;
      if (text.substring(cur, cur + len) === string) {
        if (moveCur) cur += len;
        return true;
      } else {
        return false;
      }
    }
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
        } else {
          throw 'Tried to append in wrong state: ' + state;
        }
      }
      cur += skip;
      start = cur;
    };
    const nl = () => {
      line++;
      source.push('\n__line++;');
    };

    while (cur < text.length) {
      switch (state) {
        case 'html':
          if (expect('\n')) {
            appendAndSkip();
            nl();
          } else if (expect('<?', false)) {
            appendAndSkip(2);
            state = 'js';
          } else {
            cur++;
          }
        break;
        case 'js':
          if (expect('\n', false)) {
            appendAndSkip(1);
            nl();
          } else if (expect('\\')) {
            cur++; // skip escaped char
          } else if (expect("'")) {
            state = 'squote';
          } else if (expect('"')) {
            state = 'dquote';
          } else if (expect('`')) {
            this.rethrow('Backticks are forbidden in templates', line);
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
          throw 'Unexpected state ' + state;
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

    this.source = source.join('');

    // console.log(this.source);

    let syntaxError = check('(async function () { ' + this.source + ' })();', this.filename);
    if (syntaxError) this.rethrow(syntaxError, syntaxError.line);

    this.source = `let __line = 1; try { ` + this.source + ` } catch (e) { rethrow(e, __line); }`;
  },
  render: async function (context) {
    // setup context scopes for templates
    let argNames = ['rethrow'];
    let args = [this.rethrow];
    for (let key in context) {
      argNames.push(key);
      if (typeof context[key] === 'function') {
        args.push(context[key].bind(context));
      } else {
        args.push(context[key]);
      }
    }

    const fn = new AsyncFunction(argNames.join(', '), this.source);
    await fn.apply({}, args);
  }
};

module.exports = {
  renderFile: async (writeStream, filename, context) => {
    if (!writeStream.on || !writeStream.write) {
      throw new Error('renderFile(writeStream, filename, context): expects first argument to be a writable stream');
    }
    if (await fs.exists(filename) === false) {
      throw new Error('renderFile(writeStream, filename, context): filename does not exist, was given: ' + filename);
    }
    if (typeof context !== 'object') {
      throw new Error('renderFile(writeStream, filename, context): context must be an object, was given: ' + typeof context);
    }

    // setup stream handling
    let streamOpen = true;
    if (!writeStream.__osirisHooked) {
      writeStream.__osirisHooked = true;
      const onClose = () => { streamOpen = false; if (context.onClose) context.onClose.apply(context); };
      writeStream.on('close', onClose); // close is needed for sockets
      writeStream.on('end', onClose); // end is needed for stream buffers
    }

    const print = async (text) => {
      // write directly to stream, return/resolve an empty string
      if (!streamOpen) throw 'closed';

      text = await text;
      text = text.toString();
      if (text.length === 0) return '';

      return new Promise((res, rej) => {
        const resolve = () => res('');

        try {
          if (!writeStream.write(text)) {
            writeStream.once('drain', resolve);
          } else {
            process.nextTick(resolve);
          }
        } catch (e) {
          resolve(); // silence write errors
        }
      });
    };

    // inject print function into context
    context.print = print.bind(context);

    let template = new ojsTemplate(filename)
    try {
      await template.compile();
      await template.render(context);
    } catch (e) {
      // console.log(e.message);
      context.print('<pre>' + e.message.replace(/</g, '&lt;') + '</pre>');
    }
  }
};
