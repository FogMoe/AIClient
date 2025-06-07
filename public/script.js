// 多语言支持
const translations = {
    'zh-CN': {
        'page.title': '雾萌娘',
        'app.name': '雾萌娘',
        'sidebar.newChat': '新建对话',
        'sidebar.today': '今天',
        'welcome.greeting': '早上好',
        'welcome.subtitle': '有什么我可以帮忙吗？',
        'input.placeholder': '向 雾萌娘 发送消息',
        'input.hint': 'AI生成内容仅供参考，请自行甄别其准确性。',
        'modal.title': '提示',
        'modal.ok': '确定',
        'modal.cancel': '取消',
        'modal.confirm': '确认',
        'messages.thinking': '雾萌娘正在思考中...',
        'messages.error': '抱歉，AI服务暂时不可用，请稍后再试',
        'messages.networkError': '网络连接已断开，请检查您的网络设置',
        'messages.serverError': '无法连接到服务器，请确保服务器正在运行',
        'messages.welcome': '您好！我是雾萌娘，有什么可以帮助您的吗？',
        'time.justNow': '刚刚',
        'time.minutesAgo': '{0}分钟前',
        'time.hoursAgo': '{0}小时前',
        'confirm.clearHistory': '确定要清空当前聊天记录吗？',
        'error.clearHistoryFailed': '清除聊天记录失败。',
        'error.clearHistoryNetwork': '清除聊天记录时发生网络错误。'
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
        'modal.cancel': 'Cancel',
        'modal.confirm': 'Confirm',
        'messages.thinking': 'AI is thinking...',
        'messages.error': 'Sorry, AI service is temporarily unavailable. Please try again later.',
        'messages.networkError': 'Network connection lost. Please check your network settings.',
        'messages.serverError': 'Unable to connect to server. Please ensure the server is running.',
        'messages.welcome': 'Hello! I am FOGMOE AI assistant. How can I help you?',
        'time.justNow': 'Just now',
        'time.minutesAgo': '{0} minutes ago',
        'time.hoursAgo': '{0} hours ago',
        'confirm.clearHistory': 'Are you sure you want to clear the current chat history?',
        'error.clearHistoryFailed': 'Failed to clear chat history from the server, but local history has been cleared.',
        'error.clearHistoryNetwork': 'A network error occurred while clearing chat history.'
    }
};

// 暂时锁定为简体中文
let currentLanguage = 'zh-CN'; // localStorage.getItem('language') || 'zh-CN';

// Markdown 配置
if (typeof marked !== 'undefined') {
    // 配置 marked
    marked.setOptions({
        highlight: function(code, language) {
            if (typeof hljs !== 'undefined' && language && hljs.getLanguage(language)) {
                try {
                    return hljs.highlight(code, { language: language }).value;
                } catch (err) {}
            }
            return code;
        },
        langPrefix: 'hljs language-',
        breaks: true,
        gfm: true
    });
}

// 复制消息功能
async function copyMessage(text, button) {
    try {
        // 使用现代的 Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            // 降级方案：使用传统的复制方法
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
        
        // 显示复制成功的反馈
        const originalIcon = button.innerHTML;
        const originalTitle = button.title;
        
        button.innerHTML = '<i class="fas fa-check"></i>';
        button.title = '已复制';
        button.classList.add('copied');
        
        // 2秒后恢复原始状态
        setTimeout(() => {
            button.innerHTML = originalIcon;
            button.title = originalTitle;
            button.classList.remove('copied');
        }, 2000);
        
    } catch (error) {
        // 静默处理复制失败
        
        // 显示复制失败的反馈
        const originalIcon = button.innerHTML;
        const originalTitle = button.title;
        
        button.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        button.title = '复制失败';
        button.classList.add('copy-error');
        
        setTimeout(() => {
            button.innerHTML = originalIcon;
            button.title = originalTitle;
            button.classList.remove('copy-error');
        }, 2000);
    }
}

// 安全的HTML清理函数 - 使用DOMPurify
function sanitizeHtml(html) {
    if (typeof DOMPurify !== 'undefined') {
        // 使用DOMPurify进行专业的HTML清理
        return DOMPurify.sanitize(html, {
            // 允许的标签
            ALLOWED_TAGS: [
                'p', 'br', 'strong', 'em', 'u', 'strike', 'code', 'pre',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'ul', 'ol', 'li',
                'blockquote', 'hr',
                'a', 'img',
                'table', 'thead', 'tbody', 'tr', 'th', 'td'
            ],
            // 允许的属性
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class'],
            // 为外部链接添加安全属性
            ADD_ATTR: ['target', 'rel'],
            // 禁止危险的协议
            ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
            // 添加安全的rel属性
            HOOK_AFTER_SANITIZE: function(currentNode) {
                if (currentNode.tagName === 'A' && currentNode.hasAttribute('href')) {
                    const href = currentNode.getAttribute('href');
                    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                        currentNode.setAttribute('target', '_blank');
                        currentNode.setAttribute('rel', 'noopener noreferrer');
                    }
                }
            }
        });
    } else {
        // 降级方案：基本的文本转义
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
}

// Markdown 渲染函数
function renderMarkdown(text) {
    if (typeof marked === 'undefined') {
        return text.replace(/\n/g, '<br>');
    }
    
    try {
        const rendered = marked.parse(text);
        return sanitizeHtml(rendered);
    } catch (error) {
        // 静默处理Markdown解析错误
        return text.replace(/\n/g, '<br>');
    }
}

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

// 用户信息相关DOM元素
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const userCoins = document.getElementById('userCoins');
const logoutBtn = document.getElementById('logoutBtn');

// 界面状态管理元素
const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('appContainer');

// 初始化
let chatHistory = [];
let currentChatId = null;
let currentUser = null; // 存储当前用户信息

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

// 初始化基础事件监听器（在页面加载时就绑定）
function initializeBaseEventListeners() {
    // 模态框相关事件监听器
    if (errorModal) {
        // 点击模态框背景关闭
        errorModal.addEventListener('click', (e) => {
            if (e.target === errorModal) {
                closeErrorModal();
            }
        });
    }

    // 模态框确定按钮事件监听器
    const modalOkBtn = document.querySelector('#errorModal .btn-primary');
    if (modalOkBtn) {
        modalOkBtn.addEventListener('click', closeErrorModal);
    }

    // ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && errorModal && errorModal.style.display === 'flex') {
            closeErrorModal();
        }
    });
    
    // 页面重新获得焦点时重新加载聊天记录
    window.addEventListener('focus', () => {
        // 只有在用户已登录且聊天应用已初始化时才重新加载
        if (currentUser && chatHistory !== undefined) {
            // 记录当前滚动位置
            const currentScrollTop = chatMessages ? chatMessages.scrollTop : 0;
            const currentScrollHeight = chatMessages ? chatMessages.scrollHeight : 0;
            const currentClientHeight = chatMessages ? chatMessages.clientHeight : 0;
            
            // 计算滚动位置比例（从底部开始计算）
            const scrollFromBottom = currentScrollHeight - currentScrollTop - currentClientHeight;
            
            reloadChatHistory().then(() => {
                // 重新加载后恢复滚动位置
                if (chatMessages && scrollFromBottom >= 0) {
                    // 使用setTimeout确保DOM已更新
                    setTimeout(() => {
                        const newScrollHeight = chatMessages.scrollHeight;
                        const newClientHeight = chatMessages.clientHeight;
                        const newScrollTop = newScrollHeight - newClientHeight - scrollFromBottom;
                        chatMessages.scrollTop = Math.max(0, newScrollTop);
                    }, 10);
                }
            });
        }
    });
}

// 初始化聊天相关事件监听器（在登录成功后绑定）
function initializeChatEventListeners() {
    if (messageForm) {
        messageForm.addEventListener('submit', handleSubmit);
    }
    if (messageInput) {
        messageInput.addEventListener('keypress', handleKeyPress);
        messageInput.addEventListener('input', handleInput);
    }
    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewChat);
    }
    if (exportBtn) {
        exportBtn.addEventListener('click', exportChatHistory);
    }
    if (languageToggle) {
        languageToggle.addEventListener('click', toggleLanguage);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// 语言切换 (暂时禁用)
function toggleLanguage() {
    // 暂时禁用语言切换功能，显示提示信息
    showErrorModal('Sorry, we currently only support Simplified Chinese.\n很抱歉，我们目前仅支持简体中文。');
    
    // 原本的语言切换代码（暂时注释）
    // currentLanguage = currentLanguage === 'zh-CN' ? 'en' : 'zh-CN';
    // updateLanguage();
}

// 新建对话
async function startNewChat() {
    // 使用自定义确认模态框
    showConfirmModal(
        t('confirm.clearHistory', '确定要清空当前聊天记录吗？'),
        async () => {
            // 如果用户已登录，则尝试从后端删除聊天记录
            if (currentUser) {
                try {
                    const userId = getCurrentUserId();
                    if (userId) {
                        const response = await fetch(`/api/chat-history/${userId}`, {
                            method: 'DELETE',
                        });
                        if (!response.ok) {
                            const errorData = await response.json();
                            console.error('Failed to delete chat history from server:', errorData.message);
                            // 即使后端删除失败，也继续清空前端，或给出提示
                            showErrorModal(t('error.clearHistoryFailed', '清除聊天记录失败。'));
                        }
                    }
                } catch (error) {
                    console.error('Error deleting chat history from server:', error);
                    showErrorModal(t('error.clearHistoryNetwork', '清除聊天记录时发生网络错误。'));
                }
            }

            // 清空前端聊天记录和界面
            currentChatId = Date.now().toString(); // 为新对话生成新的ID
            chatHistory = [];
            chatMessages.innerHTML = '';
            chatMessages.style.display = 'none';
            welcomeScreen.style.display = 'flex';
            updateChatList(); // 更新侧边栏的聊天列表（如果适用）
        }
    );
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
    
    // 格式化消息：添加时间戳和用户名（用于后端存储）
    const now = new Date();
    const messageTime = formatTime(now.getTime());
    const userName = currentUser ? currentUser.name : '用户';
    const formattedMessage = `${messageTime} @${userName} 说：\n${message}`;
    
    // 添加用户消息（显示原始消息）
    addMessage(message, 'user');
    
    // 清空输入框并禁用
    messageInput.value = '';
    // 重置输入框高度
    messageInput.style.height = 'auto';
    setInputState(false);
    
    // 显示打字指示器
    showTypingIndicator();
    
    try {
        // 构建对话历史，用于发送给服务器
        const conversationHistory = chatHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        
        // 发送格式化后的消息和对话历史到服务器
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message: formattedMessage,
                history: conversationHistory,
                sessionId
            })
        });
        
        const data = await response.json();
        
        // 隐藏打字指示器
        hideTypingIndicator();
        
        // 特殊处理频率限制错误
        if (response.status === 429 && data.rateLimitExceeded) {
            // 像AI回复一样显示频率限制消息（需要清理）
            const sanitizedError = typeof data.error === 'string' ? data.error : '服务器繁忙，请稍后再试';
            addMessage(sanitizedError, 'assistant');
            return;
        }
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // 添加AI回复
        addMessage(data.response, 'assistant');
        
        // 更新聊天列表
        updateChatList();
        
    } catch (error) {
        // 静默处理发送消息错误
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
    // Shift+Enter 允许换行，不做任何处理
}

// 处理输入变化
function handleInput() {
    const hasText = messageInput.value.trim().length > 0;
    sendButton.style.opacity = hasText ? '1' : '0.6';
    sendButton.disabled = !hasText;
    
    // 自动调整文本框高度以适应多行内容
    autoResizeTextarea();
}

// 更新聊天列表 (已禁用)
function updateChatList() {
    // 功能已禁用，不再更新聊天历史记录
    return;
}

// 添加消息到聊天窗口
function addMessage(text, type, timestamp = null) {
    // 对于所有消息进行基本的安全清理
    const safeText = typeof text === 'string' ? text : '';
    
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
    // 渲染Markdown并清理HTML
    textDiv.innerHTML = renderMarkdown(safeText);
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = formatTime(timestamp || new Date());
    
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(timeDiv);
    
    // 为AI回复添加复制按钮在时间下方
    if (type === 'assistant') {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = '复制消息';
        // 复制原始的markdown文本（但要确保安全）
        const copyText = safeText.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/javascript:/gi, '');
        copyBtn.addEventListener('click', () => copyMessage(copyText, copyBtn));
        
        contentDiv.appendChild(copyBtn);
    }
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    
    // 高亮代码块（如果存在）
    if (typeof hljs !== 'undefined') {
        const codeBlocks = messageDiv.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            hljs.highlightElement(block);
        });
    }
    
    // 添加到聊天历史（使用标准的role格式，并包含时间戳）
    chatHistory.push({
        role: type === 'user' ? 'user' : 'assistant',
        content: safeText,
        timestamp: timestamp || new Date()
    });
    
    // 注意：聊天记录现在由后端自动保存，无需前端手动保存
    
    scrollToBottom();
}

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    
    // 手动格式化为 YYYY-MM-DD HH:mm:ss 格式
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
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
    
    if (enabled) {
        messageInput.placeholder = t('input.placeholder');
        // 重新检查输入框内容来设置发送按钮状态
        const hasText = messageInput.value.trim().length > 0;
        sendButton.style.opacity = hasText ? '1' : '0.6';
        sendButton.disabled = !hasText;
    } else {
        messageInput.placeholder = t('messages.thinking');
        sendButton.disabled = true;
        sendButton.style.opacity = '0.6';
    }
}

// 显示错误模态框
function showErrorModal(message) {
    if (errorMessage && errorModal) {
        // 安全地设置文本内容，避免XSS攻击
        errorMessage.textContent = message;
        // 如果需要支持换行，使用CSS white-space: pre-line
        errorMessage.style.whiteSpace = 'pre-line';
        errorModal.style.display = 'flex';
    }
}

// 关闭错误模态框
function closeErrorModal() {
    if (errorModal) {
        errorModal.style.display = 'none';
    }
}

// 显示确认模态框
function showConfirmModal(message, onConfirm, onCancel = null) {
    // 创建确认模态框HTML
    const confirmModalHTML = `
        <div class="modal" id="confirmModal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <i class="fas fa-question-circle"></i>
                    <h3>${t('modal.confirm', '确认')}</h3>
                </div>
                <div class="modal-body">
                    <p id="confirmMessage">${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="confirmCancelBtn">${t('modal.cancel', '取消')}</button>
                    <button class="btn btn-primary" id="confirmOkBtn">${t('modal.ok', '确定')}</button>
                </div>
            </div>
        </div>
    `;
    
    // 移除已存在的确认模态框
    const existingModal = document.getElementById('confirmModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 添加新的确认模态框到页面
    document.body.insertAdjacentHTML('beforeend', confirmModalHTML);
    
    const confirmModal = document.getElementById('confirmModal');
    const confirmOkBtn = document.getElementById('confirmOkBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    
    // 确定按钮事件
    confirmOkBtn.addEventListener('click', () => {
        confirmModal.remove();
        if (onConfirm) onConfirm();
    });
    
    // 取消按钮事件
    confirmCancelBtn.addEventListener('click', () => {
        confirmModal.remove();
        if (onCancel) onCancel();
    });
    
    // 点击背景关闭
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            confirmModal.remove();
            if (onCancel) onCancel();
        }
    });
    
    // ESC键关闭
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            confirmModal.remove();
            if (onCancel) onCancel();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// 确保函数在全局作用域中可用
window.closeErrorModal = closeErrorModal;
window.showConfirmModal = showConfirmModal;

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
        
        // 静默处理服务器连接正常情况
    } catch (error) {
        // 静默处理服务器连接错误
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
        let exportText = '雾萌娘 聊天记录\n';
        exportText += '=' .repeat(30) + '\n';
        exportText += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
        exportText += `消息总数: ${chatHistory.length}\n`;
        exportText += '=' .repeat(30) + '\n\n';
        
        chatHistory.forEach((message, index) => {
            // chatHistory使用{role, content, timestamp}格式
            if (message.role === 'user') {
                // 用户消息不需要时间戳，因为消息内容已包含用户名和时间戳
                exportText += `${message.content || ''}\n\n`;
            } else {
                // AI消息需要添加时间戳，因为数据库中没有AI的时间戳
                const time = formatTime(message.timestamp || new Date());
                exportText += `${time} @FogMoeBot：\n`;
                exportText += `${message.content || ''}\n\n`;
            }
        });
        
        exportText += '=' .repeat(30) + '\n';
        exportText += 'https://chat.fog.moe/\n';
        
        // 创建并下载文件
        const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        
        // 生成文件名
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
        a.download = `雾萌娘聊天记录_${dateStr}.txt`;
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // 清理URL对象
        window.URL.revokeObjectURL(url);
        
        // 导出成功后静默处理
        
    } catch (error) {
        // 静默处理导出错误
        showErrorModal('导出聊天记录时发生错误，请稍后再试。');
    }
}

// 网络状态监听
window.addEventListener('online', () => {
    // 静默处理网络恢复连接
});

window.addEventListener('offline', () => {
    // 静默处理网络断开
    showErrorModal(t('messages.networkError'));
});

// 显示应用界面
function showApp() {
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    if (appContainer) {
        appContainer.style.display = 'flex';
    }
    
    // 初始化聊天应用
    initializeChatApp();
}

// 平滑跳转到登录页面
function smoothRedirectToLogin() {
    if (loadingScreen) {
        const loadingText = loadingScreen.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = '正在跳转到登录页面...';
        }
    }
    
    setTimeout(() => {
        window.location.href = '/auth/login';
    }, 800);
}

// 用户信息管理
async function loadUserInfo() {
    try {
        const response = await fetch('/auth/status', {
            method: 'GET',
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.loggedIn && data.user) {
            // 用户已登录，显示用户信息并展示应用
            displayUserInfo(data.user);
            showApp();
        } else {
            // 用户未登录，平滑跳转到登录页面
            smoothRedirectToLogin();
        }
    } catch (error) {
        // 静默处理获取用户信息失败
        // 如果获取用户信息失败，也平滑跳转到登录页面
        smoothRedirectToLogin();
    }
}

function displayUserInfo(user) {
    // 存储用户信息到全局变量
    currentUser = user;
    
    if (userName && userCoins && userInfo) {
        userName.textContent = user.name || '用户';
        userCoins.textContent = user.coins || 0;
        userInfo.style.display = 'flex';
    }
}

// 初始化聊天应用
function initializeChatApp() {
    // 初始化聊天相关事件监听器
    initializeChatEventListeners();
    
    // 初始化语言
    updateLanguage();
    
    // 聚焦输入框并设置初始状态
    if (messageInput) {
        messageInput.focus();
        // 设置发送按钮初始状态
        const hasText = messageInput.value.trim().length > 0;
        sendButton.style.opacity = hasText ? '1' : '0.6';
        sendButton.disabled = !hasText;
    }
    
    // 检查服务器连接
    checkServerConnection();
    
    // 初始化单一对话模式
    currentChatId = 'single-chat';
    chatHistory = [];
    
    // 加载用户的聊天历史记录
    loadChatHistory();
}

async function handleLogout() {
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 清除本地存储
            localStorage.removeItem('sessionId');
            // 重定向到登录页面
            window.location.href = '/auth/login';
        } else {
            showErrorModal(data.message || '登出失败');
        }
    } catch (error) {
        // 静默处理登出错误
        showErrorModal('登出时发生错误，请稍后再试');
    }
}

// 加载用户聊天历史记录
async function loadChatHistory() {
    try {
        // 使用用户ID作为conversation_id
        const userId = getCurrentUserId();
        if (!userId) {
            return;
        }
        
        const response = await fetch(`/api/chat-history/${userId}`, {
            method: 'GET',
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.messages && data.messages.length > 0) {
            // 恢复聊天历史
            chatHistory = data.messages;
            
            // 显示聊天界面
            if (welcomeScreen) {
                welcomeScreen.style.display = 'none';
            }
            if (chatMessages) {
                chatMessages.style.display = 'flex';
            }
            
            // 显示历史消息（初次加载时滚动到底部）
            displayChatHistory(false);
            
            console.log('聊天历史记录加载成功');
        }
    } catch (error) {
        // 静默处理加载历史记录失败
        console.error('加载聊天历史记录失败:', error);
    }
}

// 重新加载聊天历史记录（用于消息发送后同步）
async function reloadChatHistory(preserveScrollPosition = false) {
    try {
        // 使用用户ID作为conversation_id
        const userId = getCurrentUserId();
        if (!userId) {
            return;
        }
        
        const response = await fetch(`/api/chat-history/${userId}`, {
            method: 'GET',
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.messages && data.messages.length > 0) {
            // 清空当前显示的消息
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
            
            // 更新聊天历史
            chatHistory = data.messages;
            
            // 重新显示历史消息，传递是否保持滚动位置的参数
            displayChatHistory(preserveScrollPosition);
        
        }
    } catch (error) {
        // 静默处理重新加载历史记录失败
    }
}

// 保存聊天历史记录（已废弃，现在由后端自动处理）
async function saveChatHistory() {
    // 此函数已废弃，聊天记录现在由后端在处理消息时自动保存
    // 保留此函数以避免破坏现有代码的兼容性
    return;
}

// 显示聊天历史记录
function displayChatHistory(preserveScrollPosition = false) {
    if (!chatHistory || chatHistory.length === 0) {
        return;
    }
    
    let lastUserTimestamp = null;
    
    chatHistory.forEach(message => {
        if (message.role === 'user') {
            // 提取用户消息中的时间戳
            let userContent = message.content;
            let extractedTimestamp = null;
            
            // 匹配格式：YYYY-MM-DD HH:mm:ss @用户名 说：\n
            const prefixPattern = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) @.+? 说：\n/;
            const match = userContent.match(prefixPattern);
            
            if (match) {
                extractedTimestamp = match[1];
                userContent = userContent.replace(prefixPattern, '');
                lastUserTimestamp = extractedTimestamp;
            }
            
            // 如果提取到时间戳，转换为Date对象传递给displayMessage
            const timestamp = extractedTimestamp ? new Date(extractedTimestamp).getTime() : null;
            displayMessage(userContent, 'user', timestamp);
        } else if (message.role === 'assistant') {
            // AI回复使用与上一条用户消息相同的时间戳
            const timestamp = lastUserTimestamp ? new Date(lastUserTimestamp).getTime() : null;
            displayMessage(message.content, 'assistant', timestamp);
        }
    });
    
    // 只有在不需要保持滚动位置时才滚动到底部
    if (!preserveScrollPosition) {
        scrollToBottom();
    }
}

// 仅显示消息，不添加到chatHistory数组
function displayMessage(text, type, timestamp = null) {
    // 对于所有消息进行基本的安全清理
    const safeText = typeof text === 'string' ? text : '';
    
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
    // 渲染Markdown并清理HTML
    textDiv.innerHTML = renderMarkdown(safeText);
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = formatTime(timestamp || new Date());
    
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(timeDiv);
    
    // 为AI回复添加复制按钮在时间下方
    if (type === 'assistant') {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = '复制消息';
        // 复制原始的markdown文本（但要确保安全）
        const copyText = safeText.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/javascript:/gi, '');
        copyBtn.addEventListener('click', () => copyMessage(copyText, copyBtn));
        
        contentDiv.appendChild(copyBtn);
    }
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    
    // 高亮代码块（如果存在）
    if (typeof hljs !== 'undefined') {
        const codeBlocks = messageDiv.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            hljs.highlightElement(block);
        });
    }
    
    scrollToBottom();
}

// 获取当前用户ID
function getCurrentUserId() {
    // 从全局用户信息中获取用户ID
    return currentUser ? currentUser.id : null;
}

// 页面加载时检查用户登录状态
document.addEventListener('DOMContentLoaded', () => {
    // 首先初始化基础事件监听器（模态框等）
    initializeBaseEventListeners();
    
    // 然后检查用户登录状态
    // 其他聊天相关初始化会在登录验证成功后进行
    loadUserInfo();
});