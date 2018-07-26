// exports a function that runs the build process
// will run build process if called directly

const buildFolder = './build/';
const templateFolder = './template/';

const fs = require('mz/fs'); // modernizer fs uses promises instead of callbacks

const Instance = require('./instance'); // ejs renderer constructor

// fancy progress bars
const ProgressBar = require('progress');

// recurse down a file system tree running a callback for each file and folder
const recurseFs = async (root, file, beforeFolder, afterFolder) => {
  let d = await fs.readdir(root);
  for (let f of d) {
    let stat = await fs.stat(root + f);
    if (stat.isDirectory(root + f)) {
      if (beforeFolder) await beforeFolder(root + f + '/');
      await recurseFs(root + f + '/', file, beforeFolder, afterFolder);
      if (afterFolder) await afterFolder(root + f + '/');
    }
    if (stat.isFile(root + f)) {
      if (file) await file(root + f);
    }
  }
};

const main = async () => {
  try { // make if not exists
    await fs.mkdir(buildFolder);
  } catch (err) {
    // exists?
    if (err.code !== 'EEXIST') throw err;
  }

  // delete previous build
  await recurseFs(buildFolder,
    async (file) => {
      await fs.unlink(file);
    }, false, async (folder) => {
      await fs.rmdir(folder);
    }
  );

  // run build
  await recurseFs(templateFolder,
    async (file) => {
      // for each file in the templates folder
      const filename = file.substr(templateFolder.length);
      const bar = new ProgressBar('[:bar] :filename - :task', { total: 4, width: 40 });

      // extract file name information "name.ext"
      const doti = filename.lastIndexOf('.');
      const ext = filename.substr(doti+1);
      const name = filename.substr(0,doti);

      bar.tick(1, {filename, task:'Preparing to write'});
      if (ext.toLowerCase() === 'ejs') {
        if ('streamy way') {
          // a file for our template engine, open something for it to write to
          let writeFile = fs.createWriteStream(buildFolder + name); // no file extension

          // set up template scope
          bar.tick(1, {filename, task:'Initiating renderer'});
          const instance = new Instance(writeFile);

          // run the renderer, feeding the data into our files writeStream
          bar.tick(1, {filename, task:'Rendering'});
          await instance.render(file, {
            get: () => 'what?'
          });
        } else if ('returny way') {
          // set up template scope
          bar.tick(2, {filename, task:'Rendering'});
          await fs.writeFile(
            buildFolder + name,
            await new Instance().render(file, {
              get: () => 'what?'
            })
          );
        }

      } else {
        // basic file copy from template to build
        bar.tick(2, {filename, task:'Copying file'});
        await fs.copyFile(file, buildFolder + filename);
      }
      bar.tick(1, {filename, task:'Done'});

    }, async (folder) => {
      // 'before' the folder is iterated for files, mkdir a copy in build
      const foldername = folder.substr(templateFolder.length);

      const bar = new ProgressBar('[:bar] :foldername - :task', { total: 2, width: 40 });
      bar.tick(1, {foldername, task:'Creating folder'});
      await fs.mkdir(buildFolder + foldername);
      bar.tick(1, {foldername, task:'Done'});
    }
  );
};

module.exports = main;

if (require.main === module) {
  // run directly
  main();

  process.on('unhandledRejection', error => {
    console.log('unhandledRejection', error);
  });
}
