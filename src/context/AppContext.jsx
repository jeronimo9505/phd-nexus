'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    // -------------------------------------------------------------------------
    // 1. STATE DEFINITIONS
    // -------------------------------------------------------------------------
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const [tasks, setTasks] = useState([]);
    const [reports, setReports] = useState([]);
    const [knowledge, setKnowledge] = useState([]);
    const [activities, setActivities] = useState([]);

    const [groups, setGroups] = useState([]);
    const [groupMembers, setGroupMembers] = useState([]);
    const [activeGroupId, setActiveGroupId] = useState(null);

    const [activeModule, setActiveModule] = useState('dashboard');
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [isEditingReport, setIsEditingReport] = useState(false);
    const [userRole, setUserRole] = useState('student');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // -------------------------------------------------------------------------
    // 2. LOGIC & EFFECTS
    // -------------------------------------------------------------------------

    const loadUserData = useCallback(async (userId) => {
        if (!userId) return;

        try {
            // Get User Groups
            const { data: memberships, error: memError } = await supabase
                .from('group_members')
                .select('group_id, role, groups(id, name, description, code)')
                .eq('user_id', userId)
                .eq('status', 'active');

            if (memError) throw memError;

            const userGroups = memberships?.map(m => ({
                ...m.groups,
                userRole: m.role
            })) || [];

            setGroups(userGroups);

            // Determine Active Group
            let currentGroupId = activeGroupId;
            const storedGroupId = typeof window !== 'undefined' ? window.localStorage.getItem('phd_nexus_activeGroupId') : null;
            
            if (!currentGroupId || !userGroups.find(g => g.id === currentGroupId)) {
                if (storedGroupId && userGroups.find(g => g.id === storedGroupId)) {
                    currentGroupId = storedGroupId;
                } else {
                    currentGroupId = userGroups.length > 0 ? userGroups[0].id : null;
                }
            }

            if (currentGroupId && currentGroupId !== activeGroupId) {
                setActiveGroupId(currentGroupId);
                if (typeof window !== 'undefined') window.localStorage.setItem('phd_nexus_activeGroupId', currentGroupId);
                return;
            }

            if (currentGroupId) {
                // Load Group Data (Real-time or Batch)
                const [{ data: t }, { data: r }, { data: k }, { data: m }] = await Promise.all([
                    supabase.from('tasks').select('*').eq('group_id', currentGroupId),
                    supabase.from('reports').select('*, profiles!author_id(full_name)').eq('group_id', currentGroupId),
                    supabase.from('knowledge_items').select('*').eq('group_id', currentGroupId),
                    supabase.from('group_members').select('*, profiles(*)').eq('group_id', currentGroupId)
                ]);

                setTasks(t || []);
                setReports(r?.map(report => ({
                    ...report,
                    authorName: report.profiles?.full_name || 'Desconocido'
                })) || []);
                setKnowledge(k || []);
                setGroupMembers(m?.map(member => ({
                    ...member.profiles,
                    role: member.role,
                    joinedAt: member.created_at
                })) || []);

                const currentMembership = memberships.find(mem => mem.group_id === currentGroupId);
                setUserRole(currentMembership?.role || 'student');
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }, [activeGroupId]);

    // Initial Auth Sync
    useEffect(() => {
        const checkAuth = async () => {
            if (!supabase) {
                console.warn('Supabase client not initialized in checkAuth');
                setLoading(false);
                return;
            }
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUser(session.user);
                setIsAuthenticated(true);
                await loadUserData(session.user.id);
            }
            setLoading(false);
        };

        if (supabase) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (session) {
                    setCurrentUser(session.user);
                    setIsAuthenticated(true);
                    await loadUserData(session.user.id);
                } else {
                    setCurrentUser(null);
                    setIsAuthenticated(false);
                    setGroups([]);
                    setTasks([]);
                    setReports([]);
                }
                setLoading(false);
            });
            return () => subscription.unsubscribe();
        } else {
             setLoading(false);
        }

        checkAuth();
    }, [loadUserData]);

    const login = async (email, password) => {
        if (!supabase) {
            console.error('Supabase client is not initialized. Check environment variables.');
            return { success: false, error: 'Error de configuración: Cliente Supabase no disponible.' };
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                console.error('Login error:', error.message);
                return { success: false, error: 'Correo o contraseña incorrectos.' };
            }
            
            // IMMEDIATE STATE UPDATE TO PREVENT RACE CONDITION
            if (data.session) {
                setLoading(true); // Force loading state
                setCurrentUser(data.session.user);
                setIsAuthenticated(true);
                
                // AWAIT DATA LOAD to ensure Dashboard has content before redirecting
                await loadUserData(data.session.user.id);
                setLoading(false); 
            }

            return { success: true };
        } catch (err) {
            console.error('Unexpected login error:', err);
            return { success: false, error: 'Error inesperado durante el inicio de sesión.' };
        }
    };

    const register = async (email, password, full_name) => {
        if (!supabase) return { success: false, message: 'Supabase client missing' };
        
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name,
                    status: 'pending'
                }
            }
        });
        if (error) return { success: false, message: error.message };
        return { success: true };
    };

    const logout = async () => {
        if (supabase) await supabase.auth.signOut();
        setIsAuthenticated(false);
        setCurrentUser(null);
        if (typeof window !== 'undefined') window.localStorage.removeItem('phd_nexus_activeGroupId');
    };

    const value = {
        isAuthenticated, currentUser, loading, login, register, logout,
        tasks, setTasks, reports, setReports, knowledge, setKnowledge,
        groupMembers, groups, activeGroupId, setActiveGroupId,
        activeGroup: groups.find(g => g.id === activeGroupId) || null,
        activeModule, setActiveModule, userRole, setUserRole,
        selectedReportId, setSelectedReportId, selectedTaskId, setSelectedTaskId,
        isEditingReport, setIsEditingReport, isSidebarOpen, setIsSidebarOpen,
        activities, addActivity: (a) => setActivities(p => [{ id: Date.now(), timestamp: new Date(), ...a }, ...p].slice(0, 50)),
        refreshUserData: () => loadUserData(currentUser?.id),
        can: () => true
    };

    return <AppContext.Provider value={value}>{!loading && children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
