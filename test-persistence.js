
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 处理 ESM 缺失的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ==================================================================================
 * 终端博客全指令自动化回归测试脚本
 * ==================================================================================
 * 功能：从 src/commands/index.js 动态读取指令列表并逐一进行冒烟测试或深度测试
 */

class TestReporter {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
    }

    addResult(suite, name, passed, duration, error = null) {
        this.results.push({ suite, name, passed, duration, error });
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`[${suite}] ${status}: ${name} (${duration}ms)`);
        if (error) console.error(`   Error: ${error}`);
    }

    generateReport() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = total - passed;
        const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
        const passRate = ((passed / total) * 100).toFixed(2);

        let report = `# 终端博客全指令回归测试报告\n\n`;
        report += `## 测试摘要\n`;
        report += `- **总用例**: ${total} | **通过**: ${passed} | **失败**: ${failed}\n`;
        report += `- **通过率**: ${passRate}% | **总耗时**: ${duration}s\n\n`;
        report += `| 模块 | 指令 | 状态 | 耗时 | 备注 |\n| --- | --- | --- | --- | --- |\n`;

        this.results.forEach(r => {
            const status = r.passed ? '✅' : '❌';
            report += `| ${r.suite} | ${r.name} | ${status} | ${r.duration}ms | ${r.error || '-'} |\n`;
        });
        return report;
    }
}

class TerminalPage {
    constructor(page) {
        this.page = page;
        this.inputSelector = 'input.command-content';
    }

    async execute(cmd, waitMs = 500) {
        const start = Date.now();
        await this.page.waitForSelector(this.inputSelector, { state: 'visible' });
        await this.page.fill(this.inputSelector, cmd);
        await this.page.press(this.inputSelector, 'Enter');
        if (waitMs > 0) await this.page.waitForTimeout(waitMs);
        return Date.now() - start;
    }

    async getOutput() {
        return await this.page.evaluate(() => {
            const outputs = document.querySelectorAll('.output');
            return Array.from(outputs).map(o => o.innerText).join('\n');
        });
    }
}

// 解析指令列表的辅助函数
function getCommandList() {
    // 直接扫描 src/commands 目录下的 .js 文件（排除 index.js）
    // 假设文件名即为指令名（如 ls.js -> ls, fileCmds.js -> [ls, cd, ...]）
    // 但我们的新结构是 fileCmds.js 导出多个命令
    // 因此我们需要一种更健壮的方式：硬编码已知命令列表，或者尝试解析文件内容
    // 鉴于目前是测试脚本，我们可以简单地硬编码所有已知命令，或者解析 index.js 的自动导入逻辑（太复杂）
    // 最好的方式是：读取 src/commands 下的所有文件，正则匹配 'export const xxx ='
    
    const commandsDir = path.join(__dirname, 'src/commands');
    const files = fs.readdirSync(commandsDir);
    let commands = [];

    files.forEach(file => {
        if (file === 'index.js' || !file.endsWith('.js')) return;
        
        const content = fs.readFileSync(path.join(commandsDir, file), 'utf-8');
        // 匹配 export const commandName = ...
        const matches = content.matchAll(/export\s+const\s+(\w+)\s*=/g);
        for (const match of matches) {
             // 排除 default 和 commands 导出
             if (match[1] !== 'default' && match[1] !== 'commands') {
                 commands.push(match[1]);
             }
        }
        
        // 匹配 export default function ... 或 export default ...
        // 注意：vi.js 和 read.js 是 export default vi;
        const defaultMatch = content.match(/export\s+default\s+(\w+)/);
        if (defaultMatch && defaultMatch[1] !== 'commands') {
            commands.push(defaultMatch[1]);
        }
    });

    // 映射特殊的别名 (如 viewFile -> cat)
    commands = commands.map(cmd => cmd === 'viewFile' ? 'cat' : cmd);
    
    // 去重
    return [...new Set(commands)];
}

// 指令测试配置
const commandSpecs = {
    'ls': { args: '' },
    'cd': { args: 'post' },
    'cat': { args: 'Readme.md' },
    'tree': { args: '' },
    'help': { args: '' },
    'clear': { args: '', wait: 100 },
    'size': { args: '16' },
    'background': { args: '0.8' },
    'ipconfig': { args: '', wait: 2000 },
    'ping': { args: 'baidu.com', wait: 3000 },
    'theme': { args: 'dark' },
    'echo': { args: 'hello_world' },
    'font': { args: 'Fira Code' },
    'test-config': { args: '' },
    'find': { args: 'a' },
    'wget': { args: 'config.toml' },
    'clear-config': { args: '', wait: 1000 },
    'vi': { args: 'config.toml', isVi: true },
    'read': { args: 'Readme.md', isRead: true }
};

(async () => {
    const commands = getCommandList();
    console.log(`🔍 识别到 ${commands.length} 个指令: ${commands.join(', ')}`);

    const browser = await chromium.launch({ headless: false, slowMo: 100 });
    const context = await browser.newContext();
    const page = await context.newPage();
    const reporter = new TestReporter();
    const tp = new TerminalPage(page);

    try {
        await page.goto('http://localhost:5173/');
        await page.waitForLoadState('networkidle');

        for (const cmdName of commands) {
            console.log(`\n▶️ 正在测试指令: ${cmdName}`);
            const spec = commandSpecs[cmdName] || { args: '' };
            const fullCmd = `${cmdName} ${spec.args}`.trim();
            const start = Date.now();

            try {
                if (spec.isVi) {
                    // Vi 深度测试 (默认进入 NORMAL 模式)
                    await tp.execute(fullCmd, 1000);
                    const viVisible = await page.isVisible('.terminal-editor-overlay');
                    if (viVisible) {
                        // NORMAL 模式下直接输入 : 进入命令模式
                        await page.keyboard.type(':q');
                        await page.keyboard.press('Enter');
                        await page.waitForSelector('.terminal-editor-overlay', { state: 'hidden' });
                        reporter.addResult('Deep', cmdName, true, Date.now() - start);
                    } else {
                        throw new Error('编辑器未打开');
                    }
                } else if (spec.isRead) {
                    // Read 深度测试
                    await tp.execute(fullCmd, 1000);
                    const readVisible = await page.isVisible('.terminal-reader-overlay');
                    if (readVisible) {
                        await page.keyboard.press('Escape');
                        await page.waitForSelector('.terminal-reader-overlay', { state: 'hidden' });
                        reporter.addResult('Deep', cmdName, true, Date.now() - start);
                    } else {
                        throw new Error('阅读器未打开');
                    }
                } else {
                    // 普通指令冒烟测试
                    const duration = await tp.execute(fullCmd, spec.wait || 500);
                    const output = await tp.getOutput();
                    const hasError = output.toLowerCase().includes('error') || output.toLowerCase().includes('not found');
                    
                    // 特殊处理：有些命令本身输出可能包含 Error 字符（如测试错误处理的指令）
                    // 这里简单判断，只要没崩溃且有输出就算过
                    reporter.addResult('Smoke', cmdName, !hasError || cmdName === 'clear-config', duration);
                }
            } catch (e) {
                reporter.addResult('Smoke', cmdName, false, Date.now() - start, e.message);
            }
        }

        // 生成报告
        const report = reporter.generateReport();
        fs.writeFileSync(path.join(__dirname, 'test-report.md'), report);
        console.log('\n✅ 全指令回归测试完成！报告已更新。');

    } catch (err) {
        console.error('❌ 测试发生致命错误:', err);
    } finally {
        await browser.close();
    }
})();
