const socket = io();
const currentUser = JSON.parse(localStorage.getItem('user'));
const token = localStorage.getItem('token');

if (!token || !currentUser) {
    window.location.href = '/login';
}

document.getElementById('currentUser').textContent = currentUser.name;

const messagesContainer = document.getElementById('messagesContainer');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');

// Join chat
socket.emit('join', { userId: currentUser.id, name: currentUser.name });

// Handle new messages
socket.on('message', (message) => {
    addMessage(message);
});

// Handle user list updates
socket.on('userList', (users) => {
    updateUserList(users);
});

messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    
    if (message) {
        socket.emit('sendMessage', {
            text: message,
            sender: currentUser.name
        });
        messageInput.value = '';
    }
});

function addMessage(message) {
    const messageDiv = document.createElement('div');
    const isOwnMessage = message.sender === currentUser.name;
    
    messageDiv.className = `flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`;
    messageDiv.innerHTML = `
        <div class="max-w-[70%] ${isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-lg px-4 py-2">
            <div class="text-sm font-semibold">${message.sender}</div>
            <div>${message.text}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateUserList(users) {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    users.forEach(user => {
        if (user.id !== currentUser.id) {
            const userDiv = document.createElement('div');
            userDiv.className = 'flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer';
            userDiv.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <i class="fas fa-user text-blue-500"></i>
                </div>
                <div class="font-medium">${user.name}</div>
            `;
            usersList.appendChild(userDiv);
        }
    });
}