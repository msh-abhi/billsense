/*
  # Fix profiles table RLS policy for user registration

  1. Security Changes
    - Drop the existing INSERT policy that uses `uid()` function
    - Create a new INSERT policy using `auth.uid()` function
    - This allows authenticated users to insert their own profile during registration

  2. Notes
    - The original policy used `uid()` which doesn't exist in Supabase
    - The correct function is `auth.uid()` to get the current authenticated user's ID
    - This fix enables user registration to work properly
*/

-- Drop the existing INSERT policy that's causing issues
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create a new INSERT policy with the correct auth.uid() function
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);