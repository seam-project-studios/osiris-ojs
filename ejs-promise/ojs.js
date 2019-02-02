'use strict';

const fs = require('mz/fs');
const _BOM = /^\uFEFF/;
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

const ojsTemplate = function (filename, opts) {
  this.filename = filename;
  this.opts = opts;
  this.source = '';
};

ojsTemplate.prototype = {
  compile: async function () {
    let text = (await fs.readFile(this.filename)).toString().replace(_BOM, '').replace(/\r/g, '').replace(/^\s+|\s+$/gm, '')
    let cur = 0; // current character through file
    let start = 0; // start character of current chunk
    let state = 'html'; // html, js, comment, squote, dquote, backtick
    while (cur < text.length) {
      switch (state) {
        case 'html':
          if (text[cur] === '<' && text[cur+1] === '?') {
            if (start !== cur) this.source += 'await print(' + JSON.stringify(text.substring(start, cur)) + ');\n// --\n';
            state = 'js';
            cur += 2;
            start = cur;
          } else {
            cur++;
          }
        break;
        case 'js':
          if (text[cur] === '\\') {
            cur += 2; // escaped char
          } else if (text[cur] === '?' && text[cur+1] === '>') {
            if (start !== cur) {
              if (text[start] === '=') {
                this.source += 'await print(' + text.substring(start+1, cur-1) + ');\n// --\n';
              } else {
                this.source += text.substring(start, cur) + '\n// --\n';
              }
            }
            state = 'html';
            cur += 2;
            start = cur;
          } else {
            cur++;
          }
        break;
        default:
          cur++;
      }
    }
    switch (state) {
      case 'html':
        if (start !== cur) {
          this.source += 'await print(' + JSON.stringify(text.substring(start, cur)) + ');\n// --\n';
        }
      break;
      case 'js':
        throw new Exception('Unspected end of file, missing closing tag');
      break;
    }
  },
  render: async function (context) {
    let argNames = [];
    let args = [];
    for (let key in context) {
      argNames.push(key);
      if (typeof context[key] === 'function') {
        args.push(context[key].bind(context));
      } else {
        args.push(context[key]);
      }
    }
    console.log('\n// --\n' + this.filename + '\n');
    console.log(this.source);
    const fn = new AsyncFunction(argNames.join(', '), this.source);
    return await fn.apply({}, args);
  }
};

module.exports = {
  renderFile: async (filename, context, opts) => {
    let template = new ojsTemplate(filename, opts);
    await template.compile();
    await template.render(context);
  }
};