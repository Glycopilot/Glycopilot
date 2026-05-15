import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import mealService from '../../services/mealService';
import type { MealReference } from '../../types/meals.types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onProductFound: (product: MealReference) => void;
  onAddManually?: () => void;
}

export default function BarcodeScannerModal({ visible, onClose, onProductFound, onAddManually }: Readonly<Props>) {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const scannedRef = useRef(false);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scannedRef.current || loading) return;
    scannedRef.current = true;
    setLoading(true);
    setNotFound(false);

    const product = await mealService.lookupBarcode(data);
    setLoading(false);

    if (product) {
      onProductFound(product);
      onClose();
    } else {
      setNotFound(true);
      setTimeout(() => {
        setNotFound(false);
        scannedRef.current = false;
      }, 2500);
    }
  };

  const handleClose = () => {
    scannedRef.current = false;
    setLoading(false);
    setNotFound(false);
    onClose();
  };

  if (!visible) return null;

  if (!permission) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Scanner un code-barres</Text>
          <Pressable style={styles.closeBtn} onPress={handleClose}>
            <X size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        {permission.granted ? (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'qr', 'upc_a', 'upc_e'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />

            {/* Viseur */}
            <View style={styles.overlay}>
              <View style={styles.viewfinder} />
              <Text style={styles.hint}>Pointez vers le code-barres du produit</Text>
            </View>

            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Recherche du produit…</Text>
              </View>
            )}

            {notFound && (
              <View style={styles.notFoundOverlay}>
                <Text style={styles.notFoundText}>
                  Produit non trouvé dans Open Food Facts
                </Text>
                {onAddManually && (
                  <Pressable
                    style={styles.manualBtn}
                    onPress={() => {
                      handleClose();
                      onAddManually();
                    }}
                  >
                    <Text style={styles.manualBtnText}>Saisir manuellement</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>
              GlycoPilot a besoin d'accéder à la caméra pour scanner les codes-barres.
            </Text>
            <Pressable style={styles.grantBtn} onPress={requestPermission}>
              <Text style={styles.grantBtnText}>Autoriser la caméra</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  viewfinder: {
    width: 260,
    height: 160,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    opacity: 0.85,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notFoundOverlay: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(220,38,38,0.9)',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  notFoundText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  manualBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  manualBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  permissionBox: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 20,
  },
  permissionText: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },
  grantBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  grantBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
