export type JsonSchema = Record<string, unknown>;
export type SchemaValidationResult = {
    ok: boolean;
    errors: string[];
};
export declare function validateJsonSchema(schema: unknown, value: unknown, path?: string): SchemaValidationResult;
//# sourceMappingURL=schema.d.ts.map