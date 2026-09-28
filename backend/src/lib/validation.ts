import ajvErrors from 'ajv-errors';
import { ValidationFailed } from '@/lib/errors.ts';

/*
 * How Fastify's Ajv reads the TypeBox schemas in modules/<area>/schemas.ts:
 * - `errorMessage` (ajv-errors) carries the sentence a person sees; it needs
 *   `allErrors`, which also gives every failing field at once.
 * - `normalize: 'trim' | 'lowercase'` trims (and lower-cases) a string before
 *   its length, pattern and format are checked, and keeps the result.
 * - `$data` lets `password_confirmation` compare itself with `password`.
 */
const normalize = {
  keyword: 'normalize',
  type: 'string',
  schemaType: 'string',
  modifying: true,
  // Ajv checks maxLength first among the string keywords; this runs before all of them.
  before: 'maxLength',
  compile: (mode: 'trim' | 'lowercase') => (data: string, context?: { parentData: Record<string | number, unknown>; parentDataProperty: string | number }) => {
    if (context) context.parentData[context.parentDataProperty] = mode === 'lowercase' ? data.trim().toLowerCase() : data.trim();
    return true;
  },
} as const;

// ajv-errors is CommonJS: its `default` is the plugin both at runtime and in its
// types. Taking no options makes it fit Fastify's `Plugin<unknown>` slot.
const errorMessages = (ajv: Parameters<typeof ajvErrors.default>[0]) => ajvErrors.default(ajv);

export const ajvOptions = {
  customOptions: {
    allErrors: true,
    $data: true,
    keywords: [normalize],
  },
  plugins: [errorMessages],
};

/** The part of an Ajv error this reads. */
export interface AjvError {
  keyword: string;
  instancePath: string;
  message?: string;
  params: { errors?: AjvError[]; missingProperty?: string };
}

/**
 * Fastify's `schemaErrorFormatter`: Ajv's errors as the 422 envelope, one
 * message per field in `errors` and the keyword it broke in `failures`.
 */
export function validationFailed(errors: AjvError[]): ValidationFailed {
  const messages: Record<string, string[]> = {};
  const failures: Record<string, string[]> = {};
  for (const error of errors) {
    // ajv-errors wraps the error it replaced; that one names the rule and the missing property.
    const cause = error.keyword === 'errorMessage' ? error.params.errors?.[0] : error;
    const field = error.instancePath ? error.instancePath.slice(1).replaceAll('/', '.') : (cause?.params.missingProperty ?? '_');
    (messages[field] ??= []).push(error.message ?? 'is not valid');
    (failures[field] ??= []).push(cause?.keyword ?? error.keyword);
  }
  return new ValidationFailed(messages, failures);
}
