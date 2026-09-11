import AuthForm from '@/components/auth/AuthForm';
import Link from 'next/link';
import Card from '@/components/ui/Card';

export const metadata = { title: 'Sign In — Interview Prep Kit' };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Sign in</h1>
        <AuthForm mode="login" />
        <p className="mt-4 text-sm text-gray-600 text-center">
          No account?{' '}
          <Link href="/register" className="text-indigo-600 hover:underline font-medium">
            Create one
          </Link>
        </p>
      </Card>
    </div>
  );
}
