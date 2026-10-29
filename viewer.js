/* ==========================================================================
   Viewer mode
   Turns the editor into a read-only save viewer:
     - editing-only controls and action links are removed from the page
     - every remaining value is shown as plain text
     - save fields are locked and clicks that would change the save are blocked
     - the export UI stays hidden (see viewer.css)
   Importing a save is still allowed.
   ========================================================================== */
(function () {
	"use strict";

	// Clickable things that must keep working in viewer mode.
	var ALLOWED_CLICK = [
		".tab",            // tab navigation
		"#importButton",   // import from textarea
		"#importSaveFile", // import from file (label)
		"#saveFileInput",
		"#selImport",
		"#abbrCheck"
	].join(",");

	var IMPORT_CONTROL_IDS = { importField: true, saveFileInput: true };

	// Controls that are either kept as-is or handled separately.
	var SKIP_MIRROR_IDS = {
		importField: true,
		saveFileInput: true,
		exportField: true,
		upgradeSearch: true,
		achSearch: true,
		abbrCheck: true
	};

	// Checkboxes to remove entirely from view.
	var HIDE_CHECKBOX_IDS = {
		bornAgainCheck: true,
		steamCheck: true
	};

	// Informational .clickme spans: keep the text, remove the click styling.
	var INFO_CLICKME_IDS = {
		warnCookiesSpan: true,
		warnAchievesSpan: true,
		warnWrinklers: true,
		rawCookiesPsExpected: true,
		offVerse: true,
		chipsExpected: true,
		chipsSpentExpected: true,
		chipsExpectedToZero: true,
		prestigeDesiredCookies: true
	};

	// Editing-only blocks and widgets. These are hidden outright.
	var HIDE_SELECTORS = [
		"#exportBlock",
		"#lastSavedLabel",
		"#customizerSettingsBlock",
		"#buffsTypesBlock",
		"#buffsEdit",
		"#gardenToolBlock",
		"#gardenSeedBlock",
		"#gardenSeedAgeBlock",
		"#gardenSelPlotBlock",
		"#gardenSoilBlock",
		"#pantheonAvailableBlock",
		"#auraAvailableBlock",
		".lockCheckSpan",
		".plusminus",
		".formOverlay",
		".productButton",
		".productButtonSpan",
		".marketGoodReroll",
		".buffTypeAdd"
	].join(",");

	function byId(id) {
		return document.getElementById(id);
	}

	function isImportControl(el) {
		return !!(el && el.id && IMPORT_CONTROL_IDS[el.id]);
	}

	function isAllowedClick(el) {
		if (!el) { return false; }
		if (el.id === "abbrCheck") { return true; }
		return !!(el && el.closest && el.closest(ALLOWED_CLICK));
	}

	function isFormControl(el) {
		if (!el || !el.tagName) { return false; }
		var tag = el.tagName;
		return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "BUTTON";
	}

	function isLockedControl(el) {
		if (!isFormControl(el)) { return false; }
		if (isImportControl(el)) { return true; }
		if (el.tagName === "SELECT" || el.tagName === "BUTTON") { return el.disabled; }
		if (el.type === "checkbox" || el.type === "radio" ||
			el.type === "range" || el.type === "file" || el.type === "color") {
			return el.disabled;
		}
		return el.readOnly;
	}

	function isLockedLabel(el) {
		if (!el || !el.closest) { return false; }
		var label = el.closest("label");
		if (!label) { return false; }
		var control = label.control || label.querySelector("input, select, textarea, button");
		return control ? isLockedControl(control) : false;
	}

	function lockControl(el) {
		if (!isFormControl(el) || isImportControl(el)) { return; }
		if (el.id === "abbrCheck") { return; }

		if (el.tagName === "SELECT" || el.tagName === "BUTTON" ||
			el.type === "checkbox" || el.type === "radio" ||
			el.type === "range" || el.type === "file" || el.type === "color") {
			if (!el.disabled) { el.disabled = true; }
		} else if (!el.readOnly) {
			el.readOnly = true;
		}
	}

	function hide(el) {
		if (!el) { return; }
		if (!el.classList.contains("viewer-hidden")) {
			el.classList.add("viewer-hidden");
		}
		el.setAttribute("aria-hidden", "true");
	}

	// Remove the bare text label that precedes a control (e.g. "Search upgrades:").
	// The editor wraps inputs in .formWrap, so start from the wrapper when present.
	function hideLeadingText(el) {
		if (!el) { return; }
		var node = (el.closest && el.closest(".formWrap")) || el;
		var prev = node.previousSibling;
		while (prev) {
			if (prev.nodeType === 3) {
				if (prev.textContent.trim()) {
					prev.textContent = "";
					return;
				}
				prev = prev.previousSibling;
			} else if (prev.nodeType === 1 && prev.tagName === "BR") {
				prev = prev.previousSibling;
			} else {
				return;
			}
		}
	}

	// Clear a dangling "|" separator after a label we hid.
	function hideSiblingSeparator(node) {
		if (!node) { return; }
		var n = node.nextSibling;
		while (n) {
			if (n.nodeType === 3) {
				if (n.textContent.indexOf("|") !== -1) {
					n.textContent = "";
					return;
				}
				n = n.nextSibling;
			} else if (n.nodeType === 1 && n.tagName === "BR") {
				n = n.nextSibling;
			} else {
				return;
			}
		}
	}

	// Turn a display-option button into plain "Name — On/Off" text.
	function convertOption(a) {
		var span = a.__viewerOption;
		if (!span || !span.isConnected) {
			span = document.createElement("span");
			span.className = "viewer-option";
			span.__source = a;
			span.appendChild(document.createTextNode(a.textContent.trim() + " \u2014 "));
			var state = document.createElement("span");
			state.className = "viewer-option-state";
			span.appendChild(state);
			a.parentNode.insertBefore(span, a);
			a.__viewerOption = span;
		}
		var st = span.querySelector(".viewer-option-state");
		if (st) {
			st.textContent = a.classList.contains("off") ? "Off" : "On";
		}
		hide(a);
	}

	function ensureValueMirror(el) {
		if (!el.parentNode) { return null; }
		var m = el.__viewerMirror;
		if (m && m.isConnected && m.parentNode === el.parentNode) { return m; }

		m = document.createElement("span");
		m.className = "viewer-value";
		if (el.tagName === "TEXTAREA") {
			m.className += " viewer-multiline";
		}
		m.__source = el;
		el.__viewerMirror = m;
		el.parentNode.insertBefore(m, el.nextSibling);
		syncMirror(m);
		return m;
	}

	function ensureStateMirror(el) {
		var m = el.__viewerMirror;
		if (m && m.isConnected) { return m; }

		m = document.createElement("span");
		m.className = "viewer-state";
		m.__source = el;
		el.__viewerMirror = m;

		var label = el.closest ? el.closest("label") : null;
		if (label) {
			label.appendChild(m);
		} else if (el.parentNode) {
			el.parentNode.insertBefore(m, el.nextSibling);
		} else {
			return null;
		}
		syncMirror(m);
		return m;
	}

	function syncMirror(m) {
		var el = m.__source;
		if (!el || !el.isConnected) { return; }

		var text;
		if (el.tagName === "SELECT") {
			var opt = el.options[el.selectedIndex];
			text = opt ? (opt.textContent || opt.value) : el.value;
		} else if (el.type === "checkbox") {
			text = el.checked ? "Yes" : "No";
			if (m.parentNode && m.parentNode.tagName === "LABEL") {
				text = " \u2014 " + text;
			}
		} else if (el.type === "radio") {
			text = el.checked ? "On" : "Off";
		} else {
			text = el.value;
			if (text === "" || text === null || typeof text === "undefined") {
				text = el.placeholder || "\u2014";
			}
		}

		if (m.textContent !== text) { m.textContent = text; }
	}

	function syncAll() {
		var mirrors = document.querySelectorAll(".viewer-value, .viewer-state");
		for (var i = 0; i < mirrors.length; i++) {
			syncMirror(mirrors[i]);
		}

		var options = document.querySelectorAll(".viewer-option");
		for (var j = 0; j < options.length; j++) {
			var src = options[j].__source;
			if (!src) { continue; }
			var state = options[j].querySelector(".viewer-option-state");
			if (state) {
				state.textContent = src.classList.contains("off") ? "Off" : "On";
			}
		}
	}

	function apply() {
		var editor = byId("editor");
		if (!editor) { return; }

		document.body.classList.add("viewer-mode");

		// 1. Hide the export UI.
		var exportBlock = byId("exportBlock");
		if (exportBlock) {
			exportBlock.hidden = true;
			exportBlock.setAttribute("aria-hidden", "true");
			if ("inert" in exportBlock) { exportBlock.inert = true; }
		}

		// 2. Hide editing-only blocks and widgets.
		var hidden = editor.querySelectorAll(HIDE_SELECTORS);
		for (var h = 0; h < hidden.length; h++) {
			hide(hidden[h]);
		}

		// 3. Hide the +/− step selector and buff-add options.
		var pm = byId("plusminus1");
		if (pm && pm.closest) {
			hide(pm.closest("span[data-title]") || pm.closest("span"));
		}
		var fools = byId("foolsNameCheck");
		if (fools && fools.closest) {
			var foolsLabel = fools.closest("label");
			hideSiblingSeparator((foolsLabel && foolsLabel.closest(".formWrap")) || foolsLabel);
		}
		["buffsStackable", "buffsSetWrath"].forEach(function (id) {
			var el = byId(id);
			if (el && el.closest) {
				var label = el.closest("label") || el;
				var wrap = label.closest(".formWrap") || label;
				hideSiblingSeparator(wrap);
				hide(label);
				hide(wrap);
			}
		});

		// 4. Hide search boxes together with their text labels.
		["upgradeSearch", "achSearch"].forEach(function (id) {
			var el = byId(id);
			if (el) {
				hideLeadingText(el);
				var wrap = el.closest && el.closest(".formWrap");
				hide(wrap || el);
				hide(el);
			}
		});

		// 5. Convert display-option buttons into static state text.
		var options = editor.querySelectorAll("a.option");
		for (var o = 0; o < options.length; o++) {
			convertOption(options[o]);
		}

		// 6. Remove every other link except tabs and the import controls.
		var links = editor.querySelectorAll("a");
		for (var l = 0; l < links.length; l++) {
			var a = links[l];
			if (a.matches && a.matches(".tab")) { continue; }
			if (a.id === "importButton" || a.id === "importSaveFile" || a.id === "selImport") { continue; }
			if (a.classList.contains("option")) { continue; }
			hide(a);
		}

		// 7. Neutralize informational .clickme spans; hide action ones.
		var clickmes = editor.querySelectorAll(".clickme");
		for (var c = 0; c < clickmes.length; c++) {
			var cm = clickmes[c];
			if (cm.id && INFO_CLICKME_IDS[cm.id]) {
				cm.classList.remove("clickme");
				cm.classList.add("viewer-info");
			} else {
				hide(cm);
			}
		}

		// 8. Lock every control and replace its value with plain text.
		var controls = editor.querySelectorAll("input, select, textarea, button");
		for (var i = 0; i < controls.length; i++) {
			var el = controls[i];
			lockControl(el);

			if (el.type === "checkbox" && HIDE_CHECKBOX_IDS[el.id]) {
				var labelToHide = el.closest("label") || el.parentNode;
				hide(labelToHide);
				hide(el);
				continue;
			}

			if (el.id === "abbrCheck") { continue; }

			if (isImportControl(el) || SKIP_MIRROR_IDS[el.id]) { continue; }

			if (el.tagName === "BUTTON") { hide(el); continue; }
			if (el.type === "file" || el.type === "hidden") { continue; }
			if (el.type === "range") { hide(el); continue; }

			if (el.type === "checkbox" || el.type === "radio") {
				// These two groups are pure editing controls, not save state.
				if (el.name === "plusminusCheck" || el.name === "gardenSeedAge") {
					hide(el);
					continue;
				}
				ensureStateMirror(el);
				hide(el);
				continue;
			}

			if (el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
				ensureValueMirror(el);
				hide(el);
			}
		}

		syncAll();
	}

	var scheduled = false;
	function scheduleApply() {
		if (scheduled) { return; }
		scheduled = true;
		if (window.requestAnimationFrame) {
			window.requestAnimationFrame(function () {
				scheduled = false;
				apply();
			});
		} else {
			window.setTimeout(function () {
				scheduled = false;
				apply();
			}, 16);
		}
	}

	// Block user clicks that could change the save. Programmatic clicks
	// (isTrusted === false) are left alone so the editor keeps working.
	document.addEventListener("click", function (e) {
		if (e.isTrusted === false) { return; }
		var editor = document.getElementById("editor");
		var target = e.target;
		if (!editor || !target || !editor.contains(target)) { return; }
		if (target.id === "abbrCheck") { return; }
		if (isAllowedClick(target) || isLockedControl(target) || isLockedLabel(target)) { return; }

		e.preventDefault();
		e.stopImmediatePropagation();
	}, true);

	// Belt-and-braces: even if the editor briefly re-enables a field, refuse
	// trusted text input outside the import box.
	document.addEventListener("beforeinput", function (e) {
		if (e.isTrusted === false) { return; }
		var target = e.target;
		if (target && isFormControl(target) && !isImportControl(target)) {
			e.preventDefault();
			e.stopImmediatePropagation();
		}
	}, true);

	// Ensure short numbers toggle actually works
	document.addEventListener("change", function (e) {
		if (e.isTrusted === false) { return; }
		var target = e.target;
		if (target && target.id === "abbrCheck") {
			try {
				if (typeof target.clickFunc === "function") {
					target.clickFunc.call(target);
				}
				if (window.Game && typeof Game.scheduleUpdate === "function") {
					Game.scheduleUpdate();
				}
				if (window.Game && typeof Game.updateTooltip === "function") {
					Game.updateTooltip();
				}
				// Rebuild displays
				if (window.$ && typeof $(".exp").each === "function") {
					$(".exp").each(function () { if (Game.setInput) Game.setInput(this); });
				}
			} catch (ex) {}
			scheduleApply();
		}
	}, true);

	// The garden paints plants on mousedown/mouseenter rather than click.
	document.addEventListener("mousedown", function (e) {
		if (e.isTrusted === false) { return; }
		var target = e.target;
		if (target && target.closest && target.closest(".gardenTile")) {
			e.preventDefault();
			e.stopImmediatePropagation();
		}
	}, true);

	var editor = document.getElementById("editor");
	if (editor) {
		editor.addEventListener("submit", function (e) { e.preventDefault(); }, true);

		// Re-apply whenever the editor rebuilds or re-enables anything
		// (e.g. after an import).
		if (window.MutationObserver) {
			new MutationObserver(scheduleApply).observe(editor, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["disabled", "readonly"]
			});
		}
	}

	apply();

	// Keep the plain-text mirrors in sync with the values the editor writes.
	window.setInterval(syncAll, 250);

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", apply);
	}
})();
