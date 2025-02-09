// Initialize socket and get user data
const socket = io();
const currentUser = JSON.parse(localStorage.getItem('user'));
const token = localStorage.getItem('token');

// DOM Elements
const messagesContainer = document.getElementById('messagesContainer');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const usersList = document.getElementById('usersList');
const currentUserElement = document.getElementById('currentUser');

// Check authentication
if (!token || !currentUser) {
    window.location.href = '/login';
}

// Set current user's name
currentUserElement.textContent = currentUser.name;

// Socket event handlers
socket.on('connect', () => {
    socket.emit('join', {
        userId: currentUser.id,
        name: currentUser.name
    });
});

socket.on('previousMessages', (messages) => {
    messagesContainer.innerHTML = '';
    messages.forEach(message => {
        addMessage({
            text: message.message,
            sender: message.sender.name,
            senderId: message.senderId,
            timestamp: new Date(message.createdAt)
        });
    });
    scrollToBottom();
});

socket.on('message', (message) => {
    addMessage(message);
    scrollToBottom();
});

socket.on('userList', (users) => {
    updateUserList(users);
});

socket.on('messageError', (error) => {
    showError(error.error);
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    showError('Connection error');
});

// Form submission handler
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = messageInput.value.trim();
    
    if (messageText) {
        try {
            socket.emit('sendMessage', {
                text: messageText,
                sender: currentUser.name,
                timestamp: new Date()
            });

            messageInput.value = '';
            messageInput.focus();
        } catch (error) {
            console.error('Error sending message:', error);
            showError('Failed to send message');
        }
    }
});

// Helper functions
function addMessage(message) {
    const isOwnMessage = message.sender === currentUser.name;
    const messageTime = formatTime(message.timestamp || new Date());
    
    const messageHTML = `
        <div class="flex ${isOwnMessage ? 'justify-end' : 'justify-start'}">
            ${!isOwnMessage ? `
                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <i class="fas fa-user text-blue-600"></i>
                </div>
            ` : ''}
            <div class="max-w-[70%]">
                ${!isOwnMessage ? `
                    <p class="text-sm text-gray-500 mb-1">${message.sender}</p>
                ` : ''}
                <div class="${isOwnMessage ? 'bg-blue-600 text-white' : 'bg-gray-100'} rounded-2xl px-4 py-2">
                    <p>${escapeHTML(message.text)}</p>
                </div>
                <p class="text-xs text-gray-400 mt-1">${messageTime}</p>
            </div>
            ${isOwnMessage ? `
                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center ml-3">
                    <i class="fas fa-user text-blue-600"></i>
                </div>
            ` : ''}
        </div>
    `;
    
    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
}

function updateUserList(users) {
    usersList.innerHTML = '';
    
    users.forEach(user => {
        if (user.id !== currentUser.id) {
            const userHTML = `
                <div class="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <div class="relative">
                        <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <i class="fas fa-user text-blue-600"></i>
                        </div>
                        <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div class="flex-1">
                        <h4 class="font-semibold">${escapeHTML(user.name)}</h4>
                        <p class="text-sm text-gray-500">Active now</p>
                    </div>
                </div>
            `;
            usersList.insertAdjacentHTML('beforeend', userHTML);
        }
    });
    
    const onlineCount = users.length;
    document.querySelector('#chatHeader').textContent = 
        `Group Chat (${onlineCount} ${onlineCount === 1 ? 'member' : 'members'})`;
}

function formatTime(date) {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit'
    });
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showError(message) {
    const errorHTML = `
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <p>${escapeHTML(message)}</p>
        </div>
    `;
    messagesContainer.insertAdjacentHTML('beforeend', errorHTML);
    scrollToBottom();
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Reconnection handling
socket.on('disconnect', () => {
    setTimeout(() => {
        socket.connect();
    }, 1000);
});