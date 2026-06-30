'use client'

import { useEffect, useRef } from 'react'
import { logAnalyticsEvent } from '@/lib/actions'

export default function AnalyticsTracker() {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    
    // Solo logear si estamos en el cliente y no se ha logeado en esta carga de componente
    const trackPageview = async () => {
      tracked.current = true;
      
      // Simple logeo de sesión
      const sessionId = localStorage.getItem('session_id') || Math.random().toString(36).substring(2, 15);
      if (!localStorage.getItem('session_id')) {
        localStorage.setItem('session_id', sessionId);
      }

      await logAnalyticsEvent('pageview', {
        path: window.location.pathname,
        sessionId,
        userAgent: navigator.userAgent
      });
    };

    // Darle un pequeño delay para que no bloquee render
    setTimeout(trackPageview, 1000);
    
  }, []);

  return null; // Componente invisible
}
