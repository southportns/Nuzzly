import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

/* -- Pomi Model Image View -- */
function QiuqiuImageView() {
  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      <View style={styles.imageView}>
        <Image
          source={require('../../assets/images/pomi.png')}
          style={styles.fallbackImg}
          resizeMode="contain"
        />
      </View>
      <View style={styles.shadow} />
    </View>
  );
}

export default function QiuqiuModel() {
  // Neither web nor native supports full 3D rendering
  // Web lacks expo-gl, native lacks Image/Worker API
  // Using image as fallback
  return <QiuqiuImageView />;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    width: 100,
    height: 100,
    marginLeft: -50,
    marginTop: -50,
    borderRadius: 50,
    backgroundColor: 'rgba(255,184,154,0.28)',
    transform: [{ scale: 1.2 }],
  },
  shadow: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    width: 60,
    height: 6,
    marginLeft: -30,
    borderRadius: 3,
    backgroundColor: 'rgba(139,94,70,0.12)',
  },
  imageView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackImg: {
    width: 120,
    height: 120,
  },
});
