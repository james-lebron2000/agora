import { Envelope, EnvelopeBuilder, MessageType, Sender } from './envelope.js';

export interface RequestPayload {
  request_id: string;
  intent: string;
  title?: string;
  description?: string;
  params: Record<string, unknown>;
  constraints?: {
    max_cost_usd?: number;
    max_latency_ms?: number;
    deadline?: string;
  };
}

export interface OfferPayload {
  request_id: string;
  plan?: string;
  price?: {
    amount: number;
    currency: string;
  };
  eta_seconds?: number;
  valid_until?: string;
}

export interface AcceptPayload {
  request_id: string;
  accepted_at: string;
  payment_tx?: string;
  terms?: Record<string, unknown>;
}

export interface ResultPayload {
  request_id: string;
  status: 'success' | 'partial' | 'failed' | 'cancelled';
  output?: Record<string, unknown>;
  artifacts?: Array<{
    type: string;
    url: string;
    name?: string;
  }>;
  metrics?: {
    latency_ms?: number;
    cost_actual?: number;
  };
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class MessageBuilder {
  static request(
    sender: Sender,
    payload: RequestPayload,
    options?: { recipient?: string; thread?: string }
  ): Envelope {
    const builder = new EnvelopeBuilder()
      .id(generateId('req'))
      .type('REQUEST')
      .sender(sender)
      .payload(payload as unknown as Record<string, unknown>);

    if (options?.recipient) {
      builder.recipient({ id: options.recipient });
    }
    if (options?.thread) {
      builder.thread({ id: options.thread });
    }

    return builder.build();
  }

  static offer(
    sender: Sender,
    requestId: string,
    payload: Omit<OfferPayload, 'request_id'>,
    options?: { thread?: string }
  ): Envelope {
    const builder = new EnvelopeBuilder()
      .id(generateId('off'))
      .type('OFFER')
      .sender(sender)
      .payload({ ...payload, request_id: requestId });

    if (options?.thread) {
      builder.thread({ id: options.thread });
    }

    return builder.build();
  }

  static accept(
    sender: Sender,
    requestId: string,
    options?: { thread?: string; terms?: Record<string, unknown>; payment_tx?: string }
  ): Envelope {
    const payload: AcceptPayload = {
      request_id: requestId,
      accepted_at: new Date().toISOString(),
      payment_tx: options?.payment_tx,
      terms: options?.terms,
    };

    const builder = new EnvelopeBuilder()
      .id(generateId('acc'))
      .type('ACCEPT')
      .sender(sender)
      .payload(payload as unknown as Record<string, unknown>);

    if (options?.thread) {
      builder.thread({ id: options.thread });
    }

    return builder.build();
  }

  static result(
    sender: Sender,
    requestId: string,
    payload: Omit<ResultPayload, 'request_id'>,
    options?: { thread?: string }
  ): Envelope {
    const builder = new EnvelopeBuilder()
      .id(generateId('res'))
      .type('RESULT')
      .sender(sender)
      .payload({ ...payload, request_id: requestId });

    if (options?.thread) {
      builder.thread({ id: options.thread });
    }

    return builder.build();
  }

  static error(
    sender: Sender,
    code: string,
    message: string,
    options?: { recipient?: string; details?: Record<string, unknown>; thread?: string }
  ): Envelope {
    const payload: ErrorPayload = {
      code,
      message,
      details: options?.details,
    };

    const builder = new EnvelopeBuilder()
      .id(generateId('err'))
      .type('ERROR')
      .sender(sender)
      .payload(payload as unknown as Record<string, unknown>);

    if (options?.recipient) {
      builder.recipient({ id: options.recipient });
    }
    if (options?.thread) {
      builder.thread({ id: options.thread });
    }

    return builder.build();
  }
}

function generateId(prefix: string): string {
  const random = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${random}`;
}
