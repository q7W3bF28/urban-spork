document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const shareChoice = document.getElementById('share-choice');
    const viewChoice = document.getElementById('view-choice');
    
    // 添加点击事件
    shareChoice.addEventListener('click', function() {
        window.location.href = 'share.html';
    });
    
    viewChoice.addEventListener('click', function() {
        window.location.href = 'view.html';
    });
    
    // 添加键盘快捷键支持
    document.addEventListener('keydown', function(e) {
        if (e.key === '1' || e.key === 's') {
            shareChoice.click();
        } else if (e.key === '2' || e.key === 'v') {
            viewChoice.click();
        }
    });
});
