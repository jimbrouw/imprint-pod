import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-zinc-950 p-4">
      <SignUp
        fallbackRedirectUrl="/dashboard"
        appearance={{
          variables: {
            colorPrimary: '#c2703d',
            colorBackground: '#18181b',
            colorForeground: '#fafafa',
            colorMutedForeground: '#a1a1aa',
            colorInput: '#09090b',
            colorInputForeground: '#fafafa',
            borderRadius: '0.75rem',
          },
        }}
      />
    </div>
  );
}
