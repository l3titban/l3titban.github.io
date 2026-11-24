/* dc-lite: крошечный рантайм для страниц, собранных из макета (holes, sc-for, sc-if, события, ref). */
(function () {
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g, ONE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  function get(scope, p) {
    p = p.trim();
    if (p === 'true') return true; if (p === 'false') return false; if (p === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(p)) return +p;
    if (/^'.*'$/.test(p)) return p.slice(1, -1);
    return p.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, scope);
  }
  var str = function (v) { return v == null || v === false ? '' : String(v); };
  var comp, root, tpl, refs, queued = false;
  window.DCLogic = function (props) { this.props = props || {}; this.state = {}; };
  DCLogic.prototype.setState = function (p) { if (typeof p === 'function') p = p(this.state); this.state = Object.assign({}, this.state, p); schedule(); };
  DCLogic.prototype.forceUpdate = function () { schedule(); };
  function schedule() { if (queued) return; queued = true; Promise.resolve().then(function () { queued = false; draw(); }); }
  function walk(src, scope, key, out) {
    if (src.nodeType === 3) { out.push(document.createTextNode(src.nodeValue.replace(HOLE, function (_, p) { return str(get(scope, p)); }))); return; }
    if (src.nodeType !== 1) return;
    var tag = src.localName;
    if (tag === 'template' && src.getAttribute('data-sc')) tag = 'sc-' + src.getAttribute('data-sc');
    if (tag === 'sc-for') {
      var list = get(scope, (src.getAttribute('list').match(ONE) || [])[1] || '') || [], as = src.getAttribute('as') || 'item';
      list.forEach(function (it, i) { var sc = Object.create(scope); sc[as] = it; sc.$index = i; kids(src, sc, key + '.' + i, out); });
      return;
    }
    if (tag === 'sc-if') { var m = (src.getAttribute('value') || '').match(ONE); if (m && get(scope, m[1])) kids(src, scope, key, out); return; }
    if (tag === 'helmet') return;
    var el = src.namespaceURI && src.namespaceURI !== 'http://www.w3.org/1999/xhtml' ? document.createElementNS(src.namespaceURI, tag) : document.createElement(tag);
    el.__k = key;
    Array.prototype.forEach.call(src.attributes, function (a) {
      var n = a.name, v = a.value, m = v.match(ONE), raw = m ? get(scope, m[1]) : v.replace(HOLE, function (_, p) { return str(get(scope, p)); });
      if (n.indexOf('hint-') === 0) return;
      if (n === 'ref') { if (typeof raw === 'function') refs.push([raw, el]); return; }
      if (n.indexOf('on') === 0 && typeof raw === 'function') {
        var ev = n.slice(2); if (ev === 'change' && (tag === 'input' || tag === 'textarea')) ev = 'input';
        el.addEventListener(ev, raw); return;
      }
      if (n === 'value' && (tag === 'input' || tag === 'textarea' || tag === 'select')) { el.__v = str(raw); return; }
      if (raw === true) { el.setAttribute(n, n.indexOf('aria-') === 0 ? 'true' : ''); return; }
      if (raw === false || raw == null) { if (n.indexOf('aria-') === 0) el.setAttribute(n, 'false'); return; }
      el.setAttribute(n, raw);
    });
    var ch = []; kids(src, scope, key, ch); ch.forEach(function (c) { el.appendChild(c); });
    if (el.__v !== undefined) el.value = el.__v;
    out.push(el);
  }
  function kids(src, scope, key, out) { var i = 0; (src.content && src.localName === 'template' ? src.content : src).childNodes.forEach(function (c) { walk(c, scope, key + '/' + (i++), out); }); }
  function find(node, k) { if (node.__k === k) return node; for (var c = node.firstChild; c; c = c.nextSibling) { var r = find(c, k); if (r) return r; } return null; }
  function draw() {
    var a = document.activeElement, fk = a && root.contains(a) ? a.__k : null, s0 = a && a.selectionStart, s1 = a && a.selectionEnd;
    refs = [];
    var out = []; kids(tpl.content, comp.renderVals(), 'r', out);
    root.replaceChildren.apply(root, out);
    refs.forEach(function (r) { r[0](r[1]); });
    if (fk) { var el = find(root, fk); if (el) { el.focus({ preventScroll: true }); try { if (s0 != null) el.setSelectionRange(s0, s1); } catch (e) {} } }
  }
  window.mountDC = function (Cls) {
    root = document.getElementById('app'); tpl = document.getElementById('tpl');
    comp = new Cls({}); draw();
    if (comp.componentDidMount) comp.componentDidMount();
  };
})();
