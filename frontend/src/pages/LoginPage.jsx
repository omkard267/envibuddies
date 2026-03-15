// src/pages/LoginPage.jsx
import React from 'react';
import Navbar from '../components/layout/Navbar';
import LoginForm from '../components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-24 px-4">
        <h2 className="text-2xl font-bold text-center mb-6 text-blue-700">Login to EnviBuddies</h2>
        <LoginForm />
      </div>
    </div>
  );
}
