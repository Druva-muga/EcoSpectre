import * as FileSystem from 'expo-file-system';
import { ScanRecord, ScanContext, SustainabilityScore } from '../types';

const STORAGE_FILE = FileSystem.documentDirectory + 'scans.json';

type StoredScan = ScanRecord & { pending?: boolean };

async function readAll(): Promise<StoredScan[]> {
  try {
    const exists = await FileSystem.getInfoAsync(STORAGE_FILE);
    if (!exists.exists) return [];
    const content = await FileSystem.readAsStringAsync(STORAGE_FILE);
    if (!content) return [];
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: StoredScan[]): Promise<void> {
  const content = JSON.stringify(items);
  await FileSystem.writeAsStringAsync(STORAGE_FILE, content);
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const localScans = {
  async add(scan: {
    context: ScanContext;
    score: SustainabilityScore;
    action: 'consumed' | 'rejected';
    timestamp?: number;
    pending?: boolean;
    userId?: string;
  }): Promise<StoredScan> {
    const all = await readAll();
    const record: StoredScan = {
      id: generateId(),
      userId: scan.userId || 'local',
      timestamp: scan.timestamp ?? Date.now(),
      context: scan.context,
      score: scan.score,
      action: scan.action,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pending: scan.pending ?? false,
    };
    all.unshift(record);
    await writeAll(all);
    return record;
  },

  async getAll(userId?: string): Promise<StoredScan[]> {
    const all = await readAll();
    // Filter by userId if provided
    const filtered = userId ? all.filter(s => s.userId === userId) : all;
    // Sort newest first
    return filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  },

  async markSynced(id: string): Promise<void> {
    const all = await readAll();
    const idx = all.findIndex(s => s.id === id);
    if (idx >= 0) {
      all[idx].pending = false;
      all[idx].updatedAt = new Date().toISOString();
      await writeAll(all);
    }
  },
};


