export type JsonSchema = Record<string, unknown>;

export type SchemaValidationResult = {
  ok: boolean;
  errors: string[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeSchema(value: unknown): Record<string, unknown> | null {
  return isObject(value) ? value : null;
}

export function validateJsonSchema(schema: unknown, value: unknown, path = 'root'): SchemaValidationResult {
  const errors: string[] = [];
  const schemaObj = normalizeSchema(schema);

  if (!schemaObj) {
    return { ok: false, errors: [`${path}: schema must be an object`] };
  }

  const schemaType = schemaObj.type;
  if (Array.isArray(schemaType)) {
    const anyTypeMatches = schemaType.some((subtype) =>
      validateJsonSchema({ ...schemaObj, type: subtype }, value, path).ok,
    );
    if (!anyTypeMatches) errors.push(`${path}: value does not match any allowed type`);
    return { ok: errors.length === 0, errors };
  }

  const enumValues = schemaObj.enum;
  if (Array.isArray(enumValues)) {
    const enumMatch = enumValues.some((item) => JSON.stringify(item) === JSON.stringify(value));
    if (!enumMatch) errors.push(`${path}: value is not in enum`);
  }

  if (schemaType === 'string') {
    if (typeof value !== 'string') errors.push(`${path}: expected string`);
    return { ok: errors.length === 0, errors };
  }
  if (schemaType === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) errors.push(`${path}: expected number`);
    return { ok: errors.length === 0, errors };
  }
  if (schemaType === 'integer') {
    if (!Number.isInteger(value)) errors.push(`${path}: expected integer`);
    return { ok: errors.length === 0, errors };
  }
  if (schemaType === 'boolean') {
    if (typeof value !== 'boolean') errors.push(`${path}: expected boolean`);
    return { ok: errors.length === 0, errors };
  }
  if (schemaType === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${path}: expected array`);
      return { ok: false, errors };
    }

    const minItems = typeof schemaObj.minItems === 'number' ? schemaObj.minItems : null;
    const maxItems = typeof schemaObj.maxItems === 'number' ? schemaObj.maxItems : null;
    if (minItems != null && value.length < minItems) errors.push(`${path}: expected at least ${minItems} items`);
    if (maxItems != null && value.length > maxItems) errors.push(`${path}: expected at most ${maxItems} items`);

    if (schemaObj.items) {
      value.forEach((item, index) => {
        const nested = validateJsonSchema(schemaObj.items, item, `${path}[${index}]`);
        errors.push(...nested.errors);
      });
    }
    return { ok: errors.length === 0, errors };
  }

  if (schemaType === 'object' || schemaObj.properties || schemaObj.required) {
    if (!isObject(value)) {
      errors.push(`${path}: expected object`);
      return { ok: false, errors };
    }

    const required = Array.isArray(schemaObj.required) ? schemaObj.required : [];
    for (const key of required) {
      if (!(key in value)) errors.push(`${path}.${String(key)}: is required`);
    }

    const properties = normalizeSchema(schemaObj.properties) || {};
    for (const [key, childSchema] of Object.entries(properties)) {
      if (!(key in value)) continue;
      const nested = validateJsonSchema(childSchema, value[key], `${path}.${key}`);
      errors.push(...nested.errors);
    }

    if (schemaObj.additionalProperties === false) {
      const allowed = new Set(Object.keys(properties));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) errors.push(`${path}.${key}: additional property is not allowed`);
      }
    }
    return { ok: errors.length === 0, errors };
  }

  return { ok: errors.length === 0, errors };
}
