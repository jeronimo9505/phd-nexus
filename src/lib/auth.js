// Supabase Auth Wrapper
import { supabase } from './supabase';

export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, session: data.session };
}

export async function logout() {
    const { error } = await supabase.auth.signOut();
    return { success: !error, error: error?.message };
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
}

export async function register(userData) {
    const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
            data: {
                full_name: userData.full_name
            }
        }
    });
    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user };
}
