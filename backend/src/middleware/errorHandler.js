function errorHandler(err, req, res, next) {
  console.error(err);

  if (err && err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    return res.status(409).json({ error: `${field} already exists.` });
  }

  if (err && err.name === 'ValidationError') {
    const message = Object.values(err.errors || {})[0]?.message || 'Validation failed.';
    return res.status(400).json({ error: message });
  }

  res.status(err.status || 500).json({ error: err.message || 'Server error' });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
