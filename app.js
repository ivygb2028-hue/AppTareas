// 1. CONFIGURACIÓN DE SUPABASE (REMPLAZA CON TUS DATOS)
const supabaseUrl = 'https://fwuihjoenbkjahfhjqjx.supabase.co';
const supabaseKey = 'sb_publishable_9KpL6nw7FWURpbvEsaqvMw_gpqjtGMB';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// VARIABLES DE ESTADO
let currentFilter = 'all';
let currentUser = null;

// ELEMENTOS DEL DOM
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const authForm = document.getElementById('auth-form');
const tasksList = document.getElementById('tasks-list');
const userDisplay = document.getElementById('user-display');

// --- 2. GESTIÓN DE USUARIOS (LOGIN/LOGOUT) ---

// Cambiar entre pestañas de Entrar y Registro
window.switchAuth = (mode) => {
    const submitBtn = document.getElementById('auth-submit-btn');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');

    if (mode === 'login') {
        submitBtn.innerText = 'Entrar';
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        authForm.dataset.mode = 'login';
    } else {
        submitBtn.innerText = 'Registrarse';
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        authForm.dataset.mode = 'signup';
    }
};

// Manejar el envío del formulario de Auth
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const mode = authForm.dataset.mode || 'login';

    if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) alert("Error registro: " + error.message);
        else alert("¡Registro exitoso! Ya puedes entrar.");
    } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert("Error login: " + error.message);
    }
});

// Botón de GitHub
document.getElementById('github-login').addEventListener('click', async () => {
    await supabase.auth.signInWithOAuth({ provider: 'github' });
});

// Botón Salir
document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
});

// Detectar cambios en la sesión
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        authSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        if(userDisplay) userDisplay.innerText = currentUser.email;
        loadTasks();
    } else {
        currentUser = null;
        authSection.classList.remove('hidden');
        appSection.classList.add('hidden');
    }
});

// --- 3. GESTIÓN DE TAREAS (CRUD) ---

// Cargar tareas desde Supabase
async function loadTasks() {
    if (!currentUser) return;
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) console.error("Error cargando:", error);
    else renderTasks(data);
}

// Añadir nueva tarea
document.getElementById('add-task-btn').addEventListener('click', async () => {
    const title = document.getElementById('task-title').value;
    const desc = document.getElementById('task-desc').value;
    const deadline = document.getElementById('task-deadline').value;

    if (!title) return alert("El título es obligatorio");

    const { error } = await supabase.from('tasks').insert([
        { 
            title, 
            description: desc, 
            deadline: deadline || null,
            user_id: currentUser.id,
            completed: false
        }
    ]);

    if (error) alert("Error: " + error.message);
    else {
        document.getElementById('task-title').value = '';
        document.getElementById('task-desc').value = '';
        document.getElementById('task-deadline').value = '';
        loadTasks();
    }
});

// Borrar tarea
window.deleteTask = async (id) => {
    if (confirm("¿Borrar esta tarea?")) {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) console.error(error);
        loadTasks();
    }
};

// Cambiar estado (Checkbox) y GUARDAR RELOJ
window.toggleTask = async (id, status) => {
    const ahora = !status ? new Date().toISOString() : null;

    const { error } = await supabase.from('tasks').update({ 
        completed: !status,
        completed_at: ahora 
    }).eq('id', id);
    
    if (error) console.error(error);
    loadTasks();
};

// --- 4. RENDERIZADO Y FILTROS ---

function renderTasks(tasks) {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
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

        const infoCalendario = task.deadline ? `<span><i class="far fa-calendar-alt"></i> ${task.deadline}</span>` : '';
        
        let infoReloj = '';
        if (task.completed && task.completed_at) {
            const hora = new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            infoReloj = `<span class="completed-at"><i class="far fa-clock"></i> Terminado: ${hora}</span>`;
        }

        div.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}', ${task.completed})">
            <div class="task-content">
                <strong class="task-text">${task.title}</strong>
                <div class="task-meta">${infoCalendario} ${infoReloj}</div>
            </div>
            <button class="btn-delete" onclick="deleteTask('${task.id}')"><i class="fas fa-trash"></i></button>
        `;
        tasksList.appendChild(div);
    });
}

// Filtros
document.querySelectorAll('.filters button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.filters button.active').classList.remove('active');
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        loadTasks();
    });
});

// Buscador en tiempo real
document.getElementById('search-input')?.addEventListener('input', () => {
    loadTasks();
});

