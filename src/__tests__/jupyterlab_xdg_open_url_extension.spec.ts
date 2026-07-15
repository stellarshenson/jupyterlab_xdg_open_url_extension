import { scanOscUrls } from '../osc';

const BEL = '\x07';
const OSC = '\x1b]6789;';
const ST = '\x1b\\';

describe('scanOscUrls', () => {
  it('extracts a URL from a BEL-terminated OSC 6789 marker', () => {
    const { urls, rest } = scanOscUrls(`${OSC}https://example.com${BEL}`);
    expect(urls).toEqual(['https://example.com']);
    expect(rest).toBe('');
  });

  it('accepts an ST (ESC backslash) terminator', () => {
    const { urls } = scanOscUrls(`${OSC}https://example.com${ST}`);
    expect(urls).toEqual(['https://example.com']);
  });

  it('preserves query strings (semicolons/ampersands) in the URL', () => {
    const url = 'https://example.com/p?a=1&b=2;c=3';
    const { urls } = scanOscUrls(`${OSC}${url}${BEL}`);
    expect(urls).toEqual([url]);
  });

  it('finds multiple markers in one buffer', () => {
    const buf = `${OSC}https://a.test${BEL}noise${OSC}https://b.test${BEL}`;
    const { urls } = scanOscUrls(buf);
    expect(urls).toEqual(['https://a.test', 'https://b.test']);
  });

  it('reassembles a marker split across two chunks', () => {
    let r = scanOscUrls(`${OSC}https://exa`);
    expect(r.urls).toEqual([]);
    r = scanOscUrls(`${r.rest}mple.com${BEL}`);
    expect(r.urls).toEqual(['https://example.com']);
    expect(r.rest).toBe('');
  });

  it('drops plain output with no marker and keeps no buffer', () => {
    const { urls, rest } = scanOscUrls('just some normal terminal text\n');
    expect(urls).toEqual([]);
    expect(rest).toBe('');
  });

  it('ignores an empty payload', () => {
    const { urls } = scanOscUrls(`${OSC}${BEL}`);
    expect(urls).toEqual([]);
  });
});
