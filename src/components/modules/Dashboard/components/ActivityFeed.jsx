import React from 'react';
import { History } from 'lucide-react';

export default function ActivityFeed() {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-96">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <History className="w-4 h-4" /> Actividad Reciente del Grupo
            </h3>
            
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center p-4 border border-dashed border-slate-100 rounded-lg bg-slate-50">
                <History className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">Historial de actividad</p>
                <p className="text-xs">Las notificaciones en tiempo real aparecerán aquí pronto.</p>
            </div>
        </div>
    );
}
