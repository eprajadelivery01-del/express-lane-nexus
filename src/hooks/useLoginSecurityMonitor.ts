import { useRef, useCallback } from "react";

interface IpApiResponse {
  status: string;
  country: string;
  countryCode: string;
  proxy: boolean;
  hosting: boolean;
  query: string;
}

interface LoginSecurityMonitorOptions {
  appName?: string;
  maxFailedAttemptsBeforeAlert?: number;
  failedAttemptsWindowMs?: number;
}

/**
 * Hook de monitoramento de segurança no login.
 * Detecta:
 * - VPN / Proxy
 * - Acesso de fora do Brasil
 * - Brute Force (múltiplas tentativas de login com falha)
 */
export function useLoginSecurityMonitor(options: LoginSecurityMonitorOptions = {}) {
  const {
    appName = "Sistema",
    maxFailedAttemptsBeforeAlert = 3,
    failedAttemptsWindowMs = 120_000,
  } = options;

  const failedAttemptsRef = useRef<number[]>([]);
  const isReportingRef = useRef(false);
  const lastIpDataRef = useRef<IpApiResponse | null>(null);

  const sendSecurityAlert = useCallback(async (
    alertType: string,
    emailAttempted: string,
    ipData: IpApiResponse | null,
    extraDetails: Record<string, unknown> = {}
  ) => {
    if (isReportingRef.current) return;
    isReportingRef.current = true;

    try {
      const { supabase } = await import("@/integrations/supabase/client");

      const requestBody = {
        app_name: appName,
        error_message: `[ALERTA DE SEGURANÇA] ${alertType}`,
        stack_trace: "",
        user_id: "pre-autenticação",
        user_email: emailAttempted || "desconhecido",
        url: window.location.href,
        is_attack: true,
        additional_info: {
          alertType,
          emailAttempted,
          ip: ipData?.query || "Desconhecido",
          country: ipData?.country || "Desconhecido",
          countryCode: ipData?.countryCode || "??",
          proxy: ipData?.proxy ?? false,
          hosting: ipData?.hosting ?? false,
          userAgent: navigator.userAgent,
          screenResolution: `${window.innerWidth}x${window.innerHeight}`,
          time: new Date().toISOString(),
          ...extraDetails,
        },
      };

      await supabase.functions.invoke("telegram-logger", { body: requestBody });
    } catch (err) {
      console.error("[SecurityMonitor] Falha ao enviar alerta:", err);
    } finally {
      setTimeout(() => {
        isReportingRef.current = false;
      }, 30_000);
    }
  }, [appName]);

  const fetchIpData = useCallback(async (): Promise<IpApiResponse | null> => {
    if (lastIpDataRef.current) return lastIpDataRef.current;
    try {
      const res = await fetch(
        "https://ip-api.com/json/?fields=status,country,countryCode,proxy,hosting,query",
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) return null;
      const data: IpApiResponse = await res.json();
      if (data.status !== "success") return null;
      lastIpDataRef.current = data;
      return data;
    } catch {
      return null;
    }
  }, []);

  const checkIpBeforeLogin = useCallback(async (email: string) => {
    const ipData = await fetchIpData();
    if (!ipData) return;

    if (ipData.proxy || ipData.hosting) {
      await sendSecurityAlert(
        `VPN / PROXY DETECTADO — Login tentado via IP mascarado`,
        email,
        ipData,
        { proxyDetected: ipData.proxy, hostingDetected: ipData.hosting }
      );
    }

    if (ipData.countryCode && ipData.countryCode !== "BR") {
      await sendSecurityAlert(
        `LOGIN FORA DO BRASIL — Tentativa de acesso de ${ipData.country} (${ipData.countryCode})`,
        email,
        ipData,
        { expectedCountry: "BR", detectedCountry: ipData.countryCode }
      );
    }
  }, [fetchIpData, sendSecurityAlert]);

  const recordLoginFailure = useCallback(async (email: string, errorMessage: string) => {
    const now = Date.now();
    failedAttemptsRef.current = failedAttemptsRef.current.filter(
      (t) => now - t < failedAttemptsWindowMs
    );
    failedAttemptsRef.current.push(now);

    if (failedAttemptsRef.current.length >= maxFailedAttemptsBeforeAlert) {
      const ipData = await fetchIpData();
      await sendSecurityAlert(
        `BRUTE FORCE DETECTADO — ${failedAttemptsRef.current.length} tentativas de login com falha em ${Math.round(failedAttemptsWindowMs / 60000)} minutos`,
        email,
        ipData,
        {
          failedAttempts: failedAttemptsRef.current.length,
          windowMinutes: failedAttemptsWindowMs / 60000,
          lastError: errorMessage,
        }
      );
      failedAttemptsRef.current = [];
    }
  }, [fetchIpData, sendSecurityAlert, maxFailedAttemptsBeforeAlert, failedAttemptsWindowMs]);

  const resetFailedAttempts = useCallback(() => {
    failedAttemptsRef.current = [];
    lastIpDataRef.current = null;
  }, []);

  return {
    checkIpBeforeLogin,
    recordLoginFailure,
    resetFailedAttempts,
  };
}
