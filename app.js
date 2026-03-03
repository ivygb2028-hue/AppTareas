import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://fwuihjoenbkjahfhjqjx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9KpL6nw7FWURpbvEsaqvMw_gpqjtGMB';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ELEMENTOS DEL DOM
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const authForm = document.getElementById('auth-form');
const tasksList = document.getElementById('tasks-list');
let currentFilter = 'all';

// --- 1. GESTIÓN DE AUTENTICACIÓN ---

supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        authSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        document.getElementById('user-display').innerText = session.user.email;
        loadTasks();
    } else {
        authSection.classList.remove('hidden');
        appSection.classList.add('hidden');
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const isLogin = document.getElementById('tab-login').classList.contains('active');

    if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
    } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) alert("Revisa tu correo para confirmar el registro");
    }
});

document.getElementById('logout-btn').onclick = () => supabase.auth.signOut();

// --- 2. GESTIÓN DE TAREAS (CRUD) ---

document.getElementById('add-task-btn').onclick = async () => {
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-desc').value;
    const deadline = document.getElementById('task-deadline').value; // Valor del calendario
    const { data: { user } } = await supabase.auth.getUser();

    if (!title) return alert("El título es obligatorio");

    const { error } = await supabase.from('tasks').insert([
        { 
            title, 
            description, 
            user_id: user.id,
            deadline: deadline || null // Se guarda la fecha elegida
        }
    ]);

    if (error) console.error(error);
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    document.getElementById('task-deadline').value = '';
    loadTasks();
};

async function loadTasks() {
    let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
    const { data: tasks, error } = await query;
    if (error) return console.error(error);
    renderTasks(tasks);
}

// --- 3. UI Y FILTROS ---

function renderTasks(tasks) {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    tasksList.innerHTML = '';

    const filtered = tasks.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchTerm);
        if (currentFilter === 'pending') return !t.completed && matchesSearch;
        if (currentFilter === 'completed') return t.completed && matchesSearch;
        return matchesSearch;
    });

    filtered.forEach(task => {
        const div = document.createElement('div');
        div.className = `task-item ${task.completed ? 'completed' : ''}`;
        
        // Formatear la fecha del calendario (si existe)
        const infoCalendario = task.deadline ? `<span>📅 Límite: ${task.deadline}</span>` : '';
        
        // Formatear el reloj (hora de completado)
        let infoReloj = '';
        if (task.completed && task.completed_at) {
            const fechaHora = new Date(task.completed_at);
            const horaHumana = fechaHora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            infoReloj = `<span class="completed-at">🕒 Terminado: ${horaHumana}</span>`;
        }

        div.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}', ${task.completed})">
            <div class="task-content">
                <strong class="task-text">${task.title}</strong>
                <p style="margin:0; font-size: 0.85rem; color: #555;">${task.description || ''}</p>
                <div class="task-meta" style="display: flex; gap: 10px; font-size: 0.75rem; margin-top: 5px; color: #7f8c8d;">
                    ${infoCalendario}
                    ${infoReloj}
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-delete" style="background:none; color:#ef4444; border:none; cursor:pointer;" onclick="deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        tasksList.appendChild(div);
    });
}

// Funciones globales vinculadas al window para que el HTML las encuentre
window.toggleTask = async (id, status) => {
    // Si la tarea se va a marcar como completada (status actual es false), guardamos la hora actual
    const timestampCompletado = !status ? new Date().toISOString() : null;

    await supabase.from('tasks').update({ 
        completed: !status,
        completed_at: timestampCompletado 
    }).eq('id', id);
    
    loadTasks();
};

window.deleteTask = async (id) => {
    if(confirm('¿Borrar tarea?')) {
        await supabase.from('tasks').delete().eq('id', id);
        loadTasks();
    }
};

// Eventos de Filtros
document.querySelectorAll('.filters button').forEach(btn => {
    btn.onclick = (e) => {
        document.querySelector('.filters button.active').classList.remove('active');
        e.target.classList.add('active');
        currentFilter = e.target.dataset.filter;
        loadTasks();
    };
});

document.getElementById('search-input').oninput = () => loadTasks();

window.switchAuth = (type) => {
    document.getElementById('tab-login').classList.toggle('active', type === 'login');
    document.getElementById('tab-signup').classList.toggle('active', type === 'signup');
    document.getElementById('auth-submit-btn').innerText = type === 'login' ? 'Entrar' : 'Registrarse';
};

// GitHub Login
async function loginConGitHub() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: 'https://ivygb2028-hue.github.io/AppTareas/' }
    });
    if (error) console.error("Error con GitHub:", error.message);
}

document.getElementById('github-login').addEventListener('click', loginConGitHub);

// Salir
document.getElementById('logout-btn').onclick = async () => {
    await supabase.auth.signOut();
    window.location.reload(); 
};