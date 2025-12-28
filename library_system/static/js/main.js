// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 获取本地存储的用户信息
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    // 未登录用户跳转到登录页（强化容错）
    if (window.location.pathname !== '/login' && (!username || username === 'null')) {
        localStorage.clear();
        window.location.href = '/login';
        return;
    }

    // 显示用户名
    const usernameEl = document.getElementById('username');
    if (usernameEl && username) {
        usernameEl.textContent = username;
    }

    // 退出登录功能（强化清空缓存）
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.clear();
            window.location.href = '/login';
            alert('已成功退出登录');
        });
    }

    // 通用函数：根据用户名获取当前用户真实ID（优化容错+提示）
    function getCurrentUserId(username, callback) {
        // 先验证用户名有效性
        if (!username || username === 'null') {
            alert('当前未获取到有效用户名，请重新登录');
            callback(null);
            return;
        }
        // 发起请求获取用户ID
        fetch(`/user/get_id/${username}`)
            .then(res => {
                // 验证响应状态
                if (!res.ok) {
                    throw new Error('接口请求失败，状态码：' + res.status);
                }
                return res.json();
            })
            .then(data => {
                if (data.code === 1 && data.data) {
                    callback(data.data); // 回调返回真实用户ID
                } else {
                    alert(data.msg || '获取用户ID失败，请确认账号已注册');
                    callback(null);
                }
            })
            .catch(err => {
                console.error('获取用户ID异常：', err);
                alert('网络异常或后端接口未启动，无法获取用户信息');
                callback(null);
            });
    }

    // 登录页逻辑（修复后续登录失败问题+强化体验）
    if (window.location.pathname === '/login') {
        const goRegister = document.getElementById('goRegister');
        const goLogin = document.getElementById('goLogin');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        // 初始化隐藏注册表单
        if (registerForm) {
            registerForm.style.display = 'none';
        }

        // 切换到注册表单
        if (goRegister && loginForm && registerForm) {
            goRegister.addEventListener('click', function() {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            });
        }

        // 切换到登录表单
        if (goLogin && loginForm && registerForm) {
            goLogin.addEventListener('click', function() {
                registerForm.style.display = 'none';
                loginForm.style.display = 'block';
            });
        }

        // 注册表单提交（优化：去除空格+完善提示）
        if (registerForm) {
            registerForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const regUsernameInput = document.getElementById('regUsername');
                const regPasswordInput = document.getElementById('regPassword');
                if (!regUsernameInput || !regPasswordInput) {
                    alert('注册表单元素缺失');
                    return;
                }
                const regUsername = regUsernameInput.value.trim();
                const regPassword = regPasswordInput.value.trim();

                // 非空验证
                if (!regUsername || !regPassword) {
                    alert('用户名和密码不能为空！');
                    return;
                }

                fetch('/register', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username: regUsername, password: regPassword})
                }).then(res => res.json()).then(data => {
                    alert(data.msg);
                    if (data.code === 1) {
                        registerForm.reset();
                        registerForm.style.display = 'none';
                        loginForm.style.display = 'block';
                    }
                }).catch(err => {
                    console.error('注册请求异常：', err);
                    alert('注册请求失败，请检查后端服务');
                });
            });
        }

        // 登录表单提交（修复核心：清空旧缓存+去除空格）
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const loginUsernameInput = document.getElementById('username');
                const loginPasswordInput = document.getElementById('password');
                if (!loginUsernameInput || !loginPasswordInput) {
                    alert('登录表单元素缺失');
                    return;
                }
                const loginUsername = loginUsernameInput.value.trim();
                const loginPassword = loginPasswordInput.value.trim();

                // 非空验证
                if (!loginUsername || !loginPassword) {
                    alert('用户名和密码不能为空！');
                    return;
                }

                // 强制清空旧缓存，解决后续登录失败问题
                localStorage.clear();
                // 存储新的登录信息
                localStorage.setItem('username', loginUsername);
                localStorage.setItem('role', loginUsername === 'admin' ? 'admin' : 'user');
                alert('登录成功！即将跳转首页');
                window.location.href = '/index';
            });
        }
    }

    // 首页逻辑（保留原有功能+容错）
    if (window.location.pathname === '/index') {
        const addBookBtn = document.getElementById('addBookBtn');
        const addBookModal = document.getElementById('addBookModal');
        const closeBtn = document.querySelector('.close');
        const addBookForm = document.getElementById('addBookForm');

        // 管理员显示添加图书按钮，普通用户隐藏
        if (addBookBtn) {
            addBookBtn.style.display = 'none';
            if (role === 'admin') {
                addBookBtn.style.display = 'inline-block';
            }
        }

        // 打开添加图书弹窗
        if (addBookBtn && addBookModal) {
            addBookBtn.addEventListener('click', function() {
                addBookModal.style.display = 'block';
            });
        }

        // 关闭弹窗
        if (closeBtn && addBookModal) {
            closeBtn.addEventListener('click', function() {
                addBookModal.style.display = 'none';
            });
        }

        // 点击弹窗外部关闭（可选）
        if (addBookModal) {
            window.addEventListener('click', function(e) {
                if (e.target === addBookModal) {
                    addBookModal.style.display = 'none';
                }
            });
        }

        // 提交添加图书表单
        if (addBookForm) {
            addBookForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const bookNameInput = document.getElementById('bookName');
                const bookAuthorInput = document.getElementById('bookAuthor');
                const bookCategoryInput = document.getElementById('bookCategory');
                if (!bookNameInput || !bookAuthorInput || !bookCategoryInput) {
                    alert('添加图书表单元素缺失');
                    return;
                }
                const bookName = bookNameInput.value.trim();
                const bookAuthor = bookAuthorInput.value.trim();
                const bookCategory = bookCategoryInput.value.trim();

                // 非空验证
                if (!bookName || !bookAuthor || !bookCategory) {
                    alert('图书名称、作者、分类不能为空！');
                    return;
                }

                fetch('/book/add', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({name: bookName, author: bookAuthor, category: bookCategory})
                }).then(res => res.json()).then(data => {
                    alert(data.msg);
                    if (data.code === 1) {
                        addBookForm.reset();
                        addBookModal.style.display = 'none';
                    }
                }).catch(err => {
                    console.error('添加图书请求异常：', err);
                    alert('添加图书失败，请检查后端服务');
                });
            });
        }
    }

    // 图书列表页逻辑（修复：动态获取当前用户ID借书，解决普通用户借阅问题）
    if (window.location.pathname === '/book_list') {
        const searchBtn = document.getElementById('searchBtn');
        const bookTableBody = document.getElementById('bookTableBody');
        let currentSearchName = '';
        let currentSearchCategory = '';

        // 加载图书列表（优化：保存当前搜索条件）
        function loadBookList(name = '', category = '') {
            currentSearchName = name;
            currentSearchCategory = category;
            fetch(`/book/query?name=${name}&category=${category}`)
                .then(res => {
                    if (!res.ok) {
                        throw new Error('图书列表请求失败');
                    }
                    return res.json();
                })
                .then(data => {
                    bookTableBody.innerHTML = '';
                    if (data.code === 1 && data.data.length > 0) {
                        data.data.forEach(book => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${book.id || ''}</td>
                                <td>${book.name || ''}</td>
                                <td>${book.author || ''}</td>
                                <td>${book.category || ''}</td>
                                <td>${book.status || ''}</td>
                                <td>
                                    ${book.status === '可借' ? `<a href="javascript:;" class="btn btn-borrow" data-bookid="${book.id}">借阅</a>` : ''}
                                    ${role === 'admin' ? `<a href="javascript:;" class="btn btn-delete" data-bookid="${book.id}">删除</a>` : ''}
                                </td>
                            `;
                            bookTableBody.appendChild(tr);
                        });

                        // 绑定借阅按钮事件（修复：使用当前登录用户ID，关联当前搜索条件）
                        document.querySelectorAll('.btn-borrow').forEach(btn => {
                            btn.addEventListener('click', function() {
                                const bookId = this.getAttribute('data-bookid');
                                if (!bookId) {
                                    alert('未获取到图书ID');
                                    return;
                                }
                                // 动态获取当前登录用户ID，不再硬编码userId=1
                                getCurrentUserId(username, function(currentUserId) {
                                    if (!currentUserId) {
                                        alert('请重新登录后再进行借阅操作');
                                        return;
                                    }
                                    if (confirm('确定要借阅这本图书吗？')) {
                                        fetch(`/borrow/${currentUserId}/${bookId}`, {
                                            method: 'POST',
                                            headers: {'Content-Type': 'application/json'}
                                        }).then(res => res.json()).then(data => {
                                            alert(data.msg);
                                            if (data.code === 1) {
                                                // 借阅成功后，按当前搜索条件刷新图书列表
                                                loadBookList(currentSearchName, currentSearchCategory);
                                            }
                                        }).catch(err => {
                                            console.error('借阅请求异常：', err);
                                            alert('借阅失败，请检查后端服务');
                                        });
                                    }
                                });
                            });
                        });

                        // 绑定删除按钮事件（仅管理员可见）
                        document.querySelectorAll('.btn-delete').forEach(btn => {
                            btn.addEventListener('click', function() {
                                const bookId = this.getAttribute('data-bookid');
                                if (!bookId) {
                                    alert('未获取到图书ID');
                                    return;
                                }
                                if (confirm('确定要删除这本图书吗？删除后不可恢复！')) {
                                    fetch(`/book/delete/${bookId}`, {
                                        method: 'DELETE'
                                    }).then(res => res.json()).then(data => {
                                        alert(data.msg);
                                        if (data.code === 1) {
                                            loadBookList(currentSearchName, currentSearchCategory);
                                        }
                                    }).catch(err => {
                                        console.error('删除图书异常：', err);
                                        alert('删除图书失败，请检查后端服务');
                                    });
                                }
                            });
                        });
                    } else {
                        bookTableBody.innerHTML = '<tr><td colspan="6" style="color: #666; text-align: center;">暂无图书数据</td></tr>';
                    }
                })
                .catch(err => {
                    console.error('加载图书列表异常：', err);
                    bookTableBody.innerHTML = '<tr><td colspan="6" style="color: #666; text-align: center;">加载图书失败，请刷新页面</td></tr>';
                });
        }

        // 初始加载图书列表
        if (bookTableBody) {
            loadBookList();
        }

        // 搜索按钮点击事件
        if (searchBtn) {
            searchBtn.addEventListener('click', function() {
                const searchNameInput = document.getElementById('searchName');
                const searchCategoryInput = document.getElementById('searchCategory');
                if (!searchNameInput || !searchCategoryInput) {
                    alert('搜索表单元素缺失');
                    return;
                }
                const searchName = searchNameInput.value.trim();
                const searchCategory = searchCategoryInput.value.trim();
                loadBookList(searchName, searchCategory);
            });
        }
    }

    // 借阅列表页逻辑（统一修复：普通用户可显示记录+还书，管理员正常）
    if (window.location.pathname === '/borrow_list') {
        const borrowTableBody = document.getElementById('borrowTableBody');

        // 加载当前用户的借阅记录（动态获取ID，优化容错）
        function loadBorrowRecords(currentUserId) {
            if (!borrowTableBody) {
                console.error('借阅列表表格元素缺失');
                return;
            }
            if (!currentUserId) {
                borrowTableBody.innerHTML = '<tr><td colspan="6" style="color: #666; text-align: center;">获取用户信息失败，请重新登录</td></tr>';
                return;
            }
            fetch(`/borrow/records/${currentUserId}`)
                .then(res => {
                    if (!res.ok) {
                        throw new Error('借阅记录请求失败');
                    }
                    return res.json();
                })
                .then(data => {
                    borrowTableBody.innerHTML = '';
                    if (data.code === 1 && data.data.length > 0) {
                        // 遍历当前用户的借阅记录，仅显示自己的
                        data.data.forEach(record => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${record.id || ''}</td>
                                <td>${record.username || ''}</td>
                                <td>${record.book_name || ''}</td>
                                <td>${record.borrow_date || ''}</td>
                                <td>${record.return_date || '未归还'}</td>
                                <td>${record.return_date === '未归还' ? `<a href="javascript:;" class="btn btn-return" data-recordid="${record.id}">还书</a>` : '已归还'}</td>
                            `;
                            borrowTableBody.appendChild(tr);
                        });

                        // 绑定还书按钮事件（普通用户/管理员均只可操作自己的记录）
                        document.querySelectorAll('.btn-return').forEach(btn => {
                            btn.addEventListener('click', function() {
                                const recordId = this.getAttribute('data-recordid');
                                if (!recordId) {
                                    alert('未获取到借阅记录ID');
                                    return;
                                }
                                if (confirm('确定要归还这本图书吗？')) {
                                    fetch(`/return/${recordId}`, {
                                        method: 'PUT',
                                        headers: {'Content-Type': 'application/json'}
                                    }).then(res => res.json()).then(data => {
                                        alert(data.msg);
                                        if (data.code === 1) {
                                            // 还书成功后，重新加载当前用户的借阅记录
                                            getCurrentUserId(username, loadBorrowRecords);
                                        }
                                    }).catch(err => {
                                        console.error('还书请求异常：', err);
                                        alert('还书失败，请检查后端服务');
                                    });
                                }
                            });
                        });
                    } else {
                        borrowTableBody.innerHTML = '<tr><td colspan="6" style="color: #666; text-align: center;">暂无你的借阅记录（可先去图书列表借阅图书）</td></tr>';
                    }
                })
                .catch(err => {
                    console.error('加载借阅记录异常：', err);
                    borrowTableBody.innerHTML = '<tr><td colspan="6" style="color: #666; text-align: center;">加载借阅记录失败，请刷新页面</td></tr>';
                });
        }

        // 初始化：动态获取当前用户ID并加载记录（普通用户/管理员通用）
        if (borrowTableBody) {
            getCurrentUserId(username, loadBorrowRecords);
        }
    }
});