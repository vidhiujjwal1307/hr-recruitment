const { ChromaClient } = require('chromadb');

let chromaInstance = null;

function getChromaClient() {
  if (!chromaInstance) {
    chromaInstance = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000',
    });
  }
  return chromaInstance;
}

module.exports = { getChromaClient };
