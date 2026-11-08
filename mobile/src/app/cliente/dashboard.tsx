import { View, Text, StyleSheet } from 'react-native';
export default function ClienteDashboard() {
  return (
    <View style={styles.center}>
        <Text style={styles.text}>
            Painel do Cliente </Text></View>
  );
}
const styles = StyleSheet.create({ center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, text: { fontSize: 20, fontWeight: 'bold' } });