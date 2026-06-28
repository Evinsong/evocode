import type { TaskScheduler } from '../orchestrator/TaskScheduler';
import type { CodeGenerator } from '../codegen/CodeGenerator';

/**
 * Simple service container for dependency injection.
 * Holds singleton instances of core services that are created during
 * server initialization and accessed by route handlers.
 */

let taskSchedulerInstance: TaskScheduler | null = null;
let codeGeneratorInstance: CodeGenerator | null = null;

/**
 * Initialize the container with the TaskScheduler instance.
 * Called once during server startup in server/index.ts.
 * @param scheduler - The TaskScheduler instance to store
 */
export function initContainer(scheduler: TaskScheduler): void {
  taskSchedulerInstance = scheduler;
}

/**
 * Get the TaskScheduler instance.
 * @returns The TaskScheduler singleton
 * @throws Error if container not initialized (initContainer not called)
 */
export function getTaskScheduler(): TaskScheduler {
  if (!taskSchedulerInstance) {
    throw new Error('Service container not initialized. Call initContainer() first.');
  }
  return taskSchedulerInstance;
}

/**
 * Store the CodeGenerator instance in the container.
 * Called during server startup after creating the CodeGenerator.
 * @param generator - The CodeGenerator instance to store
 */
export function setCodeGenerator(generator: CodeGenerator): void {
  codeGeneratorInstance = generator;
}

/**
 * Get the CodeGenerator instance.
 * @returns The CodeGenerator singleton
 * @throws Error if CodeGenerator not initialized (setCodeGenerator not called)
 */
export function getCodeGenerator(): CodeGenerator {
  if (!codeGeneratorInstance) {
    throw new Error('CodeGenerator not initialized. Call setCodeGenerator() first.');
  }
  return codeGeneratorInstance;
}
