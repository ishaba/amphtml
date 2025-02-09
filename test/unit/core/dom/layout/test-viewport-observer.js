import {
  createViewportObserver,
  observeIntersections,
  observeWithSharedInOb,
  unobserveWithSharedInOb,
} from '#core/dom/layout/viewport-observer';

describes.sandboxed('DOM - layout - Viewport Observer', {}, (env) => {
  describe('createViewportObserver', () => {
    let win;
    let ctorSpy;
    const noop = () => {};

    beforeEach(() => {
      ctorSpy = env.sandbox.stub();
      win = {
        parent: null,
        document: {},
        IntersectionObserver: ctorSpy,
      };
    });

    it('Uses implicit root.', () => {
      createViewportObserver(noop, win);
      expect(ctorSpy).calledWith(noop, {threshold: undefined, root: undefined});
    });

    it('Pass along threshold argument', () => {
      createViewportObserver(noop, win, {threshold: 0.5});
      expect(ctorSpy).calledWith(noop, {threshold: 0.5, root: undefined});
    });

    it('Sets document root appropriately', () => {
      // Implicit root when not iframed.
      createViewportObserver(noop, win, {needsRootBounds: true});
      expect(ctorSpy).calledWith(noop, {threshold: undefined, root: undefined});

      // Document root when iframed.
      win.parent = {};
      createViewportObserver(noop, win, {needsRootBounds: true});
      expect(ctorSpy).calledWith(noop, {
        threshold: undefined,
        root: win.document,
      });
    });
  });

  describe('Shared viewport observer', () => {
    let inOb;
    let win;
    let doc;
    let el1;
    let el2;
    let tracked;

    beforeEach(() => {
      inOb = env.sandbox.stub();
      tracked = new Set();
      inOb.callsFake(() => ({
        observe: (el) => tracked.add(el),
        unobserve: (el) => tracked.delete(el),
      }));

      win = {IntersectionObserver: inOb};
      doc = {defaultView: win};
      el1 = {ownerDocument: doc};
      el2 = {ownerDocument: doc};
    });

    /**
     * Simulate an IntersectionObserver callback for an element.
     * @param {!Element} el
     * @param {boolean} inViewport
     */
    function toggleViewport(el, inViewport) {
      const win = el.ownerDocument.defaultView;
      // Grabs the IO Callback shared by all the viewport observers.
      const ioCallback = win.IntersectionObserver.getCall(0).args[0];
      ioCallback([{target: el, isIntersecting: inViewport}]);
    }

    it('observed element should have its callback fired each time it enters/exist the viewport.', () => {
      const viewportEvents = [];
      observeWithSharedInOb(el1, (inViewport) =>
        viewportEvents.push(inViewport)
      );
      toggleViewport(el1, true);
      toggleViewport(el1, false);

      expect(viewportEvents).eql([true, false]);
    });

    it('can independently observe multiple elements', () => {
      const el1Events = [];
      const el2Events = [];

      observeWithSharedInOb(el1, (inViewport) => el1Events.push(inViewport));
      observeWithSharedInOb(el2, (inViewport) => el2Events.push(inViewport));
      toggleViewport(el1, false);
      toggleViewport(el2, true);
      toggleViewport(el1, true);

      expect(el1Events).to.eql([false, true]);
      expect(el2Events).to.eql([true]);
    });

    it('once unobserved, the callback is no longer fired', () => {
      const el1Events = [];

      observeWithSharedInOb(el1, (inViewport) => el1Events.push(inViewport));
      toggleViewport(el1, false);

      unobserveWithSharedInOb(el1);
      toggleViewport(el1, true);
      toggleViewport(el1, false);

      expect(el1Events).to.eql([false]);
    });

    it('A quick observe and unobserve pair should not cause an error or fire the callback', () => {
      const spy = env.sandbox.spy();
      observeWithSharedInOb(el1, spy);
      unobserveWithSharedInOb(el1);
      toggleViewport(el1, true);

      expect(spy).not.called;
    });

    it('can have multiple obsevers for the same element', () => {
      let elInObEntries = [];

      observeIntersections(el1, (entry) => elInObEntries.push(entry));
      observeIntersections(el1, (entry) => elInObEntries.push(entry));
      toggleViewport(el1, true);

      expect(elInObEntries).to.have.lengthOf(2);
      expect(elInObEntries[0].target).to.eql(el1);
      expect(elInObEntries[0].isIntersecting).to.be.true;
      expect(elInObEntries[1].target).to.eql(el1);
      expect(elInObEntries[1].isIntersecting).to.be.true;

      elInObEntries = [];
      toggleViewport(el1, false);
      expect(elInObEntries).to.have.lengthOf(2);
      expect(elInObEntries[0].isIntersecting).to.be.false;
      expect(elInObEntries[1].isIntersecting).to.be.false;
    });
  });
});
