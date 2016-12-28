window.KeyboardUtils = {
  // TODO(philc): keyNames should just be the inverse of this map.
  keyCodes: {
    backspace: 8,
    tab: 9,
    ctrlEnter: 10,
    enter: 13,
    shiftKey: 16,
    ctrlKey: 17,
    esc: 27,
    space: 32,
    pageUp: 33,
    pageDown: 34,
    end: 35,
    home: 36,
    leftArrow: 37,
    upArrow: 38,
    rightArrow: 39,
    downArrow: 40,
    deleteKey: 46,
    f1: 112,
    f12: 123
  },

  keyNames:
    { [8]: "backspace", [37]: "left", [38]: "up", [39]: "right", [40]: "down", [27]: "esc" },

  // This is a mapping of the incorrect keyIdentifiers generated by Webkit on Windows during keydown events to
  // the correct identifiers, which are correctly generated on Mac. We require this mapping to properly handle
  // these keys on Windows. See https://bugs.webkit.org/show_bug.cgi?id=19906 for more details.
  keyIdentifierCorrectionMap: {
    "U+00C0": ["U+0060", "U+007E"], // `~
    "U+00BD": ["U+002D", "U+005F"], // -_
    "U+00BB": ["U+003D", "U+002B"], // =+
    "U+00DB": ["U+005B", "U+007B"], // [{
    "U+00DD": ["U+005D", "U+007D"], // ]}
    "U+00DC": ["U+005C", "U+007C"], // \|
    "U+00BA": ["U+003B", "U+003A"], // ;:
    "U+00DE": ["U+0027", "U+0022"], // '"
    "U+00BC": ["U+002C", "U+003C"], // ,<
    "U+00BE": ["U+002E", "U+003E"], // .>
    "U+00BF": ["U+002F", "U+003F"] // /?
  },

  // Returns the string "<A-f>" if F is pressed.
  getKeyString(event) {
    let keyString = event.keyCode in this.keyNames ?
                  this.keyNames[event.keyCode]
                : event.key.length === 1 ?
                  event.key
                : event.key.length === 2 && "F1" <= event.key && event.key <= "F9" ?
                  event.key.toLowerCase() // F1 to F9.
                : event.key.length === 3 && "F10" <= event.key && event.key <= "F12" ?
                  event.key.toLowerCase() // F10 to F12.
                :
                  "";

    // Ignore modifiers by themselves.
    if (keyString === "") { return; }
    const modifiers = [];

    if (event.shiftKey) {
      keyString = keyString.toUpperCase();
    }
    if (event.metaKey) {
      modifiers.push("M");
    }
    if (event.ctrlKey) {
      modifiers.push("C");
    }
    if (event.altKey) {
      modifiers.push("A");
    }

    for (let mod of Array.from(modifiers)) {
      keyString = mod + "-" + keyString;
    }

    if (modifiers.length > 0) { keyString = `<${keyString}>`; }
    return keyString;
  },

  createSimulatedKeyEvent(el, type, keyCode, keyIdentifier) {
    // How to do this in Chrome: http://stackoverflow.com/q/10455626/46237
    const event = document.createEvent("KeyboardEvent");
    Object.defineProperty(event, "keyCode", {get() { return this.keyCodeVal; }});
    Object.defineProperty(event, "which", {get() { return this.keyCodeVal; }});
    Object.defineProperty(event, "keyIdentifier", {get() { return keyIdentifier; }});
    event.initKeyboardEvent(type, true, true, document.defaultView, false, false, false, false, keyCode, 0);
    event.keyCodeVal = keyCode;
    event.keyIdentifier = keyIdentifier;
    return event;
  },

  simulateKeypress(el, keyCode, keyIdentifier) {
    // console.log ">>>> simulating keypress on:", el, keyCode, keyIdentifier
    el.dispatchEvent(this.createSimulatedKeyEvent(el, "keydown", keyCode, keyIdentifier));
    el.dispatchEvent(this.createSimulatedKeyEvent(el, "keypress", keyCode, keyIdentifier));
    return el.dispatchEvent(this.createSimulatedKeyEvent(el, "keyup", keyCode, keyIdentifier));
  },

  simulateClick(el, x, y) {
    let event;
    if (x == null) { x = 0; }
    if (y == null) { y = 0; }
    const eventSequence = ["mouseover", "mousedown", "mouseup", "click"];
    return Array.from(eventSequence).map((eventName) =>
      (event = document.createEvent("MouseEvents"),
      // eventName, bubbles, cancelable, view, event-detail, screenX, screenY, clientX, clientY, ctrl, alt,
      // shift, meta, button, relatedTarget
      event.initMouseEvent(eventName, true, true, window, 1, x, y, x, y, false, false, false, false, 0, null),
      el.dispatchEvent(event)));
  }
};
