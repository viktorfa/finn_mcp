export function extractReactRouterStream(html) {
  const marker = 'streamController.enqueue("';
  const start = html.indexOf(marker);
  if (start === -1) return null;

  let i = start + marker.length;
  let raw = "";
  while (i < html.length) {
    const ch = html[i];
    if (ch === "\\") {
      const next = html[i + 1];
      if (next === '"') {
        raw += '"';
        i += 2;
        continue;
      }
      if (next === "\\") {
        raw += "\\";
        i += 2;
        continue;
      }
      if (next === "n") {
        raw += "\n";
        i += 2;
        continue;
      }
      if (next === "u") {
        raw += String.fromCharCode(Number.parseInt(html.slice(i + 2, i + 6), 16));
        i += 6;
        continue;
      }
      raw += next;
      i += 2;
      continue;
    }
    if (ch === '"') break;
    raw += ch;
    i++;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function decodeStreamRef(value, arr, depth = 0, seen = new Set()) {
  if (depth > 12) return undefined;
  if (value === null || value === undefined) return value;

  if (typeof value === "number") {
    if (value < 0) return null;
    if (value >= arr.length) return value;
    if (seen.has(value)) return undefined;
    seen.add(value);

    const target = arr[value];
    if (typeof target === "string" || typeof target === "number" || typeof target === "boolean") {
      return target;
    }
    if (
      Array.isArray(target) &&
      target.every((x) => typeof x === "string" || typeof x === "number" || typeof x === "boolean" || x === null)
    ) {
      return target;
    }
    return decodeStreamRef(target, arr, depth + 1, seen);
  }

  if (typeof value === "string" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    if (value.length >= 2 && typeof value[0] === "string" && !value[0].startsWith("_")) {
      const obj = {};
      for (let j = 0; j < value.length; j += 2) {
        obj[value[j]] = decodeStreamRef(value[j + 1], arr, depth + 1, new Set(seen));
      }
      return obj;
    }
    return value.map((v) => decodeStreamRef(v, arr, depth + 1, new Set(seen)));
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length > 0 && keys.every((k) => k.startsWith("_"))) {
      const obj = {};
      for (const [k, v] of Object.entries(value)) {
        const key = decodeStreamRef(Number.parseInt(k.slice(1), 10), arr, depth + 1, new Set(seen));
        if (typeof key !== "string") continue;
        const val = decodeStreamRef(v, arr, depth + 1, new Set(seen));
        if (val !== undefined) obj[key] = val;
      }
      return obj;
    }
  }

  return undefined;
}

export function decodeLoaderData(html) {
  const arr = extractReactRouterStream(html);
  if (!arr || arr[1] !== "loaderData") return null;
  return decodeStreamRef(arr[2], arr);
}
