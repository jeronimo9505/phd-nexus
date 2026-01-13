import { useState, useEffect, useCallback } from 'react';
import { mockDB } from '@/lib/mockDatabase';
import { MOCK_USERS } from '@/data/mockUsers';
import { useApp } from '@/context/AppContext';

export function useTasks() {
    const { activeGroupId, currentUser } = useApp();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchTasks = useCallback(async () => {
        if (!activeGroupId) return;

        try {
            setLoading(true);
            const { data, error } = await mockDB.select('tasks', {
                eq: { group_id: activeGroupId }
            });

            if (error) throw error;

            // Load related data
            const { data: allComments } = await mockDB.select('task_comments');
            const { data: allAssignees } = await mockDB.select('task_assignees');

            // Transform for UI
            const transformed = (data || []).map(t => {
                const creator = MOCK_USERS.find(u => u.id === t.created_by);

                // Get comments for this task
                const taskComments = (allComments || [])
                    .filter(c => c.task_id === t.id)
                    .map(c => {
                        const commentAuthor = MOCK_USERS.find(u => u.id === c.author_id);
                        return {
                            id: c.id,
                            text: c.body,
                            author: commentAuthor?.full_name || 'Unknown',
                            role: commentAuthor?.system_role,
                            date: c.created_at
                        };
                    });

                // Get assignees for this task
                const taskAssignees = (allAssignees || [])
                    .filter(a => a.task_id === t.id);

                // For backward compatibility with UI that expects single assignedTo
                const firstAssigneeId = taskAssignees.length > 0 ? taskAssignees[0].user_id : t.created_by;
                const assignedUser = MOCK_USERS.find(u => u.id === firstAssigneeId);

                return {
                    id: t.id,
                    groupId: t.group_id,
                    title: t.title,
                    description: t.description,
                    status: t.status,
                    priority: t.priority,
                    dueDate: t.due_date,
                    createdAt: t.created_at,
                    completedAt: t.completed_at,
                    assignedBy: creator?.full_name || 'Unknown',

                    // Mapped fields
                    assignedTo: assignedUser?.full_name, // UI expects this field
                    sourceReportId: t.report_id,

                    assignees: taskAssignees,
                    comments: taskComments
                };
            });

            // Sort by created_at descending
            transformed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setTasks(transformed);
            setError(null);
        } catch (err) {
            console.error('Error fetching tasks:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [activeGroupId]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const createTask = async (taskData) => {
        if (!activeGroupId || !currentUser) return { error: 'Missing required data' };

        try {
            // 1. Insert Task
            const { data: newTask, error } = await mockDB.insert('tasks', {
                group_id: activeGroupId,
                created_by: currentUser.id,
                title: taskData.title,
                description: taskData.description || '',
                status: taskData.status || 'todo',
                priority: taskData.priority || 'medium',
                due_date: taskData.dueDate || null,
                report_id: taskData.sourceReportId || null
            });

            if (error) return { error };

            // 2. Handle Assignees
            // Default to creator if no assignees provided
            const assigneeIds = (taskData.assignees && taskData.assignees.length > 0)
                ? taskData.assignees
                : [currentUser.id];

            if (assigneeIds.length > 0) {
                const assigneeRecords = assigneeIds.map(userId => ({
                    task_id: newTask.id,
                    user_id: userId
                }));
                // sequential or parallel inserts? mockDB insert supports array?
                // mockDB.insert checks IsArray. Yes.
                await mockDB.insert('task_assignees', assigneeRecords);
            }

            await fetchTasks();
            return { data: newTask };
        } catch (err) {
            return { error: err.message };
        }
    };

    const updateTask = async (taskId, updates) => {
        try {
            // Handle Assignees Update specially
            if (updates.assignees) {
                // 1. Delete existing
                // MockDB delete doesn't support where clause well for bulk delete?
                // We need to fetch assignees for task and delete them?
                // Or maybe mockDB allows deleting by task_id if we implement it?
                // Provided mockDB.delete takes 'id'.
                // So we assume we must find them first.
                // For simplicity in mock, let's just get all assignees for task.
                const { data: currentAssignees } = await mockDB.select('task_assignees', { eq: { task_id: taskId } });

                if (currentAssignees && currentAssignees.length > 0) {
                    await Promise.all(currentAssignees.map(a => mockDB.delete('task_assignees', a.id)));
                }

                // 2. Insert new
                if (updates.assignees.length > 0) {
                    const newRecords = updates.assignees.map(userId => ({
                        task_id: taskId,
                        user_id: userId
                    }));
                    await mockDB.insert('task_assignees', newRecords);
                }

                // Remove assignees from updates object to avoid error in tasks table update
                const { assignees, ...taskUpdates } = updates;
                const { error } = await mockDB.update('tasks', taskId, taskUpdates);
                if (error) return { error };
            } else {
                const { error } = await mockDB.update('tasks', taskId, updates);
                if (error) return { error };
            }

            await fetchTasks();
            return { error: null };
        } catch (err) {
            return { error: err.message };
        }
    };

    const deleteTask = async (taskId) => {
        try {
            const { error } = await mockDB.delete('tasks', taskId);
            if (error) return { error };

            await fetchTasks();
            return { error: null };
        } catch (err) {
            return { error: err.message };
        }
    };

    const addComment = async (taskId, commentBody) => {
        if (!currentUser) return { error: 'No user' };

        try {
            const { error } = await mockDB.insert('task_comments', {
                task_id: taskId,
                author_id: currentUser.id,
                body: commentBody
            });

            if (error) return { error };

            await fetchTasks();
            return { error: null };
        } catch (err) {
            return { error: err.message };
        }
    };

    const assignUser = async (taskId, userId) => {
        try {
            const { error } = await mockDB.insert('task_assignees', {
                task_id: taskId,
                user_id: userId
            });

            if (error) return { error };

            await fetchTasks();
            return { error: null };
        } catch (err) {
            return { error: err.message };
        }
    };

    return {
        tasks,
        loading,
        error,
        fetchTasks,
        createTask,
        updateTask,
        deleteTask,
        addComment,
        assignUser
    };
}
