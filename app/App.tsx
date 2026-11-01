import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type FieldErrors = {
  name?: string;
  category?: string;
  ownerEmail?: string;
};

export default function App() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submissionMessage, setSubmissionMessage] = useState('');

  function handleSubmit() {
    const nextErrors: FieldErrors = {};

    if (!name.trim()) nextErrors.name = 'Enter a club name.';
    if (!category.trim()) nextErrors.category = 'Enter a category.';
    if (!ownerEmail.trim()) {
      nextErrors.ownerEmail = 'Enter the email of an existing account.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim())) {
      nextErrors.ownerEmail = 'Enter a valid email address.';
    }

    setErrors(nextErrors);
    setSubmissionMessage('');

    if (Object.keys(nextErrors).length === 0) {
      setSubmissionMessage(
        'Details are ready. Club creation is not connected to a server yet.',
      );
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
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          </View>

          <View style={styles.heading}>
            <Text style={styles.eyebrow}>CLUB MANAGEMENT</Text>
            <Text style={styles.title}>Create a club</Text>
            <Text style={styles.subtitle}>
              Add a club to the community and assign an owner to manage it.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeading}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>01</Text>
              </View>
              <View style={styles.cardHeadingCopy}>
                <Text style={styles.cardTitle}>Club details</Text>
                <Text style={styles.cardSubtitle}>
                  Fields marked with * are required
                </Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Club name<Text style={styles.required}> *</Text></Text>
              <TextInput
                accessibilityLabel="Club name"
                autoCapitalize="words"
                onChangeText={(value) => {
                  setName(value);
                  setErrors((current) => ({ ...current, name: undefined }));
                  setSubmissionMessage('');
                }}
                placeholder="e.g. Robotics Club"
                placeholderTextColor="#98A2B3"
                returnKeyType="next"
                style={[styles.input, errors.name ? styles.inputError : null]}
                value={name}
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Category<Text style={styles.required}> *</Text></Text>
              <TextInput
                accessibilityLabel="Category"
                autoCapitalize="words"
                onChangeText={(value) => {
                  setCategory(value);
                  setErrors((current) => ({ ...current, category: undefined }));
                  setSubmissionMessage('');
                }}
                placeholder="e.g. Academic, Arts, Sports"
                placeholderTextColor="#98A2B3"
                returnKeyType="next"
                style={[styles.input, errors.category ? styles.inputError : null]}
                value={category}
              />
              {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Club owner email<Text style={styles.required}> *</Text></Text>
              <TextInput
                accessibilityLabel="Club owner email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={(value) => {
                  setOwnerEmail(value);
                  setErrors((current) => ({ ...current, ownerEmail: undefined }));
                  setSubmissionMessage('');
                }}
                placeholder="name@mail.mcgill.ca"
                placeholderTextColor="#98A2B3"
                returnKeyType="done"
                style={[styles.input, errors.ownerEmail ? styles.inputError : null]}
                value={ownerEmail}
              />
              {errors.ownerEmail ? (
                <Text style={styles.errorText}>{errors.ownerEmail}</Text>
              ) : (
                <Text style={styles.helperText}>
                  The owner must already have a ClubHouse account.
                </Text>
              )}
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Club status</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
              <Text style={styles.statusNote}>by default</Text>
            </View>

            {submissionMessage ? (
              <View accessibilityRole="alert" style={styles.notice}>
                <Text style={styles.noticeText}>{submissionMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleSubmit}
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>Create club</Text>
              <Text style={styles.submitArrow}>→</Text>
            </TouchableOpacity>
            <Text style={styles.footerNote}>
              Creating a club assigns the selected account as its owner.
            </Text>
          </View>

          <Text style={styles.pageFooter}>CLUBHOUSE ADMINISTRATION</Text>
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
  adminBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E9ECFA',
  },
  adminBadgeText: {
    color: '#3346A8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
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
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 27,
  },
  stepBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F0F2FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  stepBadgeText: {
    color: '#4556B2',
    fontSize: 12,
    fontWeight: '800',
  },
  cardHeadingCopy: {
    flex: 1,
  },
  cardTitle: {
    color: '#202944',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  cardSubtitle: {
    color: '#8A93A6',
    fontSize: 12,
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
  inputError: {
    borderColor: '#D04B55',
  },
  helperText: {
    color: '#8A93A6',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  errorText: {
    color: '#B93842',
    fontSize: 12,
    marginTop: 6,
  },
  statusRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEF0F5',
    marginTop: 2,
    marginBottom: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#35A875',
    marginRight: 9,
  },
  statusText: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '600',
  },
  activeBadge: {
    backgroundColor: '#E7F6EF',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginLeft: 'auto',
  },
  activeBadgeText: {
    color: '#218257',
    fontSize: 11,
    fontWeight: '700',
  },
  statusNote: {
    color: '#98A2B3',
    fontSize: 11,
    marginLeft: 7,
  },
  notice: {
    backgroundColor: '#F0F2FC',
    borderRadius: 9,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: {
    color: '#3346A8',
    fontSize: 13,
    lineHeight: 19,
  },
  submitButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#3346A8',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  submitArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    marginLeft: 9,
    marginTop: -2,
  },
  footerNote: {
    color: '#8A93A6',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 13,
  },
  pageFooter: {
    color: '#A0A8B7',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    textAlign: 'center',
    marginTop: 27,
  },
});
