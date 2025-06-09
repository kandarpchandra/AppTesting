// SettingsScreen.tsx
import React from 'react';
import { View, Text, Switch, StyleSheet, Button } from 'react-native';

// Import all styles from AppStyles.ts
import appStyles, { darkStyles } from './AppStyles'; // Renamed default export to appStyles for clarity

// Define a type for the styles object that can be passed
// This ensures type safety for the 'currentStyles' prop
type CurrentAppStyles = typeof appStyles;

interface SettingsScreenProps {
  darkMode: boolean;
  onDarkModeChange: (value: boolean) => void;
  mockMode: boolean;
  onMockModeChange: (value: boolean) => void;
  onClearDevices: () => void;
  onResetApp: () => void;
  // Add a prop to receive the current styles (light or dark)
  currentStyles: CurrentAppStyles;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  darkMode,
  onDarkModeChange,
  mockMode,
  onMockModeChange,
  onClearDevices,
  onResetApp,
  currentStyles, // Destructure the new prop here
}) => {
  return (
    // Use currentStyles for the container
    <View style={currentStyles.container}>
      <View style={localStyles.settingItem}>
        {/* Use currentStyles for text color */}
        <Text style={[localStyles.settingText, currentStyles.text]}>Dark Mode</Text>
        <Switch
          value={darkMode}
          onValueChange={onDarkModeChange}
          // Optionally, customize switch track and thumb color for dark mode
          trackColor={{ false: "#767577", true: "#81b0ff" }} // Example colors
          thumbColor={darkMode ? "#f5dd4b" : "#f4f3f4"}
        />
      </View>
      
      <View style={localStyles.settingItem}>
        <Text style={[localStyles.settingText, currentStyles.text]}>Mock Mode</Text>
        <Switch
          value={mockMode}
          onValueChange={onMockModeChange}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={mockMode ? "#f5dd4b" : "#f4f3f4"}
        />
      </View>
      
      <View style={localStyles.settingItem}>
        <Text style={[localStyles.settingText, currentStyles.text]}>Clear Paired Devices</Text>
        {/* Use currentStyles for button if you have specific button styles for settings,
            otherwise, you can use the generic button styles or keep default if it suits */}
        <Button
          title="Clear"
          onPress={onClearDevices}
          color={currentStyles.button?.backgroundColor || '#007AFF'} // Use button's background color from currentStyles
        />
      </View>
      
      <View style={localStyles.settingItem}>
        <Text style={[localStyles.settingText, currentStyles.text]}>Reset App</Text>
        <Button
          title="Reset"
          onPress={onResetApp}
          color={currentStyles.button?.backgroundColor || '#007AFF'} // Use button's background color from currentStyles
        />
      </View>
    </View>
  );
};

// Keep local styles for specific layout properties that don't change with theme
const localStyles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    // borderBottomColor will be handled by currentStyles.sectionTitle's borderBottomColor
    // or you can add a specific borderBottomColor in darkStyles
    borderBottomWidth: 1,
    borderBottomColor: '#eee', // Default light mode border
  },
  settingText: {
    fontSize: 16,
    // Color will be applied from currentStyles.text or a more specific style
  },
});

export default SettingsScreen;