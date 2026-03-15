// src/pages/SignupPage.jsx
import React from 'react';
import Navbar from '../components/layout/Navbar';
import AuthFormSlider from '../components/auth/AuthFormSlider';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-24 px-4">
        <h2 className="text-2xl font-bold text-center mb-6 text-blue-700">Create Your Account</h2>
        <AuthFormSlider />
      </div>
    </div>
  );
}
