import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      showAlert('Missing Fields', 'Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      showAlert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        console.log('[SpendWise] Attempting signup with:', email);
        const emailRedirect = Platform.OS === 'web'
          ? window.location.origin
          : Linking.createURL('/');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { is_new_user: true },
            emailRedirectTo: emailRedirect,
          },
        });
        console.log('[SpendWise] Signup result:', { session: !!data.session, user: !!data.user, error });
        if (error) throw error;

        if (data.session) {
          // Email confirmation is disabled — session created immediately
          console.log('[SpendWise] Session created, navigating to profile-setup');
          router.replace('/(auth)/profile-setup');
        } else if (data.user && !data.session) {
          // Email confirmation is required — show success banner
          console.log('[SpendWise] Email confirmation required');
          setSignupEmail(email);
          setSignupSuccess(true);
          setIsSignUp(false);
          setEmail('');
          setPassword('');
        } else {
          showAlert('Signup Issue', 'Something went wrong. Please try again.');
        }
      } else {
        console.log('[SpendWise] Attempting login with:', email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        console.log('[SpendWise] Login result:', { session: !!data.session, error });
        
        if (error) {
           // Explicitly catch and throw the error to trigger the alert
           throw error; 
        }

        if (data.session) {
          // Fetch profile to decide where to go
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();

          console.log('[SpendWise] Profile:', profileData);

          if (profileError && profileError.code !== 'PGRST116') {
             // Let real errors through, but ignore 'Row not found' (PGRST116)
             console.error('[SpendWise] Profile fetch error:', profileError);
          }

          if (profileData && profileData.income_type) {
            router.replace('/(tabs)');
          } else {
            // Fallback for new users or incomplete profiles
            router.replace('/(auth)/profile-setup');
          }
        }
      }
    } catch (err: any) {
      console.error('[SpendWise] Auth error:', err.message);
      showAlert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // On web, redirect back to the current origin so the browser lands on our app
    // On native, use Linking.createURL for deep link scheme
    const redirectUrl = Platform.OS === 'web'
      ? window.location.origin
      : Linking.createURL('/');
    console.log('[SpendWise] Google OAuth redirect URL:', redirectUrl);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) showAlert('Error', error.message);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>💰</Text>
          </View>
          <Text style={styles.appName}>SpendWise</Text>
          <Text style={styles.tagline}>
            Track smarter. Save better.{'\n'}Live richer.
          </Text>
        </View>

        {/* Success Banner — shown after email signup */}
        {signupSuccess && (
          <View style={styles.successBanner}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Account Created!</Text>
            <Text style={styles.successText}>
              A confirmation link has been sent to{' '}
              <Text style={styles.successEmail}>{signupEmail}</Text>.
              {'\n\n'}Please check your email and click the link to verify your account, then come back here and log in.
            </Text>
          </View>
        )}

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>

          {signupSuccess && !isSignUp && (
            <Text style={styles.loginHint}>
              Already confirmed? Log in below 👇
            </Text>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Pressable
            style={({pressed}) => [styles.button, loading && styles.buttonDisabled, pressed && {opacity: 0.8}]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading
                ? 'Please wait...'
                : isSignUp
                ? 'Sign Up'
                : 'Log In'}
            </Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={({pressed}) => [styles.googleButton, pressed && {opacity: 0.8}]}
            onPress={handleGoogleLogin}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleText}>Continue with Google</Text>
          </Pressable>

          <Pressable
            style={({pressed}) => [styles.switchMode, pressed && {opacity: 0.8}]}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setSignupSuccess(false);
            }}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? 'Already have an account? '
                : "Don't have an account? "}
              <Text style={styles.switchLink}>
                {isSignUp ? 'Log In' : 'Sign Up'}
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoIcon: {
    fontSize: 40,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    cursor: 'pointer' as any,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textMuted,
    marginHorizontal: 12,
    fontSize: 13,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  switchMode: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  switchLink: {
    color: Colors.primary,
    fontWeight: '700',
  },
  successBanner: {
    backgroundColor: '#0a2e1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a5c35',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4ade80',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#a7f3d0',
    textAlign: 'center',
    lineHeight: 20,
  },
  successEmail: {
    fontWeight: '700',
    color: '#4ade80',
  },
  loginHint: {
    fontSize: 14,
    color: '#4ade80',
    marginBottom: 16,
    fontWeight: '600',
  },
});
