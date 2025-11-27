
import React, { useEffect, useState } from 'react';
import { Task, TaskStatus, CalendarEvent } from '../types';
import { CheckCircle2, Circle, Clock, Calendar, AlertCircle, Briefcase } from 'lucide-react';

interface Props {
  tasks: Task[];
  events: CalendarEvent[];
}

const ManagementDashboard: React.FC<Props> = ({ tasks, events }) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED: return 'text-green-500';
      case TaskStatus.IN_PROGRESS: return 'text-sci-cyan';
      case TaskStatus.BLOCKED: return 'text-red-500';
      default: return 'text-slate-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500 text-white animate-pulse';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-black';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
       <div className="flex items-center gap-2 mb-2 text-indigo-400 border-b border-slate-800 pb-2">
          <Briefcase size={16} />
          <h2 className="font-display font-bold tracking-widest text-xs">MANAGEMENT CONSOLE</h2>
       </div>

       <div className="flex-1 overflow-y-auto space-y-6">
          
          {/* Calendar Section */}
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mb-2 tracking-wider">
                <Calendar size={12} /> UPCOMING SCHEDULE
            </div>
            {events.length === 0 ? (
                <div className="text-xs text-slate-600 italic pl-4">No events scheduled.</div>
            ) : (
                <div className="space-y-2">
                    {events.map(event => (
                        <div key={event.id} className="flex items-center gap-3 bg-slate-800/30 p-2 rounded border border-slate-800/50">
                            <div className="flex flex-col items-center justify-center w-10 h-10 bg-slate-900 rounded text-[10px] font-mono border border-slate-700">
                                <span className="text-sci-cyan">{new Date(event.startTime).getDate()}</span>
                                <span className="text-slate-500">{new Date(event.startTime).toLocaleString('default', { month: 'short' })}</span>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-white">{event.title}</div>
                                <div className="text-[10px] text-slate-400">{new Date(event.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {event.type}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>

          {/* Tasks Section */}
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mb-2 tracking-wider">
                <CheckCircle2 size={12} /> ACTIVE TASKS
            </div>
            {tasks.length === 0 ? (
                <div className="text-xs text-slate-600 italic pl-4">Task queue empty.</div>
            ) : (
                <div className="space-y-2">
                    {tasks.map(task => (
                        <div key={task.id} className={`border-l-2 pl-3 py-2 relative group transition-all ${task.status === TaskStatus.COMPLETED ? 'opacity-50 border-green-500' : 'border-indigo-500 bg-indigo-900/10'}`}>
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-xs font-bold ${task.status === TaskStatus.COMPLETED ? 'line-through text-slate-500' : 'text-white'}`}>
                                    {task.title}
                                </span>
                                <span className={`text-[8px] px-1 rounded font-bold uppercase ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                </span>
                            </div>
                            {task.description && (
                                <div className="text-[10px] text-slate-400 mb-1 truncate">{task.description}</div>
                            )}
                            <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className={`flex items-center gap-1 ${getStatusColor(task.status)}`}>
                                    {task.status === TaskStatus.COMPLETED ? <CheckCircle2 size={10} /> : <Circle size={10} />}
                                    {task.status}
                                </span>
                                {task.deadline && (
                                    <span className="flex items-center gap-1 text-slate-500">
                                        <Clock size={10} />
                                        {new Date(task.deadline).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
       </div>
    </div>
  );
};

export default ManagementDashboard;
