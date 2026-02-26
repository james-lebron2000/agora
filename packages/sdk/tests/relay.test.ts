import { RelayClient } from '../src/relay';
import { SignedEnvelope } from '../src/envelope';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn() as any;
global.fetch = mockFetch as any;

describe('RelayClient', () => {
  const client = new RelayClient({ baseUrl: 'http://localhost:3000' });
  const mockEnvelope = { id: 'msg-1', type: 'REQUEST', sig: 'somesig' } as SignedEnvelope;

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('verifyPayment should post to /v1/payments/verify', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        ok: true,
        payment: {
          tx_hash: '0xabc',
          chain: 'base-sepolia',
          token: 'USDC',
          status: 'VERIFIED',
          confirmations: 3,
          amount: '1.25',
          amount_units: '1250000',
          payer: '0x0000000000000000000000000000000000000001',
          payee: '0x0000000000000000000000000000000000000002',
          block_number: 1,
          verified_at: '2026-02-06T00:00:00.000Z',
        }
      })
    } as unknown as Response);

    const res = await client.verifyPayment({
      tx_hash: '0xabc',
      chain: 'base-sepolia',
      token: 'USDC',
      amount: 1.25,
    });

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/v1/payments/verify', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        tx_hash: '0xabc',
        chain: 'base-sepolia',
        token: 'USDC',
        amount: 1.25,
      })
    }));
    expect(res.ok).toBe(true);
    expect(res.payment?.status).toBe('VERIFIED');
  });

  it('getMarketRate should call /v1/market-rate with query params', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        ok: true,
        sample_size: 3,
        rates: [{ currency: 'USDC', sample_size: 3, average: 1.2, p25: 1.0, p50: 1.2, p75: 1.4, min: 1.0, max: 1.4 }],
      }),
    } as unknown as Response);

    const res = await client.getMarketRate({ intent: 'dev.code', currency: 'usdc', period: '7d' });

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/v1/market-rate?intent=dev.code&currency=USDC&period=7d');
    expect(res.ok).toBe(true);
    expect(res.sample_size).toBe(3);
    expect(res.rates?.[0]?.currency).toBe('USDC');
  });

  it('listDirectory should call /v1/directory with filters', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        ok: true,
        total: 1,
        agents: [{ id: 'did:key:z123', name: 'OpenClawAssistant' }],
      }),
    } as unknown as Response);

    const res = await client.listDirectory({ intent: 'code.review', q: 'openclaw', status: 'online', limit: 5 });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/directory?intent=code.review&q=openclaw&status=online&limit=5'
    );
    expect(res.ok).toBe(true);
    expect(res.total).toBe(1);
    expect(res.agents?.[0]?.name).toBe('OpenClawAssistant');
  });

  it('executeSandbox should post to /v1/execute', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        ok: true,
        request_id: 'req_exec_1',
        agent_id: 'did:key:zagent',
        event_published: true,
        event_id: 'result_exec_1',
        execution: { run_id: 'run_1', status: 'SUCCESS' },
      }),
    } as unknown as Response);

    const payload = {
      agent_id: 'did:key:zagent',
      request_id: 'req_exec_1',
      job: {
        language: 'nodejs',
        code: 'console.log(\"ok\")',
      },
    };
    const res = await client.executeSandbox(payload);

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/v1/execute', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(payload),
    }));
    expect(res.ok).toBe(true);
    expect(res.execution?.status).toBe('SUCCESS');
  });
});
