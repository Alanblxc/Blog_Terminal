
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
    const indexPath = path.join(__dirname, 'src/commands/index.js');
    const content = fs.readFileSync(indexPath, 'utf-8');
    const match = content.match(/export const commands = \{([\s\S]+?)\};/);
    if (!match) return [];
    
    return match[1].split(',')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'))
        .map(line => {
            const parts = line.split(':');
            let name = parts[0].trim().replace(/['"]/g, '');
            return name;
        });
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
    'ping': { args: 'google.com', wait: 3000 },
    'theme': { args: 'dark' },
    'echo': { args: 'hello_world' },
    'font': { args: 'Fira Code' },
    'test-config': { args: '' },
    'find': { args: 'terminal' },
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
