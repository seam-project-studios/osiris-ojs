// test frameworks
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

// utility
const fs = require('mz/fs'); // async fs
const streamBuffers = require('stream-buffers'); // this will hold our template output instead of writing it to a file

// what we're testing
const ojs = require('../ojs');

describe('OJS print tests', () => {
  describe('render html-only.ojs', () => {
    let output, context, result, testFile = './test/templates/html-only.ojs';

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {};
      await ojs.renderFile(output, testFile, context);
      result = output.getContentsAsString('utf8');
    });

    it('Should add print() to context', () => {
      expect(context.print).to.be.a('function');
    });

    it('Should equal html-only.ojs', async () => {
      let original = (await fs.readFile(testFile)).toString();
      expect(result).to.equal(original);
    });
  });

  describe('render print-tag.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {};
      await ojs.renderFile(output, './test/templates/print-tag.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should output "test"', () => {
      expect(result).to.equal('test');
    });
  });

  describe('render print-func.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {};
      await ojs.renderFile(output, './test/templates/print-func.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should output "test"', () => {
      expect(result).to.equal('test');
    });
  });

  describe('render context-var.ojs', () => {
    let output, context, result, getter;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { myValue: '' };
      getter = () => 'test';
      sinon.stub(context, 'myValue').get(getter);
      await ojs.renderFile(output, './test/templates/context-var.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should output "test"', () => {
      expect(result).to.equal('test');
    });
    it('Should call getter once', () => {
      expect(getter.calledOnce);
    });
  });

  describe('render context-func.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        myFunction: sinon.fake.returns('test')
      };
      await ojs.renderFile(output, './test/templates/context-func.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should output "test"', () => {
      expect(result).to.equal('test');
    });
    it('Should call myFunction once and on context', () => {
      expect(context.myFunction.calledOnce);
      expect(context.myFunction.calledOn(context));
    });
  });

  describe('render context-func.ojs (async)', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        myFunction: sinon.fake.resolves('test')
      };
      await ojs.renderFile(output, './test/templates/context-func.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should output "test"', () => {
      expect(result).to.equal('test');
    });
    it('Should call myFunction once and on context', () => {
      expect(context.myFunction.calledOnce);
      expect(context.myFunction.calledOn(context));
    });
  });

  describe('render context-func.ojs (connection terminated)', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = {
        myFunction: () => {
          output.end();
        },
        onClose: sinon.fake()
      };
      await ojs.renderFile(output, './test/templates/context-func.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should output nothing', () => {
      // result === false, https://github.com/samcday/node-stream-buffer/issues/33
      expect(output.size() === 0).to.be.true;
    });

    it('Should call onClose once and on context', () => {
      expect(context.onClose.calledOnce);
      expect(context.onClose.calledOn(context));
    });
  });

  describe('render print-squote.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
      await ojs.renderFile(output, './test/templates/print-squote.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should output "<??>"', () => {
      expect(result).to.equal('<??>');
    });
  });

  describe('render print-dquote.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
      await ojs.renderFile(output, './test/templates/print-dquote.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should output "<??>"', () => {
      expect(result).to.equal('<??>');
    });
  });

  describe('render print-backtick.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
      await ojs.renderFile(output, './test/templates/print-backtick.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should output ' + JSON.stringify('\ntest123\n'), () => {
      expect(result).to.equal('\ntest123\n');
    });
  });

  describe('render print-complex-quote.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
      await ojs.renderFile(output, './test/templates/print-complex-quote.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should output ' + JSON.stringify(`'"test"'`), () => {
      expect(result).to.equal(`'"test"'`);
    });
  });

  describe('render print-state-switch.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
      await ojs.renderFile(output, './test/templates/print-state-switch.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should should preserve line breaks in html', () => {
      expect(result).to.have.string('\n1) html-to-js\n\n2)');
    });
    it('Should should understand quotes and escaped chars', () => {
      expect(result).to.have.string('2) js escaped "print\n\n3)');
    });
    it('Should should print with comments and semicolons', () => {
      expect(result).to.have.string('3) await print semi comment\n4)');
    });
    it('Should should print without comments and semicolons', () => {
      expect(result).to.have.string('4) await print\n5)');
    });
    it('Should should print tag with comments and semicolons', () => {
      expect(result).to.have.string('5) tag print semi comment\n6)');
    });
    it('Should should print tag without semicolons with comments', () => {
      expect(result).to.have.string('6) tag print comment\n7)');
    });
  });

  describe('render print-json.ojs', () => {
    let output, context, result;

    beforeEach(async () => {
      output = new streamBuffers.WritableStreamBuffer();
      context = { };
      await ojs.renderFile(output, './test/templates/print-json.ojs', context);
      result = output.getContentsAsString('utf8');
    });

    it('Should output ' + JSON.stringify({"test":"test123"}), () => {
      expect(result).to.equal(JSON.stringify({"test":"test123"}));
    });
  });
});
