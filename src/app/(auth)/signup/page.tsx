'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserRole } from '@/types';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // signUp 시 name, role을 메타데이터로 전달 → 트리거가 profiles에 자동 INSERT
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    });

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('이미 사용 중인 이메일입니다.');
      } else {
        setError(signUpError.message);
      }
      setLoading(false);
      return;
    }

    // 역할에 따라 리다이렉트
    router.push(role === 'instructor' ? '/instructor' : '/student');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-white">SyncEdu 회원가입</CardTitle>
          <CardDescription className="text-gray-400">
            계정을 만들고 수업을 시작하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이름 */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">
                이름
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* 이메일 */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">
                이메일
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">
                비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* 비밀번호 확인 */}
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm" className="text-gray-300">
                비밀번호 확인
              </Label>
              <Input
                id="passwordConfirm"
                type="password"
                placeholder="비밀번호 재입력"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* 역할 선택 */}
            <div className="space-y-2">
              <Label className="text-gray-300">역할</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`py-3 rounded-lg border text-sm font-medium transition-colors ${
                    role === 'student'
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  수강생
                </button>
                <button
                  type="button"
                  onClick={() => setRole('instructor')}
                  className={`py-3 rounded-lg border text-sm font-medium transition-colors ${
                    role === 'instructor'
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  강사
                </button>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? '가입 중...' : '회원가입'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-400">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-blue-400 hover:underline">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
