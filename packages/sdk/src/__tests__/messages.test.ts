/**
 * Messages Module Tests
 * Tests for message payload types and MessageBuilder
 */

import { describe, it, expect } from 'vitest';
import {
  MessageBuilder,
  type RequestPayload,
  type OfferPayload,
  type AcceptPayload,
  type ResultPayload,
  type ErrorPayload,
  type Sender,
} from '../messages.js';

describe('Messages Module', () => {
  const testSender: Sender = {
    id: 'did:key:zTestSender',
    name: 'Test Agent',
    url: 'https://test.example',
  };

  describe('MessageBuilder.request', () => {
    it('should create a REQUEST envelope', () => {
      const payload: RequestPayload = {
        request_id: 'req-123',
        intent: 'echo',
        title: 'Echo Test',
        params: { message: 'Hello' },
      };

      const envelope = MessageBuilder.request(testSender, payload);

      expect(envelope.type).toBe('REQUEST');
      expect(envelope.sender).toEqual(testSender);
      expect(envelope.payload.request_id).toBe('req-123');
      expect(envelope.payload.intent).toBe('echo');
      expect(envelope.payload.params).toEqual({ message: 'Hello' });
      expect(envelope.id.startsWith('req_')).toBe(true);
    });

    it('should add recipient when specified', () => {
      const payload: RequestPayload = {
        request_id: 'req-123',
        intent: 'echo',
        params: {},
      };

      const envelope = MessageBuilder.request(testSender, payload, {
        recipient: 'did:key:zRecipient',
      });

      expect(envelope.recipient).toEqual({ id: 'did:key:zRecipient' });
    });

    it('should add thread when specified', () => {
      const payload: RequestPayload = {
        request_id: 'req-123',
        intent: 'echo',
        params: {},
      };

      const envelope = MessageBuilder.request(testSender, payload, {
        thread: 'thread-456',
      });

      expect(envelope.thread).toEqual({ id: 'thread-456' });
    });

    it('should include constraints when provided', () => {
      const payload: RequestPayload = {
        request_id: 'req-123',
        intent: 'echo',
        params: {},
        constraints: {
          max_cost_usd: 100,
          max_latency_ms: 5000,
          deadline: '2024-12-31T23:59:59Z',
        },
      };

      const envelope = MessageBuilder.request(testSender, payload);

      expect(envelope.payload.constraints).toEqual({
        max_cost_usd: 100,
        max_latency_ms: 5000,
        deadline: '2024-12-31T23:59:59Z',
      });
    });
  });

  describe('MessageBuilder.offer', () => {
    it('should create an OFFER envelope', () => {
      const payload: OfferPayload = {
        request_id: 'req-123',
        plan: 'Execute echo with params',
        price: { amount: 10, currency: 'USDC' },
        eta_seconds: 30,
      };

      const envelope = MessageBuilder.offer(testSender, 'req-123', payload);

      expect(envelope.type).toBe('OFFER');
      expect(envelope.payload.request_id).toBe('req-123');
      expect(envelope.payload.plan).toBe('Execute echo with params');
      expect(envelope.payload.price).toEqual({ amount: 10, currency: 'USDC' });
      expect(envelope.payload.eta_seconds).toBe(30);
      expect(envelope.id.startsWith('off_')).toBe(true);
    });

    it('should add thread when specified', () => {
      const envelope = MessageBuilder.offer(
        testSender,
        'req-123',
        { plan: 'Test' },
        { thread: 'thread-456' }
      );

      expect(envelope.thread).toEqual({ id: 'thread-456' });
    });
  });

  describe('MessageBuilder.accept', () => {
    it('should create an ACCEPT envelope', () => {
      const envelope = MessageBuilder.accept(testSender, 'req-123');

      expect(envelope.type).toBe('ACCEPT');
      expect(envelope.payload.request_id).toBe('req-123');
      expect(envelope.payload.accepted_at).toBeDefined();
      expect(envelope.id.startsWith('acc_')).toBe(true);
    });

    it('should include payment transaction when specified', () => {
      const envelope = MessageBuilder.accept(testSender, 'req-123', {
        payment_tx: '0xabc123',
      });

      expect(envelope.payload.payment_tx).toBe('0xabc123');
    });

    it('should include terms when specified', () => {
      const envelope = MessageBuilder.accept(testSender, 'req-123', {
        terms: { delivery: '24h' },
      });

      expect(envelope.payload.terms).toEqual({ delivery: '24h' });
    });

    it('should add thread when specified', () => {
      const envelope = MessageBuilder.accept(testSender, 'req-123', {
        thread: 'thread-456',
      });

      expect(envelope.thread).toEqual({ id: 'thread-456' });
    });
  });

  describe('MessageBuilder.result', () => {
    it('should create a RESULT envelope', () => {
      const payload: ResultPayload = {
        request_id: 'req-123',
        status: 'success',
        output: { result: 'Echo: Hello' },
        metrics: { latency_ms: 100, cost_actual: 5 },
      };

      const envelope = MessageBuilder.result(testSender, 'req-123', payload);

      expect(envelope.type).toBe('RESULT');
      expect(envelope.payload.request_id).toBe('req-123');
      expect(envelope.payload.status).toBe('success');
      expect(envelope.payload.output).toEqual({ result: 'Echo: Hello' });
      expect(envelope.payload.metrics).toEqual({ latency_ms: 100, cost_actual: 5 });
      expect(envelope.id.startsWith('res_')).toBe(true);
    });

    it('should support all result statuses', () => {
      const statuses: ResultPayload['status'][] = [
        'success', 'partial', 'failed', 'cancelled'
      ];

      for (const status of statuses) {
        const envelope = MessageBuilder.result(testSender, 'req-123', { status });
        expect(envelope.payload.status).toBe(status);
      }
    });

    it('should include artifacts when provided', () => {
      const artifacts = [
        { type: 'image', url: 'https://example.com/img.png', name: 'result.png' },
      ];
      const payload: ResultPayload = {
        request_id: 'req-123',
        status: 'success',
        artifacts: artifacts as ResultPayload['artifacts'],
      };

      const envelope = MessageBuilder.result(testSender, 'req-123', payload);

      const resultArtifacts = envelope.payload.artifacts as typeof artifacts;
      expect(resultArtifacts).toHaveLength(1);
      expect(resultArtifacts[0]).toEqual({
        type: 'image',
        url: 'https://example.com/img.png',
        name: 'result.png',
      });
    });
  });

  describe('MessageBuilder.error', () => {
    it('should create an ERROR envelope', () => {
      const envelope = MessageBuilder.error(testSender, 'NOT_FOUND', 'Resource not found');

      expect(envelope.type).toBe('ERROR');
      expect(envelope.payload.code).toBe('NOT_FOUND');
      expect(envelope.payload.message).toBe('Resource not found');
      expect(envelope.id.startsWith('err_')).toBe(true);
    });

    it('should add recipient when specified', () => {
      const envelope = MessageBuilder.error(
        testSender,
        'ERROR',
        'Message',
        { recipient: 'did:key:zRecipient' }
      );

      expect(envelope.recipient).toEqual({ id: 'did:key:zRecipient' });
    });

    it('should add details when specified', () => {
      const envelope = MessageBuilder.error(
        testSender,
        'VALIDATION_ERROR',
        'Invalid input',
        { details: { field: 'email', issue: 'required' } }
      );

      expect(envelope.payload.details).toEqual({ field: 'email', issue: 'required' });
    });

    it('should add thread when specified', () => {
      const envelope = MessageBuilder.error(
        testSender,
        'ERROR',
        'Message',
        { thread: 'thread-456' }
      );

      expect(envelope.thread).toEqual({ id: 'thread-456' });
    });
  });

  describe('Message ID generation', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const envelope = MessageBuilder.request(testSender, {
          request_id: 'req-123',
          intent: 'echo',
          params: {},
        });
        ids.add(envelope.id);
      }

      expect(ids.size).toBe(100);
    });

    it('should use correct prefixes for different message types', () => {
      const request = MessageBuilder.request(testSender, {
        request_id: 'req-123',
        intent: 'echo',
        params: {},
      });
      expect(request.id.startsWith('req_')).toBe(true);

      const offer = MessageBuilder.offer(testSender, 'req-123', { plan: 'Test' });
      expect(offer.id.startsWith('off_')).toBe(true);

      const accept = MessageBuilder.accept(testSender, 'req-123');
      expect(accept.id.startsWith('acc_')).toBe(true);

      const result = MessageBuilder.result(testSender, 'req-123', { status: 'success' });
      expect(result.id.startsWith('res_')).toBe(true);

      const error = MessageBuilder.error(testSender, 'ERROR', 'Message');
      expect(error.id.startsWith('err_')).toBe(true);
    });
  });
});
