import { EnvelopeBuilder } from './envelope.js';
export class MessageBuilder {
    static request(sender, payload, options) {
        const builder = new EnvelopeBuilder()
            .id(generateId('req'))
            .type('REQUEST')
            .sender(sender)
            .payload(payload);
        if (options?.recipient) {
            builder.recipient({ id: options.recipient });
        }
        if (options?.thread) {
            builder.thread({ id: options.thread });
        }
        return builder.build();
    }
    static offer(sender, requestId, payload, options) {
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
    static accept(sender, requestId, options) {
        const payload = {
            request_id: requestId,
            accepted_at: new Date().toISOString(),
            payment_tx: options?.payment_tx,
            terms: options?.terms,
        };
        const builder = new EnvelopeBuilder()
            .id(generateId('acc'))
            .type('ACCEPT')
            .sender(sender)
            .payload(payload);
        if (options?.thread) {
            builder.thread({ id: options.thread });
        }
        return builder.build();
    }
    static result(sender, requestId, payload, options) {
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
    static error(sender, code, message, options) {
        const payload = {
            code,
            message,
            details: options?.details,
        };
        const builder = new EnvelopeBuilder()
            .id(generateId('err'))
            .type('ERROR')
            .sender(sender)
            .payload(payload);
        if (options?.recipient) {
            builder.recipient({ id: options.recipient });
        }
        if (options?.thread) {
            builder.thread({ id: options.thread });
        }
        return builder.build();
    }
}
function generateId(prefix) {
    const random = Math.random().toString(36).substring(2, 10);
    const time = Date.now().toString(36);
    return `${prefix}_${time}${random}`;
}
//# sourceMappingURL=messages.js.map