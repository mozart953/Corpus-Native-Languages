/**
 * Wrap an async Express handler so rejected promises reach `next()`.
 * Express 5 does this automatically, but keeping the helper makes the
 * controllers readable and keeps the behaviour explicit.
 */
export function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
