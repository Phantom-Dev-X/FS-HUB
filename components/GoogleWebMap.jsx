import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';

const FALLBACK_CENTER = { latitude: 6.6018, longitude: 3.3515 };
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const IS_EXPO_GO = Constants.appOwnership === 'expo';

let MapLibreGL = null;
if (!IS_EXPO_GO && Platform.OS !== 'web') {
  try {
    const module = require('@maplibre/maplibre-react-native');
    MapLibreGL = module.default || module;
    MapLibreGL.setAccessToken?.(null);
  } catch (e) {
    console.log('[FS-HUB MapLibre Load Error]', e.message);
  }
}

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeCoordinate = (coordinate) => {
  if (!coordinate) return null;
  const latitude = toNumber(coordinate.latitude ?? coordinate.lat);
  const longitude = toNumber(coordinate.longitude ?? coordinate.lng ?? coordinate.lon);
  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
};

const normalizeMarkers = (markers = []) => markers
  .map((marker, index) => {
    const coordinate = normalizeCoordinate(marker.coordinate || marker);
    if (!coordinate) return null;
    return {
      id: String(marker.id || index),
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      title: String(marker.title || marker.name || `Marker ${index + 1}`),
      description: String(marker.description || marker.address || ''),
      color: marker.color || '#EF4444',
    };
  })
  .filter(Boolean);

const toMapLibreCoordinate = (coordinate) => [coordinate.longitude, coordinate.latitude];

const readMapPressCoordinate = (event) => {
  const coords = event?.geometry?.coordinates || event?.features?.[0]?.geometry?.coordinates || event?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const longitude = toNumber(coords[0]);
  const latitude = toNumber(coords[1]);
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude, accuracy: null };
};

export default function GoogleWebMap({
  center = FALLBACK_CENTER,
  markers = [],
  height = 220,
  zoom = 14,
  label = 'FS Hub Field Position',
  draggablePicker = false,
  onLocationSelected,
}) {
  const [pickerCoordinate, setPickerCoordinate] = useState(normalizeCoordinate(center) || FALLBACK_CENTER);
  const safeCenter = normalizeCoordinate(center) || FALLBACK_CENTER;
  const safeMarkers = useMemo(() => normalizeMarkers(markers), [markers]);
  const selectedCoordinate = draggablePicker ? pickerCoordinate : safeCenter;

  const handleSelectCoordinate = (coordinate) => {
    if (!coordinate) return;
    setPickerCoordinate(coordinate);
    if (onLocationSelected) onLocationSelected(coordinate);
  };

  if (Platform.OS === 'web' || !MapLibreGL) {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackTitle}>{IS_EXPO_GO ? 'Native MapLibre map needs APK/dev build' : 'Native map unavailable'}</Text>
        <Text style={styles.fallbackText}>
          {IS_EXPO_GO
            ? 'Expo Go cannot load custom native map SDKs. Build/install the APK to test pins and draggable picker.'
            : 'Map module failed to load on this device.'}
        </Text>
        <Text style={styles.fallbackCoords}>Lat {safeCenter.latitude.toFixed(5)} • Lon {safeCenter.longitude.toFixed(5)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { height }]}>
      <MapLibreGL.MapView
        style={styles.map}
        styleURL={MAP_STYLE_URL}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled
        onPress={(event) => {
          if (!draggablePicker) return;
          handleSelectCoordinate(readMapPressCoordinate(event));
        }}
      >
        <MapLibreGL.Camera
          centerCoordinate={toMapLibreCoordinate(selectedCoordinate)}
          zoomLevel={Number(zoom) || 14}
          animationMode="flyTo"
          animationDuration={450}
        />

        {safeMarkers.map(marker => (
          <MapLibreGL.PointAnnotation
            key={marker.id}
            id={marker.id}
            coordinate={[marker.longitude, marker.latitude]}
            title={marker.title}
          >
            <View style={[styles.pin, { backgroundColor: marker.color }]}>
              <View style={styles.pinDot} />
            </View>
            <MapLibreGL.Callout title={marker.description ? `${marker.title}\n${marker.description}` : marker.title} />
          </MapLibreGL.PointAnnotation>
        ))}

        <MapLibreGL.PointAnnotation
          id="fshub-center-pin"
          coordinate={toMapLibreCoordinate(selectedCoordinate)}
          title={label}
          draggable={Boolean(draggablePicker)}
          onDragEnd={(event) => handleSelectCoordinate(readMapPressCoordinate(event))}
        >
          <View style={[styles.pin, { backgroundColor: '#2563EB' }]}>
            <View style={styles.pinDot} />
          </View>
          <MapLibreGL.Callout title={draggablePicker ? 'Drag or tap map to select this location' : label} />
        </MapLibreGL.PointAnnotation>
      </MapLibreGL.MapView>

      {draggablePicker && (
        <View style={styles.helpBox} pointerEvents="none">
          <Text style={styles.helpText}>Tap map or drag blue pin to select exact store location</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EFF6FF',
  },
  map: {
    flex: 1,
  },
  fallback: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  fallbackTitle: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  fallbackText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 16,
  },
  fallbackCoords: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 8,
  },
  pin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  pinDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  helpBox: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  helpText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});
