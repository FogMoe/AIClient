// 多语言支持
const translations = {
    'zh-CN': {
        'page.title': '雾萌AI',
        'app.name': '雾萌',
        'sidebar.newChat': '新建对话',
        'sidebar.today': '今天',
        'welcome.greeting': '早上好',
        'welcome.subtitle': '今天有什么可以帮你吗？',
        'input.placeholder': '向 雾萌 发送消息',
        'input.hint': '雾萌AI生成内容仅供参考，请自行甄别其准确性。',
        'modal.title': '提示',
        'modal.ok': '确定',
        'messages.thinking': 'AI正在思考中...',
        'messages.error': '抱歉，AI服务暂时不可用，请稍后再试',
        'messages.networkError': '网络连接已断开，请检查您的网络设置',
        'messages.serverError': '无法连接到服务器，请确保服务器正在运行',
        'messages.welcome': '您好！我是雾萌AI助手，有什么可以帮助您的吗？',
        'time.justNow': '刚刚',
        'time.minutesAgo': '{0}分钟前',
        'time.hoursAgo': '{0}小时前'
    },
    'en': {
        'page.title': 'FOGMOE AI Assistant',
        'app.name': 'FOGMOE',
        'sidebar.newChat': 'New Chat',
        'sidebar.today': 'Today',
        'welcome.greeting': 'Good morning',
        'welcome.subtitle': 'What can I help you with today?',
        'input.placeholder': 'Send a message to FOGMOE',
        'input.hint': 'FOGMOE uses AI, which may not always be accurate. Conversations may not accurately represent reality.',
        'modal.title': 'Notice',
        'modal.ok': 'OK',
        'messages.thinking': 'AI is thinking...',
        'messages.error': 'Sorry, AI service is temporarily unavailable. Please try again later.',
        'messages.networkError': 'Network connection lost. Please check your network settings.',
        'messages.serverError': 'Unable to connect to server. Please ensure the server is running.',
        'messages.welcome': 'Hello! I am FOGMOE AI assistant. How can I help you?',
        'time.justNow': 'Just now',
        'time.minutesAgo': '{0} minutes ago',
        'time.hoursAgo': '{0} hours ago'
    }
};

// 暂时锁定为简体中文
let currentLanguage = 'zh-CN'; // localStorage.getItem('language') || 'zh-CN';

// DOM元素
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatMessages = document.getElementById('chatMessages');
const welcomeScreen = document.getElementById('welcomeScreen');
const typingIndicator = document.getElementById('typingIndicator');
const errorModal = document.getElementById('errorModal');
const errorMessage = document.getElementById('errorMessage');
const newChatBtn = document.getElementById('newChatBtn');
const exportBtn = document.getElementById('exportBtn');
const languageToggle = document.getElementById('languageToggle');
const currentLangSpan = document.getElementById('currentLang');
const chatList = document.getElementById('chatList');

// 初始化
let chatHistory = [];
let currentChatId = null;

// 会话唯一ID
let sessionId = localStorage.getItem('sessionId');
if (!sessionId) {
    sessionId = 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('sessionId', sessionId);
}

// 多语言函数
function t(key, ...args) {
    let text = translations[currentLanguage][key] || key;
    args.forEach((arg, index) => {
        text = text.replace(`{${index}}`, arg);
    });
    return text;
}

function updateLanguage() {
    document.documentElement.lang = currentLanguage;
    
    // 更新所有带有 data-i18n 属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = t(key);
    });
    
    // 更新 placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });
    
    // 更新 title
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        element.title = t(key);
    });
    
    // 更新语言显示 (暂时锁定为简体中文)
    currentLangSpan.textContent = '简体中文'; // currentLanguage === 'zh-CN' ? '简体中文' : 'English';
    
    // 更新欢迎消息中的时间
    updateWelcomeGreeting();
    
    // 保存语言设置 (暂时禁用)
    // localStorage.setItem('language', currentLanguage);
}

function updateWelcomeGreeting() {
    const now = new Date();
    const hour = now.getHours();
    let greeting;
    
    if (currentLanguage === 'zh-CN') {
        if (hour < 12) greeting = '早上好';
        else if (hour < 18) greeting = '下午好';
        else greeting = '晚上好';
    } else {
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 18) greeting = 'Good afternoon';
        else greeting = 'Good evening';
    }
    
    const greetingElement = document.querySelector('[data-i18n="welcome.greeting"]');
    if (greetingElement) {
        greetingElement.textContent = greeting;
    }
}

// 事件监听
messageForm.addEventListener('submit', handleSubmit);
messageInput.addEventListener('keypress', handleKeyPress);
messageInput.addEventListener('input', handleInput);
newChatBtn.addEventListener('click', startNewChat); // 恢复新建对话功能
exportBtn.addEventListener('click', exportChatHistory); // 添加导出功能
languageToggle.addEventListener('click', toggleLanguage);

// 语言切换 (暂时禁用)
function toggleLanguage() {
    // 暂时禁用语言切换功能，显示提示信息
    showErrorModal('Sorry, we currently only support Simplified Chinese.\n很抱歉，我们目前仅支持简体中文。');
    
    // 原本的语言切换代码（暂时注释）
    // currentLanguage = currentLanguage === 'zh-CN' ? 'en' : 'zh-CN';
    // updateLanguage();
}

// 新建对话
function startNewChat() {
    currentChatId = Date.now().toString();
    chatHistory = [];
    chatMessages.style.display = 'none';
    welcomeScreen.style.display = 'flex';
    updateChatList();
}

// 处理表单提交
async function handleSubmit(e) {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // 如果是第一条消息，隐藏欢迎屏幕
    if (welcomeScreen.style.display !== 'none') {
        welcomeScreen.style.display = 'none';
        chatMessages.style.display = 'flex';
        if (!currentChatId) {
            currentChatId = Date.now().toString();
        }
    }
    
    // 添加用户消息
    addMessage(message, 'user');
    
    // 清空输入框并禁用
    messageInput.value = '';
    setInputState(false);
    
    // 显示打字指示器
    showTypingIndicator();
    
    try {
        // 构建对话历史，用于发送给服务器
        const conversationHistory = chatHistory.map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.text
        }));
        
        // 发送消息和对话历史到服务器
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message,
                history: conversationHistory,
                sessionId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 隐藏打字指示器
        hideTypingIndicator();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // 添加AI回复
        addMessage(data.response, 'assistant');
        
        // 更新聊天列表
        updateChatList();
        
    } catch (error) {
        console.error('发送消息时出错:', error);
        hideTypingIndicator();
        showErrorModal(error.message || t('messages.error'));
    } finally {
        // 重新启用输入
        setInputState(true);
        messageInput.focus();
    }
}

// 处理按键事件
function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (messageInput.value.trim() && !sendButton.disabled) {
            handleSubmit(e);
        }
    }
}

// 处理输入变化
function handleInput() {
    const hasText = messageInput.value.trim().length > 0;
    sendButton.style.opacity = hasText ? '1' : '0.6';
}

// 更新聊天列表 (已禁用)
function updateChatList() {
    // 功能已禁用，不再更新聊天历史记录
    return;
}

// 添加消息到聊天窗口
function addMessage(text, type, timestamp = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    
    if (type === 'user') {
        avatarDiv.innerHTML = '<div class="avatar-icon"><i class="fas fa-user"></i></div>';
    } else {
        avatarDiv.innerHTML = '<div class="avatar-icon"><i class="fas fa-cloud"></i></div>';
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = text;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = formatTime(timestamp || new Date());
    
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(timeDiv);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    
    // 添加到聊天历史
    chatHistory.push({
        text: text,
        type: type,
        timestamp: timestamp || new Date().toISOString()
    });
    
    scrollToBottom();
}

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const locale = currentLanguage === 'zh-CN' ? 'zh-CN' : 'en-US';
    
    // 显示具体的日期时间
    if (currentLanguage === 'zh-CN') {
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    } else {
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }
}

// 滚动到底部
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 显示打字指示器
function showTypingIndicator() {
    typingIndicator.style.display = 'block';
    scrollToBottom();
}

// 隐藏打字指示器
function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
}

// 设置输入状态
function setInputState(enabled) {
    messageInput.disabled = !enabled;
    sendButton.disabled = !enabled;
    
    if (enabled) {
        messageInput.placeholder = t('input.placeholder');
    } else {
        messageInput.placeholder = t('messages.thinking');
    }
}

// 显示错误模态框
function showErrorModal(message) {
    // 将换行符转换为HTML换行标签
    errorMessage.innerHTML = message.replace(/\n/g, '<br>');
    errorModal.style.display = 'flex';
}

// 关闭错误模态框
function closeErrorModal() {
    errorModal.style.display = 'none';
}

// 点击模态框背景关闭
errorModal.addEventListener('click', (e) => {
    if (e.target === errorModal) {
        closeErrorModal();
    }
});

// ESC键关闭模态框
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && errorModal.style.display === 'flex') {
        closeErrorModal();
    }
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化语言
    updateLanguage();
    
    // 聚焦输入框
    messageInput.focus();
    
    // 检查服务器连接
    checkServerConnection();
    
    // 初始化单一对话模式
    currentChatId = 'single-chat';
    chatHistory = [];
    // 直接显示欢迎屏幕，无需新建对话功能
});

// 检查服务器连接
async function checkServerConnection() {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: 'ping' })
        });
        
        if (response.ok) {
            console.log('服务器连接正常');
        }
    } catch (error) {
        console.warn('服务器连接检查失败:', error);
        showErrorModal(t('messages.serverError'));
    }
}

// 自动调整输入框高度（如果需要支持多行）
function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 导出聊天历史记录功能
function exportChatHistory() {
    if (chatHistory.length === 0) {
        showErrorModal('当前没有聊天记录可以导出。');
        return;
    }
    
    try {
        // 格式化聊天记录
        let exportText = '雾萌AI 聊天记录\n';
        exportText += '=' .repeat(30) + '\n';
        exportText += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
        exportText += `会话ID: ${sessionId}\n`;
        exportText += `消息总数: ${chatHistory.length}\n`;
        exportText += '=' .repeat(30) + '\n\n';
        
        chatHistory.forEach((message, index) => {
            const time = formatTime(message.timestamp);
            const sender = message.type === 'user' ? '用户' : '雾萌AI';
            
            exportText += `[${time}] ${sender}:\n`;
            exportText += `${message.text}\n\n`;
        });
        
        exportText += '=' .repeat(30) + '\n';
        exportText += '导出完成 - 感谢使用雾萌AI\n';
        
        // 创建并下载文件
        const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        
        // 生成文件名
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
        a.download = `雾萌AI聊天记录_${dateStr}.txt`;
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // 清理URL对象
        window.URL.revokeObjectURL(url);
        
        console.log('聊天记录导出成功');
        
    } catch (error) {
        console.error('导出聊天记录失败:', error);
        showErrorModal('导出聊天记录时发生错误，请稍后再试。');
    }
}

// 网络状态监听
window.addEventListener('online', () => {
    console.log('网络已连接');
});

window.addEventListener('offline', () => {
    console.log('网络已断开');
    showErrorModal(t('messages.networkError'));
}); 