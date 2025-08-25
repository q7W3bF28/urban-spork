document.addEventListener('DOMContentLoaded', function() {
    // Ably配置
    const ably = new Ably.Realtime('nc5NGw.wSmsXg:SMs5pD5aJ4hGMvNZnd7pJp2lYS2X1iCmWm_yeLx_pkk');
    const channel = ably.channels.get('comic-share');
    
    // DOM元素
    const comicTitle = document.getElementById('comic-title');
    const comicTitleInfo = document.getElementById('comic-title-info');
    const comicDesc = document.getElementById('comic-desc');
    const uploadTime = document.getElementById('upload-time');
    const fileType = document.getElementById('file-type');
    const fileSize = document.getElementById('file-size');
    const comicContent = document.getElementById('comic-content');
    const comicLoading = document.getElementById('comic-loading');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageCounter = document.getElementById('page-counter');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');
    
    // 获取URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const shelfId = urlParams.get('shelf');
    const password = urlParams.get('password');
    
    // 当前漫画数据
    let currentComic = null;
    let currentPage = 1;
    let totalPages = 1;
    let zoomLevel = 1;
    let isFullscreen = false;
    
    // 初始化
    if (!shelfId || !password) {
        window.location.href = 'view.html';
        return;
    }
    
    // 加载书柜中的漫画
    async function loadComics() {
        try {
            // 订阅书柜频道
            const shelfChannel = ably.channels.get(`comic-share:shelf-${shelfId}`);
            
            // 获取最新漫画
            shelfChannel.subscribe('comic-upload', (message) => {
                if (message.data.password === password) {
                    currentComic = message.data.data;
                    displayComic();
                }
            });
            
            // 获取历史消息
            const messages = await shelfChannel.history();
            if (messages.items.length > 0) {
                // 从最新到最旧遍历，找到匹配密码的漫画
                for (let i = messages.items.length - 1; i >= 0; i--) {
                    const message = messages.items[i];
                    if (message.data.password === password) {
                        currentComic = message.data.data;
                        displayComic();
                        break;
                    }
                }
                
                if (!currentComic) {
                    comicLoading.innerHTML = '<p>密码错误或没有找到漫画</p>';
                }
            } else {
                comicLoading.innerHTML = '<p>书柜中没有漫画</p>';
            }
        } catch (error) {
            console.error('加载漫画失败:', error);
            comicLoading.innerHTML = '<p>加载漫画失败，请检查网络连接</p>';
        }
    }
    
    // 显示漫画
    function displayComic() {
        if (!currentComic) return;
        
        // 更新漫画信息
        comicTitle.textContent = currentComic.title;
        comicTitleInfo.textContent = currentComic.title;
        comicDesc.textContent = currentComic.description || '无描述';
        uploadTime.textContent = new Date(currentComic.uploadTime).toLocaleString();
        fileType.textContent = currentComic.fileType.toUpperCase();
        fileSize.textContent = currentComic.fileSize || '未知';
        
        // 隐藏加载指示器
        comicLoading.classList.add('hidden');
        comicContent.classList.remove('hidden');
        
        // 根据文件类型处理
        if (currentComic.fileType === 'pdf') {
            displayPdf();
        } else if (currentComic.fileType === 'epub') {
            displayEpub();
        } else if (currentComic.fileType === 'zip') {
            displayZip();
        } else {
            comicContent.innerHTML = '<p>不支持的文件类型</p>';
        }
    }
    
    // 显示PDF
    function displayPdf() {
        // 使用PDF.js显示PDF
        comicContent.innerHTML = `
            <iframe 
                src="https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(currentComic.fileUrl)}" 
                width="100%" 
                height="100%"
                style="border: none;"
            ></iframe>
        `;
        
        // 禁用分页按钮（PDF.js有自己的控制）
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
        pageCounter.textContent = 'PDF阅读器';
        
        // 禁用缩放按钮（PDF.js有自己的控制）
        zoomInBtn.disabled = true;
        zoomOutBtn.disabled = true;
        zoomResetBtn.disabled = true;
    }
    
    // 显示EPUB
    function displayEpub() {
        // 使用EPUB.js显示EPUB
        comicContent.innerHTML = `
            <div id="epub-container" style="height: 100%; width: 100%;"></div>
        `;
        
        // 动态加载EPUB.js
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/epubjs/dist/epub.min.js';
        script.onload = function() {
            const book = ePub(currentComic.fileUrl);
            const rendition = book.renderTo("epub-container", {
                width: "100%",
                height: "100%",
                spread: "auto"
            });
            
            rendition.display();
            
            // 设置初始缩放
            rendition.zoom(zoomLevel * 100);
            
            book.ready.then(() => {
                totalPages = book.spine.length;
                updatePageCounter();
            });
            
            // 分页控制
            prevPageBtn.onclick = () => {
                rendition.prev();
                currentPage = Math.max(1, currentPage - 1);
                updatePageCounter();
            };
            
            nextPageBtn.onclick = () => {
                rendition.next();
                currentPage = Math.min(totalPages, currentPage + 1);
                updatePageCounter();
            };
            
            // 键盘翻页支持
            document.addEventListener('keydown', function(e) {
                if (e.key === 'ArrowLeft') {
                    rendition.prev();
                    currentPage = Math.max(1, currentPage - 1);
                    updatePageCounter();
                } else if (e.key === 'ArrowRight') {
                    rendition.next();
                    currentPage = Math.min(totalPages, currentPage + 1);
                    updatePageCounter();
                }
            });
        };
        
        document.head.appendChild(script);
    }
    
    // 显示ZIP（图片集合）
    function displayZip() {
        // 使用JSZip处理ZIP文件
        comicContent.innerHTML = `
            <div id="zip-container" style="height: 100%; width: 100%; display: flex; justify-content: center; align-items: center; flex-direction: column;">
                <div class="spinner"></div>
                <p>正在解压文件...</p>
            </div>
        `;
        
        // 动态加载JSZip
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js';
        script.onload = function() {
            fetch(currentComic.fileUrl)
                .then(response => response.blob())
                .then(blob => JSZip.loadAsync(blob))
                .then(zip => {
                    const imagePromises = [];
                    const images = [];
                    
                    // 提取所有图片文件
                    zip.forEach((relativePath, file) => {
                        if (!file.dir && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                            const promise = file.async('blob').then(blob => {
                                return new Promise((resolve) => {
                                    const reader = new FileReader();
                                    reader.onload = () => resolve({
                                        data: reader.result,
                                        name: file.name
                                    });
                                    reader.readAsDataURL(blob);
                                });
                            });
                            imagePromises.push(promise);
                        }
                    });
                    
                    return Promise.all(imagePromises);
                })
                .then(images => {
                    // 按文件名排序
                    images.sort((a, b) => a.name.localeCompare(b.name));
                    
                    totalPages = images.length;
                    updatePageCounter();
                    
                    // 显示第一张图片
                    showZipImage(images, 0);
                    
                    // 分页控制
                    prevPageBtn.onclick = () => {
                        if (currentPage > 1) {
                            currentPage--;
                            showZipImage(images, currentPage - 1);
                            updatePageCounter();
                        }
                    };
                    
                    nextPageBtn.onclick = () => {
                        if (currentPage < totalPages) {
                            currentPage++;
                            showZipImage(images, currentPage - 1);
                            updatePageCounter();
                        }
                    };
                    
                    // 键盘翻页支持
                    document.addEventListener('keydown', function(e) {
                        if (e.key === 'ArrowLeft' && currentPage > 1) {
                            currentPage--;
                            showZipImage(images, currentPage - 1);
                            updatePageCounter();
                        } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
                            currentPage++;
                            showZipImage(images, currentPage - 1);
                            updatePageCounter();
                        }
                    });
                })
                .catch(error => {
                    console.error('解压ZIP失败:', error);
                    comicContent.innerHTML = '<p>解压文件失败: ' + error.message + '</p>';
                });
        };
        
        document.head.appendChild(script);
    }
    
    // 显示ZIP中的图片
    function showZipImage(images, index) {
        comicContent.innerHTML = `
            <img src="${images[index].data}" alt="漫画页面 ${index + 1}" 
                 style="max-width: 100%; max-height: 100%; transform: scale(${zoomLevel}); 
                        transform-origin: center; transition: transform 0.3s ease;">
        `;
    }
    
    // 更新页码计数器
    function updatePageCounter() {
        pageCounter.textContent = `${currentPage} / ${totalPages}`;
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
    }
    
    // 全屏功能
    fullscreenBtn.addEventListener('click', function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
                .then(() => {
                    isFullscreen = true;
                    fullscreenBtn.textContent = '❐';
                    fullscreenBtn.title = '退出全屏';
                })
                .catch(err => {
                    console.error('全屏错误:', err);
                });
        } else {
            document.exitFullscreen()
                .then(() => {
                    isFullscreen = false;
                    fullscreenBtn.textContent = '⛶';
                    fullscreenBtn.title = '全屏';
                })
                .catch(err => {
                    console.error('退出全屏错误:', err);
                });
        }
    });
    
    // 缩放功能
    zoomInBtn.addEventListener('click', function() {
        zoomLevel = Math.min(zoomLevel + 0.2, 3);
        applyZoom();
    });
    
    zoomOutBtn.addEventListener('click', function() {
        zoomLevel = Math.max(zoomLevel - 0.2, 0.5);
        applyZoom();
    });
    
    zoomResetBtn.addEventListener('click', function() {
        zoomLevel = 1;
        applyZoom();
    });
    
    function applyZoom() {
        const img = comicContent.querySelector('img');
        if (img) {
            img.style.transform = `scale(${zoomLevel})`;
        }
    }
    
    // 初始化加载漫画
    loadComics();
});
