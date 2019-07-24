const { CMSPage, CMSField } = require('../../osiris-cms');

module.exports = new CMSPage({
  heading: 'Generic stuff',
  description: '',
  fields: [
    new CMSField({
      file: 'test',
      path: 'welcome',
      element: 'input',
      args: {
        label: 'Welcome',
        type: 'text',
        title: 'Enter some text',
        required: true,
      }
    }),
  ],
});
