import { CommandAPI } from "../composables/CommandAPI";

// ipconfig 命令
export const ipconfig = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  
  // 获取本地 IP (通过 WebRTC)
  const getLocalIP = () => {
    return new Promise((resolve) => {
      const RTCPeerConnection =
        window.RTCPeerConnection ||
        window.mozRTCPeerConnection ||
        window.webkitRTCPeerConnection;
      if (!RTCPeerConnection) {
        resolve(null);
        return;
      }
      const pc = new RTCPeerConnection({ iceServers: [] });
      const noop = () => {};
      const timeoutId = setTimeout(() => {
        pc.close();
        resolve(null);
        resolve(null);
      }, 2000);
      pc.onicecandidate = (ice) => {
        if (ice && ice.candidate && ice.candidate.candidate) {
          const myIPRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
          const match = myIPRegex.exec(ice.candidate.candidate);
          if (match) {
            clearTimeout(timeoutId);
            pc.onicecandidate = noop;
            pc.close();
            resolve(match[1]);
          }
        }
      };
      pc.createDataChannel("");
      pc.createOffer()
        .then((sdp) => pc.setLocalDescription(sdp, noop, noop))
        .catch(() => {});
    });
  };

  cmd.info("正在检查网络配置...");
  await cmd.scroll();

  try {
    // 1. 获取公网 IP
    const publicIpPromise = fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data) => data.ip)
      .catch(() => "Unknown");
      
    // 2. 获取 DNS 信息
    const dnsInfoPromise = fetch("https://edns.ip-api.com/json")
      .then((res) => res.json())
      .then((data) => data.dns)
      .catch(() => null);

    // 3. 获取本地 IP
    const localIpPromise = getLocalIP();

    const [publicIp, dnsData, realLocalIp] = await Promise.all([
      publicIpPromise,
      dnsInfoPromise,
      localIpPromise,
    ]);

    const displayLocalIp =
      realLocalIp ||
      `192.168.1.${Math.floor(Math.random() * 200 + 20)} (模拟)`;
    const isSimulated = !realLocalIp;
    
    const dnsSuffix = dnsData ? dnsData.geo.split(' ').pop().toLowerCase() + ".local" : "localdomain";
    const dnsDisplay = dnsData 
      ? `${dnsData.ip} (${dnsData.geo})`
      : "192.168.1.1 (模拟)";

    const info = [
      `\nWindows IP 配置\n`,
      `以太网适配器 Ethernet 0:`,
      `   连接特定的 DNS 后缀 . . . . . . . : ${dnsSuffix}`,
      `   本地链接 IPv6 地址. . . . . . . . : fe80::${Math.floor(
        Math.random() * 9999
      )}%11`,
      `   IPv4 地址 . . . . . . . . . . . . : ${displayLocalIp} ${
        isSimulated
          ? "<- 浏览器隐私策略已屏蔽真实 IP"
          : "<- 通过 WebRTC 检测>"
      }`,
      `   子网掩码  . . . . . . . . . . . . : 255.255.255.0`,
      `   默认网关. . . . . . . . . . . . . : 192.168.1.1`,
      `   DNS 服务器  . . . . . . . . . . . : ${dnsDisplay}`,
      `\n广域网 (WAN) 统计:`,
      `   公网 IP 地址. . . . . . . . . . . : ${publicIp}`,
    ];

    cmd.success(info.join("\n"));
    await cmd.scroll();
  } catch (e) {
    cmd.error("读取网络配置失败。");
  }
};

// ping 命令
export const ping = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const target = cmd.getArg(0, "localhost");
  
  let url = target.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  const displayUrl = url.replace(/^https?:\/\//, "");

  const stats = { sent: 0, received: 0, times: [] };

  cmd.info(`正在 Ping ${displayUrl} [TCP/HTTP 模拟] 具有 32 字节的数据:`);
  await cmd.scroll();
  await cmd.sleep(500);

  for (let i = 0; i < 4; i++) {
    stats.sent++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const start = performance.now();

    try {
      await fetch(url, {
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });
      const end = performance.now();
      clearTimeout(timeoutId);
      const time = (end - start).toFixed(0);
      stats.times.push(parseInt(time));
      stats.received++;
      
      cmd.success(`来自 ${displayUrl} 的回复: 时间=${time}ms 协议=HTTP/HTTPS`);
    } catch (err) {
      clearTimeout(timeoutId);
      let errorMsg = "请求超时。";
      if (err.name !== "AbortError") {
        errorMsg = "无法访问目标主机 (网络/CORS 错误)。";
      }
      cmd.error(errorMsg);
    }
    
    await cmd.scroll();
    
    if (i < 3) {
      await cmd.sleep(1000);
    }
  }

  cmd.print("");
  await cmd.scroll();
  await cmd.sleep(200);

  const lost = stats.sent - stats.received;
  const lostPercent = Math.round((lost / stats.sent) * 100);
  let min = 0, max = 0, avg = 0;
  if (stats.times.length > 0) {
    min = Math.min(...stats.times);
    max = Math.max(...stats.times);
    avg = Math.round(stats.times.reduce((a, b) => a + b, 0) / stats.times.length);
  }

  const statsLines = [
    `${displayUrl} 的 Ping 统计信息:`,
    `    数据包: 已发送 = ${stats.sent}，已接收 = ${stats.received}，丢失 = ${lost} (${lostPercent}% 丢失)，`,
    `往返行程的估计时间(以毫秒为单位):`,
    `    最短 = ${min}ms，最长 = ${max}ms，平均 = ${avg}ms`,
  ];

  for (const line of statsLines) {
    cmd.info(line);
    await cmd.scroll();
    await cmd.sleep(150);
  }
};
