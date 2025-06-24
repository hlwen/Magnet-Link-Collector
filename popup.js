// 提取 clearCache 函数到外部
function clearCache() {
  if (confirm('确定要清空缓存吗？')) {
    chrome.runtime.sendMessage({ action: 'clearCache' }, () => {
      const container = document.getElementById('links');
      container.innerHTML = '';
    });
  }
}

function loadLinks(query = '') {
  const container = document.getElementById('links');

  chrome.runtime.sendMessage({ action: 'getCache' }, function (response) {
    if (chrome.runtime.lastError) {
      console.error('发送消息时出错:', chrome.runtime.lastError);
      return;
    }

    container.innerHTML = '';
    if (!response) {
      console.error('获取的数据为 null');
      return;
    }
    let filtered = response;
    if (query) {
      filtered = response.filter(item =>
        item.link.includes(query) || (item.description && item.description.includes(query))
      );
    }

    filtered.forEach(item => {
      const div = document.createElement('div');
      div.className = 'link-item';

      div.innerHTML = `
        <strong>${item.description || '无描述'}</strong><br>
        <small>${item.link}</small><br>
      `;

      const copyBtn = document.createElement('button');
      copyBtn.textContent = '复制';
      copyBtn.onclick = () => navigator.clipboard.writeText(item.link);

      const delBtn = document.createElement('button');
      delBtn.textContent = '删除';
      delBtn.onclick = () => {
        chrome.runtime.sendMessage({ action: 'removeLink', link: item.link });
        div.remove();
      };

      div.appendChild(copyBtn);
      div.appendChild(delBtn);
      container.appendChild(div);
    });
  });
}

// 单独的全部复制函数
function copyAllLinks() {
  chrome.runtime.sendMessage({ action: 'getCache' }, function (response) {
    if (chrome.runtime.lastError) {
      console.error('获取缓存时出错:', chrome.runtime.lastError);
      return;
    }
    if (!response) {
      console.error('获取的数据为 null');
      return;
    }
    const allLinks = response.map(linkObj => linkObj.link).join('\n');
    const feedbackDiv = document.getElementById('copy-feedback');
    navigator.clipboard.writeText(allLinks).then(() => {
      feedbackDiv.textContent = '全部链接已复制到剪贴板';
      // 3 秒后清除反馈信息
      setTimeout(() => {
        feedbackDiv.textContent = '';
      }, 3000);
    }).catch((err) => {
      feedbackDiv.textContent = '复制失败: ' + err;
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  const container = document.getElementById('links');

  const buts  = document.createElement('div');
  buts.className = 'buts';

  container.parentNode.insertBefore(buts, container);
  // 创建全部复制按钮
  const copyAllButton = document.createElement('button');
  copyAllButton.innerText = '全部复制';
  copyAllButton.style.marginBottom = '10px';
  buts.appendChild(copyAllButton);
  copyAllButton.onclick = copyAllLinks;


  // 创建清空缓存按钮
  const clearAllButton = document.createElement('button');
  clearAllButton.innerText = '清空缓存';
  clearAllButton.style.marginBottom = '10px';
  buts.appendChild(clearAllButton);
  clearAllButton.onclick = clearCache;
  
  // 创建反馈区域
  const feedbackDiv = document.createElement('div');
  feedbackDiv.id = 'copy-feedback';
  container.parentNode.insertBefore(feedbackDiv, container);

  document.getElementById('searchInput').addEventListener('input', function () {
    loadLinks(this.value);
  });

  loadLinks();
});