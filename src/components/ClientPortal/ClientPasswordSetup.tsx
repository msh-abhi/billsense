import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, CheckCircle, XCircle, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PasswordSetupFormData {
    password: string;
    confirmPassword: string;
}

interface PasswordStrength {
    score: number; // 0-4
    label: string;
    color: string;
}

export const ClientPasswordSetup: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [hasSession, setHasSession] = useState(false);
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<PasswordSetupFormData>();

    const password = watch('password', '');

    useEffect(() => {
        checkUserSession();
    }, []);

    const checkUserSession = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('Session check error:', error);
                setError('Unable to verify your invitation. Please try clicking the invitation link again.');
                setCheckingSession(false);
                return;
            }

            if (!session) {
                // No session means they didn't come from an invitation link
                setError('No active invitation found. Please check your email and click the invitation link.');
                setCheckingSession(false);
                return;
            }

            // Check if user already has a password set
            // If they can access this page with a session, they're from an invite link
            // We'll allow them to set/reset their password
            setHasSession(true);
            setCheckingSession(false);

        } catch (err) {
            console.error('Error checking session:', err);
            setError('An unexpected error occurred. Please try again.');
            setCheckingSession(false);
        }
    };

    const calculatePasswordStrength = (pwd: string): PasswordStrength => {
        let score = 0;

        if (!pwd) return { score: 0, label: '', color: 'bg-gray-200' };

        // Length check
        if (pwd.length >= 8) score++;
        if (pwd.length >= 12) score++;

        // Character variety checks
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++; // Mixed case
        if (/\d/.test(pwd)) score++; // Numbers
        if (/[^a-zA-Z0-9]/.test(pwd)) score++; // Special characters

        // Cap at 4
        score = Math.min(score, 4);

        const strengthMap: { [key: number]: { label: string; color: string } } = {
            0: { label: '', color: 'bg-gray-200' },
            1: { label: 'Weak', color: 'bg-red-500' },
            2: { label: 'Fair', color: 'bg-orange-500' },
            3: { label: 'Good', color: 'bg-yellow-500' },
            4: { label: 'Strong', color: 'bg-green-500' },
        };

        return { score, ...strengthMap[score] };
    };

    const passwordStrength = calculatePasswordStrength(password);

    const validatePassword = (pwd: string): string | true => {
        if (pwd.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (!/[a-z]/.test(pwd)) {
            return 'Password must contain at least one lowercase letter';
        }
        if (!/[A-Z]/.test(pwd)) {
            return 'Password must contain at least one uppercase letter';
        }
        if (!/\d/.test(pwd)) {
            return 'Password must contain at least one number';
        }
        return true;
    };

    const onSubmit = async (data: PasswordSetupFormData) => {
        try {
            setLoading(true);
            setError('');

            // Validate passwords match
            if (data.password !== data.confirmPassword) {
                setError('Passwords do not match');
                setLoading(false);
                return;
            }

            // Update user password
            const { error: updateError } = await supabase.auth.updateUser({
                password: data.password,
            });

            if (updateError) {
                throw updateError;
            }

            // Success! Show success message and redirect
            setSuccess(true);

            // Wait 2 seconds to show success message, then redirect
            setTimeout(() => {
                navigate('/client/dashboard');
            }, 2000);

        } catch (error: any) {
            console.error('Error setting password:', error);

            let errorMessage = 'Failed to set password. Please try again.';

            if (error.message?.includes('session')) {
                errorMessage = 'Your invitation link has expired. Please request a new invitation.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Loading state while checking session
    if (checkingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Verifying your invitation...</p>
                </div>
            </div>
        );
    }

    // Error state - no valid session
    if (!hasSession && error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 rounded-full bg-red-50">
                                <AlertCircle className="h-8 w-8 text-red-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
                            Invalid Invitation
                        </h2>
                        <p className="text-gray-600 text-center mb-6">
                            {error}
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/client/signin')}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Go to Sign In
                            </button>
                            <p className="text-sm text-gray-500 text-center">
                                Need help? Contact your service provider to resend the invitation.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 rounded-full bg-green-50">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
                            Password Set Successfully!
                        </h2>
                        <p className="text-gray-600 text-center mb-6">
                            Your password has been created. Redirecting you to your dashboard...
                        </p>
                        <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main password setup form
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-full bg-blue-50">
                            <Lock className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Set Up Your Password
                    </h2>
                    <p className="text-gray-600">
                        Create a secure password to access your client portal
                    </p>
                </div>

                <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-sm border border-gray-200" onSubmit={handleSubmit(onSubmit)}>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                            <XCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <div className="space-y-5">
                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    {...register('password', {
                                        required: 'Password is required',
                                        validate: validatePassword,
                                    })}
                                    type={showPassword ? 'text' : 'password'}
                                    className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>
                            </div>

                            {/* Password Strength Indicator */}
                            {password && (
                                <div className="mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-gray-600">Password strength:</span>
                                        <span className={`text-xs font-medium ${passwordStrength.score === 4 ? 'text-green-600' :
                                                passwordStrength.score === 3 ? 'text-yellow-600' :
                                                    passwordStrength.score === 2 ? 'text-orange-600' :
                                                        'text-red-600'
                                            }`}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                                            style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {errors.password && (
                                <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                            )}

                            {/* Password Requirements */}
                            <div className="mt-3 space-y-1">
                                <p className="text-xs text-gray-600 font-medium">Password must contain:</p>
                                <div className="space-y-1">
                                    <div className={`flex items-center text-xs ${password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                                        {password.length >= 8 ? (
                                            <CheckCircle className="h-3 w-3 mr-1.5" />
                                        ) : (
                                            <div className="h-3 w-3 mr-1.5 rounded-full border border-gray-300"></div>
                                        )}
                                        At least 8 characters
                                    </div>
                                    <div className={`flex items-center text-xs ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                                        {/[A-Z]/.test(password) ? (
                                            <CheckCircle className="h-3 w-3 mr-1.5" />
                                        ) : (
                                            <div className="h-3 w-3 mr-1.5 rounded-full border border-gray-300"></div>
                                        )}
                                        One uppercase letter
                                    </div>
                                    <div className={`flex items-center text-xs ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                                        {/[a-z]/.test(password) ? (
                                            <CheckCircle className="h-3 w-3 mr-1.5" />
                                        ) : (
                                            <div className="h-3 w-3 mr-1.5 rounded-full border border-gray-300"></div>
                                        )}
                                        One lowercase letter
                                    </div>
                                    <div className={`flex items-center text-xs ${/\d/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                                        {/\d/.test(password) ? (
                                            <CheckCircle className="h-3 w-3 mr-1.5" />
                                        ) : (
                                            <div className="h-3 w-3 mr-1.5 rounded-full border border-gray-300"></div>
                                        )}
                                        One number
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    {...register('confirmPassword', {
                                        required: 'Please confirm your password',
                                    })}
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Confirm your password"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Setting up your password...
                                </div>
                            ) : (
                                'Set Password & Continue'
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                        By setting up your password, you agree to access your client portal securely.
                    </p>
                </form>
            </div>
        </div>
    );
};
