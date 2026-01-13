'use client';

import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
    const { isAuthenticated, currentUser, activeGroup, groups, tasks, reports, loading } = useApp();
    const router = useRouter();

    // DISABLED AUTO-REDIRECT FOR DEBUGGING
    // useEffect(() => {
    //     if (!loading && !isAuthenticated) {
    //         router.push('/login');
    //     }
    // }, [isAuthenticated, loading, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">Cargando datos de sesión...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
             <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500 p-8">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
                    <h2 className="text-xl font-bold text-red-600 mb-4">⚠️ Sesión No Detectada</h2>
                    
                    <div className="space-y-2 text-sm text-left font-mono bg-slate-100 p-4 rounded">
                        <p><strong>Loading:</strong> {loading ? 'YES' : 'NO'}</p>
                        <p><strong>IsAuthenticated:</strong> {isAuthenticated ? 'YES' : 'NO'}</p>
                        <p><strong>CurrentUser:</strong> {currentUser ? currentUser.email : 'NULL'}</p>
                        <p><strong>Storage Check:</strong> {typeof window !== 'undefined' ? (window.localStorage.getItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0]?.split('//')[1] + '-auth-token') ? 'FOUND' : 'NOT FOUND') : 'N/A'}</p>
                    </div>

                    <p className="mt-4 text-gray-600">
                        El login fue exitoso pero AppContext no recuperó la sesión tras la recarga.
                    </p>

                    <button onClick={() => router.push('/login')} className="mt-6 w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                        Volver a Intentar Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Dashboard - PhD Nexus</h1>
            {/* Standard Dashboard Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Usuario</h3>
                    <p className="text-gray-600">{currentUser?.email}</p>
                </div>
            </div>
            
            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-green-800 mb-2">¡Funciona!</h2>
                <p className="text-green-700">Si ves esto, estás autenticado correctamente.</p>
            </div>
        </div>
    );
}
