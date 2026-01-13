'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, CheckCircle2, AlertCircle, Clock, Calendar, ChevronRight, User, ArrowUpRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTasks } from '../Tasks/hooks/useTasks';
import { formatDateShort, getDaysSince, formatTime, getWeekLabel } from '@/utils/helpers';
import clsx from 'clsx';
import ActivityFeed from './components/ActivityFeed';
import { MOCK_USERS } from '@/data/mockUsers';
import { mockDB } from '@/lib/mockDatabase';

export default function Dashboard() {
    const router = useRouter();
    const {
        userProfile,
        activeGroupId,
        activeGroupName,
        groupMembers,
        tasks,
        setSelectedReportId,
        setSelectedTaskId,
        refreshUserData
    } = useApp();

    const [reports, setReports] = useState([]);
    const [isLoadingReports, setIsLoadingReports] = useState(true);

    const { fetchTasks, loading: loadingTasks } = useTasks();

    // Fetch reports locally to ensure freshness and populate views
    useEffect(() => {
        const fetchReportsData = async () => {
            if (!activeGroupId) return;
            setIsLoadingReports(true);
            try {
                // Fetch Reports
                const { data: reportsData } = await mockDB.select('reports', { eq: { group_id: activeGroupId } });

                // Fetch Views & Sections
                const { data: viewsData } = await mockDB.select('report_views');
                const { data: sectionsData } = await mockDB.select('report_sections');

                // Transform and Merge
                const transformedReports = (reportsData || []).map(r => {
                    const author = MOCK_USERS.find(u => u.id === r.author_id);
                    const contextSection = sectionsData?.find(s => s.report_id === r.id && s.key === 'context');

                    return {
                        ...r,
                        startDate: r.week_start,
                        endDate: r.week_end,
                        authorName: author?.full_name || 'Usuario',
                        createdAt: r.created_at,
                        submittedAt: r.submitted_at,
                        updatedAt: r.updated_at || r.created_at,
                        views: viewsData?.filter(v => v.report_id === r.id) || [],
                        preview: contextSection?.content || ''
                    };
                });

                setReports(transformedReports);
            } catch (error) {
                console.error("Failed to load reports:", error);
            } finally {
                setIsLoadingReports(false);
            }
        };

        fetchReportsData();
    }, [activeGroupId]);

    // Get supervisors for the active group
    const supervisors = groupMembers?.filter(m => m.group_id === activeGroupId && (m.role === 'supervisor' || m.role === 'admin')) || [];

    // Ensure data is fresh
    useEffect(() => {
        if (activeGroupId) {
            fetchTasks();
        }
    }, [activeGroupId, fetchTasks]);

    // Derived Stats
    // Derived Stats & Filtering
    const myActiveTasks = tasks.filter(t =>
        t.status !== 'done' &&
        (t.assignees?.some(a => a.user_id === userProfile?.id) || t.assignedTo === userProfile?.name)
    );

    const isSupervisor = userProfile?.system_role === 'admin' || groupMembers?.some(m => m.user_id === userProfile?.id && (m.role === 'supervisor' || m.role === 'labmanager'));

    // Reports I need to review (if supervisor)
    const reportsToReview = reports.filter(r =>
        r.status === 'submitted' &&
        r.author_id !== userProfile?.id && // Don't review own reports
        isSupervisor
    ).sort((a, b) => {
        // Prioritize items NOT reviewed by me
        const myViewA = a.views?.find(v => v.user_id === userProfile?.id);
        const myViewB = b.views?.find(v => v.user_id === userProfile?.id);
        const reviewedA = Boolean(myViewA?.seen_at || myViewA?.decision);
        const reviewedB = Boolean(myViewB?.seen_at || myViewB?.decision);

        if (reviewedA === reviewedB) {
            // If both reviewed or both pending, sort by date
            return new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt);
        }
        // Unreviewed (false) comes first
        return reviewedA ? 1 : -1;
    });

    // Recent Approved Reports (History) - limit to 2
    const recentApprovedReports = reports
        .filter(r => r.status === 'reviewed')
        .sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt))
        .slice(0, 2);



    // My Reports in Progress (Draft or Submitted) - specific for the author
    const myReports = reports.filter(r =>
        r.author_id === userProfile?.id &&
        (r.status === 'submitted' || r.status === 'draft')
    ).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    // Combine for display: My Active Reports -> Pending Reviews -> Approved History
    const displayReports = [
        ...myReports,
        ...reportsToReview,
        ...recentApprovedReports
    ].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);

    const approvedCount = reports.filter(r => r.status === 'reviewed').length;

    const getStatusColor = (status) => {
        switch (status) {
            case 'done': return 'bg-green-100 text-green-700 border-green-200';
            case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'todo': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-50 text-gray-500 border-gray-200';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'done': return 'Completada';
            case 'in_progress': return 'En Progreso';
            case 'todo': return 'Pendiente';
            default: return status;
        }
    };

    // Navigation Handlers
    const handleNavigateTasks = () => {
        router.push('/tasks');
    };

    const handleNavigateReport = (reportId) => {
        setSelectedReportId(reportId);
        router.push('/reports');
    };

    const handleNavigateTask = (taskId) => {
        setSelectedTaskId(taskId);
        router.push('/tasks');
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 animate-in fade-in duration-500">
            {/* Header */}
            <header className="px-8 py-6 bg-white border-b border-gray-200 shadow-sm flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <LayoutDashboard className="w-7 h-7 text-indigo-600" />
                        Dashboard
                    </h1>
                    <p className="text-slate-500 mt-1 pl-1">
                        Hola <span className="font-bold text-indigo-600">{userProfile?.name}</span>, aquí tienes el resumen de tu actividad.
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Grupo Activo</p>
                        <p className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full text-sm inline-block">{activeGroupName}</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Compact Stats Row */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="px-3 py-1.5 bg-white rounded-full border border-gray-200 text-slate-600 flex items-center gap-2 shadow-sm">
                            <AlertCircle className="w-4 h-4 text-indigo-500" />
                            <span className="font-medium">Mis Tareas:</span>
                            <span className="font-bold text-slate-800">{myActiveTasks.length}</span>
                        </div>
                        <div className="px-3 py-1.5 bg-white rounded-full border border-gray-200 text-slate-600 flex items-center gap-2 shadow-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="font-medium">Aprobados:</span>
                            <span className="font-bold text-slate-800">{approvedCount}</span>
                        </div>
                        <div className="px-3 py-1.5 bg-white rounded-full border border-gray-200 text-slate-600 flex items-center gap-2 shadow-sm">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span className="font-medium">{isSupervisor ? 'Por Revisar:' : 'En Revisión:'}</span>
                            <span className="font-bold text-slate-800">
                                {isSupervisor ? reportsToReview.length : reports.filter(r => r.status === 'submitted' && r.author_id === userProfile?.id).length}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Top Row: Tasks & Reports */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Column 1: Active Tasks */}
                            <div className="h-full">

                                {/* Active Tasks Section */}
                                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[450px]">
                                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-indigo-600" /> Mis Tareas Activas
                                        </h3>
                                        <button
                                            onClick={handleNavigateTasks}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
                                        >
                                            Ver Todas <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                        {myActiveTasks.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic">
                                                <CheckCircle2 className="w-12 h-12 text-slate-200 mb-2" />
                                                <p>¡Todo al día! No tienes tareas asignadas.</p>
                                            </div>
                                        ) : (
                                            <table className="w-full text-left border-collapse">
                                                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                                    <tr className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-gray-100">
                                                        <th className="px-6 py-3">Tarea</th>
                                                        <th className="px-6 py-3">Prioridad</th>
                                                        <th className="px-6 py-3 hidden sm:table-cell">Vencimiento</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {myActiveTasks.map(task => (
                                                        <tr
                                                            key={task.id}
                                                            onClick={() => handleNavigateTask(task.id)}
                                                            className="group hover:bg-slate-50/80 cursor-pointer transition-colors"
                                                        >
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-slate-700 text-sm group-hover:text-indigo-700 transition-colors line-clamp-1">{task.title}</span>
                                                                    <span className="text-[10px] text-slate-400">Asignado por {task.assignedBy}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className={clsx("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase border",
                                                                    task.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                        task.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                            'bg-blue-50 text-blue-600 border-blue-100')}>
                                                                    <div className={clsx("w-1.5 h-1.5 rounded-full",
                                                                        task.priority === 'high' ? 'bg-red-500' :
                                                                            task.priority === 'medium' ? 'bg-amber-500' :
                                                                                'bg-blue-500')} />
                                                                    {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 hidden sm:table-cell">
                                                                <span className={clsx("text-xs flex items-center gap-1", !task.dueDate ? 'text-slate-300' : 'text-slate-500')}>
                                                                    <Calendar className="w-3 h-3" />
                                                                    {task.dueDate ? formatDateShort(task.dueDate) : '--'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </section>



                            </div>

                            {/* Right Column: Reports History */}
                            <div className="space-y-8">
                                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[800px]">
                                    <div className="p-6 border-b border-gray-100 bg-slate-50/50">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-indigo-600" /> Historial de Reportes
                                        </h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30">
                                        {/* DEBUG BLOCK - REMOVE LATER */}


                                        {displayReports.length === 0 && (
                                            <div className="text-center py-10 text-slate-400 text-sm italic px-6">
                                                No hay reportes pendientes ni recientes.
                                            </div>
                                        )}
                                        {displayReports.map(report => (
                                            <div
                                                key={report.id}
                                                onClick={() => handleNavigateReport(report.id)}
                                                className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group relative overflow-hidden"
                                            >
                                                {report.status === 'reviewed' && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-green-50 to-transparent corner-decoration pointer-events-none" />}

                                                <div className="flex justify-between items-start mb-3 relative z-10">
                                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase tracking-wide">
                                                        {getWeekLabel(report.startDate, report.endDate)}
                                                    </span>
                                                    {(() => {
                                                        // Status Badges (Existing Logic)
                                                        if (report.status === 'reviewed') {
                                                            return (
                                                                <span className="flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full border border-green-200 uppercase">
                                                                    <CheckCircle2 className="w-3 h-3" /> Aprobado Globalmente
                                                                </span>
                                                            );
                                                        }

                                                        // Check personal review status (for Viewer/Supervisor)
                                                        const myView = report.views?.find(v => v.user_id === userProfile?.id);
                                                        const meReviewed = Boolean(myView?.seen_at || myView?.decision);

                                                        if (meReviewed && report.author_id !== userProfile?.id) {
                                                            return (
                                                                <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full border border-blue-200 uppercase">
                                                                    <CheckCircle2 className="w-3 h-3" /> Revisado por mí
                                                                </span>
                                                            );
                                                        }

                                                        // Default: Pending my review (if I am supervisor/target)
                                                        if (isSupervisor && report.author_id !== userProfile?.id) {
                                                            return (
                                                                <span className="flex items-center gap-1 text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full border border-orange-200 uppercase">
                                                                    <Clock className="w-3 h-3" /> Pendiente de mi revisión
                                                                </span>
                                                            );
                                                        }

                                                        return (
                                                            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-full uppercase border border-gray-200">
                                                                {report.status === 'submitted' ? 'En Revisión' : 'Borrador'}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>

                                                <div className="space-y-3 relative z-10">
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-indigo-600 transition-colors">
                                                            Reporte <span className="font-normal text-slate-500">({getWeekLabel(report.startDate, report.endDate)})</span>
                                                        </h4>
                                                        <p className="text-xs text-slate-500">
                                                            Por <span className="font-medium text-slate-700">{report.authorName}</span>
                                                        </p>
                                                        {report.preview && (
                                                            <p className="text-[10px] text-slate-400 mt-2 line-clamp-1 italic">
                                                                {report.preview.substring(0, 30)}{report.preview.length > 30 ? '...' : ''}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Author's Detailed Status View */}
                                                    {report.author_id === userProfile?.id && report.status === 'submitted' && (
                                                        <div className="mt-2 text-[10px] bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                                                            {(() => {
                                                                const supervisors = groupMembers?.filter(m => (m.role === 'supervisor' || m.role === 'labmanager') && m.id !== report.author_id) || [];
                                                                const views = report.views || [];

                                                                // Reviews with decisions
                                                                const reviews = views.filter(v => v.decision).map(v => {
                                                                    const member = groupMembers?.find(m => m.id === v.user_id);
                                                                    return {
                                                                        ...v,
                                                                        name: member?.full_name || member?.name || 'Supervisor'
                                                                    };
                                                                });

                                                                // Pending supervisors
                                                                const pending = supervisors.filter(s => !reviews.some(r => r.user_id === s.id));

                                                                return (
                                                                    <>
                                                                        {reviews.map(r => (
                                                                            <div key={r.user_id} className="flex items-center gap-1.5 text-emerald-600">
                                                                                <CheckCircle2 className="w-3 h-3" />
                                                                                <span>Revisado por <b>{r.name}</b> ({formatDateShort(r.seen_at)} {formatTime(r.seen_at)})</span>
                                                                            </div>
                                                                        ))}
                                                                        {pending.map(p => (
                                                                            <div key={p.id} className="flex items-center gap-1.5 text-orange-500">
                                                                                <Clock className="w-3 h-3" />
                                                                                <span>Pendiente: <b>{p.full_name || p.name}</b></span>
                                                                            </div>
                                                                        ))}
                                                                        {reviews.length === 0 && pending.length === 0 && (
                                                                            <span className="text-slate-400 italic">Esperando asignación de revisores...</span>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-slate-400">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {(() => {
                                                            const isValid = (d) => d && !isNaN(new Date(d).getTime());
                                                            if (isValid(report.createdAt)) return formatDateShort(report.createdAt);
                                                            if (isValid(report.submittedAt)) return formatDateShort(report.submittedAt);
                                                            if (isValid(report.startDate)) return formatDateShort(report.startDate);
                                                            return 'Fecha desconocida';
                                                        })()}
                                                    </div>
                                                    <span className="text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                        Ver <ArrowUpRight className="w-3 h-3" />
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* Activity Feed (Bottom Row) */}
                        <div className="mt-8">
                            <ActivityFeed />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
