// 测试设置持久化功能
const { chromium } = require('playwright');

(async () => {
  // 启动浏览器
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // 导航到应用程序
  await page.goto('http://localhost:5173/');
  
  // 等待页面加载完成
  await page.waitForLoadState('networkidle');
  
  // 1. 执行命令修改字体大小
  await page.fill('input.command-content', 'size 20');
  await page.press('input.command-content', 'Enter');
  
  // 等待命令执行完成
  await page.waitForTimeout(500);
  
  // 2. 检查localStorage中是否保存了设置
  const savedSettings = await page.evaluate(() => {
    return localStorage.getItem('terminalSettings');
  });
  
  console.log('localStorage中的设置:', savedSettings);
  
  if (savedSettings) {
    const parsedSettings = JSON.parse(savedSettings);
    
    // 3. 检查字体大小是否已保存
    if (parsedSettings.fontSize === '20') {
      console.log('✅ 设置持久化测试成功：字体大小已保存到localStorage');
    } else {
      console.log('❌ 设置持久化测试失败：字体大小未保存到localStorage');
      console.log('实际保存的字体大小:', parsedSettings.fontSize);
    }
    
    // 4. 执行命令修改背景透明度
    await page.fill('input.command-content', 'background 0.5');
    await page.press('input.command-content', 'Enter');
    
    // 等待命令执行完成
    await page.waitForTimeout(500);
    
    // 5. 再次检查localStorage中的设置
    const updatedSettings = await page.evaluate(() => {
      return localStorage.getItem('terminalSettings');
    });
    
    console.log('更新后的localStorage设置:', updatedSettings);
    
    if (updatedSettings) {
      const parsedUpdatedSettings = JSON.parse(updatedSettings);
      
      // 6. 检查背景透明度是否已保存
      if (parsedUpdatedSettings.background.opacity === 0.5) {
        console.log('✅ 背景透明度持久化测试成功：透明度已保存到localStorage');
      } else {
        console.log('❌ 背景透明度持久化测试失败：透明度未保存到localStorage');
        console.log('实际保存的透明度:', parsedUpdatedSettings.background.opacity);
      }
    }
  } else {
    console.log('❌ 设置持久化测试失败：localStorage中没有保存任何设置');
  }
  
  // 关闭浏览器
  await browser.close();
})();