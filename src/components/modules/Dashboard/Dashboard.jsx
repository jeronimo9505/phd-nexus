'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, CheckCircle2, AlertCircle, Clock, Calendar, ChevronRight, User, ArrowUpRight, Users, FileText, Activity } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatDateShort, getDaysSince, formatTime, getWeekLabel } from '@/utils/helpers';
import clsx from 'clsx';
import ActivityFeed from './components/ActivityFeed';

export default function Dashboard() {
    const router = useRouter();
    const {
        currentUser,
        activeGroup,
        groupMembers,
        tasks,
        reports,
        setSelectedReportId,
        setSelectedTaskId,
        setActiveModule
    } = useApp();

    // Derived Stats
    const myActiveTasks = tasks?.filter(t => 
        t.status !== 'done' && 
        (t.assigned_to === currentUser?.email || t.created_by === currentUser?.id)
    ) || [];

    const pendingReports = reports?.filter(r => r.status === 'pending' || r.status === 'submitted').length || 0;
    
    // Quick navigation helpers
    const navigateTo = (path, module) => {
        if (module) setActiveModule(module);
        router.push(path);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <LayoutDashboard className="w-6 h-6 text-indigo-600" />
                        Panel de Control
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Resumen de actividad para <span className="font-semibold text-indigo-600">{activeGroup?.name || '...'}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium text-slate-600">Sistema Operativo</span>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    label="Miembros Activos"
                    value={groupMembers?.length || 0}
                    icon={<Users className="w-5 h-5 text-blue-600" />}
                    color="bg-blue-50 border-blue-100"
                    trend="+1 esta semana" 
                />
                <StatCard 
                    label="Tareas Pendientes"
                    value={myActiveTasks.length}
                    icon={<CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                    color="bg-indigo-50 border-indigo-100"
                    action={() => navigateTo('/tasks', 'tasks')}
                />
                <StatCard 
                    label="Reportes Totales"
                    value={reports?.length || 0}
                    icon={<FileText className="w-5 h-5 text-amber-600" />}
                    color="bg-amber-50 border-amber-100"
                    action={() => navigateTo('/reports', 'reports')}
                />
                <StatCard 
                    label="Estado General"
                    value="98%"
                    subtext="Eficiencia"
                    icon={<Activity className="w-5 h-5 text-emerald-600" />}
                    color="bg-emerald-50 border-emerald-100"
                />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Activity & Tasks */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Activity Feed */}
                    <ActivityFeed />

                    {/* My Tasks Preview */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-slate-500" />
                                Mis Tareas Prioritarias
                            </h3>
                            <button 
                                onClick={() => navigateTo('/tasks', 'tasks')}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                                Ver Todo <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {myActiveTasks.slice(0, 3).map(task => (
                                <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                        <span className="text-sm font-medium text-slate-700">{task.title}</span>
                                    </div>
                                    <span className="text-xs text-slate-500 uppercase font-bold">{task.status}</span>
                                </div>
                            ))}
                            {myActiveTasks.length === 0 && (
                                <div className="text-center text-slate-400 py-6 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    No tienes tareas pendientes activas.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Info & Context */}
                <div className="space-y-6">
                    <div className="bg-indigo-900 rounded-xl p-6 text-white shadow-lg overflow-hidden relative group">
                        <div className="relative z-10">
                            <h3 className="font-bold text-lg mb-2">Bienvenido, {currentUser?.user_metadata?.full_name?.split(' ')[0]}</h3>
                            <p className="text-indigo-200 text-sm mb-4">
                                Tienes {myActiveTasks.length} tareas pendientes y {pendingReports} reportes esta semana.
                            </p>
                            <button 
                                onClick={() => navigateTo('/reports', 'reports')}
                                className="bg-white text-indigo-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors shadow-md"
                            >
                                Crear Nuevo Reporte
                            </button>
                        </div>
                        {/* Decorative circles */}
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-800 rounded-full opacity-50 group-hover:scale-110 transition-transform" />
                        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-indigo-800 rounded-full opacity-30 group-hover:scale-110 transition-transform" />
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            Tu Perfil
                        </h3>
                        <div className="space-y-3">
                             <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                <span className="text-slate-500">Rol</span>
                                <span className="font-medium text-slate-900 capitalize">{activeGroup?.userRole || 'Miembro'} ({currentUser?.user_metadata?.system_role || 'user'})</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                <span className="text-slate-500">Email</span>
                                <span className="font-medium text-slate-900 truncate max-w-[150px]">{currentUser?.email}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Grupo</span>
                                <span className="font-medium text-slate-900 truncate max-w-[150px]">{activeGroup?.code}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, subtext, color, trend, action }) {
    return (
        <div 
            onClick={action}
            className={`bg-white p-5 rounded-xl shadow-sm border ${color || 'border-slate-100'} hover:shadow-md transition-all cursor-pointer group`}
        >
            <div className="flex items-start justify-between mb-2">
                <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">{label}</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1 group-hover:text-indigo-600 transition-colors">{value}</h3>
                </div>
                <div className={`p-2 rounded-lg ${color?.split(' ')[0] || 'bg-slate-50'}`}>
                    {icon}
                </div>
            </div>
            {(subtext || trend) && (
                <div className="flex items-center gap-2 mt-2">
                    {trend ? (
                        <span className="text-xs font-bold text-emerald-600 flex items-center bg-emerald-50 px-1.5 py-0.5 rounded">
                            <ArrowUpRight className="w-3 h-3" /> {trend}
                        </span>
                    ) : (
                        <span className="text-xs text-slate-400">{subtext}</span>
                    )}
                </div>
            )}
        </div>
    );
}
