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
    initSpruceX: () => initSpruceX,
    SpruceX: () => SpruceX
  });

  // src/constants.js
  var ATTR_DATA = "sx-data";
  var ATTR_TEXT = "sx-text";
  var ATTR_HTML = "sx-html";
  var ATTR_SHOW = "sx-show";
  var ATTR_BIND_PREFIX = "sx-bind:";
  var ATTR_ON_PREFIX = "sx-on:";
  var ATTR_MODEL = "sx-model";
  var ATTR_MODEL_PREFIX = "sx-model.";
  var ATTR_CLASS = "sx-class";
  var ATTR_TOGGLE = "sx-toggle";
  var ATTR_ERROR_FALLBACK = "sx-error-fallback";
  var ATTR_FOR = "sx-for";
  var ATTR_MEMO = "sx-memo";
  var ATTR_PAGE = "sx-page";
  var ATTR_BOOST = "sx-boost";
  var ATTR_BOOST_ON = "sx-boost-on";
  var NET_METHODS = ["get", "post", "put", "delete"];
  var ATTR_TRIGGER = "sx-trigger";
  var ATTR_TRIGGER_DEBOUNCE = "sx-trigger-debounce";
  var ATTR_TARGET = "sx-target";
  var ATTR_SWAP = "sx-swap";
  var ATTR_VARS = "sx-vars";
  var ATTR_JSON_INTO = "sx-json-into";
  var ATTR_OPTIMISTIC = "sx-optimistic";
  var ATTR_REVERT_ON_ERROR = "sx-revert-on-error";
  var ATTR_POLL = "sx-poll";
  var ATTR_POLL_WHILE = "sx-poll-while";
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
  var ATTR_CHART = "sx-chart";
  var ATTR_CHART_TYPE = "sx-chart-type";
  var ATTR_CHART_OPTIONS = "sx-chart-options";
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
    return typeof fn === "function" && /^class\s/.test(fn.toString());
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
  var ARRAY_MUTATING_METHODS = new Set([
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse"
  ]);
  function createDeepReactiveProxy(obj, onChange, visited = new WeakSet) {
    if (obj === null || typeof obj !== "object")
      return obj;
    if (visited.has(obj))
      return obj;
    visited.add(obj);
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => {
        if (item && typeof item === "object") {
          obj[i] = createDeepReactiveProxy(item, onChange, visited);
        }
      });
    } else {
      Object.keys(obj).forEach((key) => {
        if (obj[key] && typeof obj[key] === "object") {
          obj[key] = createDeepReactiveProxy(obj[key], onChange, visited);
        }
      });
    }
    const handler = {
      get(target, key, receiver) {
        const value = Reflect.get(target, key, receiver);
        if (Array.isArray(target) && ARRAY_MUTATING_METHODS.has(key) && typeof value === "function") {
          return function(...args) {
            const reactiveArgs = args.map((arg) => {
              if (arg && typeof arg === "object") {
                return createDeepReactiveProxy(arg, onChange, new WeakSet);
              }
              return arg;
            });
            const result = value.apply(target, reactiveArgs);
            onChange();
            return result;
          };
        }
        if (typeof value === "function" && !isClass(value)) {
          return value.bind(receiver);
        }
        return value;
      },
      set(target, key, value, receiver) {
        const old = target[key];
        if (value && typeof value === "object") {
          value = createDeepReactiveProxy(value, onChange, new WeakSet);
        }
        const ok = Reflect.set(target, key, value, receiver);
        if (old !== value) {
          onChange(key, value, old);
        }
        return ok;
      },
      deleteProperty(target, key) {
        const ok = Reflect.deleteProperty(target, key);
        onChange();
        return ok;
      }
    };
    return new Proxy(obj, handler);
  }
  function createReactiveState(raw, onChange) {
    const watchers = raw.watch || {};
    if (watchers && typeof watchers === "object") {
      delete raw.watch;
    }
    const notify = (key, value, old) => {
      onChange(key, value, old);
      if (watchers && typeof watchers[key] === "function") {
        try {
          watchers[key].call(proxy, value, old);
        } catch (e) {
          console.error("SpruceX watcher error on", key, e);
        }
      }
    };
    const proxy = createDeepReactiveProxy(raw, notify);
    return { proxy, watchers };
  }

  // src/store/index.js
  var globalStores = Object.create(null);
  var storeSubscribers = Object.create(null);
  function getStore(name) {
    return globalStores[name];
  }
  function initStore(name, value, options = {}) {
    if (!globalStores[name]) {
      let raw = value || {};
      if (options.persist) {
        try {
          const stored = localStorage.getItem(`sprucex-store-${name}`);
          if (stored) {
            Object.assign(raw, JSON.parse(stored));
          }
        } catch (e) {
          console.error(`SpruceX store "${name}" load error:`, e);
        }
      }
      const subscribers = new Set;
      storeSubscribers[name] = subscribers;
      const notify = () => {
        if (options.persist) {
          try {
            localStorage.setItem(`sprucex-store-${name}`, JSON.stringify(globalStores[name]));
          } catch (e) {
            console.error(`SpruceX store "${name}" save error:`, e);
          }
        }
        subscribers.forEach((comp) => comp.scheduleUpdate());
      };
      globalStores[name] = createDeepReactiveProxy(raw, notify);
    }
    return globalStores[name];
  }
  function removeStore(name) {
    if (!globalStores[name])
      return;
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

  // src/utils/animations.js
  var autoAnimate = null;
  var autoAnimateLoaded = false;
  function getAutoAnimate() {
    if (autoAnimateLoaded)
      return autoAnimate;
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

  // src/utils/eval.js
  var MAX_CACHE_SIZE = 500;
  var evalFnCache = new Map;
  var execFnCache = new Map;
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
  function evalInScope(expr, scope, extra = {}) {
    const locals = scope.locals || {};
    const extraKeys = Object.keys(extra);
    const cacheKey = expr + "|" + extraKeys.join(",");
    const storeAccessor = scope.storeAccessor || getStore;
    let fn = evalFnCache.get(cacheKey);
    if (!fn) {
      try {
        fn = new Function("$state", "$event", "$refs", "$emit", "$store", "$locals", ...extraKeys, `with($state){ with($locals){ return (${expr}); } }`);
        boundedCacheSet(evalFnCache, cacheKey, fn);
      } catch (e) {
        if (scope.debug) {
          console.error("SpruceX expression compile error:", expr, e);
        }
        throw e;
      }
    }
    try {
      return fn(scope.state, scope.lastEvent || null, scope.refs, scope.emit, storeAccessor, locals, ...Object.values(extra));
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
    } catch (e) {
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
    const extraKeys = Object.keys(extra);
    const cacheKey = stmt + "|" + extraKeys.join(",");
    const storeAccessor = scope.storeAccessor || getStore;
    let fn = execFnCache.get(cacheKey);
    if (!fn) {
      try {
        fn = new Function("$state", "$event", "$refs", "$emit", "$store", "$locals", ...extraKeys, `with($state){ with($locals){ ${stmt} } }`);
        boundedCacheSet(execFnCache, cacheKey, fn);
      } catch (e) {
        console.error("SpruceX statement compile error:", stmt, e);
        return;
      }
    }
    try {
      fn(scope.state, scope.lastEvent || null, scope.refs, scope.emit, storeAccessor, locals, ...Object.values(extra));
    } catch (e) {
      console.error("SpruceX statement error:", stmt, e);
    }
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
    const targetChildren = Array.from(target.childNodes);
    const sourceChildren = Array.from(source.childNodes);
    const targetKeyedMap = new Map;
    const targetIdMap = new Map;
    targetChildren.forEach((child, i) => {
      if (child.nodeType === 1) {
        const key = child.getAttribute?.("sx-key") || child.getAttribute?.("key");
        if (key)
          targetKeyedMap.set(key, { el: child, index: i });
        const id = child.id;
        if (id)
          targetIdMap.set(id, { el: child, index: i });
      }
    });
    let targetIndex = 0;
    for (let i = 0;i < sourceChildren.length; i++) {
      const sourceChild = sourceChildren[i];
      if (sourceChild.nodeType === 3 || sourceChild.nodeType === 8) {
        const targetChild = targetChildren[targetIndex];
        if (targetChild && targetChild.nodeType === sourceChild.nodeType) {
          if (targetChild.nodeValue !== sourceChild.nodeValue) {
            targetChild.nodeValue = sourceChild.nodeValue;
          }
          targetIndex++;
        } else {
          const clone = sourceChild.cloneNode(true);
          if (targetChild) {
            target.insertBefore(clone, targetChild);
          } else {
            target.appendChild(clone);
          }
        }
        continue;
      }
      if (sourceChild.nodeType === 1) {
        const sourceId = sourceChild.id;
        if (sourceId && morphedIds.has(sourceId)) {
          targetIndex++;
          continue;
        }
        const sourceKey = sourceChild.getAttribute?.("sx-key") || sourceChild.getAttribute?.("key");
        let matchedTarget = null;
        if (sourceKey && targetKeyedMap.has(sourceKey)) {
          matchedTarget = targetKeyedMap.get(sourceKey).el;
          targetKeyedMap.delete(sourceKey);
        } else if (sourceId && targetIdMap.has(sourceId)) {
          matchedTarget = targetIdMap.get(sourceId).el;
          targetIdMap.delete(sourceId);
        } else {
          const targetChild = targetChildren[targetIndex];
          if (targetChild?.nodeType === 1 && targetChild.tagName === sourceChild.tagName) {
            const targetKey = targetChild.getAttribute?.("sx-key") || targetChild.getAttribute?.("key");
            if (!targetKey) {
              matchedTarget = targetChild;
            }
          }
        }
        if (matchedTarget) {
          morphElement(matchedTarget, sourceChild);
          const currentIndex = Array.from(target.childNodes).indexOf(matchedTarget);
          const desiredIndex = i;
          if (currentIndex !== desiredIndex && currentIndex !== -1) {
            const refNode = target.childNodes[desiredIndex];
            if (refNode && refNode !== matchedTarget) {
              target.insertBefore(matchedTarget, refNode);
            }
          }
          targetIndex++;
        } else {
          const clone = sourceChild.cloneNode(true);
          const refNode = targetChildren[targetIndex];
          if (refNode) {
            target.insertBefore(clone, refNode);
          } else {
            target.appendChild(clone);
          }
        }
      }
    }
    const finalChildren = Array.from(target.childNodes);
    for (let i = finalChildren.length - 1;i >= sourceChildren.length; i--) {
      const extra = finalChildren[i];
      if (extra) {
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
  var BLOCKED_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);
  function resolveGlobalDataReference(reference) {
    if (!reference || typeof reference !== "string")
      return;
    const root = typeof window !== "undefined" ? window : globalThis;
    let cur = root;
    for (const segment of reference.split(".")) {
      if (cur == null)
        return;
      if (BLOCKED_SEGMENTS.has(segment))
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

  // src/core/component.js
  class Component {
    constructor(root) {
      this.root = root;
      this.bindings = [];
      this.memoBindings = [];
      this.eventHandlers = [];
      this.emitterHandlers = [];
      this.netBindings = [];
      this.modelBindings = [];
      this.chartBindings = [];
      this.gridBindings = [];
      this.forBlocks = [];
      this.pollTimers = [];
      this.debounceTimers = new Set;
      this.chartInstances = new Map;
      this.chartSnapshots = new WeakMap;
      this.gridInstances = new Map;
      this.requestUiState = new WeakMap;
      this.netRequestMeta = new WeakMap;
      this.warnedMissingChart = false;
      this.warnedMissingGridStack = false;
      this.lastEvent = null;
      this.debug = false;
      this.locals = {};
      this.updatePending = false;
      this.isDestroyed = false;
      this.originalClasses = new WeakMap;
      this.animatedElements = new Map;
      this.refs = {};
      this.emitter = document.createElement("div");
      this.emit = (name, detail) => {
        const evt = new CustomEvent(name, { detail, bubbles: false });
        this.emitter.dispatchEvent(evt);
      };
      this.initState();
      this.collectRefs();
      this.initIntegrationBindings();
      this.setupDelegation();
      this.scan(root);
      this.renderForBlocks();
      this.applyInitialRender();
      this.callHook("init");
      queueMicrotask(() => this.callHook("mounted"));
    }
    scheduleUpdate() {
      if (this.updatePending)
        return;
      this.updatePending = true;
      this.rafId = requestAnimationFrame(() => {
        this.updatePending = false;
        this.rafId = null;
        const activeEl = document.activeElement;
        const isTextInput = activeEl && activeEl.tagName === "INPUT" && ![
          "checkbox",
          "radio",
          "button",
          "submit",
          "reset",
          "file",
          "color",
          "range",
          "hidden"
        ].includes((activeEl.type || "text").toLowerCase());
        const isInputFocused = activeEl && (isTextInput || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable);
        const focusedForInput = isInputFocused && this.root.contains(activeEl) ? activeEl : null;
        this.renderForBlocks(focusedForInput);
        this.updateBindings();
        this.modelBindings.forEach((mb) => mb.updateDom());
        this.updateMemoBindings();
        this.updateIntegrations();
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
      const jsonScript = this.root.querySelector("script[sx-init-data]");
      const looksLikeIdentifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(rawExpr);
      if (jsonScript && looksLikeIdentifier) {
        try {
          const parsed = JSON.parse(jsonScript.textContent.trim() || "{}");
          raw = parsed;
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
              const args = argsSource ? new Function("$store", "$data", `return [${argsSource}];`)(storeAccessor, getDataFactory) : [];
              raw = resolvedFactory.apply(this.root, args);
            } else if (rawExpr === dataRef && typeof resolvedFactory === "function") {
              raw = resolvedFactory.call(this.root);
            } else if (rawExpr === dataRef) {
              raw = resolvedFactory;
            } else {
              const fn = new Function("$store", "$data", `return (${rawExpr});`);
              raw = fn(storeAccessor, getDataFactory);
            }
          } else {
            const fn = new Function("$store", "$data", `return (${rawExpr});`);
            raw = fn(storeAccessor, getDataFactory);
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
      if (localKey) {
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
      const { proxy } = createReactiveState(raw, () => {
        if (localKey) {
          try {
            localStorage.setItem(localKey, JSON.stringify(proxy));
          } catch (e) {
            console.error("SpruceX sx-local save error:", e);
          }
        }
        this.scheduleUpdate();
      });
      this.state = proxy;
    }
    collectRefs() {
      this.refs = {};
      this.root.querySelectorAll("[sx-ref]").forEach((el) => {
        const name = el.getAttribute("sx-ref");
        if (name)
          this.refs[name] = el;
      });
    }
    setupDelegation() {
      DELEGATED_EVENTS.forEach((eventName) => {
        const handler = (e) => this.handleDelegatedEvent(e);
        this.root.addEventListener(eventName, handler);
        if (!this._delegatedCleanups)
          this._delegatedCleanups = [];
        this._delegatedCleanups.push(() => this.root.removeEventListener(eventName, handler));
      });
    }
    handleDelegatedEvent(e) {
      let cur = e.target;
      let propagationStopped = false;
      const originalStop = e.stopPropagation;
      e.stopPropagation = function() {
        propagationStopped = true;
        originalStop.apply(this, arguments);
      };
      while (cur && cur.nodeType === 1) {
        if (cur.__sx_handlers && cur.__sx_handlers[e.type]) {
          cur.__sx_handlers[e.type].forEach(({ handler: handlerFn, component }) => {
            if (component !== this)
              return;
            if (!propagationStopped) {
              handlerFn(e);
            }
          });
        }
        if (propagationStopped)
          break;
        if (cur === this.root)
          break;
        cur = cur.parentNode;
      }
    }
    scan(root) {
      const self = this;
      walk(root, (el) => {
        if (el !== root && el.hasAttribute(ATTR_DATA))
          return false;
        if (el.tagName === "TEMPLATE" && el.hasAttribute(ATTR_FOR)) {
          const expr = el.getAttribute(ATTR_FOR) || "";
          const parent = el.parentElement;
          if (!parent)
            return;
          const marker = document.createComment("sx-for");
          parent.insertBefore(marker, el);
          el.remove();
          const forDef = parseForExpression(expr);
          if (!forDef) {
            console.error("SpruceX invalid sx-for expression:", expr);
            return;
          }
          self.forBlocks.push({
            template: el,
            parent,
            marker,
            expr,
            def: forDef,
            instances: [],
            autoAnimate: parent.hasAttribute(ATTR_ANIMATE)
          });
          if (parent.hasAttribute(ATTR_ANIMATE)) {
            const opts = parent.getAttribute(ATTR_ANIMATE);
            let config = {};
            if (opts && opts !== "true" && opts !== "") {
              try {
                config = JSON.parse(opts);
              } catch (e) {
                const duration = parseInt(opts, 10);
                if (!isNaN(duration))
                  config = { duration };
              }
            }
            self.setupAutoAnimate(parent, config);
          }
        }
      });
      walk(root, (el) => {
        if (el.nodeType !== 1)
          return;
        if (el !== root && el.hasAttribute(ATTR_DATA))
          return false;
        if (el.tagName === "TEMPLATE" && el.hasAttribute(ATTR_FOR))
          return;
        this.scanElement(el, null);
      });
      this.setupNetworkBindings();
    }
    scanElement(el, locals) {
      const self = this;
      const hasMemo = el.hasAttribute(ATTR_MEMO);
      const textExpr = el.getAttribute(ATTR_TEXT);
      if (textExpr && !hasMemo) {
        self.bindings.push({
          el,
          type: "text",
          expr: textExpr,
          errorFallback: el.getAttribute(ATTR_ERROR_FALLBACK),
          locals
        });
      }
      const htmlExpr = el.getAttribute(ATTR_HTML);
      if (htmlExpr && !hasMemo) {
        self.bindings.push({
          el,
          type: "html",
          expr: htmlExpr,
          errorFallback: el.getAttribute(ATTR_ERROR_FALLBACK),
          locals
        });
      }
      const showExpr = el.getAttribute(ATTR_SHOW);
      if (showExpr) {
        self.bindings.push({
          el,
          type: "show",
          expr: showExpr,
          errorFallback: el.getAttribute(ATTR_ERROR_FALLBACK),
          locals
        });
      }
      const classExpr = el.getAttribute(ATTR_CLASS);
      if (classExpr) {
        if (!self.originalClasses.has(el)) {
          self.originalClasses.set(el, new Set(Array.from(el.classList)));
        }
        self.bindings.push({
          el,
          type: "class",
          expr: classExpr,
          errorFallback: el.getAttribute(ATTR_ERROR_FALLBACK),
          locals
        });
      }
      const toggleKey = el.getAttribute(ATTR_TOGGLE);
      if (toggleKey) {
        const handler = () => {
          this.state[toggleKey] = !this.state[toggleKey];
        };
        el.addEventListener("click", handler);
        self.eventHandlers.push({ el, event: "click", handler });
      }
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith(ATTR_BIND_PREFIX)) {
          const name = attr.name.slice(ATTR_BIND_PREFIX.length);
          self.bindings.push({
            el,
            type: "bind",
            attr: name,
            expr: attr.value,
            errorFallback: el.getAttribute(ATTR_ERROR_FALLBACK),
            locals
          });
        }
      }
      const memoExpr = el.getAttribute(ATTR_MEMO);
      const textForMemo = el.getAttribute(ATTR_TEXT);
      const htmlForMemo = el.getAttribute(ATTR_HTML);
      if (memoExpr && (textForMemo || htmlForMemo)) {
        let deps = [];
        try {
          const fn = new Function(`return (${memoExpr});`);
          const val = fn();
          if (Array.isArray(val))
            deps = val;
        } catch (e) {
          console.error("SpruceX sx-memo parse error:", memoExpr, e);
        }
        self.memoBindings.push({
          el,
          expr: textForMemo || htmlForMemo,
          type: textForMemo ? "text" : "html",
          deps,
          lastVals: null,
          lastResult: null,
          locals
        });
      }
      this.setupModelBinding(el, locals);
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith(ATTR_ON_PREFIX)) {
          const full = attr.name.slice(ATTR_ON_PREFIX.length);
          const [eventName, ...mods] = full.split(".");
          const expr = attr.value;
          const handler = (ev) => {
            if (mods.includes("prevent"))
              ev.preventDefault();
            if (mods.includes("stop"))
              ev.stopPropagation();
            if (mods.includes("self") && ev.target !== el)
              return;
            if (mods.includes("window") && ev.target !== window)
              return;
            if (mods.includes("document") && ev.target !== document)
              return;
            if (ev instanceof KeyboardEvent) {
              const keys = mods.filter((m) => !["prevent", "stop", "self", "window", "document"].includes(m));
              if (keys.length > 0) {
                const key = ev.key.toLowerCase();
                if (!keys.includes(key))
                  return;
              }
            }
            this.lastEvent = ev;
            const prev = this.locals;
            if (locals)
              this.locals = locals;
            execInScope(expr, this);
            this.locals = prev;
          };
          if (DELEGATED_EVENTS.has(eventName)) {
            if (!el.__sx_handlers)
              el.__sx_handlers = {};
            if (!el.__sx_handlers[eventName])
              el.__sx_handlers[eventName] = [];
            el.__sx_handlers[eventName].push({ handler, component: this });
          } else {
            el.addEventListener(eventName, handler);
            self.eventHandlers.push({ el, event: eventName, handler });
          }
        }
      }
      if (!locals) {
        for (const m of NET_METHODS) {
          const attrName = `sx-${m}`;
          const urlTpl = el.getAttribute(attrName);
          if (urlTpl) {
            const trigger = el.getAttribute(ATTR_TRIGGER) || (el.tagName === "FORM" ? "submit" : "click");
            const triggerDebounce = el.getAttribute(ATTR_TRIGGER_DEBOUNCE);
            const target = el.getAttribute(ATTR_TARGET) || null;
            const swap = el.getAttribute(ATTR_SWAP) || "innerHTML";
            const varsExpr = el.getAttribute(ATTR_VARS);
            const jsonInto = el.getAttribute(ATTR_JSON_INTO);
            const optimistic = el.getAttribute(ATTR_OPTIMISTIC);
            const revertOnError = el.getAttribute(ATTR_REVERT_ON_ERROR);
            const poll = el.getAttribute(ATTR_POLL);
            const pollWhile = el.getAttribute(ATTR_POLL_WHILE);
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
              method: m.toUpperCase(),
              urlTpl,
              trigger,
              triggerDebounce,
              target,
              swap,
              varsExpr,
              jsonInto,
              optimistic,
              revertOnError,
              poll: poll ? Number(poll) : null,
              pollWhile,
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
            self.netBindings.push(binding);
          }
        }
        this.scanIntegrations(el);
      }
      if (el.hasAttribute(ATTR_ANIMATE)) {
        const optionsStr = el.getAttribute(ATTR_ANIMATE);
        queueMicrotask(() => this.setupAutoAnimate(el, optionsStr || {}));
      }
    }
    parseModelBindingConfig(direct, modifierAttrs) {
      const keyExpr = direct || modifierAttrs[0]?.value || null;
      const mods = new Set;
      let debounceMs = null;
      modifierAttrs.forEach((attr) => {
        const parts = attr.name.slice(ATTR_MODEL_PREFIX.length).split(".").filter(Boolean);
        parts.forEach((part) => {
          if (part === "debounce-ms") {
            const parsed = Number(attr.value || "200");
            if (Number.isFinite(parsed) && parsed > 0) {
              debounceMs = parsed;
            }
            return;
          }
          mods.add(part);
        });
      });
      return { keyExpr, mods, debounceMs };
    }
    setupModelBinding(el, locals = null) {
      const direct = el.getAttribute(ATTR_MODEL);
      const modifierAttrs = Array.from(el.attributes).filter((a) => a.name.startsWith(ATTR_MODEL_PREFIX));
      if (!direct && modifierAttrs.length === 0)
        return;
      const { keyExpr, mods, debounceMs } = this.parseModelBindingConfig(direct, modifierAttrs);
      const type = (el.type || "").toLowerCase();
      const isCheckbox = type === "checkbox";
      const isRadio = type === "radio";
      const isSelect = el.tagName === "SELECT";
      const updateDom = () => {
        const prev = this.locals;
        if (locals)
          this.locals = locals;
        try {
          const v = safeEval(keyExpr, this);
          if (isCheckbox) {
            if (Array.isArray(v)) {
              el.checked = v.includes(el.value);
            } else {
              el.checked = !!v;
            }
          } else if (isRadio) {
            el.checked = String(v) === String(el.value);
          } else if (isSelect) {
            el.value = v ?? "";
          } else {
            if (v !== null && v !== undefined && typeof v === "object") {
              el.value = JSON.stringify(v);
            } else {
              el.value = v ?? "";
            }
          }
        } finally {
          this.locals = prev;
        }
      };
      const applyModifiers = (val) => {
        if (mods.has("trim") && typeof val === "string")
          val = val.trim();
        if (mods.has("number")) {
          const n = Number(val);
          if (!Number.isNaN(n))
            val = n;
        }
        return val;
      };
      const writeBack = () => {
        const prev = this.locals;
        if (locals)
          this.locals = locals;
        try {
          let v;
          if (isCheckbox) {
            const current = safeEval(keyExpr, this);
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
          } else if (isSelect) {
            v = el.value;
          } else {
            v = el.value;
          }
          v = applyModifiers(v);
          execInScope(`${keyExpr} = __sx_value`, this, { __sx_value: v });
        } finally {
          this.locals = prev;
        }
      };
      let eventName = "input";
      if (mods.has("lazy"))
        eventName = "change";
      let handler = writeBack;
      if (debounceMs != null && debounceMs > 0) {
        let t = null;
        handler = () => {
          clearTimeout(t);
          t = setTimeout(writeBack, debounceMs);
        };
      }
      el.addEventListener(eventName, handler);
      this.eventHandlers.push({ el, event: eventName, handler });
      this.modelBindings.push({ updateDom, locals });
    }
    setupNetworkBindings() {
      for (const nb of this.netBindings) {
        const { el, poll, pollWhile } = nb;
        const triggerDefs = this.parseNetworkTriggers(nb);
        const doReq = (ev = null) => {
          if (ev) {
            this.lastEvent = ev;
            if (ev.type === "submit")
              ev.preventDefault();
          }
          if (!this.confirmRequest(nb))
            return;
          this.performRequest(nb);
        };
        triggerDefs.forEach(({ eventName, debounceMs }) => {
          if (eventName === "load") {
            queueMicrotask(() => doReq());
            return;
          }
          const domHandler = this.wrapDebounced(doReq, debounceMs);
          el.addEventListener(eventName, domHandler);
          this.eventHandlers.push({ el, event: eventName, handler: domHandler });
          const compHandler = this.wrapDebounced(() => this.performRequest(nb), debounceMs);
          this.emitter.addEventListener(eventName, compHandler);
          this.emitterHandlers.push({ event: eventName, handler: compHandler });
        });
        if (poll && !Number.isNaN(poll) && poll > 0) {
          const timer = setInterval(() => {
            if (pollWhile) {
              const ok = !!safeEval(pollWhile, this);
              if (!ok)
                return;
            }
            this.performRequest(nb);
          }, poll);
          this.pollTimers.push(timer);
        }
      }
    }
    parseNetworkTriggers(nb) {
      const fallbackDebounce = Number(nb.triggerDebounce);
      const debounceMs = Number.isFinite(fallbackDebounce) && fallbackDebounce > 0 ? fallbackDebounce : null;
      const raw = (nb.trigger || "").trim();
      const fallback = nb.el.tagName === "FORM" ? "submit" : "click";
      const tokens = (raw || fallback).split(",").flatMap((part) => part.trim().split(/\s+/)).filter(Boolean);
      if (!tokens.length) {
        return [{ eventName: fallback, debounceMs }];
      }
      return tokens.map((token) => {
        const parts = token.split(".");
        const eventName = parts[0] || fallback;
        let triggerDebounce = debounceMs;
        const debounceIdx = parts.indexOf("debounce");
        if (debounceIdx !== -1) {
          const parsed = Number(parts[debounceIdx + 1]);
          if (Number.isFinite(parsed) && parsed > 0) {
            triggerDebounce = parsed;
          }
        }
        return { eventName, debounceMs: triggerDebounce };
      });
    }
    wrapDebounced(fn, debounceMs) {
      if (!debounceMs || debounceMs <= 0)
        return fn;
      let timer = null;
      return (...args) => {
        if (timer) {
          clearTimeout(timer);
          this.debounceTimers.delete(timer);
        }
        timer = setTimeout(() => {
          this.debounceTimers.delete(timer);
          timer = null;
          fn(...args);
        }, debounceMs);
        this.debounceTimers.add(timer);
      };
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
        } catch (_jsonErr) {
          const evaluated = safeEval(options, this);
          options = evaluated && typeof evaluated === "object" ? evaluated : {};
        }
      }
      const defaultOptions = {
        duration: 250,
        easing: "ease-in-out"
      };
      const finalOptions = { ...defaultOptions, ...options };
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
      const { urlTpl, varsExpr } = nb;
      if (!varsExpr)
        return urlTpl;
      const vars = safeEval(varsExpr, this) || {};
      return urlTpl.replace(/\$\{([A-Za-z_$][A-Za-z0-9_$.]*)\}/g, (_match, key) => {
        const segments = key.split(".");
        let value = vars;
        for (const seg of segments) {
          if (value == null)
            return "";
          value = value[seg];
        }
        return value ?? "";
      });
    }
    buildBody(nb) {
      const { el, method, includeSelector, bodyExpr, bodyType } = nb;
      if (!["POST", "PUT", "DELETE"].includes(method)) {
        return { body: null, bodyKind: null };
      }
      if (bodyExpr) {
        const value = this.evaluateExpressionOrLiteral(bodyExpr);
        const resolvedType = this.resolveBodyType(bodyType, value);
        if (resolvedType === "json") {
          return {
            body: typeof value === "string" ? value : JSON.stringify(value ?? {}),
            bodyKind: "json"
          };
        }
        if (resolvedType === "form") {
          const fd = this.toFormData(value);
          if (fd instanceof FormData && includeSelector) {
            this.appendIncludeData(fd, includeSelector);
          }
          return { body: fd, bodyKind: "form" };
        }
        return { body: value ?? null, bodyKind: null };
      }
      if (el.tagName === "FORM") {
        const fd = new FormData(el);
        if (includeSelector) {
          this.appendIncludeData(fd, includeSelector);
        }
        if ((bodyType || "").toLowerCase() === "json") {
          return {
            body: JSON.stringify(this.formDataToJson(fd)),
            bodyKind: "json"
          };
        }
        return { body: fd, bodyKind: "form" };
      }
      return { body: null, bodyKind: null };
    }
    resolveBodyType(rawType, value) {
      const lowered = (rawType || "").toLowerCase();
      if (lowered === "json" || lowered === "form")
        return lowered;
      if (value instanceof FormData || value instanceof URLSearchParams) {
        return "form";
      }
      if (value && typeof value === "object" && !(value instanceof Blob) && !(value instanceof ArrayBuffer)) {
        return "json";
      }
      return null;
    }
    toFormData(value) {
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
      Object.entries(value).forEach(([k, v]) => {
        this.appendFormValue(fd, k, v);
      });
      return fd;
    }
    appendFormValue(fd, key, value) {
      if (Array.isArray(value)) {
        value.forEach((item) => this.appendFormValue(fd, key, item));
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
    appendIncludeData(fd, includeSelector) {
      document.querySelectorAll(includeSelector).forEach((extra) => {
        if (extra.tagName === "FORM") {
          new FormData(extra).forEach((v, k) => fd.append(k, v));
          return;
        }
        this.appendElementValue(fd, extra);
        if (extra.querySelectorAll) {
          extra.querySelectorAll("input[name], select[name], textarea[name]").forEach((input) => this.appendElementValue(fd, input));
        }
      });
    }
    appendElementValue(fd, el) {
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
    formDataToJson(fd) {
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
    buildHeaders(nb, bodyKind, hasBody) {
      const headers = new Headers;
      const evaluated = nb.headersExpr ? safeEval(nb.headersExpr, this) : undefined;
      if (evaluated instanceof Headers) {
        evaluated.forEach((v, k) => headers.set(k, v));
      } else if (Array.isArray(evaluated)) {
        evaluated.forEach((entry) => {
          if (Array.isArray(entry) && entry.length >= 2) {
            headers.set(String(entry[0]), String(entry[1]));
          }
        });
      } else if (evaluated && typeof evaluated === "object") {
        Object.entries(evaluated).forEach(([k, v]) => {
          if (v != null)
            headers.set(k, String(v));
        });
      }
      if (bodyKind === "json" && hasBody && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      return headers;
    }
    getCsrfToken() {
      if (typeof document === "undefined")
        return null;
      const cookieName = Component.csrfCookieName || DEFAULT_CSRF_COOKIE_NAME;
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
    addCsrfHeader(headers, method) {
      const upperMethod = String(method || "GET").toUpperCase();
      if (["GET", "HEAD", "OPTIONS", "TRACE"].includes(upperMethod))
        return;
      const csrfToken = this.getCsrfToken();
      if (csrfToken && !headers.has("X-CSRFToken")) {
        headers.set("X-CSRFToken", csrfToken);
      }
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
      if (!error)
        return null;
      if (typeof error === "string")
        return { message: error };
      return {
        name: error.name || "Error",
        message: error.message || String(error),
        status: error.status
      };
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
      this.emitterHandlers.forEach(({ event, handler }) => {
        this.emitter.removeEventListener(event, handler);
      });
      this.emitterHandlers = [];
    }
    beginNetworkRequest(nb) {
      let meta = this.netRequestMeta.get(nb);
      if (!meta) {
        meta = { seq: 0, controller: null };
        this.netRequestMeta.set(nb, meta);
      }
      meta.seq += 1;
      if (meta.controller && typeof meta.controller.abort === "function") {
        try {
          meta.controller.abort();
        } catch {}
      }
      meta.controller = typeof AbortController !== "undefined" ? new AbortController : null;
      return { seq: meta.seq, controller: meta.controller };
    }
    isCurrentNetworkRequest(nb, seq) {
      const meta = this.netRequestMeta.get(nb);
      return !!meta && meta.seq === seq;
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
    initIntegrationBindings() {
      listIntegrations().forEach((integration) => {
        if (typeof integration.setup !== "function")
          return;
        try {
          integration.setup(this);
        } catch (e) {
          console.error("SpruceX integration setup error:", e);
        }
      });
    }
    scanIntegrations(el) {
      listIntegrations().forEach((integration) => {
        if (typeof integration.scan !== "function")
          return;
        try {
          integration.scan(this, el);
        } catch (e) {
          console.error("SpruceX integration scan error:", e);
        }
      });
    }
    updateIntegrations() {
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
    teardownIntegrations() {
      listIntegrations().forEach((integration) => {
        if (typeof integration.teardown !== "function")
          return;
        try {
          integration.teardown(this);
        } catch (e) {
          console.error("SpruceX integration teardown error:", e);
        }
      });
    }
    async performRequest(nb) {
      const url = this.buildUrl(nb);
      const { body, bodyKind } = this.buildBody(nb);
      const {
        el,
        method,
        target,
        swap,
        jsonInto,
        optimistic,
        revertOnError,
        loadingInto,
        errorInto
      } = nb;
      const headers = this.buildHeaders(nb, bodyKind, body != null);
      const { seq: requestSeq, controller } = this.beginNetworkRequest(nb);
      this.addCsrfHeader(headers, method);
      const endUiState = this.beginRequestUiState(nb);
      this.assignStateValue(loadingInto, true);
      this.assignStateValue(errorInto, null);
      if (optimistic) {
        execInScope(optimistic, this);
      }
      try {
        const fetchOptions = { method };
        if (body != null)
          fetchOptions.body = body;
        if (Array.from(headers.keys()).length > 0) {
          fetchOptions.headers = headers;
        }
        if (controller) {
          fetchOptions.signal = controller.signal;
        }
        const res = await fetch(url, fetchOptions);
        if (!this.isCurrentNetworkRequest(nb, requestSeq))
          return;
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const text = await res.text();
        if (!this.isCurrentNetworkRequest(nb, requestSeq))
          return;
        let json = null;
        if (jsonInto && text.trim().length) {
          try {
            json = JSON.parse(text);
          } catch (e) {
            console.error("SpruceX JSON parse error:", e);
          }
        }
        if (jsonInto && json != null) {
          execInScope(`${jsonInto} = __sx_value`, this, { __sx_value: json });
        } else {
          this.applySwap(target || el, text, swap);
        }
        const detail = { response: res, text, json };
        el.dispatchEvent(new CustomEvent("success", { detail, bubbles: true }));
        el.dispatchEvent(new CustomEvent("sprucex:success", { detail, bubbles: true }));
      } catch (error) {
        if (this.isAbortError(error) || !this.isCurrentNetworkRequest(nb, requestSeq)) {
          return;
        }
        if (revertOnError) {
          execInScope(revertOnError, this);
        }
        this.assignStateValue(errorInto, this.serializeError(error));
        const detail = { error };
        el.dispatchEvent(new CustomEvent("error", { detail, bubbles: true }));
        el.dispatchEvent(new CustomEvent("sprucex:error", { detail, bubbles: true }));
      } finally {
        const isFinished = this.finishNetworkRequest(nb, requestSeq, controller);
        endUiState();
        if (!this.isDestroyed && isFinished) {
          this.assignStateValue(loadingInto, false);
        }
      }
    }
    abortCancelableRequests() {
      this.netBindings.forEach((binding) => {
        const meta = this.netRequestMeta.get(binding);
        if (meta && meta.controller && typeof meta.controller.abort === "function") {
          meta.controller.abort();
        }
      });
    }
    getChartConstructor() {
      if (typeof window === "undefined")
        return null;
      const maybe = window.Chart;
      return maybe && typeof maybe === "object" ? maybe.Chart || maybe : maybe;
    }
    updateChartBindings() {
      this.chartBindings.forEach((binding) => this.syncChartBinding(binding));
    }
    syncChartBinding(binding) {
      const { el, chartExpr, chartTypeExpr, chartOptionsExpr } = binding;
      if (!el.isConnected) {
        this.destroyChartInstance(el);
        return;
      }
      const payload = safeEval(chartExpr, this);
      if (payload == null) {
        this.destroyChartInstance(el);
        return;
      }
      const ChartCtor = this.getChartConstructor();
      if (!ChartCtor) {
        if (!this.warnedMissingChart) {
          this.warnedMissingChart = true;
          console.warn("SpruceX: sx-chart requires Chart.js to be loaded on window.Chart.");
        }
        return;
      }
      const canvas = this.getChartCanvas(el);
      const ctx = canvas?.getContext?.("2d");
      if (!ctx)
        return;
      const explicitType = chartTypeExpr != null ? this.evaluateExpressionOrLiteral(chartTypeExpr) : null;
      const explicitOptions = chartOptionsExpr != null ? this.evaluateExpressionOrLiteral(chartOptionsExpr) : null;
      const data = payload && typeof payload === "object" && "data" in payload ? payload.data : payload;
      const type = typeof explicitType === "string" && explicitType.trim() || (payload && typeof payload === "object" ? payload.type : null) || "line";
      const options = explicitOptions && typeof explicitOptions === "object" ? explicitOptions : payload && typeof payload === "object" && payload.options && typeof payload.options === "object" ? payload.options : {};
      const safeData = this.cloneChartConfigValue(data);
      const safeOptions = this.cloneChartConfigValue(options);
      let chart = this.chartInstances.get(el);
      if (chart && chart.config?.type !== type) {
        chart.destroy();
        this.chartInstances.delete(el);
        chart = null;
      }
      if (!chart) {
        chart = new ChartCtor(ctx, {
          type,
          data: safeData,
          options: safeOptions
        });
        this.chartInstances.set(el, chart);
        this.chartSnapshots.set(el, {
          type,
          data: safeData,
          options: safeOptions
        });
        return;
      }
      const previousSnapshot = this.chartSnapshots.get(el);
      const nextSnapshot = { type, data: safeData, options: safeOptions };
      if (previousSnapshot && this.areChartValuesEqual(previousSnapshot, nextSnapshot)) {
        return;
      }
      chart.data = safeData;
      chart.options = safeOptions;
      chart.update();
      this.chartSnapshots.set(el, nextSnapshot);
    }
    cloneChartConfigValue(value, seen = new WeakMap) {
      if (value == null || typeof value !== "object")
        return value;
      if (seen.has(value))
        return seen.get(value);
      if (Array.isArray(value)) {
        const out2 = [];
        seen.set(value, out2);
        value.forEach((item) => out2.push(this.cloneChartConfigValue(item, seen)));
        return out2;
      }
      const proto = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) {
        return value;
      }
      const out = {};
      seen.set(value, out);
      Object.keys(value).forEach((key) => {
        out[key] = this.cloneChartConfigValue(value[key], seen);
      });
      return out;
    }
    areChartValuesEqual(a, b, seen = new WeakMap) {
      if (Object.is(a, b))
        return true;
      if (typeof a !== typeof b)
        return false;
      if (a == null || b == null)
        return false;
      if (typeof a !== "object")
        return false;
      const pairSet = seen.get(a);
      if (pairSet && pairSet.has(b))
        return true;
      if (pairSet) {
        pairSet.add(b);
      } else {
        seen.set(a, new WeakSet([b]));
      }
      if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length)
          return false;
        for (let i = 0;i < a.length; i += 1) {
          if (!this.areChartValuesEqual(a[i], b[i], seen))
            return false;
        }
        return true;
      }
      if (Array.isArray(b))
        return false;
      const protoA = Object.getPrototypeOf(a);
      const protoB = Object.getPrototypeOf(b);
      if (protoA !== protoB)
        return false;
      if (protoA !== Object.prototype && protoA !== null) {
        return false;
      }
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length)
        return false;
      for (let i = 0;i < keysA.length; i += 1) {
        const key = keysA[i];
        if (!Object.prototype.hasOwnProperty.call(b, key))
          return false;
        if (!this.areChartValuesEqual(a[key], b[key], seen))
          return false;
      }
      return true;
    }
    getChartCanvas(el) {
      if (el.tagName === "CANVAS")
        return el;
      const existing = el.querySelector("canvas");
      if (existing)
        return existing;
      const created = document.createElement("canvas");
      el.appendChild(created);
      return created;
    }
    destroyChartInstance(el) {
      const chart = this.chartInstances.get(el);
      if (!chart)
        return;
      try {
        chart.destroy();
      } catch (e) {
        console.error("SpruceX sx-chart destroy error:", e);
      }
      this.chartInstances.delete(el);
      this.chartSnapshots.delete(el);
    }
    teardownChartBindings() {
      this.chartInstances.forEach((_, el) => this.destroyChartInstance(el));
      this.chartInstances.clear();
    }
    initGridBindings() {
      this.gridBindings.forEach((binding) => {
        const { el } = binding;
        if (!el.isConnected || this.gridInstances.has(el))
          return;
        if (typeof window === "undefined" || !window.GridStack || typeof window.GridStack.init !== "function") {
          if (!this.warnedMissingGridStack) {
            this.warnedMissingGridStack = true;
            console.warn("SpruceX: sx-gridstack requires GridStack on window.GridStack.");
          }
          return;
        }
        const options = this.buildGridOptions(binding);
        const grid = window.GridStack.init(options, el);
        const cleanups = [];
        const bindInto = (eventName, targetExpr) => {
          if (!targetExpr)
            return;
          const handler = (_event, nodes = []) => {
            const value = this.serializeGridNodes(nodes);
            this.assignStateValue(targetExpr, value);
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
        this.gridInstances.set(el, { grid, cleanups });
      });
    }
    buildGridOptions(binding) {
      const options = {};
      const { el, gridExpr, gridOptionsExpr } = binding;
      if (gridExpr && gridExpr.trim() && gridExpr.trim() !== "true") {
        const evaluated = safeEval(gridExpr, this);
        if (evaluated && typeof evaluated === "object" && !Array.isArray(evaluated)) {
          Object.assign(options, evaluated);
        }
      }
      if (gridOptionsExpr) {
        const evaluated = safeEval(gridOptionsExpr, this);
        if (evaluated && typeof evaluated === "object" && !Array.isArray(evaluated)) {
          Object.assign(options, evaluated);
        }
      }
      Array.from(el.attributes).filter((attr) => attr.name.startsWith(ATTR_GRIDSTACK_OPTION_PREFIX)).forEach((attr) => {
        const rawName = attr.name.slice(ATTR_GRIDSTACK_OPTION_PREFIX.length);
        if (!rawName)
          return;
        const optionName = rawName.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        options[optionName] = this.parseGridOptionValue(attr.value);
      });
      return options;
    }
    parseGridOptionValue(raw) {
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
      const evaluated = safeEval(trimmed, this);
      return evaluated === undefined ? trimmed : evaluated;
    }
    serializeGridNodes(nodes) {
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
    teardownGridBindings() {
      this.gridInstances.forEach(({ grid, cleanups }) => {
        cleanups.forEach((fn) => fn());
        if (grid && typeof grid.destroy === "function") {
          grid.destroy(false);
        }
      });
      this.gridInstances.clear();
    }
    applySwap(targetSelectorOrEl, html, swap) {
      const target = typeof targetSelectorOrEl === "string" ? document.querySelector(targetSelectorOrEl) : targetSelectorOrEl;
      if (!target)
        return;
      switch (swap) {
        case "outerHTML":
          target.outerHTML = html;
          break;
        case "before":
          target.insertAdjacentHTML("beforebegin", html);
          break;
        case "after":
          target.insertAdjacentHTML("afterend", html);
          break;
        case "prepend":
          target.insertAdjacentHTML("afterbegin", html);
          break;
        case "append":
          target.insertAdjacentHTML("beforeend", html);
          break;
        case "morph": {
          const parser = new DOMParser;
          const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
          const source = doc.body.firstChild;
          if (source)
            morphNodes(target, source);
          break;
        }
        case "id-map": {
          const parser = new DOMParser;
          const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
          const source = doc.body.firstChild;
          if (source)
            morphNodes(target, source);
          break;
        }
        case "innerHTML":
        default:
          target.innerHTML = html;
      }
    }
    isForBlockDetached(block) {
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
    teardownForBlock(block) {
      if (!block)
        return;
      const instances = Array.isArray(block.instances) ? [...block.instances] : [];
      instances.forEach((inst) => {
        if (inst.elements) {
          inst.elements.forEach((el) => el.remove());
        } else if (inst.fragmentRoot) {
          inst.fragmentRoot.remove();
        }
        this.cleanupInstanceBindings(inst.bindings);
      });
      if (block.instances)
        block.instances.length = 0;
      const idx = this.forBlocks.indexOf(block);
      if (idx !== -1)
        this.forBlocks.splice(idx, 1);
    }
    teardownDetachedForBlocks() {
      this.forBlocks.slice().forEach((block) => {
        if (this.isForBlockDetached(block)) {
          this.teardownForBlock(block);
        }
      });
    }
    teardownAllForBlocks() {
      this.forBlocks.slice().forEach((block) => this.teardownForBlock(block));
      this.forBlocks = [];
    }
    renderForBlocks(focusedEl = null) {
      this.teardownDetachedForBlocks();
      let blockIndex = 0;
      while (blockIndex < this.forBlocks.length) {
        const block = this.forBlocks[blockIndex];
        if (!block) {
          blockIndex += 1;
          continue;
        }
        if (this.isForBlockDetached(block)) {
          this.teardownForBlock(block);
          continue;
        }
        const { def, template, parent, marker, instances, parentLocals } = block;
        const skipFocusedBlock = focusedEl && block.instances.some((inst) => inst.elements && inst.elements.some((el) => el.contains(focusedEl)));
        if (skipFocusedBlock) {
          blockIndex += 1;
          continue;
        }
        const prevLocals = this.locals;
        if (parentLocals) {
          this.locals = parentLocals;
        }
        const collection = safeEval(def.iterable, this) || [];
        const arr = Array.from(collection);
        this.locals = prevLocals;
        const instanceBuckets = new Map;
        instances.forEach((inst) => {
          const key = inst.itemKey;
          if (!instanceBuckets.has(key))
            instanceBuckets.set(key, []);
          instanceBuckets.get(key).push(inst);
        });
        const newInstances = [];
        const reusedInstances = new Set;
        for (let i = 0;i < arr.length; i++) {
          const item = arr[i];
          const idxName = def.index || "$index";
          let key = item;
          if (typeof item === "object" && item !== null) {
            key = item;
          }
          const bucket = instanceBuckets.get(key);
          const inst = bucket && bucket.length > 0 ? bucket.shift() : null;
          if (inst) {
            if (parentLocals) {
              Object.keys(parentLocals).forEach((parentKey) => {
                inst.scopeLocals[parentKey] = parentLocals[parentKey];
              });
            }
            inst.scopeLocals[def.item] = item;
            inst.scopeLocals[idxName] = i;
            newInstances.push(inst);
            reusedInstances.add(inst);
          } else {
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
            const instanceBindings = {
              bindings: [],
              memoBindings: [],
              modelBindings: [],
              eventHandlers: [],
              nestedForBlocks: []
            };
            elements.forEach((el) => {
              const elBindings = this.scanFragmentBindings(el, locals);
              instanceBindings.bindings.push(...elBindings.bindings);
              instanceBindings.memoBindings.push(...elBindings.memoBindings);
              instanceBindings.modelBindings.push(...elBindings.modelBindings);
              instanceBindings.eventHandlers.push(...elBindings.eventHandlers);
              if (elBindings.nestedForBlocks) {
                instanceBindings.nestedForBlocks.push(...elBindings.nestedForBlocks);
              }
            });
            const newInst = {
              scopeLocals: locals,
              elements,
              bindings: instanceBindings,
              itemKey: key
            };
            newInstances.push(newInst);
          }
        }
        instances.forEach((inst) => {
          if (!reusedInstances.has(inst)) {
            if (inst.elements) {
              inst.elements.forEach((el) => el.remove());
            } else if (inst.fragmentRoot) {
              inst.fragmentRoot.remove();
            }
            this.cleanupInstanceBindings(inst.bindings);
          }
        });
        let anchor = marker;
        for (let i = newInstances.length - 1;i >= 0; i--) {
          const inst = newInstances[i];
          inst.elements.forEach((el) => {
            parent.insertBefore(el, anchor);
          });
          if (inst.elements.length > 0) {
            anchor = inst.elements[0];
          }
        }
        block.instances.length = 0;
        block.instances.push(...newInstances);
        blockIndex += 1;
      }
    }
    scanFragmentBindings(rootNode, locals) {
      const self = this;
      const instanceBindings = {
        bindings: [],
        memoBindings: [],
        modelBindings: [],
        eventHandlers: [],
        nestedForBlocks: []
      };
      walk(rootNode, (el) => {
        if (el.nodeType !== 1)
          return;
        if (el.hasAttribute(ATTR_DATA))
          return false;
        if (el.tagName === "TEMPLATE" && el.hasAttribute(ATTR_FOR)) {
          const expr = el.getAttribute(ATTR_FOR) || "";
          const parent = el.parentElement;
          if (!parent)
            return;
          const marker = document.createComment("sx-for");
          parent.insertBefore(marker, el);
          el.remove();
          const forDef = parseForExpression(expr);
          if (!forDef) {
            console.error("SpruceX invalid nested sx-for expression:", expr);
            return false;
          }
          const nestedBlock = {
            template: el,
            parent,
            marker,
            expr,
            def: forDef,
            instances: [],
            parentLocals: locals,
            autoAnimate: parent.hasAttribute(ATTR_ANIMATE)
          };
          self.forBlocks.push(nestedBlock);
          instanceBindings.nestedForBlocks.push(nestedBlock);
          if (parent.hasAttribute(ATTR_ANIMATE)) {
            const opts = parent.getAttribute(ATTR_ANIMATE);
            let config = {};
            if (opts && opts !== "true" && opts !== "") {
              try {
                config = JSON.parse(opts);
              } catch (e) {
                const duration = parseInt(opts, 10);
                if (!isNaN(duration))
                  config = { duration };
              }
            }
            self.setupAutoAnimate(parent, config);
          }
          return false;
        }
        const hasMemo = el.hasAttribute(ATTR_MEMO);
        const textExpr = el.getAttribute(ATTR_TEXT);
        if (textExpr && !hasMemo) {
          const binding = {
            el,
            type: "text",
            expr: textExpr,
            errorFallback: el.getAttribute(ATTR_ERROR_FALLBACK),
            locals
          };
          self.bindings.push(binding);
          instanceBindings.bindings.push(binding);
        }
        const htmlExpr = el.getAttribute(ATTR_HTML);
        if (htmlExpr && !hasMemo) {
          const binding = {
            el,
            type: "html",
            expr: htmlExpr,
            errorFallback: el.getAttribute(ATTR_ERROR_FALLBACK),
            locals
          };
          self.bindings.push(binding);
          instanceBindings.bindings.push(binding);
        }
        const showExpr = el.getAttribute(ATTR_SHOW);
        if (showExpr) {
          const binding = {
            el,
            type: "show",
            expr: showExpr,
            errorFallback: el.getAttribute(ATTR_ERROR_FALLBACK),
            locals
          };
          self.bindings.push(binding);
          instanceBindings.bindings.push(binding);
        }
        const classExpr = el.getAttribute(ATTR_CLASS);
        if (classExpr) {
          if (!self.originalClasses.has(el)) {
            self.originalClasses.set(el, new Set(Array.from(el.classList)));
          }
          const binding = {
            el,
            type: "class",
            expr: classExpr,
            errorFallback: el.getAttribute(ATTR_ERROR_FALLBACK),
            locals
          };
          self.bindings.push(binding);
          instanceBindings.bindings.push(binding);
        }
        for (const attr of Array.from(el.attributes)) {
          if (attr.name.startsWith(ATTR_BIND_PREFIX)) {
            const name = attr.name.slice(ATTR_BIND_PREFIX.length);
            const binding = {
              el,
              type: "bind",
              attr: name,
              expr: attr.value,
              errorFallback: el.getAttribute(ATTR_ERROR_FALLBACK),
              locals
            };
            self.bindings.push(binding);
            instanceBindings.bindings.push(binding);
          }
        }
        const memoExpr = el.getAttribute(ATTR_MEMO);
        const textForMemo = el.getAttribute(ATTR_TEXT);
        const htmlForMemo = el.getAttribute(ATTR_HTML);
        if (memoExpr && (textForMemo || htmlForMemo)) {
          let deps = [];
          try {
            const fn = new Function(`return (${memoExpr});`);
            const val = fn();
            if (Array.isArray(val))
              deps = val;
          } catch (e) {
            console.error("SpruceX sx-memo parse error:", memoExpr, e);
          }
          const memoBinding = {
            el,
            expr: textForMemo || htmlForMemo,
            type: textForMemo ? "text" : "html",
            deps,
            lastVals: null,
            lastResult: null,
            locals
          };
          self.memoBindings.push(memoBinding);
          instanceBindings.memoBindings.push(memoBinding);
        }
        const modelBinding = this.setupModelBindingWithReturn(el, locals);
        if (modelBinding) {
          instanceBindings.modelBindings.push(modelBinding);
        }
        for (const attr of Array.from(el.attributes)) {
          if (attr.name.startsWith(ATTR_ON_PREFIX)) {
            const full = attr.name.slice(ATTR_ON_PREFIX.length);
            const [eventName, ...mods] = full.split(".");
            const expr = attr.value;
            const handler = (ev) => {
              if (mods.includes("prevent"))
                ev.preventDefault();
              if (mods.includes("stop"))
                ev.stopPropagation();
              if (mods.includes("self") && ev.target !== el)
                return;
              if (mods.includes("window") && ev.target !== window)
                return;
              if (mods.includes("document") && ev.target !== document)
                return;
              if (ev instanceof KeyboardEvent) {
                const keys = mods.filter((m) => !["prevent", "stop", "self", "window", "document"].includes(m));
                if (keys.length > 0) {
                  const key = ev.key.toLowerCase();
                  if (!keys.includes(key))
                    return;
                }
              }
              this.lastEvent = ev;
              const prev = this.locals;
              this.locals = locals;
              execInScope(expr, this);
              this.locals = prev;
            };
            if (DELEGATED_EVENTS.has(eventName)) {
              if (!el.__sx_handlers)
                el.__sx_handlers = {};
              if (!el.__sx_handlers[eventName])
                el.__sx_handlers[eventName] = [];
              el.__sx_handlers[eventName].push({ handler, component: this });
            } else {
              el.addEventListener(eventName, handler);
              self.eventHandlers.push({ el, event: eventName, handler });
              instanceBindings.eventHandlers.push({
                el,
                event: eventName,
                handler
              });
            }
          }
        }
        if (el.hasAttribute(ATTR_ANIMATE)) {
          const optionsStr = el.getAttribute(ATTR_ANIMATE);
          queueMicrotask(() => this.setupAutoAnimate(el, optionsStr || {}));
        }
      });
      return instanceBindings;
    }
    setupModelBindingWithReturn(el, locals = null) {
      const direct = el.getAttribute(ATTR_MODEL);
      const modifierAttrs = Array.from(el.attributes).filter((a) => a.name.startsWith(ATTR_MODEL_PREFIX));
      if (!direct && modifierAttrs.length === 0)
        return null;
      const { keyExpr, mods, debounceMs } = this.parseModelBindingConfig(direct, modifierAttrs);
      const type = (el.type || "").toLowerCase();
      const isCheckbox = type === "checkbox";
      const isRadio = type === "radio";
      const isSelect = el.tagName === "SELECT";
      const updateDom = () => {
        const prev = this.locals;
        if (locals)
          this.locals = locals;
        try {
          const v = safeEval(keyExpr, this);
          if (isCheckbox) {
            if (Array.isArray(v)) {
              el.checked = v.includes(el.value);
            } else {
              el.checked = !!v;
            }
          } else if (isRadio) {
            el.checked = String(v) === String(el.value);
          } else if (isSelect) {
            el.value = v ?? "";
          } else {
            if (v !== null && v !== undefined && typeof v === "object") {
              el.value = JSON.stringify(v);
            } else {
              el.value = v ?? "";
            }
          }
        } finally {
          this.locals = prev;
        }
      };
      const applyModifiers = (val) => {
        if (mods.has("trim") && typeof val === "string")
          val = val.trim();
        if (mods.has("number")) {
          const n = Number(val);
          if (!Number.isNaN(n))
            val = n;
        }
        return val;
      };
      const writeBack = () => {
        const prev = this.locals;
        if (locals)
          this.locals = locals;
        try {
          let v;
          if (isCheckbox) {
            const current = safeEval(keyExpr, this);
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
          } else if (isSelect) {
            v = el.value;
          } else {
            v = el.value;
          }
          v = applyModifiers(v);
          execInScope(`${keyExpr} = __sx_value`, this, { __sx_value: v });
        } finally {
          this.locals = prev;
        }
      };
      let eventName = "input";
      if (mods.has("lazy"))
        eventName = "change";
      let handler = writeBack;
      if (debounceMs != null && debounceMs > 0) {
        let t = null;
        handler = () => {
          clearTimeout(t);
          t = setTimeout(writeBack, debounceMs);
        };
      }
      el.addEventListener(eventName, handler);
      const modelBinding = { updateDom, locals, el, event: eventName, handler };
      this.eventHandlers.push({ el, event: eventName, handler });
      this.modelBindings.push(modelBinding);
      return modelBinding;
    }
    cleanupInstanceBindings(instanceBindings) {
      if (!instanceBindings)
        return;
      const bindingsToRemove = new Set(instanceBindings.bindings || []);
      const memosToRemove = new Set(instanceBindings.memoBindings || []);
      const modelsToRemove = new Set(instanceBindings.modelBindings || []);
      if (bindingsToRemove.size > 0) {
        this.bindings = this.bindings.filter((b) => !bindingsToRemove.has(b));
      }
      if (memosToRemove.size > 0) {
        this.memoBindings = this.memoBindings.filter((b) => !memosToRemove.has(b));
      }
      if (modelsToRemove.size > 0) {
        this.modelBindings = this.modelBindings.filter((b) => !modelsToRemove.has(b));
      }
      const handlersToRemove = new Set;
      (instanceBindings.eventHandlers || []).forEach(({ el, event, handler }) => {
        el.removeEventListener(event, handler);
        handlersToRemove.add(handler);
      });
      if (handlersToRemove.size > 0) {
        this.eventHandlers = this.eventHandlers.filter((h) => !handlersToRemove.has(h.handler));
      }
      instanceBindings.nestedForBlocks?.forEach((block) => {
        this.teardownForBlock(block);
      });
    }
    applyInitialRender() {
      this.updateBindings();
      this.modelBindings.forEach((mb) => mb.updateDom());
      this.updateMemoBindings();
      this.updateIntegrations();
    }
    updateBindings() {
      for (const b of this.bindings) {
        const { el, type, expr, attr, errorFallback, locals } = b;
        const prevLocals = this.locals;
        if (locals)
          this.locals = locals;
        try {
          switch (type) {
            case "text": {
              const v = safeEval(expr, this, errorFallback);
              if (v !== null && v !== undefined && typeof v === "object") {
                el.textContent = JSON.stringify(v);
              } else {
                el.textContent = v ?? "";
              }
              break;
            }
            case "html": {
              const v = safeEval(expr, this, errorFallback);
              if (v !== null && v !== undefined && typeof v === "object") {
                el.innerHTML = JSON.stringify(v);
              } else {
                el.innerHTML = v ?? "";
              }
              break;
            }
            case "show": {
              const v = !!safeEval(expr, this, errorFallback);
              el.style.display = v ? "" : "none";
              break;
            }
            case "bind": {
              const v = safeEval(expr, this, errorFallback);
              if (v === false || v === null || v === undefined) {
                el.removeAttribute(attr);
              } else {
                el.setAttribute(attr, v);
              }
              break;
            }
            case "class": {
              const v = safeEval(expr, this, errorFallback);
              const original = this.originalClasses.get(el) || new Set;
              const current = new Set(Array.from(el.classList));
              if (typeof v === "string") {
                const newClasses = new Set(v.split(/\s+/).filter(Boolean));
                current.forEach((c) => {
                  if (!original.has(c))
                    el.classList.remove(c);
                });
                newClasses.forEach((c) => el.classList.add(c));
              } else if (v && typeof v === "object") {
                Object.keys(v).forEach((k) => {
                  k.split(/\s+/).filter(Boolean).forEach((cls) => {
                    if (v[k])
                      el.classList.add(cls);
                    else
                      el.classList.remove(cls);
                  });
                });
              }
              break;
            }
          }
        } finally {
          this.locals = prevLocals;
        }
      }
    }
    updateMemoBindings() {
      this.memoBindings.forEach((mb) => {
        const { el, expr, type, deps, locals } = mb;
        const prevLocals = this.locals;
        if (locals)
          this.locals = locals;
        try {
          const currVals = deps.map((k) => {
            if (locals && k in locals)
              return locals[k];
            if (k in this.state)
              return this.state[k];
            return this.state[k];
          });
          if (mb.lastVals && mb.lastVals.length === currVals.length && mb.lastVals.every((v2, i) => v2 === currVals[i])) {
            return;
          }
          mb.lastVals = currVals;
          const v = safeEval(expr, this);
          mb.lastResult = v;
          if (type === "text") {
            el.textContent = v ?? "";
          } else {
            el.innerHTML = v ?? "";
          }
        } finally {
          this.locals = prevLocals;
        }
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
      this.clearDebounceTimers();
      this.clearEmitterHandlers();
      this.teardownAllForBlocks();
      this.bindings = [];
      this.memoBindings = [];
      this.modelBindings = [];
      this.netBindings = [];
      this.chartBindings = [];
      this.gridBindings = [];
      this.forBlocks = [];
      this.eventHandlers.forEach(({ el, event, handler }) => {
        el.removeEventListener(event, handler);
      });
      this.eventHandlers = [];
      walk(this.root, (el) => {
        if (el !== this.root && el.hasAttribute(ATTR_DATA))
          return false;
        if (el.__sx_handlers)
          delete el.__sx_handlers;
      });
      this.animatedElements.forEach((controller, el) => {
        this.disableAutoAnimate(el);
      });
      this.animatedElements.clear();
      this.pollTimers.forEach((t) => clearInterval(t));
      this.pollTimers = [];
      this.collectRefs();
      this.initIntegrationBindings();
      this.scan(this.root);
      this.renderForBlocks();
      this.applyInitialRender();
    }
    destroy() {
      this.isDestroyed = true;
      this.callHook("destroyed");
      this.abortCancelableRequests();
      Object.keys(storeSubscribers).forEach((name) => {
        storeSubscribers[name].delete(this);
      });
      this.animatedElements.forEach((controller, el) => {
        this.disableAutoAnimate(el);
      });
      this.animatedElements.clear();
      this.teardownIntegrations();
      this.teardownAllForBlocks();
      this.eventHandlers.forEach(({ el, event, handler }) => {
        el.removeEventListener(event, handler);
      });
      this.clearEmitterHandlers();
      if (this._delegatedCleanups) {
        this._delegatedCleanups.forEach((fn) => fn());
      }
      this.pollTimers.forEach((t) => clearInterval(t));
      this.clearDebounceTimers();
      if (this.rafId)
        cancelAnimationFrame(this.rafId);
      this.bindings = [];
      this.memoBindings = [];
      this.modelBindings = [];
      this.eventHandlers = [];
      this.chartBindings = [];
      this.gridBindings = [];
      this.netBindings = [];
      this.forBlocks = [];
      this.pollTimers = [];
      delete this.root.__sprucex;
    }
  }

  // src/integrations/builtins.js
  function ensureBuiltInIntegrationsRegistered() {
    if (!getIntegration("chart")) {
      registerIntegration("chart", {
        scan(component, el) {
          const chartExpr = el.getAttribute(ATTR_CHART);
          if (!chartExpr)
            return;
          component.chartBindings.push({
            el,
            chartExpr,
            chartTypeExpr: el.getAttribute(ATTR_CHART_TYPE),
            chartOptionsExpr: el.getAttribute(ATTR_CHART_OPTIONS)
          });
        },
        update(component) {
          component.updateChartBindings();
        },
        teardown(component) {
          component.teardownChartBindings();
        }
      });
    }
    if (!getIntegration("gridstack")) {
      registerIntegration("gridstack", {
        scan(component, el) {
          if (!el.hasAttribute(ATTR_GRIDSTACK))
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
          component.initGridBindings();
        },
        teardown(component) {
          component.teardownGridBindings();
        }
      });
    }
  }

  // src/index.js
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
  ensureBuiltInIntegrationsRegistered();
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
  function refreshAllMountedComponents() {
    if (typeof document === "undefined")
      return;
    document.querySelectorAll(`[${ATTR_DATA}]`).forEach((root) => {
      if (root.__sprucex && typeof root.__sprucex.refresh === "function") {
        root.__sprucex.refresh();
      }
    });
  }
  var SpruceX = {
    init: initSpruceX,
    store: initStore,
    removeStore,
    data(name, factory) {
      if (arguments.length === 1 && typeof name === "string") {
        return getDataFactory(name);
      }
      const result = registerDataFactory(name, factory);
      flushPendingRoots();
      return result;
    },
    inspect() {
      const roots = document.querySelectorAll(`[${ATTR_DATA}]`);
      return Array.from(roots).map((r) => ({
        el: r,
        state: r.__sprucex?.state || null
      }));
    },
    config(newCfg) {
      Object.assign(Component, newCfg || {});
    },
    navigate(url) {
      const pageRoot = document.querySelector(`[${ATTR_PAGE}]`);
      const targetSelector = pageRoot?.getAttribute(ATTR_PAGE);
      const container = targetSelector ? document.querySelector(targetSelector) : document.body;
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
  if (typeof window !== "undefined") {
    window.SpruceX = SpruceX;
    if (!window.SpruceXBoot) {
      window.SpruceXBoot = {};
    }
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
  function initSpruceXRoot(root) {
    if (root.__sprucex)
      return root.__sprucex;
    try {
      const comp = new Component(root);
      root.__sprucex = comp;
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
  function initSpruceX() {
    runBootHook();
    const roots = document.querySelectorAll(`[${ATTR_DATA}]`);
    roots.forEach((root) => {
      const lazy = root.hasAttribute(ATTR_LAZY);
      if (!lazy) {
        initSpruceXRoot(root);
      } else {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              initSpruceXRoot(root);
              io.disconnect();
            }
          });
        });
        io.observe(root);
      }
    });
    const pageRoot = document.querySelector(`[${ATTR_PAGE}]`);
    if (pageRoot && !pageRoot.__sprucex_page) {
      pageRoot.__sprucex_page = true;
      initPageSwapping(pageRoot);
    }
    initBoostingGlobal();
    initAutoCleanup();
    flushPendingRoots();
    Array.from(document.scripts).forEach((script) => {
      script.__sprucex_executed = true;
    });
  }
  var cleanupObserver = null;
  function initAutoCleanup() {
    if (cleanupObserver)
      return;
    cleanupObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType !== 1)
            return;
          if (node.__sprucex) {
            node.__sprucex.destroy();
          }
          node.querySelectorAll(`[${ATTR_DATA}]`).forEach((el) => {
            if (el.__sprucex) {
              el.__sprucex.destroy();
            }
          });
        });
      }
    });
    if (document.body) {
      cleanupObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
  var isGlobalNavInitialized = false;
  function initPageSwapping(root) {
    const pageAttr = root.getAttribute(ATTR_PAGE);
    if (pageAttr === null)
      return;
    const container = pageAttr ? document.querySelector(pageAttr) : document.body;
    if (!container) {
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
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:"))
        return;
      if (link.hasAttribute("download") || link.getAttribute("target") && link.getAttribute("target") !== "_self")
        return;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin)
          return;
        e.preventDefault();
        await navigateTo(url.href, container);
      } catch {
        return;
      }
    });
    window.addEventListener("popstate", async () => {
      await navigateTo(window.location.href, container, false);
    });
  }
  function initBoostingGlobal() {
    document.querySelectorAll(`[${ATTR_BOOST}]`).forEach((el) => {
      if (el.__sprucex_boost)
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
            const link = e.target.closest("a[href]");
            if (link && !link.__sprucex_prefetched) {
              link.__sprucex_prefetched = true;
              prefetchLink(link.href);
            }
          }, { passive: true });
        });
        el.addEventListener("focusin", (e) => {
          const link = e.target.closest("a[href]");
          if (link && !link.__sprucex_prefetched) {
            link.__sprucex_prefetched = true;
            prefetchLink(link.href);
          }
        }, { passive: true });
      }
    });
  }
  async function navigateTo(url, container, pushState = true) {
    const targetUrl = new URL(url, window.location.href);
    const href = targetUrl.href;
    const navigationId = ++latestNavigationId;
    const startTime = performance.now();
    const beforeEvent = new CustomEvent("sprucex:page-before", {
      detail: { url: href },
      bubbles: true,
      cancelable: true
    });
    if (!document.dispatchEvent(beforeEvent))
      return;
    try {
      let html = getCachedPage(href);
      if (!html) {
        if (container)
          container.style.opacity = container.style.opacity || "1";
        html = await fetchPage(href);
      }
      if (navigationId !== latestNavigationId)
        return;
      if (!html)
        throw new Error("Empty response");
      const parser = new DOMParser;
      const doc = parser.parseFromString(html, "text/html");
      let newContent;
      const pageRoot = document.querySelector("[sx-page]");
      const targetSelector = pageRoot?.getAttribute(ATTR_PAGE);
      if (targetSelector) {
        newContent = doc.querySelector(targetSelector);
      }
      if (!newContent) {
        newContent = doc.body;
      }
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
        history.pushState({ url: href }, "", href);
      }
      initSpruceX();
      let ancestor = container.parentElement;
      while (ancestor) {
        if (ancestor.__sprucex) {
          ancestor.__sprucex.refresh();
        }
        ancestor = ancestor.parentElement;
      }
      initBoostingGlobal();
      if (navigationId !== latestNavigationId)
        return;
      const hash = targetUrl.hash;
      if (hash) {
        const target = document.querySelector(hash);
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
      if (navigationId !== latestNavigationId)
        return;
      console.error("SpruceX page navigation error:", error);
      document.dispatchEvent(new CustomEvent("sprucex:page-error", {
        detail: { url: href, error },
        bubbles: true
      }));
      window.location.href = href;
    }
  }
  function reinitializeComponents(container) {
    if (!container)
      return;
    container.querySelectorAll(`[${ATTR_DATA}]`).forEach((el) => {
      if (el.__sprucex) {
        el.__sprucex.destroy();
      }
    });
    if (container.hasAttribute(ATTR_DATA) && container.__sprucex) {
      container.__sprucex.destroy();
    }
  }
  async function prefetchLink(href) {
    if (!href)
      return;
    try {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin)
        return;
      if (url.href === window.location.href)
        return;
      await fetchPage(url.href);
    } catch {}
  }
  async function fetchPage(url) {
    const cached = getCachedPage(url);
    if (cached)
      return cached;
    if (pendingFetches.has(url)) {
      return pendingFetches.get(url);
    }
    const fetchPromise = (async () => {
      try {
        const res = await fetch(url, {
          headers: { "X-SpruceX-Request": "true" }
        });
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
    pendingFetches.set(url, fetchPromise);
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
  if (typeof document !== "undefined") {
    runBootHook();
    window.addEventListener("load", () => {
      flushPendingRoots();
    });
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initSpruceX);
    } else {
      initSpruceX();
    }
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
})();
