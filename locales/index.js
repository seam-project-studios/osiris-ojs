const localesFolder = './locales/';

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

let data = {};
let state = 'init';
let loadedPromises = [];

const addNode = (path, ext) => {
  let ref = data;
  let chunks = path.split('/');
  let filename = chunks.pop();

  for (let chunk of chunks) {
    if (!ref[chunk]) ref[chunk] = {};
    ref = ref[chunk];
  }
  if (ext === 'js') {
    ref[filename] = () => asyncRequire(path);
  } else if (ext === 'json') {
    ref[filename] = async () => JSON.parse(await fs.readFile(localesFolder + path+'.'+ext));
  }
};

module.exports = new Promise(async (res, rej) => {
  if (state === 'init') {
    state = 'loading'; // one loading 'thread' only please

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

    state = 'ready';
    loadedPromises.map(res => res(data));
    loadedPromises = [];
  }
  if (state === 'loading') {
    loadedPromises.push(res);
    return; // nothing more we can do here
  }
  if (state == 'ready') {
    res(data);
  }
});