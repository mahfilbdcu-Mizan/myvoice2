import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, KeyRound, ArrowLeft, Lock, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.jpeg";

export default function AdminLogin() {
  const { isLoading, signInWithGoogle, signInWithEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetStep, setResetStep] = useState<"email" | "sent" | "newPassword" | "success">("email");

  // Check if user came from password reset email link
  useEffect(() => {
    const isReset = searchParams.get("reset") === "true";
    if (isReset) {
      setShowForgotPassword(true);
      setResetStep("newPassword");
    }
  }, [searchParams]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await signInWithEmail(email, password);
    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login successful",
        description: "Redirecting to admin panel...",
      });
      navigate("/admin");
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const { error } = await signInWithGoogle();
    setIsSubmitting(false);
    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSendResetEmail = async () => {
    if (!resetEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/admin/login?reset=true`,
    });
    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Reset email sent",
        description: "Check your Gmail for the password reset link",
      });
      setResetStep("sent");
    }
  };

  const handleSetNewPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setResetStep("success");
      // Sign out so they can login with new password
      await supabase.auth.signOut();
      toast({
        title: "Password updated!",
        description: "You can now sign in with your new password",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-subtle p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="mb-8 flex items-center justify-center gap-3">
          <img src={logo} alt="BD YT Automation" className="h-16 w-16 rounded-2xl object-cover shadow-lg" />
          <span className="text-2xl font-bold tracking-tight">BD YT Automation</span>
        </Link>

        <Card className="shadow-elevated">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription>
              {showForgotPassword ? "Reset your password" : "Sign in to admin panel"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {showForgotPassword ? (
              <div className="space-y-4">
                {resetStep !== "success" && resetStep !== "newPassword" && (
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetStep("email");
                    }}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </button>
                )}

                {/* Step 1: Enter Email */}
                {resetStep === "email" && (
                  <>
                    <div className="text-center mb-4">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enter your email address and we'll send you a password reset link
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email Address</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="Enter your email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <Button
                      onClick={handleSendResetEmail}
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      Send Reset Link to Gmail
                    </Button>
                  </>
                )}

                {/* Step 2: Email Sent */}
                {resetStep === "sent" && (
                  <>
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                        <Mail className="h-6 w-6 text-green-500" />
                      </div>
                      <h3 className="font-semibold mb-2">Check your Gmail!</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        We've sent a password reset link to <strong>{resetEmail}</strong>. 
                        Click the link in the email to set a new password.
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
                      <p>• Check your inbox and spam folder</p>
                      <p>• Click the reset link in the email</p>
                      <p>• You'll be redirected here to set new password</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetStep("email");
                        setResetEmail("");
                      }}
                      className="w-full"
                    >
                      Back to Login
                    </Button>
                  </>
                )}

                {/* Step 3: Set New Password */}
                {resetStep === "newPassword" && (
                  <>
                    <div className="text-center mb-4">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Lock className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold">Set New Password</h3>
                      <p className="text-sm text-muted-foreground">
                        Enter your new password below
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleSetNewPassword}
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Lock className="mr-2 h-4 w-4" />
                      )}
                      Set New Password
                    </Button>
                  </>
                )}

                {/* Step 4: Success */}
                {resetStep === "success" && (
                  <>
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      </div>
                      <h3 className="font-semibold mb-2">Password Updated!</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Your password has been successfully changed. 
                        You can now login with your new password.
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetStep("email");
                        setNewPassword("");
                        setConfirmPassword("");
                        navigate("/admin/login", { replace: true });
                      }}
                      className="w-full"
                    >
                      <KeyRound className="mr-2 h-4 w-4" />
                      Login with New Password
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <>
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="mr-2 h-4 w-4" />
                    )}
                    Sign In
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  Continue with Google
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Back to homepage
          </Link>
        </p>
      </div>
    </div>
  );
}