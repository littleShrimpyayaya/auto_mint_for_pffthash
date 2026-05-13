# pffthash-auto

## 中文说明

这个工具用 Playwright 连接 Chrome，自动完成 pffthash 挖矿流程：

1. 检测 `https://pffthash.com/` 首页按钮是否变成 `Sign & Mint`
2. 自动点击 `Sign & Mint`
3. 自动点击 MetaMask 里的 `确认 / Confirm`
4. MetaMask 确认后，不等待 MetaMask 的 `回到首页`
5. 继续监控 pffthash 页面，页面可以开始下一轮时自动点击

工具不会读取助记词、私钥、钱包密码或 Google 账号密码。它只负责点击已经打开的浏览器页面。

## 推荐使用方式：CDP 模式

如果你的 MetaMask 是用 Google 登录的，不建议直接用 `npm.cmd start` 打开的自动化浏览器登录。那种模式容易卡在：

```text
taking longer than expected, please bear with us
```

请使用 CDP 模式。这个模式是：你先打开一个正常 Chrome，手动登录并连接钱包；脚本再连接这个 Chrome 自动点击按钮。

### 第 1 步：关闭所有 Chrome

先关闭所有 Chrome 窗口。

如果不确定是否还有后台 Chrome，请打开任务管理器，结束所有 `chrome.exe`。

### 第 2 步：进入项目目录

打开 PowerShell，运行：

```powershell
cd D:\pffthash_auto
```

### 第 3 步：启动可被脚本连接的 Chrome

运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-debug-chrome.ps1
```

这个命令会打开 Chrome，并访问 `https://pffthash.com/`。

### 第 4 步：手动连接 MetaMask

在第 3 步打开的 Chrome 里操作：

1. 确认 MetaMask 插件已经登录成功
2. 打开 `https://pffthash.com/`
3. 点击网页右上角的 `Connect`
4. 在 `Connect Wallet` 弹窗里选择 `MetaMask`
5. 如果 MetaMask 弹出连接授权，点击 `Next / 下一步`，再点击 `Connect / 连接`
6. 确认网页已经显示钱包地址，或者 `Connect` 按钮消失

注意：不要点击网站弹窗里的 `Continue with Google`。你现在使用的是已经登录好的 MetaMask 插件，要选择 `MetaMask` 那一行。

### 第 5 步：启动自动挖矿脚本

不要关闭第 3 步打开的 Chrome。

再打开一个 PowerShell，运行：

```powershell
cd D:\pffthash_auto
npm.cmd run start:cdp
```

看到类似日志表示脚本已经接管：

```text
connecting to Chrome over CDP: http://127.0.0.1:9222
using site page: Pow Free Fair Mint https://pffthash.com/
mint button ready: Sign & Mint
clicked: site #mintBtn via Playwright
clicked: MetaMask button:has-text("确认")
MetaMask confirmed. Continue polling pffthash for the next round.
```

### 第 6 步：停止脚本

在运行脚本的 PowerShell 里按：

```text
Ctrl + C
```

## 安装依赖

第一次使用前需要安装依赖：

```powershell
cd D:\pffthash_auto
npm.cmd install
```

## 常见问题

### 已经登录 MetaMask，但网站还是让 Google 登录

不要点 `Continue with Google`。在 `Connect Wallet` 弹窗里选择 `MetaMask`。

### 脚本识别到 `Sign & Mint`，但没有下一步

重新拉取最新脚本后运行：

```powershell
npm.cmd run start:cdp
```

新版本会打印按钮状态，并在普通点击无效时尝试 DOM 点击。

### 成功确认交易，但 MetaMask 还停在回首页页面

这是正常的。MetaMask 里的 `回到首页` 和 pffthash 下一轮没有关联，脚本不会等待它。

脚本只要点完 MetaMask 的 `确认 / Confirm`，就会继续监控 pffthash 页面。等 pffthash 页面再次出现 `Sign & Mint`，脚本会自动开始下一轮。

### Chrome 打开后不是你原来的钱包状态

说明还有旧 Chrome 进程占用默认用户数据。

处理方式：

1. 关闭所有 Chrome
2. 打开任务管理器
3. 结束所有 `chrome.exe`
4. 重新运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-debug-chrome.ps1
```

## 配置项

PowerShell 示例：

```powershell
$env:PFF_POLL_MS="3000"
$env:PFF_CONFIRM_DELAY_MS="1200"
$env:PFF_DRY_RUN="0"
npm.cmd run start:cdp
```

可用配置：

- `PFF_CDP_URL`: 连接已打开的 Chrome，默认示例是 `http://127.0.0.1:9222`
- `PFF_URL`: 网站地址，默认 `https://pffthash.com/`
- `PFF_POLL_MS`: 首页检测间隔，默认 `3000`
- `PFF_CONFIRM_DELAY_MS`: 检测到 MetaMask 确认按钮后延迟点击，默认 `1200`
- `PFF_DRY_RUN`: 设置为 `1` 时只打印动作，不实际点击
- `PFF_USE_CHROME_DEFAULT`: 设置为 `1` 时复用 Chrome 默认配置
- `PFF_CHROME_USER_DATA_DIR`: 自定义 Chrome 用户数据目录
- `PFF_CHROME_PROFILE`: Chrome profile 名，默认 `Default`
- `PFF_CHROME_EXE`: Chrome 路径
- `PFF_METAMASK_ID`: MetaMask 扩展 ID，默认 `nkbihfbeogaeaoehlefnkodbefgpgknn`
- `PFF_METAMASK_EXTENSION_PATH`: 未打包 MetaMask 扩展目录

## 安全提醒

自动点击 MetaMask 确认意味着脚本可以替你发送链上交易。请只使用你能承担风险的钱包，并建议只放挖矿需要的少量资金。

---

## English Guide

This tool connects to Chrome with Playwright and automates the pffthash minting loop:

1. Detect `Sign & Mint` on `https://pffthash.com/`
2. Click `Sign & Mint`
3. Click `Confirm` in MetaMask
4. Do not wait for MetaMask `Back Home`
5. Keep polling pffthash and start the next round when the site is ready

It does not read seed phrases, private keys, wallet passwords, or Google passwords. It only clicks pages that are already open in your browser.

## Recommended Mode: CDP

If your MetaMask uses Google/social login, do not use a fresh Playwright browser for login. It can get stuck at:

```text
taking longer than expected, please bear with us
```

Use CDP mode instead. You log in and connect the wallet manually in normal Chrome, then the script attaches to that browser.

### Step 1: Close Chrome

Close all Chrome windows.

If needed, open Task Manager and end all `chrome.exe` processes.

### Step 2: Open the Project Folder

In PowerShell:

```powershell
cd D:\pffthash_auto
```

### Step 3: Start Chrome With Remote Debugging

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-debug-chrome.ps1
```

This opens Chrome and visits `https://pffthash.com/`.

### Step 4: Connect MetaMask Manually

In the Chrome window from Step 3:

1. Make sure the MetaMask extension is logged in
2. Open `https://pffthash.com/`
3. Click `Connect` in the top-right corner
4. In the `Connect Wallet` modal, choose `MetaMask`
5. If MetaMask asks for permission, click `Next`, then `Connect`
6. Make sure the site shows your wallet address, or the `Connect` button disappears

Do not click `Continue with Google` in the site modal. Choose the `MetaMask` row because you are using the already logged-in browser extension.

### Step 5: Start Automation

Keep the Chrome window from Step 3 open.

Open another PowerShell and run:

```powershell
cd D:\pffthash_auto
npm.cmd run start:cdp
```

Expected logs look like:

```text
connecting to Chrome over CDP: http://127.0.0.1:9222
using site page: Pow Free Fair Mint https://pffthash.com/
mint button ready: Sign & Mint
clicked: site #mintBtn via Playwright
clicked: MetaMask button:has-text("Confirm")
MetaMask confirmed. Continue polling pffthash for the next round.
```

### Step 6: Stop Automation

Press this in the PowerShell running the script:

```text
Ctrl + C
```

## Install

Run once before using:

```powershell
cd D:\pffthash_auto
npm.cmd install
```

## Fallback Modes

Launch a separate automation Chrome profile:

```powershell
npm.cmd start
```

Reuse the default Chrome profile. Close all Chrome windows first:

```powershell
npm.cmd run start:chrome-default
```

## Safety

Auto-confirming MetaMask means the script can send on-chain transactions for you. Use a wallet with only the funds you are willing to risk.
