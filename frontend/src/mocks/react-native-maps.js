import React from 'react';
import { View, Text } from 'react-native';

const MapView = ({ children, style }) => (
  <View style={[{ backgroundColor: '#e0e0e0', alignItems: 'center', justifyContent: 'center' }, style]}>
    <Text style={{ color: '#666' }}>Carte non disponible sur web</Text>
    {children}
  </View>
);

const Marker = () => null;
const Polyline = () => null;
const Circle = () => null;
const Polygon = () => null;
const Callout = () => null;

export default MapView;
export { Marker, Polyline, Circle, Polygon, Callout };
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;