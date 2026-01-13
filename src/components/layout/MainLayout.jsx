'use client';

import React from 'react';
import Sidebar from './Sidebar';
import { useApp } from '@/context/AppContext';

export default function MainLayout({ children }) {
    const { isSidebarOpen } = useApp();

    return (
        <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
            {isSidebarOpen && <Sidebar />}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50 relative">
                {children}
            </main>
        </div>
    );
}
