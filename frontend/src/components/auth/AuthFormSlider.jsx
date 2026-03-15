import React, { useState } from 'react';
import VolunteerForm from './VolunteerForm';
import OrganizerForm from './OrganizerForm';

export default function AuthFormSlider() {
  const [activeForm, setActiveForm] = useState('volunteer');

  return (
    <div className="w-full max-w-xl mx-auto mt-10">
      <div className="flex justify-center mb-4">
        <button
          onClick={() => setActiveForm('volunteer')}
          className={`px-6 py-2 text-sm font-semibold border-b-2 transition-all duration-300 ${
            activeForm === 'volunteer' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'
          }`}
        >
          Volunteer
        </button>
        <button
          onClick={() => setActiveForm('organizer')}
          className={`px-6 py-2 text-sm font-semibold border-b-2 transition-all duration-300 ${
            activeForm === 'organizer' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'
          }`}
        >
          Organizer
        </button>
      </div>

      <div className="relative overflow-x-hidden">
        <div
          className="flex w-[200%] transition-transform duration-500 ease-in-out"
          style={{ transform: activeForm === 'volunteer' ? 'translateX(0)' : 'translateX(-50%)' }}
        >
          <div className="w-1/2 p-4">
            <VolunteerForm />
          </div>
          <div className="w-1/2 p-4">
            <OrganizerForm />
          </div>
        </div>
      </div>
    </div>
  );
}
