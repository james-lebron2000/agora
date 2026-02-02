import { RelayClient } from '../src/relay';
import { SignedEnvelope } from '../src/envelope';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('RelayClient', () => {
  const client = new RelayClient({ baseUrl: 'http://localhost:3000' });
  const mockEnvelope = { id: 'msg-1', type: 'REQUEST', sig: 'somesig' } as SignedEnvelope;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('submitEvent should post to /events', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, id: 'evt-1' })
    } as unknown as Response);

    const res = await client.submitEvent(mockEnvelope);

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/events', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(mockEnvelope)
    }));
    expect(res).toEqual({ ok: true, id: 'evt-1' });
  });

  it('submitEvent should handle errors', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: false, error: 'Failed' })
    } as unknown as Response);

    const res = await client.submitEvent(mockEnvelope);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Failed');
  });

  it('getEvents should fetch from /events with params', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, events: [mockEnvelope] })
    } as unknown as Response);

    const res = await client.getEvents({ recipient: 'did:key:z123' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:3000/events?')
    );
    // Check URL params
    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(url.searchParams.get('recipient')).toBe('did:key:z123');
    expect(res.events).toHaveLength(1);
  });
});
