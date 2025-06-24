let cache = []
// 从存储中获取缓存
const getCacheFromStorage = () => {
  return new Promise((resolve) => {
      chrome.storage.local.get('magnetCache', (result) => {
          resolve(result.magnetCache || []);
          cache = result.magnetCache || [];
      });
  });
};

// 将缓存保存到存储中
const saveCacheToStorage = (cache) => {
  chrome.storage.local.set({ magnetCache: cache });
};

// 合并所有的消息监听
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'addLink') {
      try {
        // 检查链接是否已存在
        const exists = cache.some(item => item.link === request.link);
        if (!exists) {
          cache.push({ link: request.link, description: request.description });
          saveCacheToStorage(cache);
        }
        sendResponse({ success: true, alreadyExists: exists });
      } catch (error) {
        console.error('添加链接时出错:', error);
        sendResponse({ success: false, error: error.message });
      }
  } else if (request.action === 'getCache') {
      try {
        sendResponse(cache);
      } catch (error) {
        console.error('获取缓存时出错:', error);
        sendResponse([]);
      }
  } else if (request.action === 'removeLink') {
      try {
        const newCache = cache.filter(item => item.link !== request.link);
        saveCacheToStorage(newCache);
        sendResponse({ success: true });
      } catch (error) {
        console.error('删除链接时出错:', error);
        sendResponse({ success: false, error: error.message });
      }
  }
  return true;
});