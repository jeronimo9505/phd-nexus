import React, { useState, useEffect } from 'react';
import { mockDB } from '@/lib/mockDatabase';
import { MOCK_USERS } from '@/data/mockUsers';
import { MOCK_GROUPS } from '@/data/mockGroups';
import { Search, CheckCircle2, XCircle, MoreVertical, Shield, Clock, AlertCircle, Plus, Mail } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import clsx from 'clsx';

export default function UserManagement() {
    const [activeTab, setActiveTab] = useState('active'); // 'pending', 'active'
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Create User State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newUserData, setNewUserData] = useState({ email: '', fullName: '', password: '' });

    // Modal State
    const [selectedUser, setSelectedUser] = useState(null);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Edit User State
    const [editFullName, setEditFullName] = useState('');
    const [editSystemRole, setEditSystemRole] = useState('user');


    // Approval Form State
    const [assignGroupId, setAssignGroupId] = useState('');
    const [assignSystemRole, setAssignSystemRole] = useState('user');
    const [assignGroupRole, setAssignGroupRole] = useState('student');
    const [availableGroups, setAvailableGroups] = useState([]);

    useEffect(() => {
        fetchUsers();
        fetchGroups();
    }, [activeTab, searchTerm]);

    const fetchUsers = async () => {
        setIsLoading(true);

        // Get users from mockDB
        const { data } = await mockDB.select('profiles');

        if (data) {
            // Filter by status
            let filtered = data.filter(u => u.status === activeTab);

            // Filter by search term
            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                filtered = filtered.filter(u =>
                    u.email?.toLowerCase().includes(lowerTerm) ||
                    u.full_name?.toLowerCase().includes(lowerTerm)
                );
            }
            setUsers(filtered);
        }
        setIsLoading(false);
    };

    const fetchGroups = async () => {
        setAvailableGroups(MOCK_GROUPS);
    }

    // Handlers
    const handleApproveClick = (user) => {
        setSelectedUser(user);
        setAssignGroupId(availableGroups[0]?.id || '');
        setAssignSystemRole('user');
        setAssignGroupRole('student');
        setIsApproveModalOpen(true);
    };

    const handleEditClick = (user) => {
        setSelectedUser(user);
        setEditFullName(user.full_name || '');
        setEditSystemRole(user.system_role || 'user');
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedUser) return;
        setIsLoading(true);

        const { error } = await mockDB.update('profiles', selectedUser.id, {
            full_name: editFullName,
            system_role: editSystemRole
        });

        if (error) {
            alert("Error al actualizar usuario: " + error.message);
        } else {
            setIsEditModalOpen(false);
            fetchUsers();
        }
        setIsLoading(false);
    };


    const confirmApprove = async () => {
        if (!selectedUser) return;
        setIsLoading(true);

        try {
            // Update user status to active
            await mockDB.update('profiles', selectedUser.id, {
                status: 'active',
                system_role: assignSystemRole
            });

            // Add group membership if group selected
            if (assignGroupId) {
                await mockDB.insert('group_members', {
                    group_id: assignGroupId,
                    user_id: selectedUser.id,
                    role: assignGroupRole,
                    status: 'active'
                });
            }

            // Success
            setIsApproveModalOpen(false);
            fetchUsers();

        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async () => {
        if (!newUserData.email || !newUserData.password || !newUserData.fullName) {
            alert("Completa todos los campos");
            return;
        }
        setIsLoading(true);
        try {
            // Create user in mockDB
            const { error } = await mockDB.insert('profiles', {
                email: newUserData.email,
                password: newUserData.password, // In production, this should be hashed
                full_name: newUserData.fullName,
                system_role: 'user',
                status: 'pending' // New users start as pending
            });

            if (error) throw new Error(error);

            alert("Usuario creado exitosamente. Ahora aparece en la lista de 'Pendientes' para que le asignes grupo y rol.");

            setIsCreateModalOpen(false);
            setNewUserData({ email: '', fullName: '', password: '' });
            setActiveTab('pending');
            fetchUsers();
        } catch (err) {
            alert("Error al crear usuario: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Tabs & Search */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={clsx("px-4 py-2 rounded-md text-sm font-medium transition-all", activeTab === 'pending' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                        Pendientes
                        {/* We could show a badge count here if we fetched it separately */}
                    </button>
                    <button
                        onClick={() => setActiveTab('active')}
                        className={clsx("px-4 py-2 rounded-md text-sm font-medium transition-all", activeTab === 'active' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                        Activos/Confirmados
                    </button>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                </div>

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                >
                    <Plus className="w-4 h-4" /> Nuevo Usuario
                </button>
            </div>

            {/* Users List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-gray-100 text-xs uppercase text-slate-400 font-bold">
                        <tr>
                            <th className="px-6 py-4">Usuario</th>
                            <th className="px-6 py-4">Rol Sistema</th>
                            <th className="px-6 py-4">Grupos</th>
                            <th className="px-6 py-4">Fecha Registro</th>
                            <th className="px-6 py-4 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-700">{user.full_name || 'Sin Nombre'}</div>
                                    <div className="text-xs text-slate-500">{user.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={clsx(
                                        "px-2 py-1 rounded-full text-xs font-bold",
                                        user.system_role_key === 'SystemAdmin' ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                                    )}>
                                        {user.system_role_key === 'SystemAdmin' ? 'Administrador' : 'Usuario'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs font-medium text-slate-600">
                                    {user.group_count} Grupos
                                </td>
                                <td className="px-6 py-4 text-slate-500 text-xs">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {activeTab === 'pending' ? (
                                        <button
                                            onClick={() => handleApproveClick(user)}
                                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200"
                                        >
                                            Revisar & Aprobar
                                        </button>
                                    ) : (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEditClick(user)}
                                                className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                            >
                                                Editar
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {!isLoading && users.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                    No hay usuarios {activeTab === 'pending' ? 'pendientes de aprobación' : 'activos encontrados'}.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Approval Modal */}
            <Modal
                isOpen={isApproveModalOpen}
                onClose={() => setIsApproveModalOpen(false)}
                title="Aprobar Acceso de Usuario"
            >
                <div className="space-y-5">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                        <div className="text-sm text-blue-900">
                            Estás habilitando a <strong>{selectedUser?.email}</strong>.<br />
                            Define su rol global y su primer grupo de trabajo.
                        </div>
                    </div>

                    {/* System Role */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Rol de Sistema (Global)</label>
                        <select
                            value={assignSystemRole}
                            onChange={(e) => setAssignSystemRole(e.target.value)}
                            className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                        >
                            <option value="user">Usuario Estándar (Acceso normal)</option>
                            <option value="admin">Administrador (Acceso total)</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Initial Group */}
                        <div className="space-y-1 col-span-2 md:col-span-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Asignar Grupo Principal</label>
                            <select
                                value={assignGroupId}
                                onChange={(e) => setAssignGroupId(e.target.value)}
                                className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                            >
                                <option value="">-- Sin Grupo --</option>
                                {availableGroups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Group Role */}
                        <div className="space-y-1 col-span-2 md:col-span-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Rol en el Grupo</label>
                            <select
                                value={assignGroupRole}
                                onChange={(e) => setAssignGroupRole(e.target.value)}
                                disabled={!assignGroupId}
                                className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                            >
                                <option value="student">Estudiante</option>
                                <option value="researcher">Investigador</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="lab_manager">Lab Manager</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-2 border-t border-gray-100 mt-4">
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
                            <option value="User">Usuario Estándar</option>
                            <option value="SystemAdmin">Administrador</option>
                        </select>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-700">
                        <strong>Nota:</strong> Para cambiar correo o contraseña, el usuario debe usar la opción "¿Olvidaste tu contraseña?" en el login, o contactar a soporte técnico avanzado.
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

            {/* Create User Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Crear Nuevo Usuario"
            >
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Nombre Completo</label>
                        <input
                            className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                            placeholder="Ej. Dr. Juan Pérez"
                            value={newUserData.fullName}
                            onChange={e => setNewUserData({ ...newUserData, fullName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Correo Electrónico</label>
                        <input
                            className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                            placeholder="usuario@universidad.edu"
                            value={newUserData.email}
                            onChange={e => setNewUserData({ ...newUserData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Contraseña Temporal</label>
                        <input
                            className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                            type="password"
                            placeholder="******"
                            value={newUserData.password}
                            onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2 border-t border-gray-100 mt-2">
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreateUser}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Crear Usuario
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
