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
const lotteryBtn = document.getElementById('lotteryBtn');

// 界面状态管理元素
const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('appContainer');

// 初始化
let chatHistory = [];
let currentChatId = null;
let currentUser = null; // 存储当前用户信息

// 缓存相关变量
let chatHistoryCache = new Map(); // 缓存聊天历史
let lastCacheTime = 0; // 上次缓存时间
const CACHE_DURATION = 60000; // 缓存60秒

// 会话唯一ID
let sessionId = localStorage.getItem('sessionId');
if (!sessionId) {
    sessionId = 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('sessionId', sessionId);
}

// 增加同步聊天记录的控制变量
let lastChatSyncTime = 0; // 上次同步聊天记录的时间戳
const CHAT_SYNC_INTERVAL = 60000; // 聊天记录同步间隔（1分钟）
let isUserTyping = false; // 用户是否正在输入

// 添加本地存储聊天记录备份
function backupChatHistoryToLocalStorage() {
    try {
        const userId = getCurrentUserId();
        if (userId && chatHistory && chatHistory.length > 0) {
            const data = {
                messages: chatHistory,
                expireAt: Date.now() + 60000 // 1分钟后过期
            };
            localStorage.setItem(`chat_backup_${userId}`, JSON.stringify(data));
        }
    } catch (error) {
        
    }
}

// 从本地存储恢复聊天记录备份
function restoreChatHistoryFromLocalStorage() {
    try {
        const userId = getCurrentUserId();
        if (userId) {
            const backup = localStorage.getItem(`chat_backup_${userId}`);
            if (backup) {
                try {
                    const data = JSON.parse(backup);
                    
                    // 检查是否有过期时间
                    if (data.expireAt) {
                        // 如果已过期，删除并返回null
                        if (data.expireAt < Date.now()) {
                            
                            localStorage.removeItem(`chat_backup_${userId}`);
                            return null;
                        }
                        return data.messages;
                    } else if (Array.isArray(data)) {
                        // 兼容旧格式（没有过期时间的数组格式）
                        return data;
                    }
                } catch (parseError) {
                   
                    localStorage.removeItem(`chat_backup_${userId}`);
                }
            }
        }
    } catch (error) {
       
    }
    return null;
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
            // 检查用户是否在底部或接近底部（50px误差范围）
            const currentScrollTop = chatMessages ? chatMessages.scrollTop : 0;
            const currentScrollHeight = chatMessages ? chatMessages.scrollHeight : 0;
            const currentClientHeight = chatMessages ? chatMessages.clientHeight : 0;
            const isNearBottom = currentScrollHeight - currentScrollTop <= currentClientHeight + 50;
            
            // 先尝试从本地存储恢复最新的聊天记录
            const localBackup = restoreChatHistoryFromLocalStorage();
            if (localBackup && localBackup.length > 0) {
                // 如果当前的聊天记录少于本地备份，使用本地备份
                if (!chatHistory || chatHistory.length < localBackup.length) {
                    chatHistory = localBackup;
                    
                    // 清空当前显示的消息
                    if (chatMessages) {
                        chatMessages.innerHTML = '';
                    }
                    
                    // 重新显示聊天历史
                    displayChatHistory(true);
                    
                    // 如果用户之前接近底部，则滚动到底部
                    if (isNearBottom) {
                        scrollToBottom();
                    }
                    
                    return;
                }
            }
            
            // 如果本地备份不可用或不完整，再尝试从服务器获取
            // 这里传递preserveScrollPosition=true以保持滚动位置
            // 不强制同步，遵循同步频率限制
            reloadChatHistory(true, false).then(() => {
                // 如果用户之前接近底部，则滚动到底部
                if (isNearBottom) {
                    scrollToBottom();
                }
            });
        }
    });
    
    // 页面关闭或切换前备份聊天记录
    window.addEventListener('beforeunload', () => {
        backupChatHistoryToLocalStorage();
    });
    
    // 页面可见性变化时备份聊天记录
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            backupChatHistoryToLocalStorage();
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
    if (lotteryBtn) {
        lotteryBtn.addEventListener('click', async () => {
            if (lotteryBtn.disabled) return;
            lotteryBtn.disabled = true;
            try {
                const res = await fetch('/api/lottery/draw', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    if (userCoins) userCoins.textContent = data.updatedCoins;
                    showErrorModal(`恭喜！你获得了 ${data.coins} 枚金币`);
                } else {
                    showErrorModal(data.message || '抽奖失败');
                }
            } catch (err) {
                showErrorModal('网络错误，抽奖失败');
            } finally {
                await refreshLotteryStatus();
            }
        });
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

                            // 即使后端删除失败，也继续清空前端，或给出提示
                            showErrorModal(t('error.clearHistoryFailed', '清除聊天记录失败。'));
                        }
                    }
                } catch (error) {

                    showErrorModal(t('error.clearHistoryNetwork', '清除聊天记录时发生网络错误。'));
                }
            }

            // 清空缓存
            const userId = getCurrentUserId();
            if (userId) {
                const cacheKey = `chat_${userId}`;
                chatHistoryCache.delete(cacheKey);
                lastCacheTime = 0;
                
                // 清除本地存储的备份
                localStorage.removeItem(`chat_backup_${userId}`);
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
    
    // 重置输入状态
    isUserTyping = false;
    
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
                sessionId,
                isHistoryFetch: false // 标记这是用户主动发送的消息，非历史记录请求
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
        
        // 检查金币不足的情况
        if (data.coinShortage) {
            addMessage(data.response, 'assistant');
            return;
        }
        
        // 处理API服务错误情况 - 直接显示在聊天中
        if (data.error === true) {
            addMessage(data.response, 'assistant');
            return;
        }
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // 实时更新用户金币数量（如果有）
        if (data.updatedCoins !== undefined && currentUser) {
            currentUser.coins = data.updatedCoins;
            if (userCoins) {
                userCoins.textContent = data.updatedCoins;
            }
        }
        
        // 清除缓存，确保新消息能被正确保存和显示
        const userId = getCurrentUserId();
        if (userId) {
            const cacheKey = `chat_${userId}`;
            chatHistoryCache.delete(cacheKey);
            lastCacheTime = 0;
        }
        
        // 添加AI回复
        addMessage(data.response, 'assistant');
        
        // 备份聊天记录到本地存储
        backupChatHistoryToLocalStorage();
        
        // 更新聊天列表
        updateChatList();
        
        // 消息发送后，强制同步聊天记录（但放在最后执行）
        setTimeout(() => {
            const userId = getCurrentUserId();
            if (userId) {
                reloadChatHistory(false, true);
            }
        });
        
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

// 处理输入框内容变化
function handleInput(e) {
    // 设置用户正在输入状态
    isUserTyping = true;
    
    // 调整输入框高度（如果是textarea）
    if (e.target.tagName === 'TEXTAREA') {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; // 限制最大高度为200px
    }
    
    // 设置发送按钮状态
    const hasText = e.target.value.trim().length > 0;
    if (sendButton) {
        sendButton.style.opacity = hasText ? '1' : '0.6';
        sendButton.disabled = !hasText;
    }
    
    // 1秒后重置输入状态
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
        isUserTyping = false;
    }, 1000);
}

// 更新聊天列表 (已禁用)
function updateChatList() {
    // 功能已禁用，不再更新聊天历史记录
    return;
}

// 添加消息到聊天窗口
function addMessage(text, type, timestamp = null, messageClass = '') {
    // 对于所有消息进行基本的安全清理
    const safeText = typeof text === 'string' ? text : '';
    
    // 获取当前滚动位置
    const currentScrollTop = chatMessages ? chatMessages.scrollTop : 0;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    // 添加额外的消息类（如错误样式）
    if (messageClass) {
        messageDiv.classList.add(messageClass);
    }
    
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
    
    // 计算是否接近底部（用于自动滚动）
    const currentScrollHeight = chatMessages ? chatMessages.scrollHeight : 0;
    const currentClientHeight = chatMessages ? chatMessages.clientHeight : 0;
    const isNearBottom = currentScrollHeight - currentScrollTop <= currentClientHeight + 50;
    
    chatMessages.appendChild(messageDiv);
    
    // 添加到聊天历史（使用标准的role格式，并包含时间戳）
    chatHistory.push({
        role: type === 'user' ? 'user' : 'assistant',
        content: safeText,
        timestamp: timestamp || new Date()
    });
    
    // 更新本地备份
    backupChatHistoryToLocalStorage();
    
    // 如果用户之前接近底部，则滚动到底部
    if (isNearBottom) {
        scrollToBottom();
    }
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
    // 检查是否在过去60秒内已经进行过连接检查
    const lastCheckTime = localStorage.getItem('lastConnectionCheck');
    const now = Date.now();
    
    if (lastCheckTime && (now - parseInt(lastCheckTime)) < 60000) {
        // 如果60秒内已经检查过，跳过此次检查
        return;
    }
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message: 'ping', 
                isHistoryFetch: true 
            })
        });
        
        // 记录此次检查时间
        localStorage.setItem('lastConnectionCheck', now.toString());
        
        // 如果遇到429错误，静默处理
        if (response.status === 429) {
            return;
        }
        
        // 静默处理服务器连接正常情况
    } catch (error) {
        // 只有在真正的连接错误时才显示错误模态框
        if (error.name !== 'AbortError') {
            showErrorModal(t('messages.serverError'));
        }
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
    if (!chatHistory || chatHistory.length === 0) {
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
        
        let lastUserTimestamp = null;
        
        chatHistory.forEach((message, index) => {
            // chatHistory使用{role, content, timestamp}格式
            if (message.role === 'user') {
                // 解析用户消息中的时间戳信息
                let userContent = message.content;
                let extractedTimestamp = null;
                
                // 匹配格式：YYYY-MM-DD HH:mm:ss @用户名 说：\n
                const prefixPattern = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) @(.+?) 说：\n/;
                const match = userContent.match(prefixPattern);
                
                if (match) {
                    extractedTimestamp = match[1];
                    const extractedUsername = match[2];
                    userContent = userContent.replace(prefixPattern, '');
                    
                    // 添加标准格式的用户消息
                    exportText += `${extractedTimestamp} @${extractedUsername} 说：\n${userContent}\n\n`;
                    lastUserTimestamp = extractedTimestamp;
                } else {
                    // 如果消息中没有时间戳，使用消息对象的timestamp或当前时间
                    const time = formatTime(message.timestamp || new Date());
                    const username = currentUser ? currentUser.name : '用户';
                    exportText += `${time} @${username} 说：\n${userContent}\n\n`;
                    lastUserTimestamp = time;
                }
            } else if (message.role === 'assistant') {
                // AI消息使用用户消息的时间戳或消息对象自身的时间戳
                let time;
                if (lastUserTimestamp) {
                    time = lastUserTimestamp;
                } else {
                    time = formatTime(message.timestamp || new Date());
                }
                exportText += `${time} @FogMoeBot：\n${message.content || ''}\n\n`;
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

    // 更新抽奖按钮状态
    refreshLotteryStatus();
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
    
    // 设置定时同步聊天记录（每分钟检查一次）
    setInterval(() => {
        // 只在用户未输入时进行同步
        if (!isUserTyping && currentUser) {
            const userId = getCurrentUserId();
            if (userId) {
                // 静默同步，不强制，遵循频率限制
                reloadChatHistory(true, false).catch(err => {
                });
            }
        }
    }, CHAT_SYNC_INTERVAL);
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
        
        // 首次加载时强制同步
        const isFirstLoad = !lastChatSyncTime;
        
        // 首先尝试从服务器获取最新记录
        try {
            // 首次加载时强制同步，否则遵循同步频率限制
            await fetchServerChatHistory(userId, isFirstLoad);
            // 如果成功获取服务器数据，直接返回，不再使用本地存储
            return;
        } catch (serverError) {
            // 如果服务器获取失败，尝试使用本地存储作为备选
        }
        
        // 如果服务器获取失败，才从本地存储恢复
        const localBackup = restoreChatHistoryFromLocalStorage();
        if (localBackup && localBackup.length > 0) {
            chatHistory = localBackup;
            
            // 显示聊天界面
            if (welcomeScreen) {
                welcomeScreen.style.display = 'none';
            }
            if (chatMessages) {
                chatMessages.style.display = 'flex';
            }
            
            // 显示历史消息
            displayChatHistory(false);
        }
    } catch (error) {
        // 静默处理加载历史记录失败
    }
}

// 从服务器获取聊天历史
async function fetchServerChatHistory(userId, forceSync = false) {
    // 检查同步频率限制（除非强制同步）
    const now = Date.now();
    if (!forceSync && (now - lastChatSyncTime < CHAT_SYNC_INTERVAL)) {
        return false;
    }
    
    // 如果用户正在输入，延迟同步（除非强制同步）
    if (!forceSync && isUserTyping) {
        return false;
    }
    
    try {
        const response = await fetch(`/api/chat-history/${userId}`, {
            method: 'GET',
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        // 更新最后同步时间
        lastChatSyncTime = now;
        
        const data = await response.json();
        
        if (data.success && data.messages) {
            // 如果没有变化，不需要更新UI
            if (JSON.stringify(chatHistory) === JSON.stringify(data.messages)) {
                return true;
            }
            
            // 服务器返回的聊天记录（即使为空数组也使用它，这表示没有聊天记录或已清空）
            // 不再检查messages.length > 0，始终使用服务器返回的数据
            
            // 更新聊天历史
            chatHistory = data.messages;
            
            // 更新本地备份
            backupChatHistoryToLocalStorage();
            
            // 更新缓存
            const cacheKey = `chat_${userId}`;
            chatHistoryCache.set(cacheKey, data.messages);
            lastCacheTime = now;
            
            // 如果有消息，显示聊天界面
            if (data.messages.length > 0) {
                if (welcomeScreen) {
                    welcomeScreen.style.display = 'none';
                }
                if (chatMessages) {
                    chatMessages.style.display = 'flex';
                    chatMessages.innerHTML = ''; // 清空当前显示
                }
                
                // 显示历史消息，传入true表示需要保持滚动位置
                displayChatHistory(true);
            }
            
            return true;
        }
        
        return false;
    } catch (error) {
        throw error; // 重新抛出错误，让调用者处理
    }
}

// 重新加载聊天历史记录（用于消息发送后同步或页面焦点变化时）
async function reloadChatHistory(preserveScrollPosition = false, forceSync = false) {
    try {
        // 使用用户ID作为conversation_id
        const userId = getCurrentUserId();
        if (!userId) {
            return;
        }
        
        // 检查同步频率限制
        const now = Date.now();
        if (!forceSync && (now - lastChatSyncTime < CHAT_SYNC_INTERVAL)) {
            return;
        }
        
        // 如果用户正在输入，延迟同步
        if (!forceSync && isUserTyping) {
            return;
        }
        
        // 优先从服务器获取最新数据
        try {
            // 从服务器获取最新数据
            const response = await fetch(`/api/chat-history/${userId}`, {
                method: 'GET',
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            // 更新最后同步时间
            lastChatSyncTime = now;
            
            const data = await response.json();
            
            // 如果没有变化，不需要更新UI
            if (JSON.stringify(chatHistory) === JSON.stringify(data.messages || [])) {
                return;
            }
            
            // 无论服务器返回什么数据，都优先使用（即使为空也使用，表示聊天记录被清空）
            if (data.success) {
                // 清空当前显示的消息
                if (chatMessages) {
                    chatMessages.innerHTML = '';
                }
                
                // 更新聊天历史
                chatHistory = data.messages || [];
                
                // 更新本地备份
                backupChatHistoryToLocalStorage();
                
                // 更新缓存
                const cacheKey = `chat_${userId}`;
                chatHistoryCache.set(cacheKey, data.messages);
                lastCacheTime = now;
                
                // 重新显示历史消息
                displayChatHistory(preserveScrollPosition);
                
                return;
            }
        } catch (serverError) {
            // 静默处理错误
        }
        
        // 只有在服务器获取失败时才考虑使用本地备份
        const localBackup = restoreChatHistoryFromLocalStorage();
        if (localBackup && localBackup.length > 0) {
            // 本地备份作为备选
            chatHistory = localBackup;
            
            // 清空当前显示的消息
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
            
            // 重新显示聊天历史
            displayChatHistory(preserveScrollPosition);
        }
    } catch (error) {
        // 静默处理重新加载历史记录失败
    }
}

// 保存聊天历史记录（已废弃，现在由后端自动处理，但保留前端本地备份功能）
async function saveChatHistory() {
    // 此函数已废弃，聊天记录现在由后端在处理消息时自动保存
    // 但我们仍然备份到本地存储
    backupChatHistoryToLocalStorage();
    return;
}

// 显示聊天历史记录
function displayChatHistory(preserveScrollPosition = false) {
    if (!chatHistory || chatHistory.length === 0) {
        return;
    }
    
    // 保存当前滚动位置和内容高度(用于之后比较变化)
    const beforeScrollTop = chatMessages ? chatMessages.scrollTop : 0;
    const beforeScrollHeight = chatMessages ? chatMessages.scrollHeight : 0;
    const clientHeight = chatMessages ? chatMessages.clientHeight : 0;
    
    // 判断用户是否在底部附近(50px误差范围)
    const isNearBottom = beforeScrollHeight - beforeScrollTop <= clientHeight + 50;
    
    // 记录原来的消息数量
    const oldMessageCount = chatMessages ? chatMessages.childElementCount : 0;
    
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
    
    // 计算内容高度变化
    const afterScrollHeight = chatMessages ? chatMessages.scrollHeight : 0;
    const newMessageCount = chatMessages ? chatMessages.childElementCount : 0;
    const hasNewMessages = newMessageCount > oldMessageCount;
    
    // 滚动策略:
    // 1. 如果明确要求不保持滚动位置，则滚动到底部
    // 2. 如果用户之前在底部附近，则滚动到底部
    // 3. 如果有新消息且当前视口能容纳(内容高度变化小于视口高度)，可以滚动到底部
    // 4. 其他情况保持当前滚动位置
    if (!preserveScrollPosition) {
        scrollToBottom();
    } else if (isNearBottom) {
        scrollToBottom();
    } else if (hasNewMessages && (afterScrollHeight - beforeScrollHeight) < clientHeight) {
        // 如果内容高度增加小于视口高度，说明当前视口能容纳新内容，可以滚动显示
        scrollToBottom();
    } else if (hasNewMessages) {
        // 如果有新消息但当前视口不能完全容纳，保持原来的相对滚动位置
        // 计算新的滚动位置：保持相对位置不变
        chatMessages.scrollTop = beforeScrollTop + (afterScrollHeight - beforeScrollHeight);
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

// ================= 抽奖相关 =================
async function refreshLotteryStatus() {
    if (!lotteryBtn) return;
    try {
        const res = await fetch('/api/lottery/status');
        const data = await res.json();
        lotteryBtn.disabled = !data.canDraw;
        if (!data.canDraw) {
            const hrs = Math.ceil(data.remaining / 3600000);
            lotteryBtn.title = `已抽奖，剩余约 ${hrs} 小时`;
        } else {
            lotteryBtn.title = '抽奖赢取金币';
        }
    } catch (err) {
        lotteryBtn.disabled = true;
    }
}