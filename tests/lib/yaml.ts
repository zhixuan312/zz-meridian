/**
 * A reader for the block subset of YAML the workflows under `.github/workflows/` use: block mappings and sequences,
 * flow sequences, quoted and plain scalars, comments, and the `|` and `>` block scalars. It reads no tag, anchor,
 * alias or multi-line flow collection, because no workflow uses one.
 *
 * Test-only: it ships to no project. `parseYaml` throws on a line it cannot read, naming the line number and its text,
 * rather than returning a partial tree — a workflow read in part would let a test pass over a job it never saw.
 */

/** The one error this reader raises: the line it could not read, by number and text. */
function unreadable(line: number, text: string, why: string): Error {
  return new Error(`line ${line}: ${why} "${text.trimEnd()}"`);
}

/** The indentation of a line, which is spaces; a tab is not an indentation this reader can measure. */
function indentOf(line: string, number: number): number {
  const spaces = /^ */.exec(line)![0].length;
  if (line[spaces] === '\t') throw unreadable(number, line, 'a tab cannot indent');
  return spaces;
}

/** A line with its comment removed: a `#` that starts the line or follows whitespace, outside any quote. */
function stripComment(line: string): string {
  let quote = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote === "'") {
      if (c === "'") {
        if (line[i + 1] === "'") i++;
        else quote = '';
      }
    } else if (quote === '"') {
      if (c === '\\') i++;
      else if (c === '"') quote = '';
    } else if (c === "'" || c === '"') quote = c;
    else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

/** The key and the rest of a `key: value` line: the first `:` outside quotes that is followed by a space or ends the line. */
function splitKey(line: string): [string, string] | null {
  let quote = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote === "'") {
      if (c === "'") {
        if (line[i + 1] === "'") i++;
        else quote = '';
      }
    } else if (quote === '"') {
      if (c === '\\') i++;
      else if (c === '"') quote = '';
    } else if (c === "'" || c === '"') quote = c;
    else if (c === ':' && (i === line.length - 1 || /\s/.test(line[i + 1]))) return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
  }
  return null;
}

/** A flow sequence, `[a, b, 'c']`: its items split on the commas outside quotes. A nested collection is not read. */
function flowSequence(text: string, number: number): unknown[] {
  const inner = text.slice(1, -1).trim();
  if (!inner) return [];
  const items: string[] = [];
  let quote = '';
  let item = '';
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (quote === "'") {
      item += c;
      if (c === "'") {
        if (inner[i + 1] === "'") item += inner[++i];
        else quote = '';
      }
    } else if (quote === '"') {
      item += c;
      if (c === '\\') item += inner[++i] ?? '';
      else if (c === '"') quote = '';
    } else if (c === "'" || c === '"') {
      quote = c;
      item += c;
    } else if (c === ',') {
      items.push(item);
      item = '';
    } else item += c;
  }
  items.push(item);
  return items.map((s) => scalar(s.trim(), number));
}

/** A scalar: quoted, a flow sequence, a whole number, a boolean, a null, or plain text. */
function scalar(text: string, number: number): unknown {
  if (text.startsWith("'")) {
    if (text.length < 2 || !text.endsWith("'")) throw unreadable(number, text, 'an unterminated quoted scalar:');
    return text.slice(1, -1).replace(/''/g, "'");
  }
  if (text.startsWith('"')) {
    if (text.length < 2 || !text.endsWith('"')) throw unreadable(number, text, 'an unterminated quoted scalar:');
    return text.slice(1, -1).replace(/\\(["\\])/g, '$1').replace(/\\n/g, '\n');
  }
  if (text.startsWith('[')) {
    if (!text.endsWith(']')) throw unreadable(number, text, 'a flow sequence not closed on its line:');
    return flowSequence(text, number);
  }
  if (/^-?\d+$/.test(text)) return Number(text);
  if (/^(?:true|false)$/i.test(text)) return text.toLowerCase() === 'true';
  if (/^(?:null|~)$/i.test(text)) return null;
  return text;
}

/**
 * Every workflow file as data. `parseYaml` returns the document's top-level mapping; a blank line, a comment, and a
 * `---` or `...` marker are skipped between entries and kept inside a block scalar.
 */
export function parseYaml(source: string): unknown {
  const raw = source.split('\n');
  const lines = [...raw];
  let at = 0;
  const skip = (): void => {
    while (at < lines.length && (lines[at].trim() === '' || /^\s*#/.test(lines[at]) || /^\s*(?:---|\.\.\.)\s*$/.test(lines[at]))) at++;
  };

  /** A `|` or `>` block scalar at `parent`'s indent: every following line indented past it, its common indent removed. */
  const block = (parent: number, marker: string): string => {
    const folded = marker.startsWith('>');
    const kept: { line: string; indent: number }[] = [];
    let j = at + 1;
    for (; j < lines.length; j++) {
      const line = raw[j]!;
      if (line.trim() === '') {
        kept.push({ line: '', indent: -1 });
        continue;
      }
      const indent = indentOf(line, j + 1);
      if (indent <= parent) break;
      kept.push({ line, indent });
    }
    at = j;
    while (kept.length && kept[0]!.indent < 0) kept.shift();
    while (kept.length && kept[kept.length - 1]!.indent < 0) kept.pop();
    const common = kept.reduce((n, l) => (l.indent >= 0 ? Math.min(n, l.indent) : n), Infinity);
    const body = kept.map((l) => (l.indent < 0 ? '' : l.line.slice(common)));
    return folded ? `${body.join('\n').replace(/\n(?=\S)/g, ' ')}\n` : `${body.join('\n')}\n`;
  };

  /** One node at `indent`: a sequence when its first line is an item, a mapping otherwise. */
  const node = (indent: number): unknown => {
    skip();
    const line = lines[at]!;
    if (/^-(\s|$)/.test(line.slice(indent))) return sequence(indent);
    return mapping(indent);
  };

  const mapping = (indent: number): Record<string, unknown> => {
    const map: Record<string, unknown> = {};
    for (;;) {
      skip();
      if (at >= lines.length) break;
      const line = lines[at]!;
      const own = indentOf(line, at + 1);
      if (own < indent) break;
      if (own > indent) throw unreadable(at + 1, line, 'unexpected indentation at');
      if (/^-(\s|$)/.test(line.slice(own))) break;
      const pair = splitKey(stripComment(line.slice(own)));
      if (!pair) throw unreadable(at + 1, line, 'not a "key: value" line:');
      const [key, rest] = pair;
      if (!key) throw unreadable(at + 1, line, 'an entry with no key:');
      if (/^[|>][+-]?$/.test(rest)) {
        map[key] = block(own, rest);
        continue;
      }
      if (rest === '') {
        at++;
        skip();
        map[key] = at < lines.length && indentOf(lines[at]!, at + 1) > own ? node(indentOf(lines[at]!, at + 1)) : null;
        continue;
      }
      map[key] = scalar(rest, at + 1);
      at++;
    }
    return map;
  };

  const sequence = (indent: number): unknown[] => {
    const items: unknown[] = [];
    for (;;) {
      skip();
      if (at >= lines.length) break;
      const line = lines[at]!;
      const own = indentOf(line, at + 1);
      if (own < indent) break;
      if (own > indent) throw unreadable(at + 1, line, 'unexpected indentation at');
      const item = /^-(\s+(.*))?$/.exec(line.slice(own));
      if (!item) break;
      const rest = stripComment(item[2] ?? '').trim();
      if (rest === '') {
        at++;
        skip();
        items.push(at < lines.length && indentOf(lines[at]!, at + 1) > own ? node(indentOf(lines[at]!, at + 1)) : null);
        continue;
      }
      // The item's own entry starts at the first character after the dash and its spaces; the line is rewritten at that
      // indentation, so a mapping that begins on the dash's line reads exactly as one that begins below it.
      const after = line.slice(own + 1);
      const content = own + 1 + (/^ */.exec(after)![0].length);
      lines[at] = ' '.repeat(content) + after.trimStart();
      items.push(node(content));
    }
    return items;
  };

  skip();
  if (at >= lines.length) return null;
  const value = node(indentOf(lines[at]!, at + 1));
  skip();
  if (at < lines.length) throw unreadable(at + 1, lines[at]!, 'content this reader could not place at');
  return value;
}
