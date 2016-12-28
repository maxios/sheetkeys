window.SheetActions = {
  menuItems: {
    copy: "Copy",
    deleteRow: "Delete row",
    deleteValues: "Delete values",
    rowAbove: "Row above",
    rowBelow: "Row below",
    // The "moveRowUp" menu item won't yet exist if multiple rows are selected.
    moveRowUp: "Move row up",
    moveRowDown: "Move row down",
    moveRowsUp: "Move rows up",
    moveRowsDown: "Move rows down",
    moveColumnLeft: "Move column left",
    moveColumnRight: "Move column right",
    moveColumnsLeft: "Move columns left",
    moveColumnsRight: "Move columns right",
    paste: "Paste",
    undo: "Undo",
    redo: "Redo",
    fullScreen: "Full screen"
  },

  buttons: {
    center: ["Horizontal align", "Center"],
    clip: ["Text wrapping", "Clip"],
    left: ["Horizontal align", "Left"],
    right: ["Horizontal align", "Right"],
    overflow: ["Text wrapping", "Overflow"],
    wrap: ["Text wrapping", "Wrap"]
  },

  // You can find the names of these color swatches by hoverig over the swatches and seeing the tooltip.
  colors: {
    white: "white",
    lightYellow3: "light yellow 3",
    lightCornflowBlue3: "light cornflower blue 3",
    lightPurple3: "light purple 3",
    lightRed3: "light red 3",
    lightGray2: "light gray 2"
  },

  // A mapping of button-caption to DOM element.
  menuItemElements: {},

  clickToolbarButton(captionList) {
    // Sometimes a toolbar button won't exist in the DOM until its parent has been clicked, so we click all of
    // its parents in sequence.
    for (let caption of Array.from(captionList)) {
      const el = document.querySelector(`*[aria-label='${caption}']`);
      if (!el) {
        console.log(`Couldn't find the element for the button labeled ${caption} in ${captionList}`);
        return;
      }
      KeyboardUtils.simulateClick(el);
    }
  },

  // Returns the DOM element of the menu item with the given caption. Prints a warning if a menu item isn't
  // found (since this is a common source of errors in SheetKeys) unless silenceWarning = true.
  getMenuItem(caption, silenceWarning) {
    if (silenceWarning == null) { silenceWarning = false; }
    let item = this.menuItemElements[caption];
    if (item) { return item; }
    item = this.findMenuItem(caption);
    if (!item) {
      if (!silenceWarning) { console.log(`Warning: could not find menu item with caption ${caption}`); }
      return null;
    }
    return this.menuItemElements[caption] = item;
  },

  findMenuItem(caption) {
    const menuItems = document.querySelectorAll(".goog-menuitem");
    for (let menuItem of Array.from(menuItems)) {
      const label = menuItem.innerText;
      if (label && label.indexOf(caption) === 0) {
        return menuItem;
      }
    }
    return null;
  },

  // Returns the color palette button corresponding to the given color name.
  // type: either "font" or "cell", depending on which color you want to change.
  getColorButton(color, type) {
    const selector = `*[aria-label='${color}']`;
    let buttons = document.querySelectorAll(selector);
    // The divs for a color can disappear from the DOM. To reactivate them, click on the color palettes button.
    if (buttons.length === 0) {
      const paletteButton = document.querySelector("*[aria-label='Fill color']");
      KeyboardUtils.simulateClick(paletteButton);
      KeyboardUtils.simulateClick(paletteButton); // Click twice to show and then hide the pallete popup.
    }
    buttons = document.querySelectorAll(selector);
    if (buttons.length <= 0) { console.log("Error: unable to find element:", selector); }

    // There are 3 color palettes in the document. The first one is for fonts, the second for cell background
    // colors. The third is for an undiscovered use.
    switch (type) {
      case "font": return buttons[0];
      case "cell": return buttons[1];
    }
  },

  changeFontColor(color) { return KeyboardUtils.simulateClick(this.getColorButton(color, "font")); },
  changeCellColor(color) { return KeyboardUtils.simulateClick(this.getColorButton(color, "cell")); },

  clickMenu(itemCaption) { return KeyboardUtils.simulateClick(this.getMenuItem(itemCaption)); },

  deleteRows() {
     this.clickMenu(this.menuItems.deleteRow);
     // Clear any row-level selections we might've had.
     return this.unselectRow();
   },
  preserveSelectedColumn() { return this.previousColumnLeft = this.selectedCellCoords().left; },

  restoreSelectedColumn() {
    const left = this.previousColumnLeft;
    const { top } = this.selectedCellCoords();
    const el = document.elementFromPoint(left, top);
    return KeyboardUtils.simulateClick(el, left, top);
  },

  selectedCellCoords() {
    const box = document.querySelector(".active-cell-border").getBoundingClientRect();
    // Offset this box by > 0 so we don't select the borders around the selected cell.
    // NOTE(philc): I've chosen 5 here instead of 1 because > 1 is required when the document is zoomed.
    const margin = 5;
    return {top: box.top + margin, left: box.left + margin};
  },

  selectRow() {
    // Sheets allows you to type Shift+Space to select a row, but its behavior is buggy:
    // 1. Sometimes it doesn't select the whole row, so you need to type it twice.
    // 2. In some sheets, moving a row after selecting a row with shift+space deterministically causes columns
    //    to swap!

    // xOffset is 15px from the left edge of the cell border because we don't to mistakenly click on the
    // "unhide" arrow icon which is present when spreadsheet rows are hidden.
    const xOffset = 15;
    // yOffset is set to 10 because empirically it correctly selects the row even when the page is zoomed.
    const yOffset = 10;
    const y = this.selectedCellCoords().top + yOffset;
    const rowMarginEl = document.elementFromPoint(xOffset, y);
    return KeyboardUtils.simulateClick(rowMarginEl, xOffset, y);
  },

  selectColumn() {
    // Sheets allows you to type Alt+Space to select a column. Similar to `selectRow`, using that shortcut
    // has issues, so here we click on the appropriate column.
    const activeCellLeft = document.querySelector(".active-cell-border").getBoundingClientRect().left;
    const c = 25;
    // The column header is at the top of the grid portion of the UI (the waffle container).
    const gridTop = document.getElementById("waffle-grid-container").getBoundingClientRect().top;
    const colMarginEl = document.elementFromPoint(activeCellLeft + c, gridTop);
    return KeyboardUtils.simulateClick(colMarginEl, activeCellLeft + c, gridTop + 1); // +1 was chosen here empirically
  },

  unselectRow() {
    const oldY = this.cellCursorY();
    // Typing any arrow key will unselect the current selection.
    UI.typeKey(KeyboardUtils.keyCodes.downArrow);
    // If the cursor moved after we typed our arrow key, undo this selection change.
    if (oldY !== this.cellCursorY()) {
      return UI.typeKey(KeyboardUtils.keyCodes.upArrow);
    }
  },

  cellCursorY() {
    // This is an approximate estimation of where the cell cursor is relative to the upper left corner of the
    // sptreasheet canvas.
    return document.querySelector(".autofill-cover").getBoundingClientRect().top;
  },

  //
  // Movement
  //
  moveUp() { return UI.typeKey(KeyboardUtils.keyCodes.upArrow); },
  moveDown() { return UI.typeKey(KeyboardUtils.keyCodes.downArrow); },
  moveLeft() { return UI.typeKey(KeyboardUtils.keyCodes.leftArrow); },
  moveRight() { return UI.typeKey(KeyboardUtils.keyCodes.rightArrow); },

  moveDownAndSelect() { return UI.typeKey(KeyboardUtils.keyCodes.downArrow, {shift: true}); },
  moveUpAndSelect() { return UI.typeKey(KeyboardUtils.keyCodes.upArrow, {shift: true}); },
  moveLeftAndSelect() { return UI.typeKey(KeyboardUtils.keyCodes.leftArrow, {shift: true}); },
  moveRightAndSelect() { return UI.typeKey(KeyboardUtils.keyCodes.rightArrow, {shift: true}); },

  //
  // Row movement
  //
  moveRowsUp() {
    // In normal mode, where we have just a single cell selected, restore the column after moving the row.
    if (UI.mode === "normal") { this.preserveSelectedColumn(); }
    this.selectRow();
    if (this.getMenuItem(this.menuItems.moveRowUp, true)) {
      this.clickMenu(this.menuItems.moveRowUp);
    } else {
      this.clickMenu(this.menuItems.moveRowsUp);
    }
    if (UI.mode === "normal") {
      SheetActions.unselectRow();
      return this.restoreSelectedColumn();
    }
  },

  moveRowsDown() {
    if (UI.mode === "normal") { this.preserveSelectedColumn(); }
    this.selectRow();
    if (this.getMenuItem(this.menuItems.moveRowDown, true)) {
      this.clickMenu(this.menuItems.moveRowDown);
    } else {
      this.clickMenu(this.menuItems.moveRowsDown);
    }

    if (UI.mode === "normal") {
      SheetActions.unselectRow();
      return this.restoreSelectedColumn();
    }
  },

  moveColumnsLeft() {
    this.selectColumn();
    if (this.getMenuItem(this.menuItems.moveColumnLeft, true)) {
      return this.clickMenu(this.menuItems.moveColumnLeft);
    } else {
      return this.clickMenu(this.menuItems.moveColumnsLeft);
    }
  },

  moveColumnsRight() {
    this.selectColumn();
    if (this.getMenuItem(this.menuItems.moveColumnRight, true)) {
      return this.clickMenu(this.menuItems.moveColumnRight);
    } else {
      return this.clickMenu(this.menuItems.moveColumnsRight);
    }
  },

  //
  // Editing
  //
  undo() { return this.clickMenu(this.menuItems.undo); },
  redo() { return this.clickMenu(this.menuItems.redo); },

  clear() { return this.clickMenu(this.menuItems.deleteValues); },

  // Creates a row below and begins editing it.
  openRowBelow() {
    this.clickMenu(this.menuItems.rowBelow);
    return UI.typeKey(KeyboardUtils.keyCodes.enter);
  },

  openRowAbove() {
    this.clickMenu(this.menuItems.rowAbove);
    return UI.typeKey(KeyboardUtils.keyCodes.enter);
  },

  // Like openRowBelow, but does not enter insert mode.
  insertRowBelow() { return this.clickMenu(this.menuItems.rowBelow); },
  insertRowAbove() { return this.clickMenu(this.menuItems.rowAbove); },

  changeCell() {
    this.clear();
    return UI.typeKey(KeyboardUtils.keyCodes.enter);
  },

  // Put the cursor at the beginning of the cell.
  editCell() {
    UI.typeKey(KeyboardUtils.keyCodes.enter);
    // Note that just typing the "home" key here doesn't work, for unknown reasons.
    return this.moveCursorToCellStart();
  },

  editCellAppend() {
    // Note that appending to the cell's contents is the default behavior of the Enter key in Sheets.
    return UI.typeKey(KeyboardUtils.keyCodes.enter);
  },

  moveCursorToCellStart() {
    // http://stackoverflow.com/q/6249095/46237
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    range.setStart(range.startContainer, 0);
    range.collapse(true);
    selection.removeAllRanges();
    return selection.addRange(range);
  },

  moveCursorToCellLineEnd() {
    return UI.typeKey(KeyboardUtils.keyCodes.end);
  },

  commitCellChanges() {
    UI.typeKey(KeyboardUtils.keyCodes.enter);
    // Enter in Sheets moves your cursor to the cell below the one you're currently editing. Avoid that.
    return UI.typeKey(KeyboardUtils.keyCodes.upArrow);
  },

  copyRow() {
    this.selectRow();
    this.clickMenu(this.menuItems.copy);
    return this.unselectRow();
  },

  copy() {
    this.clickMenu(this.menuItems.copy);
    return this.unselectRow();
  },

  paste() {
    this.clickMenu(this.menuItems.paste);
    return this.unselectRow();
  },

  //
  // Scrolling
  //

  // In px. Measured on a mac with Chrome's zoom level at 100%.
  rowHeight() { return 17; },

  // The approximate number of visible rows. It's probably possible to compute this precisely.
  visibleRowCount() {
     return Math.ceil(document.querySelector(".grid-scrollable-wrapper").offsetHeight / this.rowHeight());
   },

  // NOTE(philc): It would be nice to improve these scrolling commands. They're somewhat slow and imprecise.
  scrollHalfPageDown() {
    return __range__(0, (Math.floor(this.visibleRowCount() / 2)), true).map((_) =>
      UI.typeKey(KeyboardUtils.keyCodes.downArrow));
  },

  scrollHalfPageUp() {
    return __range__(0, (Math.floor(this.visibleRowCount() / 2)), true).map((_) =>
      UI.typeKey(KeyboardUtils.keyCodes.upArrow));
  },

  scrollToTop() {
    // TODO(philc): This may not work on Linux or Windows since it uses the meta key. Replace with CTRL on
    // those platforms?
    return UI.typeKey(KeyboardUtils.keyCodes.home, {meta: true});
  },

  scrollToBottom() {
    return UI.typeKey(KeyboardUtils.keyCodes.end, {meta: true});
  },

  //
  // Tabs
  //
  getTabEls() { return document.querySelectorAll(".docs-sheet-tab"); },
  getActiveTabIndex() {
    const iterable = this.getTabEls();
    for (let i = 0; i < iterable.length; i++) {
      const tab = iterable[i];
      if (tab.classList.contains("docs-sheet-active-tab")) { return i; }
    }
    return null;
  },

  moveTabRight() { return this.clickTabButton("Move right"); },
  moveTabLeft() { return this.clickTabButton("Move left"); },

  prevTab() {
    const tabs = this.getTabEls();
    const prev = this.getActiveTabIndex() - 1;
    if (prev < 0) { return; }
    return KeyboardUtils.simulateClick(tabs[prev]);
  },

  nextTab() {
    const tabs = this.getTabEls();
    const next = this.getActiveTabIndex() + 1;
    if (next >= tabs.length) { return; }
    return KeyboardUtils.simulateClick(tabs[next]);
  },

  clickTabButton(buttonCaption) {
    const menu = document.querySelector(".docs-sheet-tab-menu");
    // This tab menu element gets created the first time the user clicks on it, so it may not yet be available
    // in the DOM.
    if (!menu) { this.activateTabMenu(); }
    const menuItems = document.querySelectorAll(".docs-sheet-tab-menu .goog-menuitem");
    let result = null;
    for (let item of Array.from(menuItems)) {
      if (item.innerText.indexOf(buttonCaption) === 0) {
        result = item;
        break;
      }
    }
    if (!result) {
      console.log(`Couldn't find a tab menu item with the caption ${buttonCaption}`);
      return;
    }
    return KeyboardUtils.simulateClick(result);
  },

  // Shows and then hides the tab menu for the currently selected tab.
  // This has the side effect of forcing Sheets to create the menu DOM element if it hasn't yet been created.
  activateTabMenu() {
    const menuButton = document.querySelector(".docs-sheet-active-tab .docs-icon-arrow-dropdown");
    // Show and then hide the tab menu.
    KeyboardUtils.simulateClick(menuButton);
    return KeyboardUtils.simulateClick(menuButton);
  },

  //
  // Formatting
  //

  // NOTE(philc): I couldn't reliably detect the selected font size for the current cell, and so I couldn't
  // implement increaes font / decrease font commands.
  getFontSizeMenu() { return this.getMenuItem("6").parentNode; },
  activateFontSizeMenu() {
     KeyboardUtils.simulateClick(this.getMenuItem("Font size"));
     // It's been shown; hide it again.
     return this.getFontSizeMenu().style.display = "none";
   },

  setFontSize10() {
    this.activateFontSizeMenu();
    return KeyboardUtils.simulateClick(this.getMenuItem("10"));
  },

  setFontSize8() {
    this.activateFontSizeMenu();
    return KeyboardUtils.simulateClick(this.getMenuItem("8"));
  },

  wrap() { return this.clickToolbarButton(this.buttons.wrap); },
  overflow() { return this.clickToolbarButton(this.buttons.overflow); },
  clip() { return this.clickToolbarButton(this.buttons.clip); },
  alignLeft() { return this.clickToolbarButton(this.buttons.left); },
  alignCenter() { return this.clickToolbarButton(this.buttons.center); },
  alignRight() { return this.clickToolbarButton(this.buttons.right); },
  colorCellWhite() { return this.changeCellColor(this.colors.white); },
  colorCellLightYellow3() { return this.changeCellColor(this.colors.lightYellow3); },
  colorCellLightCornflowerBlue3() { return this.changeCellColor(this.colors.lightCornflowBlue3); },
  colorCellLightPurple() { return this.changeCellColor(this.colors.lightPurple3); },
  colorCellLightRed3() { return this.changeCellColor(this.colors.lightRed3); },
  colorCellLightGray2() { return this.changeCellColor(this.colors.lightGray2); },

  //
  // Misc
  //

  toggleFullScreen() {
    this.clickMenu(this.menuItems.fullScreen);
    // After entering full-screen mode, immediately dismiss the notification the Google Docs shows.
    // Note that the DOM element is only available a second after toggling fullscreen.
    return setTimeout((() => this.dismissFullScreenNotificationMessage()), 250);
  },

  dismissFullScreenNotificationMessage() {
    const dismissButton = document.querySelector("#docs-butterbar-container .docs-butterbar-link");
    // Ensure we don't accidentally find and click on another HUD notification which is not for dismissing
    // the full screen notification.
    if (dismissButton && dismissButton.innerText === "Dismiss") {
      return KeyboardUtils.simulateClick(dismissButton);
    }
  },

  // Returns the value of the current cell.
  getCellValue() { return document.querySelector("#t-formula-bar-input-container").textContent; },

  // Opens a new tab using the current cell's value as the URL.
  openCellAsUrl() {
    let url = this.getCellValue().trim();
    // Some cells can contain a HYPERLINK("url", "caption") value. If so, assume that's the URL we want to open
    const match = url.match(/HYPERLINK\("(.+?),.+?"\)/);
    if (match) { url = match[1]; }
    return window.open(url, "_blank");
  }
};

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}