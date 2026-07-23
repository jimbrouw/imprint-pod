import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-zinc-950 p-4">
      <SignIn
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
          elements: {
            socialButtonsBlockButton: 'bg-white hover:bg-zinc-100 border border-zinc-300',
            socialButtonsBlockButtonText: 'text-zinc-900 font-medium',
          },
        }}
      />
    </div>
  );
}
