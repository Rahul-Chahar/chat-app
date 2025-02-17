let currentGroup = null;
let currentUserId = null;
const socket = io();

socket.on('new-message', (message) => {
  if (currentGroup && message.groupId === currentGroup.id) {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.appendChild(createMessageElement(message));
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
});

// Get current user info
async function getCurrentUser() {
    try {
        const response = await fetch('/api/auth/user', {
            headers: {
                'x-auth-token': localStorage.getItem('token')
            }
        });
        const user = await response.json();
        currentUserId = user.id;
    } catch (err) {
        console.error(err);
    }
}

// Load groups
async function loadGroups() {
    try {
        const response = await fetch('/api/groups', {
            headers: {
                'x-auth-token': localStorage.getItem('token')
            }
        });
        const groups = await response.json();

        const groupsList = document.getElementById('groups-list');
        groupsList.innerHTML = '';

        groups.forEach(group => {
            const div = document.createElement('div');
            div.className = 'group-item flex justify-between items-center p-2 hover:bg-gray-700 cursor-pointer rounded';

            const groupName = document.createElement('span');
            groupName.textContent = group.name;
            groupName.onclick = () => selectGroup(group);

            const adminControls = document.createElement('div');
            adminControls.className = 'flex items-center space-x-2';

            // Add invite button if admin
            if (group.UserGroups && group.UserGroups.isAdmin) {
                const inviteBtn = document.createElement('button');
                inviteBtn.innerHTML = '<i class="fas fa-user-plus text-sm"></i>';
                inviteBtn.className = 'text-gray-300 hover:text-white';
                inviteBtn.onclick = (e) => {
                    e.stopPropagation();
                    inviteToGroup(group.id);
                };
                adminControls.appendChild(inviteBtn);

                const manageBtn = document.createElement('button');
                manageBtn.innerHTML = '<i class="fas fa-cog text-sm"></i>';
                manageBtn.className = 'text-gray-300 hover:text-white';
                manageBtn.onclick = (e) => {
                    e.stopPropagation();
                    manageGroup(group.id);
                };
                adminControls.appendChild(manageBtn);
            }

            div.appendChild(groupName);
            div.appendChild(adminControls);
            groupsList.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

// Select group
async function selectGroup(group) {
    if (currentGroup) {
        socket.emit('leave-group', currentGroup.id);
    }
    currentGroup = group;
    document.getElementById('current-group').textContent = group.name;
    socket.emit('join-group', group.id);
    loadMessages();
}

// Create message element
function createMessageElement(message) {
    const isOwnMessage = message.user.id === currentUserId;
    const div = document.createElement('div');
    div.className = `flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`;

    const messageContent = document.createElement('div');
    messageContent.className = `max-w-[70%] rounded-lg p-3 ${
        isOwnMessage
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-800'
    }`;

    const header = document.createElement('div');
    header.className = 'text-sm font-bold mb-1';
    header.textContent = message.user.username;
    messageContent.appendChild(header);

    const content = document.createElement('div');
    content.className = 'break-words';
    content.textContent = message.content;
    messageContent.appendChild(content);

    // Handle file attachments
    if (message.fileUrl) {
        const fileContainer = document.createElement('div');
        fileContainer.className = 'mt-2';

        if (message.fileType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = message.fileUrl;
            img.className = 'max-w-full rounded-lg cursor-pointer';
            img.onclick = () => window.open(message.fileUrl, '_blank');
            fileContainer.appendChild(img);
        } else if (message.fileType.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = message.fileUrl;
            video.className = 'max-w-full rounded-lg';
            video.controls = true;
            fileContainer.appendChild(video);
        } else {
            const fileLink = document.createElement('a');
            fileLink.href = message.fileUrl;
            fileLink.className = 'text-blue-300 underline';
            fileLink.target = '_blank';
            fileLink.textContent = 'Download File';
            fileContainer.appendChild(fileLink);
        }

        messageContent.appendChild(fileContainer);
    }

    const timestamp = document.createElement('div');
    timestamp.className = 'text-xs text-gray-500 mt-1';
    timestamp.textContent = new Date(message.timestamp).toLocaleString();
    messageContent.appendChild(timestamp);

    div.appendChild(messageContent);
    return div;
}

// Load messages
async function loadMessages() {
    if (!currentGroup) return;

    try {
        const response = await fetch(`/api/messages/${currentGroup.id}`, {
            headers: {
                'x-auth-token': localStorage.getItem('token')
            }
        });

        if (response.status === 403) {
            // User is no longer a member of the group
            alert('You are no longer a member of this group');
            currentGroup = null;
            document.getElementById('current-group').textContent = '';
            document.getElementById('messages').innerHTML = '';
            // Reload groups to update the list
            loadGroups();
            return;
        }

        const messages = await response.json();

        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';

        // Sort messages by timestamp and display them
        messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .forEach(message => {
                messagesContainer.appendChild(createMessageElement(message));
            });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (err) {
        console.error(err);
        if (err.message.includes('not a member')) {
            alert('You are no longer a member of this group');
            currentGroup = null;
            document.getElementById('current-group').textContent = '';
            document.getElementById('messages').innerHTML = '';
            loadGroups();
        }
    }
}

// Send message
async function sendMessage(content, file) {
    if (!currentGroup) return;

    try {
        const formData = new FormData();
        if (content) formData.append('content', content);
        if (file) formData.append('file', file);

        const response = await fetch(`/api/messages/${currentGroup.id}`, {
            method: 'POST',
            headers: {
                'x-auth-token': localStorage.getItem('token')
            },
            body: formData
        });

        if (response.status === 403) {
            // User is no longer a member of the group
            alert('You are no longer a member of this group');
            currentGroup = null;
            document.getElementById('current-group').textContent = '';
            document.getElementById('messages').innerHTML = '';
            loadGroups();
            return;
        }

        if (response.ok) {
            const result = await response.json();
            console.log('Message sent:', result);
            socket.emit('send-message', result);
        } else {
            console.error('Failed to send message:', await response.text());
        }
    } catch (err) {
        console.error('Error sending message:', err);
    }
}

// Add these new functions
async function inviteToGroup(groupId) {
    const email = prompt('Enter user email to invite:');
    if (!email) return;

    try {
        const response = await fetch(`/api/groups/${groupId}/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': localStorage.getItem('token')
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        if (response.ok) {
            alert('User invited successfully');
        } else {
            alert(data.msg || 'Error inviting user');
        }
    } catch (err) {
        console.error(err);
        alert('Error inviting user');
    }
}

async function manageGroup(groupId) {
    try {
        // Get group members
        const response = await fetch(`/api/groups/${groupId}/members`, {
            headers: {
                'x-auth-token': localStorage.getItem('token')
            }
        });

        const members = await response.json();

        // Create and show modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-96">
                <h3 class="text-xl font-bold mb-4">Manage Group Members</h3>
                <div id="members-list" class="space-y-2 max-h-64 overflow-y-auto">
                    ${members.map(member => `
                        <div class="flex justify-between items-center p-2 bg-gray-100 rounded">
                            <span>${member.username}</span>
                            <div class="space-x-2">
                                ${member.isAdmin ? 
                                    `<button onclick="removeAdmin(${groupId}, ${member.id})" class="text-red-500">
                                        Remove Admin
                                    </button>` :
                                    `<button onclick="makeAdmin(${groupId}, ${member.id})" class="text-blue-500">
                                        Make Admin
                                    </button>`
                                }
                                <button onclick="removeMember(${groupId}, ${member.id})" class="text-red-500">
                                    Remove
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="mt-4 w-full bg-gray-500 text-white py-2 rounded">
                    Close
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (err) {
        console.error(err);
        alert('Error managing group');
    }
}

async function makeAdmin(groupId, userId) {
    try {
        const response = await fetch(`/api/groups/${groupId}/admins`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': localStorage.getItem('token')
            },
            body: JSON.stringify({ userId })
        });

        if (response.ok) {
            alert('User promoted to admin');
            manageGroup(groupId); // Refresh the modal
        } else {
            const data = await response.json();
            alert(data.msg || 'Error making admin');
        }
    } catch (err) {
        console.error(err);
        alert('Error making admin');
    }
}

async function removeAdmin(groupId, userId) {
    try {
        const response = await fetch(`/api/groups/${groupId}/admins/${userId}`, {
            method: 'DELETE',
            headers: {
                'x-auth-token': localStorage.getItem('token')
            }
        });

        if (response.ok) {
            alert('Admin status removed');
            manageGroup(groupId); // Refresh the modal
        } else {
            const data = await response.json();
            alert(data.msg || 'Error removing admin status');
        }
    } catch (err) {
        console.error(err);
        alert('Error removing admin status');
    }
}

async function removeMember(groupId, userId) {
    if (!confirm('Are you sure you want to remove this user?')) return;

    try {
        const response = await fetch(`/api/groups/${groupId}/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'x-auth-token': localStorage.getItem('token')
            }
        });

        if (response.ok) {
            alert('User removed from group');
            manageGroup(groupId); // Refresh the modal
        } else {
            const data = await response.json();
            alert(data.msg || 'Error removing user');
        }
    } catch (err) {
        console.error(err);
        alert('Error removing user');
    }
}

// Event listeners
document.getElementById('message-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const input = document.getElementById('message-input');
    const fileInput = document.getElementById('file-input');
    const content = input.value.trim();
    const file = fileInput.files[0];

    if (!content && !file) return;

    await sendMessage(content, file);
    input.value = '';
    fileInput.value = '';
});

// New group creation
document.getElementById('new-group-btn').addEventListener('click', async () => {
    const name = prompt('Enter group name:');
    if (!name) return;

    try {
        const response = await fetch('/api/groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': localStorage.getItem('token')
            },
            body: JSON.stringify({ name })
        });

        if (response.ok) {
            await loadGroups();
        } else {
            const error = await response.json();
            alert(error.msg || 'Error creating group');
        }
    } catch (err) {
        console.error(err);
        alert('Error creating group');
    }
});

// Initialize
if (localStorage.getItem('token')) {
    getCurrentUser().then(() => {
        loadGroups();
    });
}