// Maps `@/` onto src/ at runtime, loaded with `node --import ./src/alias.ts`.
// Node's own `imports` field rejects `@/` (only `#name/` works), so this hook is
// what resolves it. The same alias is declared in tsconfig.json `paths` for the
// type check; change both together.
import { registerHooks } from 'node:module';

const root = new URL('./', import.meta.url);

registerHooks({
  resolve: (specifier, context, next) =>
    next(specifier.startsWith('@/') ? new URL(specifier.slice(2), root).href : specifier, context),
});
