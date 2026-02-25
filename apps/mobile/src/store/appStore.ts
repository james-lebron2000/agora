import { create } from 'zustand';
import type { Agent, Task } from '../types/navigation';

interface AppState {
  agents: Agent[];
  tasks: Task[];
  myTasks: Task[];
  isLoadingAgents: boolean;
  isLoadingTasks: boolean;
  selectedAgent: Agent | null;
  selectedTask: Task | null;
  
  // Actions
  setAgents: (agents: Agent[]) => void;
  setTasks: (tasks: Task[]) => void;
  setMyTasks: (tasks: Task[]) => void;
  setLoadingAgents: (loading: boolean) => void;
  setLoadingTasks: (loading: boolean) => void;
  selectAgent: (agent: Agent | null) => void;
  selectTask: (task: Task | null) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  agents: [],
  tasks: [],
  myTasks: [],
  isLoadingAgents: false,
  isLoadingTasks: false,
  selectedAgent: null,
  selectedTask: null,
  
  setAgents: (agents) => set({ agents }),
  setTasks: (tasks) => set({ tasks }),
  setMyTasks: (myTasks) => set({ myTasks }),
  setLoadingAgents: (isLoadingAgents) => set({ isLoadingAgents }),
  setLoadingTasks: (isLoadingTasks) => set({ isLoadingTasks }),
  selectAgent: (selectedAgent) => set({ selectedAgent }),
  selectTask: (selectedTask) => set({ selectedTask }),
  
  addTask: (task) => set((state) => ({
    tasks: [task, ...state.tasks],
    myTasks: [task, ...state.myTasks],
  })),
  
  updateTask: (taskId, updates) => set((state) => ({
    tasks: state.tasks.map((t) =>
      t.id === taskId ? { ...t, ...updates } : t
    ),
    myTasks: state.myTasks.map((t) =>
      t.id === taskId ? { ...t, ...updates } : t
    ),
  })),
}));
