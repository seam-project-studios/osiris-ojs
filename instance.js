const ejs = require('./ejs-promise/ejs');
ejs.delimiter = '?';

const streamBuffers = require('stream-buffers');

const copyScopes = (obj, scopes) => {
  if (!Array.isArray(scopes)) scopes = [scopes];
  for (let copy of scopes) for (let i of Object.keys(copy)) {
    if (obj[i]) continue; // copy but don't overwrite scope to this
    Object.defineProperty(obj, i, Object.getOwnPropertyDescriptor(copy, i));
  }
  return obj;
};

// return a constructor to hold all the variables for a single page render, takes a writableStream
const Instance = function (writeStream) {
  // use memory buffered writeStream if none is provided
  if (!writeStream) writeStream = new streamBuffers.WritableStreamBuffer();

  // our render function, ejs needs a filename, an object representing local scope and some options
  // gives us a callback to hook our pipes and a promise that resolve to the completely rendered template
  const render = (filename, scope = {}) => new Promise((resolve, reject) => {
    copyScopes(this, scope);

    ejs.renderFile(filename, this, { filename, context: {}, }, (err, p) => {
      // p is a promise/writeableStream from ejs layer
      if (err) return reject(err);

      if (!writeStream.getContents) { // patch for streamBuffers, buffer and flush
        p.noBuffer(); // don't hold data in buffers
        p.waitFlush(); // wait for our writeStream to flush before asking for more data from template engine
      }
      p.outputStream.pipe(writeStream, {end: false}); // pipe our output, don't close the stream when finished (we might just be an include in a template)

      resolve(p); // we've resolved, but the actual resolver isn't called until p has resolved (the template has finished rendering)
    });
  });

  this.render = async (filename, ...scopes) => {
    delete this.render; // run once

    // Object.freeze(this);
    let html = await render(filename, scopes);
    writeStream.end(); // we're done

    if (writeStream.getContents) return writeStream.getContents(); // patch for streamBuffers
    return html;
  };

  this.print = (text) => {
    // write directly to stream, return empty string
    return new Promise((res, rej) => writeStream.write(text, () => res('')));
  };

  this.locals = {}; // for passing variables between templates

  // osiris component layer

  // html snippets
  this.snippet = async (filename, args) => {
    // render a snippet
    await render('./src/snippets/' + filename + '.ojs', { args });
    return '';
  };

  // html elements
  this.element = async (filename, args) => {
    // render an element
    await render('./src/elements/' + filename + '.ojs', { args });
    return '';
  };

  // collection points for js and css
  let jsBundle = [];
  this.js = (str) => {
    jsBundle.push(str);
    return '';
  };
  this.bundleJs = () => {
    return jsBundle.join("\n");
  };

  let cssBundle = [];
  this.css = (str) => {
    cssBundle.push(str);
    return '';
  };
  this.bundleCss = () => {
    return cssBundle.join("\n");
  };
};

module.exports = (...args) => new Instance(...args);
