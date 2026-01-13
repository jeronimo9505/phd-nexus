'use client';

import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { 
    Users, 
    FileText, 
    CheckSquare, 
    BarChart3, 
    Clock,
    Activity
} from 'lucide-react';

export default function DashboardPage() {
    const { isAuthenticated, currentUser, activeGroup, groups, tasks, reports, loading } = useApp();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, loading, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen text-slate-500">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p>Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
                <p className="text-slate-500 mt-1">
                    Bienvenido de nuevo, <span className="font-semibold text-indigo-600">{activeGroup?.name || 'Usuario'}</span>
                </p>
            </header>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    icon={<Users className="w-6 h-6 text-blue-600" />}
                    label="Miembros del Grupo"
                    value={activeGroup ? 'Activo' : 'Sin Grupo'}
                    subtext={activeGroup ? 'Investigación en curso' : 'Selecciona un grupo'}
                    color="bg-blue-50"
                />
                <StatCard 
                    icon={<CheckSquare className="w-6 h-6 text-purple-600" />}
                    label="Tareas Pendientes"
                    value={tasks?.filter(t => t.status === 'pending').length || 0}
                    subtext="Tareas activas"
                    color="bg-purple-50"
                />
                <StatCard 
                    icon={<FileText className="w-6 h-6 text-amber-600" />}
                    label="Reportes"
                    value={reports?.length || 0}
                    subtext="Documentos generados"
                    color="bg-amber-50"
                />
                 <StatCard 
                    icon={<Activity className="w-6 h-6 text-emerald-600" />}
                    label="Estado del Sistema"
                    value="En Línea"
                    subtext="v1.0.0 Supabase"
                    color="bg-emerald-50"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity / Tasks */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-400" />
                            Actividad Reciente
                        </h2>
                        {tasks?.length > 0 ? (
                            <div className="space-y-3">
                                {tasks.slice(0, 5).map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-green-500' : 'bg-indigo-500'}`} />
                                            <div>
                                                <p className="font-medium text-slate-700">{task.title}</p>
                                                <p className="text-xs text-slate-400">Asignado a: {task.assigned_to || 'Sin asignar'}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {task.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <p>No hay actividad reciente en este grupo.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions / Info */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Información</h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-indigo-50 rounded-lg">
                                <p className="text-sm text-indigo-800 font-medium">Cuenta Actual</p>
                                <p className="text-xs text-indigo-600 break-all">{currentUser?.email}</p>
                            </div>
                             <div className="p-4 bg-slate-50 rounded-lg">
                                <p className="text-sm text-slate-800 font-medium">Rol</p>
                                <p className="text-xs text-slate-600">Administrador (Auto-asignado)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, subtext, color }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                    {icon}
                </div>
            </div>
            <p className="text-xs text-slate-400">{subtext}</p>
        </div>
    );
}
