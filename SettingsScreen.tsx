// SettingsScreen.tsx
import React from 'react';
import { View, Text, Switch, StyleSheet, Button } from 'react-native';

interface SettingsScreenProps {
  darkMode: boolean;
  onDarkModeChange: (value: boolean) => void;
  mockMode: boolean;
  onMockModeChange: (value: boolean) => void;
  onClearDevices: () => void;
  onResetApp: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  darkMode,
  onDarkModeChange,
  mockMode,
  onMockModeChange,
  onClearDevices,
  onResetApp,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.settingItem}>
        <Text style={styles.settingText}>Dark Mode</Text>
        <Switch
          value={darkMode}
          onValueChange={onDarkModeChange}
        />
      </View>
      
      <View style={styles.settingItem}>
        <Text style={styles.settingText}>Mock Mode</Text>
        <Switch
          value={mockMode}
          onValueChange={onMockModeChange}
        />
      </View>
      
      <View style={styles.settingItem}>
        <Text style={styles.settingText}>Clear Paired Devices</Text>
        <Button title="Clear" onPress={onClearDevices} />
      </View>
      
      <View style={styles.settingItem}>
        <Text style={styles.settingText}>Reset App</Text>
        <Button title="Reset" onPress={onResetApp} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingText: {
    fontSize: 16,
  },
});

export default SettingsScreen;