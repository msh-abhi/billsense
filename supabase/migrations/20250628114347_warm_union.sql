/*
  # Fix profiles table RLS policy for sign-up

  1. Security Changes
    - Drop the existing restrictive INSERT policy for profiles
    - Create a new INSERT policy that allows authenticated users to create profiles
    - This enables the sign-up process to work properly while maintaining security
  
  2. Policy Details
    - The new policy allows INSERT operations for authenticated users
    - Users can only insert their own profile (where auth.uid() = id)
    - This resolves the RLS violation during sign-up while keeping data secure
*/

-- Drop the existing INSERT policy that's too restrictive
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create a new INSERT policy that works with the sign-up flow
CREATE POLICY "Users can insert own profile" 
  ON profiles 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);