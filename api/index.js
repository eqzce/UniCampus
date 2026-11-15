const { app, initDatabase } = require('../backend/src/index');

let initPromise = null;

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = initDatabase().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

module.exports = async function handler(req, res) {
  await ensureInitialized();
  return app(req, res);
};
