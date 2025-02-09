import {Layout, isLayoutSizeDefined} from '#core/dom/layout';

import {registerElement} from '#service/custom-element-registry';

import {buildDom} from './build-dom';

import {BaseElement} from '../../base-element';

export class AmpLayout extends BaseElement {
  /** @override @nocollapse */
  static prerenderAllowed() {
    return true;
  }

  /** @override */
  isLayoutSupported(layout) {
    return layout == Layout.CONTAINER || isLayoutSizeDefined(layout);
  }

  /** @override */
  buildCallback() {
    buildDom(this.element);
  }
}

/**
 * @param {!Window} win Destination window for the new element.
 */
export function installLayout(win) {
  registerElement(win, 'amp-layout', AmpLayout);
}
