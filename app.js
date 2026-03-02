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

// Escuchar cambios de sesión
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
    const { data: { user } } = await supabase.auth.getUser();

    if (!title) return alert("El título es obligatorio");

    const { error } = await supabase.from('tasks').insert([
        { title, description, user_id: user.id }
    ]);

    if (error) console.error(error);
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
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
        div.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}', ${task.completed})">
            <div class="task-content">
                <strong class="task-text">${task.title}</strong>
                <p style="margin:0; font-size: 0.85rem;">${task.description || ''}</p>
            </div>
            <div class="task-actions">
                <button class="btn-delete" onclick="deleteTask('${task.id}')"><i class="fas fa-trash"></i></button>
            </div>
        `;
        tasksList.appendChild(div);
    });
}

// Funciones globales
window.toggleTask = async (id, status) => {
    await supabase.from('tasks').update({ completed: !status }).eq('id', id);
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

// Función para iniciar sesión con GitHub
async function loginConGitHub() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: 'https://ivygb2028-hue.github.io/AppTareas/'
        }
    });

    if (error) {
        console.error("Error con GitHub:", error.message);
    }
}

// Escuchar el clic del nuevo botón
document.getElementById('github-login').addEventListener('click', loginConGitHub);

// Función para cerrar sesión
async function cerrarSesion() {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        console.error("Error al salir:", error.message);
    } else {
        console.log("Sesión cerrada correctamente");
        // Esto recarga la página para que vuelvas al formulario de entrar
        window.location.reload(); 
    }
}

// Conectar el botón de salir con la función
const botonSalir = document.getElementById('logout-btn');
if (botonSalir) {
    botonSalir.addEventListener('click', cerrarSesion);
}