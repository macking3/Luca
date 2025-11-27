
import { Task, TaskStatus, TaskPriority, CalendarEvent } from '../types';

const TASK_STORAGE_KEY = 'LUCA_TASK_DB_V1';
const CALENDAR_STORAGE_KEY = 'LUCA_CALENDAR_DB_V1';

export const taskService = {
  // --- TASK MANAGEMENT ---

  getTasks(): Task[] {
    try {
      const stored = localStorage.getItem(TASK_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  addTask(title: string, priority: TaskPriority, description?: string, deadline?: number): Task {
    const tasks = this.getTasks();
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      description,
      priority,
      status: TaskStatus.PENDING,
      createdAt: Date.now(),
      deadline
    };
    tasks.push(newTask);
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
    return newTask;
  },

  updateTaskStatus(taskId: string, status: TaskStatus): Task | null {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId || t.title.toLowerCase().includes(taskId.toLowerCase()));
    
    if (index !== -1) {
      tasks[index].status = status;
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
      return tasks[index];
    }
    return null;
  },

  // --- CALENDAR MANAGEMENT ---

  getEvents(): CalendarEvent[] {
    try {
      const stored = localStorage.getItem(CALENDAR_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  addEvent(title: string, startTime: number, durationHours: number, type: CalendarEvent['type']): CalendarEvent {
    const events = this.getEvents();
    const newEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      title,
      startTime,
      endTime: startTime + (durationHours * 3600000),
      type
    };
    events.push(newEvent);
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(events));
    return newEvent;
  },

  // --- CONTEXT FOR AI ---

  getManagementContext(): string {
    const tasks = this.getTasks().filter(t => t.status !== TaskStatus.COMPLETED);
    const events = this.getEvents().filter(e => e.startTime > Date.now());

    let context = "CURRENT TASK QUEUE:\n";
    if (tasks.length === 0) context += "(Empty)\n";
    else context += tasks.map(t => `[${t.priority}] ${t.title} (${t.status})`).join('\n') + "\n";

    context += "\nUPCOMING SCHEDULE:\n";
    if (events.length === 0) context += "(No events)\n";
    else context += events.map(e => `${new Date(e.startTime).toLocaleString()}: ${e.title}`).join('\n');

    return context;
  }
};
