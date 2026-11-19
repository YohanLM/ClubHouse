import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export type LoginData = {
  email: string;
  password: string;
};

type Props = {
  /** Sends the form to the login service. Throws with its message on failure. */
  onSubmit: (credentials: LoginData) => Promise<void>;
  /** Optional: shows a link to the Create Account screen when provided. */
  onCreateAccount?: () => void;
};

const EMPTY_FORM: LoginData = {
  email: '',
  password: '',
};

export default function LoginScreen({ onSubmit, onCreateAccount }: Props) {
  const [form, setForm] = useState<LoginData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const passwordRef = useRef<TextInput>(null);

  function update(field: keyof LoginData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
    setSuccess('');
  }

  async function handleSubmit() {
    if (loading) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // The service validates the fields and returns the feature-file messages
      // ("Email is required", "Invalid email or password", "Account temporarily locked", ...)
      await onSubmit(form);
      setSuccess('Login successful');
      setForm(EMPTY_FORM);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topBar}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>C</Text>
            </View>
            <Text style={styles.brandName}>ClubHouse</Text>
          </View>

          <View style={styles.heading}>
            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text style={styles.title}>Log in</Text>
            <Text style={styles.subtitle}>
              Log in with your McGill email to see your clubs' events.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>Fields marked with * are required</Text>

            <View style={styles.field}>
              <Text style={styles.label}>McGill email<Text style={styles.required}> *</Text></Text>
              <TextInput
                accessibilityLabel="McGill email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={(value) => update('email', value)}
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="name@mail.mcgill.ca"
                placeholderTextColor="#98A2B3"
                returnKeyType="next"
                style={styles.input}
                value={form.email}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password<Text style={styles.required}> *</Text></Text>
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete="current-password"
                onChangeText={(value) => update('password', value)}
                onSubmitEditing={handleSubmit}
                placeholder="Your password"
                placeholderTextColor="#98A2B3"
                ref={passwordRef}
                returnKeyType="go"
                secureTextEntry
                style={styles.input}
                value={form.password}
              />
            </View>

            {error ? (
              <View accessibilityRole="alert" style={styles.errorNotice}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View accessibilityRole="alert" style={styles.successNotice}>
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              accessibilityRole="button"
              disabled={loading}
              onPress={handleSubmit}
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Log in</Text>
              )}
            </TouchableOpacity>

            {onCreateAccount ? (
              <TouchableOpacity
                accessibilityRole="link"
                onPress={onCreateAccount}
                style={styles.secondaryLink}
              >
                <Text style={styles.secondaryLinkText}>
                  New to ClubHouse? <Text style={styles.secondaryLinkAction}>Create an account</Text>
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  topBar: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF3',
    marginBottom: 38,
  },
  brandMark: {
    height: 34,
    width: 34,
    borderRadius: 11,
    backgroundColor: '#3346A8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brandMarkText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },
  brandName: {
    color: '#202944',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heading: {
    marginBottom: 26,
  },
  eyebrow: {
    color: '#6572B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 9,
  },
  title: {
    color: '#202944',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    color: '#667085',
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 460,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8ECF3',
    padding: 26,
    shadowColor: '#202944',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.045,
    shadowRadius: 20,
    elevation: 2,
  },
  cardSubtitle: {
    color: '#8A93A6',
    fontSize: 12,
    marginBottom: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  required: {
    color: '#D04B55',
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#DDE2EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#202944',
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  errorNotice: {
    backgroundColor: '#FDECEE',
    borderRadius: 9,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#B93842',
    fontSize: 13,
    lineHeight: 19,
  },
  successNotice: {
    backgroundColor: '#E7F6EF',
    borderRadius: 9,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#218257',
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#3346A8',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryLink: {
    alignItems: 'center',
    paddingTop: 18,
  },
  secondaryLinkText: {
    color: '#667085',
    fontSize: 13,
  },
  secondaryLinkAction: {
    color: '#3346A8',
    fontWeight: '700',
  },
});
