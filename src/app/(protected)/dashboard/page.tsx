'use client';

import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">Cargando...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500">
                <p>⚠️ Estado: No Autenticado.</p>
                <p className="text-sm mt-2">Si ves esto, el login funcionó pero el estado no se guardó.</p>
                <button onClick={() => router.push('/login')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded">
                    Volver a Login
                </button>
            </div>
        );
    }
    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500">
                <p>⚠️ Estado: No Autenticado.</p>
                <p className="text-sm mt-2">Si ves esto, el login funcionó pero el estado no se guardó.</p>
                <button onClick={() => router.push('/login')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded">
                    Volver a Login
                </button>
            </div>
        );
    }
    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500">
                <p>⚠️ Estado: No Autenticado.</p>
                <p className="text-sm mt-2">Si ves esto, el login funcionó pero el estado no se guardó.</p>
                <button onClick={() => router.push('/login')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded">
                    Volver a Login
                </button>
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Dashboard - PhD Nexus</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Usuario</h3>
                    <p className="text-gray-600">{currentUser?.email}</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Grupo Activo</h3>
                    <p className="text-gray-600">{activeGroup?.name || 'Sin grupo'}</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Grupos Totales</h3>
                    <p className="text-gray-600">{groups?.length || 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-xl font-semibold mb-4">Tareas</h3>
                    <p className="text-3xl font-bold text-blue-600">{tasks?.length || 0}</p>
                    <p className="text-gray-500 mt-2">tareas totales</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-xl font-semibold mb-4">Reportes</h3>
                    <p className="text-3xl font-bold text-green-600">{reports?.length || 0}</p>
                    <p className="text-gray-500 mt-2">reportes totales</p>
                </div>
            </div>

            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-green-800 mb-2">¡Deployment Exitoso!</h2>
                <p className="text-green-700">
                    Tu aplicación PhD Nexus está funcionando correctamente con Supabase.
                </p>
            </div>
        </div>
    );
}
