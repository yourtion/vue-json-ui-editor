export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function getExtendibleLeaf(obj, n, initIt) {
  const v = obj[n];
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v;
  }
  if (initIt && v === undefined) {
    return (obj[n] = {});
  }
}

export function getChild(data, ns) {
  if (ns.length === 1) {
    return data[ns[0]];
  }
  let obj = data[ns[0]];
  if (obj === undefined) return obj;
  let i = 1;
  const end = ns.length - 1;
  for (; i < end; i++) {
    obj = getExtendibleLeaf(obj, ns[i], false);
    if (obj === undefined) return obj;
  }
  return obj[ns[i]];
}

export function initChild(data, ns) {
  if (ns.length === 1) {
    const ret = getExtendibleLeaf(data, ns[0], true);
    if (ret === undefined) {
      throw new TypeError('fail to init because namespace ' + ns[0] + ' = ' + data[ns[0]]);
    }
    return ret;
  }
  let parent = data;
  let obj = data[ns[0]];
  if (obj === undefined) obj = data[ns[0]] = {};
  for (let i = 1; i < ns.length; i++) {
    const n = ns[i];
    const ret = getExtendibleLeaf(obj, n, true);
    if (ret === undefined) {
      throw new TypeError('fail to init because namespace ' + ns.join('.') + ' = ' + obj + '(' + typeof obj + ')');
    }
    parent = obj;
    obj = ret;
    if (parent[n] === undefined) {
      throw new TypeError('fail to init because namespace ' + ns.slice(0, i).join('.') + ' = ' + parent);
    }
  }
  return obj;
}

export function setVal(data, n, v) {
  const ns = Array.isArray(n) ? n : n.split('.');
  // eslint-disable-next-line
  n = ns.pop();
  const ret = ns.length > 0 ? initChild(data, ns) : data;
  ret[n] = v;
  return v;
}
