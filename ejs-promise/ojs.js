'use strict';

const fs = require('mz/fs');
const check = require('syntax-error');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

const ojsTemplate = function (filename, opts) {
  this.filename = filename;
  this.opts = opts;
  this.source = '';
};

ojsTemplate.prototype = {
  compile: async function () {
    let text = (await fs.readFile(this.filename)).toString().replace(/^\uFEFF/, '').replace(/\r/g, '').replace(/^\s+|\s+$/gm, '')
    let lines = text.split('\n');

    this.rethrow = (err, lineno) => {
      let start = Math.max(lineno - 3, 0);
      let end = Math.min(lines.length, lineno + 3);

      // Error context
      let code = lines.slice(start, end).map((line, i) => {
        var curr = i + start + 1;
        return (curr == lineno ? ' >> ' : '    ') + curr + '| ' + line;
      }).join('\n');

      // Alter exception message
      if (typeof err === 'string') err = new Error(err);
      err.path = this.filename;
      err.message = '<pre>' + (this.filename + ':' + lineno + '\n' + code + '\n\nMessage: ' + err.message).replace(/</g, '&lt;') + '</pre>';

      throw err;
    }

    let cur = 0; // current character through file
    let start = 0; // start character of current chunk
    let state = 'html'; // html, js, scomment, mcomment, squote, dquote, backtick
    while (cur < text.length) {
      if (text[cur] == '\n') this.source += ';__line++;\n'; // increment line counter
      switch (state) {
        case 'html':
          if (text[cur] === '<' && text[cur+1] === '?') {
            if (start !== cur) this.source += 'await print(' + JSON.stringify(text.substring(start, cur)) + ');';
            state = 'js';
            cur += 2;
            start = cur;
          } else {
            cur++;
          }
        break;
        case 'js':
          if (text[cur] === '\\') {
            cur += 2; // escaped char, move forward
          } else if (text[cur] === "'") {
            state = 'squote';
            cur++;
          } else if (text[cur] === '"') {
            state = 'dquote';
            cur++;
          } else if (text[cur] === '`') {
            state = 'backtick';
            cur++;
          } else if (text[cur] === '/' && text[cur+1] === '*') {
            state = 'mcomment';
            cur+=2;
          } else if (text[cur] === '/' && text[cur+1] === '/') {
            state = 'scomment';
            if (start !== cur) {
              if (text[start] === '=') {
                this.source += 'await print(' + text.substring(start+1, cur-1) + ');';
              } else {
                this.source += text.substring(start, cur) + ';';
              }
            }
            cur += 2;
          } else if (text[cur] === '?' && text[cur+1] === '>') {
            state = 'html';
            if (start !== cur) {
              if (text[start] === '=') {
                this.source += 'await print(' + text.substring(start+1, cur-1) + ');';
              } else {
                this.source += text.substring(start, cur) + ';';
              }
            }
            cur += 2;
            if (text[cur+1] === '\n') cur++;
            start = cur;
          } else {
            cur++;
          }
        break;
        case 'squote':
          if (text[cur] === '\\') {
            cur += 2; // escaped char, move forward
          } else if (text[cur] === "'") {
            state = 'js';
            cur++;
          } else {
            cur++;
          }
        break;
        case 'dquote':
          if (text[cur] === '\\') {
            cur += 2; // escaped char, move forward
          } else if (text[cur] === '"') {
            state = 'js';
            cur++;
          } else {
            cur++;
          }
        break;
        case 'backtick':
          if (text[cur] === '\\') {
            cur += 2; // escaped char, move forward
          } else if (text[cur] === '`') {
            state = 'js';
            cur++;
          } else {
            cur++;
          }
        break;
        case 'mcomment':
          if (text[cur] === '*' && text[cur+1] === '/') {
            state = 'js';
            cur+=2;
          } else {
            cur++;
          }
        break;
        case 'scomment':
          if (text[cur] === '\n') {
            state = 'js';
            cur++;
            start = cur;
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
        if (start !== cur) {
          this.source += 'await print(' + JSON.stringify(text.substring(start, cur)) + ');';
        }
      break;
      case 'js':
      case 'squote':
      case 'dquote':
      case 'backtick':
      case 'mcomment':
        this.rethrow('Unexpected end of file, missing closing ?> tag');
      break;
    }

    let syntaxError = check('(async function () { ' + this.source + ' ;})();', this.filename);
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
  renderFile: async (writeStream, filename, context, opts) => {
    // setup stream handling
    let streamOpen = true;
    if (!writeStream.__osirisHooked) {
      writeStream.__osirisHooked = true;
      writeStream.on('close', () => { streamOpen = false; context.onClose.apply(context); });
    }

    const print = async (text) => {
      // write directly to stream, return/resolve an empty string
      if (!streamOpen) throw 'closed';

      text = await text;
      text = text.toString();
      if (text.length === 0) return '';

      return new Promise((res, rej) => {
        const resolve = () => res('');

        if (!writeStream.write(text)) {
          writeStream.once('drain', resolve);
        } else {
          process.nextTick(resolve);
        }
      });
    };

    // inject print function into context
    context.print = print.bind(context);

    let template = new ojsTemplate(filename, opts);
    try {
      await template.compile();
      await template.render(context);
    } catch (e) {
      context.print(e.message);
    }
  }
};