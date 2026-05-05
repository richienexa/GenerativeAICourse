import { webcrypto } from 'node:crypto';
if (!globalThis.crypto?.getRandomValues) {
  globalThis.crypto = webcrypto;
}
