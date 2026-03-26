import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Colors } from '../constants/Colors';

// Mono Connect SDK — only available on native platforms
let MonoConnectWidget: any = null;

if (Platform.OS !== 'web') {
  try {
    const monoModule = require('@mono.co/connect-react-native');
    MonoConnectWidget = monoModule.MonoConnect;
  } catch (e) {
    console.warn('[SpendWise] Failed to load Mono SDK:', e);
  }
}

interface MonoConnectButtonProps {
  onSuccess: (code: string) => void;
  onClose?: () => void;
  isLinking?: boolean;
  disabled?: boolean;
}

// Native component using MonoConnect directly
function NativeMonoButton({ onSuccess, onClose, isLinking, disabled }: MonoConnectButtonProps) {
  const monoPublicKey = process.env.EXPO_PUBLIC_MONO_PUBLIC_KEY ?? '';
  const [showWidget, setShowWidget] = useState(false);

  if (!MonoConnectWidget) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Mono SDK not available. Install @mono.co/connect-react-native.
        </Text>
      </View>
    );
  }

  const handlePress = () => {
    console.log('[SpendWise] Link Bank Account pressed, key:', monoPublicKey ? 'present' : 'MISSING');
    if (disabled || isLinking) return;
    setShowWidget(true);
  };

  return (
    <>
      <MonoConnectWidget
        publicKey={monoPublicKey}
        openWidget={showWidget}
        setOpenWidget={setShowWidget}
        onSuccess={(data: { code: string }) => {
          console.log('[SpendWise] Mono onSuccess, code:', data.code);
          setShowWidget(false);
          onSuccess(data.code);
        }}
        onClose={() => {
          console.log('[SpendWise] Mono widget closed');
          setShowWidget(false);
          onClose?.();
        }}
        onEvent={(eventName: string, data: any) => {
          console.log('[SpendWise] Mono event:', eventName, data);
        }}
      />
      <TouchableOpacity
        style={[styles.linkButton, (disabled || isLinking) && styles.disabled]}
        onPress={handlePress}
        disabled={disabled || isLinking}
        activeOpacity={0.8}
      >
        {isLinking ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <>
            <Text style={styles.linkButtonIcon}>🏦</Text>
            <View>
              <Text style={styles.linkButtonText}>Link Bank Account</Text>
              <Text style={styles.linkButtonSub}>Connect via Mono</Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    </>
  );
}

// Fallback for web platform
function WebMonoButton({ isLinking }: MonoConnectButtonProps) {
  return (
    <View style={[styles.linkButton, styles.disabled]}>
      <Text style={styles.linkButtonIcon}>🏦</Text>
      <View>
        <Text style={styles.linkButtonText}>Link Bank Account</Text>
        <Text style={styles.linkButtonSub}>
          Available on mobile devices only
        </Text>
      </View>
    </View>
  );
}

export default function MonoConnectButton(props: MonoConnectButtonProps) {
  if (Platform.OS === 'web' || !MonoConnectWidget) {
    return <WebMonoButton {...props} />;
  }
  return <NativeMonoButton {...props} />;
}

const styles = StyleSheet.create({
  linkButton: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  disabled: {
    opacity: 0.6,
    borderColor: Colors.border,
    borderStyle: 'solid',
  },
  linkButtonIcon: {
    fontSize: 28,
  },
  linkButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  linkButtonSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  errorContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorText: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
