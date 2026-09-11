import AuthForm from '@/components/auth/AuthForm';
import Link from 'next/link';
import Card from '@/components/ui/Card';

export const metadata = { title: 'Register — Interview Prep Kit' };

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create account</h1>
        <AuthForm mode="register" />
        <p className="mt-4 text-sm text-gray-600 text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
