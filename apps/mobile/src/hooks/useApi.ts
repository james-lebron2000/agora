import { useEffect, useState, useCallback } from 'react';
import { agentApi, taskApi } from '../services/api';
import { useAppStore } from '../store/appStore';
import type { Agent, Task } from '../types/navigation';

export function useAgents() {
  const { agents, isLoadingAgents, setAgents, setLoadingAgents } = useAppStore();
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoadingAgents(true);
    setError(null);
    try {
      const data = await agentApi.getAgents();
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
    } finally {
      setLoadingAgents(false);
    }
  }, [setAgents, setLoadingAgents]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const getAgentById = useCallback(async (id: string): Promise<Agent | null> => {
    try {
      return await agentApi.getAgentById(id);
    } catch (err) {
      console.error('Failed to fetch agent:', err);
      return null;
    }
  }, []);

  const getAgentsByTag = useCallback(async (tag: string): Promise<Agent[]> => {
    try {
      return await agentApi.getAgentsByTag(tag);
    } catch (err) {
      console.error('Failed to fetch agents by tag:', err);
      return [];
    }
  }, []);

  return {
    agents,
    isLoading: isLoadingAgents,
    error,
    refresh: fetchAgents,
    getAgentById,
    getAgentsByTag,
  };
}

export function useTasks() {
  const { tasks, myTasks, isLoadingTasks, setTasks, setMyTasks, setLoadingTasks, addTask, updateTask } = useAppStore();
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    setError(null);
    try {
      const data = await taskApi.getTasks();
      setTasks(data);
      // Filter my tasks based on creator
      setMyTasks(data.filter((t) => t.creator.id === 'user-1'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoadingTasks(false);
    }
  }, [setTasks, setMyTasks, setLoadingTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(async (taskData: Partial<Task>): Promise<Task | null> => {
    try {
      const newTask = await taskApi.createTask(taskData);
      addTask(newTask);
      return newTask;
    } catch (err) {
      console.error('Failed to create task:', err);
      return null;
    }
  }, [addTask]);

  const acceptTask = useCallback(async (taskId: string, agentId: string): Promise<boolean> => {
    try {
      const updated = await taskApi.acceptTask(taskId, agentId);
      updateTask(taskId, updated);
      return true;
    } catch (err) {
      console.error('Failed to accept task:', err);
      return false;
    }
  }, [updateTask]);

  const completeTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const updated = await taskApi.completeTask(taskId);
      updateTask(taskId, updated);
      return true;
    } catch (err) {
      console.error('Failed to complete task:', err);
      return false;
    }
  }, [updateTask]);

  return {
    tasks,
    myTasks,
    isLoading: isLoadingTasks,
    error,
    refresh: fetchTasks,
    createTask,
    acceptTask,
    completeTask,
  };
}
