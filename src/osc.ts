/**
 * OSC marker parsing for the xdg-open terminal bridge.
 *
 * The `jlab-xdg-open` emitter prints an invisible OSC escape sequence carrying
 * a URL:  ESC ] 6789 ; <url> BEL   (or terminated by ST = ESC \).
 *
 * OSC_CODE must match `OSC_CODE` in jupyterlab_xdg_open_url_extension/shim.py.
 */
export const OSC_CODE = 6789;

/**
 * Matches a complete OSC 6789 sequence and captures the URL payload.
 * The payload runs up to the terminator (BEL or ESC); a URL never contains
 * a control character, so excluding ESC/BEL from the payload is safe.
 */
// eslint-disable-next-line no-control-regex -- the OSC marker is made of control characters
const OSC_RE = /\x1b\]6789;([^\x07\x1b]*)(?:\x07|\x1b\\)/g;

/** Cap on the carried-over buffer, so a lone ESC with no terminator can't grow unbounded. */
const MAX_BUFFER = 8192;

export interface IOscScanResult {
  /** URLs from every complete OSC 6789 sequence found in the buffer. */
  urls: string[];
  /** Unconsumed tail to prepend to the next chunk (a possibly-partial marker). */
  rest: string;
}

/**
 * Scan a terminal-output buffer for complete OSC 6789 sequences.
 *
 * Streaming-safe: pass the accumulated buffer, emit any complete URLs, and
 * carry `rest` forward so a marker split across output chunks is still caught.
 */
export function scanOscUrls(buffer: string): IOscScanResult {
  const urls: string[] = [];
  OSC_RE.lastIndex = 0;
  let consumed = 0;
  let match: RegExpExecArray | null;
  while ((match = OSC_RE.exec(buffer)) !== null) {
    if (match[1]) {
      urls.push(match[1]);
    }
    consumed = OSC_RE.lastIndex;
  }

  let rest = buffer.slice(consumed);
  // Retain only from a possible incomplete marker start (last ESC) to bound
  // memory; drop the tail entirely when it holds no ESC at all.
  const escIndex = rest.lastIndexOf('\x1b');
  if (escIndex < 0) {
    rest = '';
  } else if (escIndex > 0) {
    rest = rest.slice(escIndex);
  }
  if (rest.length > MAX_BUFFER) {
    rest = rest.slice(rest.length - MAX_BUFFER);
  }

  return { urls, rest };
}
