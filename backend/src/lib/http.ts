import { Type, type TSchema } from 'typebox';

/** The `{ success, data, message }` envelope. The whole frontend unwraps this one shape. */
export function ok<T>(data: T, message?: string) {
  return message === undefined ? { success: true as const, data } : { success: true as const, data, message };
}

/**
 * The envelope as a response schema around `data`. Fastify serializes a
 * response through it, so a key the schema does not list never leaves.
 */
export const Ok = <T extends TSchema>(data: T) =>
  Type.Object({ success: Type.Literal(true), data, message: Type.Optional(Type.String()) });

/** A route param holding a row id (a uuid; anything longer cannot be one). */
export const IdParams = Type.Object({ id: Type.String({ maxLength: 36 }) });
