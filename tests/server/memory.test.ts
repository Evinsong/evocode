import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA_SQL } from '../../server/db/schema';
import { MemoryStore } from '../../server/memory/MemoryStore';
import { SkillManager } from '../../server/memory/SkillManager';
import { AuditLogger } from '../../server/memory/AuditLogger';

/** Create an in-memory database with schema for each test */
function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA_SQL);
  return db;
}

// ============== MemoryStore Tests ==============
describe('MemoryStore', () => {
  let db: Database.Database;
  let store: MemoryStore;

  beforeEach(() => {
    db = createTestDb();
    store = new MemoryStore(db);
  });

  describe('save', () => {
    it('should save a memory and return it with id and timestamps', () => {
      const memory = store.save({
        type: 'user_preference',
        key: 'theme',
        value: 'dark',
        metadata: { source: 'user' },
      });

      expect(memory.id).toBeDefined();
      expect(memory.type).toBe('user_preference');
      expect(memory.key).toBe('theme');
      expect(memory.value).toBe('dark');
      expect(memory.metadata).toEqual({ source: 'user' });
      expect(memory.createdAt).toBeGreaterThan(0);
      expect(memory.updatedAt).toBe(memory.createdAt);
    });

    it('should save memory with empty metadata', () => {
      const memory = store.save({
        type: 'project_context',
        key: 'tech_stack',
        value: 'React 18',
        metadata: {},
      });

      expect(memory.metadata).toEqual({});
    });
  });

  describe('get', () => {
    it('should retrieve a saved memory by id', () => {
      const saved = store.save({
        type: 'user_preference',
        key: 'language',
        value: 'TypeScript',
        metadata: { priority: 'high' },
      });

      const retrieved = store.get(saved.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(saved.id);
      expect(retrieved!.key).toBe('language');
      expect(retrieved!.metadata).toEqual({ priority: 'high' });
    });

    it('should return null for non-existent id', () => {
      const result = store.get('nonexistent-uuid');
      expect(result).toBeNull();
    });

    it('should return null for soft-deleted memory', () => {
      const saved = store.save({
        type: 'user_preference',
        key: 'temp',
        value: 'test',
        metadata: {},
      });
      store.delete(saved.id);

      const result = store.get(saved.id);
      expect(result).toBeNull();
    });
  });

  describe('findByType', () => {
    it('should return memories filtered by type', () => {
      store.save({ type: 'user_preference', key: 'k1', value: 'v1', metadata: {} });
      store.save({ type: 'project_context', key: 'k2', value: 'v2', metadata: {} });
      store.save({ type: 'user_preference', key: 'k3', value: 'v3', metadata: {} });

      const prefs = store.findByType('user_preference');
      expect(prefs).toHaveLength(2);
      expect(prefs.every((m) => m.type === 'user_preference')).toBe(true);
    });

    it('should return empty array for type with no memories', () => {
      const result = store.findByType('historical_decision');
      expect(result).toHaveLength(0);
    });
  });

  describe('search', () => {
    it('should find memories matching query in key', () => {
      store.save({ type: 'user_preference', key: 'preferred_framework', value: 'React', metadata: {} });
      store.save({ type: 'project_context', key: 'tech_stack', value: 'Vue', metadata: {} });

      const results = store.search('framework');
      expect(results).toHaveLength(1);
      expect(results[0].key).toBe('preferred_framework');
    });

    it('should find memories matching query in value', () => {
      store.save({ type: 'user_preference', key: 'theme', value: 'dark mode preferred', metadata: {} });
      store.save({ type: 'project_context', key: 'config', value: 'light mode', metadata: {} });

      const results = store.search('dark');
      expect(results).toHaveLength(1);
      expect(results[0].value).toContain('dark');
    });
  });

  describe('update', () => {
    it('should update memory fields', () => {
      const saved = store.save({
        type: 'user_preference',
        key: 'original_key',
        value: 'original_value',
        metadata: { version: 1 },
      });

      const updated = store.update(saved.id, {
        value: 'updated_value',
        metadata: { version: 2 },
      });

      expect(updated).not.toBeNull();
      expect(updated!.value).toBe('updated_value');
      expect(updated!.metadata).toEqual({ version: 2 });
      expect(updated!.updatedAt).toBeGreaterThanOrEqual(saved.updatedAt);
      // Key should be preserved
      expect(updated!.key).toBe('original_key');
    });

    it('should return null for non-existent id', () => {
      const result = store.update('nonexistent', { value: 'test' });
      expect(result).toBeNull();
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft-delete a memory', () => {
      const saved = store.save({
        type: 'user_preference',
        key: 'to_delete',
        value: 'temp',
        metadata: {},
      });

      store.delete(saved.id);
      expect(store.get(saved.id)).toBeNull();
    });

    it('should not affect other memories', () => {
      const m1 = store.save({ type: 'user_preference', key: 'keep', value: 'v1', metadata: {} });
      const m2 = store.save({ type: 'user_preference', key: 'delete', value: 'v2', metadata: {} });

      store.delete(m2.id);
      expect(store.get(m1.id)).not.toBeNull();
      expect(store.get(m2.id)).toBeNull();
    });
  });

  describe('retrieveRelevant', () => {
    it('should return memories matching context keywords', () => {
      store.save({ type: 'user_preference', key: 'theme', value: 'dark mode', metadata: {} });
      store.save({ type: 'project_context', key: 'framework', value: 'React TypeScript', metadata: {} });
      store.save({ type: 'historical_decision', key: 'arch', value: 'microservices', metadata: {} });

      const results = store.retrieveRelevant('React TypeScript project');
      expect(results.length).toBeGreaterThan(0);
      // The project_context memory should be in results
      const frameworkMemory = results.find((m) => m.key === 'framework');
      expect(frameworkMemory).toBeDefined();
    });

    it('should prioritize user_preference type', () => {
      store.save({ type: 'historical_decision', key: 'decision', value: 'use dark theme', metadata: {} });
      store.save({ type: 'user_preference', key: 'pref', value: 'dark theme preferred', metadata: {} });

      const results = store.retrieveRelevant('dark theme');
      expect(results.length).toBeGreaterThan(0);
      // user_preference should come before historical_decision
      const prefIndex = results.findIndex((m) => m.type === 'user_preference');
      const decisionIndex = results.findIndex((m) => m.type === 'historical_decision');
      if (prefIndex !== -1 && decisionIndex !== -1) {
        expect(prefIndex).toBeLessThan(decisionIndex);
      }
    });

    it('should return user preferences when context has no keywords', () => {
      store.save({ type: 'user_preference', key: 'pref1', value: 'value1', metadata: {} });

      const results = store.retrieveRelevant('');
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

// ============== SkillManager Tests ==============
describe('SkillManager', () => {
  let db: Database.Database;
  let manager: SkillManager;

  beforeEach(() => {
    db = createTestDb();
    manager = new SkillManager(db);
  });

  describe('save', () => {
    it('should save a skill and return it with id and timestamps', () => {
      const skill = manager.save({
        name: 'Component Generator',
        description: 'Generates React components from description',
        pattern: 'generate component *',
        usageCount: 0,
        source: 'manual',
        definition: '{"type":"component","action":"generate"}',
      });

      expect(skill.id).toBeDefined();
      expect(skill.name).toBe('Component Generator');
      expect(skill.usageCount).toBe(0);
      expect(skill.createdAt).toBeGreaterThan(0);
      expect(skill.updatedAt).toBe(skill.createdAt);
    });
  });

  describe('list', () => {
    it('should list all non-deleted skills', () => {
      manager.save({ name: 'Skill 1', description: 'desc1', pattern: 'p1', usageCount: 5, source: 'manual', definition: '{}' });
      manager.save({ name: 'Skill 2', description: 'desc2', pattern: 'p2', usageCount: 3, source: 'auto', definition: '{}' });

      const skills = manager.list();
      expect(skills).toHaveLength(2);
    });

    it('should not list soft-deleted skills', () => {
      const s1 = manager.save({ name: 'Skill 1', description: 'd1', pattern: 'p1', usageCount: 0, source: 'manual', definition: '{}' });
      manager.save({ name: 'Skill 2', description: 'd2', pattern: 'p2', usageCount: 0, source: 'manual', definition: '{}' });

      manager.delete(s1.id);
      const skills = manager.list();
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('Skill 2');
    });
  });

  describe('search', () => {
    it('should search skills by name', () => {
      manager.save({ name: 'React Generator', description: 'd1', pattern: 'p1', usageCount: 0, source: 'manual', definition: '{}' });
      manager.save({ name: 'Vue Helper', description: 'd2', pattern: 'p2', usageCount: 0, source: 'manual', definition: '{}' });

      const results = manager.search('React');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('React Generator');
    });

    it('should search skills by description', () => {
      manager.save({ name: 'Skill A', description: 'Helps with testing', pattern: 'p1', usageCount: 0, source: 'manual', definition: '{}' });
      manager.save({ name: 'Skill B', description: 'Code generation', pattern: 'p2', usageCount: 0, source: 'manual', definition: '{}' });

      const results = manager.search('testing');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Skill A');
    });
  });

  describe('delete', () => {
    it('should soft-delete a skill', () => {
      const skill = manager.save({ name: 'Test', description: 'd', pattern: 'p', usageCount: 0, source: 'manual', definition: '{}' });
      manager.delete(skill.id);

      expect(manager.get(skill.id)).toBeNull();
    });
  });

  describe('autoCreate', () => {
    it('should throw NotImplemented error', async () => {
      await expect(manager.autoCreate()).rejects.toThrow('NotImplemented');
    });
  });
});

// ============== AuditLogger Tests ==============
describe('AuditLogger', () => {
  let db: Database.Database;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    db = createTestDb();
    auditLogger = new AuditLogger(db);
  });

  describe('log', () => {
    it('should log an audit entry and return it with id and timestamp', () => {
      const entry = auditLogger.log({
        taskId: 'task-001',
        agentId: 'agent-001',
        eventType: 'agent_action',
        description: 'Agent started processing task',
        details: { action: 'start', status: 'thinking' },
      });

      expect(entry.id).toBeDefined();
      expect(entry.taskId).toBe('task-001');
      expect(entry.agentId).toBe('agent-001');
      expect(entry.eventType).toBe('agent_action');
      expect(entry.description).toBe('Agent started processing task');
      expect(entry.details).toEqual({ action: 'start', status: 'thinking' });
      expect(entry.timestamp).toBeGreaterThan(0);
    });

    it('should log entry with null agentId', () => {
      const entry = auditLogger.log({
        taskId: 'task-002',
        agentId: null,
        eventType: 'human_intervention',
        description: 'User paused task',
        details: {},
      });

      expect(entry.agentId).toBeNull();
    });
  });

  describe('getByTask', () => {
    it('should return all logs for a task ordered by timestamp', () => {
      auditLogger.log({ taskId: 'task-A', agentId: 'a1', eventType: 'agent_action', description: 'Step 1', details: {} });
      auditLogger.log({ taskId: 'task-A', agentId: 'a2', eventType: 'agent_action', description: 'Step 2', details: {} });
      auditLogger.log({ taskId: 'task-B', agentId: 'a1', eventType: 'agent_action', description: 'Other task', details: {} });

      const logs = auditLogger.getByTask('task-A');
      expect(logs).toHaveLength(2);
      expect(logs.every((l) => l.taskId === 'task-A')).toBe(true);
    });

    it('should return empty array for task with no logs', () => {
      const logs = auditLogger.getByTask('nonexistent');
      expect(logs).toHaveLength(0);
    });
  });

  describe('getByAgent', () => {
    it('should return all logs for an agent', () => {
      auditLogger.log({ taskId: 't1', agentId: 'agent-X', eventType: 'agent_action', description: 'Action 1', details: {} });
      auditLogger.log({ taskId: 't2', agentId: 'agent-X', eventType: 'agent_action', description: 'Action 2', details: {} });
      auditLogger.log({ taskId: 't3', agentId: 'agent-Y', eventType: 'agent_action', description: 'Other agent', details: {} });

      const logs = auditLogger.getByAgent('agent-X');
      expect(logs).toHaveLength(2);
    });
  });

  describe('query with filter', () => {
    beforeEach(() => {
      // Seed test data
      auditLogger.log({ taskId: 'task-1', agentId: 'agent-1', eventType: 'agent_action', description: 'Log 1', details: {} });
      auditLogger.log({ taskId: 'task-1', agentId: 'agent-2', eventType: 'review', description: 'Log 2', details: {} });
      auditLogger.log({ taskId: 'task-2', agentId: 'agent-1', eventType: 'task_event', description: 'Log 3', details: {} });
      auditLogger.log({ taskId: 'task-2', agentId: 'agent-2', eventType: 'human_intervention', description: 'Log 4', details: {} });
    });

    it('should filter by taskId', () => {
      const logs = auditLogger.query({ taskId: 'task-1' });
      expect(logs).toHaveLength(2);
      expect(logs.every((l) => l.taskId === 'task-1')).toBe(true);
    });

    it('should filter by agentId', () => {
      const logs = auditLogger.query({ agentId: 'agent-1' });
      expect(logs).toHaveLength(2);
      expect(logs.every((l) => l.agentId === 'agent-1')).toBe(true);
    });

    it('should filter by eventType', () => {
      const logs = auditLogger.query({ eventType: 'review' });
      expect(logs).toHaveLength(1);
      expect(logs[0].eventType).toBe('review');
    });

    it('should filter by combined conditions', () => {
      const logs = auditLogger.query({ taskId: 'task-2', eventType: 'human_intervention' });
      expect(logs).toHaveLength(1);
      expect(logs[0].description).toBe('Log 4');
    });

    it('should filter by time range', () => {
      const now = Date.now();
      // Query logs before now + 1 (all logs should be included)
      const logs = auditLogger.query({ endTime: now + 1000 });
      expect(logs).toHaveLength(4);

      // Query logs after now + 10000 (no logs should match)
      const futureLogs = auditLogger.query({ startTime: now + 10000 });
      expect(futureLogs).toHaveLength(0);
    });

    it('should return all logs with empty filter', () => {
      const logs = auditLogger.query({});
      expect(logs).toHaveLength(4);
    });
  });
});
