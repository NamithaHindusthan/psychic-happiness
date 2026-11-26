import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/features/auth/api', () => ({ signIn: jest.fn(), resendSignupCode: jest.fn() }));
const mockAuth = { notice: null as null | { kind: 'error'; text: string }, clearNotice: jest.fn() };
jest.mock('@/providers/AuthProvider', () => ({ useAuth: () => mockAuth }));

import LoginScreen from '@/app/(auth)/login';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { resendSignupCode, signIn } from '@/features/auth/api';

const renderLogin = async () =>
  render(
    <ThemeProvider>
      <LoginScreen />
    </ThemeProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.notice = null;
});

it('shows validation messages and does not call the server', async () => {
  await renderLogin();
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByText('Enter your email address.')).toBeTruthy();
  expect(screen.getByText('Enter your password.')).toBeTruthy();
  expect(signIn).not.toHaveBeenCalled();
});

it('shows the server error for wrong credentials', async () => {
  (signIn as jest.Mock).mockResolvedValue({ ok: false, kind: 'invalid_credentials', message: 'That email or password is not right. Please try again.' });
  await renderLogin();
  await fireEvent.changeText(screen.getByLabelText('Email'), 'me@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'wrongpass1');
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() => expect(screen.getByText(/not right/)).toBeTruthy());
  expect(signIn).toHaveBeenCalledWith('me@example.com', 'wrongpass1');
});

it('offers the verification code screen when the email is not verified', async () => {
  (signIn as jest.Mock).mockResolvedValue({ ok: false, kind: 'email_not_confirmed', message: 'Your email is not verified yet.' });
  (resendSignupCode as jest.Mock).mockResolvedValue({ ok: true, data: undefined });
  await renderLogin();
  await fireEvent.changeText(screen.getByLabelText('Email'), 'Me@Example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'whatever1');
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  const verify = await screen.findByRole('button', { name: 'Enter verification code' });
  await fireEvent.press(verify);
  await waitFor(() =>
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/verify-email', params: { email: 'me@example.com' } }),
  );
});

it('shows a notice such as "access removed"', async () => {
  mockAuth.notice = { kind: 'error', text: 'Your access has been removed.' };
  await renderLogin();
  expect(screen.getByText('Your access has been removed.')).toBeTruthy();
});
