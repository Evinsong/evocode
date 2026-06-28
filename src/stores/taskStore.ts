import { create } from 'zustand'
import type { Task, TaskStatus, GeneratedFile } from '@shared/types'

interface TaskState {
  currentTask: Task | null
  generatedFiles: GeneratedFile[]
  selectedFileIndex: number
  setCurrentTask: (task: Task | null) => void
  setGeneratedFiles: (files: GeneratedFile[]) => void
  addGeneratedFile: (file: GeneratedFile) => void
  selectFile: (index: number) => void
  updateTaskStatus: (status: TaskStatus) => void
}

export const useTaskStore = create<TaskState>((set) => ({
  currentTask: null,
  generatedFiles: [],
  selectedFileIndex: 0,

  setCurrentTask: (currentTask) => set({ currentTask }),

  setGeneratedFiles: (generatedFiles) =>
    set({ generatedFiles, selectedFileIndex: 0 }),

  addGeneratedFile: (file) =>
    set((state) => ({
      generatedFiles: [...state.generatedFiles, file],
    })),

  selectFile: (selectedFileIndex) => set({ selectedFileIndex }),

  updateTaskStatus: (status) =>
    set((state) => ({
      currentTask: state.currentTask
        ? { ...state.currentTask, status, updatedAt: Date.now() }
        : null,
    })),
}))
