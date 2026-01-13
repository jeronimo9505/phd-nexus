'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    FileText, 
    CheckSquare, 
    Book, 
    Settings, 
    LogOut, 
    Menu, 
    X,
    Shield
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar() {
    const pathname = usePathname();
    const { 
        currentUser,
        logout,
        activeGroup,
        isSidebarOpen,
        setIsSidebarOpen,
        userRole 
    } = useApp();
    
    const userProfile = currentUser ? {
        full_name: currentUser.user_metadata?.full_name || 'Usuario',
        email: currentUser.email,
        system_role: currentUser.user_metadata?.system_role || 'user'
    } : null;

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard General', path: '/dashboard', color: 'text-indigo-500' },
        { icon: FileText, label: 'Reportes Científicos', path: '/reports', color: 'text-amber-500' },
        { icon: CheckSquare, label: 'Gestor de Tareas', path: '/tasks', color: 'text-emerald-500' },
        { icon: Book, label: 'Libro de Conocimiento', path: '/knowledge', color: 'text-blue-500' },
        { icon: Settings, label: 'Configuración', path: '/settings', color: 'text-slate-500' },
    ];

    if (userProfile?.system_role === 'admin') {
        menuItems.push({ icon: Shield, label: 'Admin Panel', path: '/admin', color: 'text-purple-500', isAdmin: true });
    }

    return (
        <aside className={clsx(
            "fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 flex flex-col",
            isSidebarOpen ? "w-72" : "w-20"
        )}>
            {/* Header */}
            <div className="h-20 flex items-center px-6 border-b border-slate-100 justify-between">
                <Link href="/dashboard" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
                        <Book className="w-6 h-6 text-white" />
                    </div>
                    {isSidebarOpen && (
                        <span className="font-bold text-xl text-slate-800 tracking-tight">PhD Nexus</span>
                    )}
                </Link>
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors hidden md:block"
                >
                    {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* User & Group info */}
            {isSidebarOpen ? (
                <div className="px-6 py-6 border-b border-slate-50">
                    <div className="mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Grupo Activo</p>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                             <p className="font-bold text-slate-700 text-sm truncate">{activeGroup?.name || 'Cargando...'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${currentUser ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <p className="text-xs font-medium text-slate-500 truncate max-w-[180px]">
                            {userProfile?.full_name || 'invitado'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="py-6 flex justify-center border-b border-slate-50">
                     <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-4" title={activeGroup?.name}>
                        <span className="text-xs font-bold text-slate-500">{activeGroup?.name?.[0] || '?'}</span>
                     </div>
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                <p className={clsx("px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 transition-opacity", !isSidebarOpen && "opacity-0 hidden")}>Módulos</p>
                
                {menuItems.map((item) => {
                    const isActive = pathname.startsWith(item.path);
                    return (
                        <Link 
                            key={item.path} 
                            href={item.path}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive 
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600",
                                item.isAdmin && !isActive && "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100"
                            )}
                            title={!isSidebarOpen ? item.label : undefined}
                        >
                            <item.icon className={clsx("w-5 h-5 transition-transform group-hover:scale-110", isActive ? "text-white" : item.color)} />
                            {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
                            {isActive && isSidebarOpen && <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-8 bg-indigo-400 rounded-r-full hidden" />}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100">
                <button 
                    onClick={logout}
                    className={clsx(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors group",
                        !isSidebarOpen && "justify-center"
                    )}
                    title="Cerrar Sesión"
                >
                    <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    {isSidebarOpen && <span className="font-bold text-sm">Cerrar Sesión</span>}
                </button>
            </div>
        </aside>
    );
}
