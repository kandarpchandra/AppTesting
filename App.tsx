import React, { useEffect, useState } from 'react'; ``
import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  ListRenderItem,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import { NativeStackNavigationProp, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';


import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import SettingsScreen from './SettingsScreen';

//import BluetoothSerial from 'react-native-bluetooth-serial-next';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

// Mock Bluetooth implementation
const BluetoothSerial = {
  isEnabled: () => Promise.resolve(true),
  enable: () => Promise.resolve(),
  disable: () => Promise.resolve(),
  listUnpaired: () =>
    Promise.resolve([
      {
        id: 'mock-device-1',
        name: 'Mock Device 1',
        address: '00:11:22:33:44:55',
      },
      {
        id: 'mock-device-2',
        name: 'Mock Device 2',
        address: '66:77:88:99:AA:BB',
      },
    ]),
  list: () =>
    Promise.resolve([
      {
        id: 'mock-paired-1',
        name: 'Paired Device 1',
        address: 'CC:DD:EE:FF:00:11',
      },
    ]),
  connect: (id: string) => {
    console.log(`Mock connecting to ${id}`);
    return Promise.resolve();
  },
  disconnect: () => Promise.resolve(),
  write: (command: string) => {
    console.log(`Mock command sent: ${command}`);
    return Promise.resolve();
  },
  on: () => console.log('Mock listener added'),
  removeListener: () => console.log('Mock listener removed'),
  isConnected: () => Promise.resolve(true),
};

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

type BluetoothEventData = {
  data: string;
};

const Stack = createStackNavigator();

const App: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [dataReceived, setDataReceived] = useState<string>('');
  const [sensorData, setSensorData] = useState<SensorData>({});

  // Add these state variables
  const [appState, setAppState] = useState<AppState>({
    darkMode: false,
    mockMode: true, // Default to mock mode for development
  });

  const generateMockSensorData = (): SensorData => {
    const randomValue = (min: number, max: number) =>
      (Math.random() * (max - min) + min).toFixed(2);

    return {
      T_Inside: randomValue(20, 30),
      H_Inside: randomValue(40, 60),
      T_Middle: randomValue(18, 28),
      H_Middle: randomValue(35, 55),
      T_Outside: randomValue(10, 25),
      H_Outside: randomValue(30, 50),
      W: randomValue(0, 1000),
      FAN: Math.random() > 0.5 ? 'ON' : 'OFF',
      POWER: Math.random() > 0.5 ? 'SOLAR' : 'AC',
    };
  };

  // Simulates receiving data from Bluetooth device every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectedDevice) {
        const mockData = generateMockSensorData();
        const dataString = `--- Current Data ---\nT_Inside:${mockData.T_Inside},H_Inside:${mockData.H_Inside},T_Middle:${mockData.T_Middle},H_Middle:${mockData.H_Middle},T_Outside:${mockData.T_Outside},H_Outside:${mockData.H_Outside},W:${mockData.W},FAN:${mockData.FAN},POWER:${mockData.POWER}`;
        parseAndDisplayData(dataString);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [connectedDevice]);

  const requestBluetoothPermissions = async (): Promise<void> => {
    console.log('Mock: Skipping permission requests in development');
  };

  // Parses incoming sensor data string and updates state
  const parseAndDisplayData = (dataString: string): void => {
    if (!dataString || typeof dataString !== 'string') {
      console.warn('Invalid data string received:', dataString);
      return;
    }

    const lines = dataString.split('\n');
    // Find the line that starts with "T_Inside:" (or any other consistent data key)
    // This ensures we always get the line with the actual sensor readings.
    const dataLine = lines.find(line => line.includes('T_Inside:'));

    if (!dataLine) {
      console.warn('No data line found in packet:', dataString);
      return;
    }

    const parsedData: SensorData = {};
    // Now split the dataLine directly
    const parts = dataLine.split(',');

    parts.forEach(part => {
      const [key, value] = part.split(':');
      if (key && value) {
        parsedData[key.trim() as keyof SensorData] = value.trim();
      }
    });

    setSensorData(parsedData);
  };

  /*useEffect(() => {
    requestBluetoothPermissions();

    BluetoothSerial.isEnabled().then((enabled: boolean) => {
      setIsEnabled(enabled);
    });

    const onDataReceived = (data: BluetoothEventData) => {
      console.log('Received data:', data.data);
      parseAndDisplayData(data.data);
    };

    const onDisconnect = () => {
      console.log('Device disconnected');
      setConnectedDevice(null);
      Alert.alert('Disconnected', 'Bluetooth device disconnected.');
    };

    BluetoothSerial.on('read', onDataReceived);
    BluetoothSerial.on('disconnect', onDisconnect);

    return () => {
      BluetoothSerial.removeListener('read', onDataReceived);
      BluetoothSerial.removeListener('disconnect', onDisconnect);
      if (connectedDevice) {
        BluetoothSerial.disconnect();
      }
    };
  }, [connectedDevice]);

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
          Alert.alert('Permission Denied', 'Bluetooth permissions are required to use this app.');
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
        Alert.alert('Permission Denied', 'Location permission is required for Bluetooth discovery.');
      }
    }
  };

  const parseAndDisplayData = (dataString: string): void => {
    if (!dataString || typeof dataString !== 'string') {
      console.warn('Invalid data string received:', dataString);
      return;
    }

    const lines = dataString.split('\n');
    const latestLine = lines[lines.length - 2] || lines[lines.length - 1];

    if (!latestLine || !latestLine.startsWith('--- Current Data ---')) {
      console.warn('Incomplete or malformed data packet:', latestLine);
      return;
    }

    const parsedData: SensorData = {};
    const parts = latestLine.split(',');

    parts.forEach(part => {
      const [key, value] = part.split(':');
      if (key && value) {
        parsedData[key.trim() as keyof SensorData] = value.trim();
      }
    });
    
    setSensorData(parsedData);
  }; */

  // Bluetooth control functions
  const enableBluetooth = async (): Promise<void> => {
    try {
      await BluetoothSerial.enable();
      setIsEnabled(true);
      console.log('Bluetooth enabled');
    } catch (error) {
      console.error('Failed to enable Bluetooth:', error);
      Alert.alert(
        'Error',
        'Failed to enable Bluetooth. Please enable it manually.',
      );
    }
  };

  const disableBluetooth = async (): Promise<void> => {
    try {
      await BluetoothSerial.disable();
      setIsEnabled(false);
      setDevices([]);
      setConnectedDevice(null);
      console.log('Bluetooth disabled');
    } catch (error) {
      console.error('Failed to disable Bluetooth:', error);
    }
  };

  const discoverDevices = async (): Promise<void> => {
    try {
      const unpaired =
        (await BluetoothSerial.listUnpaired()) as BluetoothDevice[];
      const paired = (await BluetoothSerial.list()) as BluetoothDevice[];
      setDevices([...paired, ...unpaired]);
    } catch (error) {
      console.error('Failed to discover devices:', error);
      Alert.alert(
        'Error',
        'Failed to discover devices. Check permissions and Bluetooth status.',
      );
    }
  };

  const connectToDevice = async (device: BluetoothDevice): Promise<void> => {
    try {
      await BluetoothSerial.connect(device.id);
      setConnectedDevice(device);
      Alert.alert('Connected', `Connected to ${device.name || device.id}`);
    } catch (error) {
      console.error('Failed to connect:', error);
      Alert.alert('Error', `Failed to connect to ${device.name || device.id}.`);
    }
  };

  const disconnectDevice = async (): Promise<void> => {
    try {
      await BluetoothSerial.disconnect();
      setConnectedDevice(null);
      Alert.alert('Disconnected', 'Disconnected from device.');
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const sendCommand = async (command: string): Promise<void> => {
    if (!connectedDevice) {
      Alert.alert('Not Connected', 'Please connect to a device first.');
      return;
    }

    try {
      await BluetoothSerial.write(command);
      console.log('Command sent:', command);
    } catch (error) {
      console.error('Failed to send command:', error);
      Alert.alert('Error', 'Failed to send command.');
    }
  };

  // Add these functions for settings
  const toggleDarkMode = (value: boolean) => {
    setAppState(prev => ({ ...prev, darkMode: value }));
  };

  const toggleMockMode = (value: boolean) => {
    setAppState(prev => ({ ...prev, mockMode: value }));
    // You might want to add logic here to switch between mock and real Bluetooth
  };

  const clearDevices = () => {
    setDevices([]);
    Alert.alert('Success', 'Device list cleared');
  };

  const resetApp = () => {
    setDevices([]);
    setConnectedDevice(null);
    setIsEnabled(false);
    setSensorData({});
    Alert.alert('App Reset', 'App has been reset to initial state');
  };

  // Renders each device item in the FlatList
  const renderDeviceItem: ListRenderItem<BluetoothDevice> = ({ item }) => (
    <TouchableOpacity
      onPress={() => connectToDevice(item)}
      style={styles.deviceItemButton} // Apply new style
    >
      <Text style={styles.deviceItemButtonText}>{`${item.name || item.id} - ${item.address || item.id}`}</Text>
    </TouchableOpacity>
  );

  // Main Component
  //Create Home Screen component that contains your current UI
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
      });
    }, [navigation]);

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <View>
          {/* <Text style={styles.title}>RSK Solar Dehydrator</Text> */}

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
              {/* <Button title="Disconnect" onPress={disconnectDevice} /> */}

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
                  {`Weight: ${(sensorData['W'] || 'N/A')}g`}
                </Text>
              </View>
              {/* <Text style={styles.dataText}>FAN: {sensorData['FAN'] || 'N/A'}</Text> */}
              <View
                style={[
                  styles.powerBox,
                  sensorData['POWER'] === 'SOLAR'
                    ? styles.solarPower
                    : styles.acPower,
                ]}>
                <Text style={styles.powerBoxText}>
                  Power: {sensorData['POWER'] || 'N/A'}
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
    </NavigationContainer>
  );
};


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
