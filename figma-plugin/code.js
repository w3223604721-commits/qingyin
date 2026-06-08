// ============================================================
// Mapory v6 - 最小测试版
// 验证 Figma API 是否可用
// ============================================================

// 注意：不需要 figma.showUI()，我们是纯代码插件

async function main() {
  try {
    figma.notify('Initializing...');

    var doc = figma.currentPage;
    
    // 创建最简单的 Frame
    var testFrame = figma.createFrame();
    testFrame.name = 'TestFrame';
    testFrame.resize(375, 812);
    testFrame.x = 0;
    testFrame.y = 0;
    
    // 设置填充色 (纯白)
    testFrame.fills = [{type: 'SOLID', color: {r: 1, g: 1, b: 1}}];
    
    // 加载字体并创建文本
    await figma.loadFontAsync({family: 'Inter', style: 'Regular'});
    var testText = figma.createText();
    testText.name = 'TestText';
    testText.characters = 'Mapory v6 Test - Hello!';
    testText.fontSize = 24;
    testText.fontName = {family: 'Inter', style: 'Regular'};
    testText.fills = [{type: 'SOLID', color: {r: 0, g: 0, b: 0}}];
    testText.resize(300, 40);
    testText.x = 38;
    testText.y = 100;
    
    // 添加到页面
    testFrame.appendChild(testText);
    doc.appendChild(testFrame);
    
    // 聚焦
    figma.viewport.scrollAndZoomIntoView([testFrame]);
    
    figma.notify('SUCCESS! API works!', {timeout: 5000});
    figma.closePlugin();
    
  } catch(err) {
    var msg = String(err.message || err);
    console.error('[ERROR]', err.stack || err);
    figma.notify('FAIL: ' + msg, {error: true, timeout: 10000});
  }
}

main();
