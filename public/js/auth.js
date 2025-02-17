const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const loginForm = document.getElementById('login-form');
const toggleAuth = document.getElementById('toggle-auth');

let isLoginMode = true;

// Check token on page load
window.addEventListener('load', () => {
    const token = localStorage.getItem('token');
    if (token) {
        authContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        loadGroups();
    }
});

toggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    const title = document.querySelector('h2');
    const submitBtn = loginForm.querySelector('button');
    
    if (isLoginMode) {
        title.textContent = 'Login';
        submitBtn.textContent = 'Login';
        toggleAuth.textContent = 'Need an account? Register';
    } else {
        title.textContent = 'Register';
        submitBtn.textContent = 'Register';
        toggleAuth.textContent = 'Already have an account? Login';
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                username: email.split('@')[0] // Simple username generation
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            authContainer.classList.add('hidden');
            chatContainer.classList.remove('hidden');
            loadGroups();
        } else {
            alert(data.msg);
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred');
    }
});
