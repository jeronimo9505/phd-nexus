'use client';

import React, { useState } from 'react';
import {
    CheckSquare, Plus, Clock, Trash2, CheckCircle2, X, Send,
    ArrowUpDown, Filter, Search, UserCircle, AlignLeft, Calendar, FileText, ChevronDown
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTasks } from './hooks/useTasks';
import { formatDateShort, formatDateLong, getDaysSince, getWeekLabel } from '@/utils/helpers';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function Tasks() {
    const {
        reports, setActiveModule, setSelectedReportId,
        userRole, userProfile, addActivity, currentUser,
        activeGroupId, activeGroup, refreshUserData, groupMembers,
        selectedTaskId, setSelectedTaskId
    } = useApp();

    React.useEffect(() => {
        refreshUserData();
    }, []);


    const { tasks, createTask, updateTask, deleteTask, addComment: addTaskComment } = useTasks();

    const [currentComment, setCurrentComment] = useState('');
    const [sortCriteria, setSortCriteria] = useState('newest');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPriority, setFilterPriority] = useState('all');
    const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);

    const selectedTask = tasks.find(t => t.id === selectedTaskId);

    const potentialAssignees = React.useMemo(() => {
        const members = groupMembers || [];
        if (currentUser && !members.find(m => m.id === currentUser.id)) {
            return [...members, { ...currentUser, name: currentUser.full_name || currentUser.name }];
        }
        return members;
    }, [groupMembers, currentUser]);

    const handleAddTask = async () => {
        const { data: createdTask, error } = await createTask({
            title: 'Nueva Tarea (Borrador)',
            description: '',
            status: 'todo',
            priority: 'medium'
        });

        if (error) {
            alert(`Error al crear la tarea: ${error}`);
            console.error(error);
            return;
        }

        if (createdTask) {
            setSelectedTaskId(createdTask.id);
            addActivity({
                type: 'task',
                content: 'ha creado una nueva tarea',
                author: currentUser.name,
                link: { module: 'tasks', id: createdTask.id, label: 'Nueva Tarea' }
            });
        }
    };

    const getSourceReportLabel = (reportId) => {
        if (!reportId) return null;
        // Search in reports context first
        const report = reports.find(r => r.id === reportId);
        if (report) {
            return `Reporte ${getWeekLabel(report.startDate, report.endDate)}`;
        }
        // If not in context (maybe legacy or deleted), format the ID partially
        return `Reporte (ref: ${reportId.substr(0, 8)}...)`;
    };

    const handleNavigateToReport = (e, reportId) => {
        e.stopPropagation();
        setSelectedReportId(reportId);
        setActiveModule('reports');
    };

    const handleTaskUpdate = async (taskId, field, value) => {
        // Database Update
        const updates = { [field]: value };

        if (field === 'status') {
            if (value === 'done') {
                updates.completed_at = new Date().toISOString();
                updates.completed_by = currentUser?.id;
            } else {
                updates.completed_at = null;
                updates.completed_by = null;
            }
        }

        await updateTask(taskId, updates);

        if (field === 'status' && value === 'done') {
            const task = tasks.find(t => t.id === taskId);
            addActivity({
                type: 'task',
                content: `ha completado la tarea "${task?.title}"`,
                author: currentUser?.name || 'Usuario',
                link: { module: 'tasks', id: taskId, label: `Tarea: ${task?.title}` }
            });
        }
    };

    const handleTaskDelete = async (taskId) => {
        if (selectedTaskId === taskId) setSelectedTaskId(null);
        await deleteTask(taskId);
    };

    const handleAddTaskComment = async (taskId, text) => {
        await addTaskComment(taskId, text);
    };

    const getSortedTasks = (taskList) => {
        let sorted = [...taskList];

        // Filter
        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            sorted = sorted.filter(t => t.title.toLowerCase().includes(lowerQ) || (t.description && t.description.toLowerCase().includes(lowerQ)));
        }
        if (filterPriority !== 'all') {
            sorted = sorted.filter(t => t.priority === filterPriority);
        }

        // Sort
        return sorted.sort((a, b) => {
            if (sortCriteria === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
            if (sortCriteria === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
            if (sortCriteria === 'priority') {
                const map = { high: 3, medium: 2, low: 1 };
                return map[b.priority] - map[a.priority];
            }
            if (sortCriteria === 'dueDate') {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            return 0;
        });
    };

    const sortedAllTasks = getSortedTasks(tasks.filter(t => t.groupId === activeGroupId));
    const activeTasks = sortedAllTasks.filter(t => t.status !== 'done');
    const completedTasks = sortedAllTasks.filter(t => t.status === 'done');

    return (
        <div className="flex h-full animate-in fade-in duration-300">
            <div className={clsx("flex-1 flex flex-col h-full border-r border-gray-200 bg-white transition-all duration-300", selectedTaskId ? 'w-2/3' : 'w-full')}>
                <header className="p-6 border-b border-gray-200 bg-slate-50 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-3"><CheckSquare className="w-6 h-6 text-indigo-600" /> Gestor de Tareas Global</h2></div>
                        <button onClick={handleAddTask} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"><Plus className="w-4 h-4" /> Nueva Tarea</button>
                    </div>

                    {/* Filters Bar */}
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm flex-1 max-w-sm">
                            <Search className="w-3.5 h-3.5 text-slate-400" />
                            <input className="bg-transparent border-none outline-none w-full text-slate-600" placeholder="Buscar tarea..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                            <select value={sortCriteria} onChange={(e) => setSortCriteria(e.target.value)} className="bg-transparent outline-none text-slate-600 font-medium cursor-pointer">
                                <option value="newest">Recientes</option>
                                <option value="oldest">Antiguas</option>
                                <option value="priority">Prioridad</option>
                                <option value="dueDate">Fecha Límite</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="bg-transparent outline-none text-slate-600 font-medium cursor-pointer">
                                <option value="all">Todas Prioridades</option>
                                <option value="high">Alta</option>
                                <option value="medium">Media</option>
                                <option value="low">Baja</option>
                            </select>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                    <div className="space-y-3 max-w-4xl mx-auto">
                        {activeTasks.length === 0 && (
                            <div className="text-center py-10 text-slate-400">
                                <p>No se encontraron tareas pendientes.</p>
                            </div>
                        )}
                        {activeTasks.map(task => (
                            <div
                                key={task.id}
                                onClick={() => setSelectedTaskId(task.id)}
                                className={clsx(
                                    "group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer relative",
                                    selectedTaskId === task.id ? 'border-indigo-400 ring-1 ring-indigo-400 bg-white shadow-md' : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                                )}
                            >
                                <button onClick={(e) => { e.stopPropagation(); handleTaskUpdate(task.id, 'status', 'done'); }} className="mt-1 w-6 h-6 shrink-0 rounded-full border-2 border-gray-300 bg-white hover:border-emerald-400 flex items-center justify-center transition-colors"></button>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <input className="w-full font-semibold text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-indigo-200 placeholder:text-slate-400 text-base" value={task.title} onClick={(e) => e.stopPropagation()} onChange={(e) => handleTaskUpdate(task.id, 'title', e.target.value)} placeholder="Nombre de la tarea..." />
                                        <div className="flex flex-col items-end gap-1">
                                            {task.assignedBy && (
                                                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap ml-2">
                                                    por {task.assignedBy}
                                                </span>
                                            )}
                                            {task.assignees && task.assignees.length > 0 ? (
                                                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap ml-2 border border-indigo-100 flex items-center gap-1">
                                                    <UserCircle className="w-3 h-3" />
                                                    {task.assignees.map(a => {
                                                        const u = potentialAssignees.find(user => user.id === a.user_id);
                                                        return u?.full_name || u?.name || 'Usuario';
                                                    }).join(', ')}
                                                </span>
                                            ) : task.assignedTo && task.assignedTo !== task.assignedBy && (
                                                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap ml-2 border border-indigo-100 flex items-center gap-1">
                                                    <UserCircle className="w-3 h-3" /> {task.assignedTo}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {task.description && <p className="text-xs text-slate-500 line-clamp-1 mt-1">{task.description}</p>}

                                    <div className="flex items-center gap-4 mt-2">
                                        <span className={clsx("text-[10px] px-2 py-0.5 rounded font-bold uppercase", task.priority === 'high' ? 'bg-red-50 text-red-600' : task.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600')}>{task.priority}</span>
                                        <div className="flex items-center gap-1 text-xs text-slate-500"><Clock className="w-3 h-3" /> {task.dueDate ? formatDateShort(task.dueDate) : 'Sin fecha'}</div>
                                        <div className="text-[10px] text-slate-400">Hace {getDaysSince(task.createdAt)} días</div>
                                        {task.sourceReportId && (
                                            <button
                                                onClick={(e) => handleNavigateToReport(e, task.sourceReportId)}
                                                className="flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-300 transition-colors z-10"
                                            >
                                                <FileText className="w-3 h-3" /> {getSourceReportLabel(task.sourceReportId)}
                                            </button>
                                        )}
                                        {task.comments && task.comments.length > 0 && <div className="flex items-center gap-1 text-xs text-indigo-500"><div className="w-1 h-1 rounded-full bg-indigo-500" /> {task.comments.length} comentarios</div>}
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); if (window.confirm('¿Estás seguro de que quieres eliminar esta tarea?')) handleTaskDelete(task.id); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}

                        {completedTasks.length > 0 && (
                            <div className="mt-8 border-t border-gray-200 pt-6">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Completadas ({completedTasks.length})</h4>
                                <div className="space-y-2 opacity-70">
                                    {completedTasks.map(task => (
                                        <div key={task.id} onClick={() => setSelectedTaskId(task.id)} className={clsx("flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white cursor-pointer hover:border-indigo-300 transition-colors", selectedTaskId === task.id ? 'ring-1 ring-indigo-300' : '')}>
                                            <button onClick={(e) => { e.stopPropagation(); handleTaskUpdate(task.id, 'status', 'pending'); }} className="w-5 h-5 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                                            <div className="flex-1 overflow-hidden">
                                                <span className="text-sm text-slate-500 line-through truncate block">{task.title}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-400">Finalizada el {task.completedAt ? formatDateLong(task.completedAt) : 'Fecha desconocida'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Task Details Sidebar */}
            <AnimatePresence>
                {selectedTaskId && selectedTask && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-[400px] border-l border-gray-200 bg-white flex flex-col h-full shadow-xl z-20"
                    >
                        <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-slate-50">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detalles de Tarea</span>
                                <input className={clsx("w-full font-bold text-slate-800 text-lg mt-1 bg-transparent border-none outline-none focus:ring-0", selectedTask.status === 'done' && "line-through text-slate-400")} value={selectedTask.title} onChange={(e) => handleTaskUpdate(selectedTask.id, 'title', e.target.value)} placeholder="Nombre de la tarea..." />
                            </div>
                            <button onClick={() => setSelectedTaskId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-5 space-y-4 border-b border-gray-200 overflow-y-auto shrink-0 max-h-[50%] custom-scrollbar">
                                {/* Description and Metadata */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><AlignLeft className="w-3 h-3" /> Descripción</label>
                                    <textarea
                                        className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none min-h-[80px] resize-none focus:border-indigo-300"
                                        placeholder="Añadir descripción..."
                                        value={selectedTask.description || ''}
                                        onChange={(e) => handleTaskUpdate(selectedTask.id, 'description', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><UserCircle className="w-3 h-3" /> Asignado a</label>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen); }}
                                        className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-left hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex flex-wrap gap-1 flex-1">
                                            {(!selectedTask.assignees || selectedTask.assignees.length === 0) ? (
                                                selectedTask.assignedTo ? (
                                                    <span className="text-slate-700 font-medium">{selectedTask.assignedTo}</span>
                                                ) : (
                                                    <span className="text-slate-400">Seleccionar responsables...</span>
                                                )
                                            ) : (
                                                potentialAssignees.filter(m => selectedTask.assignees.some(a => a.user_id === m.id)).map(m => (
                                                    <span key={m.id} className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-indigo-600 font-medium shadow-sm">
                                                        {m.name || m.full_name}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                    </button>

                                    {isAssigneeDropdownOpen && (
                                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                                            {potentialAssignees.map((member) => {
                                                const isAssigned = selectedTask.assignees?.some(a => a.user_id === member.id)
                                                    // Fallback/Legacy
                                                    || (!selectedTask.assignees && (selectedTask.assignedTo === member.name || selectedTask.assignedBy === member.name && member.name === currentUser?.name));

                                                return (
                                                    <label key={member.id || member.name} className="flex items-center gap-2 p-2 hover:bg-indigo-50 rounded-md cursor-pointer transition-colors">
                                                        <div className={clsx("w-4 h-4 rounded border flex items-center justify-center transition-colors", isAssigned ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white")}>
                                                            {isAssigned && <CheckSquare className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            className="hidden"
                                                            checked={!!isAssigned}
                                                            onChange={(e) => {
                                                                const currentIds = selectedTask.assignees?.map(a => a.user_id) || [];
                                                                let newIds;
                                                                if (e.target.checked) {
                                                                    newIds = [...currentIds, member.id];
                                                                } else {
                                                                    newIds = currentIds.filter(id => id !== member.id);
                                                                }
                                                                handleTaskUpdate(selectedTask.id, 'assignees', newIds);
                                                            }}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="text-xs font-semibold text-slate-700">{member.full_name || member.name}</div>
                                                            <div className="text-[10px] text-slate-400 capitalize">{member.role}</div>
                                                        </div>
                                                        {member.id === currentUser?.id && <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">(Tú)</span>}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-xs font-bold text-slate-500 block">Prioridad</span>
                                        <select value={selectedTask.priority} onChange={(e) => handleTaskUpdate(selectedTask.id, 'priority', e.target.value)} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 outline-none">
                                            <option value="low">Baja</option>
                                            <option value="medium">Media</option>
                                            <option value="high">Alta</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-bold text-slate-500 block">Fecha Límite</span>
                                        <input type="date" value={selectedTask.dueDate || ''} onChange={(e) => handleTaskUpdate(selectedTask.id, 'dueDate', e.target.value)} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 outline-none text-slate-600" />
                                    </div>
                                </div>

                                {/* Metadata */}
                                <div className="bg-indigo-50/50 rounded-lg p-3 space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Creada por</span>
                                        <span className="font-medium text-indigo-700">{selectedTask.assignedBy || 'Sistema'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Fecha creación</span>
                                        <span className="text-slate-700">{selectedTask.createdAt && !isNaN(new Date(selectedTask.createdAt)) ? formatDateLong(selectedTask.createdAt) : 'Reciente'}</span>
                                    </div>
                                    {selectedTask.sourceReportId && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500">Origen</span>
                                            <button
                                                onClick={(e) => handleNavigateToReport(e, selectedTask.sourceReportId)}
                                                className="text-indigo-600 font-medium flex items-center gap-1 hover:underline text-right"
                                            >
                                                <FileText className="w-3 h-3" /> {getSourceReportLabel(selectedTask.sourceReportId)}
                                            </button>
                                        </div>
                                    )}
                                    {selectedTask.status === 'done' && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-emerald-600 font-bold">Completada</span>
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Comments Header & Input (Moved Up) */}
                            <div className="p-3 bg-slate-50 border-b border-gray-200">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-2">Comentarios</label>
                                <div className="relative flex items-center gap-2">
                                    <input className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="Escribe un comentario..." value={currentComment} onChange={(e) => setCurrentComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
                                    <button onClick={() => { if (currentComment.trim()) { handleAddTaskComment(selectedTask.id, currentComment); setCurrentComment(''); } }} className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors shadow-sm">
                                        <Send className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Comments List (Bottom, Growing Downwards) */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30">
                                {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                                    <div className="text-center text-xs text-slate-400 italic mt-4">No hay comentarios aún.</div>
                                )}
                                {[...selectedTask.comments].reverse().map(c => (
                                    <div key={c.id} className={clsx("flex flex-col gap-1 animate-in fade-in slide-in-from-top-1", c.author === userProfile?.name ? 'items-end' : 'items-start')}>
                                        <div className="flex items-center gap-2 px-1">
                                            <span className="text-[10px] font-bold text-slate-600">{c.author}</span>
                                            <span className="text-[9px] text-slate-400">{formatDateShort(c.date)}</span>
                                        </div>
                                        <div className={clsx("p-3 rounded-lg text-xs max-w-[85%] shadow-sm", c.author === userProfile?.name ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-slate-700 rounded-tl-none')}>
                                            {c.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
