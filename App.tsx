import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import { RootStackParamList } from './types'; // Assuming 'types.ts' exists

import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import SettingsScreen from './SettingsScreen'; // Assuming 'SettingsScreen.tsx' exists

import BluetoothSerial from 'react-native-bluetooth-serial-next';
// GLOBAL CHECK: This log will tell us the value of BluetoothSerial right after import.
console.log('GLOBAL CHECK: BluetoothSerial module after import (TOP OF FILE):', BluetoothSerial);

import styles, { modalStyles, darkStyles } from './AppStyles'; // Assuming 'AppStyles.ts' exists

// Type definitions (unchanged)
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

interface AlertDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const Stack = createStackNavigator();

const App: React.FC = () => {
  // APP COMPONENT START: This logs when the App component function begins executing.
  console.log('APP_RENDER: App component function START. (Initial render or re-render)');

  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [dataReceived, setDataReceived] = useState<string>('');
  const [sensorData, setSensorData] = useState<SensorData>({});

  const [alertDialogVisible, setAlertDialogVisible] = useState(false);
  const [alertDialogTitle, setAlertDialogTitle] = useState('');
  const [alertDialogMessage, setAlertDialogMessage] = useState('');

  const [bluetoothReady, setBluetoothReady] = useState(false);
  const [connectionState, setConnectionState] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');

  const [appState, setAppState] = useState<AppState>({
    darkMode: false,
    mockMode: false,
  });

  // This log will re-run on every render, showing state changes.
  console.log('APP_RENDER: Current state: isEnabled=', isEnabled, 'bluetoothReady=', bluetoothReady, 'connectedDevice=', connectedDevice);


  const CustomAlertDialog: React.FC<AlertDialogProps> = ({ visible, title, message, onClose }) => {
    console.log('ALERT: CustomAlertDialog rendered. Visible:', visible);
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
    console.log(`ALERT: Showing Alert: ${title} - ${message}`);
    setAlertDialogTitle(title);
    setAlertDialogMessage(message);
    setAlertDialogVisible(true);
  };

  const closeAlertDialog = () => {
    console.log('ALERT: Closing Alert');
    setAlertDialogVisible(false);
  };

  const requestBluetoothPermissions = async (): Promise<boolean> => {
    console.log('PERMISSIONS: requestBluetoothPermissions called.');
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version;
      console.log('PERMISSIONS: Android API Level:', apiLevel);

      if (apiLevel >= 31) {
        console.log('PERMISSIONS: Requesting BLUETOOTH_SCAN and BLUETOOTH_CONNECT permissions...');
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
        console.log('PERMISSIONS: BLUETOOTH_SCAN granted:', bluetoothScanGranted);
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

        console.log('PERMISSIONS: BLUETOOTH_CONNECT granted:', bluetoothConnectGranted);

        if (bluetoothScanGranted !== PermissionsAndroid.RESULTS.GRANTED ||
          bluetoothConnectGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          showAlertDialog('Permission Denied', 'Bluetooth permissions are required to use this app.');
          console.error('PERMISSIONS: Bluetooth Scan/Connect permissions denied.');
          return false;
        }
      }

      console.log('PERMISSIONS: Requesting ACCESS_FINE_LOCATION permission...');
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
      console.log('PERMISSIONS: ACCESS_FINE_LOCATION granted:', grantedLocation);

      if (grantedLocation !== PermissionsAndroid.RESULTS.GRANTED) {
        showAlertDialog('Permission Denied', 'Location permission is required for Bluetooth discovery.');
        console.error('PERMISSIONS: Location permission denied.');
        return false;
      }
    }
    console.log('PERMISSIONS: All required Bluetooth permissions granted.');
    return true;
  };

  const safeBluetoothOperation = useCallback(async (
    operation: () => Promise<void>,
    successMessage?: string,
    errorMessage?: string
  ) => {
    console.log('SAFE_OP: safeBluetoothOperation called.');
    try {
      // CRITICAL CHECK: Ensure BluetoothSerial is available before attempting any operation.
      if (!BluetoothSerial) {
        console.error('SAFE_OP: CRITICAL ERROR: BluetoothSerial is NULL or UNDEFINED inside safeBluetoothOperation!');
        showAlertDialog('Error', 'Bluetooth module not available for operation.');
        throw new Error('Bluetooth module not available');
      }
      console.log('SAFE_OP: BluetoothSerial confirmed available before executing operation.');
      await operation();
      if (successMessage) {
        showAlertDialog('Success', successMessage);
        console.log(`SAFE_OP: Success: ${successMessage}`);
      }
    } catch (error: any) {
      console.error('SAFE_OP: Bluetooth error during operation:', error);
      showAlertDialog('Error', errorMessage || (error.message || 'An unknown Bluetooth error occurred.'));
      throw error;
    }
  }, []);

  const safeDisconnect = useCallback(async () => {
    console.log('DISCONNECT: safeDisconnect called.');
    // CRITICAL CHECK: Ensure BluetoothSerial is available before attempting disconnect.
    if (!BluetoothSerial) {
      console.warn("DISCONNECT: BluetoothSerial module is NULL or UNDEFINED. Cannot proceed with disconnect.");
      showAlertDialog('Warning', 'Bluetooth module not ready for disconnect.');
      return;
    }

    try {
      // Check if we're actually connected before trying to disconnect
      console.log('DISCONNECT: Checking if device is currently connected via BluetoothSerial.isConnected()...');
      const isConnected = await BluetoothSerial.isConnected();
      console.log('DISCONNECT: BluetoothSerial.isConnected() returned:', isConnected);
      console.log('DISCONNECT: connectedDevice state (before disconnect attempt):', connectedDevice);

      if (isConnected && connectedDevice) {
        console.log('DISCONNECT: Attempting actual disconnect call for:', connectedDevice.name || connectedDevice.id);
        await BluetoothSerial.disconnect(); // This is the line that caused the previous error conceptually
        setConnectedDevice(null);
        setConnectionState('disconnected');
        showAlertDialog('Success', 'Device disconnected successfully');
        console.log('DISCONNECT: Disconnect call successful. State updated.');
      } else {
        console.log('DISCONNECT: Device not reported as connected or connectedDevice state is null. Skipping disconnect.');
        showAlertDialog('Info', 'No device currently connected to disconnect.');
      }
    } catch (error: any) {
      console.error('DISCONNECT: Error during BluetoothSerial.disconnect() call:', error);
      showAlertDialog('Error', 'Failed to disconnect from device');
      throw error;
    }
  }, [connectedDevice]);

  const parseAndDisplayData = useCallback((dataString: string): void => {
    console.log('DATA_PARSE: parseAndDisplayData called with raw string:', dataString);
    if (!dataString || typeof dataString !== 'string') {
      console.warn('DATA_PARSE: Invalid data string received:', dataString);
      return;
    }

    const lines = dataString.split('\n');
    const dataLine = lines.find(line => line.includes('T_Inside:'));
    console.log('DATA_PARSE: Data lines:', lines);
    console.log('DATA_PARSE: Found dataLine:', dataLine);

    if (!dataLine) {
      console.warn('DATA_PARSE: No data line found in packet:', dataString);
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
    console.log('DATA_PARSE: Parsed Sensor Data:', parsedData);
    setSensorData(parsedData);
  }, []);

  useEffect(() => {
    console.log('USE_EFFECT_INIT: Bluetooth Initialization useEffect triggered.');
    let isMounted = true;
    let dataListener: any = null;
    let disconnectListener: any = null;

    const initBluetooth = async () => {
      console.log('USE_EFFECT_INIT: initBluetooth async function started.');
      try {
        // CRITICAL CHECK: This is inside the async function, checking BluetoothSerial again.
        if (!BluetoothSerial) {
          console.error('USE_EFFECT_INIT: CRITICAL ERROR: BluetoothSerial is NULL or UNDEFINED inside initBluetooth during useEffect!');
          throw new Error('Bluetooth module not available');
        }
        console.log('USE_EFFECT_INIT: BluetoothSerial confirmed available in initBluetooth.');

        const permissionsGranted = await requestBluetoothPermissions();
        console.log('USE_EFFECT_INIT: Permissions request result:', permissionsGranted);
        if (!permissionsGranted || !isMounted) {
          console.log('USE_EFFECT_INIT: Permissions not granted or component unmounted. Aborting init.');
          setBluetoothReady(false);
          return;
        }
        console.log('USE_EFFECT_INIT: Permissions successfully granted.');

        console.log('USE_EFFECT_INIT: Checking BluetoothSerial.isEnabled()...');
        const enabled = await BluetoothSerial.isEnabled();
        if (!isMounted) {
          console.log('USE_EFFECT_INIT: Component unmounted after isEnabled check.');
          return;
        }
        console.log('USE_EFFECT_INIT: Bluetooth enabled status:', enabled);

        setIsEnabled(enabled);
        setBluetoothReady(true);
        console.log('USE_EFFECT_INIT: Bluetooth module initialized and ready. Setting bluetoothReady to true.');

        // Setup event listeners
        const onDataReceived = (data: BluetoothEventData) => {
          if (!isMounted) return;
          console.log('USE_EFFECT_INIT: Bluetooth data received:', data.data);
          parseAndDisplayData(data.data);
        };

        const onDisconnect = () => {
          if (!isMounted) return;
          console.log('USE_EFFECT_INIT: Bluetooth device disconnected (event listener triggered)');
          setConnectedDevice(null);
          setConnectionState('disconnected');
        };

        // Store listener references for cleanup
        dataListener = onDataReceived;
        disconnectListener = onDisconnect;

        BluetoothSerial.on('read', onDataReceived);
        BluetoothSerial.on('disconnect', onDisconnect);
        console.log('USE_EFFECT_INIT: Bluetooth event listeners registered.');

      } catch (error: any) {
        if (!isMounted) return;
        console.error('USE_EFFECT_INIT: Bluetooth init error caught in useEffect:', error);
        setBluetoothReady(false);
        showAlertDialog('Initialization Error', error.message);
      }
    };

    initBluetooth();
    console.log('USE_EFFECT_INIT: initBluetooth function called.');

    // Cleanup function for useEffect
    return () => {
      console.log('USE_EFFECT_CLEANUP: Cleanup function running...');
      isMounted = false;

      // Remove listeners if they exist
      if (BluetoothSerial && dataListener) {
        try {
          BluetoothSerial.removeListener('read', dataListener);
          console.log('USE_EFFECT_CLEANUP: Removed data listener.');
        } catch (e) {
          console.warn('USE_EFFECT_CLEANUP: Error removing data listener:', e);
        }
      }

      if (BluetoothSerial && disconnectListener) {
        try {
          BluetoothSerial.removeListener('disconnect', disconnectListener);
          console.log('USE_EFFECT_CLEANUP: Removed disconnect listener.');
        } catch (e) {
          console.warn('USE_EFFECT_CLEANUP: Error removing disconnect listener:', e);
        }
      }

      // Handle disconnection if needed
      if (BluetoothSerial && connectedDevice) {
        console.log('USE_EFFECT_CLEANUP: Checking connection status before forced disconnect.');
        BluetoothSerial.isConnected()
          .then(connected => {
            if (connected) {
              console.log('USE_EFFECT_CLEANUP: Disconnecting in cleanup...');
              return BluetoothSerial.disconnect()
                .then(() => console.log('USE_EFFECT_CLEANUP: Disconnect successful.'))
                .catch(e => console.warn('USE_EFFECT_CLEANUP: Disconnect error:', e.message));
            } else {
              console.log('USE_EFFECT_CLEANUP: Device already disconnected.');
            }
          })
          .catch(e => console.warn('USE_EFFECT_CLEANUP: Connection check error:', e.message));
      } else {
        console.log('USE_EFFECT_CLEANUP: No connected device or BluetoothSerial is null, skipping cleanup disconnect.');
      }
      console.log('USE_EFFECT_CLEANUP: Cleanup function finished.');
    };
  }, [parseAndDisplayData]); // Dependency is fine

  const enableBluetooth = async () => {
    console.log('BUTTON_PRESS: Enable Bluetooth button clicked.');
    await safeBluetoothOperation(
      async () => {
        if (!BluetoothSerial) throw new Error('Bluetooth module not ready.');
        await BluetoothSerial.enable();
        setIsEnabled(true);
        console.log('BUTTON_PRESS: Bluetooth enable operation successful.');
      },
      'Bluetooth enabled successfully',
      'Failed to enable Bluetooth'
    );
  };

  const disableBluetooth = async () => {
    console.log('BUTTON_PRESS: Disable Bluetooth button clicked.');
    await safeBluetoothOperation(
      async () => {
        if (!BluetoothSerial) throw new Error('Bluetooth module not ready.');
        await BluetoothSerial.disable();
        setIsEnabled(false);
        setDevices([]);
        setConnectedDevice(null);
        console.log('BUTTON_PRESS: Bluetooth disable operation successful.');
      },
      'Bluetooth disabled successfully',
      'Failed to disable Bluetooth'
    );
  };

  const discoverDevices = async () => {
    console.log('BUTTON_PRESS: Discover Devices button clicked.');
    await safeBluetoothOperation(
      async () => {
        if (!BluetoothSerial) throw new Error('Bluetooth module not ready.');
        const unpaired = (await BluetoothSerial.listUnpaired()) as BluetoothDevice[];
        const paired = (await BluetoothSerial.list()) as BluetoothDevice[];
        setDevices([...paired, ...unpaired]);
        console.log('BUTTON_PRESS: Discovered devices:', [...paired, ...unpaired]);
        showAlertDialog('Discovery Complete', `Found ${paired.length + unpaired.length} devices.`);
      },
      undefined,
      'Failed to discover devices'
    );
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    console.log('BUTTON_PRESS: Connect to Device initiated for:', device.name || device.id);
    try {
      setConnectionState('connecting');
      await safeBluetoothOperation(
        async () => {
          if (!BluetoothSerial) throw new Error('Bluetooth module not ready.');
          console.log('BUTTON_PRESS: Calling BluetoothSerial.connect(', device.id, ')');
          await BluetoothSerial.connect(device.id);
          setConnectedDevice(device);
          setConnectionState('connected');
          console.log('BUTTON_PRESS: Successfully connected to:', device.name || device.id);
        },
        `Connected to ${device.name || device.id}`,
        `Failed to connect to ${device.name || device.id}`
      );
    } catch (error) {
      setConnectionState('error');
      console.error('BUTTON_PRESS: Error during connectToDevice:', error);
    }
  };

  const disconnectDevice = async () => {
    console.log('BUTTON_PRESS: Disconnect Device button clicked.');
    try {
      await safeDisconnect();
      console.log('BUTTON_PRESS: Disconnect flow completed from button press.');
    } catch (error) {
      console.error("BUTTON_PRESS: Error calling safeDisconnect from disconnectDevice handler:", error);
    }
  };

  const sendCommand = async (command: string) => {
    console.log('BUTTON_PRESS: Send Command button clicked. Command:', command);
    await safeBluetoothOperation(
      async () => {
        if (!connectedDevice || !BluetoothSerial) {
          console.error('BUTTON_PRESS: Cannot send command: No device connected or Bluetooth module not ready.');
          throw new Error('No device connected or Bluetooth module not ready.');
        }
        console.log('BUTTON_PRESS: Attempting to write command:', command);
        await BluetoothSerial.write(command);
        console.log('BUTTON_PRESS: Command sent successfully.');
      },
      `Command sent: ${command}`,
      'Failed to send command'
    );
  };

  const toggleDarkMode = (value: boolean) => {
    console.log('SETTINGS: Toggle Dark Mode:', value);
    setAppState(prev => ({ ...prev, darkMode: value }));
  };

  const toggleMockMode = (value: boolean) => {
    console.log('SETTINGS: Toggle Mock Mode:', value);
    setAppState(prev => ({ ...prev, mockMode: value }));
  };

  const clearDevices = () => {
    console.log('SETTINGS: Clear Devices button clicked.');
    setDevices([]);
    showAlertDialog('Success', 'Device list cleared');
  };

  const resetApp = async () => {
    console.log('SETTINGS: Reset App button clicked.');
    await safeDisconnect(); // Disconnect first
    setDevices([]);
    setConnectedDevice(null);
    setIsEnabled(false);
    setSensorData({});
    showAlertDialog('App Reset', 'App has been reset to initial state');
    console.log('SETTINGS: App reset complete.');
  };


  // Home Screen Component
  const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    const currentStyles = appState.darkMode ? darkStyles : styles;

    useEffect(() => {
      console.log('HOME_SCREEN_USE_EFFECT: Setting navigation options.');
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={{ marginRight: 15 }}
          >
            <Text style={{ fontSize: 16, color: currentStyles.headerTintColor?.color || '#007AFF' }}>Settings</Text>
          </TouchableOpacity>
        ),
        headerTitleStyle: currentStyles.headerTitle,
        headerStyle: currentStyles.header,
      });
    }, [navigation, currentStyles]);

    // This conditional render is important.
    if (!bluetoothReady) {
      console.log('HOME_SCREEN_RENDER: Bluetooth not ready, showing "Initializing Bluetooth..." screen.');
      return (
        <View style={currentStyles.container}>
          <Text style={currentStyles.text}>Initializing Bluetooth...</Text>
        </View>
      );
    }
    // This will only log if bluetoothReady becomes true.
    console.log('HOME_SCREEN_RENDER: Bluetooth is ready, rendering main Home Screen UI.');

    const renderDeviceItemThemed: ListRenderItem<BluetoothDevice> = ({ item }) => (
      <TouchableOpacity
        onPress={() => connectToDevice(item)}
        style={currentStyles.deviceItemButton}
      >
        <Text style={currentStyles.deviceItemButtonText}>{`${item.name || item.id} - ${item.address || item.id}`}</Text>
      </TouchableOpacity>
    );

    return (
      <ScrollView
        style={currentStyles.container}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <View>
          <Text style={currentStyles.sectionTitle}>
            Bluetooth Status: {isEnabled ? 'Enabled' : 'Disabled'}
          </Text>
          <TouchableOpacity
            onPress={enableBluetooth}
            disabled={isEnabled}
            style={[
              currentStyles.button,
              isEnabled && currentStyles.buttonDisabled,
            ]}
          >
            <Text style={currentStyles.buttonText}>Enable Bluetooth</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={disableBluetooth}
            disabled={!isEnabled}
            style={[
              currentStyles.button,
              !isEnabled && currentStyles.buttonDisabled,
            ]}
          >
            <Text style={currentStyles.buttonText}>Disable Bluetooth</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={discoverDevices}
            disabled={!isEnabled}
            style={[
              currentStyles.button,
              !isEnabled && currentStyles.buttonDisabled,
            ]}
          >
            <Text style={currentStyles.buttonText}>Discover Devices</Text>
          </TouchableOpacity>

          {connectedDevice ? (
            <View>
              <Text style={currentStyles.connectedText}>
                Connected to: {connectedDevice.name || connectedDevice.id}
              </Text>

              <TouchableOpacity
                onPress={disconnectDevice}
                style={currentStyles.button}
              >
                <Text style={currentStyles.buttonText}>Disconnect</Text>
              </TouchableOpacity>

              <Text style={currentStyles.sectionTitle}>Sensor Data:</Text>
              <View style={currentStyles.table}>
                <View style={currentStyles.tableRow}>
                  <Text style={currentStyles.tableHeader}>Sensor</Text>
                  <Text style={currentStyles.tableHeader}>Temp (°C)</Text>
                  <Text style={currentStyles.tableHeader}>Humidity (%)</Text>
                </View>
                {['Inside', 'Middle', 'Outside'].map(loc => {
                  let displayLoc = loc;
                  if (loc === 'Inside') {
                    displayLoc = 'Lower Tray';
                  } else if (loc === 'Middle') {
                    displayLoc = 'Upper Tray';
                  }
                  return (
                    <View style={currentStyles.tableRow} key={loc}>
                      <Text style={currentStyles.tableCell}>{String(displayLoc)}</Text>
                      <Text style={currentStyles.tableCell}>
                        {String((sensorData as any)?.[`T_${loc}`] ?? 'N/A')}
                      </Text>
                      <Text style={currentStyles.tableCell}>
                        {String((sensorData as any)?.[`H_${loc}`] ?? 'N/A')}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={currentStyles.weightBox}>
                <Text style={currentStyles.weightText}>
                  {`Weight: ${String(sensorData['W'] ?? 'N/A')}g`}
                </Text>
              </View>
              <View
                style={[
                  currentStyles.powerBox,
                  sensorData['POWER'] === 'SOLAR'
                    ? currentStyles.solarPower
                    : currentStyles.acPower,
                ]}>
                <Text style={currentStyles.powerBoxText}>
                  {`Power: ${String(sensorData['POWER'] ?? 'N/A')}`}
                </Text>
              </View>

              <Text style={currentStyles.sectionTitle}>Controls:</Text>
              <Button
                title="Tare Scale (T)"
                onPress={() => sendCommand('t')}
                color={currentStyles.button?.backgroundColor || '#007AFF'}
              />
            </View>
          ) : (
            <View>
              <Text style={currentStyles.sectionTitle}>Available Devices:</Text>
              <FlatList
                data={devices}
                renderItem={renderDeviceItemThemed}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View>
                    <Text style={currentStyles.text}>
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
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: appState.darkMode
              ? darkStyles.header.backgroundColor
              : styles.header.backgroundColor,
          },
          headerTitleStyle: {
            color: appState.darkMode
              ? darkStyles.headerTitle.color
              : styles.headerTitle.color,
            fontSize: 22,
            fontWeight: 'bold'
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            title: 'RSK Solar Dehydrator',
            headerRight: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                style={{ marginRight: 15 }}
              >
                <Text style={{
                  fontSize: 16,
                  color: appState.darkMode
                    ? darkStyles.text.color
                    : styles.text.color
                }}>
                  Settings
                </Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="Settings"
          options={{
            title: 'Settings',
            headerStyle: {
              backgroundColor: appState.darkMode
                ? darkStyles.header.backgroundColor
                : styles.header.backgroundColor,
            },
          }}
        >
          {(props) => (
            <SettingsScreen
              {...props}
              darkMode={appState.darkMode}
              onDarkModeChange={toggleDarkMode}
              mockMode={appState.mockMode}
              onMockModeChange={toggleMockMode}
              onClearDevices={clearDevices}
              onResetApp={resetApp}
              currentStyles={appState.darkMode ? darkStyles : styles}
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