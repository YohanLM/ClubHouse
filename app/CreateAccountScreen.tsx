import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
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

export type AccountData = {
  name: string;
  email: string;
  password: string;
  faculty: string;
  studyYear: string;
};

type Props = {
  /** Sends the form to the createAccount service. Throws with its message on failure. */
  onSubmit: (account: AccountData) => Promise<void>;
};

const EMPTY_FORM: AccountData = {
  name: '',
  email: '',
  password: '',
  faculty: '',
  studyYear: '',
};

export default function CreateAccountScreen({ onSubmit }: Props) {
  const [form, setForm] = useState<AccountData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function update(field: keyof AccountData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
    setSuccess('');
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // The service validates the fields and returns the feature-file messages
      await onSubmit(form);
      setSuccess('Account created');
      setForm(EMPTY_FORM);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Account creation failed');
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
            <Text style={styles.eyebrow}>WELCOME</Text>
            <Text style={styles.title}>Create an account</Text>
            <Text style={styles.subtitle}>
              Sign up with your McGill email to follow your clubs' events.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>Fields marked with * are required</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Name<Text style={styles.required}> *</Text></Text>
              <TextInput
                accessibilityLabel="Name"
                autoCapitalize="words"
                onChangeText={(value) => update('name', value)}
                placeholder="e.g. Carla Gomez"
                placeholderTextColor="#98A2B3"
                style={styles.input}
                value={form.name}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>McGill email<Text style={styles.required}> *</Text></Text>
              <TextInput
                accessibilityLabel="McGill email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={(value) => update('email', value)}
                placeholder="name@mail.mcgill.ca"
                placeholderTextColor="#98A2B3"
                style={styles.input}
                value={form.email}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password<Text style={styles.required}> *</Text></Text>
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete="new-password"
                onChangeText={(value) => update('password', value)}
                placeholder="Your password"
                placeholderTextColor="#98A2B3"
                secureTextEntry
                style={styles.input}
                value={form.password}
              />
              <Text style={styles.helperText}>
                At least 8 characters, with an uppercase letter, a lowercase letter,
                a digit and a special character.
              </Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.flex]}>
                <Text style={styles.label}>Faculty</Text>
                <TextInput
                  accessibilityLabel="Faculty"
                  autoCapitalize="words"
                  onChangeText={(value) => update('faculty', value)}
                  placeholder="e.g. Engineering"
                  placeholderTextColor="#98A2B3"
                  style={styles.input}
                  value={form.faculty}
                />
              </View>

              <View style={[styles.field, styles.flex]}>
                <Text style={styles.label}>Study year</Text>
                <TextInput
                  accessibilityLabel="Study year"
                  autoCapitalize="characters"
                  onChangeText={(value) => update('studyYear', value)}
                  placeholder="e.g. U2"
                  placeholderTextColor="#98A2B3"
                  style={styles.input}
                  value={form.studyYear}
                />
              </View>
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
                <Text style={styles.submitButtonText}>Create account</Text>
              )}
            </TouchableOpacity>
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
  row: {
    flexDirection: 'row',
    gap: 12,
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
  helperText: {
    color: '#8A93A6',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
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
});
