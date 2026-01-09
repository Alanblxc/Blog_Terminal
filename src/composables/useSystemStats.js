import { ref, computed, onUnmounted } from "vue";

/**
 * useSystemStats
 * 
 * 封装系统监控逻辑：
 * 1. 时间和日期 (currentTime, currentDayOfWeek)
 * 2. 内存使用情况 (memoryInfo)
 * 3. CPU 使用率模拟 (cpuInfo)
 * 4. 网络延迟模拟 (latency)
 * 
 * 提供 startMonitoring 和 stopMonitoring 方法来管理定时器。
 */
export function useSystemStats() {
  const currentTime = ref("");
  const currentDayOfWeek = ref("");
  const memoryInfo = ref({ usage: 0, total: 0, percent: 0 });
  const cpuInfo = ref("0%");
  const latency = ref("0.000s");
  const sysInfoTimer = ref(null);

  // 聚合数据，方便模板使用
  const sysStats = computed(() => ({
    latency: latency.value,
    cpu: cpuInfo.value,
    mem: memoryInfo.value.percent,
    memUsage: memoryInfo.value.usage,
    memTotal: memoryInfo.value.total,
  }));

  const updateSysInfo = () => {
    const now = new Date();
    currentTime.value = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    
    currentDayOfWeek.value = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][now.getDay()];

    // 内存监控
    if (typeof performance !== 'undefined' && performance.memory) {
      const m = performance.memory;
      const used = Math.round(m.usedJSHeapSize / 1048576);
      const total = Math.round(m.totalJSHeapSize / 1048576);
      const percent = total > 0 ? Math.round((used / total) * 100) : 0;
      memoryInfo.value = {
        usage: used,
        total,
        percent,
      };
    }

    // CPU 模拟
    let lastTime = performance.now();
    requestAnimationFrame(() => {
      const delta = performance.now() - lastTime;
      cpuInfo.value = Math.min(100, Math.round((delta / 16.67) * 100)) + "%";
    });
  };

  const startMonitoring = (interval = 2000) => {
    updateSysInfo();
    if (!sysInfoTimer.value) {
      sysInfoTimer.value = setInterval(updateSysInfo, interval);
    }
  };

  const stopMonitoring = () => {
    if (sysInfoTimer.value) {
      clearInterval(sysInfoTimer.value);
      sysInfoTimer.value = null;
    }
  };

  // 自动在组件卸载时清理，防止内存泄漏
  onUnmounted(() => {
    stopMonitoring();
  });

  return {
    currentTime,
    currentDayOfWeek,
    sysStats,
    startMonitoring,
    stopMonitoring
  };
}
