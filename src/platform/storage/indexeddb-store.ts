import type { ProjectSnapshot } from '../../core/project.js';
import type { ProjectStore } from './types.js';

const DATABASE_NAME = 'ruhia-sticker-studio';
const STORE_NAME = 'project';
const KEY = 'current';
const OPEN_TIMEOUT_MS = 3000;

/**
 * ブラウザの保存領域を使う。
 *
 * 画像そのものを保存するため、文字列にせず Blob のまま入れる。
 * IndexedDB は Blob をそのまま扱える。
 */
export async function createIndexedDbStore(): Promise<ProjectStore | null> {
  const database = await openDatabase();
  if (!database) return null;

  return {
    available: true,

    async save(snapshot: ProjectSnapshot) {
      await runTransaction(database, 'readwrite', (store) => store.put(snapshot, KEY));
    },

    async load() {
      const found = await runTransaction<ProjectSnapshot | undefined>(
        database,
        'readonly',
        (store) => store.get(KEY),
      );
      return found ?? null;
    },

    async clear() {
      await runTransaction(database, 'readwrite', (store) => store.delete(KEY));
    },
  };
}

/** 開けなければ null。使えない環境かどうかはここで決まる。 */
async function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined' || indexedDB === null) return null;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: IDBDatabase | null): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    // 応答が返らない環境があるので、待ち続けない
    const timer = setTimeout(() => finish(null), OPEN_TIMEOUT_MS);

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DATABASE_NAME, 1);
    } catch {
      clearTimeout(timer);
      finish(null);
      return;
    }

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => {
      clearTimeout(timer);
      finish(request.result);
    };
    request.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
    request.onblocked = () => {
      clearTimeout(timer);
      finish(null);
    };
  });
}

function runTransaction<T>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = work(transaction.objectStore(STORE_NAME));

    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error ?? new Error('保存できませんでした'));
    transaction.onabort = () => reject(transaction.error ?? new Error('保存できませんでした'));
  });
}
