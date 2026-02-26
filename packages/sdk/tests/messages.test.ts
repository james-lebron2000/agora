import { MessageBuilder, RequestPayload, OfferPayload, AcceptPayload, ResultPayload } from '../src/messages';
import { Sender } from '../src/envelope';
import { describe, it, expect } from 'vitest';

describe('MessageBuilder', () => {
  const sender: Sender = { id: 'did:key:zTest', name: 'Test Agent' };

  it('should build REQUEST message', () => {
    const payload: RequestPayload = {
      request_id: 'req_123',
      intent: 'test',
      params: { q: 'hello' }
    };
    const msg = MessageBuilder.request(sender, payload, { recipient: 'did:key:zRecipient' });

    expect(msg.type).toBe('REQUEST');
    expect(msg.sender).toEqual(sender);
    expect(msg.recipient).toEqual({ id: 'did:key:zRecipient' });
    expect(msg.payload).toEqual(payload);
    expect(msg.id).toMatch(/^req_/);
  });

  it('should build OFFER message', () => {
    const payload: Omit<OfferPayload, 'request_id'> = {
      plan: 'basic',
      price: { amount: 10, currency: 'USD' }
    };
    const msg = MessageBuilder.offer(sender, 'req_123', payload);

    expect(msg.type).toBe('OFFER');
    const p = msg.payload as unknown as OfferPayload;
    expect(p.request_id).toBe('req_123');
    expect(p.plan).toBe('basic');
  });

  it('should build ACCEPT message', () => {
    const msg = MessageBuilder.accept(sender, 'req_123', { terms: { agreed: true } });

    expect(msg.type).toBe('ACCEPT');
    const p = msg.payload as unknown as AcceptPayload;
    expect(p.request_id).toBe('req_123');
    expect(p.terms).toEqual({ agreed: true });
    expect(p.accepted_at).toBeDefined();
  });

  it('should build RESULT message', () => {
    const payload: Omit<ResultPayload, 'request_id'> = {
      status: 'success',
      output: { result: 42 }
    };
    const msg = MessageBuilder.result(sender, 'req_123', payload);

    expect(msg.type).toBe('RESULT');
    const p = msg.payload as unknown as ResultPayload;
    expect(p.request_id).toBe('req_123');
    expect(p.status).toBe('success');
  });

  it('should build ERROR message', () => {
    const msg = MessageBuilder.error(sender, 'E_TEST', 'Something went wrong', { recipient: 'did:key:zRecipient' });

    expect(msg.type).toBe('ERROR');
    expect(msg.recipient).toEqual({ id: 'did:key:zRecipient' });
    const p = msg.payload as any;
    expect(p.code).toBe('E_TEST');
    expect(p.message).toBe('Something went wrong');
  });
});
