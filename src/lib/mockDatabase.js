// Mock-to-Supabase Proxy
// Routes database operations to either localStorage or a real Supabase backend

import { supabase } from './supabase';
import { MOCK_USERS } from '../data/mockUsers';
import { MOCK_GROUPS, MOCK_GROUP_MEMBERS } from '../data/mockGroups';

const DB_PREFIX = 'phd_nexus_db_';
const IS_OPEN_MODE = process.env.NEXT_PUBLIC_OPEN_MODE === 'true';

// --- MOCK LOGIC (Legacy) ---
function initializeDB() {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(`${DB_PREFIX}initialized`)) {
        localStorage.setItem(`${DB_PREFIX}profiles`, JSON.stringify(MOCK_USERS));
        localStorage.setItem(`${DB_PREFIX}groups`, JSON.stringify(MOCK_GROUPS));
        localStorage.setItem(`${DB_PREFIX}group_members`, JSON.stringify(MOCK_GROUP_MEMBERS));
        localStorage.setItem(`${DB_PREFIX}initialized`, 'true');
    }
}

function getTable(tableName) {
    if (typeof window === 'undefined') return [];
    try {
        const data = localStorage.getItem(`${DB_PREFIX}${tableName}`);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
}

function saveTable(tableName, data) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${DB_PREFIX}${tableName}`, JSON.stringify(data));
}

function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// --- PROXY API ---
export const mockDB = {
    // SELECT
    async select(tableName, options = {}) {
        if (IS_OPEN_MODE) {
            initializeDB();
            let data = getTable(tableName);
            if (options.eq) {
                Object.entries(options.eq).forEach(([key, value]) => {
                    data = data.filter(item => item[key] === value);
                });
            }
            if (options.order) {
                const { column, ascending = true } = options.order;
                data.sort((a, b) => {
                    if (a[column] < b[column]) return ascending ? -1 : 1;
                    if (a[column] > b[column]) return ascending ? 1 : -1;
                    return 0;
                });
            }
            if (options.limit) data = data.slice(0, options.limit);
            return { data, error: null };
        } else {
            // SUPABASE
            let query = supabase.from(tableName).select(options.select || '*');
            if (options.eq) {
                Object.entries(options.eq).forEach(([key, value]) => {
                    query = query.eq(key, value);
                });
            }
            if (options.order) {
                query = query.order(options.order.column, { ascending: options.order.ascending });
            }
            if (options.limit) query = query.limit(options.limit);
            if (options.single) query = query.single();
            
            const { data, error } = await query;
            return { data, error };
        }
    },

    // INSERT
    async insert(tableName, records) {
        if (IS_OPEN_MODE) {
            initializeDB();
            const data = getTable(tableName);
            const newRecords = Array.isArray(records) ? records : [records];
            const recordsWithIds = newRecords.map(record => ({
                id: record.id || generateId(),
                created_at: record.created_at || new Date().toISOString(),
                ...record
            }));
            data.push(...recordsWithIds);
            saveTable(tableName, data);
            return { data: Array.isArray(records) ? recordsWithIds : recordsWithIds[0], error: null };
        } else {
            // SUPABASE
            const { data, error } = await supabase.from(tableName).insert(records).select();
            return { data: Array.isArray(records) ? data : data?.[0], error };
        }
    },

    // UPDATE
    async update(tableName, id, updates) {
        if (IS_OPEN_MODE) {
            initializeDB();
            const data = getTable(tableName);
            const index = data.findIndex(item => item.id === id);
            if (index === -1) return { data: null, error: { message: 'Not found' } };
            data[index] = { ...data[index], ...updates, updated_at: new Date().toISOString() };
            saveTable(tableName, data);
            return { data: data[index], error: null };
        } else {
            // SUPABASE
            const { data, error } = await supabase.from(tableName).update(updates).eq('id', id).select().single();
            return { data, error };
        }
    },

    // DELETE
    async delete(tableName, id) {
        if (IS_OPEN_MODE) {
            initializeDB();
            const data = getTable(tableName);
            const filtered = data.filter(item => item.id !== id);
            saveTable(tableName, filtered);
            return { data: { id }, error: null };
        } else {
            // SUPABASE
            const { error } = await supabase.from(tableName).delete().eq('id', id);
            return { error };
        }
    },

    // UPSERT
    async upsert(tableName, record, conflictKeys = ['id']) {
        if (IS_OPEN_MODE) {
            // Simplified mock upsert
            const res = await this.select(tableName, { eq: { [conflictKeys[0]]: record[conflictKeys[0]] } });
            if (res.data && res.data.length > 0) {
                return this.update(tableName, res.data[0].id, record);
            } else {
                return this.insert(tableName, record);
            }
        } else {
            // SUPABASE
            const { data, error } = await supabase.from(tableName).upsert(record, { onConflict: conflictKeys.join(',') }).select().single();
            return { data, error };
        }
    },

    // COUNT
    async count(tableName, options = {}) {
        if (IS_OPEN_MODE) {
            const res = await this.select(tableName, options);
            return { count: res.data?.length || 0, error: null };
        } else {
            // SUPABASE
            const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
            return { count, error };
        }
    }
};
