import { describe, expect, it } from 'bun:test';
import { toUrlResponse, toStatsResponse } from '../mappers/url';
import type { Url } from '../types';

const url: Url = {
  id: 'url-1',
  shortCode: 'abc123',
  customSlug: null,
  originalUrl: 'https://example.com',
  expiresAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  userId: 'user-1',
};

describe('toUrlResponse', () => {
  it('answers with the contract fields and nothing else', () => {
    expect(toUrlResponse({ ...url, clickCount: 7 })).toEqual({
      id: 'url-1',
      shortCode: 'abc123',
      originalUrl: 'https://example.com',
      clicks: 7,
      expiresAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  it('keeps the owner and the slug internal', () => {
    const response = toUrlResponse({ ...url, customSlug: 'my-slug' });

    expect(response).not.toHaveProperty('userId');
    expect(response).not.toHaveProperty('customSlug');
  });

  it('reports no clicks for a freshly created link', () => {
    // create returns a row with no aggregate on it, which means zero clicks
    expect(toUrlResponse(url).clicks).toBe(0);
  });
});

describe('toStatsResponse', () => {
  const clickEvents = [
    {
      id: 'click-1',
      userAgent: 'curl/8',
      referer: null,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    },
    {
      id: 'click-2',
      userAgent: null,
      referer: 'https://news.example',
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
    },
  ];

  it('counts the clicks it was given', () => {
    const stats = toStatsResponse({ ...url, clickEvents });

    expect(stats.clicks).toBe(2);
    expect(stats.clickEvents).toHaveLength(2);
  });

  it('never lets a visitor IP through', () => {
    const withIps = clickEvents.map((click) => ({
      ...click,
      ip: '203.0.113.7',
      urlId: 'url-1',
    }));

    const [event] = toStatsResponse({ ...url, clickEvents: withIps })
      .clickEvents;

    expect(Object.keys(event).sort()).toEqual([
      'createdAt',
      'id',
      'referer',
      'userAgent',
    ]);
  });

  it('answers with an empty list for a link nobody clicked', () => {
    const stats = toStatsResponse({ ...url, clickEvents: [] });

    expect(stats.clicks).toBe(0);
    expect(stats.clickEvents).toEqual([]);
  });
});
