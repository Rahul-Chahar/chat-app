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
    const isOwnMessage = message.sender === currentUser.name;
    const messageHTML = createMessage(message, isOwnMessage);
    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateUserList(users) {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    users.forEach(user => {
        if (user.id !== currentUser.id) {
            const userHTML = createUserItem(user);
            usersList.insertAdjacentHTML('beforeend', userHTML);
        }
    });
}