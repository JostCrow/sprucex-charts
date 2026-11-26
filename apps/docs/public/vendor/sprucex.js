(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __moduleCache = /* @__PURE__ */ new WeakMap;
  var __toCommonJS = (from) => {
    var entry = __moduleCache.get(from), desc;
    if (entry)
      return entry;
    entry = __defProp({}, "__esModule", { value: true });
    if (from && typeof from === "object" || typeof from === "function")
      __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
        get: () => from[key],
        enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      }));
    __moduleCache.set(from, entry);
    return entry;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: (newValue) => all[name] = () => newValue
      });
  };

  // src/index.js
  var exports_src = {};
  __export(exports_src, {
    unmountElement: () => unmountElement,
    toRaw: () => toRaw,
    stop: () => stop,
    shallow: () => shallow,
    registerDirective: () => registerDirective,
    mountElement: () => mountElement,
    markRaw: () => markRaw,
    initSpruceX: () => initSpruceX,
    getDirective: () => getDirective,
    effect: () => effect,
    default: () => src_default,
    createSortableIntegration: () => createSortableIntegration,
    createNativeSortableAdapter: () => createNativeSortableAdapter,
    createGridStackIntegration: () => createGridStackIntegration,
    computed: () => computed,
    SpruceX: () => SpruceX
  });

  // src/integrations/sortable.js
  var sortableOwners = new WeakMap;
  function createSortableIntegration({ adapter } = {}) {
    const scopes = new Map;
    const owner = {};
    const containers = new Set;
    let pendingFocus = null;
    let moving = false;
    const config = (binding) => binding.component.evaluateExpressionOrLiteral(binding.el.getAttribute("sx-sortable"));
    const owned = (binding, el) => el?.closest("[sx-sortable]") === binding.el && el.closest("[sx-data]") === binding.component.root;
    const rows = (binding) => Array.from(binding.el.children).filter((el) => el.hasAttribute("sx-sortable-item"));
    const ids = (cfg) => cfg.items.map((item) => String(item[cfg.id || "id"]));
    function valid(cfg) {
      return cfg && Array.isArray(cfg.items) && typeof cfg.containerId === "string" && cfg.containerId.length > 0 && cfg.items.every((item) => item != null && ["string", "number"].includes(typeof item[cfg.id || "id"])) && new Set(ids(cfg)).size === cfg.items.length;
    }
    function findContainer(id) {
      const matches = [...containers].filter((b) => b.el.isConnected && config(b)?.containerId === id);
      return matches.length === 1 ? matches[0] : null;
    }
    function move(source, itemId, toContainerId, newIndex, input = "api") {
      if (moving || !containers.has(source) || !source.el.isConnected || !["api", "keyboard", "pointer"].includes(input))
        return false;
      const target = findContainer(toContainerId);
      const from = config(source), to = target && config(target);
      if (!valid(from) || !valid(to) || from.disabled || to.disabled || findContainer(from.containerId) !== source)
        return false;
      const same = source === target;
      if (!same && (!from.group || from.group !== to.group || from.items === to.items))
        return false;
      const oldIndex = ids(from).indexOf(String(itemId));
      if (oldIndex < 0 || !Number.isInteger(newIndex) || newIndex < 0 || newIndex > to.items.length - (same ? 1 : 0) || same && newIndex === oldIndex || !same && ids(to).includes(String(itemId)))
        return false;
      if (!same && String(from.items[oldIndex][to.id || "id"]) !== String(itemId))
        return false;
      const fromIds = JSON.stringify(ids(from)), toIds = JSON.stringify(ids(to));
      const detail = Object.freeze({
        itemId: String(itemId),
        oldIndex,
        newIndex,
        fromContainerId: from.containerId,
        toContainerId: to.containerId,
        input
      });
      const EventClass = source.el.ownerDocument.defaultView.CustomEvent;
      moving = true;
      try {
        if (!source.el.dispatchEvent(new EventClass("sprucex:sortable:before", { detail, bubbles: true, cancelable: true })))
          return false;
        const currentFrom = config(source), currentTo = config(target);
        if (!containers.has(source) || !containers.has(target) || !target.el.isConnected || !valid(currentFrom) || !valid(currentTo) || currentFrom.items !== from.items || currentTo.items !== to.items || findContainer(from.containerId) !== source || findContainer(to.containerId) !== target || currentFrom.disabled || currentTo.disabled || !same && (!currentFrom.group || currentFrom.group !== currentTo.group) || JSON.stringify(ids(currentFrom)) !== fromIds || JSON.stringify(ids(currentTo)) !== toIds)
          return false;
        const active = source.el.ownerDocument.activeElement;
        const row = active?.closest("[sx-sortable-item]");
        const controls = row ? [...row.querySelectorAll("[sx-sortable-handle], [sx-sortable-move]")] : [];
        const controlIndex = controls.indexOf(active);
        if (owned(source, active) && row?.getAttribute("sx-sortable-item") === String(itemId) && controlIndex >= 0) {
          pendingFocus = { target, itemId: String(itemId), controlIndex };
        }
        const [item] = from.items.splice(oldIndex, 1);
        to.items.splice(newIndex, 0, item);
        source.component.scheduleUpdate();
        target.component.scheduleUpdate();
        target.status.textContent = `Moved ${itemId} to position ${newIndex + 1} of ${to.items.length} in ${to.containerId}.`;
        source.el.dispatchEvent(new EventClass("sprucex:sortable:change", { detail, bubbles: true }));
        return true;
      } finally {
        moving = false;
      }
    }
    function dispose(binding) {
      if (!containers.delete(binding))
        return;
      sortableOwners.delete(binding.el);
      binding.el.removeEventListener("click", binding.click);
      binding.el.removeEventListener("keydown", binding.keydown);
      try {
        binding.adapter?.destroy();
      } finally {
        binding.status.remove();
      }
      if (pendingFocus?.target === binding)
        pendingFocus = null;
    }
    return {
      preserveOnSwap: true,
      unmount(component, el) {
        const bindings = scopes.get(component);
        const binding = bindings?.get(el);
        if (binding) {
          dispose(binding);
          bindings.delete(el);
          if (!bindings.size)
            scopes.delete(component);
        }
      },
      scan(component, el) {
        if (!el.hasAttribute("sx-sortable"))
          return;
        const previous = sortableOwners.get(el);
        if (previous && previous.owner !== owner)
          previous.dispose();
        let bindings = scopes.get(component);
        if (!bindings)
          scopes.set(component, bindings = new Map);
        if (bindings.has(el))
          return;
        const status = el.ownerDocument.createElement("span");
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        status.style.cssText = "position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
        el.append(status);
        const binding = { component, el, status };
        function control(event, keyboard) {
          const button = event.target.closest?.(keyboard ? "[sx-sortable-handle]" : "[sx-sortable-move]");
          if (!button || !owned(binding, button) || button.disabled || button.getAttribute("aria-disabled") === "true")
            return;
          const row = button.closest("[sx-sortable-item]");
          if (!row || row.parentElement !== el)
            return;
          let direction = button.getAttribute("sx-sortable-move");
          if (keyboard) {
            if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !["ArrowUp", "ArrowDown"].includes(event.key))
              return;
            direction = event.key === "ArrowUp" ? "up" : "down";
          }
          const cfg = config(binding);
          if (!valid(cfg))
            return;
          const itemId = row.getAttribute("sx-sortable-item");
          const index = ids(cfg).indexOf(itemId);
          const destination = button.getAttribute("sx-sortable-to") || cfg.containerId;
          const target = findContainer(destination);
          const targetConfig = target && config(target);
          const next = destination !== cfg.containerId && valid(targetConfig) ? targetConfig.items.length : direction === "up" ? index - 1 : direction === "down" ? index + 1 : -1;
          event.preventDefault();
          move(binding, itemId, destination, next, keyboard ? "keyboard" : event.detail === 0 ? "keyboard" : "pointer");
        }
        binding.click = (event) => control(event, false);
        binding.keydown = (event) => control(event, true);
        bindings.set(el, binding);
        containers.add(binding);
        sortableOwners.set(el, { owner, dispose() {
          dispose(binding);
          bindings.delete(el);
          if (!bindings.size)
            scopes.delete(component);
        } });
        el.addEventListener("click", binding.click);
        el.addEventListener("keydown", binding.keydown);
        try {
          binding.adapter = adapter?.({
            el,
            items: () => rows(binding).filter((row) => owned(binding, row)),
            containerId: () => config(binding)?.containerId,
            move: (itemId, destination, index, input) => move(binding, itemId, destination, index, input)
          });
        } catch (error) {
          bindings.delete(el);
          dispose(binding);
          throw error;
        }
      },
      update(component) {
        const bindings = scopes.get(component);
        bindings?.forEach((binding, el) => {
          if (!el.isConnected || !el.hasAttribute("sx-sortable") || el.closest("[sx-data]") !== component.root) {
            dispose(binding);
            bindings.delete(el);
            return;
          }
          if (!binding.status.isConnected || binding.status.parentElement !== el) {
            el.append(binding.status);
          }
          binding.adapter?.update?.();
          if (pendingFocus?.target === binding) {
            const row = rows(binding).find((row2) => row2.getAttribute("sx-sortable-item") === pendingFocus.itemId);
            const control = row?.querySelectorAll("[sx-sortable-handle], [sx-sortable-move]")[pendingFocus.controlIndex];
            if (control) {
              control.focus({ preventScroll: true });
              pendingFocus = null;
            }
          }
        });
      },
      teardown(component) {
        scopes.get(component)?.forEach(dispose);
        scopes.delete(component);
      }
    };
  }
  function createNativeSortableAdapter() {
    let drag = null;
    return (context) => {
      const originals = new Map;
      const handles = () => context.items().flatMap((row) => [...row.querySelectorAll("[sx-sortable-handle]")]).filter((el) => el.closest("[sx-sortable]") === context.el && el.closest("[sx-data]") === context.el.closest("[sx-data]"));
      function update() {
        for (const el of handles()) {
          if (!originals.has(el))
            originals.set(el, el.getAttribute("draggable"));
          el.setAttribute("draggable", "true");
        }
        for (const [el, value] of originals) {
          if (!context.el.contains(el)) {
            restore(el, value);
            originals.delete(el);
          }
        }
      }
      function restore(el, value) {
        if (value === null)
          el.removeAttribute("draggable");
        else
          el.setAttribute("draggable", value);
      }
      function start(event) {
        const handle = event.target.closest?.("[sx-sortable-handle]");
        if (!handles().includes(handle) || handle.disabled || handle.getAttribute("aria-disabled") === "true")
          return;
        drag = { context, itemId: handle.closest("[sx-sortable-item]").getAttribute("sx-sortable-item") };
        event.dataTransfer?.setData("text/plain", drag.itemId);
        if (event.dataTransfer)
          event.dataTransfer.effectAllowed = "move";
      }
      const ownsTarget = (event) => event.target.closest("[sx-sortable]") === context.el && event.target.closest("[sx-data]") === context.el.closest("[sx-data]");
      function over(event) {
        if (drag && ownsTarget(event))
          event.preventDefault();
      }
      function drop(event) {
        if (!drag || !ownsTarget(event))
          return;
        event.preventDefault();
        const row = event.target.closest("[sx-sortable-item]");
        const items = context.items();
        let index = row && items.includes(row) ? items.indexOf(row) : items.length;
        if (drag.context === context)
          index = Math.min(index, items.length - 1);
        const source = drag;
        drag = null;
        source.context.move(source.itemId, context.containerId(), index, "pointer");
      }
      function end() {
        drag = null;
      }
      const listeners = { dragstart: start, dragover: over, drop, dragend: end };
      Object.entries(listeners).forEach(([name, fn]) => context.el.addEventListener(name, fn));
      update();
      return { update, destroy() {
        if (drag?.context === context)
          drag = null;
        Object.entries(listeners).forEach(([name, fn]) => context.el.removeEventListener(name, fn));
        originals.forEach((value, el) => restore(el, value));
        originals.clear();
      } };
    };
  }

  // src/constants.js
  var ATTR_DATA = "sx-data";
  var ATTR_TEXT = "sx-text";
  var ATTR_HTML = "sx-html";
  var ATTR_SHOW = "sx-show";
  var ATTR_IF = "sx-if";
  var ATTR_CLOAK = "sx-cloak";
  var ATTR_BIND_PREFIX = "sx-bind:";
  var ATTR_ON_PREFIX = "sx-on:";
  var ATTR_MODEL = "sx-model";
  var ATTR_MODEL_PREFIX = "sx-model.";
  var ATTR_CLASS = "sx-class";
  var ATTR_STYLE = "sx-style";
  var ATTR_TOGGLE = "sx-toggle";
  var ATTR_INIT = "sx-init";
  var ATTR_EFFECT = "sx-effect";
  var ATTR_ERROR_FALLBACK = "sx-error-fallback";
  var ATTR_FOR = "sx-for";
  var ATTR_MEMO = "sx-memo";
  var ATTR_PAGE = "sx-page";
  var ATTR_PAGE_IGNORE = "sx-page-ignore";
  var ATTR_PAGE_TRANSITION = "sx-page-transition";
  var ATTR_BOOST = "sx-boost";
  var ATTR_BOOST_ON = "sx-boost-on";
  var NET_METHODS = ["get", "post", "put", "patch", "delete"];
  var ATTR_TRIGGER = "sx-trigger";
  var ATTR_TRIGGER_DEBOUNCE = "sx-trigger-debounce";
  var ATTR_TARGET = "sx-target";
  var ATTR_SWAP = "sx-swap";
  var ATTR_SELECT = "sx-select";
  var ATTR_PUSH_URL = "sx-push-url";
  var ATTR_REPLACE_URL = "sx-replace-url";
  var ATTR_VARS = "sx-vars";
  var ATTR_PARAMS = "sx-params";
  var ATTR_JSON_INTO = "sx-json-into";
  var ATTR_JSON_INTO_SHALLOW = "sx-json-into.shallow";
  var ATTR_OPTIMISTIC = "sx-optimistic";
  var ATTR_REVERT_ON_ERROR = "sx-revert-on-error";
  var ATTR_POLL = "sx-poll";
  var ATTR_POLL_WHILE = "sx-poll-while";
  var ATTR_POLL_BACKGROUND = "sx-poll-background";
  var ATTR_INCLUDE = "sx-include";
  var ATTR_BODY = "sx-body";
  var ATTR_BODY_TYPE = "sx-body-type";
  var ATTR_HEADERS = "sx-headers";
  var ATTR_LOADING_INTO = "sx-loading-into";
  var ATTR_ERROR_INTO = "sx-error-into";
  var ATTR_DISABLE_WHILE_REQUEST = "sx-disable-while-request";
  var ATTR_TEXT_WHILE_REQUEST = "sx-text-while-request";
  var ATTR_CONFIRM = "sx-confirm";
  var ATTR_CANCEL_PREVIOUS = "sx-cancel-previous";
  var ATTR_GRIDSTACK = "sx-gridstack";
  var ATTR_GRIDSTACK_OPTIONS = "sx-gridstack-options";
  var ATTR_GRIDSTACK_OPTION_PREFIX = "sx-gridstack-option:";
  var ATTR_GRIDSTACK_ON_CHANGE = "sx-gridstack-on-change";
  var ATTR_GRIDSTACK_ON_ADDED = "sx-gridstack-on-added";
  var ATTR_GRIDSTACK_ON_REMOVED = "sx-gridstack-on-removed";
  var ATTR_GRIDSTACK_ON_DRAGSTOP = "sx-gridstack-on-dragstop";
  var ATTR_GRIDSTACK_ON_RESIZESTOP = "sx-gridstack-on-resizestop";
  var ATTR_LAZY = "sx-lazy";
  var ATTR_LOCAL = "sx-local";
  var ATTR_ANIMATE = "sx-animate";
  var DEFAULT_CSRF_COOKIE_NAME = "csrftoken";
  var DEFAULT_CSRF_HEADER_NAME = "X-CSRFToken";
  var DELEGATED_EVENTS = new Set([
    "click",
    "dblclick",
    "mousedown",
    "mouseup",
    "input",
    "change",
    "submit",
    "keydown",
    "keyup",
    "keypress",
    "focusin",
    "focusout"
  ]);

  // src/utils/helpers.js
  var classCheckCache = new WeakMap;
  var walk = (el, cb) => {
    if (cb(el) === false)
      return;
    let child = el.firstElementChild;
    while (child) {
      const next = child.nextElementSibling;
      walk(child, cb);
      child = next;
    }
  };
  function isClass(fn) {
    if (typeof fn !== "function")
      return false;
    let cached = classCheckCache.get(fn);
    if (cached !== undefined)
      return cached;
    cached = /^class\s/.test(Function.prototype.toString.call(fn));
    classCheckCache.set(fn, cached);
    return cached;
  }
  function isPlainObjectOrArray(value) {
    if (value === null || typeof value !== "object")
      return false;
    if (Array.isArray(value))
      return true;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }
  function parseForExpression(expr) {
    const inMatch = expr.match(/^\s*(.*?)\s+(in|of)\s+(.*)\s*$/);
    if (!inMatch)
      return null;
    const left = inMatch[1].trim();
    const iterable = inMatch[3].trim();
    if (left.startsWith("(")) {
      const inner = left.slice(1, -1);
      const [item, index] = inner.split(",").map((s) => s.trim());
      return { item, index, iterable };
    }
    return { item: left, index: null, iterable };
  }
  function cloneChildren(template) {
    const frag = document.createDocumentFragment();
    let child = template.firstChild;
    while (child) {
      frag.appendChild(child.cloneNode(true));
      child = child.nextSibling;
    }
    return frag;
  }

  // src/reactivity/index.js
  var ITERATE_KEY = Symbol("sprucex.iterate");
  var rawMarked = new WeakSet;
  var shallowMarked = new WeakSet;
  var proxyToRaw = new WeakMap;
  var targetDepsMap = new WeakMap;
  var effectStack = [];
  var activeEffect = null;
  var ARRAY_ITERATING_METHODS = new Set([
    "map",
    "filter",
    "forEach",
    "reduce",
    "reduceRight",
    "some",
    "every",
    "find",
    "findIndex",
    "findLast",
    "findLastIndex",
    "includes",
    "indexOf",
    "lastIndexOf",
    "join",
    "slice",
    "concat",
    "flat",
    "flatMap",
    "entries",
    "keys",
    "values",
    "toSorted",
    "toReversed",
    "toSpliced",
    "at"
  ]);
  function markRaw(value) {
    if (value !== null && (typeof value === "object" || typeof value === "function")) {
      rawMarked.add(value);
    }
    return value;
  }
  function shallow(value) {
    if (value !== null && typeof value === "object") {
      shallowMarked.add(value);
    }
    return value;
  }
  function toRaw(value) {
    let current = value;
    while (current !== null && typeof current === "object" && proxyToRaw.has(current)) {
      current = proxyToRaw.get(current);
    }
    return current;
  }
  function cleanupEffect(eff) {
    const { deps } = eff;
    if (!deps.length)
      return;
    for (let i = 0;i < deps.length; i++) {
      deps[i].delete(eff);
    }
    deps.length = 0;
  }
  function track(target, key) {
    if (!activeEffect || !activeEffect.active)
      return;
    let depsMap = targetDepsMap.get(target);
    if (!depsMap) {
      depsMap = new Map;
      targetDepsMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
      dep = new Set;
      depsMap.set(key, dep);
    }
    if (!dep.has(activeEffect)) {
      dep.add(activeEffect);
      activeEffect.deps.push(dep);
    }
  }
  function trigger(target, key) {
    const depsMap = targetDepsMap.get(target);
    if (!depsMap)
      return;
    const effectsToRun = new Set;
    const add = (dep) => {
      if (!dep)
        return;
      dep.forEach((eff) => {
        if (eff !== activeEffect && eff.active) {
          effectsToRun.add(eff);
        }
      });
    };
    if (key !== undefined) {
      add(depsMap.get(key));
    }
    if (key === ITERATE_KEY || Array.isArray(target)) {
      add(depsMap.get(ITERATE_KEY));
    }
    effectsToRun.forEach((eff) => {
      if (eff.scheduler) {
        eff.scheduler(eff);
      } else {
        eff.run();
      }
    });
  }
  function effect(fn, options = {}) {
    const eff = {
      fn,
      deps: [],
      active: true,
      scheduler: options.scheduler || null,
      run() {
        if (!eff.active)
          return fn();
        cleanupEffect(eff);
        effectStack.push(eff);
        activeEffect = eff;
        try {
          return fn();
        } finally {
          effectStack.pop();
          activeEffect = effectStack[effectStack.length - 1] || null;
        }
      },
      stop() {
        if (!eff.active)
          return;
        cleanupEffect(eff);
        eff.active = false;
      }
    };
    const runner = () => eff.run();
    runner.effect = eff;
    runner.stop = () => eff.stop();
    if (!options.lazy) {
      eff.run();
    }
    return runner;
  }
  function stop(runner) {
    if (runner && typeof runner.stop === "function") {
      runner.stop();
    }
  }
  function computed(getter) {
    let dirty = true;
    let value;
    let hasDeps = false;
    const ref = { __sprucex_computed: true };
    const runner = effect(getter, {
      lazy: true,
      scheduler() {
        if (!dirty) {
          dirty = true;
          trigger(ref, "value");
        }
      }
    });
    return {
      get value() {
        track(ref, "value");
        if (dirty || !hasDeps) {
          value = runner();
          hasDeps = runner.effect.deps.length > 0;
          dirty = false;
        }
        return value;
      },
      stop() {
        runner.stop();
      }
    };
  }
  function createDeepReactiveProxy(obj, onChange, cache = new WeakMap, computedGetters = null) {
    if (obj === null || typeof obj !== "object")
      return obj;
    if (rawMarked.has(obj) || !isPlainObjectOrArray(obj))
      return obj;
    if (cache.has(obj))
      return cache.get(obj);
    const isShallow = shallowMarked.has(obj);
    const proxy = new Proxy(obj, {
      get(target, key, receiver) {
        if (computedGetters && computedGetters.has(key)) {
          return computedGetters.get(key).value;
        }
        if (activeEffect) {
          if (Array.isArray(target) && (key === Symbol.iterator || ARRAY_ITERATING_METHODS.has(key))) {
            track(target, ITERATE_KEY);
            track(target, "length");
          } else if (typeof key !== "symbol" || key === Symbol.iterator) {
            track(target, key);
          }
        }
        const value = Reflect.get(target, key, receiver);
        if (value !== null && typeof value === "object") {
          const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
          if (descriptor && !descriptor.configurable && "value" in descriptor && !descriptor.writable) {
            return value;
          }
          if (isShallow || rawMarked.has(value) || !isPlainObjectOrArray(value)) {
            return value;
          }
          return createDeepReactiveProxy(value, onChange, cache);
        }
        if (typeof value === "function" && !isClass(value)) {
          return value.bind(receiver);
        }
        return value;
      },
      set(target, key, value, receiver) {
        const rawValue = toRaw(value);
        const isArr = Array.isArray(target);
        const hadKey = isArr ? Number(key) < target.length : Object.prototype.hasOwnProperty.call(target, key);
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        const old = descriptor && "get" in descriptor ? Reflect.get(target, key, receiver) : Reflect.get(target, key, target);
        const ok = Reflect.set(target, key, rawValue, receiver);
        if (ok && (!Object.is(old, rawValue) || !hadKey || isArr && key === "length")) {
          trigger(target, key);
          if (!hadKey || isArr) {
            trigger(target, ITERATE_KEY);
          }
          onChange?.(key, rawValue, old);
        }
        return ok;
      },
      deleteProperty(target, key) {
        const existed = Reflect.has(target, key);
        const old = existed ? Reflect.get(target, key, target) : undefined;
        const ok = Reflect.deleteProperty(target, key);
        if (ok && existed) {
          trigger(target, key);
          trigger(target, ITERATE_KEY);
          onChange?.(key, undefined, old);
        }
        return ok;
      },
      ownKeys(target) {
        if (activeEffect) {
          track(target, ITERATE_KEY);
        }
        return Reflect.ownKeys(target);
      }
    });
    cache.set(obj, proxy);
    cache.set(proxy, proxy);
    proxyToRaw.set(proxy, obj);
    return proxy;
  }
  function readPath(obj, segments) {
    let current = obj;
    for (let i = 0;i < segments.length; i++) {
      if (current == null)
        return;
      current = current[segments[i]];
    }
    return current;
  }
  function createReactiveState(raw, onChange) {
    const watchers = raw.watch && typeof raw.watch === "object" ? raw.watch : {};
    if (raw.watch && typeof raw.watch === "object") {
      delete raw.watch;
    }
    const computedGetters = new Map;
    const cache = new WeakMap;
    const proxy = createDeepReactiveProxy(raw, onChange, cache, computedGetters);
    for (const key of Object.keys(raw)) {
      const desc = Object.getOwnPropertyDescriptor(raw, key);
      if (desc && typeof desc.get === "function" && desc.set === undefined) {
        computedGetters.set(key, computed(() => desc.get.call(proxy)));
      }
    }
    const watcherDisposers = [];
    for (const [watchPath, handler] of Object.entries(watchers)) {
      if (typeof handler !== "function")
        continue;
      const segments = watchPath.split(".").filter(Boolean);
      if (!segments.length)
        continue;
      let initialized = false;
      let oldValue;
      const runner = effect(() => readPath(proxy, segments), {
        scheduler() {
          const nextValue = runner();
          if (!initialized) {
            oldValue = nextValue;
            initialized = true;
            return;
          }
          if (!Object.is(nextValue, oldValue)) {
            const prev = oldValue;
            oldValue = nextValue;
            try {
              handler.call(proxy, nextValue, prev);
            } catch (e) {
              console.error("SpruceX watcher error on", watchPath, e);
            }
          }
        }
      });
      oldValue = runner();
      initialized = true;
      watcherDisposers.push(() => runner.stop());
    }
    const stopWatchers = () => {
      watcherDisposers.forEach((dispose) => dispose());
      watcherDisposers.length = 0;
      computedGetters.forEach((entry) => entry.stop());
      computedGetters.clear();
    };
    return { proxy, watchers, stopWatchers, computedGetters };
  }

  // src/store/index.js
  var globalStores = Object.create(null);
  var storeSubscribers = Object.create(null);
  var storeCleanups = Object.create(null);
  function getStore(name) {
    return globalStores[name];
  }
  function initStore(name, value, options = {}) {
    if (!globalStores[name]) {
      let raw = value || {};
      const storageKey = `sprucex-store-${name}`;
      let persistQueued = false;
      let applyingExternalSync = false;
      if (options.persist && typeof localStorage !== "undefined") {
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            Object.assign(raw, JSON.parse(stored));
          }
        } catch (e) {
          console.error(`SpruceX store "${name}" load error:`, e);
        }
      }
      const subscribers = new Set;
      storeSubscribers[name] = subscribers;
      const flushPersist = () => {
        persistQueued = false;
        if (!globalStores[name] || typeof localStorage === "undefined")
          return;
        try {
          localStorage.setItem(storageKey, JSON.stringify(toRaw(globalStores[name])));
        } catch (e) {
          console.error(`SpruceX store "${name}" save error:`, e);
        }
      };
      const notify = () => {
        if (options.persist && !applyingExternalSync && !persistQueued) {
          persistQueued = true;
          queueMicrotask(flushPersist);
        }
        subscribers.forEach((comp) => {
          if (!comp.isDestroyed)
            comp.scheduleUpdate();
        });
      };
      globalStores[name] = createDeepReactiveProxy(raw, notify);
      const cleanups = [];
      if (options.persist && options.syncTabs && typeof window !== "undefined") {
        const onStorage = (ev) => {
          if (ev.key !== storageKey || ev.newValue == null || !globalStores[name])
            return;
          try {
            const parsed = JSON.parse(ev.newValue);
            if (parsed && typeof parsed === "object") {
              applyingExternalSync = true;
              try {
                Object.assign(globalStores[name], parsed);
              } finally {
                applyingExternalSync = false;
              }
            }
          } catch (e) {
            console.error(`SpruceX store "${name}" sync error:`, e);
          }
        };
        window.addEventListener("storage", onStorage);
        cleanups.push(() => window.removeEventListener("storage", onStorage));
      }
      storeCleanups[name] = cleanups;
    }
    return globalStores[name];
  }
  function removeStore(name) {
    if (!globalStores[name])
      return;
    const cleanups = storeCleanups[name];
    if (cleanups) {
      cleanups.forEach((fn) => fn());
      delete storeCleanups[name];
    }
    const subscribers = storeSubscribers[name];
    if (subscribers) {
      subscribers.forEach((comp) => {
        if (!comp.isDestroyed)
          comp.scheduleUpdate();
      });
    }
    delete globalStores[name];
    delete storeSubscribers[name];
  }

  // src/utils/csp-eval.js
  var KEYWORDS = {
    true: true,
    false: false,
    null: null,
    undefined: undefined,
    NaN: NaN,
    Infinity: Infinity
  };
  var BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
  function tokenize(source) {
    const tokens = [];
    let i = 0;
    const len = source.length;
    while (i < len) {
      const ch = source[i];
      if (/\s/.test(ch)) {
        i++;
        continue;
      }
      if (ch === "'" || ch === '"') {
        const quote = ch;
        let val = "";
        i++;
        while (i < len && source[i] !== quote) {
          if (source[i] === "\\" && i + 1 < len) {
            const next = source[++i];
            if (next === "n")
              val += `
`;
            else if (next === "r")
              val += "\r";
            else if (next === "t")
              val += "\t";
            else
              val += next;
            i++;
          } else {
            val += source[i++];
          }
        }
        if (source[i] !== quote)
          throw new Error("Unterminated string literal");
        i++;
        tokens.push({ type: "str", value: val });
        continue;
      }
      if (/[0-9]/.test(ch) || ch === "." && /[0-9]/.test(source[i + 1] || "")) {
        let num = "";
        while (i < len && /[0-9.]/.test(source[i]))
          num += source[i++];
        tokens.push({ type: "num", value: Number(num) });
        continue;
      }
      if (/[A-Za-z_$]/.test(ch)) {
        let id = "";
        while (i < len && /[A-Za-z0-9_$]/.test(source[i]))
          id += source[i++];
        tokens.push({ type: "id", value: id });
        continue;
      }
      const three = source.slice(i, i + 3);
      if (three === "===" || three === "!==") {
        tokens.push({ type: "op", value: three });
        i += 3;
        continue;
      }
      const two = source.slice(i, i + 2);
      if (["==", "!=", "<=", ">=", "&&", "||", "??", "?.", "++", "--", "+=", "-=", "*=", "/="].includes(two)) {
        tokens.push({ type: "op", value: two });
        i += 2;
        continue;
      }
      tokens.push({ type: "punc", value: ch });
      i++;
    }
    tokens.push({ type: "eof", value: "" });
    return tokens;
  }
  function lookupRoot(name, ctx) {
    if (name in KEYWORDS)
      return { owner: KEYWORDS, key: name, value: KEYWORDS[name], found: true };
    if (name in ctx.extra)
      return { owner: ctx.extra, key: name, value: ctx.extra[name], found: true };
    if (name in ctx.magics)
      return { owner: ctx.magics, key: name, value: ctx.magics[name], found: true };
    if (ctx.locals && name in ctx.locals) {
      return { owner: ctx.locals, key: name, value: ctx.locals[name], found: true };
    }
    if (ctx.state && name in ctx.state) {
      return { owner: ctx.state, key: name, value: ctx.state[name], found: true };
    }
    if (name === "this")
      return { owner: null, key: null, value: ctx.state, found: true };
    if (typeof globalThis !== "undefined" && name in globalThis) {
      return { owner: globalThis, key: name, value: globalThis[name], found: true };
    }
    return { owner: ctx.state, key: name, value: undefined, found: false };
  }

  class Parser {
    constructor(tokens, ctx) {
      this.tokens = tokens;
      this.pos = 0;
      this.ctx = ctx;
    }
    peek() {
      return this.tokens[this.pos];
    }
    next() {
      return this.tokens[this.pos++];
    }
    match(value) {
      if (this.peek().value === value) {
        this.pos++;
        return true;
      }
      return false;
    }
    expect(value) {
      const tok = this.next();
      if (tok.value !== value) {
        throw new Error(`Expected '${value}' but got '${tok.value}'`);
      }
    }
    parseStatements() {
      let last;
      while (this.peek().type !== "eof") {
        if (this.match(";"))
          continue;
        last = this.parseAssignment();
        this.match(";");
      }
      return last;
    }
    parseExpression() {
      return this.parseAssignment();
    }
    parseAssignment() {
      const startPos = this.pos;
      const lhsRef = this.tryParseLValue();
      const opTok = this.peek();
      if (lhsRef && ["=", "+=", "-=", "*=", "/="].includes(opTok.value)) {
        this.next();
        const rhs = this.parseAssignment();
        if (!lhsRef.owner || BLOCKED_KEYS.has(String(lhsRef.key))) {
          throw new Error("Invalid assignment target");
        }
        if (opTok.value === "=")
          lhsRef.owner[lhsRef.key] = rhs;
        else if (opTok.value === "+=")
          lhsRef.owner[lhsRef.key] += rhs;
        else if (opTok.value === "-=")
          lhsRef.owner[lhsRef.key] -= rhs;
        else if (opTok.value === "*=")
          lhsRef.owner[lhsRef.key] *= rhs;
        else if (opTok.value === "/=")
          lhsRef.owner[lhsRef.key] /= rhs;
        return lhsRef.owner[lhsRef.key];
      }
      if (lhsRef && (opTok.value === "++" || opTok.value === "--")) {
        this.next();
        if (!lhsRef.owner || BLOCKED_KEYS.has(String(lhsRef.key))) {
          throw new Error("Invalid update target");
        }
        const prev = Number(lhsRef.owner[lhsRef.key]);
        lhsRef.owner[lhsRef.key] = opTok.value === "++" ? prev + 1 : prev - 1;
        return prev;
      }
      this.pos = startPos;
      return this.parseTernary();
    }
    tryParseLValue() {
      const tok = this.peek();
      if (tok.type !== "id" || tok.value in KEYWORDS)
        return null;
      this.next();
      let ref = lookupRoot(tok.value, this.ctx);
      while (true) {
        if (this.match(".")) {
          const prop = this.next();
          if (prop.type !== "id")
            return null;
          if (BLOCKED_KEYS.has(prop.value))
            return null;
          const owner = ref.value;
          if (owner == null)
            return null;
          ref = { owner, key: prop.value, value: owner[prop.value], found: true };
        } else if (this.match("[")) {
          const key = this.parseExpression();
          this.expect("]");
          if (BLOCKED_KEYS.has(String(key)))
            return null;
          const owner = ref.value;
          if (owner == null)
            return null;
          ref = { owner, key, value: owner[key], found: true };
        } else {
          break;
        }
      }
      return ref;
    }
    parseTernary() {
      const cond = this.parseNullish();
      if (this.match("?")) {
        const thenBranch = this.parseExpression();
        this.expect(":");
        const elseBranch = this.parseExpression();
        return cond ? thenBranch : elseBranch;
      }
      return cond;
    }
    parseNullish() {
      let left = this.parseOr();
      while (this.match("??")) {
        const right = this.parseOr();
        left = left ?? right;
      }
      return left;
    }
    parseOr() {
      let left = this.parseAnd();
      while (this.match("||")) {
        const right = this.parseAnd();
        left = left || right;
      }
      return left;
    }
    parseAnd() {
      let left = this.parseEquality();
      while (this.match("&&")) {
        const right = this.parseEquality();
        left = left && right;
      }
      return left;
    }
    parseEquality() {
      let left = this.parseComparison();
      while (["===", "!==", "==", "!="].includes(this.peek().value)) {
        const op = this.next().value;
        const right = this.parseComparison();
        if (op === "===")
          left = left === right;
        else if (op === "!==")
          left = left !== right;
        else if (op === "==")
          left = left == right;
        else
          left = left != right;
      }
      return left;
    }
    parseComparison() {
      let left = this.parseAdditive();
      while (["<", "<=", ">", ">="].includes(this.peek().value)) {
        const op = this.next().value;
        const right = this.parseAdditive();
        if (op === "<")
          left = left < right;
        else if (op === "<=")
          left = left <= right;
        else if (op === ">")
          left = left > right;
        else
          left = left >= right;
      }
      return left;
    }
    parseAdditive() {
      let left = this.parseMultiplicative();
      while (this.peek().value === "+" || this.peek().value === "-") {
        const op = this.next().value;
        const right = this.parseMultiplicative();
        left = op === "+" ? left + right : left - right;
      }
      return left;
    }
    parseMultiplicative() {
      let left = this.parseUnary();
      while (["*", "/", "%"].includes(this.peek().value)) {
        const op = this.next().value;
        const right = this.parseUnary();
        if (op === "*")
          left = left * right;
        else if (op === "/")
          left = left / right;
        else
          left = left % right;
      }
      return left;
    }
    parseUnary() {
      if (this.match("!"))
        return !this.parseUnary();
      if (this.match("-"))
        return -this.parseUnary();
      if (this.match("+"))
        return +this.parseUnary();
      if (this.peek().type === "id" && this.peek().value === "typeof") {
        this.next();
        return typeof this.parseUnary();
      }
      if (this.peek().value === "++" || this.peek().value === "--") {
        const op = this.next().value;
        const ref = this.tryParseLValue();
        if (!ref || !ref.owner || BLOCKED_KEYS.has(String(ref.key))) {
          throw new Error("Invalid prefix update target");
        }
        const next = Number(ref.owner[ref.key]) + (op === "++" ? 1 : -1);
        ref.owner[ref.key] = next;
        return next;
      }
      return this.parsePostfix();
    }
    parsePostfix() {
      let owner = null;
      let value = this.parsePrimary();
      while (true) {
        if (this.match(".") || this.match("?.")) {
          const optional = this.tokens[this.pos - 1].value === "?.";
          const prop = this.next();
          if (prop.type !== "id")
            throw new Error("Expected property name");
          if (BLOCKED_KEYS.has(prop.value)) {
            owner = value;
            value = undefined;
            continue;
          }
          if (value == null) {
            if (optional) {
              owner = null;
              value = undefined;
              continue;
            }
            throw new TypeError(`Cannot read property '${prop.value}' of ${value}`);
          }
          owner = value;
          value = value[prop.value];
        } else if (this.match("[")) {
          const key = this.parseExpression();
          this.expect("]");
          if (BLOCKED_KEYS.has(String(key))) {
            owner = value;
            value = undefined;
            continue;
          }
          owner = value;
          value = value == null ? undefined : value[key];
        } else if (this.match("(")) {
          const args = [];
          if (this.peek().value !== ")") {
            do {
              args.push(this.parseExpression());
            } while (this.match(","));
          }
          this.expect(")");
          if (typeof value !== "function") {
            throw new TypeError("Attempted to call a non-function");
          }
          value = value.apply(owner ?? this.ctx.state, args);
          owner = null;
        } else {
          break;
        }
      }
      return value;
    }
    parsePrimary() {
      const tok = this.peek();
      if (tok.type === "num" || tok.type === "str") {
        this.next();
        return tok.value;
      }
      if (tok.type === "id") {
        this.next();
        const ref = lookupRoot(tok.value, this.ctx);
        if (!ref.found) {
          throw new ReferenceError(`${tok.value} is not defined`);
        }
        return ref.value;
      }
      if (this.match("(")) {
        const val = this.parseExpression();
        this.expect(")");
        return val;
      }
      if (this.match("[")) {
        const arr = [];
        if (this.peek().value !== "]") {
          do {
            if (this.peek().value === "]")
              break;
            arr.push(this.parseExpression());
          } while (this.match(","));
        }
        this.expect("]");
        return arr;
      }
      if (this.match("{")) {
        const obj = {};
        if (this.peek().value !== "}") {
          do {
            if (this.peek().value === "}")
              break;
            const keyTok = this.next();
            const key = keyTok.type === "id" || keyTok.type === "str" || keyTok.type === "num" ? String(keyTok.value) : null;
            if (key === null)
              throw new Error("Invalid object key");
            if (this.match(":")) {
              obj[key] = this.parseExpression();
            } else if (keyTok.type === "id") {
              const ref = lookupRoot(key, this.ctx);
              if (!ref.found)
                throw new ReferenceError(`${key} is not defined`);
              obj[key] = ref.value;
            } else {
              throw new Error("Expected ':' after object key");
            }
          } while (this.match(","));
        }
        this.expect("}");
        return obj;
      }
      throw new Error(`Unexpected token '${tok.value}'`);
    }
  }
  function cspEval(expr, ctx) {
    const tokens = tokenize(String(expr || ""));
    const parser = new Parser(tokens, ctx);
    const result = parser.parseExpression();
    if (parser.peek().type !== "eof") {
      throw new Error(`Unexpected token '${parser.peek().value}'`);
    }
    return result;
  }
  function cspExec(stmt, ctx) {
    const tokens = tokenize(String(stmt || ""));
    const parser = new Parser(tokens, ctx);
    return parser.parseStatements();
  }

  // src/utils/eval.js
  var MAX_CACHE_SIZE = 500;
  var evalFnCache = new Map;
  var execFnCache = new Map;
  var SIMPLE_PATH_RE = /^(!)?\s*([A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*)$/;
  var SIMPLE_LITERAL_KEYWORDS = new Set([
    "true",
    "false",
    "null",
    "undefined",
    "NaN",
    "Infinity",
    "this",
    "window",
    "document",
    "globalThis"
  ]);
  var BLOCKED_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);
  var cspModeOverride = false;
  var evalBlockedDetected = false;
  function setCspMode(enabled) {
    cspModeOverride = !!enabled;
  }
  function isCspMode() {
    return cspModeOverride || evalBlockedDetected;
  }
  function boundedCacheSet(cache, key, value) {
    if (cache.size >= MAX_CACHE_SIZE) {
      const evictCount = Math.ceil(MAX_CACHE_SIZE / 4);
      const iter = cache.keys();
      for (let i = 0;i < evictCount; i++) {
        const oldest = iter.next().value;
        if (oldest !== undefined)
          cache.delete(oldest);
      }
    }
    cache.set(key, value);
  }
  function buildMagics(scope) {
    const storeAccessor = scope.storeAccessor || getStore;
    const nextTick = typeof scope.nextTick === "function" ? scope.nextTick.bind(scope) : (fn) => Promise.resolve().then(() => fn?.());
    const dispatch = typeof scope.dispatch === "function" ? scope.dispatch.bind(scope) : (name, detail) => {
      const target = scope.currentEl || scope.root;
      if (!target)
        return false;
      return target.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, cancelable: true }));
    };
    return {
      $state: scope.state,
      $event: scope.lastEvent || null,
      $refs: scope.refs,
      $emit: scope.emit,
      $store: storeAccessor,
      $locals: scope.locals || {},
      $el: scope.currentEl || scope.root || null,
      $nextTick: nextTick,
      $dispatch: dispatch,
      $parent: scope.parentComponent?.state || null
    };
  }
  var FAST_EVAL_MISS = Symbol("fastEvalMiss");
  function tryFastEval(expr, scope, extra) {
    const trimmed = typeof expr === "string" ? expr.trim() : "";
    if (!trimmed)
      return FAST_EVAL_MISS;
    if (trimmed === "true")
      return true;
    if (trimmed === "false")
      return false;
    if (trimmed === "null")
      return null;
    if (trimmed === "undefined")
      return;
    const match = SIMPLE_PATH_RE.exec(trimmed);
    if (!match)
      return FAST_EVAL_MISS;
    const negate = Boolean(match[1]);
    const segments = match[2].split(".");
    const rootName = segments[0];
    if (SIMPLE_LITERAL_KEYWORDS.has(rootName))
      return FAST_EVAL_MISS;
    const locals = scope.locals || {};
    const state = scope.state;
    let value;
    if (extra && rootName in extra) {
      value = extra[rootName];
    } else if (rootName === "$el") {
      value = scope.currentEl || scope.root || null;
    } else if (rootName === "$refs") {
      value = scope.refs;
    } else if (rootName === "$event") {
      value = scope.lastEvent || null;
    } else if (rootName === "$parent") {
      value = scope.parentComponent?.state || null;
    } else if (rootName === "$state") {
      value = state;
    } else if (rootName === "$locals") {
      value = locals;
    } else if (locals && rootName in locals) {
      value = locals[rootName];
    } else if (state && rootName in state) {
      value = state[rootName];
    } else {
      return FAST_EVAL_MISS;
    }
    for (let i = 1;i < segments.length; i++) {
      const seg = segments[i];
      if (BLOCKED_SEGMENTS.has(seg))
        return;
      if (value == null) {
        throw new TypeError(`Cannot read properties of ${value} (reading '${seg}')`);
      }
      value = value[seg];
    }
    return negate ? !value : value;
  }
  function isCspEvalError(err) {
    if (!err)
      return false;
    if (err instanceof EvalError)
      return true;
    const msg = String(err.message || "");
    return /unsafe-eval|Content Security Policy|Refused to evaluate/i.test(msg);
  }
  function evalInScope(expr, scope, extra = {}) {
    const fast = tryFastEval(expr, scope, extra);
    if (fast !== FAST_EVAL_MISS)
      return fast;
    const locals = scope.locals || {};
    const magics = buildMagics(scope);
    if (scope.csp || isCspMode()) {
      try {
        return cspEval(expr, { state: scope.state, locals, magics, extra });
      } catch (e) {
        if (scope.debug) {
          console.error("SpruceX expression error:", expr, e);
        }
        throw e;
      }
    }
    const extraKeys = Object.keys(extra);
    const cacheKey = expr + "|" + extraKeys.join(",");
    let fn = evalFnCache.get(cacheKey);
    if (!fn) {
      try {
        fn = new Function("$state", "$event", "$refs", "$emit", "$store", "$locals", "$el", "$nextTick", "$dispatch", "$parent", ...extraKeys, `with($state){ with($locals){ return (${expr}); } }`);
        boundedCacheSet(evalFnCache, cacheKey, fn);
      } catch (e) {
        if (isCspEvalError(e)) {
          evalBlockedDetected = true;
          return cspEval(expr, { state: scope.state, locals, magics, extra });
        }
        if (scope.debug) {
          console.error("SpruceX expression compile error:", expr, e);
        }
        throw e;
      }
    }
    try {
      return fn(magics.$state, magics.$event, magics.$refs, magics.$emit, magics.$store, magics.$locals, magics.$el, magics.$nextTick, magics.$dispatch, magics.$parent, ...Object.values(extra));
    } catch (e) {
      if (scope.debug) {
        console.error("SpruceX expression error:", expr, e);
      }
      throw e;
    }
  }
  function safeEval(expr, scope, fallbackExpr) {
    try {
      return evalInScope(expr, scope);
    } catch (_e) {
      if (fallbackExpr) {
        try {
          return evalInScope(fallbackExpr, scope);
        } catch (e2) {
          console.error("SpruceX fallback expression error:", fallbackExpr, e2);
        }
      }
      return;
    }
  }
  function execInScope(stmt, scope, extra = {}) {
    const locals = scope.locals || {};
    const magics = buildMagics(scope);
    if (scope.csp || isCspMode()) {
      try {
        cspExec(stmt, { state: scope.state, locals, magics, extra });
      } catch (e) {
        console.error("SpruceX statement error:", stmt, e);
      }
      return;
    }
    const extraKeys = Object.keys(extra);
    const cacheKey = stmt + "|" + extraKeys.join(",");
    let fn = execFnCache.get(cacheKey);
    if (!fn) {
      try {
        fn = new Function("$state", "$event", "$refs", "$emit", "$store", "$locals", "$el", "$nextTick", "$dispatch", "$parent", ...extraKeys, `with($state){ with($locals){ ${stmt} } }`);
        boundedCacheSet(execFnCache, cacheKey, fn);
      } catch (e) {
        if (isCspEvalError(e)) {
          evalBlockedDetected = true;
          try {
            cspExec(stmt, { state: scope.state, locals, magics, extra });
          } catch (cspErr) {
            console.error("SpruceX statement error:", stmt, cspErr);
          }
          return;
        }
        console.error("SpruceX statement compile error:", stmt, e);
        return;
      }
    }
    try {
      fn(magics.$state, magics.$event, magics.$refs, magics.$emit, magics.$store, magics.$locals, magics.$el, magics.$nextTick, magics.$dispatch, magics.$parent, ...Object.values(extra));
    } catch (e) {
      console.error("SpruceX statement error:", stmt, e);
    }
  }

  // src/integrations/gridstack.js
  function parseGridOptionValue(component, raw) {
    const trimmed = String(raw || "").trim();
    if (!trimmed)
      return true;
    if (trimmed === "true")
      return true;
    if (trimmed === "false")
      return false;
    const asNum = Number(trimmed);
    if (Number.isFinite(asNum))
      return asNum;
    const evaluated = safeEval(trimmed, component);
    return evaluated === undefined ? trimmed : evaluated;
  }
  function buildGridOptions(component, binding) {
    const options = {};
    const { el, gridExpr, gridOptionsExpr } = binding;
    if (gridExpr && gridExpr.trim() && gridExpr.trim() !== "true") {
      const evaluated = safeEval(gridExpr, component);
      if (evaluated && typeof evaluated === "object" && !Array.isArray(evaluated)) {
        Object.assign(options, evaluated);
      }
    }
    if (gridOptionsExpr) {
      const evaluated = safeEval(gridOptionsExpr, component);
      if (evaluated && typeof evaluated === "object" && !Array.isArray(evaluated)) {
        Object.assign(options, evaluated);
      }
    }
    Array.from(el.attributes).filter((attr) => attr.name.startsWith(ATTR_GRIDSTACK_OPTION_PREFIX)).forEach((attr) => {
      const rawName = attr.name.slice(ATTR_GRIDSTACK_OPTION_PREFIX.length);
      if (!rawName)
        return;
      const optionName = rawName.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      options[optionName] = parseGridOptionValue(component, attr.value);
    });
    return options;
  }
  function serializeGridNodes(nodes) {
    if (!Array.isArray(nodes))
      return [];
    return nodes.map((node) => ({
      id: node?.id ?? node?.el?.id ?? null,
      x: node?.x,
      y: node?.y,
      w: node?.w,
      h: node?.h,
      minW: node?.minW,
      minH: node?.minH,
      maxW: node?.maxW,
      maxH: node?.maxH
    }));
  }
  function createGridStackIntegration() {
    const instancesMap = new WeakMap;
    const warnedComponents = new WeakSet;
    const getInstances = (component) => {
      let map = instancesMap.get(component);
      if (!map) {
        map = new Map;
        instancesMap.set(component, map);
      }
      return map;
    };
    const destroyGridElement = (component, el) => {
      const map = getInstances(component);
      const entry = map.get(el);
      if (entry) {
        entry.cleanups.forEach((fn) => fn());
        if (entry.grid && typeof entry.grid.destroy === "function") {
          entry.grid.destroy(false);
        }
        map.delete(el);
      }
      if (Array.isArray(component.gridBindings)) {
        component.gridBindings = component.gridBindings.filter((b) => b.el !== el);
      }
    };
    return {
      preserveOnSwap: true,
      setup(component) {
        if (!Array.isArray(component.gridBindings)) {
          component.gridBindings = [];
        }
      },
      scan(component, el) {
        if (!el.hasAttribute(ATTR_GRIDSTACK))
          return;
        if (!Array.isArray(component.gridBindings)) {
          component.gridBindings = [];
        }
        if (component.gridBindings.some((b) => b.el === el))
          return;
        component.gridBindings.push({
          el,
          gridExpr: el.getAttribute(ATTR_GRIDSTACK),
          gridOptionsExpr: el.getAttribute(ATTR_GRIDSTACK_OPTIONS),
          onChangeInto: el.getAttribute(ATTR_GRIDSTACK_ON_CHANGE),
          onAddedInto: el.getAttribute(ATTR_GRIDSTACK_ON_ADDED),
          onRemovedInto: el.getAttribute(ATTR_GRIDSTACK_ON_REMOVED),
          onDragstopInto: el.getAttribute(ATTR_GRIDSTACK_ON_DRAGSTOP),
          onResizestopInto: el.getAttribute(ATTR_GRIDSTACK_ON_RESIZESTOP)
        });
      },
      update(component) {
        const bindings = component.gridBindings || [];
        const instances = getInstances(component);
        for (const el of Array.from(instances.keys())) {
          if (!el.isConnected) {
            destroyGridElement(component, el);
          }
        }
        bindings.forEach((binding) => {
          const { el } = binding;
          if (!el.isConnected || instances.has(el))
            return;
          if (typeof window === "undefined" || !window.GridStack || typeof window.GridStack.init !== "function") {
            if (!warnedComponents.has(component)) {
              warnedComponents.add(component);
              console.warn("SpruceX: sx-gridstack requires GridStack on window.GridStack.");
            }
            return;
          }
          const options = buildGridOptions(component, binding);
          const grid = window.GridStack.init(options, el);
          const cleanups = [];
          const bindInto = (eventName, targetExpr) => {
            if (!targetExpr)
              return;
            const handler = (_event, nodes = []) => {
              const value = serializeGridNodes(nodes);
              component.assignStateValue(targetExpr, value);
              el.dispatchEvent(new CustomEvent(`sprucex:gridstack:${eventName}`, {
                detail: value,
                bubbles: true
              }));
            };
            grid.on(eventName, handler);
            cleanups.push(() => {
              if (typeof grid.off === "function") {
                grid.off(eventName, handler);
              }
            });
          };
          bindInto("change", binding.onChangeInto);
          bindInto("added", binding.onAddedInto);
          bindInto("removed", binding.onRemovedInto);
          bindInto("dragstop", binding.onDragstopInto);
          bindInto("resizestop", binding.onResizestopInto);
          instances.set(el, { grid, cleanups });
        });
      },
      unmount(component, el) {
        destroyGridElement(component, el);
      },
      teardown(component) {
        const instances = getInstances(component);
        for (const el of Array.from(instances.keys())) {
          destroyGridElement(component, el);
        }
        component.gridBindings = [];
      }
    };
  }

  // src/integrations/index.js
  var integrationRegistry = new Map;
  function assertName(name) {
    if (typeof name !== "string" || !name.trim()) {
      throw new Error("SpruceX integration name must be a non-empty string.");
    }
  }
  function assertIntegration(integration) {
    if (!integration || typeof integration !== "object") {
      throw new Error("SpruceX integration must be an object.");
    }
  }
  function registerIntegration(name, integration) {
    assertName(name);
    assertIntegration(integration);
    integrationRegistry.set(name, integration);
    return integration;
  }
  function getIntegration(name) {
    assertName(name);
    return integrationRegistry.get(name);
  }
  function listIntegrations() {
    return Array.from(integrationRegistry.values());
  }

  // src/integrations/builtins.js
  function ensureBuiltInIntegrationsRegistered() {
    if (!getIntegration("gridstack")) {
      registerIntegration("gridstack", createGridStackIntegration());
    }
  }

  // src/utils/animations.js
  var autoAnimate = null;
  var autoAnimateLoaded = false;
  function getAutoAnimate() {
    if (autoAnimateLoaded)
      return autoAnimate;
    if (typeof window === "undefined")
      return null;
    autoAnimateLoaded = true;
    if (window.autoAnimate) {
      autoAnimate = window.autoAnimate;
    } else if (window.AutoAnimate?.default) {
      autoAnimate = window.AutoAnimate.default;
    }
    return autoAnimate;
  }
  function setAutoAnimate(lib) {
    autoAnimate = lib;
    autoAnimateLoaded = true;
  }

  // src/utils/data-factories.js
  var DATA_FACTORY_NOT_READY_ERROR = "SPRUCEX_DATA_FACTORY_NOT_READY";
  var dataFactories = Object.create(null);
  function getDataFactory(name) {
    if (!name || typeof name !== "string")
      return;
    return dataFactories[name];
  }
  function registerDataFactory(name, factory) {
    if (name && typeof name === "object" && !Array.isArray(name)) {
      Object.entries(name).forEach(([key, value]) => {
        registerDataFactory(key, value);
      });
      return dataFactories;
    }
    if (typeof name !== "string" || !name.trim())
      return;
    if (arguments.length === 1)
      return getDataFactory(name);
    dataFactories[name] = factory;
    return factory;
  }
  function getDataExpressionReference(rawExpr) {
    const expr = String(rawExpr || "").trim();
    if (!expr)
      return null;
    const identifierPath = /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/;
    if (identifierPath.test(expr))
      return expr;
    const callMatch = expr.match(/^([A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*)\s*\(/);
    if (callMatch)
      return callMatch[1];
    return null;
  }
  function isFactoryLikeDataExpression(rawExpr) {
    return !!getDataExpressionReference(rawExpr);
  }
  var BLOCKED_SEGMENTS2 = new Set(["__proto__", "constructor", "prototype"]);
  function resolveGlobalDataReference(reference) {
    if (!reference || typeof reference !== "string")
      return;
    const root = typeof window !== "undefined" ? window : globalThis;
    let cur = root;
    for (const segment of reference.split(".")) {
      if (cur == null)
        return;
      if (BLOCKED_SEGMENTS2.has(segment))
        return;
      cur = cur[segment];
    }
    return cur;
  }
  function createDataFactoryNotReadyError(rawExpr, cause = null) {
    const err = new Error(`SpruceX sx-data factory not ready: ${rawExpr}`);
    err.code = DATA_FACTORY_NOT_READY_ERROR;
    err.rawExpr = rawExpr;
    if (cause)
      err.cause = cause;
    return err;
  }

  // src/directives/bindings.js
  var ENUMERATED_BOOLEAN_ATTRS = new Set([
    "draggable",
    "spellcheck",
    "contenteditable"
  ]);
  var LIVE_VALUE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);
  var UNSET = Symbol("sprucex.unset");
  function isEnumeratedBooleanAttr(attr) {
    return attr.startsWith("aria-") || ENUMERATED_BOOLEAN_ATTRS.has(attr);
  }
  function scanBindingDirectives(component, el, locals) {
    const hasMemo = el.hasAttribute(ATTR_MEMO);
    const errorFallback = el.getAttribute(ATTR_ERROR_FALLBACK);
    const textExpr = el.getAttribute(ATTR_TEXT);
    if (textExpr && !hasMemo) {
      registerBinding(component, {
        el,
        type: "text",
        expr: textExpr,
        errorFallback,
        locals,
        lastRendered: UNSET
      });
    }
    const htmlExpr = el.getAttribute(ATTR_HTML);
    if (htmlExpr && !hasMemo) {
      registerBinding(component, {
        el,
        type: "html",
        expr: htmlExpr,
        errorFallback,
        locals,
        lastRendered: UNSET
      });
    }
    const showExpr = el.getAttribute(ATTR_SHOW);
    if (showExpr) {
      const initialDisplay = el.style?.display && el.style.display !== "none" ? el.style.display : "";
      registerBinding(component, {
        el,
        type: "show",
        expr: showExpr,
        errorFallback,
        locals,
        initialDisplay,
        lastRendered: UNSET
      });
    }
    const classExpr = el.getAttribute(ATTR_CLASS);
    if (classExpr) {
      if (!component.originalClasses.has(el)) {
        component.originalClasses.set(el, new Set(Array.from(el.classList)));
      }
      registerBinding(component, {
        el,
        type: "class",
        expr: classExpr,
        errorFallback,
        locals,
        managedClasses: new Set,
        lastRendered: UNSET
      });
    }
    const styleExpr = el.getAttribute(ATTR_STYLE);
    if (styleExpr) {
      registerBinding(component, {
        el,
        type: "style",
        expr: styleExpr,
        errorFallback,
        locals,
        managedStyles: new Map,
        lastRendered: UNSET
      });
    }
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith(ATTR_BIND_PREFIX)) {
        const name = attr.name.slice(ATTR_BIND_PREFIX.length);
        registerBinding(component, {
          el,
          type: "bind",
          attr: name,
          expr: attr.value,
          errorFallback,
          locals,
          lastRendered: UNSET
        });
      }
    }
    const memoExpr = el.getAttribute(ATTR_MEMO);
    if (memoExpr && (textExpr || htmlExpr)) {
      let deps = [];
      try {
        const evaluated = safeEval(memoExpr, component);
        if (Array.isArray(evaluated))
          deps = evaluated;
      } catch (e) {
        console.error("SpruceX sx-memo parse error:", memoExpr, e);
      }
      component.memoBindings.push({
        el,
        expr: textExpr || htmlExpr,
        type: textExpr ? "text" : "html",
        deps,
        lastVals: null,
        lastResult: null,
        locals
      });
    }
    setupModelBinding(component, el, locals);
    const initExpr = el.getAttribute(ATTR_INIT);
    if (initExpr) {
      component.pendingInits.push({ el, expr: initExpr, locals });
    }
    const effectExpr = el.getAttribute(ATTR_EFFECT);
    if (effectExpr) {
      registerElementEffect(component, el, effectExpr, locals);
    }
    if (el.hasAttribute(ATTR_CLOAK)) {
      component.cloakedElements.add(el);
    }
  }
  function registerBinding(component, binding) {
    binding.dirty = true;
    binding.tracked = false;
    const runner = effect(() => {
      applySingleBinding(component, binding);
    }, {
      lazy: true,
      scheduler() {
        binding.dirty = true;
        component.dirtyBindings.add(binding);
        component.scheduleUpdate(false);
      }
    });
    binding._runner = runner;
    binding.dispose = () => {
      runner.stop();
      component.dirtyBindings.delete(binding);
    };
    component.bindings.push(binding);
    return binding;
  }
  function registerElementEffect(component, el, expr, locals) {
    let scheduled = false;
    const runner = effect(() => {
      if (component.isDestroyed)
        return;
      component.withContext(el, locals, () => {
        execInScope(expr, component);
      });
    }, {
      lazy: true,
      scheduler() {
        if (scheduled || component.isDestroyed)
          return;
        scheduled = true;
        component.dirtyEffects.add(entry);
        component.scheduleUpdate(false);
      }
    });
    const entry = {
      el,
      locals,
      run() {
        scheduled = false;
        runner();
      },
      dispose() {
        runner.stop();
        component.dirtyEffects.delete(entry);
      }
    };
    component.elementEffects.push(entry);
    component.dirtyEffects.add(entry);
  }
  function runBinding(component, binding) {
    binding.dirty = false;
    binding._runner();
    binding.tracked = binding._runner.effect.deps.length > 0;
  }
  function applySingleBinding(component, b) {
    const { el, type, expr, attr, errorFallback, locals } = b;
    component.withContext(el, locals, () => {
      switch (type) {
        case "text": {
          const v = safeEval(expr, component, errorFallback);
          const nextStr = v !== null && v !== undefined && typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
          if (b.lastRendered !== nextStr) {
            b.lastRendered = nextStr;
            el.textContent = nextStr;
          }
          break;
        }
        case "html": {
          const v = safeEval(expr, component, errorFallback);
          const nextStr = v !== null && v !== undefined && typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
          if (b.lastRendered !== nextStr) {
            b.lastRendered = nextStr;
            el.innerHTML = nextStr;
          }
          break;
        }
        case "show": {
          const nextBool = !!safeEval(expr, component, errorFallback);
          if (b.lastRendered !== nextBool) {
            b.lastRendered = nextBool;
            el.style.display = nextBool ? b.initialDisplay || "" : "none";
          }
          break;
        }
        case "bind": {
          const v = safeEval(expr, component, errorFallback);
          if (Object.is(b.lastRendered, v))
            break;
          b.lastRendered = v;
          if (isEnumeratedBooleanAttr(attr)) {
            if (v === null || v === undefined) {
              el.removeAttribute(attr);
            } else {
              el.setAttribute(attr, String(v));
            }
            break;
          }
          if (attr === "value" && LIVE_VALUE_TAGS.has(el.tagName)) {
            const strVal = v ?? "";
            if (v === false || v === null || v === undefined) {
              el.removeAttribute("value");
            } else {
              el.setAttribute("value", strVal);
            }
            if (el.value !== String(strVal)) {
              el.value = String(strVal);
            }
            break;
          }
          if (attr === "checked" && el.tagName === "INPUT") {
            const boolVal = !!v;
            if (el.checked !== boolVal)
              el.checked = boolVal;
            if (boolVal)
              el.setAttribute("checked", "");
            else
              el.removeAttribute("checked");
            break;
          }
          if (attr === "indeterminate" && el.tagName === "INPUT") {
            el.indeterminate = !!v;
            break;
          }
          if (v === false || v === null || v === undefined) {
            el.removeAttribute(attr);
          } else {
            el.setAttribute(attr, v);
          }
          break;
        }
        case "class": {
          const v = safeEval(expr, component, errorFallback);
          const original = component.originalClasses.get(el) || new Set;
          if (typeof v === "string") {
            if (b.lastRendered === v)
              break;
            b.lastRendered = v;
            const nextClasses = new Set(v.split(/\s+/).filter(Boolean));
            for (const c of Array.from(el.classList)) {
              if (!original.has(c) && !nextClasses.has(c)) {
                el.classList.remove(c);
              }
            }
            for (const c of nextClasses) {
              if (!el.classList.contains(c))
                el.classList.add(c);
            }
            b.managedClasses = nextClasses;
          } else if (v && typeof v === "object") {
            b.lastRendered = UNSET;
            const keys = Object.keys(v);
            for (let i = 0;i < keys.length; i++) {
              const k = keys[i];
              const active = !!v[k];
              const parts = k.split(/\s+/).filter(Boolean);
              for (let j = 0;j < parts.length; j++) {
                const cls = parts[j];
                if (active) {
                  if (!el.classList.contains(cls))
                    el.classList.add(cls);
                  b.managedClasses.add(cls);
                } else {
                  if (el.classList.contains(cls))
                    el.classList.remove(cls);
                  b.managedClasses.delete(cls);
                }
              }
            }
          }
          break;
        }
        case "style": {
          const v = safeEval(expr, component, errorFallback);
          if (typeof v === "string") {
            if (b.lastRendered === v)
              break;
            b.lastRendered = v;
            el.style.cssText = v;
          } else if (v && typeof v === "object") {
            b.lastRendered = UNSET;
            const nextKeys = new Set;
            for (const [prop, rawVal] of Object.entries(v)) {
              const cssProp = prop.startsWith("--") ? prop : prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
              nextKeys.add(cssProp);
              const strVal = rawVal == null || rawVal === false ? "" : String(rawVal);
              if (b.managedStyles.get(cssProp) !== strVal) {
                if (strVal === "") {
                  el.style.removeProperty(cssProp);
                } else {
                  el.style.setProperty(cssProp, strVal);
                }
                b.managedStyles.set(cssProp, strVal);
              }
            }
            for (const prevProp of Array.from(b.managedStyles.keys())) {
              if (!nextKeys.has(prevProp)) {
                el.style.removeProperty(prevProp);
                b.managedStyles.delete(prevProp);
              }
            }
          }
          break;
        }
      }
    });
  }
  function parseModelBindingConfig(direct, modifierAttrs) {
    const keyExpr = direct || modifierAttrs[0]?.value || null;
    const mods = new Set;
    let debounceMs = null;
    modifierAttrs.forEach((attr) => {
      const parts = attr.name.slice(ATTR_MODEL_PREFIX.length).split(".").filter(Boolean);
      for (let i = 0;i < parts.length; i++) {
        const part = parts[i];
        if (part === "debounce-ms") {
          const parsed = Number(attr.value || "200");
          if (Number.isFinite(parsed) && parsed > 0) {
            debounceMs = parsed;
          }
          continue;
        }
        if (part === "debounce") {
          const nextPart = parts[i + 1];
          if (nextPart && /^\d+(?:ms)?$/i.test(nextPart)) {
            const parsed = Number(nextPart.replace(/ms$/i, ""));
            if (Number.isFinite(parsed) && parsed > 0) {
              debounceMs = parsed;
            }
            i++;
          } else {
            debounceMs = 250;
          }
          continue;
        }
        mods.add(part);
      }
    });
    return { keyExpr, mods, debounceMs };
  }
  function setupModelBinding(component, el, locals = null) {
    const direct = el.getAttribute(ATTR_MODEL);
    const modifierAttrs = Array.from(el.attributes).filter((a) => a.name.startsWith(ATTR_MODEL_PREFIX));
    if (!direct && modifierAttrs.length === 0)
      return null;
    const { keyExpr, mods, debounceMs } = parseModelBindingConfig(direct, modifierAttrs);
    const type = (el.type || "").toLowerCase();
    const isCheckbox = type === "checkbox";
    const isRadio = type === "radio";
    const isSelect = el.tagName === "SELECT";
    const isMultiSelect = isSelect && !!el.multiple;
    const updateDom = () => {
      component.withContext(el, locals, () => {
        const v = safeEval(keyExpr, component);
        if (isCheckbox) {
          const nextChecked = Array.isArray(v) ? v.includes(el.value) : !!v;
          if (el.checked !== nextChecked)
            el.checked = nextChecked;
        } else if (isRadio) {
          const nextChecked = String(v) === String(el.value);
          if (el.checked !== nextChecked)
            el.checked = nextChecked;
        } else if (isMultiSelect) {
          const selectedSet = new Set(Array.isArray(v) ? v.map(String) : []);
          Array.from(el.options || []).forEach((opt) => {
            const shouldSelect = selectedSet.has(String(opt.value));
            if (opt.selected !== shouldSelect)
              opt.selected = shouldSelect;
          });
        } else if (isSelect) {
          const nextVal = String(v ?? "");
          if (el.value !== nextVal)
            el.value = nextVal;
        } else {
          const nextVal = v !== null && v !== undefined && typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
          if (el.value !== nextVal)
            el.value = nextVal;
        }
      });
    };
    const applyModifiers = (val) => {
      if (mods.has("trim") && typeof val === "string")
        val = val.trim();
      if (mods.has("number")) {
        if (val === "" || val === null || val === undefined) {
          return "";
        }
        const n = Number(val);
        if (!Number.isNaN(n))
          val = n;
      }
      if (mods.has("boolean")) {
        val = val === "false" || val === "0" ? false : Boolean(val);
      }
      return val;
    };
    const writeBack = (ev) => {
      component.lastEvent = ev;
      component.withContext(el, locals, () => {
        let v;
        if (isCheckbox) {
          const current = safeEval(keyExpr, component);
          if (Array.isArray(current)) {
            const arr = [...current];
            const idx = arr.indexOf(el.value);
            if (el.checked && idx === -1)
              arr.push(el.value);
            if (!el.checked && idx !== -1)
              arr.splice(idx, 1);
            v = arr;
          } else {
            v = el.checked;
          }
        } else if (isRadio) {
          if (!el.checked)
            return;
          v = el.value;
        } else if (isMultiSelect) {
          v = Array.from(el.selectedOptions || []).map((opt) => applyModifiers(opt.value));
          execInScope(`${keyExpr} = __sx_value`, component, { __sx_value: v });
          return;
        } else if (isSelect) {
          v = el.value;
        } else {
          v = el.value;
        }
        v = applyModifiers(v);
        execInScope(`${keyExpr} = __sx_value`, component, { __sx_value: v });
      });
    };
    let eventName = "input";
    if (mods.has("lazy") || isMultiSelect)
      eventName = "change";
    const handler = component.wrapDebounced(writeBack, debounceMs);
    el.addEventListener(eventName, handler);
    const modelBinding = {
      updateDom,
      locals,
      el,
      event: eventName,
      handler,
      dirty: true,
      tracked: false
    };
    const runner = effect(() => {
      modelBinding.dirty = false;
      updateDom();
    }, {
      lazy: true,
      scheduler() {
        modelBinding.dirty = true;
        component.dirtyModels.add(modelBinding);
        component.scheduleUpdate(false);
      }
    });
    modelBinding._runner = runner;
    modelBinding.run = () => {
      runner();
      modelBinding.tracked = runner.effect.deps.length > 0;
    };
    modelBinding.dispose = () => {
      runner.stop();
      component.dirtyModels.delete(modelBinding);
    };
    component.eventHandlers.push({ el, event: eventName, handler });
    component.modelBindings.push(modelBinding);
    return modelBinding;
  }

  // src/directives/events.js
  var SYSTEM_KEY_MODIFIERS = new Set(["ctrl", "alt", "shift", "meta", "cmd"]);
  var NON_KEY_MODIFIERS = new Set([
    "prevent",
    "stop",
    "self",
    "window",
    "document",
    "once",
    "outside",
    "passive",
    "capture",
    "debounce",
    "throttle",
    ...SYSTEM_KEY_MODIFIERS
  ]);
  var KEY_ALIASES = {
    esc: "escape",
    space: " ",
    spacebar: " ",
    up: "arrowup",
    down: "arrowdown",
    left: "arrowleft",
    right: "arrowright",
    del: "delete",
    return: "enter"
  };
  function parseModifierDuration(mods, keyword, fallbackMs) {
    const idx = mods.indexOf(keyword);
    if (idx === -1)
      return null;
    const next = mods[idx + 1];
    if (next) {
      const match = String(next).match(/^(\d+)(?:ms)?$/i);
      if (match) {
        const parsed = Number(match[1]);
        if (Number.isFinite(parsed) && parsed > 0)
          return parsed;
      }
    }
    return fallbackMs;
  }
  function isDurationToken(mods, idx) {
    if (idx <= 0)
      return false;
    const prev = mods[idx - 1];
    return (prev === "debounce" || prev === "throttle") && /^\d+(?:ms)?$/i.test(mods[idx]);
  }
  function matchesKeyboardModifiers(ev, mods) {
    if (mods.includes("ctrl") && !ev.ctrlKey)
      return false;
    if (mods.includes("alt") && !ev.altKey)
      return false;
    if (mods.includes("shift") && !ev.shiftKey)
      return false;
    if ((mods.includes("meta") || mods.includes("cmd")) && !ev.metaKey)
      return false;
    const keyFilters = [];
    for (let i = 0;i < mods.length; i++) {
      const mod = mods[i];
      if (NON_KEY_MODIFIERS.has(mod) || isDurationToken(mods, i))
        continue;
      keyFilters.push(KEY_ALIASES[mod] ?? mod);
    }
    if (keyFilters.length > 0) {
      const actualKey = String(ev.key || "").toLowerCase();
      if (!keyFilters.includes(actualKey))
        return false;
    }
    return true;
  }
  function wrapThrottled(component, fn, throttleMs) {
    if (!throttleMs || throttleMs <= 0)
      return fn;
    let lastRun = 0;
    let trailingTimer = null;
    const handler = (...args) => {
      const now = Date.now();
      const remaining = throttleMs - (now - lastRun);
      if (remaining <= 0) {
        if (trailingTimer) {
          clearTimeout(trailingTimer);
          component.debounceTimers.delete(trailingTimer);
          trailingTimer = null;
        }
        lastRun = now;
        if (!component.isDestroyed)
          fn(...args);
      } else if (!trailingTimer) {
        trailingTimer = setTimeout(() => {
          component.debounceTimers.delete(trailingTimer);
          trailingTimer = null;
          lastRun = Date.now();
          if (!component.isDestroyed)
            fn(...args);
        }, remaining);
        component.debounceTimers.add(trailingTimer);
      }
    };
    handler.cancel = () => {
      if (trailingTimer) {
        clearTimeout(trailingTimer);
        component.debounceTimers.delete(trailingTimer);
        trailingTimer = null;
      }
    };
    return handler;
  }
  function ensureDelegatedEvent(component, eventName) {
    if (!component._delegatedEventTypes) {
      component._delegatedEventTypes = new Set;
    }
    if (component._delegatedEventTypes.has(eventName))
      return;
    component._delegatedEventTypes.add(eventName);
    const handler = (e) => handleDelegatedEvent(component, e);
    component.root.addEventListener(eventName, handler);
    if (!component._delegatedCleanups)
      component._delegatedCleanups = [];
    component._delegatedCleanups.push(() => component.root.removeEventListener(eventName, handler));
  }
  function handleDelegatedEvent(component, e) {
    let cur = e.target;
    let propagationStopped = false;
    const originalStop = e.stopPropagation;
    e.stopPropagation = function() {
      propagationStopped = true;
      originalStop.apply(this, arguments);
    };
    try {
      while (cur && cur.nodeType === 1) {
        const list = cur.__sx_handlers && cur.__sx_handlers[e.type];
        if (list && list.length) {
          const snapshot = list.slice();
          for (let i = 0;i < snapshot.length; i++) {
            const entry = snapshot[i];
            if (entry.component !== component)
              continue;
            if (!propagationStopped) {
              entry.handler(e);
            }
          }
        }
        if (propagationStopped)
          break;
        if (cur === component.root)
          break;
        cur = cur.parentNode;
      }
    } finally {
      e.stopPropagation = originalStop;
    }
  }
  function scanEventDirectives(component, el, locals) {
    const toggleKey = el.getAttribute(ATTR_TOGGLE);
    if (toggleKey) {
      const handler = (ev) => {
        component.lastEvent = ev;
        component.withContext(el, locals, () => execInScope(`${toggleKey} = !(${toggleKey})`, component));
      };
      ensureDelegatedEvent(component, "click");
      if (!el.__sx_handlers)
        el.__sx_handlers = {};
      if (!el.__sx_handlers.click)
        el.__sx_handlers.click = [];
      el.__sx_handlers.click.push({ handler, component });
      component.eventHandlers.push({ el, event: "click", handler, delegated: true });
    }
    for (const attr of Array.from(el.attributes)) {
      if (!attr.name.startsWith(ATTR_ON_PREFIX))
        continue;
      const full = attr.name.slice(ATTR_ON_PREFIX.length);
      const [eventName, ...rawMods] = full.split(".");
      const mods = rawMods.map((m) => m.toLowerCase());
      const expr = attr.value;
      const isOnce = mods.includes("once");
      const isOutside = mods.includes("outside");
      const isPassive = mods.includes("passive");
      const isCapture = mods.includes("capture");
      const debounceMs = parseModifierDuration(mods, "debounce", 250);
      const throttleMs = parseModifierDuration(mods, "throttle", 250);
      let record = null;
      const runAction = (ev) => {
        if (component.isDestroyed)
          return;
        component.lastEvent = ev;
        component.withContext(el, locals, () => {
          execInScope(expr, component);
        });
      };
      let wrappedAction = runAction;
      if (debounceMs)
        wrappedAction = component.wrapDebounced(wrappedAction, debounceMs);
      else if (throttleMs)
        wrappedAction = wrapThrottled(component, wrappedAction, throttleMs);
      const handler = (ev) => {
        if (isOutside) {
          if (!el.isConnected || el.contains(ev.target))
            return;
        }
        if (mods.includes("self") && ev.target !== el)
          return;
        if (typeof KeyboardEvent !== "undefined" && ev instanceof KeyboardEvent) {
          if (!matchesKeyboardModifiers(ev, mods))
            return;
        }
        if (mods.includes("prevent") && !isPassive)
          ev.preventDefault();
        if (mods.includes("stop"))
          ev.stopPropagation();
        if (isOnce && record) {
          component.removeEventHandler(record);
          component.eventHandlers = component.eventHandlers.filter((r) => r !== record);
        }
        wrappedAction(ev);
      };
      handler.cancel = () => wrappedAction.cancel?.();
      const eventTarget = isOutside || mods.includes("document") ? document : mods.includes("window") ? window : el;
      const canDelegate = eventTarget === el && !isPassive && !isCapture && DELEGATED_EVENTS.has(eventName);
      if (canDelegate) {
        ensureDelegatedEvent(component, eventName);
        if (!el.__sx_handlers)
          el.__sx_handlers = {};
        if (!el.__sx_handlers[eventName])
          el.__sx_handlers[eventName] = [];
        el.__sx_handlers[eventName].push({ handler, component });
        record = { el, event: eventName, handler, delegated: true };
        component.eventHandlers.push(record);
      } else {
        const listenerOpts = isPassive || isCapture ? { passive: isPassive, capture: isCapture } : undefined;
        eventTarget.addEventListener(eventName, handler, listenerOpts);
        record = {
          el: eventTarget,
          sourceEl: el,
          event: eventName,
          handler,
          options: listenerOpts
        };
        component.eventHandlers.push(record);
      }
    }
  }

  // src/directives/structural.js
  function getActiveSelection() {
    if (typeof document === "undefined")
      return { focusedEl: null, selection: null };
    const focusedEl = document.activeElement;
    const selection = focusedEl && typeof focusedEl.selectionStart === "number" ? [focusedEl.selectionStart, focusedEl.selectionEnd, focusedEl.selectionDirection] : null;
    return { focusedEl, selection };
  }
  function restoreActiveSelection(root, focusedEl, selection) {
    if (typeof document === "undefined")
      return;
    if (focusedEl?.isConnected && root.contains(focusedEl) && document.activeElement !== focusedEl) {
      focusedEl.focus({ preventScroll: true });
      if (selection) {
        try {
          focusedEl.setSelectionRange(...selection);
        } catch {}
      }
    }
  }
  function isBlockDetached(block) {
    if (!block)
      return true;
    const { parent, marker } = block;
    if (!parent || !marker)
      return true;
    if (!parent.isConnected || !marker.isConnected)
      return true;
    if (marker.parentNode !== parent)
      return true;
    return false;
  }
  function mountNestedDataComponents(component, inst) {
    if (!inst?.elements || !inst.bindings)
      return;
    inst.bindings.nestedDataComponents = inst.bindings.nestedDataComponents || [];
    const nestedRoots = [];
    inst.elements.forEach((node) => {
      if (!node || node.nodeType !== 1)
        return;
      if (node.hasAttribute(ATTR_DATA))
        nestedRoots.push(node);
      node.querySelectorAll?.(`[${ATTR_DATA}]`).forEach((el) => nestedRoots.push(el));
    });
    const ComponentClass = component.constructor;
    nestedRoots.forEach((root) => {
      if (root.__sprucex)
        return;
      const mountRoot = () => {
        if (!root.isConnected || root.__sprucex)
          return;
        const nested = new ComponentClass(root, {
          parentComponent: component,
          locals: inst.scopeLocals
        });
        root.__sprucex = nested;
        inst.bindings.nestedDataComponents.push(nested);
      };
      if (root.hasAttribute(ATTR_LAZY) && typeof IntersectionObserver !== "undefined") {
        const io = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              io.disconnect();
              mountRoot();
              break;
            }
          }
        });
        io.observe(root);
        inst.bindings.lazyObservers = inst.bindings.lazyObservers || [];
        inst.bindings.lazyObservers.push(io);
      } else {
        mountRoot();
      }
    });
  }
  function disposeInstance(component, inst) {
    if (!inst)
      return;
    component.cleanupInstanceBindings(inst.bindings);
    if (inst.elements) {
      inst.elements.forEach((el) => el.remove());
    } else if (inst.fragmentRoot) {
      inst.fragmentRoot.remove();
    }
    const scope = component.integrationScopes.get(inst.scopeLocals);
    if (scope) {
      scope.teardownIntegrations();
      component.integrationScopes.delete(inst.scopeLocals);
    }
    component.pruneDetachedBindings(inst.elements || [inst.fragmentRoot]);
    inst.mounted = false;
  }
  function markInstanceDirty(component, inst) {
    if (!inst?.bindings)
      return;
    (inst.bindings.bindings || []).forEach((b) => {
      b.dirty = true;
      component.dirtyBindings.add(b);
    });
    (inst.bindings.modelBindings || []).forEach((m) => {
      m.dirty = true;
      component.dirtyModels.add(m);
    });
    (inst.bindings.elementEffects || []).forEach((e) => {
      component.dirtyEffects.add(e);
    });
    (inst.bindings.directiveInstances || []).forEach((d) => {
      d.effects.forEach((eff) => component.dirtyEffects.add(eff));
    });
    (inst.bindings.nestedForBlocks || []).forEach((b) => {
      b.dirty = true;
      component.dirtyForBlocks.add(b);
    });
    (inst.bindings.nestedIfBlocks || []).forEach((b) => {
      b.dirty = true;
      component.dirtyIfBlocks.add(b);
    });
  }
  function createIfBlock(component, el, expr, parent, marker, parentLocals) {
    const block = {
      template: el,
      parent,
      marker,
      expr,
      parentLocals,
      instance: null,
      dirty: true,
      tracked: false
    };
    const runner = effect(() => {
      const prevLocals = component.locals;
      if (block.parentLocals)
        component.locals = block.parentLocals;
      try {
        return !!safeEval(block.expr, component);
      } finally {
        component.locals = prevLocals;
      }
    }, {
      lazy: true,
      scheduler() {
        block.dirty = true;
        component.dirtyIfBlocks.add(block);
        component.scheduleUpdate(false);
      }
    });
    block._evalCond = () => {
      const val = runner();
      block.tracked = runner.effect.deps.length > 0;
      return val;
    };
    block.dispose = () => {
      runner.stop();
      component.dirtyIfBlocks.delete(block);
    };
    component.ifBlocks.push(block);
    component.dirtyIfBlocks.add(block);
    return block;
  }
  function teardownIfBlock(component, block) {
    if (!block)
      return;
    block.dispose?.();
    if (block.instance) {
      disposeInstance(component, block.instance);
      block.instance = null;
    }
    const idx = component.ifBlocks.indexOf(block);
    if (idx !== -1)
      component.ifBlocks.splice(idx, 1);
  }
  function teardownDetachedIfBlocks(component) {
    component.ifBlocks.slice().forEach((block) => {
      if (isBlockDetached(block)) {
        teardownIfBlock(component, block);
      }
    });
  }
  function teardownAllIfBlocks(component) {
    component.ifBlocks.slice().forEach((block) => {
      teardownIfBlock(component, block);
      if (block.template && block.marker && block.marker.parentNode) {
        block.marker.parentNode.insertBefore(block.template, block.marker);
        block.marker.remove();
      }
    });
    component.ifBlocks = [];
    component.dirtyIfBlocks.clear();
  }
  function renderIfBlocks(component, forceAll = true) {
    let structureChanged = false;
    teardownDetachedIfBlocks(component);
    let idx = 0;
    while (idx < component.ifBlocks.length) {
      const block = component.ifBlocks[idx];
      if (!block) {
        idx++;
        continue;
      }
      if (isBlockDetached(block)) {
        teardownIfBlock(component, block);
        structureChanged = true;
        continue;
      }
      if (!forceAll && block.tracked && !block.dirty) {
        idx++;
        continue;
      }
      block.dirty = false;
      component.dirtyIfBlocks.delete(block);
      const shouldShow = block._evalCond();
      if (shouldShow && !block.instance) {
        const frag = block.template.content ? block.template.content.cloneNode(true) : cloneChildren(block.template);
        const elements = [];
        while (frag.firstChild) {
          const child = frag.firstChild;
          elements.push(child);
          frag.removeChild(child);
        }
        const locals = block.parentLocals || component.locals;
        const instanceBindings = createEmptyInstanceBindings();
        elements.forEach((node) => {
          const scanned = component.scanFragmentBindings(node, locals);
          mergeInstanceBindings(instanceBindings, scanned);
        });
        const inst = {
          scopeLocals: locals,
          elements,
          bindings: instanceBindings,
          mounted: false
        };
        elements.forEach((node) => {
          block.parent.insertBefore(node, block.marker);
        });
        mountNestedDataComponents(component, inst);
        inst.mounted = true;
        block.instance = inst;
        structureChanged = true;
      } else if (!shouldShow && block.instance) {
        disposeInstance(component, block.instance);
        block.instance = null;
        structureChanged = true;
      }
      idx++;
    }
    return structureChanged;
  }
  function createForBlock(component, config) {
    const block = {
      ...config,
      instances: [],
      dirty: true,
      tracked: false
    };
    const runner = effect(() => {
      const prevLocals = component.locals;
      if (block.parentLocals)
        component.locals = block.parentLocals;
      try {
        const collection = safeEval(block.def.iterable, component) || [];
        return Array.from(collection);
      } finally {
        component.locals = prevLocals;
      }
    }, {
      lazy: true,
      scheduler() {
        block.dirty = true;
        component.dirtyForBlocks.add(block);
        component.scheduleUpdate(false);
      }
    });
    block._evalArray = () => {
      const arr = runner();
      block.tracked = runner.effect.deps.length > 0;
      return arr;
    };
    block.dispose = () => {
      runner.stop();
      component.dirtyForBlocks.delete(block);
    };
    component.forBlocks.push(block);
    component.dirtyForBlocks.add(block);
    return block;
  }
  function teardownForBlock(component, block) {
    if (!block)
      return;
    block.dispose?.();
    const instances = Array.isArray(block.instances) ? [...block.instances] : [];
    instances.forEach((inst) => {
      disposeInstance(component, inst);
    });
    if (block.instances)
      block.instances.length = 0;
    const idx = component.forBlocks.indexOf(block);
    if (idx !== -1)
      component.forBlocks.splice(idx, 1);
  }
  function teardownDetachedForBlocks(component) {
    component.forBlocks.slice().forEach((block) => {
      if (isBlockDetached(block)) {
        teardownForBlock(component, block);
      }
    });
  }
  function teardownAllForBlocks(component) {
    component.forBlocks.slice().forEach((block) => {
      teardownForBlock(component, block);
      if (block.template && block.marker && block.marker.parentNode) {
        block.marker.parentNode.insertBefore(block.template, block.marker);
        block.marker.remove();
      }
    });
    component.forBlocks = [];
    component.dirtyForBlocks.clear();
  }
  function renderForBlocks(component, forceAll = true) {
    let structureChanged = false;
    const { focusedEl, selection } = getActiveSelection();
    teardownDetachedForBlocks(component);
    let blockIndex = 0;
    while (blockIndex < component.forBlocks.length) {
      const block = component.forBlocks[blockIndex];
      if (!block) {
        blockIndex += 1;
        continue;
      }
      if (isBlockDetached(block)) {
        teardownForBlock(component, block);
        structureChanged = true;
        continue;
      }
      if (!forceAll && block.tracked && !block.dirty) {
        blockIndex += 1;
        continue;
      }
      block.dirty = false;
      component.dirtyForBlocks.delete(block);
      const { def, template, parent, marker, instances, parentLocals, keyExpr } = block;
      const arr = block._evalArray();
      const instanceBuckets = new Map;
      instances.forEach((inst) => {
        const key = inst.itemKey;
        if (!instanceBuckets.has(key))
          instanceBuckets.set(key, []);
        instanceBuckets.get(key).push(inst);
      });
      const newInstances = [];
      const reusedInstances = new Set;
      const seenKeys = new Set;
      for (let i = 0;i < arr.length; i++) {
        const item = arr[i];
        const idxName = def.index || "$index";
        const localsForKey = parentLocals ? { ...parentLocals } : {};
        localsForKey[def.item] = item;
        localsForKey[idxName] = i;
        let key = i;
        if (keyExpr) {
          const prevLocalsForKey = component.locals;
          component.locals = localsForKey;
          try {
            key = safeEval(keyExpr, component);
          } finally {
            component.locals = prevLocalsForKey;
          }
          if (key === undefined || key === null)
            key = i;
        }
        if (seenKeys.has(key)) {
          console.warn("SpruceX sx-for detected a duplicate key. This can cause unstable row reuse.", key);
        }
        seenKeys.add(key);
        const bucket = instanceBuckets.get(key);
        const inst = bucket && bucket.length > 0 ? bucket.shift() : null;
        if (inst) {
          let localsChanged = !Object.is(inst.scopeLocals[def.item], item) || !Object.is(inst.scopeLocals[idxName], i);
          if (parentLocals) {
            Object.keys(parentLocals).forEach((parentKey) => {
              if (!Object.is(inst.scopeLocals[parentKey], parentLocals[parentKey])) {
                inst.scopeLocals[parentKey] = parentLocals[parentKey];
                localsChanged = true;
              }
            });
          }
          inst.scopeLocals[def.item] = item;
          inst.scopeLocals[idxName] = i;
          if (localsChanged) {
            markInstanceDirty(component, inst);
          }
          (inst.bindings.nestedDataComponents || []).forEach((nestedComp) => {
            Object.assign(nestedComp.locals, inst.scopeLocals);
            if (localsChanged) {
              nestedComp.markAllDirty();
              nestedComp.scheduleUpdate();
            }
          });
          newInstances.push(inst);
          reusedInstances.add(inst);
        } else {
          structureChanged = true;
          const locals = parentLocals ? { ...parentLocals } : {};
          locals[def.item] = item;
          locals[idxName] = i;
          const frag = template.content ? template.content.cloneNode(true) : cloneChildren(template);
          const elements = [];
          while (frag.firstChild) {
            const child = frag.firstChild;
            elements.push(child);
            frag.removeChild(child);
          }
          const instanceBindings = createEmptyInstanceBindings();
          elements.forEach((el) => {
            const elBindings = component.scanFragmentBindings(el, locals);
            mergeInstanceBindings(instanceBindings, elBindings);
          });
          const newInst = {
            scopeLocals: locals,
            elements,
            bindings: instanceBindings,
            itemKey: key,
            mounted: false
          };
          newInstances.push(newInst);
        }
      }
      instances.forEach((inst) => {
        if (!reusedInstances.has(inst)) {
          structureChanged = true;
          disposeInstance(component, inst);
        }
      });
      let anchor = marker;
      for (let i = newInstances.length - 1;i >= 0; i--) {
        const inst = newInstances[i];
        for (let j = inst.elements.length - 1;j >= 0; j--) {
          const el = inst.elements[j];
          if (el.parentNode !== parent || el.nextSibling !== anchor) {
            parent.insertBefore(el, anchor);
            structureChanged = true;
          }
          anchor = el;
        }
        if (!inst.mounted) {
          mountNestedDataComponents(component, inst);
          inst.mounted = true;
        }
      }
      block.instances.length = 0;
      block.instances.push(...newInstances);
      blockIndex += 1;
    }
    restoreActiveSelection(component.root, focusedEl, selection);
    return structureChanged;
  }
  function createEmptyInstanceBindings() {
    return {
      bindings: [],
      memoBindings: [],
      modelBindings: [],
      eventHandlers: [],
      netBindings: [],
      elementEffects: [],
      directiveInstances: [],
      nestedForBlocks: [],
      nestedIfBlocks: [],
      nestedDataComponents: [],
      lazyObservers: []
    };
  }
  function mergeInstanceBindings(target, source) {
    target.bindings.push(...source.bindings);
    target.memoBindings.push(...source.memoBindings);
    target.modelBindings.push(...source.modelBindings);
    target.eventHandlers.push(...source.eventHandlers);
    target.netBindings.push(...source.netBindings);
    if (source.elementEffects)
      target.elementEffects.push(...source.elementEffects);
    if (source.directiveInstances) {
      target.directiveInstances.push(...source.directiveInstances);
    }
    if (source.nestedForBlocks)
      target.nestedForBlocks.push(...source.nestedForBlocks);
    if (source.nestedIfBlocks)
      target.nestedIfBlocks.push(...source.nestedIfBlocks);
  }

  // src/directives/registry.js
  var directiveRegistry = new Map;
  function normalizeName(name) {
    if (typeof name !== "string" || !name.trim()) {
      throw new Error("SpruceX directive name must be a non-empty string.");
    }
    const trimmed = name.trim();
    return trimmed.startsWith("sx-") ? trimmed.slice(3) : trimmed;
  }
  function registerDirective(name, handler) {
    const normalized = normalizeName(name);
    if (typeof handler !== "function") {
      throw new Error("SpruceX directive handler must be a function.");
    }
    directiveRegistry.set(normalized, handler);
    return handler;
  }
  function getDirective(name) {
    const normalized = normalizeName(name);
    return directiveRegistry.get(normalized);
  }
  function matchElementDirectives(el) {
    if (directiveRegistry.size === 0 || !el || !el.attributes)
      return [];
    const matches = [];
    for (const attr of Array.from(el.attributes)) {
      if (!attr.name.startsWith("sx-"))
        continue;
      const raw = attr.name.slice(3);
      const [baseName, ...modifiers] = raw.split(".");
      const handler = directiveRegistry.get(baseName);
      if (handler) {
        matches.push({
          name: baseName,
          attr: attr.name,
          expression: attr.value,
          modifiers,
          handler
        });
      }
    }
    return matches;
  }

  // src/utils/morph.js
  function morphNodes(target, source) {
    const morphedIds = new Set;
    const sourceIds = new Map;
    source.querySelectorAll("[id]").forEach((el) => {
      sourceIds.set(el.id, el);
    });
    sourceIds.forEach((sourceEl, id) => {
      const targetEl = target.querySelector(`#${CSS.escape(id)}`);
      if (targetEl) {
        morphElement(targetEl, sourceEl);
        morphedIds.add(id);
      }
    });
    morphChildren(target, source, morphedIds);
  }
  function morphElement(target, source) {
    if (target === source)
      return;
    if (target.isEqualNode(source))
      return;
    if (target.tagName !== source.tagName) {
      target.replaceWith(source.cloneNode(true));
      return;
    }
    if (target.hasAttribute("sx-preserve"))
      return;
    syncAttributes(target, source);
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      if (target.value !== source.value) {
        target.value = source.value;
      }
      if (target.checked !== source.checked) {
        target.checked = source.checked;
      }
      return;
    }
    if (target.tagName === "SELECT") {
      morphChildren(target, source, new Set);
      if (target.value !== source.value) {
        target.value = source.value;
      }
      return;
    }
    morphChildren(target, source, new Set);
  }
  function morphChildren(target, source, morphedIds) {
    const sourceChildren = Array.from(source.childNodes);
    const targetKeyedMap = new Map;
    const targetIdMap = new Map;
    for (let child = target.firstChild;child; child = child.nextSibling) {
      if (child.nodeType === 1) {
        const key = child.getAttribute?.("sx-key") || child.getAttribute?.("key");
        if (key)
          targetKeyedMap.set(key, child);
        const id = child.id;
        if (id)
          targetIdMap.set(id, child);
      }
    }
    let cursor = target.firstChild;
    for (let i = 0;i < sourceChildren.length; i++) {
      const sourceChild = sourceChildren[i];
      if (sourceChild.nodeType === 3 || sourceChild.nodeType === 8) {
        if (cursor && cursor.nodeType === sourceChild.nodeType) {
          if (cursor.nodeValue !== sourceChild.nodeValue) {
            cursor.nodeValue = sourceChild.nodeValue;
          }
          cursor = cursor.nextSibling;
        } else {
          const clone = sourceChild.cloneNode(true);
          target.insertBefore(clone, cursor);
        }
        continue;
      }
      if (sourceChild.nodeType === 1) {
        const sourceId = sourceChild.id;
        if (sourceId && morphedIds.has(sourceId)) {
          const existingById = targetIdMap.get(sourceId);
          if (existingById && existingById.parentNode === target) {
            targetIdMap.delete(sourceId);
            if (existingById === cursor) {
              cursor = cursor.nextSibling;
            } else {
              target.insertBefore(existingById, cursor);
            }
          } else if (cursor) {
            cursor = cursor.nextSibling;
          }
          continue;
        }
        const sourceKey = sourceChild.getAttribute?.("sx-key") || sourceChild.getAttribute?.("key");
        let matchedTarget = null;
        if (sourceKey && targetKeyedMap.has(sourceKey)) {
          matchedTarget = targetKeyedMap.get(sourceKey);
          targetKeyedMap.delete(sourceKey);
        } else if (sourceId && targetIdMap.has(sourceId)) {
          matchedTarget = targetIdMap.get(sourceId);
          targetIdMap.delete(sourceId);
        } else if (cursor?.nodeType === 1 && cursor.tagName === sourceChild.tagName) {
          const targetKey = cursor.getAttribute?.("sx-key") || cursor.getAttribute?.("key");
          if (!targetKey) {
            matchedTarget = cursor;
          }
        }
        if (matchedTarget) {
          const wasCursor = matchedTarget === cursor;
          const nextAfterCursor = wasCursor ? cursor.nextSibling : cursor;
          morphElement(matchedTarget, sourceChild);
          if (wasCursor) {
            cursor = matchedTarget.parentNode === target ? matchedTarget.nextSibling : nextAfterCursor;
          } else if (matchedTarget.parentNode === target) {
            target.insertBefore(matchedTarget, cursor);
          }
        } else {
          const clone = sourceChild.cloneNode(true);
          target.insertBefore(clone, cursor);
        }
      }
    }
    while (cursor) {
      const extra = cursor;
      cursor = cursor.nextSibling;
      if (extra.__sprucex)
        extra.__sprucex.destroy();
      if (extra.nodeType === 1) {
        extra.querySelectorAll?.(`[${ATTR_DATA}]`).forEach((el) => {
          if (el.__sprucex)
            el.__sprucex.destroy();
        });
      }
      extra.remove();
    }
  }
  function syncAttributes(target, source) {
    const targetAttrs = Array.from(target.attributes);
    for (const attr of targetAttrs) {
      if (!source.hasAttribute(attr.name)) {
        target.removeAttribute(attr.name);
      }
    }
    const sourceAttrs = Array.from(source.attributes);
    for (const attr of sourceAttrs) {
      if (target.getAttribute(attr.name) !== attr.value) {
        target.setAttribute(attr.name, attr.value);
      }
    }
  }

  // src/core/network.js
  function scanNetworkDirectives(component, el, locals) {
    for (const m of NET_METHODS) {
      const attrName = `sx-${m}`;
      const urlTpl = el.getAttribute(attrName);
      if (!urlTpl)
        continue;
      const trigger2 = el.getAttribute(ATTR_TRIGGER) || (el.tagName === "FORM" ? "submit" : "click");
      const triggerDebounce = el.getAttribute(ATTR_TRIGGER_DEBOUNCE);
      const target = el.getAttribute(ATTR_TARGET) || null;
      const swap = el.getAttribute(ATTR_SWAP) || "innerHTML";
      const select = el.getAttribute(ATTR_SELECT) || null;
      const pushUrl = el.hasAttribute(ATTR_PUSH_URL) ? el.getAttribute(ATTR_PUSH_URL) || "true" : null;
      const replaceUrl = el.hasAttribute(ATTR_REPLACE_URL) ? el.getAttribute(ATTR_REPLACE_URL) || "true" : null;
      const varsExpr = el.getAttribute(ATTR_VARS);
      const paramsExpr = el.getAttribute(ATTR_PARAMS);
      const jsonIntoShallow = el.getAttribute(ATTR_JSON_INTO_SHALLOW);
      const jsonInto = jsonIntoShallow || el.getAttribute(ATTR_JSON_INTO);
      const shallowJson = Boolean(jsonIntoShallow);
      const optimistic = el.getAttribute(ATTR_OPTIMISTIC);
      const revertOnError = el.getAttribute(ATTR_REVERT_ON_ERROR);
      const poll = el.getAttribute(ATTR_POLL);
      const pollWhile = el.getAttribute(ATTR_POLL_WHILE);
      const pollBackground = el.hasAttribute(ATTR_POLL_BACKGROUND);
      const includeSelector = el.getAttribute(ATTR_INCLUDE);
      const bodyExpr = el.getAttribute(ATTR_BODY);
      const bodyType = el.getAttribute(ATTR_BODY_TYPE);
      const headersExpr = el.getAttribute(ATTR_HEADERS);
      const loadingInto = el.getAttribute(ATTR_LOADING_INTO);
      const errorInto = el.getAttribute(ATTR_ERROR_INTO);
      const disableWhileRequest = el.hasAttribute(ATTR_DISABLE_WHILE_REQUEST);
      const textWhileRequest = el.getAttribute(ATTR_TEXT_WHILE_REQUEST);
      const confirmExpr = el.getAttribute(ATTR_CONFIRM);
      const cancelPrevious = el.hasAttribute(ATTR_CANCEL_PREVIOUS);
      const binding = {
        el,
        locals,
        scope: Object.assign(Object.create(component), { locals, currentEl: el }),
        method: m.toUpperCase(),
        urlTpl,
        trigger: trigger2,
        triggerDebounce,
        target,
        swap,
        select,
        pushUrl,
        replaceUrl,
        varsExpr,
        paramsExpr,
        jsonInto,
        shallowJson,
        optimistic,
        revertOnError,
        poll: poll ? Number(poll) : null,
        pollWhile,
        pollBackground,
        includeSelector,
        bodyExpr,
        bodyType,
        headersExpr,
        loadingInto,
        errorInto,
        disableWhileRequest,
        textWhileRequest,
        confirmExpr,
        cancelPrevious
      };
      component.netBindings.push(binding);
    }
  }
  function parseNetworkTriggers(nb) {
    const fallbackDebounce = Number(nb.triggerDebounce);
    const defaultDebounceMs = Number.isFinite(fallbackDebounce) && fallbackDebounce > 0 ? fallbackDebounce : null;
    const raw = (nb.trigger || "").trim();
    const fallback = nb.el.tagName === "FORM" ? "submit" : "click";
    if (!raw) {
      return [{ eventName: fallback, debounceMs: defaultDebounceMs, from: null }];
    }
    const clauses = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const result = [];
    for (const clause of clauses) {
      const words = clause.split(/\s+/).filter(Boolean);
      let i = 0;
      while (i < words.length) {
        const token = words[i];
        let from = null;
        if (words[i + 1] && words[i + 1].startsWith("from:")) {
          from = words[i + 1].slice(5);
          i += 2;
        } else {
          i += 1;
        }
        const parts = token.split(".");
        const eventName = parts[0] || fallback;
        let triggerDebounce = defaultDebounceMs;
        const debounceIdx = parts.indexOf("debounce");
        if (debounceIdx !== -1) {
          const rawMs = String(parts[debounceIdx + 1] || "").replace(/ms$/i, "");
          const parsed = Number(rawMs);
          if (Number.isFinite(parsed) && parsed > 0) {
            triggerDebounce = parsed;
          }
        }
        result.push({ eventName, debounceMs: triggerDebounce, from });
      }
    }
    return result.length ? result : [{ eventName: fallback, debounceMs: defaultDebounceMs, from: null }];
  }
  function resolveTriggerTarget(component, el, from) {
    if (!from)
      return el;
    if (from === "window")
      return typeof window !== "undefined" ? window : null;
    if (from === "document")
      return typeof document !== "undefined" ? document : null;
    if (from === "closest")
      return el.parentElement;
    const rootNode = component.root.getRootNode?.() || document;
    return rootNode.querySelector?.(from) || document.querySelector?.(from) || null;
  }
  function setupNetworkBindings(component) {
    for (const nb of component.netBindings) {
      if (nb.initialized)
        continue;
      nb.initialized = true;
      nb.disposers = [];
      const { el, poll, pollWhile, pollBackground } = nb;
      const triggerDefs = parseNetworkTriggers(nb);
      const doReq = (ev = null) => {
        if (ev) {
          component.lastEvent = ev;
          if (ev.type === "submit")
            ev.preventDefault();
        }
        nb.scope.lastEvent = ev || component.lastEvent;
        if (nb.disposed || component.isDestroyed || !nb.scope.confirmRequest(nb))
          return;
        performRequest(component, nb);
      };
      triggerDefs.forEach(({ eventName, debounceMs, from }) => {
        if (eventName === "load") {
          queueMicrotask(() => doReq());
          return;
        }
        const domHandler = component.wrapDebounced(doReq, debounceMs);
        const listenTarget = resolveTriggerTarget(component, el, from);
        if (listenTarget) {
          listenTarget.addEventListener(eventName, domHandler);
          component.eventHandlers.push({
            el: listenTarget,
            sourceEl: el,
            event: eventName,
            handler: domHandler
          });
        }
        if (!from) {
          const compHandler = component.wrapDebounced(() => doReq(), debounceMs);
          component.emitter.addEventListener(eventName, compHandler);
          const emitterRecord = { event: eventName, handler: compHandler };
          component.emitterHandlers.push(emitterRecord);
          nb.disposers.push(() => {
            compHandler.cancel?.();
            component.emitter.removeEventListener(eventName, compHandler);
            component.emitterHandlers = component.emitterHandlers.filter((record) => record !== emitterRecord);
          });
        }
      });
      if (poll && !Number.isNaN(poll) && poll > 0) {
        let skippedWhileHidden = false;
        const tick = () => {
          if (nb.disposed || component.isDestroyed)
            return;
          if (!pollBackground && typeof document !== "undefined" && document.hidden) {
            skippedWhileHidden = true;
            return;
          }
          if (pollWhile) {
            const ok = !!safeEval(pollWhile, nb.scope);
            if (!ok)
              return;
          }
          skippedWhileHidden = false;
          performRequest(component, nb);
        };
        const timer = setInterval(tick, poll);
        component.pollTimers.push(timer);
        let onVisibilityChange = null;
        if (!pollBackground && typeof document !== "undefined") {
          onVisibilityChange = () => {
            if (!document.hidden && skippedWhileHidden) {
              tick();
            }
          };
          document.addEventListener("visibilitychange", onVisibilityChange);
        }
        nb.disposers.push(() => {
          clearInterval(timer);
          component.pollTimers = component.pollTimers.filter((entry) => entry !== timer);
          if (onVisibilityChange && typeof document !== "undefined") {
            document.removeEventListener("visibilitychange", onVisibilityChange);
          }
        });
      }
    }
  }
  function buildUrl(scope, nb) {
    const { urlTpl, varsExpr, paramsExpr } = nb;
    let url = urlTpl;
    if (varsExpr) {
      const vars = safeEval(varsExpr, scope) || {};
      url = url.replace(/\$\{([A-Za-z_$][A-Za-z0-9_$.]*)\}/g, (_match, key) => {
        const segments = key.split(".");
        let value = vars;
        for (const seg of segments) {
          if (value == null)
            return "";
          value = value[seg];
        }
        if (value == null)
          return "";
        return encodeURIComponent(String(value));
      });
    }
    if (paramsExpr) {
      const paramsObj = safeEval(paramsExpr, scope);
      if (paramsObj && typeof paramsObj === "object") {
        const searchParams = new URLSearchParams;
        for (const [k, v] of Object.entries(paramsObj)) {
          if (v === null || v === undefined || v === "")
            continue;
          if (Array.isArray(v)) {
            v.forEach((item) => {
              if (item !== null && item !== undefined) {
                searchParams.append(k, String(item));
              }
            });
          } else {
            searchParams.append(k, String(v));
          }
        }
        const qs = searchParams.toString();
        if (qs) {
          url += (url.includes("?") ? "&" : "?") + qs;
        }
      }
    }
    const baseUrl = scope.constructor?.baseUrl;
    if (baseUrl && typeof baseUrl === "string" && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) && !url.startsWith("//")) {
      const trimmedBase = baseUrl.replace(/\/+$/, "");
      const trimmedUrl = url.startsWith("/") ? url : `/${url}`;
      url = `${trimmedBase}${trimmedUrl}`;
    }
    return url;
  }
  function buildBody(scope, nb) {
    const { el, method, includeSelector, bodyExpr, bodyType } = nb;
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return { body: null, bodyKind: null };
    }
    if (bodyExpr) {
      const value = scope.evaluateExpressionOrLiteral(bodyExpr);
      const resolvedType = resolveBodyType(bodyType, value);
      if (resolvedType === "json") {
        return {
          body: typeof value === "string" ? value : JSON.stringify(value ?? {}),
          bodyKind: "json"
        };
      }
      if (resolvedType === "form") {
        const fd = toFormData(value);
        if (fd instanceof FormData && includeSelector) {
          appendIncludeData(scope, fd, includeSelector);
        }
        return { body: fd, bodyKind: "form" };
      }
      return { body: value ?? null, bodyKind: null };
    }
    if (el.tagName === "FORM") {
      const fd = new FormData(el);
      if (includeSelector) {
        appendIncludeData(scope, fd, includeSelector);
      }
      if ((bodyType || "").toLowerCase() === "json") {
        return {
          body: JSON.stringify(formDataToJson(fd)),
          bodyKind: "json"
        };
      }
      return { body: fd, bodyKind: "form" };
    }
    return { body: null, bodyKind: null };
  }
  function resolveBodyType(rawType, value) {
    const lowered = (rawType || "").toLowerCase();
    if (lowered === "json" || lowered === "form")
      return lowered;
    if (value instanceof FormData || value instanceof URLSearchParams)
      return "form";
    if (value && typeof value === "object" && !(value instanceof Blob) && !(value instanceof ArrayBuffer)) {
      return "json";
    }
    return null;
  }
  function toFormData(value) {
    if (value instanceof FormData)
      return value;
    if (value instanceof URLSearchParams) {
      const fd2 = new FormData;
      value.forEach((v, k) => fd2.append(k, v));
      return fd2;
    }
    const fd = new FormData;
    if (value == null)
      return fd;
    if (typeof value === "string") {
      const params = new URLSearchParams(value);
      let appended = false;
      params.forEach((v, k) => {
        fd.append(k, v);
        appended = true;
      });
      if (!appended)
        fd.append("value", value);
      return fd;
    }
    if (typeof value !== "object") {
      fd.append("value", String(value));
      return fd;
    }
    Object.entries(value).forEach(([k, v]) => appendFormValue(fd, k, v));
    return fd;
  }
  function appendFormValue(fd, key, value) {
    if (Array.isArray(value)) {
      value.forEach((item) => appendFormValue(fd, key, item));
      return;
    }
    if (value instanceof Blob) {
      fd.append(key, value);
      return;
    }
    if (value && typeof value === "object") {
      fd.append(key, JSON.stringify(value));
      return;
    }
    fd.append(key, value == null ? "" : String(value));
  }
  function appendIncludeData(scope, fd, includeSelector) {
    const rootNode = scope.root?.getRootNode?.() || document;
    const nodes = rootNode.querySelectorAll ? rootNode.querySelectorAll(includeSelector) : document.querySelectorAll(includeSelector);
    nodes.forEach((extra) => {
      if (extra.tagName === "FORM") {
        new FormData(extra).forEach((v, k) => fd.append(k, v));
        return;
      }
      appendElementValue(fd, extra);
      if (extra.querySelectorAll) {
        extra.querySelectorAll("input[name], select[name], textarea[name]").forEach((input) => appendElementValue(fd, input));
      }
    });
  }
  function appendElementValue(fd, el) {
    if (!("name" in el) || !el.name)
      return;
    if ("disabled" in el && el.disabled)
      return;
    const type = (el.type || "").toLowerCase();
    if ((type === "checkbox" || type === "radio") && !el.checked)
      return;
    if (el.tagName === "SELECT" && el.multiple) {
      Array.from(el.selectedOptions || []).forEach((opt) => fd.append(el.name, opt.value));
      return;
    }
    fd.append(el.name, el.value ?? "");
  }
  function formDataToJson(fd) {
    const out = {};
    fd.forEach((value, key) => {
      const normalized = value instanceof File ? value.name : value;
      if (key in out) {
        if (Array.isArray(out[key]))
          out[key].push(normalized);
        else
          out[key] = [out[key], normalized];
      } else {
        out[key] = normalized;
      }
    });
    return out;
  }
  function applyHeadersObject(headers, source) {
    if (!source)
      return;
    if (source instanceof Headers) {
      source.forEach((v, k) => headers.set(k, v));
    } else if (Array.isArray(source)) {
      source.forEach((entry) => {
        if (Array.isArray(entry) && entry.length >= 2) {
          headers.set(String(entry[0]), String(entry[1]));
        }
      });
    } else if (typeof source === "object") {
      Object.entries(source).forEach(([k, v]) => {
        if (v != null)
          headers.set(k, String(v));
      });
    }
  }
  function buildHeaders(scope, nb, bodyKind, hasBody) {
    const headers = new Headers;
    const globalHeaders = scope.constructor?.headers;
    if (typeof globalHeaders === "function") {
      applyHeadersObject(headers, globalHeaders({ url: nb.urlTpl, method: nb.method, el: nb.el }));
    } else if (globalHeaders) {
      applyHeadersObject(headers, globalHeaders);
    }
    const evaluated = nb.headersExpr ? safeEval(nb.headersExpr, scope) : undefined;
    applyHeadersObject(headers, evaluated);
    if (bodyKind === "json" && hasBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return headers;
  }
  function addCsrfHeader(component, headers, method) {
    const upperMethod = String(method || "GET").toUpperCase();
    if (["GET", "HEAD", "OPTIONS", "TRACE"].includes(upperMethod))
      return;
    const csrfToken = getCsrfToken(component);
    const headerName = component.constructor?.csrfHeaderName || DEFAULT_CSRF_HEADER_NAME;
    if (csrfToken && !headers.has(headerName)) {
      headers.set(headerName, csrfToken);
    }
  }
  function getCsrfToken(component) {
    if (typeof document === "undefined")
      return null;
    const cookieName = component.constructor?.csrfCookieName || DEFAULT_CSRF_COOKIE_NAME;
    const prefix = cookieName + "=";
    const cookies = document.cookie ? document.cookie.split(";") : [];
    for (const entry of cookies) {
      const cookie = entry.trim();
      if (cookie.startsWith(prefix)) {
        return decodeURIComponent(cookie.slice(prefix.length));
      }
    }
    return null;
  }
  function serializeError(error) {
    if (!error)
      return null;
    if (typeof error === "string")
      return { message: error };
    const result = {
      name: error.name || "Error",
      message: error.message || String(error),
      status: error.status
    };
    if (error.body !== undefined) {
      result.body = error.body;
    }
    return result;
  }
  async function performRequest(component, nb) {
    if (component.isDestroyed || nb.disposed)
      return;
    const scope = nb.scope || component;
    let url = buildUrl(scope, nb);
    const { body, bodyKind } = buildBody(scope, nb);
    const {
      el,
      method,
      target,
      swap,
      select,
      pushUrl,
      replaceUrl,
      jsonInto,
      shallowJson,
      optimistic,
      revertOnError,
      loadingInto,
      errorInto
    } = nb;
    const headers = buildHeaders(scope, nb, bodyKind, body != null);
    addCsrfHeader(component, headers, method);
    const fetchOptions = { method };
    if (body != null)
      fetchOptions.body = body;
    if (Array.from(headers.keys()).length > 0) {
      fetchOptions.headers = headers;
    }
    if (component.constructor?.credentials) {
      fetchOptions.credentials = component.constructor.credentials;
    }
    const beforeRequest = component.constructor?.beforeRequest;
    if (typeof beforeRequest === "function") {
      const reqCtx = { url, method, headers, options: fetchOptions, el, component };
      const proceed = await beforeRequest(reqCtx);
      if (proceed === false)
        return;
      url = reqCtx.url;
      if (Array.from(headers.keys()).length > 0 && !fetchOptions.headers) {
        fetchOptions.headers = headers;
      }
    }
    const { seq: requestSeq, controller } = component.beginNetworkRequest(nb);
    if (controller) {
      fetchOptions.signal = controller.signal;
    }
    const endUiState = scope.beginRequestUiState(nb);
    scope.assignStateValue(loadingInto, true);
    scope.assignStateValue(errorInto, null);
    if (optimistic) {
      execInScope(optimistic, scope);
    }
    try {
      const res = await fetch(url, fetchOptions);
      if (!component.isCurrentNetworkRequest(nb, requestSeq))
        return;
      const afterResponse = component.constructor?.afterResponse;
      if (typeof afterResponse === "function") {
        await afterResponse({ response: res, url, method, el, component });
        if (!component.isCurrentNetworkRequest(nb, requestSeq))
          return;
      }
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}: ${res.statusText}`);
        err.status = res.status;
        err.statusText = res.statusText;
        if (typeof res.text === "function") {
          try {
            const errText = await res.text();
            if (errText) {
              try {
                err.body = JSON.parse(errText);
              } catch {
                err.body = errText;
              }
            }
          } catch {}
        }
        throw err;
      }
      const text = typeof res.text === "function" ? await res.text() : "";
      if (!component.isCurrentNetworkRequest(nb, requestSeq))
        return;
      let json = null;
      if (jsonInto && text.trim().length) {
        try {
          json = JSON.parse(text);
          if (shallowJson && json && typeof json === "object") {
            markRaw(json);
          }
        } catch (e) {
          console.error("SpruceX JSON parse error:", e);
        }
      }
      if (jsonInto && json != null) {
        execInScope(`${jsonInto} = __sx_value`, scope, { __sx_value: json });
      } else if (swap !== "none") {
        applySwap(component, target || el, text, swap, select);
      }
      if (typeof history !== "undefined" && typeof window !== "undefined") {
        if (pushUrl) {
          const nextUrl = pushUrl === "true" ? url : pushUrl;
          history.pushState({ url: nextUrl }, "", nextUrl);
        } else if (replaceUrl) {
          const nextUrl = replaceUrl === "true" ? url : replaceUrl;
          history.replaceState({ url: nextUrl }, "", nextUrl);
        }
      }
      const detail = { response: res, text, json };
      el.dispatchEvent(new CustomEvent("success", { detail, bubbles: true }));
      el.dispatchEvent(new CustomEvent("sprucex:success", { detail, bubbles: true }));
    } catch (error) {
      if (component.isAbortError(error) || !component.isCurrentNetworkRequest(nb, requestSeq)) {
        return;
      }
      if (revertOnError) {
        execInScope(revertOnError, scope);
      }
      scope.assignStateValue(errorInto, serializeError(error));
      const detail = { error };
      el.dispatchEvent(new CustomEvent("error", { detail, bubbles: true }));
      el.dispatchEvent(new CustomEvent("sprucex:error", { detail, bubbles: true }));
    } finally {
      const isFinished = component.finishNetworkRequest(nb, requestSeq, controller);
      endUiState();
      if (!component.isDestroyed && isFinished) {
        scope.assignStateValue(loadingInto, false);
      }
    }
  }
  function extractSelectedHtml(html, select) {
    if (!select || typeof DOMParser === "undefined")
      return html;
    const parser = new DOMParser;
    const doc = parser.parseFromString(html, "text/html");
    const matched = doc.querySelector(select);
    return matched ? matched.outerHTML : "";
  }
  function applySwap(component, targetSelectorOrEl, html, swap, select = null) {
    if (swap === "none")
      return;
    const rootNode = component.root?.getRootNode?.() || document;
    const target = typeof targetSelectorOrEl === "string" ? rootNode.querySelector?.(targetSelectorOrEl) || document.querySelector(targetSelectorOrEl) : targetSelectorOrEl;
    if (!target)
      return;
    if (swap === "delete") {
      const parent = target.parentElement;
      if (target.__sprucex)
        target.__sprucex.destroy();
      target.remove();
      if (parent)
        component.hydrateAfterSwap(parent);
      return;
    }
    const contentHtml = select ? extractSelectedHtml(html, select) : html;
    const container = ["outerHTML", "before", "after"].includes(swap) ? target.parentElement : target;
    if (swap === "outerHTML" && target.__sprucex)
      target.__sprucex.destroy();
    switch (swap) {
      case "outerHTML":
        target.outerHTML = contentHtml;
        break;
      case "before":
        target.insertAdjacentHTML("beforebegin", contentHtml);
        break;
      case "after":
        target.insertAdjacentHTML("afterend", contentHtml);
        break;
      case "prepend":
        target.insertAdjacentHTML("afterbegin", contentHtml);
        break;
      case "append":
        target.insertAdjacentHTML("beforeend", contentHtml);
        break;
      case "morph":
      case "id-map": {
        const parser = new DOMParser;
        const doc = parser.parseFromString(`<div>${contentHtml}</div>`, "text/html");
        const source = doc.body.firstChild;
        if (source)
          morphNodes(target, source);
        break;
      }
      case "innerHTML":
      default:
        target.innerHTML = contentHtml;
    }
    component.hydrateAfterSwap(container);
  }

  // src/core/component.js
  class Component {
    constructor(root, options = {}) {
      this.root = root;
      this.parentComponent = options.parentComponent || null;
      this.locals = options.locals && typeof options.locals === "object" ? { ...options.locals } : {};
      this.currentEl = root;
      this.bindings = [];
      this.memoBindings = [];
      this.eventHandlers = [];
      this.emitterHandlers = [];
      this.netBindings = [];
      this.modelBindings = [];
      this.gridBindings = [];
      this.forBlocks = [];
      this.ifBlocks = [];
      this.elementEffects = [];
      this.pendingInits = [];
      this.cloakedElements = new Set;
      this.directiveInstances = new Map;
      this.pollTimers = [];
      this.debounceTimers = new Set;
      this.requestUiState = new WeakMap;
      this.netRequestMeta = new WeakMap;
      this.lastEvent = null;
      this.debug = Boolean(Component.debug);
      this.csp = Boolean(Component.csp);
      this.updatePending = false;
      this.isDestroyed = false;
      this.coarseDirty = false;
      this.refsDirty = true;
      this.dirtyBindings = new Set;
      this.dirtyModels = new Set;
      this.dirtyEffects = new Set;
      this.dirtyForBlocks = new Set;
      this.dirtyIfBlocks = new Set;
      this.nextTickQueue = [];
      this.originalClasses = new WeakMap;
      this.animatedElements = new Map;
      this.scannedElements = new WeakSet;
      this.directiveSignatures = new WeakMap;
      this.elementLocals = new WeakMap;
      this.integrationScopes = new Map;
      this.refs = {};
      this.emitter = typeof document !== "undefined" ? document.createElement("div") : null;
      this.emit = (name, detail) => {
        if (!this.emitter || typeof CustomEvent === "undefined")
          return;
        const evt = new CustomEvent(name, { detail, bubbles: false });
        this.emitter.dispatchEvent(evt);
      };
      this.dispatch = (name, detail) => {
        const target = this.currentEl || this.root;
        if (!target || typeof CustomEvent === "undefined")
          return false;
        const evt = new CustomEvent(name, { detail, bubbles: true, cancelable: true });
        return target.dispatchEvent(evt);
      };
      this.initState();
      this.collectRefs();
      this.initIntegrationBindings();
      this.scan(root);
      this.renderIfBlocks(true);
      this.renderForBlocks(true);
      this.applyInitialRender();
      this.callHook("init");
      queueMicrotask(() => {
        if (!this.isDestroyed)
          this.callHook("mounted");
      });
    }
    nextTick(fn) {
      const promise = new Promise((resolve) => {
        if (this.isDestroyed) {
          resolve();
          return;
        }
        if (this.updatePending) {
          this.nextTickQueue.push(resolve);
        } else {
          queueMicrotask(resolve);
        }
      });
      return typeof fn === "function" ? promise.then(() => fn.call(this.state)) : promise;
    }
    flushNextTicks() {
      if (!this.nextTickQueue.length)
        return;
      const queue = this.nextTickQueue.splice(0);
      for (let i = 0;i < queue.length; i++) {
        queue[i]();
      }
    }
    markAllDirty() {
      this.coarseDirty = true;
      this.refsDirty = true;
      this.bindings.forEach((b) => {
        b.dirty = true;
        this.dirtyBindings.add(b);
      });
      this.modelBindings.forEach((m) => {
        m.dirty = true;
        this.dirtyModels.add(m);
      });
      this.forBlocks.forEach((b) => {
        b.dirty = true;
        this.dirtyForBlocks.add(b);
      });
      this.ifBlocks.forEach((b) => {
        b.dirty = true;
        this.dirtyIfBlocks.add(b);
      });
    }
    scheduleUpdate(coarse = true) {
      if (this.isDestroyed)
        return;
      if (coarse)
        this.coarseDirty = true;
      if (this.updatePending)
        return;
      this.updatePending = true;
      const scheduleFrame = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (cb) => setTimeout(cb, 16);
      this.rafId = scheduleFrame(() => {
        this.updatePending = false;
        this.rafId = null;
        if (this.isDestroyed)
          return;
        const forceAll = this.coarseDirty;
        this.coarseDirty = false;
        const ifChanged = this.renderIfBlocks(forceAll);
        const forChanged = this.renderForBlocks(forceAll);
        if (ifChanged || forChanged || this.refsDirty) {
          this.collectRefs();
          this.refsDirty = false;
        }
        this.flushPendingInits();
        this.updateBindings(forceAll);
        this.updateModelBindings(forceAll);
        this.updateMemoBindings();
        this.flushDirtyEffects();
        this.updateIntegrations();
        this.revealCloakedElements();
        this.flushNextTicks();
      });
    }
    initState() {
      const rawExpr = (this.root.getAttribute(ATTR_DATA) || "{}").trim();
      const storeAccessor = (name) => {
        const store = getStore(name);
        if (store && storeSubscribers[name]) {
          storeSubscribers[name].add(this);
        }
        return store;
      };
      this.storeAccessor = storeAccessor;
      let raw;
      const inheritedLocals = this.locals && typeof this.locals === "object" ? this.locals : {};
      const jsonScript = this.root.querySelector("script[sx-init-data]");
      const looksLikeIdentifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(rawExpr);
      const evalInitExpr = (source) => {
        if (this.csp || isCspMode()) {
          return cspEval(source, {
            state: {},
            locals: inheritedLocals,
            magics: {
              $store: storeAccessor,
              $data: getDataFactory,
              $locals: inheritedLocals,
              $parent: this.parentComponent?.state || null,
              $el: this.root
            },
            extra: {}
          });
        }
        const fn = new Function("$store", "$data", "$locals", "$parent", "$el", `with($locals){ return (${source}); }`);
        return fn(storeAccessor, getDataFactory, inheritedLocals, this.parentComponent?.state || null, this.root);
      };
      if (jsonScript && looksLikeIdentifier) {
        try {
          raw = JSON.parse(jsonScript.textContent.trim() || "{}");
        } catch (e) {
          console.error("SpruceX sx-init-data JSON parse error:", e);
          raw = {};
        }
      } else {
        const dataRef = getDataExpressionReference(rawExpr);
        const registeredFactory = dataRef ? getDataFactory(dataRef) : undefined;
        const globalFactory = dataRef ? resolveGlobalDataReference(dataRef) : undefined;
        const resolvedFactory = registeredFactory !== undefined ? registeredFactory : globalFactory;
        try {
          if (dataRef && resolvedFactory !== undefined) {
            const callExprMatch = rawExpr.match(/^([A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*)\s*\(([\s\S]*)\)$/);
            const isDirectCallExpr = !!callExprMatch && callExprMatch[1] === dataRef;
            if (isDirectCallExpr && typeof resolvedFactory === "function") {
              const argsSource = callExprMatch[2].trim();
              const args = argsSource ? evalInitExpr(`[${argsSource}]`) : [];
              raw = resolvedFactory.apply(this.root, args);
            } else if (rawExpr === dataRef && typeof resolvedFactory === "function") {
              raw = resolvedFactory.call(this.root);
            } else if (rawExpr === dataRef) {
              raw = resolvedFactory;
            } else {
              raw = evalInitExpr(rawExpr);
            }
          } else {
            raw = evalInitExpr(rawExpr);
          }
        } catch (e) {
          const missingReference = e instanceof ReferenceError || /is not defined/.test(String(e && e.message ? e.message : ""));
          if (missingReference && isFactoryLikeDataExpression(rawExpr)) {
            throw createDataFactoryNotReadyError(rawExpr, e);
          }
          console.error("SpruceX sx-data parse error:", rawExpr, e);
          raw = {};
        }
      }
      if (typeof raw === "function") {
        try {
          raw = raw.call(this.root);
        } catch (e) {
          console.error("SpruceX sx-data factory execution error:", rawExpr, e);
          raw = {};
        }
      }
      if (raw == null || typeof raw !== "object") {
        raw = {};
      }
      const localKey = this.root.getAttribute(ATTR_LOCAL);
      if (localKey && typeof localStorage !== "undefined") {
        try {
          const stored = localStorage.getItem(localKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            Object.assign(raw, parsed);
          }
        } catch (e) {
          console.error("SpruceX sx-local load error:", e);
        }
      }
      Object.defineProperty(raw, "$emit", {
        value: this.emit,
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(raw, "$dispatch", {
        value: this.dispatch,
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(raw, "$nextTick", {
        value: (fn) => this.nextTick(fn),
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(raw, "$refs", {
        get: () => this.refs,
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(raw, "$el", {
        get: () => this.currentEl || this.root,
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(raw, "$parent", {
        get: () => this.parentComponent?.state || null,
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(raw, "$store", {
        value: (name) => {
          const store = getStore(name);
          if (store && storeSubscribers[name]) {
            storeSubscribers[name].add(this);
          }
          return store;
        },
        enumerable: false,
        configurable: true
      });
      let persistQueued = false;
      const flushLocalPersist = () => {
        persistQueued = false;
        if (this.isDestroyed || !localKey || typeof localStorage === "undefined")
          return;
        try {
          localStorage.setItem(localKey, JSON.stringify(toRaw(proxy)));
        } catch (e) {
          console.error("SpruceX sx-local save error:", e);
        }
      };
      const { proxy, stopWatchers } = createReactiveState(raw, () => {
        if (localKey && !persistQueued) {
          persistQueued = true;
          queueMicrotask(flushLocalPersist);
        }
        this.scheduleUpdate(false);
      });
      this.state = proxy;
      this._stopWatchers = stopWatchers;
    }
    collectRefs() {
      this.refs = {};
      walk(this.root, (el) => {
        if (el !== this.root && el.hasAttribute(ATTR_DATA))
          return false;
        const name = el.getAttribute("sx-ref");
        if (name)
          this.refs[name] = el;
      });
    }
    getElementLocals(el) {
      for (let node = el;node && node !== this.root; node = node.parentElement) {
        if (this.elementLocals.has(node))
          return this.elementLocals.get(node);
      }
      return this.locals;
    }
    withLocals(locals, fn) {
      const previous = this.locals;
      if (locals)
        this.locals = locals;
      try {
        return fn();
      } finally {
        this.locals = previous;
      }
    }
    withContext(el, locals, fn) {
      const prevEl = this.currentEl;
      const prevLocals = this.locals;
      if (el)
        this.currentEl = el;
      if (locals)
        this.locals = locals;
      try {
        return fn();
      } finally {
        this.currentEl = prevEl;
        this.locals = prevLocals;
      }
    }
    removeEventHandler(record) {
      record.handler.cancel?.();
      if (record.delegated) {
        const handlers = record.el.__sx_handlers?.[record.event];
        if (handlers) {
          record.el.__sx_handlers[record.event] = handlers.filter((entry) => entry.handler !== record.handler);
        }
      } else {
        record.el.removeEventListener(record.event, record.handler, record.options);
      }
    }
    handleDelegatedEvent(e) {
      return handleDelegatedEvent(this, e);
    }
    scan(root, locals = null, fragment = false) {
      walk(root, (el) => {
        if (el.nodeType !== 1)
          return false;
        if ((fragment || el !== root) && el.hasAttribute(ATTR_DATA))
          return false;
        if (el.tagName === "TEMPLATE" && el.hasAttribute(ATTR_FOR)) {
          const expr = el.getAttribute(ATTR_FOR) || "";
          const parent = el.parentElement;
          if (!parent)
            return false;
          const parentLocals = locals || this.getElementLocals(el);
          const marker = document.createComment("sx-for");
          parent.insertBefore(marker, el);
          el.remove();
          const forDef = parseForExpression(expr);
          if (!forDef) {
            console.error("SpruceX invalid sx-for expression:", expr);
            return false;
          }
          createForBlock(this, {
            template: el,
            parent,
            marker,
            expr,
            def: forDef,
            keyExpr: el.getAttribute("sx-key") || null,
            parentLocals,
            autoAnimate: parent.hasAttribute(ATTR_ANIMATE)
          });
          if (parent.hasAttribute(ATTR_ANIMATE)) {
            const opts = parent.getAttribute(ATTR_ANIMATE);
            let config = {};
            if (opts && opts !== "true" && opts !== "") {
              try {
                config = JSON.parse(opts);
              } catch {
                const duration = parseInt(opts, 10);
                if (!isNaN(duration))
                  config = { duration };
              }
            }
            this.setupAutoAnimate(parent, config);
          }
          return false;
        }
        if (el.tagName === "TEMPLATE" && el.hasAttribute(ATTR_IF)) {
          const expr = (el.getAttribute(ATTR_IF) || "").trim();
          const parent = el.parentElement;
          if (!parent)
            return false;
          const parentLocals = locals || this.getElementLocals(el);
          const marker = document.createComment("sx-if");
          parent.insertBefore(marker, el);
          el.remove();
          createIfBlock(this, el, expr, parent, marker, parentLocals);
          return false;
        }
        if (!this.scannedElements.has(el)) {
          this.scanElement(el, locals || this.getElementLocals(el));
        }
      });
      this.setupNetworkBindings();
    }
    directiveSignature(el) {
      const attrs = el.attributes;
      let sxAttrs = null;
      for (let i = 0;i < attrs.length; i++) {
        const attr = attrs[i];
        if (attr.name.startsWith("sx-")) {
          if (!sxAttrs)
            sxAttrs = [];
          sxAttrs.push([attr.name, attr.value]);
        }
      }
      if (!sxAttrs)
        return "";
      sxAttrs.sort(([a], [b]) => a.localeCompare(b));
      return JSON.stringify(sxAttrs);
    }
    scanElement(el, locals) {
      this.scannedElements.add(el);
      this.directiveSignatures.set(el, this.directiveSignature(el));
      this.elementLocals.set(el, locals);
      scanBindingDirectives(this, el, locals);
      scanEventDirectives(this, el, locals);
      scanNetworkDirectives(this, el, locals);
      this.mountElementDirectives(el, locals);
      this.scanIntegrations(el, locals);
      if (el.hasAttribute(ATTR_ANIMATE)) {
        const optionsStr = el.getAttribute(ATTR_ANIMATE);
        queueMicrotask(() => this.setupAutoAnimate(el, optionsStr || {}));
      }
    }
    mountElementDirectives(el, locals, onlyName = null) {
      const matches = matchElementDirectives(el);
      if (!matches.length)
        return [];
      const created = [];
      let existing = this.directiveInstances.get(el);
      for (const match of matches) {
        if (onlyName && match.name !== onlyName)
          continue;
        if (existing && existing.some((rec) => rec.attr === match.attr))
          continue;
        const record = {
          el,
          name: match.name,
          attr: match.attr,
          locals,
          cleanups: [],
          effects: []
        };
        const scopeView = locals && locals !== this.locals ? Object.assign(Object.create(this), {
          locals,
          currentEl: el,
          scheduleUpdate: this.scheduleUpdate.bind(this)
        }) : this;
        const evaluate = (exprOverride = match.expression) => this.withContext(el, locals, () => safeEval(exprOverride, this));
        const evaluateOrLiteral = (exprOverride = match.expression) => this.withContext(el, locals, () => this.evaluateExpressionOrLiteral(exprOverride));
        const cleanup = (fn) => {
          if (typeof fn === "function")
            record.cleanups.push(fn);
        };
        const registerEffect = (fn) => {
          let scheduled = false;
          const runner = effect(() => {
            if (this.isDestroyed)
              return;
            this.withContext(el, locals, () => fn());
          }, {
            lazy: true,
            scheduler: () => {
              if (scheduled || this.isDestroyed)
                return;
              scheduled = true;
              this.dirtyEffects.add(effEntry);
              this.scheduleUpdate(false);
            }
          });
          const effEntry = {
            el,
            locals,
            run: () => {
              scheduled = false;
              runner();
            },
            dispose: () => {
              runner.stop();
              this.dirtyEffects.delete(effEntry);
            }
          };
          record.effects.push(effEntry);
          effEntry.run();
          return effEntry.dispose;
        };
        try {
          const ret = match.handler(el, {
            el,
            name: match.name,
            attr: match.attr,
            expression: match.expression,
            expr: match.expression,
            modifiers: match.modifiers,
            component: scopeView,
            evaluate,
            evaluateOrLiteral,
            effect: registerEffect,
            cleanup
          });
          if (typeof ret === "function") {
            record.cleanups.push(ret);
          }
        } catch (e) {
          console.error(`SpruceX directive "${match.name}" error:`, e);
        }
        if (!existing) {
          existing = [];
          this.directiveInstances.set(el, existing);
        }
        existing.push(record);
        created.push(record);
        if (this._activeFragmentDirectives) {
          this._activeFragmentDirectives.push(record);
        }
      }
      return created;
    }
    disposeDirectiveRecord(record) {
      record.effects.forEach((eff) => eff.dispose());
      record.effects.length = 0;
      record.cleanups.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          console.error(`SpruceX directive "${record.name}" cleanup error:`, e);
        }
      });
      record.cleanups.length = 0;
    }
    disposeElementDirectives(el) {
      const records = this.directiveInstances.get(el);
      if (!records)
        return;
      records.forEach((rec) => this.disposeDirectiveRecord(rec));
      this.directiveInstances.delete(el);
    }
    disposeAllElementDirectives() {
      this.directiveInstances.forEach((records) => {
        records.forEach((rec) => this.disposeDirectiveRecord(rec));
      });
      this.directiveInstances.clear();
    }
    mountDirectiveOnExistingElements(name) {
      walk(this.root, (el) => {
        if (el !== this.root && el.hasAttribute(ATTR_DATA))
          return false;
        this.mountElementDirectives(el, this.getElementLocals(el), name);
      });
    }
    parseModelBindingConfig(direct, modifierAttrs) {
      return parseModelBindingConfig(direct, modifierAttrs);
    }
    setupModelBinding(el, locals = null) {
      return setupModelBinding(this, el, locals);
    }
    setupNetworkBindings() {
      return setupNetworkBindings(this);
    }
    parseNetworkTriggers(nb) {
      return parseNetworkTriggers(nb);
    }
    wrapDebounced(fn, debounceMs) {
      if (!debounceMs || debounceMs <= 0)
        return fn;
      let timer = null;
      const handler = (...args) => {
        if (timer) {
          clearTimeout(timer);
          this.debounceTimers.delete(timer);
        }
        timer = setTimeout(() => {
          this.debounceTimers.delete(timer);
          timer = null;
          if (!this.isDestroyed)
            fn(...args);
        }, debounceMs);
        this.debounceTimers.add(timer);
      };
      handler.cancel = () => {
        clearTimeout(timer);
        this.debounceTimers.delete(timer);
        timer = null;
      };
      return handler;
    }
    confirmRequest(nb) {
      if (nb.confirmExpr == null)
        return true;
      if (typeof window === "undefined" || typeof window.confirm !== "function") {
        return true;
      }
      const raw = String(nb.confirmExpr).trim();
      let message = raw || "Are you sure?";
      if (raw) {
        const evaluated = safeEval(raw, this);
        if (typeof evaluated === "string") {
          message = evaluated;
        } else if (evaluated !== undefined && evaluated !== null) {
          message = String(evaluated);
        }
      }
      return window.confirm(message);
    }
    setupAutoAnimate(el, options = {}) {
      const aa = getAutoAnimate();
      if (!aa)
        return null;
      if (typeof options === "string" && options.trim()) {
        try {
          options = JSON.parse(options);
        } catch {
          const evaluated = safeEval(options, this);
          options = evaluated && typeof evaluated === "object" ? evaluated : {};
        }
      }
      const finalOptions = {
        duration: 250,
        easing: "ease-in-out",
        ...options
      };
      try {
        const controller = aa(el, finalOptions);
        this.animatedElements.set(el, controller);
        return controller;
      } catch (e) {
        console.error("SpruceX auto-animate error:", e);
        return null;
      }
    }
    disableAutoAnimate(el) {
      const controller = this.animatedElements.get(el);
      if (controller && typeof controller === "function") {
        controller.disable?.();
      }
      this.animatedElements.delete(el);
    }
    buildUrl(nb) {
      return buildUrl(this, nb);
    }
    buildBody(nb) {
      return buildBody(this, nb);
    }
    buildHeaders(nb, bodyKind, hasBody) {
      return buildHeaders(this, nb, bodyKind, hasBody);
    }
    getCsrfToken() {
      return getCsrfToken(this);
    }
    addCsrfHeader(headers, method) {
      return addCsrfHeader(this, headers, method);
    }
    evaluateExpressionOrLiteral(raw) {
      const trimmed = String(raw ?? "").trim();
      if (!trimmed)
        return "";
      const evaluated = safeEval(trimmed, this);
      return evaluated === undefined ? trimmed : evaluated;
    }
    assignStateValue(targetExpr, value) {
      if (!targetExpr)
        return;
      execInScope(`${targetExpr} = __sx_value`, this, { __sx_value: value });
    }
    serializeError(error) {
      return serializeError(error);
    }
    beginRequestUiState(nb) {
      const { el, disableWhileRequest, textWhileRequest } = nb;
      if (!disableWhileRequest && textWhileRequest == null)
        return () => {};
      const current = this.requestUiState.get(el) || { count: 0, restoreFns: [] };
      if (current.count === 0) {
        current.restoreFns = this.applyRequestUiState(nb);
      }
      current.count += 1;
      this.requestUiState.set(el, current);
      return () => {
        const latest = this.requestUiState.get(el);
        if (!latest)
          return;
        latest.count -= 1;
        if (latest.count <= 0) {
          latest.restoreFns.forEach((fn) => fn());
          this.requestUiState.delete(el);
        } else {
          this.requestUiState.set(el, latest);
        }
      };
    }
    applyRequestUiState(nb) {
      const restoreFns = [];
      const { el, disableWhileRequest, textWhileRequest } = nb;
      if (disableWhileRequest) {
        this.getDisableTargets(el).forEach((target) => {
          const previous = !!target.disabled;
          target.disabled = true;
          restoreFns.push(() => {
            target.disabled = previous;
          });
        });
      }
      if (textWhileRequest != null) {
        const target = this.getTextWhileRequestTarget(el);
        if (target) {
          const nextText = String(this.evaluateExpressionOrLiteral(textWhileRequest));
          if (target.tagName === "INPUT") {
            const prev = target.value;
            target.value = nextText;
            restoreFns.push(() => {
              target.value = prev;
            });
          } else {
            const prev = target.textContent;
            target.textContent = nextText;
            restoreFns.push(() => {
              target.textContent = prev;
            });
          }
        }
      }
      return restoreFns;
    }
    getDisableTargets(el) {
      if (el.tagName === "FORM") {
        return Array.from(el.elements || []).filter((node) => node && ("disabled" in node) && node.type !== "hidden");
      }
      return "disabled" in el ? [el] : [];
    }
    getTextWhileRequestTarget(el) {
      if (el.tagName !== "FORM")
        return el;
      return el.querySelector("button[type='submit']") || el.querySelector("button:not([type])") || el.querySelector("input[type='submit']");
    }
    clearDebounceTimers() {
      this.debounceTimers.forEach((timer) => clearTimeout(timer));
      this.debounceTimers.clear();
    }
    clearEmitterHandlers() {
      if (this.emitter) {
        this.emitterHandlers.forEach(({ event, handler }) => {
          this.emitter.removeEventListener(event, handler);
        });
      }
      this.emitterHandlers = [];
    }
    beginNetworkRequest(nb) {
      let meta = this.netRequestMeta.get(nb);
      if (!meta) {
        meta = { seq: 0, controller: null };
        this.netRequestMeta.set(nb, meta);
      }
      meta.seq += 1;
      if (nb.cancelPrevious && meta.controller && typeof meta.controller.abort === "function") {
        try {
          meta.controller.abort();
        } catch {}
      }
      meta.controller = typeof AbortController !== "undefined" ? new AbortController : null;
      return { seq: meta.seq, controller: meta.controller };
    }
    isCurrentNetworkRequest(nb, seq) {
      const meta = this.netRequestMeta.get(nb);
      return !this.isDestroyed && !nb.disposed && !!meta && meta.seq === seq;
    }
    finishNetworkRequest(nb, seq, controller) {
      const meta = this.netRequestMeta.get(nb);
      if (!meta || meta.seq !== seq)
        return false;
      if (meta.controller === controller) {
        meta.controller = null;
      }
      return true;
    }
    isAbortError(error) {
      return !!error && (error.name === "AbortError" || error.code === 20);
    }
    initIntegrationBindings(onlyLegacy = false) {
      if (onlyLegacy) {
        this.integrationScopes.forEach((scope) => scope.initIntegrationBindings(true));
      }
      listIntegrations().forEach((integration) => {
        if (onlyLegacy && integration.preserveOnSwap)
          return;
        if (typeof integration.setup !== "function")
          return;
        try {
          integration.setup(this);
        } catch (e) {
          console.error("SpruceX integration setup error:", e);
        }
      });
    }
    scanIntegrations(el, locals = null, onlyLegacy = false) {
      if (locals && locals !== this.locals) {
        let scope = this.integrationScopes.get(locals);
        if (!scope) {
          scope = Object.assign(Object.create(this), {
            locals,
            integrationScopes: new Map,
            gridBindings: [],
            scheduleUpdate: this.scheduleUpdate.bind(this)
          });
          scope.initIntegrationBindings();
          this.integrationScopes.set(locals, scope);
        }
        scope.scanIntegrations(el, null, onlyLegacy);
        return;
      }
      listIntegrations().forEach((integration) => {
        if (onlyLegacy && integration.preserveOnSwap)
          return;
        if (typeof integration.scan !== "function")
          return;
        try {
          integration.scan(this, el);
        } catch (e) {
          console.error("SpruceX integration scan error:", e);
        }
      });
    }
    unmountIntegrationElement(el) {
      listIntegrations().forEach((integration) => {
        if (typeof integration.unmount !== "function")
          return;
        try {
          integration.unmount(this, el);
        } catch (e) {
          console.error("SpruceX integration unmount error:", e);
        }
      });
      this.integrationScopes.forEach((scope) => {
        listIntegrations().forEach((integration) => {
          if (typeof integration.unmount !== "function")
            return;
          try {
            integration.unmount(scope, el);
          } catch (e) {
            console.error("SpruceX integration unmount error:", e);
          }
        });
      });
    }
    updateIntegrations() {
      this.integrationScopes.forEach((scope) => scope.updateIntegrations());
      listIntegrations().forEach((integration) => {
        if (typeof integration.update !== "function")
          return;
        try {
          integration.update(this);
        } catch (e) {
          console.error("SpruceX integration update error:", e);
        }
      });
    }
    teardownIntegrations(onlyLegacy = false) {
      this.integrationScopes.forEach((scope) => scope.teardownIntegrations(onlyLegacy));
      if (!onlyLegacy)
        this.integrationScopes.clear();
      listIntegrations().forEach((integration) => {
        if (onlyLegacy && integration.preserveOnSwap)
          return;
        if (typeof integration.teardown !== "function")
          return;
        try {
          integration.teardown(this);
        } catch (e) {
          console.error("SpruceX integration teardown error:", e);
        }
      });
    }
    performRequest(nb) {
      return performRequest(this, nb);
    }
    disposeNetworkBinding(binding) {
      if (binding.disposed)
        return;
      binding.disposed = true;
      this.netRequestMeta.get(binding)?.controller?.abort();
      (binding.disposers || []).forEach((dispose) => dispose());
    }
    pruneDetachedBindings(removedNodes = null, exact = false) {
      const belongs = (el) => el && (removedNodes ? !removedNodes.some((node) => node === el || !exact && node.contains?.(el)) : this.root.contains(el));
      this.bindings = this.bindings.filter((binding) => {
        if (belongs(binding.el))
          return true;
        binding.dispose?.();
        return false;
      });
      this.memoBindings = this.memoBindings.filter((binding) => belongs(binding.el));
      this.modelBindings = this.modelBindings.filter((binding) => {
        if (belongs(binding.el))
          return true;
        binding.dispose?.();
        return false;
      });
      this.elementEffects = this.elementEffects.filter((entry) => {
        if (belongs(entry.el))
          return true;
        entry.dispose?.();
        return false;
      });
      for (const [el] of Array.from(this.directiveInstances.entries())) {
        if (!belongs(el)) {
          this.disposeElementDirectives(el);
        }
      }
      this.eventHandlers = this.eventHandlers.filter((record) => {
        if (belongs(record.sourceEl || record.el))
          return true;
        this.removeEventHandler(record);
        return false;
      });
      this.netBindings = this.netBindings.filter((binding) => {
        if (belongs(binding.el))
          return true;
        this.disposeNetworkBinding(binding);
        return false;
      });
      if (removedNodes) {
        removedNodes.forEach((node) => {
          if (!node || node.nodeType !== 1)
            return;
          this.unmountIntegrationElement(node);
          if (!exact && node.querySelectorAll) {
            node.querySelectorAll("*").forEach((child) => {
              this.unmountIntegrationElement(child);
            });
          }
        });
      }
    }
    hydrateAfterSwap(container) {
      if (!container?.isConnected)
        return;
      const owner = container.closest(`[${ATTR_DATA}]`);
      const roots = new Set([owner, ...container.querySelectorAll(`[${ATTR_DATA}]`)]);
      if (container.hasAttribute(ATTR_DATA))
        roots.add(container);
      roots.forEach((root) => {
        if (!root?.isConnected)
          return;
        const parent = root.parentElement?.closest(`[${ATTR_DATA}]`)?.__sprucex;
        if (!root.__sprucex) {
          const mountRoot = () => {
            if (!root.isConnected || root.__sprucex)
              return;
            root.__sprucex = new Component(root, {
              parentComponent: parent,
              locals: parent?.getElementLocals(root)
            });
          };
          if (root.hasAttribute(ATTR_LAZY) && typeof IntersectionObserver !== "undefined") {
            const io = new IntersectionObserver((entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting) {
                  io.disconnect();
                  mountRoot();
                  break;
                }
              }
            });
            io.observe(root);
          } else {
            mountRoot();
          }
        } else {
          const component = root.__sprucex;
          component.pruneDetachedBindings();
          component.teardownIntegrations(true);
          component.initIntegrationBindings(true);
          walk(root, (el) => {
            if (el !== root && el.hasAttribute(ATTR_DATA))
              return false;
            if (component.scannedElements.has(el) && component.directiveSignatures.get(el) !== component.directiveSignature(el)) {
              component.pruneDetachedBindings([el], true);
              component.scannedElements.delete(el);
            }
            if (component.scannedElements.has(el)) {
              component.scanIntegrations(el, component.getElementLocals(el), true);
            }
          });
          component.scan(root);
          component.renderIfBlocks(false);
          component.renderForBlocks(false);
          component.refsDirty = true;
          component.applyInitialRender();
        }
      });
    }
    abortCancelableRequests() {
      this.netBindings.forEach((binding) => {
        const meta = this.netRequestMeta.get(binding);
        if (meta && meta.controller && typeof meta.controller.abort === "function") {
          meta.controller.abort();
        }
      });
    }
    applySwap(targetSelectorOrEl, html, swap, select = null) {
      return applySwap(this, targetSelectorOrEl, html, swap, select);
    }
    renderIfBlocks(forceAll = true) {
      return renderIfBlocks(this, forceAll);
    }
    renderForBlocks(forceAll = true) {
      return renderForBlocks(this, forceAll);
    }
    teardownForBlock(block) {
      return teardownForBlock(this, block);
    }
    teardownIfBlock(block) {
      return teardownIfBlock(this, block);
    }
    teardownAllForBlocks() {
      return teardownAllForBlocks(this);
    }
    teardownAllIfBlocks() {
      return teardownAllIfBlocks(this);
    }
    disposeForInstance(inst) {
      return disposeInstance(this, inst);
    }
    mountForInstance(inst) {
      return mountNestedDataComponents(this, inst);
    }
    scanFragmentBindings(rootNode, locals) {
      const fields = [
        "bindings",
        "memoBindings",
        "modelBindings",
        "eventHandlers",
        "netBindings",
        "elementEffects",
        "forBlocks",
        "ifBlocks"
      ];
      const starts = Object.fromEntries(fields.map((key) => [key, this[key].length]));
      const prevFragDirectives = this._activeFragmentDirectives;
      const capturedDirectives = [];
      this._activeFragmentDirectives = capturedDirectives;
      try {
        this.scan(rootNode, locals, true);
      } finally {
        this._activeFragmentDirectives = prevFragDirectives;
      }
      const result = Object.fromEntries(fields.map((key) => [key, this[key].slice(starts[key])]));
      result.nestedForBlocks = result.forBlocks;
      result.nestedIfBlocks = result.ifBlocks;
      result.directiveInstances = capturedDirectives;
      return result;
    }
    cleanupInstanceBindings(instanceBindings) {
      if (!instanceBindings)
        return;
      const bindingsToRemove = new Set(instanceBindings.bindings || []);
      const memosToRemove = new Set(instanceBindings.memoBindings || []);
      const modelsToRemove = new Set(instanceBindings.modelBindings || []);
      const effectsToRemove = new Set(instanceBindings.elementEffects || []);
      if (bindingsToRemove.size > 0) {
        bindingsToRemove.forEach((b) => b.dispose?.());
        this.bindings = this.bindings.filter((b) => !bindingsToRemove.has(b));
      }
      if (memosToRemove.size > 0) {
        this.memoBindings = this.memoBindings.filter((b) => !memosToRemove.has(b));
      }
      if (modelsToRemove.size > 0) {
        modelsToRemove.forEach((m) => m.dispose?.());
        this.modelBindings = this.modelBindings.filter((b) => !modelsToRemove.has(b));
      }
      if (effectsToRemove.size > 0) {
        effectsToRemove.forEach((e) => e.dispose?.());
        this.elementEffects = this.elementEffects.filter((e) => !effectsToRemove.has(e));
      }
      (instanceBindings.directiveInstances || []).forEach((rec) => {
        this.disposeDirectiveRecord(rec);
        const list = this.directiveInstances.get(rec.el);
        if (list) {
          const remaining = list.filter((entry) => entry !== rec);
          if (remaining.length)
            this.directiveInstances.set(rec.el, remaining);
          else
            this.directiveInstances.delete(rec.el);
        }
      });
      const handlersToRemove = new Set;
      (instanceBindings.eventHandlers || []).forEach((record) => {
        this.removeEventHandler(record);
        handlersToRemove.add(record.handler);
      });
      if (handlersToRemove.size > 0) {
        this.eventHandlers = this.eventHandlers.filter((h) => !handlersToRemove.has(h.handler));
      }
      (instanceBindings.netBindings || []).forEach((binding) => this.disposeNetworkBinding(binding));
      this.netBindings = this.netBindings.filter((binding) => !binding.disposed);
      instanceBindings.nestedForBlocks?.forEach((block) => {
        this.teardownForBlock(block);
      });
      instanceBindings.nestedIfBlocks?.forEach((block) => {
        this.teardownIfBlock(block);
      });
      (instanceBindings.lazyObservers || []).forEach((io) => io.disconnect?.());
      (instanceBindings.nestedDataComponents || []).forEach((component) => {
        if (component && typeof component.destroy === "function") {
          component.destroy();
        }
      });
    }
    flushPendingInits() {
      if (!this.pendingInits.length)
        return;
      const queue = this.pendingInits.splice(0);
      for (let i = 0;i < queue.length; i++) {
        const { el, expr, locals } = queue[i];
        if (!el.isConnected)
          continue;
        this.withContext(el, locals, () => {
          execInScope(expr, this);
        });
      }
    }
    revealCloakedElements() {
      if (this.cloakedElements.size === 0)
        return;
      this.cloakedElements.forEach((el) => {
        el.removeAttribute(ATTR_CLOAK);
      });
      this.cloakedElements.clear();
    }
    flushDirtyEffects() {
      if (this.dirtyEffects.size === 0)
        return;
      const pending = Array.from(this.dirtyEffects);
      this.dirtyEffects.clear();
      for (let i = 0;i < pending.length; i++) {
        if (this.isDestroyed)
          break;
        pending[i].run();
      }
    }
    applyInitialRender() {
      this.collectRefs();
      this.refsDirty = false;
      this.flushPendingInits();
      this.updateBindings(true);
      this.updateModelBindings(true);
      this.updateMemoBindings();
      this.flushDirtyEffects();
      this.updateIntegrations();
      this.revealCloakedElements();
    }
    updateBindings(forceAll = true) {
      if (forceAll) {
        this.dirtyBindings.clear();
        for (let i = 0;i < this.bindings.length; i++) {
          runBinding(this, this.bindings[i]);
        }
        return;
      }
      const toRun = new Set(this.dirtyBindings);
      this.dirtyBindings.clear();
      for (let i = 0;i < this.bindings.length; i++) {
        const b = this.bindings[i];
        if (b.dirty || !b.tracked) {
          toRun.add(b);
        }
      }
      toRun.forEach((b) => runBinding(this, b));
    }
    updateModelBindings(forceAll = true) {
      if (forceAll) {
        this.dirtyModels.clear();
        for (let i = 0;i < this.modelBindings.length; i++) {
          this.modelBindings[i].run();
        }
        return;
      }
      const toRun = new Set(this.dirtyModels);
      this.dirtyModels.clear();
      for (let i = 0;i < this.modelBindings.length; i++) {
        const mb = this.modelBindings[i];
        if (mb.dirty || !mb.tracked) {
          toRun.add(mb);
        }
      }
      toRun.forEach((mb) => mb.run());
    }
    updateMemoBindings() {
      this.memoBindings.forEach((mb) => {
        const { el, expr, type, deps, locals } = mb;
        this.withContext(el, locals, () => {
          const currVals = deps.map((k) => {
            if (locals && k in locals)
              return locals[k];
            return this.state[k];
          });
          if (mb.lastVals && mb.lastVals.length === currVals.length && mb.lastVals.every((v2, i) => Object.is(v2, currVals[i]))) {
            return;
          }
          mb.lastVals = currVals;
          const v = safeEval(expr, this);
          mb.lastResult = v;
          const nextStr = String(v ?? "");
          if (type === "text") {
            el.textContent = nextStr;
          } else {
            el.innerHTML = nextStr;
          }
        });
      });
    }
    callHook(name) {
      const fn = this.state && this.state[name];
      if (typeof fn === "function") {
        try {
          fn.call(this.state);
        } catch (e) {
          console.error(`SpruceX ${name}() hook error:`, e);
        }
      }
    }
    refresh() {
      this.abortCancelableRequests();
      this.teardownIntegrations();
      this.disposeAllElementDirectives();
      this.bindings.forEach((b) => b.dispose?.());
      this.modelBindings.forEach((m) => m.dispose?.());
      this.elementEffects.forEach((e) => e.dispose?.());
      this.netBindings.forEach((binding) => this.disposeNetworkBinding(binding));
      this.clearDebounceTimers();
      this.clearEmitterHandlers();
      this.teardownAllForBlocks();
      this.teardownAllIfBlocks();
      this.scannedElements = new WeakSet;
      this.directiveSignatures = new WeakMap;
      this.elementLocals = new WeakMap;
      this.bindings = [];
      this.memoBindings = [];
      this.modelBindings = [];
      this.netBindings = [];
      this.gridBindings = [];
      this.forBlocks = [];
      this.ifBlocks = [];
      this.elementEffects = [];
      this.pendingInits = [];
      this.dirtyBindings.clear();
      this.dirtyModels.clear();
      this.dirtyEffects.clear();
      this.dirtyForBlocks.clear();
      this.dirtyIfBlocks.clear();
      this.eventHandlers.forEach((record) => this.removeEventHandler(record));
      this.eventHandlers = [];
      walk(this.root, (el) => {
        if (el !== this.root && el.hasAttribute(ATTR_DATA))
          return false;
        if (el.__sx_handlers)
          delete el.__sx_handlers;
      });
      this.animatedElements.forEach((_controller, el) => {
        this.disableAutoAnimate(el);
      });
      this.animatedElements.clear();
      this.pollTimers.forEach((t) => clearInterval(t));
      this.pollTimers = [];
      this.collectRefs();
      this.initIntegrationBindings();
      this.scan(this.root);
      this.renderIfBlocks(true);
      this.renderForBlocks(true);
      this.applyInitialRender();
    }
    destroy() {
      if (this.isDestroyed)
        return;
      this.isDestroyed = true;
      this.callHook("destroyed");
      this._stopWatchers?.();
      this.abortCancelableRequests();
      this.netBindings.forEach((binding) => this.disposeNetworkBinding(binding));
      Object.keys(storeSubscribers).forEach((name) => {
        storeSubscribers[name].delete(this);
      });
      this.animatedElements.forEach((_controller, el) => {
        this.disableAutoAnimate(el);
      });
      this.animatedElements.clear();
      this.disposeAllElementDirectives();
      this.teardownIntegrations();
      this.teardownAllForBlocks();
      this.teardownAllIfBlocks();
      this.bindings.forEach((b) => b.dispose?.());
      this.modelBindings.forEach((m) => m.dispose?.());
      this.elementEffects.forEach((e) => e.dispose?.());
      this.eventHandlers.forEach((record) => this.removeEventHandler(record));
      this.clearEmitterHandlers();
      if (this._delegatedCleanups) {
        this._delegatedCleanups.forEach((fn) => fn());
        this._delegatedCleanups = [];
        this._delegatedEventTypes?.clear();
      }
      this.pollTimers.forEach((t) => clearInterval(t));
      this.clearDebounceTimers();
      if (this.rafId && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(this.rafId);
      }
      this.flushNextTicks();
      this.bindings = [];
      this.memoBindings = [];
      this.modelBindings = [];
      this.eventHandlers = [];
      this.gridBindings = [];
      this.netBindings = [];
      this.forBlocks = [];
      this.ifBlocks = [];
      this.elementEffects = [];
      this.pollTimers = [];
      this.dirtyBindings.clear();
      this.dirtyModels.clear();
      this.dirtyEffects.clear();
      this.dirtyForBlocks.clear();
      this.dirtyIfBlocks.clear();
      delete this.root.__sprucex;
    }
  }

  // src/core/runtime.js
  var MAX_PAGE_CACHE_SIZE = 20;
  var pageCache = new Map;
  var pendingFetches = new Map;
  var PAGE_CACHE_TTL = 30000;
  var pendingRoots = new Set;
  var pendingRootMeta = new WeakMap;
  var PENDING_ROOT_MAX_WAIT = 5000;
  var pendingRootFlushQueued = false;
  var pendingRootPollTimer = null;
  var pendingRootPollCount = 0;
  var MAX_PENDING_ROOT_POLLS = 100;
  var latestNavigationId = 0;
  var activeNavigationController = null;
  var observedCleanupRoots = new WeakMap;
  var mountedRootRegistry = new Set;
  function ensurePendingRootPolling() {
    if (pendingRootPollTimer || pendingRoots.size === 0)
      return;
    pendingRootPollCount = 0;
    pendingRootPollTimer = setInterval(() => {
      pendingRootPollCount++;
      if (pendingRootPollCount >= MAX_PENDING_ROOT_POLLS) {
        clearInterval(pendingRootPollTimer);
        pendingRootPollTimer = null;
        console.warn(`SpruceX: Stopped polling for pending roots after ${MAX_PENDING_ROOT_POLLS} attempts. Make sure data factories are registered.`);
        return;
      }
      flushPendingRoots();
    }, 100);
  }
  function flushPendingRoots() {
    pendingRoots.forEach((root) => {
      if (!root || !root.isConnected || root.__sprucex) {
        pendingRoots.delete(root);
        pendingRootMeta.delete(root);
        return;
      }
      const meta = pendingRootMeta.get(root);
      if (meta && Date.now() - meta.queuedAt > PENDING_ROOT_MAX_WAIT) {
        console.warn("SpruceX sx-data factory did not become available in time:", root.getAttribute(ATTR_DATA));
        pendingRoots.delete(root);
        pendingRootMeta.delete(root);
        return;
      }
      const comp = initSpruceXRoot(root);
      if (comp) {
        pendingRoots.delete(root);
        pendingRootMeta.delete(root);
      }
    });
    if (pendingRoots.size === 0 && pendingRootPollTimer) {
      clearInterval(pendingRootPollTimer);
      pendingRootPollTimer = null;
      pendingRootPollCount = 0;
    }
  }
  function queuePendingRoot(root) {
    if (!root || root.__sprucex)
      return;
    const wasPending = pendingRoots.has(root);
    pendingRoots.add(root);
    if (!wasPending) {
      pendingRootMeta.set(root, { queuedAt: Date.now() });
    }
    ensurePendingRootPolling();
    if (wasPending || pendingRootFlushQueued)
      return;
    pendingRootFlushQueued = true;
    queueMicrotask(() => {
      pendingRootFlushQueued = false;
      flushPendingRoots();
    });
  }
  function collectMountedRoots(scopeRoot = null) {
    const roots = new Set;
    if (scopeRoot && typeof scopeRoot.querySelectorAll === "function") {
      if (scopeRoot.nodeType === 1 && scopeRoot.hasAttribute?.(ATTR_DATA) && scopeRoot.__sprucex) {
        roots.add(scopeRoot);
      }
      scopeRoot.querySelectorAll(`[${ATTR_DATA}]`).forEach((el) => {
        if (el.__sprucex)
          roots.add(el);
      });
      return Array.from(roots);
    }
    if (typeof document !== "undefined") {
      document.querySelectorAll(`[${ATTR_DATA}]`).forEach((el) => {
        if (el.__sprucex)
          roots.add(el);
      });
    }
    mountedRootRegistry.forEach((el) => {
      if (!el?.isConnected || !el.__sprucex) {
        mountedRootRegistry.delete(el);
      } else {
        roots.add(el);
      }
    });
    return Array.from(roots);
  }
  function refreshAllMountedComponents() {
    collectMountedRoots().forEach((root) => {
      if (root.__sprucex && typeof root.__sprucex.refresh === "function") {
        root.__sprucex.refresh();
      }
    });
  }
  function mountDirectiveOnMountedComponents(name) {
    collectMountedRoots().forEach((root) => {
      if (root.__sprucex && typeof root.__sprucex.mountDirectiveOnExistingElements === "function") {
        root.__sprucex.mountDirectiveOnExistingElements(name);
      }
    });
  }
  var bootHookRan = false;
  function runBootHook() {
    if (bootHookRan || typeof window === "undefined")
      return;
    bootHookRan = true;
    const boot = window.SpruceXBoot;
    if (boot && typeof boot.initTheme === "function") {
      try {
        boot.initTheme();
      } catch (e) {
        console.error("SpruceX boot hook error:", e);
      }
    }
  }
  function initSpruceXRoot(root, options = {}) {
    if (!root)
      return null;
    if (root.__sprucex)
      return root.__sprucex;
    const parentEl = root.parentElement?.closest?.(`[${ATTR_DATA}]`);
    const parentComponent = options.parentComponent || parentEl?.__sprucex || null;
    const locals = options.locals || parentComponent?.getElementLocals?.(root);
    try {
      const comp = new Component(root, { parentComponent, locals });
      root.__sprucex = comp;
      mountedRootRegistry.add(root);
      return comp;
    } catch (e) {
      if (e && e.code === DATA_FACTORY_NOT_READY_ERROR) {
        queuePendingRoot(root);
        return null;
      }
      console.error("SpruceX component init error:", e);
      return null;
    }
  }
  function mountElement(el, options = {}) {
    if (typeof el === "string" && typeof document !== "undefined") {
      el = document.querySelector(el);
    }
    if (!el)
      return null;
    const rootNode = el.getRootNode?.();
    if (rootNode)
      initAutoCleanup(rootNode);
    return initSpruceXRoot(el, options);
  }
  function unmountElement(el) {
    if (typeof el === "string" && typeof document !== "undefined") {
      el = document.querySelector(el);
    }
    if (!el)
      return;
    if (el.__sprucex) {
      el.__sprucex.destroy();
    }
    mountedRootRegistry.delete(el);
  }
  function initSpruceX(root = null) {
    runBootHook();
    const targetRoot = root || (typeof document !== "undefined" ? document : null);
    if (!targetRoot || typeof targetRoot.querySelectorAll !== "function")
      return;
    const roots = [];
    if (targetRoot.nodeType === 1 && targetRoot.hasAttribute?.(ATTR_DATA)) {
      roots.push(targetRoot);
    }
    targetRoot.querySelectorAll(`[${ATTR_DATA}]`).forEach((el) => roots.push(el));
    roots.forEach((el) => {
      const lazy = el.hasAttribute(ATTR_LAZY);
      if (!lazy || typeof IntersectionObserver === "undefined") {
        initSpruceXRoot(el);
      } else {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              initSpruceXRoot(el);
              io.disconnect();
            }
          });
        });
        io.observe(el);
      }
    });
    if (typeof document !== "undefined" && targetRoot === document) {
      const pageRoot = document.querySelector(`[${ATTR_PAGE}]`);
      if (pageRoot && !pageRoot.__sprucex_page) {
        pageRoot.__sprucex_page = true;
        initPageSwapping(pageRoot);
      }
      initBoostingGlobal(document);
      Array.from(document.scripts).forEach((script) => {
        script.__sprucex_executed = true;
      });
    } else {
      initBoostingGlobal(targetRoot);
    }
    initAutoCleanup(targetRoot);
    flushPendingRoots();
  }
  function initAutoCleanup(targetRoot = null) {
    if (typeof MutationObserver === "undefined")
      return;
    const observeTarget = targetRoot && targetRoot !== document ? targetRoot : typeof document !== "undefined" ? document.body : null;
    if (!observeTarget || observedCleanupRoots.has(observeTarget))
      return;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType !== 1 || node.isConnected)
            return;
          if (node.__sprucex) {
            node.__sprucex.destroy();
            mountedRootRegistry.delete(node);
          }
          node.querySelectorAll?.(`[${ATTR_DATA}]`).forEach((el) => {
            if (!el.isConnected && el.__sprucex) {
              el.__sprucex.destroy();
              mountedRootRegistry.delete(el);
            }
          });
        });
      }
    });
    observer.observe(observeTarget, {
      childList: true,
      subtree: true
    });
    observedCleanupRoots.set(observeTarget, observer);
  }
  var isGlobalNavInitialized = false;
  function resolvePageContainer() {
    if (typeof document === "undefined")
      return null;
    const pageRoot = document.querySelector(`[${ATTR_PAGE}]`);
    if (!pageRoot)
      return null;
    const pageAttr = pageRoot.getAttribute(ATTR_PAGE);
    return pageAttr ? document.querySelector(pageAttr) : document.body;
  }
  function saveCurrentScrollState() {
    if (typeof history === "undefined" || typeof window === "undefined")
      return;
    try {
      const prev = history.state && typeof history.state === "object" ? history.state : {};
      history.replaceState({ ...prev, url: window.location.href, scrollX: window.scrollX || 0, scrollY: window.scrollY || 0 }, "", window.location.href);
    } catch {}
  }
  function initPageSwapping(root) {
    const pageAttr = root.getAttribute(ATTR_PAGE);
    if (pageAttr === null)
      return;
    const initialContainer = pageAttr ? document.querySelector(pageAttr) : document.body;
    if (!initialContainer) {
      console.error("SpruceX sx-page target not found:", pageAttr);
      return;
    }
    if (isGlobalNavInitialized)
      return;
    isGlobalNavInitialized = true;
    document.addEventListener("click", async (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const link = e.target?.closest?.("a[href]");
      if (!link)
        return;
      if (link.hasAttribute(ATTR_PAGE_IGNORE) || link.getAttribute(ATTR_BOOST) === "false") {
        return;
      }
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:"))
        return;
      if (link.hasAttribute("download") || link.getAttribute("target") && link.getAttribute("target") !== "_self") {
        return;
      }
      try {
        const url = new URL(href, document.baseURI);
        if (url.origin !== window.location.origin)
          return;
        const container = resolvePageContainer() || initialContainer;
        e.preventDefault();
        saveCurrentScrollState();
        await navigateTo(url.href, container, true, null);
      } catch {
        return;
      }
    });
    window.addEventListener("popstate", async (e) => {
      const container = resolvePageContainer() || initialContainer;
      const savedScroll = e.state && typeof e.state.scrollY === "number" ? { x: e.state.scrollX || 0, y: e.state.scrollY } : null;
      await navigateTo(window.location.href, container, false, savedScroll);
    });
  }
  function initBoostingGlobal(scopeRoot = document) {
    if (!scopeRoot || typeof scopeRoot.querySelectorAll !== "function")
      return;
    scopeRoot.querySelectorAll(`[${ATTR_BOOST}]`).forEach((el) => {
      if (el.__sprucex_boost || el.getAttribute(ATTR_BOOST) === "false")
        return;
      el.__sprucex_boost = true;
      const boostOn = el.getAttribute(ATTR_BOOST_ON) || "mouseenter";
      const events = boostOn.split(/\s+/);
      if (el.tagName === "A") {
        events.forEach((evt) => {
          el.addEventListener(evt, () => prefetchLink(el.href), {
            passive: true,
            once: true
          });
        });
      } else {
        events.forEach((evt) => {
          el.addEventListener(evt, (e) => {
            const link = e.target.closest?.("a[href]");
            if (link && !link.__sprucex_prefetched && link.getAttribute(ATTR_BOOST) !== "false" && !link.hasAttribute(ATTR_PAGE_IGNORE)) {
              link.__sprucex_prefetched = true;
              prefetchLink(link.href);
            }
          }, { passive: true });
        });
        el.addEventListener("focusin", (e) => {
          const link = e.target.closest?.("a[href]");
          if (link && !link.__sprucex_prefetched && link.getAttribute(ATTR_BOOST) !== "false" && !link.hasAttribute(ATTR_PAGE_IGNORE)) {
            link.__sprucex_prefetched = true;
            prefetchLink(link.href);
          }
        }, { passive: true });
      }
    });
  }
  async function navigateTo(url, container, pushState = true, restoreScroll = null) {
    const targetUrl = new URL(url, window.location.href);
    const href = targetUrl.href;
    const navigationId = ++latestNavigationId;
    const startTime = performance.now();
    if (activeNavigationController) {
      try {
        activeNavigationController.abort();
      } catch {}
      activeNavigationController = null;
    }
    const beforeEvent = new CustomEvent("sprucex:page-before", {
      detail: { url: href },
      bubbles: true,
      cancelable: true
    });
    if (!document.dispatchEvent(beforeEvent))
      return;
    const controller = typeof AbortController !== "undefined" ? new AbortController : null;
    activeNavigationController = controller;
    try {
      let html = getCachedPage(href);
      if (!html) {
        if (container)
          container.style.opacity = container.style.opacity || "1";
        html = await fetchPage(href, controller?.signal);
      }
      if (navigationId !== latestNavigationId)
        return;
      if (!html)
        throw new Error("Empty response");
      const parser = new DOMParser;
      const doc = parser.parseFromString(html, "text/html");
      let newContent;
      const pageRoot = document.querySelector(`[${ATTR_PAGE}]`);
      const targetSelector = pageRoot?.getAttribute(ATTR_PAGE);
      if (targetSelector) {
        newContent = doc.querySelector(targetSelector);
      }
      if (!newContent) {
        newContent = doc.body;
      }
      const applyDomUpdate = () => {
        const newTitle = doc.querySelector("title");
        if (newTitle)
          document.title = newTitle.textContent;
        reinitializeComponents(container);
        if (container && newContent) {
          morphNodes(container, newContent);
          container.querySelectorAll("script").forEach((script) => {
            if (!script.__sprucex_executed) {
              runScript(script);
            }
          });
        }
        if (pushState) {
          history.pushState({ url: href, scrollX: 0, scrollY: 0 }, "", href);
        }
        initSpruceX();
        let ancestor = container?.parentElement;
        while (ancestor) {
          if (ancestor.__sprucex) {
            ancestor.__sprucex.refresh();
          }
          ancestor = ancestor.parentElement;
        }
        initBoostingGlobal(document);
      };
      const useViewTransition = (Component.viewTransitions || pageRoot?.hasAttribute(ATTR_PAGE_TRANSITION)) && typeof document.startViewTransition === "function";
      if (useViewTransition) {
        await document.startViewTransition(applyDomUpdate).finished;
      } else {
        applyDomUpdate();
      }
      if (navigationId !== latestNavigationId)
        return;
      if (restoreScroll) {
        window.scrollTo(restoreScroll.x, restoreScroll.y);
      } else if (targetUrl.hash) {
        const target = document.querySelector(targetUrl.hash);
        if (target)
          target.scrollIntoView();
      } else {
        window.scrollTo(0, 0);
      }
      document.dispatchEvent(new CustomEvent("sprucex:page-after", {
        detail: { url: href, duration: performance.now() - startTime },
        bubbles: true
      }));
    } catch (error) {
      if (navigationId !== latestNavigationId || error && (error.name === "AbortError" || error.code === 20)) {
        return;
      }
      console.error("SpruceX page navigation error:", error);
      document.dispatchEvent(new CustomEvent("sprucex:page-error", {
        detail: { url: href, error },
        bubbles: true
      }));
      window.location.href = href;
    } finally {
      if (activeNavigationController === controller) {
        activeNavigationController = null;
      }
    }
  }
  function reinitializeComponents(container) {
    if (!container)
      return;
    container.querySelectorAll(`[${ATTR_DATA}]`).forEach((el) => {
      if (el.__sprucex) {
        el.__sprucex.destroy();
        mountedRootRegistry.delete(el);
      }
    });
    if (container.hasAttribute(ATTR_DATA) && container.__sprucex) {
      container.__sprucex.destroy();
      mountedRootRegistry.delete(container);
    }
  }
  async function prefetchLink(href) {
    if (!href)
      return;
    try {
      const url = new URL(href, document.baseURI);
      if (url.origin !== window.location.origin)
        return;
      if (url.href === window.location.href)
        return;
      await fetchPage(url.href);
    } catch {}
  }
  async function fetchPage(url, signal = undefined) {
    const cached = getCachedPage(url);
    if (cached)
      return cached;
    if (!signal && pendingFetches.has(url)) {
      return pendingFetches.get(url);
    }
    const fetchPromise = (async () => {
      try {
        const options = { headers: { "X-SpruceX-Request": "true" } };
        if (signal)
          options.signal = signal;
        const res = await fetch(url, options);
        if (!res.ok)
          throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        if (pageCache.size >= MAX_PAGE_CACHE_SIZE) {
          const oldestKey = pageCache.keys().next().value;
          pageCache.delete(oldestKey);
        }
        pageCache.set(url, {
          html,
          timestamp: Date.now()
        });
        return html;
      } finally {
        pendingFetches.delete(url);
      }
    })();
    if (!signal) {
      pendingFetches.set(url, fetchPromise);
    }
    return fetchPromise;
  }
  function getCachedPage(url) {
    const entry = pageCache.get(url);
    if (!entry)
      return null;
    if (Date.now() - entry.timestamp > PAGE_CACHE_TTL) {
      pageCache.delete(url);
      return null;
    }
    return entry.html;
  }
  function runScript(script) {
    if (script.type && script.type !== "text/javascript" && script.type !== "application/javascript" && script.type !== "module") {
      return;
    }
    const newScript = document.createElement("script");
    Array.from(script.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    if (newScript.src) {
      newScript.addEventListener("load", () => {
        flushPendingRoots();
        refreshAllMountedComponents();
      }, { once: true });
      newScript.addEventListener("error", () => flushPendingRoots(), {
        once: true
      });
    }
    newScript.textContent = script.textContent;
    newScript.__sprucex_executed = true;
    script.replaceWith(newScript);
    if (!newScript.src) {
      queueMicrotask(() => flushPendingRoots());
    }
  }
  function createSpruceXApi(extras = {}) {
    return {
      ...extras,
      init: initSpruceX,
      mount: mountElement,
      unmount: unmountElement,
      store: initStore,
      removeStore,
      markRaw,
      toRaw,
      shallow,
      computed,
      effect,
      stop,
      nextTick(fn) {
        const promise = new Promise((resolve) => {
          const schedule = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (cb) => setTimeout(cb, 16);
          schedule(() => resolve());
        });
        return typeof fn === "function" ? promise.then(fn) : promise;
      },
      data(name, factory) {
        if (arguments.length === 1 && typeof name === "string") {
          return getDataFactory(name);
        }
        const result = registerDataFactory(name, factory);
        flushPendingRoots();
        return result;
      },
      directive(name, handler) {
        if (arguments.length === 1 && typeof name === "string") {
          return getDirective(name);
        }
        const registered = registerDirective(name, handler);
        mountDirectiveOnMountedComponents(name.startsWith("sx-") ? name.slice(3) : name);
        return registered;
      },
      inspect(root = null) {
        return collectMountedRoots(root).map((r) => ({
          el: r,
          state: r.__sprucex?.state || null
        }));
      },
      config(newCfg) {
        if (!newCfg || typeof newCfg !== "object")
          return;
        Object.assign(Component, newCfg);
        if ("csp" in newCfg) {
          setCspMode(Boolean(newCfg.csp));
        }
      },
      navigate(url) {
        const container = resolvePageContainer() || document.body;
        return navigateTo(new URL(url, window.location.href).href, container);
      },
      prefetch(url) {
        return prefetchLink(url);
      },
      clearCache() {
        pageCache.clear();
      },
      morph(target, source) {
        if (typeof target === "string")
          target = document.querySelector(target);
        if (typeof source === "string") {
          const parser = new DOMParser;
          const doc = parser.parseFromString(`<div>${source}</div>`, "text/html");
          source = doc.body.firstChild;
        }
        if (target && source)
          morphNodes(target, source);
      },
      animate(el, options = {}) {
        if (typeof el === "string")
          el = document.querySelector(el);
        if (!el)
          return null;
        const aa = getAutoAnimate();
        if (!aa) {
          console.warn("SpruceX: auto-animate library not found. Include it via script tag or npm.");
          return null;
        }
        return aa(el, options);
      },
      setAutoAnimate,
      integration(name, integration) {
        if (arguments.length === 1 && typeof name === "string") {
          return getIntegration(name);
        }
        const registered = registerIntegration(name, integration);
        refreshAllMountedComponents();
        return registered;
      }
    };
  }

  // src/index.js
  ensureBuiltInIntegrationsRegistered();
  var SpruceX = createSpruceXApi({
    createSortableIntegration,
    createNativeSortableAdapter,
    createGridStackIntegration
  });
  var src_default = SpruceX;
  if (typeof window !== "undefined") {
    window.SpruceX = SpruceX;
    if (!window.SpruceXBoot) {
      window.SpruceXBoot = {};
    }
  }
  if (typeof document !== "undefined") {
    runBootHook();
    const autoInit = typeof window === "undefined" || window.SpruceXBoot?.autoInit !== false;
    if (autoInit) {
      window.addEventListener("load", () => {
        flushPendingRoots();
      });
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => initSpruceX());
      } else {
        initSpruceX();
      }
    }
  }
})();
