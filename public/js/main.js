document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        password: document.getElementById('password').value
    };

    try {
        const response = await fetch('http://localhost:3000/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            alert('Successfully signed up');
            window.location.href = '/login';
        } else if (response.status === 400) {
            alert('User already exists, Please Login');
        } else {
            alert('Signup failed: ' + data.message);
        }
    } catch (error) {
        alert('Error during signup');
    }
});