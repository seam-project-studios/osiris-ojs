// exports a function that runs the build process
// will run build process if called directly

const buildFolder = './build/';
const templateFolder = './src/pages/';

const fs = require('mz/fs'); // modernizer fs uses promises instead of callbacks

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
  const osiris = require('./osiris'); // renderer
  const ojsi18n = await require('./i18n')();

  osiris.use({
    customFunc: () => 'custom answer'
  });

  try { // make if not exists
    await fs.mkdir(buildFolder);
  } catch (err) {
    // exists?
    if (err.code !== 'EEXIST') throw err;
  }

  // delete previous build
  await recurseFs(buildFolder,
    (file) => fs.unlink(file),
    false, // prefolder
    (folder) => fs.rmdir(folder) // post folder
  );

  console.log(ojsi18n.locales.length + ' locales detected:' + ojsi18n.locales.join(', '));

  // break up the file name to insert the locale
  const makePath = (path, locale) => {
    const doti = path.lastIndexOf('.');
    let name = path;
    let ext = '';
    if (doti !== -1) {
      name = path.substr(0,doti);
      ext = path.substr(doti+1);
    }
    return name + '-' + locale + (ext ? '.' + ext : '');
  };

  // run build
  await recurseFs(templateFolder,
    async (file) => {
      // for each file in the templates folder
      const filename = file.substr(templateFolder.length);

      const bar = new ProgressBar('[:bar] :filename - :task', { total: ojsi18n.locales.length + 2, width: 40 });

      // extract file name information "name.ext"
      const doti = filename.lastIndexOf('.');
      const ext = filename.substr(doti+1);
      const name = filename.substr(0,doti);

      bar.tick(1, {filename, task:'preparing to write'});
      if (ext.toLowerCase() === 'ojs') {
        // run the renderer, feeding the data into our files writeStream

        for (let locale of ojsi18n.locales) {
          const buildFilename = buildFolder + makePath(name, locale);
          bar.tick(1, {filename, task:'building ' + buildFilename});

          // a file for our template engine, open something for it to write to
          let writeFile = fs.createWriteStream(buildFilename);

          await osiris.render(writeFile, file, {
            i18n: ojsi18n.locale(locale),
            // expose a global link function for 118n support
            link: (path) => makePath(path == '/' ? '/index' : path, locale), // link to same locale
            linkLocale: (newLocale) => '/' + makePath(name, newLocale), // link to different locale
          });
        }
        bar.tick(1, {filename, task:'built: ' + ojsi18n.locales.join(', ')});
      } else {
        // basic file copy from template to build
        bar.tick(ojsi18n.locales.length, {filename, task:'copying file'});
        await fs.copyFile(file, buildFolder + filename);
        bar.tick(1, {filename, task:'copied'});
      }
    }, async (folder) => {
      // 'before' the folder is iterated for files, mkdir a copy in build
      const foldername = folder.substr(templateFolder.length);

      const bar = new ProgressBar('[:bar] :foldername - :task', { total: 2, width: 40 });
      bar.tick(1, {foldername, task:'creating folder'});
      await fs.mkdir(buildFolder + foldername);
      bar.tick(1, {foldername, task:'created'});
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
