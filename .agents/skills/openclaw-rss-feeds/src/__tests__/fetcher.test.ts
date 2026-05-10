import { describe, it, expect, vi, beforeEach } from 'vitest';

const parseURLMock = vi.fn();

vi.mock('rss-parser', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      parseURL: parseURLMock,
    })),
  };
});

import { fetchFeed } from '../fetcher';
import type { FeedConfig } from '../types';

describe('fetchFeed', () => {
  beforeEach(() => {
    parseURLMock.mockReset();
  });

  it('filters by date and keywords, deduplicates, and builds firmware/docs metadata', async () => {
    parseURLMock.mockResolvedValue({
      items: [
        {
          title: 'FortiGate 7.4.2 release notes',
          link: 'https://example.com/a',
          isoDate: '2026-02-10T10:00:00.000Z',
          contentSnippet: 'critical security fix',
        },
        {
          title: 'FortiGate 7.4.2 release notes',
          link: 'https://example.com/a',
          isoDate: '2026-02-10T10:00:00.000Z',
          contentSnippet: 'critical security fix',
        },
        {
          title: 'FortiGate 7.4.4 release notes',
          link: 'https://example.com/b',
          isoDate: '2026-02-12T10:00:00.000Z',
          contentSnippet: 'critical patch release',
        },
        {
          title: 'FortiAnalyzer 7.0.0 release notes',
          link: 'https://example.com/c',
          isoDate: '2026-01-01T10:00:00.000Z',
          contentSnippet: 'critical but too old',
        },
        {
          title: 'General advisory',
          link: 'https://example.com/d',
          isoDate: '2026-02-11T10:00:00.000Z',
          contentSnippet: 'informational only',
        },
      ],
    });

    const feed: FeedConfig = {
      id: 'fortinet',
      name: 'Fortinet',
      url: 'https://example.com/rss.xml',
      keywords: ['critical'],
      docsUrlTemplate: 'https://docs.example.com/{product}/{version}',
    };

    const startDate = new Date('2026-02-01T00:00:00.000Z');
    const endDate = new Date('2026-03-01T00:00:00.000Z');

    const result = await fetchFeed(feed, startDate, endDate);

    expect(result.items).toHaveLength(2);
    expect(result.items.map(i => i.link)).toEqual([
      'https://example.com/a',
      'https://example.com/b',
    ]);

    expect(result.firmware).toHaveLength(2);
    expect(result.firmware[0]).toMatchObject({
      product: 'FORTIGATE',
      version: '7.4.4',
      type: 'Feature',
      docsUrl: 'https://docs.example.com/fortigate/7.4.4',
    });
    expect(result.firmware[1]).toMatchObject({
      product: 'FORTIGATE',
      version: '7.4.2',
      type: 'Feature',
      docsUrl: 'https://docs.example.com/fortigate/7.4.2',
    });

    expect(parseURLMock).toHaveBeenCalledWith('https://example.com/rss.xml');
  });

  it('returns empty arrays for empty feeds', async () => {
    parseURLMock.mockResolvedValue({ items: [] });

    const result = await fetchFeed(
      {
        id: 'empty',
        name: 'Empty Feed',
        url: 'https://example.com/empty.xml',
      },
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-03-01T00:00:00.000Z')
    );

    expect(result.items).toEqual([]);
    expect(result.firmware).toEqual([]);
  });
});
