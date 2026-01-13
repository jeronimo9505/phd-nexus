'use client';

import React, { useState, useEffect } from 'react';
import {
    Search, Filter, MoreVertical, Shield, CheckCircle2, XCircle,
    UserPlus, Mail, Clock, AlertTriangle, Trash2, Edit
} from 'lucide-react';
import { useApp } from '@/context/AppContext'; // Ensure correct path
import { supabase } from '@/lib/supabase';
import { formatDateShort } from '@/utils/helpers';
import Modal from '@/components/common/Modal'; // Ensure correct path

export default function UserManagement() {
    const { currentUser } = useApp();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, active, pending
    const [selectedUser, setSelectedUser] = useState(null);

    // Modal States
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    // Form States
    const [assignGroupRole, setAssignGroupRole] = useState('student');
    const [editSystemRole, setEditSystemRole] = useState('user');
    const [editFullName, setEditFullName] = useState('');

    // Load Users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Handlers
    const handleApproveClick = (user) => {
        setSelectedUser(user);
        setAssignGroupRole('student'); // Default
        setIsApproveModalOpen(true);
    };

    const confirmApprove = async () => {
        if (!selectedUser) return;
        try {
            // 1. Activate Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ status: 'active' })
                .eq('id', selectedUser.id);
            
            if (profileError) throw profileError;

            // 2. (Optional) Assign to Group if needed. 
            // For now, checking "Auto Bootstrap" logic, the first group is created by the user.
            // Admin approving might simply activate them. Group assignment happens in GroupManagement.
            
            setIsApproveModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error('Error approving user:', error);
            alert('Error al aprobar usuario');
        }
    };

    const handleEditClick = (user) => {
        setSelectedUser(user);
        setEditFullName(user.full_name || '');
        setEditSystemRole(user.system_role || 'user');
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedUser) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editFullName,
                    system_role: editSystemRole
                })
                .eq('id', selectedUser.id);

            if (error) throw error;
            
            setIsEditModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Error al actualizar usuario');
        }
    };

    const handleDeleteUser = async (user) => {
        if (!confirm(`¿Estás seguro de eliminar a ${user.email}? Esta acción no se puede deshacer.`)) return;
        
        try {
            // Note: Deleting from Auth requires Service Role. 
            // Client can only delete from public tables usually if constrained.
            // But if we delete profile, cascading might fail if auth user exists.
            // Ideally we call an Edge Function. For now, we try to delete profile (soft delete?)
            // or show checking message.
            
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);
                
            if (error) {
                 alert('No se puede eliminar el usuario completamente desde el cliente. Contacta al administrador de base de datos.');
                 console.error(error);
            } else {
                fetchUsers();
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    // Filtering
    const filteredUsers = users.filter(u => {
        const matchesSearch = (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                              (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || u.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const getStatusParams = (status) => {
        switch (status) {
            case 'active': return { label: 'Activo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
            case 'pending': return { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock };
            case 'suspended': return { label: 'Suspendido', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle };
            default: return { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200', icon: AlertTriangle };
        }
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Buscar usuarios..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition-all font-medium text-slate-600"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500 text-slate-600 font-medium cursor-pointer"
                    >
                        <option value="all">Todos los Estados</option>
                        <option value="active">Activos</option>
                        <option value="pending">Pendientes</option>
                    </select>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-10 text-slate-500">Cargando usuarios...</div>
            ) : filteredUsers.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-gray-200 border-dashed">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <UserPlus className="w-6 h-6 text-slate-400" />
                    </div>
                    <h3 className="text-slate-900 font-bold">No hay usuarios</h3>
                    <p className="text-slate-500 text-sm">No se encontraron usuarios con los filtros actuales.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-gray-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">Usuario</th>
                                    <th className="px-6 py-4">Rol Sistema</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4">Fecha Registro</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredUsers.map((user) => {
                                    const StatusIcon = getStatusParams(user.status).icon;
                                    return (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                        {user.full_name?.charAt(0) || user.email?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-700">{user.full_name}</div>
                                                        <div className="text-xs text-slate-400 flex items-center gap-1">
                                                            <Mail className="w-3 h-3" />
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize
                                                    ${user.system_role === 'admin' 
                                                        ? 'bg-purple-100 text-purple-700 border-purple-200' 
                                                        : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                    {user.system_role === 'admin' ? 'Administrador' : 'Usuario'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusParams(user.status).color}`}>
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    <span className="capitalize">{getStatusParams(user.status).label}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-500 font-medium">
                                                    {formatDateShort(user.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {user.status === 'pending' && (
                                                        <button
                                                            onClick={() => handleApproveClick(user)}
                                                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                            title="Aprobar Usuario"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleEditClick(user)}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Editar Usuario"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    
                                                    {/* Hide delete for current user */}
                                                    {user.id !== currentUser?.id && (
                                                        <button 
                                                            onClick={() => handleDeleteUser(user)}
                                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Approve Modal */}
            <Modal
                isOpen={isApproveModalOpen}
                onClose={() => setIsApproveModalOpen(false)}
                title="Aprobar Cuenta de Usuario"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Estás a punto de activar la cuenta de <strong className="text-slate-900">{selectedUser?.full_name}</strong>.
                        <br/>
                        Una vez activo, el usuario podrá iniciar sesión en el sistema.
                    </p>
                    
                    <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                        <button
                            onClick={() => setIsApproveModalOpen(false)}
                            className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmApprove}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Confirmar & Activar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit User Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Editar Usuario"
            >
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Nombre Completo</label>
                        <input
                            className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Rol de Sistema</label>
                        <select
                            value={editSystemRole}
                            onChange={(e) => setEditSystemRole(e.target.value)}
                            className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                        >
                            <option value="user">Usuario Estándar</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveEdit}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-sm"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
