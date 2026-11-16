'use client';
import { useEffect, useState } from 'react';

/** Only inspect clipboard contents automatically when the browser already grants read access. */
export function useClipboardPaste(enabled: boolean) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!enabled || !navigator.clipboard?.readText) return;
    let active = true;
    const detect = async () => {
      let visible = true;
      try {
        const permission = await navigator.permissions.query({
          name: 'clipboard-read' as PermissionName,
        });
        if (permission.state === 'denied') visible = false;
        else if (permission.state === 'granted')
          visible = Boolean((await navigator.clipboard.readText()).trim());
      } catch {
        // Safari may support a user-initiated paste without exposing clipboard permissions.
      }
      if (active) setAvailable(visible);
    };
    void detect();
    window.addEventListener('focus', detect);
    return () => {
      active = false;
      window.removeEventListener('focus', detect);
    };
  }, [enabled]);
  const paste = async (): Promise<string> => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        setAvailable(false);
        throw new Error('Your clipboard is empty.');
      }
      // Phone share sheets often copy a sentence followed by the link.
      const link = text.match(/https:\/\/[^\s<>"']+/i)?.[0] ?? text;
      return link.slice(0, 2048);
    } catch (error) {
      if (error instanceof Error && error.message === 'Your clipboard is empty.') throw error;
      throw new Error('Clipboard access is unavailable. Paste the link into the field.');
    }
  };
  return { available: enabled && available, paste };
}
