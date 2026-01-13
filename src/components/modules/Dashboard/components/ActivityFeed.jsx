import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { History, MessageSquare, CheckSquare, FileText, CheckCircle2, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatDateShort, getDaysSince, formatTime, getWeekLabel } from '@/utils/helpers';
import { mockDB } from '@/lib/mockDatabase';
import { MOCK_USERS } from '@/data/mockUsers';
import clsx from 'clsx';

export default function ActivityFeed() {
    const router = useRouter();
    const { setActiveModule, setSelectedReportId, setSelectedTaskId, activeGroupId, userProfile } = useApp();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchActivity = async () => {
            if (!activeGroupId || !userProfile) return;

            setLoading(true);
            try {
                // 1. Fetch relevant data
                const { data: reports } = await mockDB.select('reports', { eq: { group_id: activeGroupId } });
                const { data: tasks } = await mockDB.select('tasks', { eq: { group_id: activeGroupId } });

                // Get report IDs for related queries
                const reportIds = (reports || []).map(r => r.id);

                // Fetch comments and views (approvals) for these reports
                const { data: allComments } = await mockDB.select('report_comments');
                const { data: allViews } = await mockDB.select('report_views');

                const groupComments = (allComments || []).filter(c => reportIds.includes(c.report_id));
                const groupViews = (allViews || []).filter(v => reportIds.includes(v.report_id) && v.decision);

                // 2. Normalize and Aggregate
                let acts = [];

                // A. Report Submissions
                (reports || []).forEach(r => {
                    if (r.status === 'draft') return;
                    // Find author
                    const author = MOCK_USERS.find(u => u.id === r.author_id);
                    const isMe = r.author_id === userProfile.id;
                    const periodLabel = getWeekLabel(r.week_start, r.week_end);

                    acts.push({
                        id: `rep-sub-${r.id}`,
                        type: 'report_submit',
                        author: isMe ? 'Tú' : (author?.full_name || 'Alguien'),
                        authorId: r.author_id,
                        content: isMe ? `enviaste el reporte de la ${periodLabel}` : `envió el reporte de la ${periodLabel}`,
                        date: r.submitted_at || r.created_at,
                        link: { module: 'reports', id: r.id, label: `Reporte ${periodLabel}` }
                    });
                });

                // B. Report Approvals (Individual Reviews)
                groupViews.forEach(v => {
                    const report = reports.find(r => r.id === v.report_id);
                    if (!report) return;

                    const author = MOCK_USERS.find(u => u.id === v.user_id);
                    const isMe = v.user_id === userProfile.id;
                    const periodLabel = getWeekLabel(report.week_start, report.week_end);

                    const actionText = v.decision === 'approved' ? `aprobó el reporte (${periodLabel})` : `solicitó cambios en el reporte (${periodLabel})`;
                    const iconType = v.decision === 'approved' ? 'check' : 'alert';

                    const finalActionText = isMe
                        ? (v.decision === 'approved' ? `aprobaste el reporte (${periodLabel})` : `solicitaste cambios en el reporte (${periodLabel})`)
                        : actionText;

                    acts.push({
                        id: `rep-view-${v.id}`,
                        type: 'report_status',
                        statusType: iconType,
                        author: isMe ? 'Tú' : (author?.full_name || 'Alguien'),
                        authorId: v.user_id,
                        content: finalActionText,
                        date: v.seen_at,
                        link: { module: 'reports', id: v.report_id, label: 'Ver Reporte' }
                    });
                });

                // C. Report Comments
                groupComments.forEach(c => {
                    const author = MOCK_USERS.find(u => u.id === c.author_id);
                    const isMe = c.author_id === userProfile.id;
                    const report = reports.find(r => r.id === c.report_id);
                    const periodLabel = report ? getWeekLabel(report.week_start, report.week_end) : 'reporte';
                    const snippet = c.content?.length > 30 ? c.content.substring(0, 30) + '...' : c.content;

                    acts.push({
                        id: `rep-com-${c.id}`,
                        type: 'comment',
                        author: isMe ? 'Tú' : (author?.full_name || 'Alguien'),
                        authorId: c.author_id,
                        content: isMe ? `comentaste "${snippet}" en el reporte (${periodLabel})` : `comentó "${snippet}" en el reporte (${periodLabel})`,
                        date: c.created_at,
                        link: { module: 'reports', id: c.report_id, label: 'Ver Comentario' }
                    });
                });

                // D. Task Assignments (Assigned TO ME)
                const { data: allAssignees } = await mockDB.select('task_assignees');

                (tasks || []).forEach(t => {
                    if (t.created_by === userProfile.id) return; // Created by me

                    const creator = MOCK_USERS.find(u => u.id === t.created_by);
                    const amAssigned = allAssignees?.some(a => a.task_id === t.id && a.user_id === userProfile.id);

                    if (amAssigned) {
                        acts.push({
                            id: `task-assign-${t.id}`,
                            type: 'task',
                            author: creator?.full_name || 'Alguien',
                            authorId: t.created_by,
                            content: `te asignó la tarea: "${t.title}"`, // kept simple, but quotation emphasizes content
                            date: t.created_at,
                            link: { module: 'tasks', id: t.id, label: 'Ver Tarea' }
                        });
                    }
                });

                // Sort by date desc
                acts.sort((a, b) => new Date(b.date) - new Date(a.date));

                setActivities(acts);

            } catch (err) {
                console.error("Error loading activity:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, [activeGroupId, userProfile]);

    const handleNavigate = (link) => {
        if (!link) return;
        if (link.module === 'reports') {
            setSelectedReportId(link.id);
            setActiveModule('reports');
            router.push('/reports');
        } else if (link.module === 'tasks') {
            setSelectedTaskId(link.id);
            setActiveModule('tasks');
            router.push('/tasks');
        }
    };

    const getIcon = (type, statusType) => {
        switch (type) {
            case 'comment': return <MessageSquare className="w-4 h-4 text-blue-500" />;
            case 'task': return <CheckSquare className="w-4 h-4 text-emerald-500" />;
            case 'report_status':
                return statusType === 'check'
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : <FileText className="w-4 h-4 text-purple-500" />;
            case 'report_submit': return <FileText className="w-4 h-4 text-indigo-500" />;
            default: return <History className="w-4 h-4 text-slate-500" />;
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-96">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <History className="w-4 h-4" /> Actividad Reciente (Grupo)
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {activities.map(activity => (
                    <div key={activity.id} className="flex gap-3 items-start group animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100 group-hover:border-indigo-100 transition-colors">
                            {getIcon(activity.type, activity.statusType)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700">
                                <span className="font-bold text-slate-900">{activity.author}</span> {activity.content}
                            </p>
                            {activity.link && (
                                <button
                                    onClick={() => handleNavigate(activity.link)}
                                    className="text-xs text-indigo-600 font-bold hover:text-indigo-800 hover:underline mt-1 block truncate bg-indigo-50 px-2 py-1 rounded w-fit"
                                >
                                    {activity.link.label}
                                </button>
                            )}
                            {(() => {
                                const dateStr = activity.date;
                                const isValid = dateStr && !isNaN(new Date(dateStr).getTime());
                                if (!isValid) return <p className="text-[10px] text-slate-400 mt-1">Fecha desconocida</p>;

                                return (
                                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                        Hace {getDaysSince(dateStr)} días • {formatDateShort(dateStr)} • {formatTime(dateStr)}
                                    </p>
                                );
                            })()}
                        </div>
                    </div>
                ))}
                {activities.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm italic">
                        {loading ? 'Cargando actividad...' : 'No hay actividad reciente de otros miembros.'}
                    </div>
                )}
            </div>
        </div>
    );
}
