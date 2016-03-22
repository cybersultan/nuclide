'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {Observable} from 'rx';
import type {OutlineForUi} from '..';

import {React, ReactDOM} from 'react-for-atom';
import invariant from 'assert';

import {track} from '../../nuclide-analytics';
import {PanelComponent} from '../../nuclide-ui/lib/PanelComponent';
import {OutlineView} from './OutlineView';

export class OutlineViewPanelState {
  _outlines: Observable<OutlineForUi>;
  _outlineViewPanel: ?OutlineViewPanel;
  _width: number;

  constructor(outlines: Observable<OutlineForUi>, width: number, visible: boolean) {
    this._outlines = outlines;
    this._outlineViewPanel = null;
    this._width = width;

    if (visible) {
      this._show();
    }
  }

  dispose(): void {
    if (this.isVisible()) {
      this._destroyPanel();
    }
  }

  toggle(): void {
    if (this.isVisible()) {
      this._hide();
    } else {
      this._show();
    }
  }

  show(): void {
    if (!this.isVisible()) {
      this._show();
    }
  }

  hide(): void {
    if (this.isVisible()) {
      this._hide();
    }
  }

  getWidth(): number {
    return this._width;
  }

  isVisible(): boolean {
    return this._outlineViewPanel != null;
  }

  _show(): void {
    invariant(this._outlineViewPanel == null);

    track('nuclide-outline-view-show');

    this._outlineViewPanel = new OutlineViewPanel(
      this._outlines,
      this._width,
      this._onResize.bind(this),
    );
  }

  _hide(): void {
    this._destroyPanel();
  }

  _destroyPanel(): void {
    const outlineViewPanel = this._outlineViewPanel;
    invariant(outlineViewPanel != null);

    outlineViewPanel.dispose();
    this._outlineViewPanel = null;
  }

  _onResize(newWidth: number): void {
    this._width = newWidth;
  }
}

class OutlineViewPanel {
  _panelDOMElement: HTMLElement;
  _panel: atom$Panel;

  constructor(
    outlines: Observable<OutlineForUi>,
    initialWidth: number,
    onResize: (width: number) => void,
  ) {
    this._panelDOMElement = document.createElement('div');
    // Otherwise it does not fill the whole panel, which might be alright except it means that the
    // resize-handle doesn't extend all the way to the bottom.
    this._panelDOMElement.style.height = '100%';

    ReactDOM.render(
      <div style={{height: '100%'}}>
        <OutlineViewHeader />
        <PanelComponent
          dock="right"
          initialLength={initialWidth}
          onResize={onResize}>
          <OutlineView outlines={outlines} />
        </PanelComponent>
      </div>,
      this._panelDOMElement,
    );
    this._panel = atom.workspace.addRightPanel({
      item: this._panelDOMElement,
      priority: 200,
    });
  }

  dispose(): void {
    ReactDOM.unmountComponentAtNode(this._panelDOMElement);
    this._panel.destroy();
  }
}

class OutlineViewHeader extends React.Component {
  render(): React.Element {
    return (
      <div className="panel-heading">
        <span className="icon icon-list-unordered" />
        Outline View
        <button
          className="pull-right btn icon icon-x nuclide-outline-view-close-button"
          onClick={hideOutlineView}
        />
      </div>
    );
  }
}

function hideOutlineView() {
  atom.commands.dispatch(
    atom.views.getView(atom.workspace),
    'nuclide-outline-view:hide'
  );
}
