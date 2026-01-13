import { useState, useEffect, useCallback } from 'react';
import { mockDB } from '@/lib/mockDatabase';
import { useApp } from '@/context/AppContext';
import { MOCK_USERS } from '@/data/mockUsers';

export function useKnowledge() {
    const { activeGroupId, currentUser } = useApp();
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchResources = useCallback(async () => {
        if (!activeGroupId) return;

        try {
            setLoading(true);
            const { data, error } = await mockDB.select('knowledge_items', {
                eq: { group_id: activeGroupId }
            });

            if (error) throw error;

            console.log("Fetched knowledge items:", data); // Debug

            // Transform/enrich if needed
            const enriched = (data || []).map(r => {
                const author = MOCK_USERS.find(u => u.id === r.created_by);
                return {
                    id: r.id,
                    title: r.title,
                    description: r.description,
                    url: r.url,
                    category: r.category,
                    date: r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Desconocida',
                    author: author?.full_name || 'Unknown',
                    groupId: r.group_id,
                    isPinned: r.isPinned ?? false,
                    comments: r.comments || []
                };
            });

            setResources(enriched);
            setError(null);
        } catch (err) {
            console.error('Error fetching knowledge:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [activeGroupId]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    const addResource = async (resourceData) => {
        if (!activeGroupId || !currentUser) return { error: 'Missing data' };

        try {
            const { data, error } = await mockDB.insert('knowledge_items', {
                group_id: activeGroupId,
                created_by: currentUser.id,
                title: resourceData.title,
                description: resourceData.description || '',
                url: resourceData.url || '',
                category: resourceData.category || 'Resource',
                created_at: new Date().toISOString()
            });

            if (error) return { error };

            await fetchResources();
            return { data };
        } catch (err) {
            return { error: err.message };
        }
    };

    const deleteResource = async (id) => {
        try {
            const { error } = await mockDB.delete('knowledge_items', id);
            if (error) return { error };
            await fetchResources();
            return { error: null };
        } catch (err) {
            return { error: err.message };
        }
    };

    const updateResource = async (id, updates) => {
        try {
            const { error } = await mockDB.update('knowledge_items', id, updates);
            if (error) return { error };
            await fetchResources();
            return { error: null };
        } catch (err) {
            return { error: err.message };
        }
    };

    return {
        resources,
        loading,
        error,
        fetchResources,
        addResource,
        updateResource,
        deleteResource
    };
}
