import { StyleSheet, View } from 'react-native';

export default function Test() {
  return <View style={styles.box} />;
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
});
