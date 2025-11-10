import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { Camera as ExpoCamera } from 'expo-camera';
import { CameraType } from 'expo-camera/build/Camera.types';

const requestCameraPermissionsAsync = async () => {
  return ExpoCamera.requestCameraPermissionsAsync();
};
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Rect } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

export const CameraScreen: React.FC<Props> = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<ExpoCamera>(null);
  const isFocused = useIsFocused();

  React.useEffect(() => {
    (async () => {
      const { status } = await requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need camera permission to scan products.</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => requestCameraPermissionsAsync()}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const captureImage = async () => {
    if (!cameraRef.current || !isReady || isProcessing) return;

    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: true,
      });

      // Optimize image for Gemini: resize to 512x512, compress to 0.65 for faster upload
      const processedImage = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.65, format: SaveFormat.JPEG }
      );

      navigation.navigate('Processing', { imageUri: processedImage.uri });
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to capture image. Please try again.',
        [{ text: 'OK', onPress: () => setIsProcessing(false) }]
      );
    }
  };

  const pickImage = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        // Optimize image for Gemini: resize to 512x512, compress to 0.65 for faster upload
        const processedImage = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 512, height: 512 } }],
          { compress: 0.65, format: SaveFormat.JPEG }
        );
        
        navigation.navigate('Processing', { imageUri: processedImage.uri });
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to select image. Please try again.',
        [{ text: 'OK', onPress: () => setIsProcessing(false) }]
      );
    }
  };

  if (!isFocused) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ExpoCamera
        ref={cameraRef}
        style={styles.camera}
        type={CameraType.back}
        onCameraReady={() => setIsReady(true)}
      >
        <View style={styles.overlay}>
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
            <Rect
              x="10%"
              y="25%"
              width="80%"
              height="50%"
              strokeWidth="2"
              stroke="white"
              fill="none"
            />
          </Svg>
          <Text style={styles.guide}>
            Position product within the frame
          </Text>
        </View>
      </ExpoCamera>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.button, isProcessing && styles.buttonDisabled]} 
          onPress={pickImage}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>Gallery</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.button, 
            styles.captureButton,
            isProcessing && styles.buttonDisabled
          ]}
          onPress={captureImage}
          disabled={isProcessing}
        >
          <View style={styles.captureInner} />
        </TouchableOpacity>

        <View style={styles.buttonPlaceholder} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guide: {
    color: 'white',
    fontSize: 16,
    position: 'absolute',
    bottom: '20%',
    textAlign: 'center',
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'black',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    width: 80,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9E9E9E',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4CAF50',
    padding: 5,
  },
  captureInner: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 30,
  },
  buttonPlaceholder: {
    width: 80,
  },
  text: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
});