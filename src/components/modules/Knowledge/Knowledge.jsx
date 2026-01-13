'use client';

import React, { useState } from 'react';
import { Library, Plus, Link as LinkIcon, ChevronRight, X, Trash2, Send, ExternalLink, Tag, Search, ArrowUpDown, Filter, Pin } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

import { useKnowledge } from './hooks/useKnowledge';

export default function Knowledge() {
    const { userRole } = useApp();
    const { resources: knowledge, addResource, updateResource, deleteResource, loading } = useKnowledge();

    const [selectedKnowledgeId, setSelectedKnowledgeId] = useState(null);
    const [currentComment, setCurrentComment] = useState('');

    // Search, Sort, Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortCriteria, setSortCriteria] = useState('date-desc'); // 'date-desc', 'date-asc', 'alpha'
    const [filterCategory, setFilterCategory] = useState('all');

    const selectedKnowledge = knowledge.find(k => k.id === selectedKnowledgeId);

    const handleAddKnowledge = async () => {
        const newEntry = {
            title: 'Nuevo Recurso',
            url: '',
            description: '',
            category: 'Paper',
            isPinned: false,
            comments: []
        };
        const { data } = await addResource(newEntry);
        if (data) setSelectedKnowledgeId(data.id);
    };

    const handleUpdateKnowledge = async (entryId, field, value) => {
        await updateResource(entryId, { [field]: value });
    };

    const handleDeleteKnowledge = async (entryId) => {
        await deleteResource(entryId);
        if (selectedKnowledgeId === entryId) setSelectedKnowledgeId(null);
    };

    const handleAddKnowledgeComment = async (entryId, text) => {
        const k = knowledge.find(i => i.id === entryId);
        if (!k) return;

        const newComment = {
            id: Date.now(),
            text,
            author: userRole === 'student' ? 'Estudiante' : 'Supervisor',
            date: new Date().toISOString()
        };

        await updateResource(entryId, { comments: [...(k.comments || []), newComment] });
    };

    const handleTogglePin = async (e, entryId) => {
        e.stopPropagation();
        const k = knowledge.find(i => i.id === entryId);
        if (k) {
            await updateResource(entryId, { isPinned: !k.isPinned });
        }
    };

    const handleOpenLink = (url) => {
        if (url) {
            window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
        }
    };

    // Filter & Sort Logic
    const getProcessedKnowledge = () => {
        let processed = [...knowledge];

        // Filter by text
        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            processed = processed.filter(k =>
                (k.title && k.title.toLowerCase().includes(lowerQ)) ||
                (k.url && k.url.toLowerCase().includes(lowerQ)) ||
                (k.description && k.description.toLowerCase().includes(lowerQ))
            );
        }

        // Filter by category
        if (filterCategory !== 'all') {
            processed = processed.filter(k => k.category === filterCategory);
        }

        // Sort
        processed.sort((a, b) => {
            // Priority to Pinned
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;

            if (sortCriteria === 'date-desc') return new Date(b.date) - new Date(a.date);
            if (sortCriteria === 'date-asc') return new Date(a.date) - new Date(b.date);
            if (sortCriteria === 'alpha') return (a.title || '').localeCompare(b.title || '');
            return 0;
        });

        return processed;
    };

    const displayedKnowledge = getProcessedKnowledge();

    return (
        <div className="flex h-full animate-in fade-in duration-300">
            <div className={clsx("flex-1 flex flex-col h-full border-r border-gray-200 bg-white transition-all duration-300", selectedKnowledgeId ? 'w-2/3' : 'w-full')}>
                <header className="p-6 border-b border-gray-200 bg-slate-50 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-3"><Library className="w-6 h-6 text-indigo-600" /> Libro de Conocimiento</h2></div>
                        <button onClick={handleAddKnowledge} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"><Plus className="w-4 h-4" /> Recurso</button>
                    </div>

                    {/* Filters Bar */}
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm flex-1 max-w-sm">
                            <Search className="w-3.5 h-3.5 text-slate-400" />
                            <input className="bg-transparent border-none outline-none w-full text-slate-600" placeholder="Buscar recurso..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                            <select value={sortCriteria} onChange={(e) => setSortCriteria(e.target.value)} className="bg-transparent outline-none text-slate-600 font-medium cursor-pointer">
                                <option value="date-desc">Recientes</option>
                                <option value="date-asc">Antiguos</option>
                                <option value="alpha">A-Z</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-transparent outline-none text-slate-600 font-medium cursor-pointer">
                                <option value="all">Todas</option>
                                <option value="Paper">Paper</option>
                                <option value="Course">Curso</option>
                                <option value="Video">Video</option>
                                <option value="Tool">Herramienta</option>
                                <option value="Book">Libro</option>
                                <option value="Report">Reporte</option>
                                <option value="Resource">Otro</option>
                            </select>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 custom-scrollbar">
                    <div className="max-w-5xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-xs text-slate-400 uppercase w-10">Link</th>
                                    <th className="px-4 py-3 text-xs text-slate-400 uppercase">Recurso</th>
                                    <th className="px-4 py-3 text-xs text-slate-400 uppercase w-32">Categoría</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayedKnowledge.map(entry => (
                                    <tr
                                        key={entry.id}
                                        onClick={() => setSelectedKnowledgeId(entry.id)}
                                        className={clsx("group hover:bg-indigo-50/50 cursor-pointer transition-colors", selectedKnowledgeId === entry.id ? 'bg-indigo-50' : '')}
                                    >
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleOpenLink(entry.url); }}
                                                title="Abrir Enlace"
                                                className="p-2 bg-slate-100 text-indigo-500 rounded-lg hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                                            >
                                                <LinkIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-slate-700 truncate max-w-md">{entry.title || entry.url}</p>
                                                {entry.isPinned && <Pin className="w-3 h-3 text-orange-500 fill-orange-500" />}
                                                <button
                                                    onClick={(e) => handleTogglePin(e, entry.id)}
                                                    className={clsx("p-1 rounded-full transition-all opacity-0 group-hover:opacity-100", entry.isPinned ? "opacity-100 text-orange-500" : "text-slate-300 hover:text-orange-500")}
                                                    title={entry.isPinned ? "Desfijar" : "Fijar al inicio"}
                                                >
                                                    <Pin className={clsx("w-3.5 h-3.5", entry.isPinned ? "fill-orange-500" : "")} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-400 truncate max-w-xs">{entry.url}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                                <Tag className="w-3 h-3" /> {entry.category || 'Resource'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <ChevronRight className={clsx("w-4 h-4 text-slate-300 transition-transform", selectedKnowledgeId === entry.id ? "rotate-90 text-indigo-500" : "")} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {knowledge.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-sm italic">No hay recursos en la biblioteca.</div>
                        )}
                        {knowledge.length > 0 && displayedKnowledge.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-sm italic">No se encontraron resultados para tu búsqueda.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Knowledge Details Sidebar */}
            <AnimatePresence>
                {selectedKnowledgeId && selectedKnowledge && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-[450px] border-l border-gray-200 bg-white flex flex-col h-full shadow-xl z-20"
                    >
                        <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-slate-50">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detalles del Recurso</span>
                                <h3 className="font-bold text-slate-800 text-base mt-1 line-clamp-2 pr-2">{selectedKnowledge.title || "Sin título"}</h3>
                            </div>
                            <button onClick={() => setSelectedKnowledgeId(null)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <div className="p-6 border-b border-gray-100 space-y-5 bg-white overflow-y-auto max-h-[50%] custom-scrollbar">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Título</label>
                                <input className="w-full text-sm p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300" value={selectedKnowledge.title || ''} onChange={(e) => handleUpdateKnowledge(selectedKnowledge.id, 'title', e.target.value)} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500">Categoría</label>
                                    <select
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-300"
                                        value={selectedKnowledge.category}
                                        onChange={(e) => handleUpdateKnowledge(selectedKnowledge.id, 'category', e.target.value)}
                                    >
                                        <option value="Paper">Paper</option>
                                        <option value="Course">Curso</option>
                                        <option value="Video">Video</option>
                                        <option value="Tool">Herramienta</option>
                                        <option value="Book">Libro</option>
                                        <option value="Report">Reporte</option>
                                        <option value="Resource">Otro</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500">Fecha</label>
                                    <div className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 select-none">{selectedKnowledge.date}</div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">URL / DOI</label>
                                <div className="flex gap-2">
                                    <input className="flex-1 text-xs text-blue-600 p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300" value={selectedKnowledge.url} onChange={(e) => handleUpdateKnowledge(selectedKnowledge.id, 'url', e.target.value)} placeholder="https://..." />
                                    <button onClick={() => handleOpenLink(selectedKnowledge.url)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200" title="Probar link"><ExternalLink className="w-4 h-4" /></button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Notas / Resumen</label>
                                <textarea className="w-full text-sm p-3 border border-slate-200 rounded-lg outline-none min-h-[100px] resize-none focus:border-indigo-300 leading-relaxed" placeholder="Añade un resumen..." value={selectedKnowledge.description} onChange={(e) => handleUpdateKnowledge(selectedKnowledge.id, 'description', e.target.value)} />
                            </div>
                            <button onClick={() => handleDeleteKnowledge(selectedKnowledge.id)} className="text-xs text-red-500 flex items-center gap-1 mt-2 hover:text-red-700 transition-colors"><Trash2 className="w-3 h-3" /> Eliminar Recurso</button>
                        </div>

                        <div className="flex-1 flex flex-col bg-slate-50/30 overflow-hidden border-t border-gray-200">
                            <div className="p-3 bg-indigo-50/50 border-b border-indigo-50 text-xs font-bold text-indigo-800 flex items-center gap-2"><Send className="w-3 h-3" /> Notas Rápidas</div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {selectedKnowledge.comments?.length === 0 && <p className="text-center text-xs text-slate-400 italic mt-4">Sin notas adicionales.</p>}
                                {selectedKnowledge.comments?.map(c => (
                                    <div key={c.id} className={clsx("p-3 rounded-lg text-xs bg-white shadow-sm border border-gray-200 text-slate-700")}>
                                        <p>{c.text}</p>
                                        <span className="text-[9px] text-slate-400 mt-1 block">{c.author} • {new Date(c.date).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 bg-white border-t border-gray-200">
                                <div className="relative flex items-center gap-2">
                                    <input className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Escribir nota..." value={currentComment} onChange={(e) => setCurrentComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
                                    <button onClick={() => { if (currentComment.trim()) { handleAddKnowledgeComment(selectedKnowledge.id, currentComment); setCurrentComment(''); } }} className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors">
                                        <Send className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
