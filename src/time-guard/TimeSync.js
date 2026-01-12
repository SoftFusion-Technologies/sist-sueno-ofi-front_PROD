// Base URL del backend (ej: https://api.rioromano.com.ar)
const API_BASE =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.VITE_API_BASE
    ? import.meta.env.VITE_API_BASE.replace(/\/+$/, '')
    : '';

// Reloj virtual + sync con /time + detección de skew/offline + soporte multi-pestaña
const HEARTBEAT_MS = 5 * 60 * 1000; // re-sync cada 5 min
const SKEW_CHECK_MS = 1000; // revisar skew cada 1s
const CHANNEL_NAME = 'time-guard';

const OPEN_HYST_MS = 1200; // tiempo consecutivo fuera de tolerancia para BLOQUEAR
const CLOSE_HYST_MS = 1500; // tiempo consecutivo dentro de tolerancia para DESBLOQUEAR (solo auto)
class TimeSync {
  constructor() {
    this.serverTimeAtSync = null; // ms (UTC) desde /time
    this.clientPerfAtSync = null; // ms relativos (performance.now)
    this.lastSyncVirtualMs = null; // virtualNow() del último sync
    this.toleranceMs = 60000; // se obtiene de /time
    this.maxOfflineMs = 1800000; // se obtiene de /time
    this.status = 'syncing'; // 'syncing' | 'ok' | 'invalid-clock'
    this.reason = null; // 'SKEW_EXCEEDED' | 'MAX_OFFLINE' | 'BACKEND_428' | 'NETWORK' | null
    this.skewMs = 0;

    this.initialized = false; // 👈 NUEVO: ya se llamó init()
    this.hooksInstalled = false; // 👈 NUEVO: ya se instalaron timers/listeners

    // this.locked = false; // 🔒 “candado”: bloquea hasta retrySync exitoso
    this.locked = true; // 🔒 arrancamos bloqueados hasta primera sync exitosa

    this.listeners = new Set();
    this.heartbeatId = null;
    this.skewTimerId = null;
    this.channel = this.createChannel();
    this.badAccumMs = 0; // ms de skew fuera de tolerancia acumulados
    this.goodAccumMs = 0; // ms de skew dentro de tolerancia acumulados
  }
  checkSkew() {
    const nowVirtual = this.virtualNow();
    const nowDevice = Date.now();
    this.skewMs = nowDevice - nowVirtual;

    const isBad = Math.abs(this.skewMs) > this.toleranceMs;
    if (isBad) {
      this.badAccumMs += SKEW_CHECK_MS;
      this.goodAccumMs = 0;
    } else {
      this.goodAccumMs += SKEW_CHECK_MS;
      this.badAccumMs = 0;
    }

    // Reglas de estado
    if (
      this.lastSyncVirtualMs &&
      nowVirtual - this.lastSyncVirtualMs > this.maxOfflineMs
    ) {
      this.status = 'invalid-clock';
      this.reason = 'MAX_OFFLINE';
      this.locked = true;
      return;
    }

    if (this.locked) {
      // Si ya está bloqueado, solo retrySync() exitoso lo libera (candado)
      this.status = isBad ? 'invalid-clock' : this.status;
      if (isBad) this.reason = 'SKEW_EXCEEDED';
      return;
    }

    // Si no está bloqueado aún, aplicamos histeresis de apertura
    if (isBad && this.badAccumMs >= OPEN_HYST_MS) {
      this.status = 'invalid-clock';
      this.reason = 'SKEW_EXCEEDED';
      this.locked = true; // 🔒 entra en bloqueo firme
      return;
    }

    // Si está bien, mantenemos ok; (no desbloqueamos aquí el candado)
    this.status = 'ok';
    this.reason = null;
  }

  createChannel() {
    if ('BroadcastChannel' in window) {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.onmessage = (ev) => {
        if (ev?.data?.type === 'TIME_GUARD_STATE') {
          this.applyStateFromChannel(ev.data.payload);
        }
      };
      return ch;
    }
    // fallback a localStorage events
    window.addEventListener('storage', (e) => {
      if (e.key === 'TIME_GUARD_STATE' && e.newValue) {
        try {
          this.applyStateFromChannel(JSON.parse(e.newValue));
        } catch {}
      }
    });
    return null;
  }

  broadcast() {
    const state = this.getState();
    if (this.channel) {
      this.channel.postMessage({ type: 'TIME_GUARD_STATE', payload: state });
    } else {
      try {
        localStorage.setItem('TIME_GUARD_STATE', JSON.stringify(state));
      } catch {}
    }
  }

  applyStateFromChannel(s) {
    // Si otra pestaña tiene un estado más fresco, adoptarlo
    if (
      s?.lastSyncVirtualMs &&
      (!this.lastSyncVirtualMs || s.lastSyncVirtualMs > this.lastSyncVirtualMs)
    ) {
      this.serverTimeAtSync = s.serverTimeAtSync;
      this.clientPerfAtSync =
        performance.now() - (s.virtualNow - s.serverTimeAtSync);
      this.lastSyncVirtualMs = s.lastSyncVirtualMs;
      this.toleranceMs = s.toleranceMs ?? this.toleranceMs;
      this.maxOfflineMs = s.maxOfflineMs ?? this.maxOfflineMs;
      this.status = s.status;
      this.reason = s.reason;
      this.skewMs = s.skewMs ?? 0;
      this.locked = this.locked || !!s.locked;
      this.emit();
    }
  }

  subscribe(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  emit() {
    const snapshot = this.getState();
    this.listeners.forEach((cb) => cb(snapshot));
    this.broadcast();
  }

  getState() {
    return {
      status: this.status,
      reason: this.reason,
      skewMs: this.skewMs,
      toleranceMs: this.toleranceMs,
      maxOfflineMs: this.maxOfflineMs,
      lastSyncVirtualMs: this.lastSyncVirtualMs,
      serverTimeAtSync: this.serverTimeAtSync,
      virtualNow: this.virtualNow(),
      locked: this.locked
    };
  }

  virtualNow() {
    if (this.serverTimeAtSync == null || this.clientPerfAtSync == null)
      return Date.now();
    return this.serverTimeAtSync + (performance.now() - this.clientPerfAtSync);
  }

  async init() {
    if (this.initialized) return; // 👈 evita doble init en StrictMode/HMR
    this.initialized = true;
    try {
      await this.syncWithServer();
      this.installLifecycleHooks();
      this.checkSkew();
      if (this.status === 'ok') {
        this.reason = null;
        this.locked = false; // 🔓 solo si está OK
      } else {
        this.locked = true; // 🔒 si está mal, mantener bloqueo
      }
      this.emit();
    } catch {
      // Si /time falla (proxy/CORS/baseURL), queda bloqueado por red
      this.status = 'invalid-clock';
      this.reason = 'NETWORK';
      this.locked = true; // 🔒
      this.emit();
    }
  }

  installLifecycleHooks() {
    // Evita instalar dos veces (StrictMode/HMR)
    if (this.hooksInstalled) return;
    this.hooksInstalled = true;

    // ⏳ Heartbeat: re-sync con /time cada X min (no desbloquea por sí solo)
    this.heartbeatId = setInterval(() => this.safeResync(), HEARTBEAT_MS);

    // 🩺 Chequeo de skew cada 1s con histeresis (abre/cierra sin “parpadeo”)
    this.skewTimerId = setInterval(() => {
      const prevStatus = this.status;
      const prevSkew = this.skewMs;

      this.checkSkew();

      // // Log de depuración en dev
      // if (process.env.NODE_ENV !== 'production') {
      //   console.debug('[TimeGuard] tick', {
      //     deviceNow: Date.now(),
      //     virtualNow: this.virtualNow(),
      //     skewMs: this.skewMs,
      //     status: this.status,
      //     reason: this.reason,
      //     locked: this.locked
      //   });
      // }

      // Notificar cambios reales
      if (this.status !== prevStatus || Math.abs(this.skewMs - prevSkew) > 1) {
        this.emit();
      }
    }, SKEW_CHECK_MS);

    // 🎯 Handlers persistentes para no duplicar listeners
    this.onVisibility = () => {
      if (document.visibilityState === 'visible') this.safeResync();
    };
    this.onFocus = () => this.safeResync();
    this.onOnline = () => this.safeResync();

    // 🔗 Listeners (solo una vez)
    window.addEventListener('visibilitychange', this.onVisibility, {
      passive: true
    });
    window.addEventListener('focus', this.onFocus, { passive: true });
    window.addEventListener('online', this.onOnline, { passive: true });
  }

  async safeResync() {
    try {
      const needsForce = this.status === 'invalid-clock' || this.locked;
      const url = `${API_BASE}/time${needsForce ? '?refresh=1' : ''}`;
      const res = await fetch(url, {
        cache: 'no-store',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('No se pudo sincronizar hora');
      const data = await res.json();

      const serverUnixMs = Number(data.serverUnixMs);
      this.serverTimeAtSync = serverUnixMs;
      this.clientPerfAtSync = performance.now();
      this.toleranceMs = Number(data.toleranceMs ?? this.toleranceMs);
      this.maxOfflineMs = Number(data.maxOfflineMs ?? this.maxOfflineMs);
      this.lastSyncVirtualMs = this.virtualNow();

      this.checkSkew();
      if (this.status === 'ok') this.reason = null;
      // ❗ no desbloquea: solo retrySync() lo hace
      this.emit();
    } catch {
      this.checkSkew();
      this.emit();
    }
  }

  async syncWithServer() {
    const url = `${API_BASE}/time`;
    const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
    if (!res.ok) throw new Error('No se pudo sincronizar hora');
    const data = await res.json();
    const serverUnixMs = Number(data.serverUnixMs);
    if (Number.isNaN(serverUnixMs)) throw new Error('Respuesta /time inválida');

    this.serverTimeAtSync = serverUnixMs;
    this.clientPerfAtSync = performance.now();
    this.toleranceMs = Number(data.toleranceMs ?? this.toleranceMs);
    this.maxOfflineMs = Number(data.maxOfflineMs ?? this.maxOfflineMs);
    this.lastSyncVirtualMs = this.virtualNow();
  }

  checkSkew() {
    const nowVirtual = this.virtualNow();
    const nowDevice = Date.now();
    this.skewMs = nowDevice - nowVirtual;

    if (
      this.lastSyncVirtualMs &&
      nowVirtual - this.lastSyncVirtualMs > this.maxOfflineMs
    ) {
      this.status = 'invalid-clock';
      this.reason = 'MAX_OFFLINE';
      this.locked = true; // 🔒
      return;
    }
    if (Math.abs(this.skewMs) > this.toleranceMs) {
      this.status = 'invalid-clock';
      this.reason = 'SKEW_EXCEEDED';
      this.locked = true; // 🔒
      return;
    }
    this.status = 'ok';
    // Importante: NO tocar this.locked acá; se destraba solo en retrySync()
  }

  async retrySync() {
    try {
      const url = `${API_BASE}/time?refresh=1`; // 👈 solo query param, SIN headers custom
      const res = await fetch(url, {
        cache: 'no-store',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('No se pudo sincronizar hora');
      const data = await res.json();

      const serverUnixMs = Number(data.serverUnixMs);
      if (Number.isNaN(serverUnixMs))
        throw new Error('Respuesta /time inválida');

      this.serverTimeAtSync = serverUnixMs;
      this.clientPerfAtSync = performance.now();
      this.toleranceMs = Number(data.toleranceMs ?? this.toleranceMs);
      this.maxOfflineMs = Number(data.maxOfflineMs ?? this.maxOfflineMs);
      this.lastSyncVirtualMs = this.virtualNow();

      this.checkSkew();
      if (this.status === 'ok') {
        this.reason = null;
        this.locked = false; // 🔓 único lugar de desbloqueo
      } else {
        this.locked = true;
      }
      this.emit();
      return this.status === 'ok';
    } catch {
      this.reason = 'NETWORK';
      this.status = 'invalid-clock';
      this.locked = true;
      this.emit();
      return false;
    }
  }

  // Para cuando el backend devuelve 428 (middleware time-guard)
  flagBackend428() {
    this.status = 'invalid-clock';
    this.reason = 'BACKEND_428';
    this.locked = true; // 🔒
    this.emit();
  }

  // Interceptores de instancia de axios (envía x-client-reported-time)
  installAxios(axiosInstance) {
    axiosInstance.interceptors.request.use((config) => {
      // Bloqueo duro de requests mientras esté bloqueado
      if (this.locked) {
        const err = new Error('time-guard-locked');
        err.isTimeGuardLocked = true;
        return Promise.reject(err);
      }
      config.headers = config.headers || {};
      config.headers['x-client-reported-time'] = String(Date.now());
      return config;
    });

    axiosInstance.interceptors.response.use(
      (r) => r,
      (error) => {
        if (error?.response?.status === 428) this.flagBackend428();
        return Promise.reject(error);
      }
    );
  }
}

let instance;
if (typeof window !== 'undefined') {
  instance = window.__timeSyncSingleton || new TimeSync();
  window.__timeSyncSingleton = instance;
} else {
  globalThis.__timeSyncSingleton =
    globalThis.__timeSyncSingleton || new TimeSync();
  instance = globalThis.__timeSyncSingleton;
}
export const timeSync = instance;
