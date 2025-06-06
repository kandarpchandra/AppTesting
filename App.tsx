import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  ListRenderItem,
  ScrollView,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Modal,
  Pressable,
} from 'react-native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import SettingsScreen from './SettingsScreen';

import BluetoothSerial from 'react-native-bluetooth-serial-next'; // Real Bluetooth module

import styles, { modalStyles, darkStyles } from './AppStyles'; // Adjusted path for AppStyles

// Type definitions
interface BluetoothDevice {
  id: string;
  name: string | null;
  address?: string;
}

interface AppState {
  darkMode: boolean;
  mockMode: boolean;
}

interface SensorData {
  T_Inside?: any;
  H_Inside?: any;
  T_Middle?: any;
  H_Middle?: any;
  T_Outside?: any;
  H_Outside?: any;
  W?: string;
  FAN?: string;
  POWER?: string;
}

interface BluetoothEventData {
  data: string;
}

// Props interface for CustomAlertDialog
interface AlertDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

// Props interface for HomeScreen
type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const Stack = createStackNavigator();

const App: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [dataReceived, setDataReceived] = useState<string>(''); // Not strictly used for display, but kept for state
  const [sensorData, setSensorData] = useState<SensorData>({});

  const [alertDialogVisible, setAlertDialogVisible] = useState(false);
  const [alertDialogTitle, setAlertDialogTitle] = useState('');
  const [alertDialogMessage, setAlertDialogMessage] = useState('');

  const [bluetoothReady, setBluetoothReady] = useState(false);

  const [appState, setAppState] = useState<AppState>({
    darkMode: false,
    mockMode: false,
  });

  // Custom Alert Dialog Component
  const CustomAlertDialog: React.FC<AlertDialogProps> = ({ visible, title, message, onClose }) => {
    return (
      <Modal
        transparent={true}
        animationType="fade"
        visible={visible}
        onRequestClose={onClose}
      >
        <Pressable style={modalStyles.overlay} onPress={onClose}>
          <Pressable style={modalStyles.alertContainer} onPress={(e) => e.stopPropagation()}>
            <Text style={modalStyles.alertTitle}>{title}</Text>
            <Text style={modalStyles.alertMessage}>{message}</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.alertButton}>
              <Text style={modalStyles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const showAlertDialog = (title: string, message: string) => {
    setAlertDialogTitle(title);
    setAlertDialogMessage(message);
    setAlertDialogVisible(true);
  };

  const closeAlertDialog = () => {
    setAlertDialogVisible(false);
  };

  // Request Bluetooth and Location Permissions (Android specific)
  const requestBluetoothPermissions = async (): Promise<void> => {
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version;

      if (apiLevel >= 31) {
        const bluetoothScanGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          {
            title: 'Bluetooth Scan Permission',
            message: 'This app needs Bluetooth Scan permission to find devices.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        const bluetoothConnectGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          {
            title: 'Bluetooth Connect Permission',
            message: 'This app needs Bluetooth Connect permission to connect to devices.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        if (bluetoothScanGranted !== PermissionsAndroid.RESULTS.GRANTED ||
          bluetoothConnectGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          showAlertDialog('Permission Denied', 'Bluetooth permissions are required to use this app.');
          return;
        }
      }

      const grantedLocation = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs Location permission to discover Bluetooth devices.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );

      if (grantedLocation !== PermissionsAndroid.RESULTS.GRANTED) {
        showAlertDialog('Permission Denied', 'Location permission is required for Bluetooth discovery.');
      }
    }
  };

  // Effect hook to manage Bluetooth state and listeners
  useEffect(() => {

    const initBluetooth = async () => {
      try {
        if (!BluetoothSerial) {
          showAlertDialog('Error', 'Bluetooth module not available');
          return;
        }

        const enabled = await BluetoothSerial.isEnabled();
        setIsEnabled(enabled);
        setBluetoothReady(true);

        // Rest of your existing initialization code...
        requestBluetoothPermissions();

        const onDataReceived = (data: BluetoothEventData) => {
          console.log('Received data:', data.data);
          parseAndDisplayData(data.data);
        };

        // Check initial Bluetooth status
        // Add null check for BluetoothSerial
        BluetoothSerial && BluetoothSerial.isEnabled().then((enabled: boolean) => {
          setIsEnabled(enabled);
        });

        const onDisconnect = () => {
          console.log('Device disconnected');
          setConnectedDevice(null);
          showAlertDialog('Disconnected', 'Bluetooth device disconnected.');
        };

        // Attach listeners with null check for BluetoothSerial
        BluetoothSerial && BluetoothSerial.on('read', onDataReceived);
        BluetoothSerial && BluetoothSerial.on('disconnect', onDisconnect);

        // Cleanup function for listeners and disconnection on component unmount
        return () => {
          // Remove listeners with null check for BluetoothSerial
          BluetoothSerial && BluetoothSerial.removeListener('read', onDataReceived);
          BluetoothSerial && BluetoothSerial.removeListener('disconnect', onDisconnect);
          if (connectedDevice) {
            // Disconnect with null check for BluetoothSerial
            BluetoothSerial && BluetoothSerial.disconnect();
          }
        }
      } catch (error) {
        console.error('Bluetooth init error:', error);
      }
    };

    initBluetooth();
  }, []);

  // Parses incoming sensor data string and updates state
  const parseAndDisplayData = (dataString: string): void => {
    if (!dataString || typeof dataString !== 'string') {
      console.warn('Invalid data string received:', dataString);
      return;
    }

    const lines = dataString.split('\n');
    const dataLine = lines.find(line => line.includes('T_Inside:'));

    if (!dataLine) {
      console.warn('No data line found in packet:', dataString);
      return;
    }

    const parsedData: SensorData = {};
    const parts = dataLine.split(',');

    parts.forEach(part => {
      const [key, value] = part.split(':');
      if (key && value) {
        parsedData[key.trim() as keyof SensorData] = value.trim();
      }
    });

    setSensorData(parsedData);
  };

  // Bluetooth control functions
  const enableBluetooth = async (): Promise<void> => {
    // Add null check for BluetoothSerial
    if (!BluetoothSerial) {
      showAlertDialog('Error', 'Bluetooth module not available. Please restart the app.');
      return;
    }
    try {
      await BluetoothSerial.enable();
      setIsEnabled(true);
      console.log('Bluetooth enabled');
    } catch (error) {
      console.error('Failed to enable Bluetooth:', error);
      showAlertDialog(
        'Error',
        'Failed to enable Bluetooth. Please enable it manually from settings.',
      );
    }
  };

  const disableBluetooth = async (): Promise<void> => {
    // Add null check for BluetoothSerial
    if (!BluetoothSerial) {
      showAlertDialog('Error', 'Bluetooth module not available. Please restart the app.');
      return;
    }
    try {
      await BluetoothSerial.disable();
      setIsEnabled(false);
      setDevices([]);
      setConnectedDevice(null);
      console.log('Bluetooth disabled');
    } catch (error) {
      console.error('Failed to disable Bluetooth:', error);
      showAlertDialog('Error', 'Failed to disable Bluetooth.');
    }
  };

  const discoverDevices = async (): Promise<void> => {
    // Add null check for BluetoothSerial
    if (!BluetoothSerial) {
      showAlertDialog('Error', 'Bluetooth module not available. Please restart the app.');
      return;
    }
    try {
      const unpaired =
        (await BluetoothSerial.listUnpaired()) as BluetoothDevice[];
      const paired = (await BluetoothSerial.list()) as BluetoothDevice[];
      setDevices([...paired, ...unpaired]);
      showAlertDialog('Discovery Complete', `Found ${paired.length + unpaired.length} devices.`);
    } catch (error) {
      console.error('Failed to discover devices:', error);
      showAlertDialog(
        'Error',
        'Failed to discover devices. Check permissions and Bluetooth status.',
      );
    }
  };

  const connectToDevice = async (device: BluetoothDevice): Promise<void> => {
    // Add null check for BluetoothSerial
    if (!BluetoothSerial) {
      showAlertDialog('Error', 'Bluetooth module not available. Please restart the app.');
      return;
    }
    try {
      await BluetoothSerial.connect(device.id);
      setConnectedDevice(device);
      showAlertDialog('Connected', `Connected to ${device.name || device.id}`);
    } catch (error) {
      console.error('Failed to connect:', error);
      showAlertDialog('Error', `Failed to connect to ${device.name || device.id}.`);
    }
  };

  const disconnectDevice = async (): Promise<void> => {
    // Add null check for BluetoothSerial
    if (!BluetoothSerial) {
      showAlertDialog('Error', 'Bluetooth module not available. Please restart the app.');
      return;
    }
    try {
      await BluetoothSerial.disconnect();
      setConnectedDevice(null);
      showAlertDialog('Disconnected', 'Disconnected from device.');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      showAlertDialog('Error', 'Failed to disconnect from device.');
    }
  };

  const sendCommand = async (command: string): Promise<void> => {
    // Add null check for BluetoothSerial
    if (!BluetoothSerial) {
      showAlertDialog('Error', 'Bluetooth module not available. Please restart the app.');
      return;
    }
    if (!connectedDevice) {
      showAlertDialog('Not Connected', 'Please connect to a device first.');
      return;
    }

    try {
      await BluetoothSerial.write(command);
      console.log('Command sent:', command);
      showAlertDialog('Command Sent', `Sent: ${command}`);
    } catch (error) {
      console.error('Failed to send command:', error);
      showAlertDialog('Error', 'Failed to send command.');
    }
  };

  // Add these functions for settings
  const toggleDarkMode = (value: boolean) => {
    setAppState(prev => ({ ...prev, darkMode: value }));
  };

  const toggleMockMode = (value: boolean) => {
    setAppState(prev => ({ ...prev, mockMode: value }));
  };

  const clearDevices = () => {
    setDevices([]);
    showAlertDialog('Success', 'Device list cleared');
  };

  const resetApp = () => {
    setDevices([]);
    setConnectedDevice(null);
    setIsEnabled(false);
    setSensorData({});
    showAlertDialog('App Reset', 'App has been reset to initial state');
  };

  // Renders each device item in the FlatList
  const renderDeviceItem: ListRenderItem<BluetoothDevice> = ({ item }) => (
    <TouchableOpacity
      onPress={() => connectToDevice(item)}
      style={styles.deviceItemButton}
    >
      <Text style={styles.deviceItemButtonText}>{`${item.name || item.id} - ${item.address || item.id}`}</Text>
    </TouchableOpacity>
  );

  // Home Screen Component
  const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    useEffect(() => {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={{ marginRight: 15 }}
          >
            <Text style={{ fontSize: 16, color: '#007AFF' }}>Settings</Text>
          </TouchableOpacity>
        ),
        headerTitleStyle: styles.headerTitle,
      });
    }, [navigation]);

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <View>
          <Text style={styles.sectionTitle}>
            Bluetooth Status: {isEnabled ? 'Enabled' : 'Disabled'}
          </Text>
          <TouchableOpacity
            onPress={enableBluetooth}
            disabled={isEnabled}
            style={[styles.button, isEnabled && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>Enable Bluetooth</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={disableBluetooth}
            disabled={!isEnabled}
            style={[styles.button, !isEnabled && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>Disable Bluetooth</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={discoverDevices}
            disabled={!isEnabled}
            style={[styles.button, !isEnabled && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>Discover Devices</Text>
          </TouchableOpacity>

          {connectedDevice ? (
            <View>
              <Text style={styles.connectedText}>
                Connected to: {connectedDevice.name || connectedDevice.id}
              </Text>

              <TouchableOpacity
                onPress={disconnectDevice}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Disconnect</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Sensor Data:</Text>
              <View style={styles.table}>
                <View style={styles.tableRow}>
                  <Text style={styles.tableHeader}>Sensor</Text>
                  <Text style={styles.tableHeader}>Temp (°C)</Text>
                  <Text style={styles.tableHeader}>Humidity (%)</Text>
                </View>
                {['Inside', 'Middle', 'Outside'].map(loc => {
                  let displayLoc = loc;
                  if (loc === 'Inside') {
                    displayLoc = 'Lower Tray';
                  } else if (loc === 'Middle') {
                    displayLoc = 'Upper Tray';
                  }
                  return (
                    <View style={styles.tableRow} key={loc}>
                      <Text style={styles.tableCell}>{String(displayLoc)}</Text>
                      <Text style={styles.tableCell}>
                        {String((sensorData as any)?.[`T_${loc}`] ?? 'N/A')}
                      </Text>
                      <Text style={styles.tableCell}>
                        {String((sensorData as any)?.[`H_${loc}`] ?? 'N/A')}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.weightBox}>
                <Text style={styles.weightText}>
                  {`Weight: ${String(sensorData['W'] ?? 'N/A')}g`}
                </Text>
              </View>
              <View
                style={[
                  styles.powerBox,
                  sensorData['POWER'] === 'SOLAR'
                    ? styles.solarPower
                    : styles.acPower,
                ]}>
                <Text style={styles.powerBoxText}>
                  {`Power: ${String(sensorData['POWER'] ?? 'N/A')}`}
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Controls:</Text>
              <Button title="Tare Scale (T)" onPress={() => sendCommand('t')} />
            </View>
          ) : (
            <View>
              <Text style={styles.sectionTitle}>Available Devices:</Text>
              <FlatList
                data={devices}
                renderItem={renderDeviceItem}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View>
                    <Text>
                      No devices found. Ensure Bluetooth is on and device is discoverable.
                    </Text>
                  </View>
                }
              />
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'RSK Solar Dehydrator' }}
        />
        <Stack.Screen name="Settings">
          {(props) => (
            <SettingsScreen
              {...props}
              darkMode={appState.darkMode}
              onDarkModeChange={toggleDarkMode}
              mockMode={appState.mockMode}
              onMockModeChange={toggleMockMode}
              onClearDevices={clearDevices}
              onResetApp={resetApp}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
      <CustomAlertDialog
        visible={alertDialogVisible}
        title={alertDialogTitle}
        message={alertDialogMessage}
        onClose={closeAlertDialog}
      />
    </NavigationContainer>
  );
};

export default App;
// --- START: Stylesheet in src/styles/AppStyles.ts (content to be moved) ---
// You will move this entire block to src/styles/AppStyles.ts
// and update the import path at the top of this file.

/*
// Stylesheet for the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff' // Lighter, modern background color
  },
  button: {
    backgroundColor: '#007AFF', // A nice blue for active buttons
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginVertical: 8,
    alignItems: 'center', // Center text horizontally
    justifyContent: 'center', // Center text vertically
    shadowColor: '#000', // Subtle shadow for depth
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4, // Android shadow
  },
  buttonText: {
    color: '#FFFFFF', // White text
    fontSize: 18,
    fontWeight: '600', // Semi-bold text
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC', // Grey for disabled buttons
    shadowOpacity: 0, // No shadow when disabled
    elevation: 0, // No elevation when disabled
  },
  // Style for the FlatList item buttons
  deviceItemButton: {
    backgroundColor: '#6C7A89', // A different color for device items
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceItemButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  weightBox: {
    borderRadius: 40,
    padding: 12,
    margin: 10,
    backgroundColor: '#7678ed',
    borderWidth: 0,
    alignItems: 'center',
    shadowColor: '#000', // Soft shadow for depth
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2, // Android shadow
  },
  powerBox: {
    borderRadius: 40,
    padding: 12,
    margin: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000', // Shadow for depth
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // For Android
  },
  title: {
    fontSize: 28, // Slightly larger for prominence
    fontWeight: '900', // Stronger bold
    color: '#000', // Darker, more professional text color
    marginBottom: 0, // More space below the title
    textAlign: 'center',
    letterSpacing: 0.8, // Subtle letter spacing for a refined look
    textShadowColor: 'rgba(0, 0, 0, 0.05)', // Very subtle text shadow
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginTop: 20,
    fontFamily: 'Times New Roman',
  },
  sectionTitle: {
    fontSize: 20, // Slightly larger than original
    fontWeight: '600', // Medium bold
    color: '#000', // Slightly lighter than main title color
    marginTop: 25, // More top margin
    marginBottom: 15, // More bottom margin
    borderBottomWidth: 1, // Subtle separator
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  connectedText: {
    fontSize: 17,
    color: '#27AE60', // A vibrant, clear green
    marginTop: 15,
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '600', // Slightly bolder
    paddingVertical: 10,
    backgroundColor: '#EBF9F1', // Light green background for emphasis
    borderRadius: 40, // Rounded corners for the status message
    marginHorizontal: 10, // Added horizontal margin
  },
  dataText: {
    fontSize: 16,
    color: '#34495E',
    marginVertical: 6, // Adjusted vertical margin
    lineHeight: 24, // Improved line height for readability
  },
  weightText: {
    fontSize: 18, // Larger font for prominence
    fontWeight: '700', // Semi-bold (not too aggressive)
    color: '#FFFFFF', // Dark gray for readability
    fontFamily: 'Roboto', // Match your theme
  },
  powerBoxText: {
    fontSize: 20,
    color: '#FFFFFF', // Ensures contrast on colored backgrounds
    //fontWeight: 'bold', // Only applies to this text
  },
  solarPower: {
    backgroundColor: '#4CAF50',
  },
  acPower: {
    backgroundColor: '#dd2d4a',
  },
  table: {
    // borderWidth: 0, // Removed main border, relying on shadows and cell borders
    borderRadius: 12, // More pronounced rounded corners for the whole table
    overflow: 'hidden', // Ensures content respects rounded corners
    marginBottom: 20,
    backgroundColor: '#FFFFFF', // White background for table
    shadowColor: '#000', // Subtle shadow for depth
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5, // Android shadow
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0', // Very light separator
    alignItems: 'center', // Vertically align content in rows
  },
  tableHeader: {
    flex: 1,
    paddingVertical: 12, // Increased padding
    paddingHorizontal: 8,
    fontWeight: '700', // Stronger bold
    backgroundColor: '#ECF0F1', // Light grey header background
    color: '#2C3E50', // Dark text for headers
    textAlign: 'center',
    textTransform: 'uppercase', // Uppercase for headers
    fontSize: 13, // Slightly smaller font for headers
    letterSpacing: 0.5,
  },
  tableCell: {
    flex: 1,
    paddingVertical: 10, // Increased padding
    paddingHorizontal: 8,
    textAlign: 'center',
    color: '#34495E',
    fontSize: 15,
    fontFamily: 'Times New Roman',
  },
  // Header Title style for Navigation
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50', // Example: a dark grey color
  },
});

// Styles for the custom alert dialog
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  alertContainer: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  alertButton: {
    backgroundColor: '#007AFF',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

// Add dark mode styles
const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: '#121212',
  },
  title: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    color: '#FFFFFF',
    borderBottomColor: '#333',
  },
  // Add other dark mode style overrides as needed
});

export default App;
*/
// --- END: Stylesheet (Move this block to src/styles/AppStyles.ts) ---