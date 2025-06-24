(function () {
  const PROCESSED_ATTR = 'data-magnet-processed';
  const MIN_MAGNET_LENGTH = 30; // 设定最小链接长度，可根据实际情况调整
// 创建提示元素
const createNotification = (message) => {
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.backgroundColor = '#4CAF50';
  notification.style.color = 'white';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '1000';
  notification.textContent = message;
  document.body.appendChild(notification);

  // 3 秒后移除提示
  setTimeout(() => {
    notification.remove();
  }, 3000);
};
  function findMagnetLinks(rootNode) {
    const magnetRegex = /magnet:\?xt=urn:[^"\s<>]+/g;
    const stack = [rootNode];

    while (stack.length > 0) {
        const node = stack.pop();

        // 跳过已经处理过的节点
        if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute(PROCESSED_ATTR)) {
            continue;
        }

        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
            try {
                const html = node.textContent.replace(magnetRegex, match => {
                    // 检查是否是 a 标签内的链接，如果是则跳过
                    let parent = node.parentNode;
                    while (parent) {
                        if (parent.tagName === 'A' && parent.href === match) {
                            return match;
                        }
                        parent = parent.parentNode;
                    }
                    // 检查链接长度
                    if (match.length < MIN_MAGNET_LENGTH) {
                      return match;
                  }
                  return `
                    <div style="border:1px solid #ccc; padding:5px; margin:5px 0; display:inline-block;">
                      ${match}
                      <button class="magnet-add-btn" data-link="${match}">添加</button>
                      <button class="magnet-copy-btn" data-link="${match}">复制</button>
                    </div>`;
              });

                if (html !== node.textContent) {
                    const temp = document.createElement('div');
                    temp.innerHTML = html;
                    const parent = node.parentNode;
                    while (temp.firstChild) {
                        const newNode = temp.firstChild;
                        // 标记新插入的节点为已处理
                        if (newNode.nodeType === Node.ELEMENT_NODE) {
                            newNode.setAttribute(PROCESSED_ATTR, 'true');
                        }
                        parent.insertBefore(newNode, node);
                    }
                    parent.removeChild(node);
                }
            } catch (e) {
                console.log(e);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE'].includes(node.tagName)) {
            // 标记当前元素为已处理
            node.setAttribute(PROCESSED_ATTR, 'true');
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                stack.push(node.childNodes[i]);
            }
        }
    }
  }

  // 查找页面中所有的 a 标签内的 magnet 链接并添加按钮
  function addButtonsToAnchorLinks() {
    document.querySelectorAll('a[href^="magnet:"]').forEach(link => {
        if (link.href.length >= MIN_MAGNET_LENGTH) {
          // 添加复制按钮
          const copyBtn = document.createElement('button');
          copyBtn.innerText = '复制';
          copyBtn.style.marginLeft = '10px';
          copyBtn.addEventListener('click', (e) => {
              e.preventDefault();
              navigator.clipboard.writeText(link.href).then(() => {
                  createNotification('链接已复制到剪贴板');
              }).catch((err) => {
                  createNotification('复制失败: ' + err);
              });
          });
          link.parentNode.insertBefore(copyBtn, link.nextSibling);

          // 原有的添加到缓存按钮
          const addBtn = document.createElement('button');
          addBtn.innerText = '添加';
          addBtn.style.marginLeft = '10px';
          addBtn.addEventListener('click', (e) => {
              e.preventDefault();
              chrome.runtime.sendMessage({
                  action: 'addLink',
                  link: link.href,
                  // description: prompt('请输入该链接的描述:', '')
              },function(){
                if (chrome.runtime.lastError) {
                  console.error('添加链接时出错:', chrome.runtime.lastError);
                  createNotification('添加链接时出错:'+ chrome.runtime.lastError.message);  
                }else{
                  createNotification('链接已添加到缓存');
                }

              });
          });
          link.parentNode.insertBefore(addBtn, copyBtn.nextSibling);
        }
    });
}
  // 一键复制所有链接
  function copyAllLinks() {
    const links = collectAllMagnetLinks();
    const allLinks = links.join('\n');
    navigator.clipboard.writeText(allLinks).then(() => {
        createNotification('所有链接已复制到剪贴板');
    }).catch((err) => {
        createNotification('复制失败: ' + err);
    });
  }
  // 收集所有磁力链接
  function collectAllMagnetLinks() {
    let magnetLinks = [];
    // 从 a 标签中收集
    document.querySelectorAll('a[href^="magnet:"]').forEach(link => {
      if (link.href.length >= MIN_MAGNET_LENGTH) {
        magnetLinks.push(link.href);
      }
    });

    // 从页面文本中收集
    const magnetRegex = /magnet:\?xt=urn:[^"\s<>]+/g;
    const allTextNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = allTextNodes.nextNode())) {
      const matches = node.textContent.match(magnetRegex);
      if (matches) {
        matches.forEach(match => {
          if (match.length >= MIN_MAGNET_LENGTH) {
            magnetLinks.push(match);
          }
        });
      }
    }

    // 去重
    magnetLinks = [...new Set(magnetLinks)];
    return magnetLinks;
  }

  // 一键添加所有链接
  function addAllLinks() {
    const links = collectAllMagnetLinks();
    links.forEach(link => {
      chrome.runtime.sendMessage({
        action: 'addLink',
        link: link,
        // description: prompt('请输入该链接的描述:', '')
      });
    });
    createNotification('所有链接已开始添加到缓存');
  }

  // window.addEventListener('load', () => {
      console.log(1111);
      findMagnetLinks(document.body);
      addButtonsToAnchorLinks();

      // 创建一键添加所有链接的按钮
      const links = collectAllMagnetLinks();
      if (links.length > 0) {
        const buts  = document.createElement('div');
        buts.style.position = 'fixed';
        buts.style.top = '10px';
        buts.style.right = '10px';
        buts.style.display = 'flex';
        document.body.appendChild(buts);
        // 创建一键添加所有链接的按钮
        const addAllButton = document.createElement('button');
        addAllButton.textContent = '一键添加所有链接';
        addAllButton.addEventListener('click', addAllLinks);
        buts.appendChild(addAllButton);
         // 创建一键复制所有链接的按钮
         const copyAllButton = document.createElement('button');
         copyAllButton.textContent = '一键复制所有链接';
         copyAllButton.addEventListener('click', copyAllLinks);
         buts.appendChild(copyAllButton);
      }

      // 监听点击事件，用于新增的按钮
      document.addEventListener('click', function (e) {
          if (e.target.classList.contains('magnet-add-btn')) {
            e.preventDefault(); // 阻止默认行为
              const magnetLink = e.target.dataset.link;
              if (magnetLink.length >= MIN_MAGNET_LENGTH) {
                chrome.runtime.sendMessage({
                    action: 'addLink',
                    link: magnetLink,
                    // description: prompt('请输入该链接的描述:', '')
                },function(){
                  if (chrome.runtime.lastError) {
                    console.error('添加链接时出错:', chrome.runtime.lastError);
                    createNotification('添加链接时出错:'+ chrome.runtime.lastError.message);  
                  }else{
                    createNotification('链接已添加到缓存');
                  }

                });
              }
          } else if (e.target.classList.contains('magnet-copy-btn')) {
            e.preventDefault();
            const magnetLink = e.target.dataset.link;
            navigator.clipboard.writeText(magnetLink).then(() => {
                createNotification('链接已复制到剪贴板');
            }).catch((err) => {
                createNotification('复制失败: ' + err);
            });
          }
      });
  // });
})();