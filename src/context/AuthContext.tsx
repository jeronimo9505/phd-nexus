'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState(new Set());
    const [roles, setRoles] = useState([]);
    const [activeGroupId, setActiveGroupId] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const initAuth = async () => {
            try {
                if (process.env.NEXT_PUBLIC_OPEN_MODE === 'true') {
                    setLoading(false);
                    return;
                }

                const { data: { session: currentSession } } = await supabase.auth.getSession();
                setSession(currentSession);
                setUser(currentSession?.user ?? null);
            } catch (error) {
                console.error('Auth error:', error);
            } finally {
                setLoading(false);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user ?? null);
            setLoading(false);
        });

        initAuth();
        return () => subscription.unsubscribe();
    }, []);

    const loadPermissions = useCallback(async (groupId) => {
        if (!user || !groupId) return;
        setActiveGroupId(groupId);

        const { data: membership } = await supabase
            .from('group_members')
            .select('role, group_id')
            .eq('user_id', user.id)
            .eq('group_id', groupId)
            .single();

        if (membership) {
            setRoles([membership.role]);
            // Here you could fetch granular permissions if needed
            setPermissions(new Set()); 
        }
    }, [user]);

    const value = {
        user,
        session,
        loading,
        permissions,
        roles,
        loadPermissions,
        activeGroupId,
        can: (p) => roles.includes('admin') || roles.includes('supervisor'), // Simple check
        hasRole: (r) => roles.includes(r),
        signOut: async () => {
            await supabase.auth.signOut();
            router.push('/login');
        }
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
