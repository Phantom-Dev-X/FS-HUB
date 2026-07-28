import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatabaseEngine } from '../app/_DatabaseEngine';

const CACHE_PREFIX = '@fshub_signed_image:';

const isDirectUri = (value) => typeof value === 'string' && (
  value.startsWith('http://') ||
  value.startsWith('https://') ||
  value.startsWith('file://') ||
  value.startsWith('content://') ||
  value.startsWith('data:')
);

export default function RemoteImage({ path, style, resizeMode = 'cover', children }) {
  const [uri, setUri] = useState(isDirectUri(path) ? path : null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!path) { if (active) setUri(null); return; }
      if (isDirectUri(path)) { if (active) setUri(path); return; }

      const cacheKey = `${CACHE_PREFIX}${path}`;
      try {
        const cachedRaw = await AsyncStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached?.url && cached?.expiresAt && Date.now() < cached.expiresAt) {
            if (active) setUri(cached.url);
            return;
          }
        }
      } catch {}

      const signed = await DatabaseEngine.getSignedImageUrl(path, 60 * 60 * 24 * 6);
      if (signed.success && signed.url) {
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify({
            url: signed.url,
            expiresAt: Date.now() + (60 * 60 * 24 * 5 * 1000)
          }));
        } catch {}
        if (active) setUri(signed.url);
      } else if (active) {
        setUri(null);
      }
    };
    load();
    return () => { active = false; };
  }, [path]);

  if (!uri) {
    return <View style={[styles.placeholder, style]}>{children}</View>;
  }

  return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
});
