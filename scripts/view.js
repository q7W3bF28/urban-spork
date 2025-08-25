document.addEventListener('DOMContentLoaded', function() {
    // Ably配置
    const ably = new Ably.Realtime('nc5NGw.wSmsXg:SMs5pD5aJ4hGMvNZnd7pJp2lYS2X1iCmWm_yeLx_pkk');
    const channel = ably.channels.get('comic-share');
    
    // DOM元素
    const bookshelfGrid = document.getElementById('bookshelf-grid');
    const passwordModal = document.getElementById('password-modal');
    const modalShelfName = document.getElementById('modal-shelf-name');
    const passwordForm = document.getElementById('password-form');
    const cancelPasswordBtn = document.getElementById('cancel-password');
    const passwordError = document.getElementById('password-error');
    const passwordInput = document.getElementById('shelf-password');
    
    // 当前选中的书柜和密码
    let selectedShelf = null;
    let currentPassword = '123456'; // 初始密码
    
    // 初始化书柜
    function initBookshelves() {
        bookshelfGrid.innerHTML = '';
        
        for (let i = 1; i <= 10; i++) {
            const bookshelfItem = document.createElement('div');
            bookshelfItem.className = 'bookshelf-item';
            bookshelfItem.dataset.shelfId = i;
            
            bookshelfItem.innerHTML = `
                <div class="icon">📚</div>
                <h3>书柜 ${i}</h3>
                <p>点击输入密码查看</p>
            `;
            
            bookshelfItem.addEventListener('click', function() {
                openPasswordModal(i);
            });
            
            bookshelfGrid.appendChild(bookshelfItem);
        }
    }
    
    // 打开密码模态框
    function openPasswordModal(shelfId) {
        selectedShelf = shelfId;
        modalShelfName.textContent = `书柜 ${shelfId}`;
        passwordModal.classList.add('show');
        passwordInput.value = '';
        passwordError.style.display = 'none';
        
        // 订阅书柜频道获取最新密码
        const shelfChannel = ably.channels.get(`comic-share:shelf-${shelfId}`);
        shelfChannel.subscribe('comic-upload', (message) => {
            currentPassword = message.data.password;
        });
        
        // 自动聚焦到密码输入框
        setTimeout(() => {
            passwordInput.focus();
        }, 100);
    }
    
    // 关闭密码模态框
    function closePasswordModal() {
        passwordModal.classList.remove('show');
    }
    
    // 取消密码输入
    cancelPasswordBtn.addEventListener('click', closePasswordModal);
    
    // 提交密码
    passwordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const enteredPassword = passwordInput.value;
        
        if (enteredPassword === currentPassword) {
            // 密码正确，跳转到阅读页面
            window.location.href = `viewer.html?shelf=${selectedShelf}&password=${enteredPassword}`;
        } else {
            // 密码错误
            passwordError.style.display = 'block';
            passwordInput.value = '';
            passwordInput.focus();
            
            // 添加抖动动画
            passwordInput.classList.add('shake');
            setTimeout(() => {
                passwordInput.classList.remove('shake');
            }, 500);
        }
    });
    
    // 点击模态框背景关闭
    passwordModal.addEventListener('click', function(e) {
        if (e.target === passwordModal) {
            closePasswordModal();
        }
    });
    
    // 添加键盘快捷键
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closePasswordModal();
        }
    });
    
    // 限制密码输入为数字
    passwordInput.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '');
        if (this.value.length > 6) {
            this.value = this.value.slice(0, 6);
        }
    });
    
    // 初始化
    initBookshelves();
});
